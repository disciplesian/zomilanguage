import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';

import { GlassCard } from '@/components/SiteLayout';
import { importAdminDictionary, fetchAdminDictionary } from '@/lib/portalApi';
import { DICTIONARY_COUNT } from '@/lib/dictionary';
import {
  buildImportReport,
  currentDatasetEntries,
  datasetToCsv,
  datasetToJson,
  downloadFile,
  parseImportFile,
  type ImportReport,
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

function StatCell({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

/** Admin tooling for the dictionary dataset: import a new CSV/XLSX/JSON file,
 *  validate it, export the normalized bundle, and publish a versioned copy to
 *  the server for future app updates. */
export default function DictionaryManager({ token }: { token: () => Promise<string> }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [report, setReport] = useState<ImportReport | null>(null);
  const [note, setNote] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const statusQuery = useQuery({
    queryKey: ['admin-dictionary'],
    queryFn: async () => fetchAdminDictionary(await token()),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!report) throw new Error('Import a file first.');
      return importAdminDictionary(await token(), datasetToJson(report.entries), report.fileName, note);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-dictionary'] });
    },
  });

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setParseError(null);
    setReport(null);
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

  const downloadBundle = (): void => {
    const entries = report ? report.entries : currentDatasetEntries();
    downloadFile(datasetToJson(entries), 'dictionary.json', 'application/json');
  };

  const downloadCsv = (): void => {
    const entries = report ? report.entries : currentDatasetEntries();
    downloadFile(datasetToCsv(entries), 'zomi-dictionary.csv', 'text/csv');
  };

  const status = statusQuery.data;
  const delta = report ? report.validCount - DICTIONARY_COUNT : 0;

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

      {/* Import */}
      <div className="mt-5">
        <p className="text-sm font-semibold text-white/80">Import a new dataset</p>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Upload a CSV or Excel file with the columns English, Part of Speech, Zomi (a header row is
          detected automatically), or a previously exported dictionary.json. Part-of-speech values are
          normalized to the 12 categories automatically.
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
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/65 transition-colors hover:border-white/35 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" /> Export current as CSV
          </button>
          <button
            type="button"
            onClick={downloadBundle}
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
                label="vs bundled"
                value={`${delta >= 0 ? '+' : ''}${delta.toLocaleString()}`}
                tone={delta >= 0 ? 'text-[#00ff88]' : 'text-[#ff8a8a]'}
              />
              <StatCell label="Duplicates removed" value={report.duplicateCount.toLocaleString()} />
              <StatCell label="Skipped rows" value={report.skippedCount.toLocaleString()} />
            </div>

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
