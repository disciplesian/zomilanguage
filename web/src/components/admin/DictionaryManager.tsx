import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  Check,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { GlassCard } from '@/components/SiteLayout';
import {
  addDictionaryEntry,
  deleteDictionaryEntry,
  editDictionaryEntry,
  fetchAdminDictionary,
  fetchAdminDictionaryEntries,
  fetchAuditLog,
  fetchDictionaryHistory,
  importAdminDictionary,
  logDictionaryExport,
  type AuditEvent,
  type DictionaryVersion,
} from '@/lib/portalApi';
import { DICTIONARY_COUNT } from '@/lib/dictionary';
import {
  buildImportReport,
  currentDatasetEntries,
  datasetToCsv,
  datasetToJson,
  downloadFile,
  filterEntryRows,
  parseImportFile,
  toEntryRows,
  type ImportReport,
  type StatusFilter,
} from '@/lib/dictionaryImport';

const CATEGORY_COLORS: Record<string, string> = {
  noun: '#63C0FF',
  verb: '#00F0FF',
  adjective: '#B98CFF',
  adverb: '#FFB84D',
  preposition: '#FF8FA3',
  pronoun: '#7EE8A2',
  conjunction: '#FFD166',
  interjection: '#FF7B72',
  prefix: '#9CD1FF',
  particle: '#C9B8FF',
  article: '#A0D2DB',
  other: '#9BA3AF',
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

const STATUS_META: Record<string, { label: string; color: string; title: string }> = {
  new: { label: 'NEW', color: '#00ff88', title: 'Not in the current dataset' },
  changed: { label: 'CHANGED', color: '#ffb84d', title: 'English word exists with a different POS or translation' },
  same: { label: 'SAME', color: '#9BA3AF', title: 'Identical to the current dataset' },
};

const KIND_META: Record<string, { label: string; color: string }> = {
  upload: { label: 'Upload', color: '#00f0ff' },
  edit: { label: 'Edit', color: '#ffb84d' },
  add: { label: 'Add', color: '#00ff88' },
  delete: { label: 'Delete', color: '#ff8a8a' },
};

interface EditorState {
  mode: 'add' | 'edit';
  original: string[];
  english: string;
  pos: string;
  zomi: string;
  category: string;
}

function StatCell({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

/** Human-readable summary line for one audit event. */
function describeAuditEvent(event: AuditEvent): string {
  const d = event.details ?? {};
  const count = Number(d.count ?? 0);
  switch (event.action) {
    case 'dictionary.publish':
    case 'dictionary.upload':
      return `Published dataset version ${String(d.version ?? '?')} — ${count.toLocaleString()} entries${
        d.fileName ? ` from ${String(d.fileName)}` : ''
      }`;
    case 'dictionary.export':
      return `Exported ${String(d.format ?? 'json').toUpperCase()} file — ${count.toLocaleString()} entries (${
        d.scope === 'import' ? 'import preview' : 'current dataset'
      })`;
    case 'dictionary.edit':
      return `Edited entry in version ${String(d.version ?? '?')} — "${String(d.note ?? '').replace(/^Edited /, '')}"`;
    case 'dictionary.add':
      return `Added entry in version ${String(d.version ?? '?')} — "${String(d.note ?? '').replace(/^Added /, '')}"`;
    case 'dictionary.delete':
      return `Deleted entry in version ${String(d.version ?? '?')} — "${String(d.note ?? '').replace(/^Deleted /, '')}"`;
    default:
      return Object.keys(d).length > 0 ? JSON.stringify(d) : event.action;
  }
}

function entryMutationMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  if (code.includes('duplicate_entry')) return 'An entry with the same English, POS and Zomi already exists.';
  if (code.includes('dataset_not_published')) return 'No dataset is published yet — publish one first.';
  if (code.includes('entry_not_found')) return 'This entry was changed on the server — refresh and try again.';
  if (code.includes('last_entry')) return 'The dataset must keep at least one entry.';
  if (code.includes('invalid_row_content')) return 'Both English and Zomi text are required.';
  if (code.includes('row_too_long')) return 'One of the fields is too long (1,000 character limit).';
  return 'The change could not be saved. Please try again.';
}

/** Admin tooling for the dictionary dataset: browse, search and edit every
 *  entry, import new files with a highlighted diff preview, review the version
 *  history of past uploads, and follow the central audit trail. */
export default function DictionaryManager({ token }: { token: () => Promise<string> }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<'entries' | 'history'>('entries');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [note, setNote] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const invalidateAll = (): void => {
    for (const key of ['admin-dictionary-entries', 'admin-dictionary', 'admin-audit-log', 'admin-dictionary-history']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const statusQuery = useQuery({
    queryKey: ['admin-dictionary'],
    queryFn: async () => fetchAdminDictionary(await token()),
  });

  const publishedQuery = useQuery({
    queryKey: ['admin-dictionary-entries'],
    queryFn: async () => fetchAdminDictionaryEntries(await token()),
  });

  const auditQuery = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => fetchAuditLog(await token()),
  });

  const historyQuery = useQuery({
    queryKey: ['admin-dictionary-history'],
    queryFn: async () => fetchDictionaryHistory(await token()),
  });

  const published = publishedQuery.data;
  const publishedAvailable = published?.available === true;

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!report) throw new Error('Import a file first.');
      return importAdminDictionary(await token(), datasetToJson(report.entries), report.fileName, note);
    },
    onSuccess: invalidateAll,
  });

  /** First-time setup: publish the bundled dataset so entry editing has a
   *  server-side source of truth to work against. */
  const initializeMutation = useMutation({
    mutationFn: async () =>
      importAdminDictionary(
        await token(),
        datasetToJson(currentDatasetEntries()),
        'bundled-dictionary.json',
        'Initialized from bundled dataset'
      ),
    onSuccess: invalidateAll,
  });

  const saveEntryMutation = useMutation({
    mutationFn: async () => {
      if (!editor) throw new Error('Nothing to save.');
      const entry = [editor.english.trim(), editor.pos.trim(), editor.zomi.trim(), editor.category];
      if (editor.mode === 'add') {
        await addDictionaryEntry(await token(), entry);
      } else {
        await editDictionaryEntry(await token(), editor.original, entry);
      }
    },
    onSuccess: () => {
      setEditor(null);
      setEditorError(null);
      invalidateAll();
    },
    onError: (err) => setEditorError(entryMutationMessage(err)),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (original: string[]) => deleteDictionaryEntry(await token(), original),
    onSuccess: () => {
      setEditor(null);
      setEditorError(null);
      invalidateAll();
    },
    onError: (err) => setEditorError(entryMutationMessage(err)),
  });

  /** Fire-and-forget: record an export in the audit trail, then download. */
  const exportDataset = (format: 'json' | 'csv'): void => {
    const entries = report
      ? report.entries
      : publishedAvailable
        ? published.entries
        : currentDatasetEntries();
    const content = format === 'json' ? datasetToJson(entries) : datasetToCsv(entries);
    const fileName = format === 'json' ? 'dictionary.json' : 'zomi-dictionary.csv';
    const mime = format === 'json' ? 'application/json' : 'text/csv';
    downloadFile(content, fileName, mime);
    void token()
      .then((t) => logDictionaryExport(t, format, entries.length, report ? 'import' : 'bundled'))
      .then(invalidateAll)
      .catch(() => undefined);
  };

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setParseError(null);
    setReport(null);
    setStatusFilter('all');
    setSearchQuery('');
    publishMutation.reset();
    setIsParsing(true);
    try {
      const rows = await parseImportFile(file);
      setReport(buildImportReport(file.name, rows));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not read the file.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearImport = (): void => {
    setReport(null);
    setNote('');
    setParseError(null);
    setStatusFilter('all');
    setSearchQuery('');
    publishMutation.reset();
  };

  const openEditor = (row: { english: string; pos: string; zomi: string; category: string }): void => {
    setEditorError(null);
    setEditor({
      mode: 'edit',
      original: [row.english, row.pos, row.zomi],
      english: row.english,
      pos: row.pos,
      zomi: row.zomi,
      category: row.category,
    });
  };

  const openAddEditor = (): void => {
    setEditorError(null);
    setEditor({ mode: 'add', original: [], english: '', pos: '', zomi: '', category: 'noun' });
  };

  const entryRows = useMemo(() => {
    if (report) return toEntryRows(report.entries, report.diff.statuses);
    if (publishedAvailable) return toEntryRows(published.entries);
    return toEntryRows(currentDatasetEntries());
  }, [report, published, publishedAvailable]);

  const editable = !report && publishedAvailable;

  const filteredRows = useMemo(
    () => filterEntryRows(entryRows, searchQuery, statusFilter),
    [entryRows, searchQuery, statusFilter]
  );

  const totalMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q && statusFilter === 'all') return entryRows.length;
    const scoped =
      statusFilter === 'all' ? entryRows : entryRows.filter((r) => r.status === statusFilter);
    if (!q) return scoped.length;
    return scoped.filter(
      (r) => r.english.toLowerCase().includes(q) || r.zomi.toLowerCase().includes(q)
    ).length;
  }, [entryRows, searchQuery, statusFilter]);

  const status = statusQuery.data;
  const diff = report?.diff;

  const filterChips: { id: StatusFilter; label: string; count: number | null }[] = [
    { id: 'all', label: 'All', count: report ? report.validCount : entryRows.length },
    { id: 'new', label: 'New', count: diff?.newCount ?? null },
    { id: 'changed', label: 'Changed', count: diff?.changedCount ?? null },
    { id: 'same', label: 'Same', count: diff?.sameCount ?? null },
  ];

  return (
    <GlassCard className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#00f0ff]" />
          <h2 className="text-lg font-semibold">Dictionary dataset</h2>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/55">
          Bundled: {DICTIONARY_COUNT.toLocaleString()} entries
        </span>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1.5">
        {(
          [
            { id: 'entries', label: 'Entries' },
            { id: 'history', label: 'Version history' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-[#00f0ff]/15 text-[#00f0ff]'
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'entries' ? (
        <>
          {/* Server status */}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            {statusQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading published dataset…
              </div>
            ) : statusQuery.isError ? (
              <div className="flex items-start gap-2 text-sm text-[#ffb3b3]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {statusQuery.error instanceof Error ? statusQuery.error.message : 'Could not load dataset status.'}
              </div>
            ) : status?.available ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-white/70">
                <span>
                  Published <span className="font-semibold text-white">version {status.version}</span>
                </span>
                <span>
                  <span className="font-semibold text-white">{status.count.toLocaleString()}</span> entries
                </span>
                <span className="text-white/45">
                  {status.updatedAt ? new Date(status.updatedAt).toLocaleString() : ''} · {status.updatedBy}
                </span>
                {status.fileName && <span className="text-white/45">from {status.fileName}</span>}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white/50">
                  No dataset published yet — publish one to enable individual entry editing and
                  over-the-air updates for the apps.
                </p>
                <button
                  type="button"
                  disabled={initializeMutation.isPending}
                  onClick={() => initializeMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-3.5 py-2 text-xs font-semibold text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/20 disabled:opacity-50"
                >
                  {initializeMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Publish bundled dataset
                </button>
              </div>
            )}
          </div>

          {/* Entry browser with search */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white/80">
                {report
                  ? 'Previewing imported entries'
                  : publishedAvailable
                    ? `Published entries${published ? ` (v${published.version})` : ''}`
                    : 'Current bundled entries'}
              </p>
              <div className="flex items-center gap-3">
                {editable && (
                  <button
                    type="button"
                    onClick={openAddEditor}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#00ff88] transition-opacity hover:opacity-75"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add entry
                  </button>
                )}
                {report && (
                  <button
                    type="button"
                    onClick={clearImport}
                    className="text-xs font-semibold text-white/50 transition-colors hover:text-white"
                  >
                    Clear import preview
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search English or Zomi…"
                  className="w-full rounded-xl border border-white/15 bg-black/20 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:border-[#00f0ff]/40 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filterChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={chip.count == null || chip.count === 0}
                    onClick={() => setStatusFilter(chip.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-30 ${
                      statusFilter === chip.id
                        ? 'border-[#00f0ff]/60 bg-[#00f0ff]/10 text-[#00f0ff]'
                        : 'border-white/15 text-white/55 hover:border-white/35 hover:text-white'
                    }`}
                  >
                    {chip.label}
                    {chip.count != null && report ? ` · ${chip.count.toLocaleString()}` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#131722] text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="px-3.5 py-2.5">English</th>
                    <th className="px-3.5 py-2.5">POS</th>
                    <th className="px-3.5 py-2.5">Zomi</th>
                    <th className="px-3.5 py-2.5">Category</th>
                    {report && <th className="px-3.5 py-2.5">Diff</th>}
                    {editable && <th className="px-3.5 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={report ? 5 : editable ? 5 : 4} className="px-3.5 py-8 text-center text-white/40">
                        No entries match this search.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, i) => {
                      const meta = STATUS_META[row.status];
                      const isNew = row.status === 'new';
                      const isChanged = row.status === 'changed';
                      const color = CATEGORY_COLORS[row.category] ?? '#9BA3AF';
                      return (
                        <tr
                          key={`${row.english}-${row.pos}-${i}`}
                          className={`border-t border-white/5 ${
                            isNew ? 'bg-[#00ff88]/[0.07]' : isChanged ? 'bg-[#ffb84d]/[0.06]' : ''
                          }`}
                        >
                          <td
                            className={`px-3.5 py-2 ${
                              isNew ? 'font-semibold text-[#7ee8a2]' : isChanged ? 'font-semibold text-[#ffb84d]' : 'text-white'
                            }`}
                          >
                            {row.english}
                          </td>
                          <td className="px-3.5 py-2 text-white/55">{row.pos || '—'}</td>
                          <td className="px-3.5 py-2 text-white/85">{row.zomi}</td>
                          <td className="px-3.5 py-2">
                            <span
                              className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                              style={{ color, borderColor: `${color}55`, backgroundColor: `${color}18` }}
                            >
                              {row.category}
                            </span>
                          </td>
                          {report && (
                            <td className="px-3.5 py-2">
                              {row.status !== 'same' && (
                                <span
                                  title={meta.title}
                                  className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                                  style={{ color: meta.color, backgroundColor: `${meta.color}1f` }}
                                >
                                  {meta.label}
                                </span>
                              )}
                            </td>
                          )}
                          {editable && (
                            <td className="px-3.5 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => openEditor(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/60 transition-colors hover:border-[#00f0ff]/50 hover:text-[#00f0ff]"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-white/40">
              Showing {filteredRows.length.toLocaleString()} of {totalMatches.toLocaleString()} matching entries
              {totalMatches > filteredRows.length ? ' (first 200)' : ''}.
              {report && ' New rows are highlighted green; changed rows are amber.'}
              {editable && ' Edits publish a new dataset version instantly — the apps pick it up automatically.'}
            </p>
          </div>

          {/* Import */}
          <div className="mt-5">
            <p className="text-sm font-semibold text-white/80">Import a new dataset</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Upload a CSV or Excel file with the columns English, Part of Speech, Zomi (a header row is
              detected automatically), or a previously exported dictionary.json. Part-of-speech values are
              normalized to the 12 categories automatically, and the preview highlights entries that are
              new or changed versus the current dataset.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isParsing}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00f0ff] px-4 py-2.5 text-sm font-semibold text-[#10131f] transition-transform hover:scale-[1.03] disabled:opacity-50"
              >
                {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isParsing ? 'Reading file…' : 'Choose file (.csv, .xlsx, .json)'}
              </button>
              <button
                type="button"
                onClick={() => exportDataset('csv')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/65 transition-colors hover:border-white/35 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" /> Export current as CSV
              </button>
              <button
                type="button"
                onClick={() => exportDataset('json')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/65 transition-colors hover:border-white/35 hover:text-white"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Download dictionary.json
              </button>
            </div>

            {parseError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#ff5e5e]/30 bg-[#ff5e5e]/10 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a8a]" />
                <p className="text-sm text-[#ffb3b3]">{parseError}</p>
              </div>
            )}

            {/* Import preview */}
            {report && (
              <div className="mt-4 rounded-xl border border-[#00f0ff]/25 bg-[#00f0ff]/[0.05] p-4">
                <p className="text-sm font-semibold text-white">
                  <FileSpreadsheet className="mr-1.5 inline h-4 w-4 text-[#00f0ff]" />
                  {report.fileName}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <StatCell label="Valid entries" value={report.validCount.toLocaleString()} tone="text-[#00f0ff]" />
                  <StatCell
                    label="New entries"
                    value={(diff?.newCount ?? 0).toLocaleString()}
                    tone={(diff?.newCount ?? 0) > 0 ? 'text-[#00ff88]' : 'text-white'}
                  />
                  <StatCell
                    label="Changed entries"
                    value={(diff?.changedCount ?? 0).toLocaleString()}
                    tone={(diff?.changedCount ?? 0) > 0 ? 'text-[#ffb84d]' : 'text-white'}
                  />
                  <StatCell
                    label="Removed (in bundle, not in file)"
                    value={(diff?.removedCount ?? 0).toLocaleString()}
                    tone={(diff?.removedCount ?? 0) > 0 ? 'text-[#ff8a8a]' : 'text-white'}
                  />
                </div>

                {(diff?.removedSamples.length ?? 0) > 0 && (
                  <p className="mt-2 text-xs text-white/45">
                    Removals include: {diff?.removedSamples.join(', ')}
                    {diff && diff.removedCount > diff.removedSamples.length
                      ? ` and ${(diff.removedCount - diff.removedSamples.length).toLocaleString()} more`
                      : ''}
                    .
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(report.categoryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => {
                      const color = CATEGORY_COLORS[category] ?? '#9BA3AF';
                      return (
                        <span
                          key={category}
                          className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ color, borderColor: `${color}55`, backgroundColor: `${color}18` }}
                        >
                          {category} · {count.toLocaleString()}
                        </span>
                      );
                    })}
                </div>

                {report.errors.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-white/45">
                    {report.errors.map((err) => (
                      <li key={err}>· {err}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Version note (e.g. added 200 words)"
                    className="min-w-48 flex-1 rounded-xl border border-white/15 bg-black/20 px-3.5 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#00f0ff]/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-[#10131f] transition-transform hover:scale-[1.03] disabled:opacity-50"
                  >
                    {publishMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : publishMutation.isSuccess ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {publishMutation.isPending ? 'Publishing…' : publishMutation.isSuccess ? 'Published' : 'Publish to server'}
                  </button>
                </div>

                {publishMutation.isError && (
                  <p className="mt-3 text-sm text-[#ffb3b3]">
                    {publishMutation.error instanceof Error ? publishMutation.error.message : 'Publish failed.'}
                  </p>
                )}
                {publishMutation.isSuccess && (
                  <p className="mt-3 text-sm text-[#7ee8a2]">
                    Published version {publishMutation.data.version} with{' '}
                    {publishMutation.data.count.toLocaleString()} entries.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Version history tab */
        <div className="mt-4">
          {historyQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading version history…
            </div>
          ) : historyQuery.isError ? (
            <p className="text-sm text-[#ffb3b3]">Could not load the version history.</p>
          ) : (historyQuery.data?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/50">
              No versions yet. Publishing a dataset — or editing, adding or deleting a single entry —
              records a new version here.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#131722] text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="px-3.5 py-2.5">Version</th>
                    <th className="px-3.5 py-2.5">Type</th>
                    <th className="px-3.5 py-2.5">Note</th>
                    <th className="px-3.5 py-2.5">Entries</th>
                    <th className="px-3.5 py-2.5">Published by</th>
                    <th className="px-3.5 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyQuery.data?.map((v: DictionaryVersion) => {
                    const meta = KIND_META[v.kind] ?? { label: v.kind, color: '#9BA3AF' };
                    return (
                      <tr key={`${v.version}-${v.createdAt}`} className="border-t border-white/5">
                        <td className="px-3.5 py-2.5 font-semibold text-white">v{v.version}</td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                            style={{ color: meta.color, backgroundColor: `${meta.color}1f` }}
                          >
                            {meta.label.toUpperCase()}
                          </span>
                        </td>
                        <td className="max-w-56 truncate px-3.5 py-2.5 text-white/75" title={v.note}>
                          {v.note || (v.fileName ? `from ${v.fileName}` : '—')}
                        </td>
                        <td className="px-3.5 py-2.5 text-white/60">{v.totalRows.toLocaleString()}</td>
                        <td className="px-3.5 py-2.5 text-white/55">{v.createdBy}</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 text-white/45">
                          {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-white/40">
            Each upload, edit, addition or deletion creates a new dataset version that the apps fetch
            automatically at startup.
          </p>
        </div>
      )}

      {/* Audit log */}
      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#b98cff]" />
            <p className="text-sm font-semibold text-white/80">Audit trail</p>
            <span className="text-xs text-white/40">every import, export and publication</span>
          </div>
          <button
            type="button"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })}
            className="text-white/45 transition-colors hover:text-white"
            title="Refresh audit log"
          >
            <RefreshCw className={`h-4 w-4 ${auditQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {auditQuery.isLoading ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading audit trail…
          </div>
        ) : auditQuery.isError ? (
          <p className="mt-3 text-sm text-[#ffb3b3]">Could not load the audit trail.</p>
        ) : (auditQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-white/45">
            No admin actions recorded yet. Imports, exports and publications will appear here with the
            acting admin's identity.
          </p>
        ) : (
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {auditQuery.data?.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-white/5 pb-2 text-sm last:border-0"
              >
                <span className="font-semibold text-white/85">{describeAuditEvent(event)}</span>
                <span className="text-xs text-white/45">
                  {event.email || event.userId} ·{' '}
                  {event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-white/45">
        <strong className="text-white/70">How updates reach users:</strong> the apps check{' '}
        <code>/api/dictionary/latest</code> at startup and refresh their local dictionary cache when a
        newer version is published — no app store release needed. To change the bundled baseline in an
        app build, download <span className="text-white/70">dictionary.json</span> as a drop-in
        replacement (Expo <code>constants/</code>, web <code>src/lib/</code>, the iOS project and the
        Android <code>assets/</code> folder).
      </p>

      {/* Entry editor modal */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#131722] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {editor.mode === 'add' ? 'Add entry' : `Edit "${editor.english}"`}
              </h3>
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="text-white/45 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">English *</label>
                <input
                  value={editor.english}
                  onChange={(e) => setEditor({ ...editor, english: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-2 text-sm text-white focus:border-[#00f0ff]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Part of speech</label>
                <input
                  value={editor.pos}
                  onChange={(e) => setEditor({ ...editor, pos: e.target.value })}
                  placeholder="e.g. noun, v.t., adv."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#00f0ff]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Zomi *</label>
                <input
                  value={editor.zomi}
                  onChange={(e) => setEditor({ ...editor, zomi: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-2 text-sm text-white focus:border-[#00f0ff]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Category</label>
                <select
                  value={editor.category}
                  onChange={(e) => setEditor({ ...editor, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-2 text-sm text-white focus:border-[#00f0ff]/40 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#131722]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editorError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#ff5e5e]/30 bg-[#ff5e5e]/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a8a]" />
                <p className="text-xs text-[#ffb3b3]">{editorError}</p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              {editor.mode === 'edit' ? (
                <button
                  type="button"
                  disabled={deleteEntryMutation.isPending}
                  onClick={() => deleteEntryMutation.mutate(editor.original)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#ff5e5e]/40 px-3.5 py-2 text-xs font-semibold text-[#ff8a8a] transition-colors hover:bg-[#ff5e5e]/10 disabled:opacity-50"
                >
                  {deleteEntryMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="rounded-xl border border-white/15 px-3.5 py-2 text-sm font-semibold text-white/65 transition-colors hover:border-white/35 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveEntryMutation.isPending || !editor.english.trim() || !editor.zomi.trim()}
                  onClick={() => saveEntryMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00f0ff] px-4 py-2 text-sm font-semibold text-[#10131f] transition-transform hover:scale-[1.03] disabled:opacity-50"
                >
                  {saveEntryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {editor.mode === 'add' ? 'Add entry' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
