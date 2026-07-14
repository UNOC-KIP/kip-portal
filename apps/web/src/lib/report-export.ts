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
