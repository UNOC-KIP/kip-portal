/**
 * Pure filter + aggregation logic for the drill-down report tabs (Investor
 * Onboarding, Site Visits).
 *
 * Everything here runs in the browser: the server hands the client the full row
 * set once, and each drill-down (zone, date range, status, …) is re-derived
 * locally so the KPI cards, breakdowns, charts and exports all describe *the
 * same* filtered subset. No `@kip/db`, no `server-only`, no React — safe to
 * bundle into a client component and unit-testable without a database.
 *
 * Dates are handled as `YYYY-MM-DD` UTC strings (`registeredOn`, `requestedOn`)
 * so range comparison is plain lexicographic string comparison and bucketing
 * never depends on the viewer's timezone.
 *
 * Layout: shared primitives first, then one section per report. The per-report
 * filter shapes are written out explicitly rather than driven by a generic
 * predicate engine — they are short, and being able to read exactly what
 * "Scheduled + Heavy Industrial + last 30 days" means is worth more here than
 * the deduplication would be.
 */
import { KIP_ZONES } from "@kip/shared";
import {
  NO_ZONE_LABEL,
  isShortlistedOrBeyond,
  isSubmitted,
  type BreakdownRow,
  type FunnelRow,
  type InvestorReportRow,
  type SiteVisitRow,
} from "./admin/mappers";

// ═══ Shared: zones ═══════════════════════════════════════════════════════════

/** Sentinel `zone` value selecting rows with no zone declared. */
export const ZONE_NONE = "__none__";

/** `KipZone` key → label, falling back to the raw key. */
export function zoneLabelFor(key: string): string {
  if (key === ZONE_NONE || key === "") return NO_ZONE_LABEL;
  return KIP_ZONES.find((z) => z.key === key)?.label ?? key;
}

/** The minimum a row must expose to take part in the zone drill-down. */
export type ZoneScoped = { zoneKey: string; acresRaw: number };

/** A zone row for the drill-down list — carries the key so a click can filter. */
export type ZoneBreakdownRow = BreakdownRow & {
  /** `KipZone` key, or `ZONE_NONE` for the "not specified" bucket. */
  key: string;
  color: string;
  /** Share of the supplied rows, 0–100, rounded. */
  pct: number;
  /** Total acreage attached to this zone. */
  acres: number;
};

/**
 * Rows per zone. Every *investable* zone is always present — a zone attracting
 * zero interest is itself a finding, so it must not vanish from the list —
 * followed by any other zone seen in the data, then the "not specified" bucket
 * when non-empty.
 */
export function zoneBreakdown(rows: ZoneScoped[]): ZoneBreakdownRow[] {
  const counts = new Map<string, { count: number; acres: number }>();
  for (const r of rows) {
    const key = r.zoneKey || ZONE_NONE;
    const entry = counts.get(key) ?? { count: 0, acres: 0 };
    entry.count += 1;
    entry.acres += r.acresRaw;
    counts.set(key, entry);
  }

  const total = rows.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const out: ZoneBreakdownRow[] = [];

  for (const z of KIP_ZONES) {
    const entry = counts.get(z.key);
    // Non-investable zones can't be booked; only show if data says otherwise.
    if (!z.investable && !entry) continue;
    out.push({
      key: z.key,
      label: z.label,
      color: z.color,
      count: entry?.count ?? 0,
      acres: entry?.acres ?? 0,
      pct: pct(entry?.count ?? 0),
    });
    counts.delete(z.key);
  }

  const none = counts.get(ZONE_NONE);
  counts.delete(ZONE_NONE);

  // Anything left is a zone key not in KIP_ZONES (stale/renamed) — surface it
  // rather than silently dropping the rows.
  for (const [key, entry] of counts) {
    out.push({ key, label: key, color: "bg-ink-300", count: entry.count, acres: entry.acres, pct: pct(entry.count) });
  }

  out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  if (none) {
    out.push({
      key: ZONE_NONE,
      label: NO_ZONE_LABEL,
      color: "bg-ink-300",
      count: none.count,
      acres: none.acres,
      pct: pct(none.count),
    });
  }
  return out;
}

// ═══ Shared: breakdowns ══════════════════════════════════════════════════════

