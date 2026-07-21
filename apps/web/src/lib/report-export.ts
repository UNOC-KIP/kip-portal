/**
 * Pure builders for the investor-onboarding report exports (CSV + copy-to-
 * clipboard text summary). Intentionally free of any `@kip/db`, `server-only`
 * or React import so it is safe to bundle into the client export button AND
 * unit-testable without a database. All data shaping already happened in
 * `lib/admin/mappers.ts`; this module only serialises the finished view-models.
 */
import type { InvestorStats, SiteVisitStats } from "./report-filters";

/** RFC-4180 cell: quote when the value contains a comma, quote or newline. */
export function csvCell(value: string): string {
  const s = value ?? "";
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Text digest for the investor report *as currently filtered*. The filter
 * description is printed directly under the title so a partial extract can
 * never be mistaken for the full data set.
 */
export function buildInvestorReportSummary(data: {
  generatedAt: string;
  windowName?: string;
  filterDescription: string;
  totalUnfiltered: number;
  stats: InvestorStats;
  granularityLabel: string;
  trend: { label: string; count: number }[];
  trendStats: { total: number; peak: { label: string; count: number } | null; avgPerBucket: number };
  zones: { label: string; count: number; acres: number; pct: number }[];
  byCountry: { label: string; count: number }[];
  bySector: { label: string; count: number }[];
}): string {
  const s = data.stats;
  const lines: string[] = ["KIP INVESTOR ONBOARDING REPORT", kv("Generated", data.generatedAt)];
  if (data.windowName) lines.push(kv("Window", data.windowName));
  lines.push(
    kv("Filters", data.filterDescription),
    kv("Scope", `${s.total} of ${data.totalUnfiltered} registered investors`),
    "",
    kv("Accounts", `${s.active} active, ${s.pending} pending, ${s.rejected} rejected`),
    kv("Payments confirmed", s.paymentsConfirmed),
    kv("EOIs submitted", s.eoisSubmitted),
    kv("Shortlisted", s.shortlisted),
    kv("Allocated", s.allocated),
    kv(
      "Zone interest",
      `${s.withZoneInterest} investors · ${s.siteVisitRequests} site-visit requests · ${s.acresRequested} acres requested`,
    ),
  );

  lines.push("", `Sign-ups (${data.granularityLabel.toLowerCase()}):`);
  if (data.trend.length === 0) lines.push("  - no sign-ups in this range");
  for (const b of data.trend) if (b.count > 0) lines.push(`  - ${b.label}: ${b.count}`);
  if (data.trendStats.peak) {
    lines.push(
      `  Peak: ${data.trendStats.peak.label} (${data.trendStats.peak.count}) · avg ${data.trendStats.avgPerBucket} per active period`,
    );
  }

  if (data.zones.length > 0) {
    lines.push("", "Zone of interest:");
    for (const z of data.zones) {
      lines.push(`  - ${z.label}: ${z.count} investor${z.count === 1 ? "" : "s"} (${z.pct}%) · ${z.acres} acres`);
    }
  }
  lines.push(...section("Top countries", data.byCountry.slice(0, 5)));
  lines.push(...section("By sector", data.bySector.slice(0, 5)));
  return lines.join("\n");
}

/** UTC date stamp `YYYY-MM-DD` for filenames. */
export function datestamp(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `<prefix>-2026-07-14.csv` — used by the generic report tables. */
export function datestampedFilename(prefix: string, now: Date = new Date(), ext = "csv"): string {
  return `${prefix}-${datestamp(now)}.${ext}`;
}

/**
 * Generic CSV from flat string-keyed rows and an explicit column spec. Each
 * column names the header text and the row key to read. Used by the filterable
 * report tables so every page exports exactly the columns it declares.
 */
export function buildCsv(
  columns: { header: string; key: string }[],
  rows: Record<string, unknown>[],
): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const r of rows) {
    lines.push(columns.map((c) => csvCell(String(r[c.key] ?? ""))).join(","));
  }
  return lines.join("\r\n");
}

// ─── Reports-hub export specs & summaries ────────────────────────────────────

/** Column spec for the investors CSV — mirrors `CSV_HEADERS` for the generic exporter. */
export const INVESTOR_EXPORT_COLUMNS: { header: string; key: string }[] = [
  { header: "Company", key: "company" },
  { header: "Representative", key: "rep" },
  { header: "Email", key: "email" },
  { header: "Country", key: "country" },
  { header: "Sector", key: "sector" },
  { header: "Company Type", key: "companyType" },
  { header: "Zone of Interest", key: "zone" },
  { header: "Land Use", key: "landUse" },
  { header: "Acres Requested", key: "acresRaw" },
  { header: "Site Visit Requests", key: "siteVisits" },
  { header: "Account", key: "accountStatus" },
  { header: "Payment", key: "paymentStatus" },
  { header: "EOI Stage", key: "eoiStage" },
  { header: "Reference", key: "reference" },
  { header: "Registered", key: "registeredAt" },
  { header: "Registered (ISO)", key: "registeredOn" },
];

