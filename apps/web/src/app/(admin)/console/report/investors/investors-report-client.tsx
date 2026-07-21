"use client";

/**
 * Investor Onboarding report — interactive shell.
 *
 * The server hands us every investor row once; every KPI, breakdown, chart and
 * export on this page is then derived from the *filtered* subset in the
 * browser. That is what makes the drill-down honest: select a zone or a date
 * range and the headline counts, the funnel, the sign-up trend and the CSV all
 * describe the same slice — there is no "filtered table, unfiltered numbers"
 * mismatch, and no round-trip, so it still works on the read-only demo.
 */

import { useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  CheckCircle2,
  DollarSign,
  FileText,
  Award,
  MapPin,
  Ruler,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Panel, BarList, MiniStat, FunnelBars, SeriesBars } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { InvestorReportTable } from "./investor-report-table";
import {
  buildInvestorReportSummary,
  INVESTOR_EXPORT_COLUMNS,
  PERIOD_TREND_COLUMNS,
  ZONE_BREAKDOWN_COLUMNS,
} from "@/lib/report-export";
import {
  DATE_PRESETS,
  EMPTY_INVESTOR_FILTERS,
  GRANULARITY_LABELS,
  ZONE_NONE,
  activeFilterCount,
  bucketByPeriod,
  computeInvestorStats,
  computeFunnel,
  countBy,
  describeInvestorFilters,
  filterInvestors,
  presetRange,
  trendStats as computeTrendStats,
  zoneBreakdown,
  zoneLabelFor,
  type DatePreset,
  type Granularity,
  type InvestorFilters,
} from "@/lib/report-filters";
import type { ReportData } from "@/lib/admin/mappers";

const GRANULARITIES: Granularity[] = ["day", "week", "month"];

