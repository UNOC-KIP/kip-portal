"use client";

/**
 * Site Visits report — interactive shell.
 *
 * Same contract as the investors report (`../investors/investors-report-client.tsx`):
 * the server hands over every booking once, and every KPI, breakdown, chart and
 * export re-derives from the *filtered* subset in the browser, so the numbers
 * and the CSV always describe the same slice. Site visits are where investors
 * declare which part of the master plan they want, so the zone drill-down is
 * the centre of this page rather than a side panel.
 */

import { useMemo, useState } from "react";
import {
  MapPin,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Ruler,
  Users,
  XCircle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Panel, BarList, MiniStat, FunnelBars, SeriesBars } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { ReportTable, type ReportColumn } from "@/components/report/report-table";
import {
  buildSiteVisitReportSummary,
  SITE_VISIT_EXPORT_COLUMNS,
  PERIOD_TREND_COLUMNS,
  ZONE_BREAKDOWN_COLUMNS,
} from "@/lib/report-export";
import {
  ACRE_BANDS,
  DATE_PRESETS,
  EMPTY_SITE_VISIT_FILTERS,
  GRANULARITY_LABELS,
  ZONE_NONE,
  activeFilterCount,
  bucketByPeriod,
  computeSiteVisitFunnel,
  computeSiteVisitStats,
  countBy,
  describeSiteVisitFilters,
  filterSiteVisits,
  presetRange,
  trendStats as computeTrendStats,
  zoneBreakdown,
  zoneLabelFor,
  type DatePreset,
  type Granularity,
  type SiteVisitFilters,
} from "@/lib/report-filters";
import type { SiteVisitRow } from "@/lib/admin/mappers";

const GRANULARITIES: Granularity[] = ["day", "week", "month"];

const VISIT_COLUMNS: ReportColumn[] = [
  { key: "companyName", header: "Company", kind: "bold" },
  { key: "zone", header: "Zone", kind: "text" },
  { key: "landUse", header: "Land Use", kind: "muted", hideBelow: "lg" },
  { key: "acresLabel", header: "Acres", kind: "muted", hideBelow: "md" },
  {
    key: "status",
    header: "Status",
    badge: {
      New: "status-pending",
      Scheduled: "eoi-submitted",
      Completed: "status-active",
      Cancelled: "status-rejected",
    },
  },
  { key: "requestedAt", header: "Requested", kind: "muted", hideBelow: "lg" },
  { key: "scheduledAt", header: "Scheduled", kind: "muted", hideBelow: "md" },
];

function optionsFor(rows: SiteVisitRow[], key: keyof SiteVisitRow): string[] {
  return Array.from(new Set(rows.map((r) => String(r[key] ?? "")).filter((v) => v && v !== "—"))).sort();
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
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
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const asOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }));

