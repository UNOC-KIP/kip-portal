/**
 * Pure builders for the investor-onboarding report exports (CSV + copy-to-
 * clipboard text summary). Intentionally free of any `@kip/db`, `server-only`
 * or React import so it is safe to bundle into the client export button AND
 * unit-testable without a database. All data shaping already happened in
 * `lib/admin/mappers.ts`; this module only serialises the finished view-models.
 */
import type { InvestorReportRow, ReportData } from "./admin/mappers";

const CSV_HEADERS = [
  "Company",
  "Representative",
  "Email",
  "Country",
  "Sector",
  "Company Type",
  "Account",
  "Payment",
  "EOI Stage",
  "Reference",
  "Registered",
] as const;

/** RFC-4180 cell: quote when the value contains a comma, quote or newline. */
export function csvCell(value: string): string {
  const s = value ?? "";
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialise the per-investor rows to a CSV document (CRLF line endings). */
export function buildInvestorCsv(rows: InvestorReportRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.company,
        r.rep,
        r.email,
        r.country,
        r.sector,
        r.companyType,
        r.accountStatus,
        r.paymentStatus,
        r.eoiStage,
        r.reference,
        r.registeredAt,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

/**
 * Plain-text digest for pasting into an email / Slack / WhatsApp to managers.
 * Deterministic — takes no clock; the timestamp comes from `data.generatedAt`.
 */
export function buildOnboardingSummary(data: ReportData): string {
  const s = data.stats;
  const lines: string[] = [
    `KIP INVESTOR ONBOARDING REPORT`,
    `Generated: ${data.generatedAt}`,
  ];
  if (data.windowName) lines.push(`Window: ${data.windowName}`);
  lines.push(
    ``,
    `Registered investors: ${s.totalRegistered} (active ${s.activeAccounts}, pending ${s.pendingAccounts})`,
    `New sign-ups: ${s.newLast7Days} in last 7 days, ${s.newLast30Days} in last 30 days`,
    `Payments confirmed: ${s.paymentsConfirmed}   Fees collected: ${s.feesCollected}`,
    `EOIs submitted: ${s.eoisSubmitted}   Shortlisted: ${s.shortlisted}   Allocated: ${s.allocated}`,
    `Site-visit requests: ${s.siteVisitsRequested}`,
  );
  if (s.daysToClose != null) lines.push(`Days to window close: ${s.daysToClose}`);

  lines.push(``, `Onboarding funnel:`);
  for (const f of data.conversionFunnel) lines.push(`  - ${f.label}: ${f.count} (${f.pct}%)`);

  if (data.byCountry.length > 0) {
    lines.push(``, `Top countries:`);
    for (const c of data.byCountry.slice(0, 5)) lines.push(`  - ${c.label}: ${c.count}`);
  }
  if (data.bySector.length > 0) {
    lines.push(``, `By sector:`);
    for (const c of data.bySector.slice(0, 5)) lines.push(`  - ${c.label}: ${c.count}`);
  }
  return lines.join("\n");
}

/** UTC date stamp `YYYY-MM-DD` for filenames. */
export function datestamp(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Stable, date-stamped download filename, e.g. `kip-investor-onboarding-2026-07-14.csv`. */
export function reportFilename(now: Date = new Date(), ext = "csv"): string {
  return `kip-investor-onboarding-${datestamp(now)}.${ext}`;
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
  { header: "Account", key: "accountStatus" },
  { header: "Payment", key: "paymentStatus" },
  { header: "EOI Stage", key: "eoiStage" },
  { header: "Reference", key: "reference" },
  { header: "Registered", key: "registeredAt" },
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

/** Text digest for the Engagement (site visits + inquiries) report. */
export function buildEngagementSummary(data: {
  generatedAt: string;
  stats: {
    totalVisits: number;
    newVisits: number;
    scheduledVisits: number;
    completedVisits: number;
    totalInquiries: number;
    openInquiries: number;
    signups: number;
  };
  visitsByZone: { label: string; count: number }[];
  inquiriesByChannel: { label: string; count: number }[];
}): string {
  const s = data.stats;
  return [
    "KIP ENGAGEMENT REPORT — SITE VISITS & INQUIRIES",
    kv("Generated", data.generatedAt),
    "",
    kv(
      "Site-visit requests",
      `${s.totalVisits} (new ${s.newVisits}, scheduled ${s.scheduledVisits}, completed ${s.completedVisits})`,
    ),
    kv("Inquiries", `${s.totalInquiries} (open ${s.openInquiries})`),
    kv("Notify-me signups", s.signups),
    ...section("Visits by zone", data.visitsByZone),
    ...section("Inquiries by channel", data.inquiriesByChannel),
  ].join("\n");
}

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