/**
 * Column spec for a per-period CSV (day / week / month series). Shared by the
 * investor sign-up trend and the site-visit request trend — the count column is
 * named by the caller's filename, so one spec serves both.
 */
export const PERIOD_TREND_COLUMNS: { header: string; key: string }[] = [
  { header: "Period", key: "label" },
  { header: "Period Start", key: "key" },
  { header: "Count", key: "count" },
];

/** Column spec for the zone drill-down CSV. */
export const ZONE_BREAKDOWN_COLUMNS: { header: string; key: string }[] = [
  { header: "Zone", key: "label" },
  { header: "Investors", key: "count" },
  { header: "Share %", key: "pct" },
  { header: "Acres Requested", key: "acres" },
];

type Line = string;
const kv = (label: string, value: string | number): Line => `${label}: ${value}`;
const section = (title: string, rows: { label: string; count: number }[]): Line[] =>
  rows.length === 0 ? [] : ["", `${title}:`, ...rows.map((r) => `  - ${r.label}: ${r.count}`)];

/** Text digest for the Applications & Review Pipeline report. */
export function buildApplicationsSummary(data: {
  generatedAt: string;
  stats: { total: number; submitted: number; inReview: number; decided: number; clarifications: number };
  byStatus: { label: string; count: number }[];
  stageDurations: { label: string; days: number | null; samples: number }[];
}): string {
  const s = data.stats;
  return [
    "KIP APPLICATIONS & REVIEW PIPELINE REPORT",
    kv("Generated", data.generatedAt),
    "",
    kv("Total applications", s.total),
    kv("Submitted", s.submitted),
    kv("In review", s.inReview),
    kv("Decided", s.decided),
    kv("Clarification requests raised", s.clarifications),
    "",
    "Average days per stage:",
    ...data.stageDurations.map((d) =>
      `  - ${d.label}: ${d.days == null ? "no data yet" : `${d.days} days (${d.samples} apps)`}`,
    ),
    ...section("By status", data.byStatus),
  ].join("\n");
}

/** Text digest for the Payments & Fees report. */
export function buildPaymentsSummary(data: {
  generatedAt: string;
  stats: {
    confirmedCount: number;
    feesCollected: string;
    pendingCount: number;
    proofUploadedCount: number;
    agingOver7: number;
    avgLagDays: number | null;
  };
  methodSplit: { label: string; count: number }[];
}): string {
  const s = data.stats;
  return [
    "KIP PAYMENTS & FEES REPORT",
    kv("Generated", data.generatedAt),
    "",
    kv("Payments confirmed", `${s.confirmedCount}   Fees collected: ${s.feesCollected}`),
    kv("Awaiting confirmation", `${s.pendingCount} (proof uploaded: ${s.proofUploadedCount})`),
    kv("Unconfirmed older than 7 days", s.agingOver7),
    kv("Avg days to confirmation", s.avgLagDays == null ? "no data yet" : s.avgLagDays),
    ...section("By method", data.methodSplit),
  ].join("\n");
}

/** Text digest for the Engagement report (inquiries + notify-me signups). */
export function buildEngagementSummary(data: {
  generatedAt: string;
  stats: {
    totalInquiries: number;
    openInquiries: number;
    respondedInquiries: number;
    closedInquiries: number;
    signups: number;
  };
  inquiriesByChannel: { label: string; count: number }[];
  inquiriesByStatus: { label: string; count: number }[];
}): string {
  const s = data.stats;
  return [
    "KIP ENGAGEMENT REPORT — INQUIRIES & SIGNUPS",
    kv("Generated", data.generatedAt),
    "",
    kv(
      "Inquiries",
      `${s.totalInquiries} (open ${s.openInquiries}, responded ${s.respondedInquiries}, closed ${s.closedInquiries})`,
    ),
    kv("Notify-me signups", s.signups),
    ...section("By channel", data.inquiriesByChannel),
    ...section("By status", data.inquiriesByStatus),
  ].join("\n");
}

/** Column spec for the inquiries CSV. */
export const INQUIRY_EXPORT_COLUMNS: { header: string; key: string }[] = [
  { header: "Name", key: "name" },
  { header: "Email", key: "email" },
  { header: "Channel", key: "channel" },
  { header: "Subject", key: "subject" },
  { header: "Status", key: "status" },
  { header: "Received", key: "receivedAt" },
];

/** Column spec for the notify-me signup CSV. */
export const NOTIFY_SIGNUP_EXPORT_COLUMNS: { header: string; key: string }[] = [
  { header: "Email", key: "email" },
  { header: "Signed Up", key: "signedUpAt" },
];