/** Count rows by a string field, highest first, ties broken alphabetically. */
export function countBy<T>(rows: T[], key: keyof T): BreakdownRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const label = String(r[key] ?? "");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

// ═══ Shared: day / week / month bucketing ════════════════════════════════════

export type Granularity = "day" | "week" | "month";

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

export type PeriodBucket = {
  /** Sortable bucket key — `YYYY-MM-DD` (day / week start) or `YYYY-MM`. */
  key: string;
  /** Human label, e.g. "21 Jul 2026", "Week of 20 Jul 2026", "Jul 2026". */
  label: string;
  count: number;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** `YYYY-MM-DD` → UTC Date at midnight. Returns null for a malformed key. */
function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtIso(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Monday of the ISO week containing `iso`. */
export function weekStart(iso: string): string {
  const d = parseIso(iso);
  if (!d) return iso;
  const offset = (d.getUTCDay() + 6) % 7; // Sun(0) → 6, Mon(1) → 0
  d.setUTCDate(d.getUTCDate() - offset);
  return fmtIso(d);
}

function bucketKey(iso: string, g: Granularity): string {
  if (g === "day") return iso;
  if (g === "week") return weekStart(iso);
  return iso.slice(0, 7);
}

function bucketLabel(key: string, g: Granularity): string {
  if (g === "month") {
    const [y = key, m = ""] = key.split("-");
    return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
  }
  const d = parseIso(key);
  if (!d) return key;
  const stamp = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return g === "week" ? `Week of ${stamp}` : stamp;
}

/**
 * Rows per day / week / month, oldest first. `dateOf` pulls the ISO date key
 * off a row (`registeredOn` for sign-ups, `requestedOn` for site visits); rows
 * with an empty key are skipped.
 *
 * `fill` inserts empty buckets between the first and last dated row so a gap
 * reads as a gap on the chart rather than being silently compressed away. It is
 * capped at `maxBuckets` (a multi-year daily range would otherwise generate
 * thousands of columns); past the cap the series falls back to occupied buckets
 * only.
 */
export function bucketByPeriod<T>(
  rows: T[],
  dateOf: (row: T) => string,
  granularity: Granularity,
  { fill = true, maxBuckets = 200 }: { fill?: boolean; maxBuckets?: number } = {},
): PeriodBucket[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const iso = dateOf(r);
    if (!iso) continue;
    const key = bucketKey(iso, granularity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const keys = Array.from(counts.keys()).sort();
  const first = keys[0] ?? "";
  const last = keys[keys.length - 1] ?? first;
  const filled = fill ? fillKeys(first, last, granularity, maxBuckets) : [];
  // `fillKeys` returns [] when the span blew past the cap — fall back to the
  // occupied buckets so a wide range degrades gracefully instead of blanking.
  const series = filled.length > 0 ? filled : keys;
  return series.map((key) => ({ key, label: bucketLabel(key, granularity), count: counts.get(key) ?? 0 }));
}

/** Every bucket key from `first` to `last` inclusive; bails out past `max`. */
function fillKeys(first: string, last: string, g: Granularity, max: number): string[] {
  const out: string[] = [];
  if (g === "month") {
    const [y0 = 0, m0 = 1] = first.split("-").map(Number);
    let y = y0;
    let m = m0;
    while (out.length <= max) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      out.push(key);
      if (key >= last) return out;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return [];
  }
  const step = g === "week" ? 7 : 1;
  const cursor = parseIso(first);
  if (!cursor) return [first];
  while (out.length <= max) {
    const key = fmtIso(cursor);
    out.push(key);
    if (key >= last) return out;
    cursor.setUTCDate(cursor.getUTCDate() + step);
  }
  return []; // over the cap — caller falls back to occupied buckets
}

/** Roll-up figures shown beside a trend chart. */
export type TrendStats = {
  total: number;
  /** Busiest bucket in the series (null when there is no data). */
  peak: PeriodBucket | null;
  /** Mean per non-empty bucket, to 1 dp — gaps don't dilute the average. */
  avgPerBucket: number;
  buckets: number;
};

export function trendStats(buckets: PeriodBucket[]): TrendStats {
  const total = buckets.reduce((a, b) => a + b.count, 0);
  const occupied = buckets.filter((b) => b.count > 0);
  const peak = occupied.reduce<PeriodBucket | null>(
    (best, b) => (best == null || b.count > best.count ? b : best),
    null,
  );
  return {
    total,
    peak,
    avgPerBucket: occupied.length > 0 ? Math.round((total / occupied.length) * 10) / 10 : 0,
    buckets: buckets.length,
  };
}

// ═══ Shared: date-range presets ══════════════════════════════════════════════

export type DatePreset = "all" | "7d" | "30d" | "90d" | "mtd" | "ytd";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "mtd", label: "This month" },
  { value: "ytd", label: "This year" },
];

/** Inclusive `{ from, to }` ISO bounds for a preset. "" = unbounded. */
export function presetRange(preset: DatePreset, now: Date): { from: string; to: string } {
  const to = fmtIso(now);
  const back = (days: number) => {
    const d = new Date(now.getTime());
    // `days - 1` so "last 7 days" spans today plus the six before it.
    d.setUTCDate(d.getUTCDate() - (days - 1));
    return fmtIso(d);
  };
  switch (preset) {
    case "7d":  return { from: back(7), to };
    case "30d": return { from: back(30), to };
    case "90d": return { from: back(90), to };
    case "mtd": return { from: `${to.slice(0, 7)}-01`, to };
    case "ytd": return { from: `${to.slice(0, 4)}-01-01`, to };
    case "all":
    default:    return { from: "", to: "" };
  }
}

/** Which preset (if any) a range corresponds to — keeps the UI chip in sync. */
export function matchPreset(range: { from: string; to: string }, now: Date): DatePreset | null {
  for (const p of DATE_PRESETS) {
    const r = presetRange(p.value, now);
    if (r.from === range.from && r.to === range.to) return p.value;
  }
  return null;
}

// ═══ Shared: filter-state helpers ════════════════════════════════════════════

/** Any filter shape: every field "" when unset, with a `from`/`to` date range. */
type DateRangeFilters = { from: string; to: string };

export function hasActiveFilters(f: Record<string, string>): boolean {
  return Object.values(f).some((v) => v !== "");
}

/** Number of constraints applied — drives the "N active" filter pill. */
export function activeFilterCount(f: Record<string, string> & DateRangeFilters): number {
  const { from, to, ...rest } = f;
  // A date range counts as one constraint however many ends are bounded.
  return Object.values(rest).filter((v) => v !== "").length + (from || to ? 1 : 0);
}

/** Inclusive `YYYY-MM-DD` range test. An empty row key never matches a bound. */
function inRange(iso: string, from: string, to: string): boolean {
  if (from && (iso === "" || iso < from)) return false;
  if (to && (iso === "" || iso > to)) return false;
  return true;
}

/**
 * Joins the set constraints into one line, or says plainly that none are.
 * Accepts the falsy results of `cond && "label"` so each report can write its
 * parts list inline.
 */
function describe(parts: (string | null | undefined | false)[]): string {
  const set = parts.filter((p): p is string => typeof p === "string" && p !== "");
  return set.length === 0 ? "No filters applied" : set.join(" · ");
}

/** "Registered 2026-01-01 → 2026-06-30" / "… from X" / "… up to Y". */
function describeRange(noun: string, from: string, to: string): string | null {
  if (from && to) return `${noun} ${from} → ${to}`;
  if (from) return `${noun} from ${from}`;
  if (to) return `${noun} up to ${to}`;
  return null;
}

function describeZone(zone: string): string | null {
  if (!zone) return null;
  return `Zone: ${zone === ZONE_NONE ? NO_ZONE_LABEL : zoneLabelFor(zone)}`;
}

// ═══ Investor Onboarding report ══════════════════════════════════════════════

export type InvestorFilters = {
  /** A `KipZone` key, `ZONE_NONE`, or "" for all zones. */
  zone: string;
  account: string; // Active | Pending | Rejected
  payment: string; // Confirmed | Pending | Not Paid
  stage: string;   // applicationStageLabel(...) value
  country: string;
  sector: string;
  /** Inclusive `YYYY-MM-DD` bounds on the registration date. */
  from: string;
  to: string;
};

export const EMPTY_INVESTOR_FILTERS: InvestorFilters = {
  zone: "",
  account: "",
  payment: "",
  stage: "",
  country: "",
  sector: "",
  from: "",
  to: "",
};

/** Apply every set constraint. Rows must satisfy all of them (AND semantics). */
export function filterInvestors(
  rows: InvestorReportRow[],
  f: InvestorFilters,
): InvestorReportRow[] {
  return rows.filter((r) => {
    if (f.zone === ZONE_NONE) {
      if (r.zoneKey !== "") return false;
    } else if (f.zone && r.zoneKey !== f.zone) return false;

    if (f.account && r.accountStatus !== f.account) return false;
    if (f.payment && r.paymentStatus !== f.payment) return false;
    if (f.stage && r.eoiStage !== f.stage) return false;
    if (f.country && r.country !== f.country) return false;
    if (f.sector && r.sector !== f.sector) return false;

    return inRange(r.registeredOn, f.from, f.to);
  });
}

export type InvestorStats = {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  paymentsConfirmed: number;
  eoisSubmitted: number;
  shortlisted: number;
  allocated: number;
  /** Investors who have requested at least one site visit. */
  withZoneInterest: number;
  siteVisitRequests: number;
  acresRequested: number;
};

export function computeInvestorStats(rows: InvestorReportRow[]): InvestorStats {
  const s: InvestorStats = {
    total: rows.length,
    active: 0,
    pending: 0,
    rejected: 0,
    paymentsConfirmed: 0,
    eoisSubmitted: 0,
    shortlisted: 0,
    allocated: 0,
    withZoneInterest: 0,
    siteVisitRequests: 0,
    acresRequested: 0,
  };
  for (const r of rows) {
    if (r.accountStatus === "Active") s.active++;
    else if (r.accountStatus === "Rejected") s.rejected++;
    else s.pending++;

    if (r.paymentStatus === "Confirmed") s.paymentsConfirmed++;
    if (isSubmitted(r.rawAppStatus)) s.eoisSubmitted++;
    if (isShortlistedOrBeyond(r.rawAppStatus)) s.shortlisted++;
    if (r.rawAppStatus === "ALLOCATED") s.allocated++;

    if (r.zoneKey) s.withZoneInterest++;
    s.siteVisitRequests += r.siteVisits;
    s.acresRequested += r.acresRaw;
  }
  return s;
}

export function computeFunnel(rows: InvestorReportRow[]): FunnelRow[] {
  const s = computeInvestorStats(rows);
  return [
    { label: "Registered", count: s.total },
    { label: "Payment confirmed", count: s.paymentsConfirmed },
    { label: "EOI submitted", count: s.eoisSubmitted },
    { label: "Shortlisted", count: s.shortlisted },
    { label: "Allocated", count: s.allocated },
  ].map((r) => ({ ...r, pct: s.total > 0 ? Math.round((r.count / s.total) * 100) : 0 }));
}

/**
 * One-line summary of what the reader is looking at — printed on the report and
 * written into the CSV/clipboard exports so a filtered extract is never
 * mistaken for the whole data set.
 */
export function describeInvestorFilters(f: InvestorFilters): string {
  return describe([
    describeZone(f.zone),
    f.account && `Account: ${f.account}`,
    f.payment && `Payment: ${f.payment}`,
    f.stage && `EOI stage: ${f.stage}`,
    f.country && `Country: ${f.country}`,
    f.sector && `Sector: ${f.sector}`,
    describeRange("Registered", f.from, f.to),
  ]);
}

// ═══ Site Visits report ══════════════════════════════════════════════════════

/** Acreage bands offered by the site-visit report's size filter. */
export const ACRE_BANDS: { value: string; label: string; min: number; max: number }[] = [
  { value: "1-10", label: "1–10 acres", min: 1, max: 10 },
  { value: "11-25", label: "11–25 acres", min: 11, max: 25 },
  { value: "26-50", label: "26–50 acres", min: 26, max: 50 },
  { value: "51-100", label: "51–100 acres", min: 51, max: 100 },
];

export type SiteVisitFilters = {
  /** A `KipZone` key, `ZONE_NONE`, or "" for all zones. */
  zone: string;
  status: string;   // New | Scheduled | Completed | Cancelled
  landUse: string;
  country: string;
  /** An `ACRE_BANDS` value, or "" for any size. */
  acreBand: string;
  /** Inclusive `YYYY-MM-DD` bounds on the *request* date. */
  from: string;
  to: string;
};

export const EMPTY_SITE_VISIT_FILTERS: SiteVisitFilters = {
  zone: "",
  status: "",
  landUse: "",
  country: "",
  acreBand: "",
  from: "",
  to: "",
};

export function filterSiteVisits(rows: SiteVisitRow[], f: SiteVisitFilters): SiteVisitRow[] {
  const band = ACRE_BANDS.find((b) => b.value === f.acreBand);
  return rows.filter((r) => {
    if (f.zone === ZONE_NONE) {
      if (r.zoneKey !== "") return false;
    } else if (f.zone && r.zoneKey !== f.zone) return false;

    if (f.status && r.status !== f.status) return false;
    if (f.landUse && r.landUse !== f.landUse) return false;
    if (f.country && r.country !== f.country) return false;
    if (band && (r.acresRaw < band.min || r.acresRaw > band.max)) return false;

    return inRange(r.requestedOn, f.from, f.to);
  });
}

export type SiteVisitStats = {
  total: number;
  newRequests: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  /** Still awaiting a response — the secretariat's actual work queue. */
  awaitingResponse: number;
  acres: number;
  avgAcres: number;
  /** Distinct investors behind the requests (one investor may book twice). */
  uniqueInvestors: number;
  zonesRepresented: number;
  /** Mean days from request to scheduled date, over scheduled visits only. */
  avgDaysToSchedule: number | null;
};

export function computeSiteVisitStats(rows: SiteVisitRow[]): SiteVisitStats {
  const investors = new Set<string>();
  const zones = new Set<string>();
  let acres = 0;
  let newRequests = 0;
  let scheduled = 0;
  let completed = 0;
  let cancelled = 0;
  let lagSum = 0;
  let lagCount = 0;

  for (const r of rows) {
    if (r.rawStatus === "NEW") newRequests++;
    else if (r.rawStatus === "SCHEDULED") scheduled++;
    else if (r.rawStatus === "COMPLETED") completed++;
    else if (r.rawStatus === "CANCELLED") cancelled++;

    acres += r.acresRaw;
    investors.add(r.contactEmail);
    if (r.zoneKey) zones.add(r.zoneKey);
    if (r.daysToSchedule != null) {
      lagSum += r.daysToSchedule;
      lagCount++;
    }
  }

  return {
    total: rows.length,
    newRequests,
    scheduled,
    completed,
    cancelled,
    awaitingResponse: newRequests,
    acres,
    avgAcres: rows.length > 0 ? Math.round((acres / rows.length) * 10) / 10 : 0,
    uniqueInvestors: investors.size,
    zonesRepresented: zones.size,
    avgDaysToSchedule: lagCount > 0 ? Math.round((lagSum / lagCount) * 10) / 10 : null,
  };
}

/** Request → scheduled → completed, as a share of all requests in view. */
export function computeSiteVisitFunnel(rows: SiteVisitRow[]): FunnelRow[] {
  const s = computeSiteVisitStats(rows);
  // Scheduled and completed are terminal states, so a completed visit must
  // still count as "scheduled" for the funnel to read as a progression.
  return [
    { label: "Requested", count: s.total },
    { label: "Scheduled", count: s.scheduled + s.completed },
    { label: "Completed", count: s.completed },
  ].map((r) => ({ ...r, pct: s.total > 0 ? Math.round((r.count / s.total) * 100) : 0 }));
}

export function describeSiteVisitFilters(f: SiteVisitFilters): string {
  const band = ACRE_BANDS.find((b) => b.value === f.acreBand);
  return describe([
    describeZone(f.zone),
    f.status && `Status: ${f.status}`,
    f.landUse && `Land use: ${f.landUse}`,
    f.country && `Country: ${f.country}`,
    band && `Size: ${band.label}`,
    describeRange("Requested", f.from, f.to),
  ]);
}