export function SiteVisitsReportClient({
  visits,
  generatedAt,
}: {
  visits: SiteVisitRow[];
  generatedAt: string;
}) {
  const [filters, setFilters] = useState<SiteVisitFilters>(EMPTY_SITE_VISIT_FILTERS);
  const [granularity, setGranularity] = useState<Granularity>("week");

  // Which preset chip is lit. Held as state rather than derived from the dates
  // via `matchPreset(range, new Date())`: reading the clock during render makes
  // the server and client markup disagree, which is a hydration error.
  const [activePreset, setActivePreset] = useState<DatePreset | "custom">("all");

  const set = (patch: Partial<SiteVisitFilters>) => setFilters((f) => ({ ...f, ...patch }));

  /** Preset chip → resolve the range against the clock, in the handler only. */
  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    set(presetRange(preset, new Date()));
  };

  /** Hand-edited date input → the range is no longer a preset. */
  const setBound = (patch: Partial<SiteVisitFilters>) => {
    setActivePreset("custom");
    set(patch);
  };

  const rows = useMemo(() => filterSiteVisits(visits, filters), [visits, filters]);
  const stats = useMemo(() => computeSiteVisitStats(rows), [rows]);
  const funnel = useMemo(() => computeSiteVisitFunnel(rows), [rows]);

  // The zone cards ignore the zone filter itself — otherwise picking a zone
  // would zero out every other card and you could no longer see what you are
  // drilling away from. Their percentages use this wider denominator.
  const zoneScope = useMemo(
    () => filterSiteVisits(visits, { ...filters, zone: "" }),
    [visits, filters],
  );
  const zoneRows = useMemo(() => zoneBreakdown(zoneScope), [zoneScope]);
  const zoneScopeTotal = zoneScope.length;

  const trend = useMemo(
    () => bucketByPeriod(rows, (r) => r.requestedOn, granularity),
    [rows, granularity],
  );
  const trendStats = useMemo(() => computeTrendStats(trend), [trend]);

  const byLandUse = useMemo(() => countBy(rows, "landUse").slice(0, 10), [rows]);
  const byStatus = useMemo(() => countBy(rows, "status"), [rows]);
  const byCountry = useMemo(() => countBy(rows, "country").slice(0, 8), [rows]);

  const filterCount = activeFilterCount(filters);
  const filterDescription = describeSiteVisitFilters(filters);

  const summary = buildSiteVisitReportSummary({
    generatedAt,
    filterDescription,
    totalUnfiltered: visits.length,
    stats,
    granularityLabel: GRANULARITY_LABELS[granularity],
    trend,
    trendStats,
    zones: zoneRows,
    byLandUse,
    byCountry,
  });

  return (
    <>
      {/* ── Export bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-ink-500">
          Showing <span className="font-bold text-ink-900">{rows.length}</span> of {visits.length}{" "}
          site-visit requests
          {filterCount > 0 ? <span className="text-ink-400"> · {filterDescription}</span> : null}
        </p>
        <ReportExportActions
          filenamePrefix="kip-site-visits"
          summary={summary}
          csv={{
            label: "Site visits CSV (filtered)",
            columns: SITE_VISIT_EXPORT_COLUMNS,
            rows: rows as unknown as Record<string, unknown>[],
          }}
          extraCsvs={[
            {
              label: `Requests CSV (${GRANULARITY_LABELS[granularity].toLowerCase()})`,
              filenamePrefix: `kip-site-visit-requests-${granularity}`,
              columns: PERIOD_TREND_COLUMNS,
              rows: trend as unknown as Record<string, unknown>[],
            },
            {
              label: "Zone demand CSV",
              filenamePrefix: "kip-site-visit-zones",
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
              onClick={() => {
                setFilters(EMPTY_SITE_VISIT_FILTERS);
                setActivePreset("all");
              }}
            >
              <X size={12} />
              Clear all
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-ink-100 pb-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Requested
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

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FilterSelect
            label="Status"
            value={filters.status}
            options={asOptions(optionsFor(visits, "status"))}
            onChange={(v) => set({ status: v })}
          />
          <FilterSelect
            label="Land use"
            value={filters.landUse}
            options={asOptions(optionsFor(visits, "landUse"))}
            onChange={(v) => set({ landUse: v })}
          />
          <FilterSelect
            label="Plot size"
            value={filters.acreBand}
            options={ACRE_BANDS.map((b) => ({ value: b.value, label: b.label }))}
            onChange={(v) => set({ acreBand: v })}
          />
          <FilterSelect
            label="Country"
            value={filters.country}
            options={asOptions(optionsFor(visits, "country"))}
            onChange={(v) => set({ country: v })}
          />
        </div>
      </div>

      {/* ── Zone drill-down ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm print:break-inside-avoid">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-ink-400" />
            <h2 className="text-sm font-bold text-ink-900">Demand by Zone</h2>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
              {zoneScopeTotal} request{zoneScopeTotal === 1 ? "" : "s"}
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
          Requests and acreage per master-plan zone. Select a zone to filter every figure on this
          page.
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
                  {z.pct}% of {zoneScopeTotal}
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
            Drilled into <span className="font-bold text-ink-900">{zoneLabelFor(filters.zone)}</span>{" "}
            — {rows.length} request{rows.length === 1 ? "" : "s"} from {stats.uniqueInvestors}{" "}
            investor{stats.uniqueInvestors === 1 ? "" : "s"}, {stats.acres} acres (avg{" "}
            {stats.avgAcres}), {stats.newRequests} still awaiting a response.
          </p>
        ) : null}
      </div>

      {/* ── Headline KPIs (filtered) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Requests in view"
          value={stats.total}
          subtext={`From ${stats.uniqueInvestors} investor${stats.uniqueInvestors === 1 ? "" : "s"}`}
          highlight
          icon={MapPin}
        />
        <StatCard
          label="Awaiting response"
          value={stats.awaitingResponse}
          subtext="Still marked New"
          icon={Clock}
        />
        <StatCard
          label="Acres requested"
          value={stats.acres}
          subtext={`Avg ${stats.avgAcres} per request · ${stats.zonesRepresented} zone${stats.zonesRepresented === 1 ? "" : "s"}`}
          icon={Ruler}
        />
        <StatCard
          label="Avg days to schedule"
          value={stats.avgDaysToSchedule ?? "—"}
          subtext={
            stats.avgDaysToSchedule == null
              ? "No visits scheduled yet"
              : `Across ${stats.scheduled + stats.completed} scheduled visit${stats.scheduled + stats.completed === 1 ? "" : "s"}`
          }
          icon={CalendarCheck}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="New" value={stats.newRequests} icon={Clock} />
        <MiniStat label="Scheduled" value={stats.scheduled} icon={CalendarCheck} />
        <MiniStat label="Completed" value={stats.completed} icon={CheckCircle2} />
        <MiniStat label="Cancelled" value={stats.cancelled} icon={XCircle} />
        <MiniStat label="Unique Investors" value={stats.uniqueInvestors} icon={Users} />
        <MiniStat label="Zones Represented" value={stats.zonesRepresented} icon={MapPin} />
      </div>

      {/* ── Requests over time ─────────────────────────────────────────── */}
      <Panel title="Requests Over Time" dot="bg-brand-500">
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
            {trendStats.total} request{trendStats.total === 1 ? "" : "s"} across{" "}
            {trendStats.buckets} {granularity}
            {trendStats.buckets === 1 ? "" : "s"} · avg {trendStats.avgPerBucket} per active{" "}
            {granularity}
          </p>
        </div>
        <SeriesBars
          buckets={trend}
          accent="bg-brand-500"
          empty="No site-visit requests match the current filters."
        />
      </Panel>

      {/* ── Funnel + breakdowns (filtered) ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Request → Scheduled → Completed" dot="bg-violet-500">
          <FunnelBars rows={funnel} empty="No requests match the current filters." />
        </Panel>
        <Panel title="By Status" dot="bg-teal-500">
          <BarList rows={byStatus} accent="bg-teal-500" empty="No requests match the current filters." />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="By Land Use" dot="bg-blue-500">
          <BarList rows={byLandUse} accent="bg-blue-500" empty="No requests match the current filters." />
        </Panel>
        <Panel title="By Country" dot="bg-brand-500">
          <BarList rows={byCountry} accent="bg-brand-500" empty="No requests match the current filters." />
        </Panel>
      </div>

      {/* ── Detail table ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-ink-300 bg-white shadow-sm print:break-inside-avoid">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ink-400" />
            <h2 className="text-sm font-bold text-ink-900">Site-Visit Request Detail</h2>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
              {rows.length} request{rows.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="p-4">
          <ReportTable
            columns={VISIT_COLUMNS}
            rows={rows as unknown as Record<string, unknown>[]}
            searchKeys={["companyName", "contactName", "contactEmail", "zone", "landUse", "country"]}
            searchPlaceholder="Search company, contact, zone, land use…"
            empty="No site visits match the current filters."
          />
        </div>
      </div>
    </>
  );
}