/** Text digest for the Overview report. */
export function buildOverviewSummary(data: {
  generatedAt: string;
  stats: {
    investors: number;
    eoisSubmitted: number;
    feesCollected: string;
    siteVisits: number;
    openInquiries: number;
    daysToClose: number | null;
  };
  funnel: { label: string; count: number; pct: number }[];
}): string {
  const s = data.stats;
  const lines = [
    "KIP PORTAL PERFORMANCE OVERVIEW",
    kv("Generated", data.generatedAt),
    "",
    kv("Registered investors", s.investors),
    kv("EOIs submitted", s.eoisSubmitted),
    kv("Fees collected", s.feesCollected),
    kv("Site-visit requests", s.siteVisits),
    kv("Open inquiries", s.openInquiries),
  ];
  if (s.daysToClose != null) lines.push(kv("Days to window close", s.daysToClose));
  lines.push("", "Funnel:");
  for (const f of data.funnel) lines.push(`  - ${f.label}: ${f.count} (${f.pct}%)`);
  return lines.join("\n");
}

/** Column spec for the site-visits CSV — used by the tracker page and the site-visits report. */
export const SITE_VISIT_EXPORT_COLUMNS: { header: string; key: string }[] = [
  { header: "Company", key: "companyName" },
  { header: "Contact", key: "contactName" },
  { header: "Email", key: "contactEmail" },
  { header: "Country", key: "country" },
  { header: "Zone", key: "zone" },
  { header: "Land Use", key: "landUse" },
  { header: "Acres", key: "acresRaw" },
  { header: "Status", key: "status" },
  { header: "Requested", key: "requestedAt" },
  { header: "Requested (ISO)", key: "requestedOn" },
  { header: "Scheduled", key: "scheduledAt" },
  { header: "Days to Schedule", key: "daysToSchedule" },
  { header: "Handled By", key: "handledBy" },
];

/**
 * Text digest for the Site Visits report *as currently filtered* — same
 * contract as `buildInvestorReportSummary`: the filter line and the scope come
 * first so a partial extract can't be read as the whole picture.
 */
export function buildSiteVisitReportSummary(data: {
  generatedAt: string;
  filterDescription: string;
  totalUnfiltered: number;
  stats: SiteVisitStats;
  granularityLabel: string;
  trend: { label: string; count: number }[];
  trendStats: { total: number; peak: { label: string; count: number } | null; avgPerBucket: number };
  zones: { label: string; count: number; acres: number; pct: number }[];
  byLandUse: { label: string; count: number }[];
  byCountry: { label: string; count: number }[];
}): string {
  const s = data.stats;
  const lines: string[] = [
    "KIP SITE-VISIT REQUESTS REPORT",
    kv("Generated", data.generatedAt),
    kv("Filters", data.filterDescription),
    kv("Scope", `${s.total} of ${data.totalUnfiltered} site-visit requests`),
    "",
    kv(
      "Pipeline",
      `${s.newRequests} new · ${s.scheduled} scheduled · ${s.completed} completed · ${s.cancelled} cancelled`,
    ),
    kv("Awaiting response", s.awaitingResponse),
    kv("Land demand", `${s.acres} acres across ${s.zonesRepresented} zone(s), avg ${s.avgAcres} acres`),
    kv("Unique investors", s.uniqueInvestors),
    kv(
      "Avg days to schedule",
      s.avgDaysToSchedule == null ? "no scheduled visits yet" : s.avgDaysToSchedule,
    ),
  ];

  lines.push("", `Requests (${data.granularityLabel.toLowerCase()}):`);
  if (data.trend.length === 0) lines.push("  - no requests in this range");
  for (const b of data.trend) if (b.count > 0) lines.push(`  - ${b.label}: ${b.count}`);
  if (data.trendStats.peak) {
    lines.push(
      `  Peak: ${data.trendStats.peak.label} (${data.trendStats.peak.count}) · avg ${data.trendStats.avgPerBucket} per active period`,
    );
  }

  if (data.zones.length > 0) {
    lines.push("", "Demand by zone:");
    for (const z of data.zones) {
      lines.push(`  - ${z.label}: ${z.count} request${z.count === 1 ? "" : "s"} (${z.pct}%) · ${z.acres} acres`);
    }
  }
  lines.push(...section("Top land uses", data.byLandUse.slice(0, 8)));
  lines.push(...section("By country", data.byCountry.slice(0, 5)));
  return lines.join("\n");
}

/** Text digest for the site-visits tracker — pure, so the client page can build it. */
export function buildSiteVisitsSummary(
  bookings: { rawStatus: string; zone: string }[],
  generatedAt: string,
): string {
  const by = (pred: (b: { rawStatus: string }) => boolean) => bookings.filter(pred).length;
  const zones = new Map<string, number>();
  for (const b of bookings) zones.set(b.zone, (zones.get(b.zone) ?? 0) + 1);
  const zoneRows = Array.from(zones.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
  return [
    "KIP SITE-VISIT REQUESTS",
    kv("Generated", generatedAt),
    "",
    kv("Total requests", bookings.length),
    kv("New", by((b) => b.rawStatus === "NEW")),
    kv("Scheduled", by((b) => b.rawStatus === "SCHEDULED")),
    kv("Completed", by((b) => b.rawStatus === "COMPLETED")),
    kv("Cancelled", by((b) => b.rawStatus === "CANCELLED")),
    ...section("By zone", zoneRows),
  ].join("\n");
}
