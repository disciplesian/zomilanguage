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
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';

import { GlassCard } from '@/components/SiteLayout';
import {
  fetchAdminDictionary,
  fetchAuditLog,
  importAdminDictionary,
  logDictionaryExport,
  type AuditEvent,
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

const STATUS_META: Record<string, { label: string; color: string; title: string }> = {
  new: { label: 'NEW', color: '#00ff88', title: 'Not in the current dataset' },
  changed: { label: 'CHANGED', color: '#ffb84d', title: 'English word exists with a different POS or translation' },
  same: { label: 'SAME', color: '#9BA3AF', title: 'Identical to the current dataset' },
};

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
      return `Published dataset version ${String(d.version ?? '?')} — ${count.toLocaleString()} entries${
        d.fileName ? ` from ${String(d.fileName)}` : ''
      }`;
    case 'dictionary.export':
      return `Exported ${String(d.format ?? 'json').toUpperCase()} file — ${count.toLocaleString()} entries (${
        d.scope === 'import' ? 'import preview' : 'current dataset'
      })`;
    default:
      return Object.keys(d).length > 0 ? JSON.stringify(d) : event.action;
  }
}

/** Admin tooling for the dictionary dataset: browse and search the current
 *  entries, import a new CSV/XLSX/JSON file with a highlighted diff preview,
 *  export the normalized bundle, and review the central audit trail. */
export default function DictionaryManager({ token }: { token: () => Promise<string> }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [report, setReport] = useState<ImportReport | null>(null);
  const [note, setNote] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const statusQuery = useQuery({
    queryKey: ['admin-dictionary'],
    queryFn: async () => fetchAdminDictionary(await token()),
  });

  const auditQuery = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => fetchAuditLog(await token()),
  });

  const refreshAudit = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] });
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!report) throw new Error('Import a file first.');
      return importAdminDictionary(await token(), datasetToJson(report.entries), report.fileName, note);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-dictionary'] });
      refreshAudit();
    },
  });

  /** Fire-and-forget: record an export in the audit trail, then download. */
  const exportDataset = (format: 'json' | 'csv'): void => {
    const entries = report ? report.entries : currentDatasetEntries();
    const content = format === 'json' ? datasetToJson(entries) : datasetToCsv(entries);
    const fileName = format === 'json' ? 'dictionary.json' : 'zomi-dictionary.csv';
    const mime = format === 'json' ? 'application/json' : 'text/csv';
    downloadFile(content, fileName, mime);
    void token()
      .then((t) => logDictionaryExport(t, format, entries.length, report ? 'import' : 'bundled'))
      .then(refreshAudit)
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

  const entryRows = useMemo(
    () => (report ? toEntryRows(report.entries, report.diff.statuses) : toEntryRows(currentDatasetEntries())),
    [report]
  );

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
  const hasDiffCounts = diff != null && (diff.newCount > 0 || diff.changedCount > 0 || diff.removedCount > 0);

  const filterChips: { id: StatusFilter; label: string; count: number | null }[] = [
    { id: 'all', label: 'All', count: report ? report.validCount : DICTIONARY_COUNT },
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
          <p className="text-sm text-white/50">
            No dataset published yet. Import a file below and publish it to make it the canonical
            version for future app updates.
          </p>
        )}
      </div>

      {/* Entry browser with search */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white/80">
            {report ? 'Previewing imported entries' : 'Current dictionary entries'}
          </p>
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
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={report ? 5 : 4} className="px-3.5 py-8 text-center text-white/40">
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
        <strong className="text-white/70">How to apply an update:</strong> download{' '}
        <span className="text-white/70">dictionary.json</span> and it becomes a drop-in replacement for
        the bundled dataset in each app (Expo <code>constants/</code>, web <code>src/lib/</code>, the
        iOS project and the Android <code>assets/</code> folder), then rebuild the apps. Publishing to
        the server stores the canonical versioned copy — future app builds can fetch it from{' '}
        <code>/api/dictionary/latest</code> automatically.
      </p>
    </GlassCard>
  );
}
