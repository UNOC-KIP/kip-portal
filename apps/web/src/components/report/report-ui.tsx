/**
 * Shared presentational primitives for the /console/report hub. Server-safe
 * (no hooks) so report pages can compose them directly. Pure CSS bars — no
 * chart library — so everything prints and works on the read-only demo.
 */
import type { BreakdownRow, FunnelRow } from "@/lib/admin/mappers";

export function Panel({
  title,
  dot,
  children,
}: {
  title: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm print:break-inside-avoid">
      <div className="mb-5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** Horizontal bar list for a labelled-count breakdown. */
export function BarList({
  rows,
  accent,
  empty,
}: {
  rows: BreakdownRow[];
  accent: string;
  empty: string;
}) {
  const max = Math.max(1, rows[0]?.count ?? 1);
  if (rows.length === 0) return <p className="text-sm text-ink-400">{empty}</p>;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-ink-500" title={row.label}>
            {row.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${accent} transition-all`}
              style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-6 text-right text-xs font-bold text-ink-700">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-300 bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100">
        <Icon size={16} className="text-ink-500" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black leading-none text-ink-900">{value}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-ink-500">{label}</p>
      </div>
    </div>
  );
}

const FUNNEL_COLORS = ["bg-slate-400", "bg-blue-500", "bg-violet-500", "bg-fuchsia-500", "bg-brand-500"];

/** Vertical list of funnel stages with proportional bars. */
export function FunnelBars({ rows, empty }: { rows: FunnelRow[]; empty: string }) {
  const max = Math.max(1, rows[0]?.count ?? 1);
  if (rows.length === 0 || (rows[0]?.count ?? 0) === 0)
    return <p className="text-sm text-ink-400">{empty}</p>;
  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-ink-600">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-400">{row.pct}%</span>
              <span className="w-6 text-right text-xs font-bold text-ink-800">{row.count}</span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full transition-all ${FUNNEL_COLORS[i] ?? "bg-ink-400"}`}
              style={{ width: row.count === 0 ? "0%" : `${Math.max(4, (row.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Column chart of weekly counts (index 0 = oldest week). Fixed height so a
 * row of trend panels aligns; each column carries a tooltip with its count.
 */
export function TrendBars({
  buckets,
  accent,
  caption,
}: {
  buckets: number[];
  accent: string;
  caption: string;
}) {
  const max = Math.max(1, ...buckets);
  const total = buckets.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {buckets.map((count, i) => (
          <div
            key={i}
            className="group relative flex-1 rounded-t bg-ink-100"
            title={`${count} · week ${i + 1 - buckets.length}`}
          >
            <div
              className={`w-full rounded-t ${accent} transition-all`}
              style={{ height: `${count === 0 ? 2 : Math.max(6, (count / max) * 96)}px` }}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        {caption} · {total} in the last {buckets.length} weeks
      </p>
    </div>
  );
}

/**
 * Column chart over labelled buckets (day / week / month sign-ups). Unlike
 * `TrendBars` the buckets carry their own labels, so the x-axis is annotated:
 * with many columns only every nth tick is drawn to keep it legible, and each
 * column keeps its full label in a tooltip.
 */
export function SeriesBars({
  buckets,
  accent,
  empty,
}: {
  buckets: { key: string; label: string; count: number }[];
  accent: string;
  empty: string;
}) {
  if (buckets.length === 0) return <p className="text-sm text-ink-400">{empty}</p>;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  // Aim for ~8 ticks regardless of series length.
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 8));

  return (
    <div>
      <div className="flex h-32 items-end gap-[3px]">
        {buckets.map((b) => (
          <div
            key={b.key}
            className="group flex h-full flex-1 flex-col justify-end"
            title={`${b.label}: ${b.count} sign-up${b.count === 1 ? "" : "s"}`}
          >
            <span className="mb-1 text-center text-[9px] font-bold text-ink-500 opacity-0 transition group-hover:opacity-100">
              {b.count}
            </span>
            <div
              className={`w-full rounded-t ${b.count === 0 ? "bg-ink-100" : accent} transition-all`}
              style={{ height: `${b.count === 0 ? 2 : Math.max(6, (b.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] border-t border-ink-100 pt-1.5">
        {buckets.map((b, i) => (
          <div key={b.key} className="min-w-0 flex-1 text-center">
            {i % tickEvery === 0 ? (
              <span className="block truncate text-[9px] text-ink-400">
                {b.label.replace("Week of ", "")}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Print-only report heading (screens show the tab bar + page header instead). */
export function PrintHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="hidden print:mb-4 print:block">
      <h1 className="text-xl font-black text-ink-900">{title}</h1>
      <p className="text-xs text-ink-500">{meta}</p>
    </div>
  );
}
