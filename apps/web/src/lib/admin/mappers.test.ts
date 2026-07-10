import { describe, it, expect } from "vitest";
import {
  isSubmitted,
  eoiLabel,
  paymentLabel,
  tcStatusLabel,
  roleLabel,
  userStatusLabel,
  companyTypeLabel,
  businessSectorLabel,
  hectaresFromSqm,
  computeTransferSla,
  inquiryStatusLabel,
  inquiryChannelLabel,
  toApplicationRow,
  toInquiryRow,
  toNotifySignupRow,
  toTransferRow,
  toUserRow,
  toTcAppRow,
  toWindowRow,
  toSiteVisitRow,
} from "./mappers";

describe("status helpers", () => {
  it("isSubmitted / eoiLabel", () => {
    expect(isSubmitted("DRAFT")).toBe(false);
    expect(isSubmitted("DRAFT_PAYMENT_PENDING")).toBe(false);
    expect(isSubmitted("LAC_REVIEW")).toBe(true);
    expect(eoiLabel("DRAFT")).toBe("Draft");
    expect(eoiLabel("ALLOCATED")).toBe("Submitted");
  });

  it("paymentLabel prefers CONFIRMED, then any payment, else Not Paid", () => {
    expect(paymentLabel([{ status: "PENDING" }, { status: "CONFIRMED" }])).toBe("Confirmed");
    expect(paymentLabel([{ status: "PENDING" }])).toBe("Pending");
    expect(paymentLabel([])).toBe("Not Paid");
  });

  it("tcStatusLabel maps pipeline status to TC outcome", () => {
    expect(tcStatusLabel("SHORTLISTED")).toBe("Approved");
    expect(tcStatusLabel("ALLOCATED")).toBe("Approved");
    expect(tcStatusLabel("NOT_SHORTLISTED")).toBe("Rejected");
    expect(tcStatusLabel("UNDER_TC_REVIEW")).toBe("In progress");
  });

  it("roleLabel", () => {
    expect(roleLabel("TC_CHAIR")).toBe("TC Member");
    expect(roleLabel("EXCO_MEMBER")).toBe("Exco");
    expect(roleLabel("ADMIN")).toBe("Admin");
    expect(roleLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });

  it("userStatusLabel maps DB status values to display labels", () => {
    expect(userStatusLabel("ACTIVE")).toBe("Active");
    expect(userStatusLabel("PENDING_REVIEW")).toBe("Pending");
    expect(userStatusLabel("REJECTED")).toBe("Rejected");
    expect(userStatusLabel("UNKNOWN")).toBe("Pending");
  });
});

describe("companyTypeLabel / businessSectorLabel", () => {
  it("maps known enum values to display labels", () => {
    expect(companyTypeLabel("LIMITED_LIABILITY_COMPANY")).toBe("Limited Liability Company");
    expect(companyTypeLabel("PUBLIC_LIMITED_COMPANY")).toBe("Public Limited Company (PLC)");
    expect(businessSectorLabel("PETROCHEMICALS_REFINING")).toBe("Petrochemicals & Refining");
    expect(businessSectorLabel("AGRO_PROCESSING")).toBe("Agro-processing");
  });

  it("returns em dash for missing values", () => {
    expect(companyTypeLabel(null)).toBe("—");
    expect(companyTypeLabel(undefined)).toBe("—");
    expect(companyTypeLabel("")).toBe("—");
    expect(businessSectorLabel(null)).toBe("—");
    expect(businessSectorLabel("")).toBe("—");
  });

  it("passes unknown values through unchanged", () => {
    expect(companyTypeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
    expect(businessSectorLabel("MINING")).toBe("MINING");
  });
});

describe("hectaresFromSqm", () => {
  it("converts sqm to one-decimal hectares", () => {
    expect(hectaresFromSqm(80000)).toBe("8.0");
    expect(hectaresFromSqm(5000)).toBe("0.5");
  });
  it("returns em dash for missing/invalid", () => {
    expect(hectaresFromSqm(null)).toBe("—");
    expect(hectaresFromSqm(0)).toBe("—");
    expect(hectaresFromSqm(undefined)).toBe("—");
  });
});

describe("computeTransferSla", () => {
  const uploaded = new Date("2026-01-01T00:00:00Z");
  const at = (hours: number) => new Date(uploaded.getTime() + hours * 3_600_000);

  it("ok when more than a day remains", () => {
    expect(computeTransferSla(uploaded, at(0))).toEqual({ label: "2 days left", urgency: "ok" });
  });
  it("warn under 24h", () => {
    expect(computeTransferSla(uploaded, at(30))).toEqual({ label: "1 day left", urgency: "warn" });
  });
  it("due under 12h", () => {
    expect(computeTransferSla(uploaded, at(40))).toEqual({ label: "Due today", urgency: "due" });
  });
  it("overdue past the window", () => {
    expect(computeTransferSla(uploaded, at(50))).toEqual({ label: "Overdue", urgency: "overdue" });
  });
});

describe("row mappers", () => {
  it("toApplicationRow", () => {
    expect(
      toApplicationRow({
        id: "app-uuid-1",
        reference: "KIP-EOI-2026-0001",
        status: "LAC_REVIEW",
        createdAt: "2026-02-14T10:30:00Z",
        orgName: "Gulf Petrochem International FZE",
        country: "UAE",
        payments: [{ status: "CONFIRMED" }],
      }),
    ).toEqual({
      id: "app-uuid-1",
      ref: "KIP-EOI-2026-0001",
      company: "Gulf Petrochem International FZE",
      country: "UAE",
      payment: "Confirmed",
      eoi: "Submitted",
      date: "14 Feb 2026",
    });
  });

  it("toApplicationRow falls back for draft (no reference / no country)", () => {
    const row = toApplicationRow({
      id: "app-uuid-2",
      reference: null,
      status: "DRAFT",
      createdAt: "2026-04-10T00:00:00Z",
      orgName: "Nile Energy Ventures Ltd",
      country: null,
      payments: [],
    });
    expect(row.ref).toBe("(draft)");
    expect(row.country).toBe("—");
    expect(row.payment).toBe("Not Paid");
    expect(row.eoi).toBe("Draft");
  });

  it("toTransferRow", () => {
    expect(
      toTransferRow({
        id: "pay-uuid-1",
        status: "PROOF_UPLOADED",
        reference: "KIP-EOI-2026-0002",
        orgName: "Hoima Energy Corp",
        transferRef: "STB-TXN-1",
        uploadedAt: "2026-01-01T00:00:00Z",
        now: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toEqual({
      paymentId: "pay-uuid-1",
      paymentStatus: "PROOF_UPLOADED",
      ref: "KIP-EOI-2026-0002",
      company: "Hoima Energy Corp",
      txRef: "STB-TXN-1",
      date: "1 Jan 2026",
      sla: "2 days left",
      slaUrgency: "ok",
    });
  });

  it("toUserRow uses orgName, derives status from rawStatus, dashes the unknowns", () => {
    expect(
      toUserRow({
        id: "user-uuid-1",
        name: "Mohammed Al-Rashidi",
        email: "investor@gulfpetrochem.ae",
        role: "INVESTOR",
        orgName: "Gulf Petrochem International FZE",
        reference: "KIP-EOI-2026-0001",
        rawStatus: "ACTIVE",
        tin: "1000234567",
        country: "UAE",
        phone: "+971501234567",
        createdAt: "2026-01-15T08:00:00.000Z",
      }),
    ).toEqual({
      id: "user-uuid-1",
      company: "Gulf Petrochem International FZE",
      email: "investor@gulfpetrochem.ae",
      role: "Investor",
      ref: "KIP-EOI-2026-0001",
      status: "Active",
      tin: "1000234567",
      country: "UAE",
      phone: "+971501234567",
      registeredAt: "15 Jan 2026",
    });

    expect(
      toUserRow({
        id: "user-uuid-2",
        name: null,
        email: "pending@example.com",
        role: "INVESTOR",
        orgName: null,
        reference: null,
        rawStatus: "PENDING_REVIEW",
        tin: null,
        country: null,
        phone: null,
        createdAt: "2026-06-24T10:00:00.000Z",
      }),
    ).toMatchObject({ status: "Pending", ref: "—", company: "pending@example.com" });
  });

  it("toTcAppRow derives hectares + days, scores are internal", () => {
    const row = toTcAppRow({
      reference: "KIP-EOI-2026-0001",
      orgName: "Gulf Petrochem International FZE",
      landSizeSqm: 80000,
      status: "LAC_REVIEW",
      submittedAt: "2026-02-14T00:00:00Z",
      now: new Date("2026-02-24T00:00:00Z"),
    });
    expect(row.land).toBe("8.0");
    expect(row.days).toBe(10);
    expect(row.status).toBe("Approved");
    expect(row.score).toBe("—");
  });

  it("toWindowRow maps lifecycle to badge variants", () => {
    const base = { id: "00000000-0000-0000-0000-000000000001", name: "Round 1", openAt: "2026-01-15T00:00:00Z", closeAt: "2026-06-30T00:00:00Z", sequenceCounter: 3 };
    expect(toWindowRow({ ...base, status: "OPEN" }).statusVariant).toBe("window-active");
    expect(toWindowRow({ ...base, status: "OPEN" }).statusLabel).toBe("Active");
    expect(toWindowRow({ ...base, status: "CLOSED" }).statusVariant).toBe("window-closed");
    expect(toWindowRow({ ...base, status: "WEIRD" }).statusVariant).toBe(null);
  });
});

describe("toSiteVisitRow", () => {
  const base = {
    id: "00000000-0000-0000-0000-0000000000aa",
    companyName: "Nile Industries Ltd",
    contactName: "Jane Mugisha",
    contactEmail: "jane@nile.ug",
    zone: "HEAVY_INDUSTRIAL",
    landUse: "Polymers & Plastics",
    description: "Polymer compounding plant with on-site warehousing.",
    acres: 25,
    rawStatus: "NEW",
    handledByName: null,
    scheduledAt: null,
    createdAt: "2026-07-10T08:00:00Z",
  };

  it("resolves the zone label and legend colour from KIP_ZONES", () => {
    const row = toSiteVisitRow(base);
    expect(row).toMatchObject({
      zone: "Heavy Industrial Zone",
      zoneColor: "bg-red-600",
      status: "New Request",
      rawStatus: "NEW",
      acresLabel: "25 acres",
    });
  });

  it("falls back to the raw zone value for an unknown zone", () => {
    const row = toSiteVisitRow({ ...base, zone: "ATLANTIS" });
    expect(row.zone).toBe("ATLANTIS");
    expect(row.zoneColor).toBe("bg-ink-300");
  });

  it("singularises a one-acre request", () => {
    expect(toSiteVisitRow({ ...base, acres: 1 }).acresLabel).toBe("1 acre");
  });

  it("fills unscheduled / unhandled fields with em dashes", () => {
    const row = toSiteVisitRow(base);
    expect(row.handledBy).toBe("—");
    expect(row.scheduledAt).toBe("—");
    expect(row.companyName).toBe("Nile Industries Ltd");
  });

  it("surfaces scheduling details once an admin has acted", () => {
    const row = toSiteVisitRow({
      ...base,
      rawStatus: "SCHEDULED",
      handledByName: "KIP Admin",
      scheduledAt: "2026-08-01T09:00:00Z",
    });
    expect(row.status).toBe("Visit Scheduled");
    expect(row.handledBy).toBe("KIP Admin");
    expect(row.scheduledAt).not.toBe("—");
  });

  it("falls back to an em dash when the org has been detached", () => {
    const row = toSiteVisitRow({ ...base, companyName: null, contactName: null });
    expect(row.companyName).toBe("—");
    expect(row.contactName).toBe("—");
  });
});

describe("inquiry mappers", () => {
  it("inquiryStatusLabel maps DB values, defaults to New", () => {
    expect(inquiryStatusLabel("NEW")).toBe("New");
    expect(inquiryStatusLabel("RESPONDED")).toBe("Responded");
    expect(inquiryStatusLabel("CLOSED")).toBe("Closed");
    expect(inquiryStatusLabel("UNKNOWN")).toBe("New");
  });

  it("inquiryChannelLabel maps known channels, passes unknown through", () => {
    expect(inquiryChannelLabel("CONTACT_FORM")).toBe("Contact Form");
    expect(inquiryChannelLabel("LIVE_CHAT")).toBe("Live Chat");
    expect(inquiryChannelLabel("CARRIER_PIGEON")).toBe("CARRIER_PIGEON");
  });

  it("toInquiryRow fills optional fields with em dashes", () => {
    const row = toInquiryRow({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Jane Doe",
      email: "jane@company.com",
      company: null,
      subject: null,
      message: "Interested in agro-processing land.",
      channel: "LIVE_CHAT",
      rawStatus: "NEW",
      respondedByName: null,
      respondedAt: null,
      createdAt: "2026-07-07T08:00:00Z",
    });
    expect(row).toMatchObject({
      company: "—",
      subject: "—",
      channel: "Live Chat",
      status: "New",
      rawStatus: "NEW",
      respondedBy: "—",
      respondedAt: "—",
    });
    expect(row.receivedAt).not.toBe("—");
  });

  it("toInquiryRow surfaces responder details when present", () => {
    const row = toInquiryRow({
      id: "00000000-0000-0000-0000-000000000002",
      name: "John Smith",
      email: "john@company.com",
      company: "Acme Ltd",
      subject: "General Inquiry",
      message: "Hello",
      channel: "CONTACT_FORM",
      rawStatus: "RESPONDED",
      respondedByName: "KIP Admin",
      respondedAt: "2026-07-07T10:00:00Z",
      createdAt: "2026-07-06T08:00:00Z",
    });
    expect(row.status).toBe("Responded");
    expect(row.respondedBy).toBe("KIP Admin");
    expect(row.respondedAt).not.toBe("—");
  });

  it("toNotifySignupRow formats the signup date", () => {
    const row = toNotifySignupRow({
      id: "00000000-0000-0000-0000-000000000003",
      email: "investor@company.com",
      createdAt: "2026-07-01T12:00:00Z",
    });
    expect(row.email).toBe("investor@company.com");
    expect(row.signedUpAt).not.toBe("—");
  });
});