/** Options for the plain-select filters, derived from the data actually present. */
function optionsFor(rows: { [k: string]: unknown }[], key: string): string[] {
  return Array.from(new Set(rows.map((r) => String(r[key] ?? "")).filter(Boolean))).sort();
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-ink-300 bg-white px-2 text-xs text-ink-700 outline-none transition focus:border-brand-500"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InvestorsReportClient({ report }: { report: ReportData }) {
  const [filters, setFilters] = useState<InvestorFilters>(EMPTY_INVESTOR_FILTERS);
  const [granularity, setGranularity] = useState<Granularity>("week");

  // Which preset chip is lit. Held as state rather than derived from the dates
  // via `matchPreset(range, new Date())`: reading the clock during render makes
  // the server and client markup disagree, which is a hydration error.
  const [activePreset, setActivePreset] = useState<DatePreset | "custom">("all");

  const all = report.investors;
  const set = (patch: Partial<InvestorFilters>) => setFilters((f) => ({ ...f, ...patch }));

  /** Preset chip → resolve the range against the clock, in the handler only. */
  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    set(presetRange(preset, new Date()));
  };

  /** Hand-edited date input → the range is no longer a preset. */
  const setBound = (patch: Partial<InvestorFilters>) => {
    setActivePreset("custom");
    set(patch);
  };

  const rows = useMemo(() => filterInvestors(all, filters), [all, filters]);
  const stats = useMemo(() => computeInvestorStats(rows), [rows]);
  const funnel = useMemo(() => computeFunnel(rows), [rows]);

  // Zone counts always come from the *date/other*-filtered set but ignore the
  // zone filter itself — otherwise picking a zone would zero out every other
  // bar and you could no longer see what you are drilling away from. Their
  // percentages are therefore relative to `zoneScope`, not to `rows`.
  const zoneScope = useMemo(() => filterInvestors(all, { ...filters, zone: "" }), [all, filters]);
  const zoneRows = useMemo(() => zoneBreakdown(zoneScope), [zoneScope]);
  const zoneScopeStats = useMemo(() => computeInvestorStats(zoneScope), [zoneScope]);

  const trend = useMemo(
    () => bucketByPeriod(rows, (r) => r.registeredOn, granularity),
    [rows, granularity],
  );
  const trendStats = useMemo(() => computeTrendStats(trend), [trend]);

  const byCountry = useMemo(() => countBy(rows, "country").slice(0, 8), [rows]);
  const bySector = useMemo(() => countBy(rows, "sector").slice(0, 8), [rows]);
  const byCompanyType = useMemo(() => countBy(rows, "companyType").slice(0, 8), [rows]);

  const filterCount = activeFilterCount(filters);
  const filterDescription = describeInvestorFilters(filters);

  const summary = buildInvestorReportSummary({
    generatedAt: report.generatedAt,
    windowName: report.windowName,
    filterDescription,
    totalUnfiltered: all.length,
    stats,
    granularityLabel: GRANULARITY_LABELS[granularity],
    trend,
    trendStats,
    zones: zoneRows,
    byCountry,
    bySector,
  });

  return (
    <>
      {/* ── Export bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-ink-500">
          Showing <span className="font-bold text-ink-900">{rows.length}</span> of {all.length}{" "}
          registered investors
          {filterCount > 0 ? <span className="text-ink-400"> · {filterDescription}</span> : null}
        </p>
        <ReportExportActions
          filenamePrefix="kip-investor-onboarding"
          summary={summary}
          csv={{
            label: "Investors CSV (filtered)",
            columns: INVESTOR_EXPORT_COLUMNS,
            rows: rows as unknown as Record<string, unknown>[],
          }}
          extraCsvs={[
            {
              label: `Sign-ups CSV (${GRANULARITY_LABELS[granularity].toLowerCase()})`,
              filenamePrefix: `kip-investor-signups-${granularity}`,
              columns: PERIOD_TREND_COLUMNS,
              rows: trend as unknown as Record<string, unknown>[],
            },
            {
              label: "Zone breakdown CSV",
              filenamePrefix: "kip-investor-zones",
              columns: ZONE_BREAKDOWN_COLUMNS,
              rows: zoneRows as unknown as Record<string, unknown>[],
            },
          ]}
        />
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-ink-300 bg-white p-4 shadow-sm print:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-ink-400" />
            <h2 className="text-sm font-bold text-ink-900">Filters</h2>
            {filterCount > 0 ? (
              <span className="rounded-full bg-brand-400 px-2 py-0.5 text-[10px] font-bold text-black">
                {filterCount} active
              </span>
            ) : null}
          </div>
          {filterCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-ink-500"
              onClick={() => { setFilters(EMPTY_INVESTOR_FILTERS); setActivePreset("all"); }}
            >
              <X size={12} />
              Clear all
            </Button>
          ) : null}
        </div>

        {/* Registration date range */}
        <div className="flex flex-wrap items-end gap-3 border-b border-ink-100 pb-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Registered
            </span>
            <div className="flex flex-wrap gap-1">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => applyPreset(p.value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activePreset === p.value
                      ? "bg-ink-900 text-white"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setBound({ from: e.target.value })}
              className="h-8 rounded-lg border border-ink-300 px-2 text-xs text-ink-700 outline-none focus:border-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setBound({ to: e.target.value })}
              className="h-8 rounded-lg border border-ink-300 px-2 text-xs text-ink-700 outline-none focus:border-brand-500"
            />
          </label>
        </div>

        {/* Attribute filters */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <FilterSelect
            label="Account"
            value={filters.account}
            options={optionsFor(all, "accountStatus")}
            onChange={(v) => set({ account: v })}
          />
          <FilterSelect
            label="Payment"
            value={filters.payment}
            options={optionsFor(all, "paymentStatus")}
            onChange={(v) => set({ payment: v })}
          />
          <FilterSelect
            label="EOI stage"
            value={filters.stage}
            options={optionsFor(all, "eoiStage")}
            onChange={(v) => set({ stage: v })}
          />
          <FilterSelect
            label="Country"
            value={filters.country}
            options={optionsFor(all, "country")}
            onChange={(v) => set({ country: v })}
          />
          <FilterSelect
            label="Sector"
            value={filters.sector}
            options={optionsFor(all, "sector")}
            onChange={(v) => set({ sector: v })}
          />
        </div>
      </div>

      {/* ── Zone drill-down ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm print:break-inside-avoid">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-ink-400" />
            <h2 className="text-sm font-bold text-ink-900">Zone of Interest</h2>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
              {zoneScopeStats.withZoneInterest} of {zoneScopeStats.total} declared
            </span>
          </div>
          {filters.zone ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-ink-500 print:hidden"
              onClick={() => set({ zone: "" })}
            >
              <X size={12} />
              Clear zone
            </Button>
          ) : null}
        </div>

        <p className="mb-4 text-[11px] text-ink-400">
          Declared through site-visit requests — the only place an investor states which part of the
          master plan they want. Select a zone to filter every figure on this page.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {zoneRows.map((z) => {
            const selected = filters.zone === z.key;
            return (
              <button
                key={z.key}
                type="button"
                onClick={() => set({ zone: selected ? "" : z.key })}
                aria-pressed={selected}
                className={`rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-ink-900 bg-ink-50 ring-1 ring-ink-900"
                    : "border-ink-200 hover:border-ink-400 hover:bg-ink-50"
                }`}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${z.color}`} />
                  <span className="truncate text-[11px] font-semibold text-ink-700" title={z.label}>
                    {z.label}
                  </span>
                </div>
                <p className="text-2xl font-black leading-none text-ink-900">{z.count}</p>
                <p className="mt-1 text-[10px] text-ink-400">
                  {z.pct}% of {zoneScopeStats.total}
                  {z.acres > 0 ? ` · ${z.acres} acres` : ""}
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className={`h-full rounded-full ${z.color}`} style={{ width: `${z.pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
        {filters.zone ? (
          <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-600">
            Drilled into <span className="font-bold text-ink-900">{zoneLabelFor(filters.zone)}</span>
            {filters.zone !== ZONE_NONE ? (
              <>
                {" "}
                — {rows.length} investor{rows.length === 1 ? "" : "s"}, {stats.siteVisitRequests}{" "}
                site-visit request{stats.siteVisitRequests === 1 ? "" : "s"}, {stats.acresRequested}{" "}
                acres requested, {stats.eoisSubmitted} EOI
                {stats.eoisSubmitted === 1 ? "" : "s"} submitted.
              </>
            ) : (
              <> — {rows.length} investor{rows.length === 1 ? "" : "s"} with no zone declared yet.</>
            )}
          </p>
        ) : null}
      </div>

      {/* ── Headline KPIs (filtered) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Investors in view"
          value={stats.total}
          subtext={`${stats.active} active · ${stats.pending} pending`}
          highlight
          icon={Users}
        />
        <StatCard
          label="Sign-ups in range"
          value={trendStats.total}
          subtext={
            trendStats.peak
              ? `Peak ${trendStats.peak.count} · ${trendStats.peak.label}`
              : "No sign-ups in this range"
          }
          icon={UserPlus}
        />
        <StatCard
          label="Payments confirmed"
          value={stats.paymentsConfirmed}
          subtext="Investors past the fee gate"
          icon={CheckCircle2}
        />
        <StatCard
          label="Acres requested"
          value={stats.acresRequested}
          subtext={`${stats.siteVisitRequests} site-visit request${stats.siteVisitRequests === 1 ? "" : "s"}`}
          icon={Ruler}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="EOIs Submitted" value={stats.eoisSubmitted} icon={FileText} />
        <MiniStat label="Shortlisted" value={stats.shortlisted} icon={CheckCircle2} />
        <MiniStat label="Allocated" value={stats.allocated} icon={Award} />
        <MiniStat label="Zone Declared" value={stats.withZoneInterest} icon={MapPin} />
        <MiniStat label="Fees Collected" value={report.stats.feesCollected} icon={DollarSign} />
        <MiniStat label="Days to Close" value={report.stats.daysToClose ?? "—"} icon={FileText} />
      </div>

      {/* ── Sign-up trend ──────────────────────────────────────────────── */}
      <Panel title="Sign-ups Over Time" dot="bg-brand-500">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 print:hidden">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                  granularity === g
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-400">
            {trendStats.total} sign-up{trendStats.total === 1 ? "" : "s"} across {trendStats.buckets}{" "}
            {granularity}
            {trendStats.buckets === 1 ? "" : "s"} · avg {trendStats.avgPerBucket} per active{" "}
            {granularity}
          </p>
        </div>
        <SeriesBars
          buckets={trend}
          accent="bg-brand-500"
          empty="No sign-ups match the current filters."
        />
      </Panel>

      {/* ── Funnel + breakdowns (filtered) ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Onboarding Funnel" dot="bg-violet-500">
          <FunnelBars rows={funnel} empty="No investors match the current filters." />
        </Panel>
        <Panel title="By Country" dot="bg-brand-500">
          <BarList rows={byCountry} accent="bg-brand-500" empty="No investors match the current filters." />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="By Business Sector" dot="bg-blue-500">
          <BarList rows={bySector} accent="bg-blue-500" empty="No investors match the current filters." />
        </Panel>
        <Panel title="By Company Type" dot="bg-teal-500">
          <BarList rows={byCompanyType} accent="bg-teal-500" empty="No investors match the current filters." />
        </Panel>
      </div>

      {/* ── Investor detail table ──────────────────────────────────────── */}
      <div className="rounded-xl border border-ink-300 bg-white shadow-sm print:break-inside-avoid">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ink-400" />
            <h2 className="text-sm font-bold text-ink-900">Investor Onboarding Detail</h2>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
              {rows.length} investor{rows.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="p-4">
          <InvestorReportTable data={rows} />
        </div>
      </div>
    </>
  );
}
