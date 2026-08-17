/**
 * Shared test fixtures for the pure report modules. Kept out of the `.test.ts`
 * files so `report-export.test.ts` and `report-filters.test.ts` build their
 * rows the same way — a field added to `InvestorReportRow` then only has to be
 * defaulted once.
 */
import type {
  InvestorReportRow,
  NotifySignupRow,
  SiteVisitRow,
  StaffRow,
} from "./admin/mappers";

export function investorRow(over: Partial<InvestorReportRow> = {}): InvestorReportRow {
  return {
    id: "u1",
    company: "Gulf Petrochem",
    rep: "Ada Rep",
    email: "a@gulf.ae",
    repPhone: "+971 50 123 4567",
    companyPhone: "+971 4 555 0100",
    companyEmail: "info@gulf.ae",
    country: "UAE",
    sector: "Petrochemicals & Refining",
    companyType: "Limited Liability Company",
    accountStatus: "Active",
    paymentStatus: "Confirmed",
    eoiStage: "Shortlisted",
    reference: "KIP-EOI-2026-0001",
    registeredAt: "1 Jan 2026",
    zoneKey: "HEAVY_INDUSTRIAL",
    zone: "Heavy Industrial Zone",
    zoneColor: "bg-red-600",
    landUse: "Petrochemicals & Refining",
    acres: "50 acres",
    acresRaw: 50,
    siteVisits: 1,
    siteVisitStatus: "Requested",
    siteVisitOn: "2026-01-04",
    rawAppStatus: "SHORTLISTED",
    registeredOn: "2026-01-01",
    ...over,
  };
}

export function siteVisitRow(over: Partial<SiteVisitRow> = {}): SiteVisitRow {
  return {
    id: "v1",
    companyName: "Gulf Petrochem",
    contactName: "Ada Rep",
    contactEmail: "a@gulf.ae",
    contactPhone: "+971 50 123 4567",
    companyPhone: "+971 4 555 0100",
    companyEmail: "info@gulf.ae",
    zone: "Heavy Industrial Zone",
    zoneKey: "HEAVY_INDUSTRIAL",
    zoneColor: "bg-red-600",
    landUse: "Petrochemicals & Refining",
    description: "Refinery feedstock storage",
    acresLabel: "50 acres",
    acresRaw: 50,
    status: "New",
    rawStatus: "NEW",
    handledBy: "—",
    scheduledAt: "—",
    requestedAt: "5 Jan 2026 · 09:00 UTC",
    requestedOn: "2026-01-05",
    scheduledOn: "",
    daysToSchedule: null,
    country: "UAE",
    sector: "Petrochemicals & Refining",
    ...over,
  };
}

export function staffRow(over: Partial<StaffRow> = {}): StaffRow {
  return {
    id: "s1",
    name: "James Mukasa",
    email: "tc.chair@kip.unoc.co.ug",
    role: "TC Chair",
    createdAt: "1 Jan 2026",
    ...over,
  };
}

export function notifySignupRow(over: Partial<NotifySignupRow> = {}): NotifySignupRow {
  return {
    id: "n1",
    email: "watcher@example.com",
    signedUpAt: "3 Jan 2026 · 10:00 UTC",
    ...over,
  };
}
