import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bug, CheckCircle2, Clock, Loader2, ShieldCheck, Zap } from 'lucide-react';

import { GlassCard } from '@/components/SiteLayout';
import { cn } from '@/lib/utils';
import { fetchAdminProblems, type ProblemRow } from '@/lib/portalApi';

const KIND_META: Record<ProblemRow['kind'], { label: string; icon: typeof Bug; tone: string }> = {
  crash: { label: 'Crash', icon: Zap, tone: 'text-[#ff8a8a] bg-[#ff5e5e]/10 border-[#ff5e5e]/30' },
  error: { label: 'Error', icon: Bug, tone: 'text-[#ffe066] bg-[#ffd000]/10 border-[#ffd000]/30' },
  slow: { label: 'Slow', icon: Clock, tone: 'text-[#9ad8ff] bg-[#00f0ff]/10 border-[#00f0ff]/30' },
};

const PLATFORM_LABEL: Record<string, string> = {
  ios: 'iPhone',
  android: 'Android',
  web: 'Web',
  expo: 'Expo',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Admin card: crashes, errors and slow screens reported by the apps (aggregate only). */
const ProblemReports = ({ token }: { token: () => Promise<string> }) => {
  const [days, setDays] = useState<number>(7);
  const query = useQuery<ProblemRow[]>({
    queryKey: ['admin-problems', days],
    queryFn: async () => fetchAdminProblems(await token(), days),
    refetchInterval: 60_000,
  });

  const rows = query.data ?? [];
  const crashes = rows.filter((r) => r.kind === 'crash').reduce((n, r) => n + r.total, 0);

  return (
    <GlassCard className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-[#00f0ff]" />
          <h2 className="text-lg font-semibold">Problem reports</h2>
          {crashes > 0 && (
            <span className="rounded-full bg-[#ff5e5e]/15 px-2 py-0.5 text-[11px] font-bold text-[#ff8a8a]">
              {crashes} crash{crashes === 1 ? '' : 'es'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                days === d
                  ? 'border-[#00f0ff]/50 bg-[#00f0ff]/15 text-[#9af7ff]'
                  : 'border-white/10 text-white/50 hover:text-white/80'
              )}
            >
              {d === 1 ? 'Today' : `${d} days`}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/40">
        <ShieldCheck className="h-3.5 w-3.5 text-[#00ff88]" />
        Counts and scrubbed error messages only. No users, devices, or translated text.
      </p>

      {query.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
        </div>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-[#ffb3b3]">
          {query.error instanceof Error ? query.error.message : 'Could not load problem reports.'}
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#00ff88]/25 bg-[#00ff88]/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-[#00ff88]" />
          <p className="text-sm text-white/70">No problems reported in this period.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => {
            const meta = KIND_META[row.kind] ?? KIND_META.error;
            const Icon = meta.icon;
            return (
              <li
                key={`${row.platform}-${row.appVersion}-${row.kind}-${row.signature}`}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold', meta.tone)}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      <span className="text-white/55">{PLATFORM_LABEL[row.platform] ?? row.platform}</span>
                      {row.appVersion && <span className="text-white/35">v{row.appVersion}</span>}
                      {row.screen && <span className="text-white/35">· {row.screen}</span>}
                    </div>
                    <p className="mt-1.5 break-words font-mono text-xs leading-relaxed text-white/80">
                      {row.signature}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold">{row.total}</p>
                    <p className="text-[10px] text-white/35">{timeAgo(row.lastSeen)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
};

export default ProblemReports;
