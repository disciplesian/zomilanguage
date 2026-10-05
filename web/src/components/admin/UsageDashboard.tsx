import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Database,
  Gauge,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import { GlassCard } from '@/components/SiteLayout';
import {
  fetchAdminUsage,
  type AdminUsage,
  type AdminUsageModelRow,
} from '@/lib/portalApi';

const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const usd = (n: number): string =>
  n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/40">{label}</p>
      {hint && <p className={`mt-1 text-[11px] ${tone}`}>{hint}</p>}
    </div>
  );
}

const LEVEL_STYLES: Record<AdminUsage['rate']['level'], { ring: string; text: string; bg: string }> = {
  ok: { ring: 'border-[#00ff88]/40', text: 'text-[#7dffbe]', bg: 'bg-[#00ff88]/10' },
  warning: { ring: 'border-[#ffd000]/50', text: 'text-[#ffe066]', bg: 'bg-[#ffd000]/10' },
  critical: { ring: 'border-[#ff5e5e]/50', text: 'text-[#ff8a8a]', bg: 'bg-[#ff5e5e]/10' },
};

function RateBanner({ usage }: { usage: AdminUsage }) {
  const { rate } = usage;
  const style = LEVEL_STYLES[rate.level];
  return (
    <div className={`mt-4 rounded-xl border ${style.ring} ${style.bg} p-4`}>
      <div className="flex flex-wrap items-center gap-2.5">
        {rate.level === 'ok' ? (
          <CheckCircle2 className="h-5 w-5 text-[#00ff88]" />
        ) : (
          <AlertTriangle className={`h-5 w-5 ${style.text}`} />
        )}
        <span className={`text-sm font-semibold capitalize ${style.text}`}>
          {rate.level === 'ok' ? 'Rate headroom is healthy' : `Rate-limit ${rate.level}`}
        </span>
        <span className="text-xs text-white/45">
          {rate.requestsPerMinute.toFixed(1)} req/min · {rate.errorsPerMinute.toFixed(1)} err/min ·{' '}
          {fmt(rate.tokensPerMinute)} tok/min (5-min avg)
        </span>
      </div>
      {rate.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rate.reasons.map((reason) => (
            <li key={reason} className="text-xs leading-relaxed text-white/65">
              • {reason}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-white/35">
        Alert thresholds — warn at {rate.thresholds.rpmWarn} req/min, critical at{' '}
        {rate.thresholds.rpmCritical} req/min · errors warn {rate.thresholds.errorsWarn}/min,
        critical {rate.thresholds.errorsCritical}/min (env-tunable).
      </p>
    </div>
  );
}

function HistoryChart({ history }: { history: AdminUsage['history'] }) {
  const days = [...history].reverse(); // oldest → newest
  if (days.length === 0) return null;
  const maxTokens = Math.max(...days.map((d) => d.promptTokens + d.outputTokens), 1);
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
        Last {days.length} day{days.length === 1 ? '' : 's'} · tokens per day
      </p>
      <div className="mt-3 flex h-32 items-end gap-1.5">
        {days.map((d) => {
          const total = d.promptTokens + d.outputTokens;
          const height = Math.max(4, Math.round((total / maxTokens) * 100));
          return (
            <div
              key={d.day}
              title={`${d.day}: ${fmt(total)} tokens · ${fmt(d.requests)} requests · ${d.errors} errors`}
              className="flex-1 rounded-t-md bg-gradient-to-t from-[#8c5cff]/70 to-[#00f0ff]/80 transition-transform hover:scale-y-[1.02]"
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-white/35">
        <span>{days[0]?.day}</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
    </div>
  );
}

function ModelTable({ rows }: { rows: AdminUsageModelRow[] }) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-white/45">No model calls recorded yet today.</p>;
  }
  return (
    <div className="mt-4 space-y-2">
      {rows.map((row) => (
        <div
          key={row.model}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-[#00f0ff]/90">{row.model}</p>
            <p className="text-xs text-white/45">
              {fmt(row.promptTokens)} in · {fmt(row.outputTokens)} out
              {row.errors > 0 && <span className="text-[#ff8a8a]"> · {row.errors} errors</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{fmt(row.requests)}</p>
            <p className="text-[11px] text-white/40">{usd(row.estimatedCostUsd)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const UsageDashboard = ({ token }: { token: () => Promise<string> }) => {
  const usageQuery = useQuery<AdminUsage>({
    queryKey: ['admin-usage'],
    queryFn: async () => fetchAdminUsage(await token()),
    refetchInterval: 30_000,
  });

  if (usageQuery.isLoading) {
    return (
      <GlassCard className="mt-6 flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
      </GlassCard>
    );
  }

  if (usageQuery.isError || !usageQuery.data) {
    return (
      <GlassCard className="mt-6">
        <h2 className="text-lg font-semibold">AI usage & spend</h2>
        <p className="mt-3 text-sm text-[#ffb3b3]">
          {usageQuery.error instanceof Error
            ? usageQuery.error.message
            : 'Could not load AI usage data.'}
        </p>
      </GlassCard>
    );
  }

  const usage = usageQuery.data;
  const totalTokens = usage.today.promptTokens + usage.today.outputTokens;

  return (
    <GlassCard className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-[#00f0ff]" />
          <h2 className="text-lg font-semibold">AI usage & spend</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-semibold text-[#7dffbe]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Aggregate only — no per-user data
        </span>
      </div>

      <RateBanner usage={usage} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Requests today"
          value={fmt(usage.today.requests)}
          hint={`${usage.today.errors} failed`}
          tone="text-white/40"
        />
        <Tile
          label="Tokens today"
          value={fmt(totalTokens)}
          hint={`${fmt(usage.today.promptTokens)} in · ${fmt(usage.today.outputTokens)} out`}
          tone="text-white/40"
        />
        <Tile
          label="Est. spend today"
          value={usd(usage.today.estimatedCostUsd)}
          hint={`@ $${usage.pricing.inputUsdPerMillion}/$${usage.pricing.outputUsdPerMillion} per 1M`}
          tone="text-white/40"
        />
        <Tile
          label="Error rate"
          value={`${usage.today.requests > 0 ? Math.round((usage.today.errors / usage.today.requests) * 100) : 0}%`}
          hint={usage.today.requests > 0 ? 'of requests today' : 'no requests yet'}
          tone="text-white/40"
        />
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
          <Activity className="h-3.5 w-3.5" />
          Models today
        </div>
        <ModelTable rows={usage.byModel} />
      </div>

      {usage.persistAvailable ? (
        <HistoryChart history={usage.history} />
      ) : (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#ffd000]/30 bg-[#ffd000]/5 p-3.5">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#ffe066]" />
          <p className="text-xs leading-relaxed text-white/60">
            Usage history is not persisted yet — apply{' '}
            <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-[#ffe066]">
              backend/sql/gemini-usage.sql
            </code>{' '}
            in the Supabase SQL Editor to keep 30-day history. Today&apos;s live numbers are always
            shown from memory.
          </p>
        </div>
      )}

      {usage.lastFlushError && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#ffb3b3]">
          <Coins className="h-3.5 w-3.5" />
          Persist error: {usage.lastFlushError}
        </p>
      )}
    </GlassCard>
  );
};

export default UsageDashboard;
