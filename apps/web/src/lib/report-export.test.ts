import { describe, it, expect } from "vitest";
import {
  csvCell,
  buildInvestorCsv,
  buildOnboardingSummary,
  reportFilename,
} from "./report-export";
import type { InvestorReportRow, ReportData } from "./admin/mappers";

const row = (over: Partial<InvestorReportRow> = {}): InvestorReportRow => ({
  id: "u1",
  company: "Gulf Petrochem",
  rep: "Ada Rep",
  email: "a@gulf.ae",
  country: "UAE",
  sector: "Petrochemicals & Refining",
  companyType: "Limited Liability Company",
  accountStatus: "Active",
  paymentStatus: "Confirmed",
  eoiStage: "Shortlisted",
  reference: "KIP-EOI-2026-0001",
  registeredAt: "1 Jan 2026",
  ...over,
});

describe("csvCell", () => {
  it("leaves plain values untouched", () => {
    expect(csvCell("Uganda")).toBe("Uganda");
  });
  it("quotes and escapes commas, quotes and newlines", () => {
    expect(csvCell("Acme, Ltd")).toBe('"Acme, Ltd"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("treats null/undefined as empty", () => {
    expect(csvCell(undefined as unknown as string)).toBe("");
  });
});

describe("buildInvestorCsv", () => {
  it("emits a header row plus one line per investor", () => {
    const csv = buildInvestorCsv([row(), row({ id: "u2", company: "Nile Energy" })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      "Company,Representative,Email,Country,Sector,Company Type,Account,Payment,EOI Stage,Reference,Registered",
    );
    expect(lines[1]).toContain("Gulf Petrochem");
    expect(lines[2]).toContain("Nile Energy");
  });

  it("escapes a company name containing a comma so columns stay aligned", () => {
    const csv = buildInvestorCsv([row({ company: "Sabastar General Trading, Co." })]);
    expect(csv.split("\r\n")[1]).toContain('"Sabastar General Trading, Co."');
  });

  it("header only for an empty investor list", () => {
    expect(buildInvestorCsv([]).split("\r\n")).toHaveLength(1);
  });
});

const report = (): ReportData => ({
  generatedAt: "14 Jul 2026 · 09:00 UTC",
  windowName: "Phase 1 — Round 1",
  stats: {
    totalRegistered: 4,
    activeAccounts: 3,
    pendingAccounts: 1,
    newLast7Days: 2,
    newLast30Days: 4,
    paymentsConfirmed: 3,
    eoisSubmitted: 3,
    shortlisted: 1,
    allocated: 1,
    siteVisitsRequested: 2,
    feesCollected: "USD 3,000",
    feesCollectedRaw: 3000,
    daysToClose: 12,
  },
  byCountry: [{ label: "Uganda", count: 3 }, { label: "UAE", count: 1 }],
  bySector: [{ label: "Agro-processing", count: 2 }],
  byCompanyType: [{ label: "Limited Liability Company", count: 4 }],
  conversionFunnel: [
    { label: "Registered", count: 4, pct: 100 },
    { label: "Allocated", count: 1, pct: 25 },
  ],
  investors: [row()],
});

describe("buildOnboardingSummary", () => {
  it("includes headline metrics, funnel and breakdowns", () => {
    const text = buildOnboardingSummary(report());
    expect(text).toContain("KIP INVESTOR ONBOARDING REPORT");
    expect(text).toContain("Generated: 14 Jul 2026 · 09:00 UTC");
    expect(text).toContain("Window: Phase 1 — Round 1");
    expect(text).toContain("Registered investors: 4 (active 3, pending 1)");
    expect(text).toContain("Fees collected: USD 3,000");
    expect(text).toContain("- Registered: 4 (100%)");
    expect(text).toContain("- Allocated: 1 (25%)");
    expect(text).toContain("- Uganda: 3");
  });

  it("omits window + days-to-close lines when absent", () => {
    const r = report();
    r.windowName = "";
    r.stats.daysToClose = null;
    const text = buildOnboardingSummary(r);
    expect(text).not.toContain("Window:");
    expect(text).not.toContain("Days to window close");
  });
});

describe("reportFilename", () => {
  it("stamps the UTC date", () => {
    expect(reportFilename(new Date("2026-07-14T22:00:00Z"))).toBe(
      "kip-investor-onboarding-2026-07-14.csv",
    );
  });
});
