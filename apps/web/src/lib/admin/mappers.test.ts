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
  eoiCallReadiness,
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
    const during = new Date("2026-03-01T00:00:00Z");
    expect(toWindowRow({ ...base, status: "OPEN" }, during).statusVariant).toBe("window-active");
    expect(toWindowRow({ ...base, status: "OPEN" }, during).statusLabel).toBe("Active");
    expect(toWindowRow({ ...base, status: "CLOSED" }, during).statusVariant).toBe("window-closed");
    expect(toWindowRow({ ...base, status: "WEIRD" }, during).statusVariant).toBe(null);
  });

  // Status OPEN alone does not accept applications — the portal and the API also
  // require `now` to be in range. The row must not claim "Active" when it isn't.
  it("toWindowRow does not call an out-of-range OPEN window Active", () => {
    const base = { id: "00000000-0000-0000-0000-000000000001", name: "Round 1", openAt: "2026-01-15T00:00:00Z", closeAt: "2026-06-30T00:00:00Z", status: "OPEN", sequenceCounter: 3 };

    const expired = toWindowRow(base, new Date("2026-08-02T00:00:00Z"));
    expect(expired.statusLabel).toBe("Open · date passed");
    expect(expired.statusVariant).not.toBe("window-active");
    expect(expired.detail).toContain("Not accepting applications");

    const notYet = toWindowRow(base, new Date("2026-01-01T00:00:00Z"));
    expect(notYet.statusLabel).toBe("Open · not started");
    expect(notYet.statusVariant).not.toBe("window-active");
  });
});

describe("eoiCallReadiness", () => {
  const NOW = new Date("2026-08-02T12:00:00Z");
  const CURRENT_CALL = [{ kind: "EOI_CALL", effectiveStatus: "CURRENT" }];
  const liveWindow = {
    name: "Round 1",
    status: "OPEN",
    openAt: "2026-08-01T00:00:00Z",
    closeAt: "2026-09-02T00:00:00Z",
  };

  it("flags a current EOI_CALL milestone with an expired open window", () => {
    const r = eoiCallReadiness(
      CURRENT_CALL,
      [{ ...liveWindow, openAt: "2026-01-15T00:00:00Z", closeAt: "2026-07-01T00:00:00Z" }],
      NOW,
    );
    expect(r.issue).toBe("NO_OPEN_WINDOW");
    expect(r.windowLive).toBe(false);
    expect(r.staleWindow).toEqual({ name: "Round 1", reason: "ALREADY_CLOSED" });
  });

  it("flags a current EOI_CALL milestone with no open window at all", () => {
    const r = eoiCallReadiness(CURRENT_CALL, [{ ...liveWindow, status: "CLOSED" }], NOW);
    expect(r.issue).toBe("NO_OPEN_WINDOW");
    expect(r.staleWindow).toBeNull();
  });

  it("reports no issue when the milestone and a live window agree", () => {
    const r = eoiCallReadiness(CURRENT_CALL, [liveWindow], NOW);
    expect(r.issue).toBeNull();
    expect(r.windowLive).toBe(true);
    expect(r.liveWindowName).toBe("Round 1");
  });

  it("flags a live window that the timeline does not advertise", () => {
    const r = eoiCallReadiness(
      [{ kind: "EOI_CALL", effectiveStatus: "UPCOMING" }],
      [liveWindow],
      NOW,
    );
    expect(r.issue).toBe("WINDOW_NOT_ADVERTISED");
    expect(r.windowLive).toBe(true);
  });

  // A superseded window left OPEN must not mask the one that is actually live.
  it("ignores a stale open window when a newer one is live", () => {
    const r = eoiCallReadiness(
      CURRENT_CALL,
      [
        { name: "Old", status: "OPEN", openAt: "2026-01-15T00:00:00Z", closeAt: "2026-07-01T00:00:00Z" },
        liveWindow,
      ],
      NOW,
    );
    expect(r.issue).toBeNull();
    expect(r.liveWindowName).toBe("Round 1");
    expect(r.staleWindow).toBeNull();
  });

  it("stays quiet when neither the call nor a window is running", () => {
    const r = eoiCallReadiness(
      [{ kind: "EOI_CALL", effectiveStatus: "COMPLETED" }],
      [{ ...liveWindow, status: "CLOSED" }],
      NOW,
    );
    expect(r.issue).toBeNull();
  });
});

describe("toSiteVisitRow", () => {
  const base = {
    id: "00000000-0000-0000-0000-0000000000aa",
    companyName: "Nile Industries Ltd",
    contactName: "Jane Mugisha",
    contactEmail: "jane@nile.ug",
    contactPhone: "+256772000111",
    companyPhone: "+256414000222",
    companyEmail: "info@nile.ug",
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

  it("carries both the rep's and the company's contact details", () => {
    const row = toSiteVisitRow(base);
    expect(row.contactPhone).toBe("+256772000111");
    expect(row.companyPhone).toBe("+256414000222");
    expect(row.companyEmail).toBe("info@nile.ug");
  });

  it("falls back to an em dash when the org has been detached", () => {
    const row = toSiteVisitRow({
      ...base,
      companyName: null,
      contactName: null,
      contactPhone: null,
      companyPhone: null,
      companyEmail: null,
    });
    expect(row.companyName).toBe("—");
    expect(row.contactName).toBe("—");
    expect(row.contactPhone).toBe("—");
    expect(row.companyPhone).toBe("—");
    expect(row.companyEmail).toBe("—");
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

// ─── Investor onboarding report mappers ──────────────────────────────────────

import {
  applicationStageLabel,
  isShortlistedOrBeyond,
  toInvestorReportRow,
} from "./mappers";

describe("applicationStageLabel", () => {
  it("maps every pipeline status to a readable stage", () => {
    expect(applicationStageLabel(null)).toBe("Not started");
    expect(applicationStageLabel(undefined)).toBe("Not started");
    expect(applicationStageLabel("DRAFT_PAYMENT_PENDING")).toBe("Payment pending");
    expect(applicationStageLabel("UNDER_TC_REVIEW")).toBe("Under TC review");
    expect(applicationStageLabel("ALLOCATED")).toBe("Allocated");
    expect(applicationStageLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});

describe("isShortlistedOrBeyond", () => {
  it("true from SHORTLISTED onwards, false before", () => {
    expect(isShortlistedOrBeyond("SHORTLISTED")).toBe(true);
    expect(isShortlistedOrBeyond("LAC_REVIEW")).toBe(true);
    expect(isShortlistedOrBeyond("ALLOCATED")).toBe(true);
    expect(isShortlistedOrBeyond("UNDER_TC_REVIEW")).toBe(false);
    expect(isShortlistedOrBeyond("NOT_SHORTLISTED")).toBe(false);
    expect(isShortlistedOrBeyond(null)).toBe(false);
  });
});

describe("toInvestorReportRow", () => {
  it("falls back company → name → email and dashes missing fields", () => {
    const row = toInvestorReportRow({
      id: "u1",
      name: null,
      email: "rep@acme.com",
      phone: null,
      rawStatus: "ACTIVE",
      orgName: null,
      orgPhone: null,
      orgEmail: null,
      country: null,
      businessSector: null,
      companyType: null,
      reference: null,
      appStatus: null,
      payments: [],
      createdAt: new Date("2026-07-01T00:00:00Z"),
    });
    expect(row.company).toBe("rep@acme.com");
    expect(row.rep).toBe("—");
    expect(row.repPhone).toBe("—");
    expect(row.companyPhone).toBe("—");
    expect(row.companyEmail).toBe("—");
    expect(row.country).toBe("—");
    expect(row.paymentStatus).toBe("Not Paid");
    expect(row.eoiStage).toBe("Not started");
    expect(row.reference).toBe("—");
  });

  it("uses org + primary application when present", () => {
    const row = toInvestorReportRow({
      id: "u2",
      name: "Jane Rep",
      email: "jane@gulf.ae",
      phone: "+971501234567",
      rawStatus: "ACTIVE",
      orgName: "Gulf Petrochem",
      orgPhone: "+97145550100",
      orgEmail: "info@gulf.ae",
      country: "UAE",
      businessSector: "PETROCHEMICALS_REFINING",
      companyType: "LIMITED_LIABILITY_COMPANY",
      reference: "KIP-EOI-2026-0001",
      appStatus: "LAC_REVIEW",
      payments: [{ status: "CONFIRMED" }],
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    expect(row.company).toBe("Gulf Petrochem");
    expect(row.repPhone).toBe("+971501234567");
    expect(row.companyPhone).toBe("+97145550100");
    expect(row.companyEmail).toBe("info@gulf.ae");
    expect(row.accountStatus).toBe("Active");
    expect(row.paymentStatus).toBe("Confirmed");
    expect(row.eoiStage).toBe("LAC review");
    expect(row.reference).toBe("KIP-EOI-2026-0001");
  });
});

// ─── Reports hub aggregation helpers ─────────────────────────────────────────

import {
  bucketWeekly,
  computeStageDurations,
  countRowsBy,
  toAppsReportRow,
  toPaymentReportRow,
  paymentMethodLabel,
  paymentStatusLabel,
} from "./mappers";

const NOW = new Date("2026-07-14T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("countRowsBy", () => {
  it("counts, sorts desc and limits", () => {
    const rows = [{ zone: "A" }, { zone: "B" }, { zone: "B" }, { zone: null }];
    expect(countRowsBy(rows, "zone")).toEqual([
      { label: "B", count: 2 },
      { label: "A", count: 1 },
      { label: "Unknown", count: 1 },
    ]);
    expect(countRowsBy(rows, "zone", 1)).toHaveLength(1);
  });
});

describe("bucketWeekly", () => {
  it("buckets into trailing weeks, oldest first", () => {
    const buckets = bucketWeekly([daysAgo(1), daysAgo(2), daysAgo(8), daysAgo(200), null], NOW, 4);
    expect(buckets).toHaveLength(4);
    expect(buckets[3]).toBe(2); // this week
    expect(buckets[2]).toBe(1); // last week
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(3); // 200d ago + null skipped
  });
});

describe("computeStageDurations", () => {
  it("averages submission→TC, shortlist→LAC, LAC→allocation", () => {
    const apps = [{ id: "a1", submittedAt: daysAgo(30) }];
    const actions = [
      { applicationId: "a1", type: "SHORTLISTED", createdAt: daysAgo(20) },
      { applicationId: "a1", type: "LAC_APPROVED", createdAt: daysAgo(10) },
      { applicationId: "a1", type: "ALLOCATED", createdAt: daysAgo(5) },
    ];
    const [tc, lac, exco] = computeStageDurations(apps, actions);
    expect(tc).toEqual({ label: "Submission → TC decision", days: 10, samples: 1 });
    expect(lac?.days).toBe(10);
    expect(exco?.days).toBe(5);
  });

  it("returns null days with no samples", () => {
    const [tc, lac, exco] = computeStageDurations([], []);
    expect(tc?.days).toBeNull();
    expect(lac?.samples).toBe(0);
    expect(exco?.days).toBeNull();
  });
});

describe("toAppsReportRow", () => {
  it("ages live applications from submission and dashes terminal ones", () => {
    const base = {
      id: "a1",
      reference: "KIP-EOI-2026-0001",
      orgName: "Gulf",
      country: "UAE",
      submittedAt: daysAgo(14),
      createdAt: daysAgo(30),
    };
    const live = toAppsReportRow({ ...base, status: "LAC_REVIEW" }, NOW);
    expect(live.ageDays).toBe(14);
    expect(live.ageLabel).toBe("14d");
    expect(live.stage).toBe("LAC review");
    const done = toAppsReportRow({ ...base, status: "ALLOCATED" }, NOW);
    expect(done.ageDays).toBeNull();
    expect(done.ageLabel).toBe("—");
  });
});

describe("payments report mappers", () => {
  it("labels methods and statuses", () => {
    expect(paymentMethodLabel("STANBIC_TRANSFER")).toBe("Stanbic Transfer");
    expect(paymentStatusLabel("PROOF_UPLOADED")).toBe("Proof Uploaded");
  });

  it("toPaymentReportRow computes confirmation lag in days", () => {
    const row = toPaymentReportRow({
      id: "p1",
      amount: "1000.00",
      currency: "USD",
      method: "STANBIC_TRANSFER",
      status: "CONFIRMED",
      createdAt: daysAgo(10),
      confirmedAt: daysAgo(7),
      orgName: "Gulf",
      reference: "KIP-EOI-2026-0001",
    });
    expect(row.lagDays).toBe(3);
    expect(row.amount).toContain("1,000");
    expect(row.status).toBe("Confirmed");
    const pending = toPaymentReportRow({
      id: "p2",
      amount: 500,
      currency: "USD",
      method: "CARD",
      status: "PENDING",
      createdAt: daysAgo(1),
      confirmedAt: null,
      orgName: null,
      reference: null,
    });
    expect(pending.lagDays).toBeNull();
    expect(pending.company).toBe("—");
  });
});

// ─── Site-visit investor detail ──────────────────────────────────────────────

import { toSiteVisitInvestor } from "./mappers";

describe("toSiteVisitInvestor", () => {
  it("surfaces the referenced application and labels enums", () => {
    const inv = toSiteVisitInvestor({
      userId: "u1",
      name: "Jane Rep",
      designation: "Director",
      email: "jane@gulf.ae",
      phone: "+9715000000",
      rawStatus: "ACTIVE",
      createdAt: new Date("2026-02-01T00:00:00Z"),
      orgName: "Gulf Petrochem",
      country: "UAE",
      businessSector: "PETROCHEMICALS_REFINING",
      companyType: "LIMITED_LIABILITY_COMPANY",
      registrationNumber: "FZE-1234",
      applications: [
        { reference: null, status: "DRAFT" },
        { reference: "KIP-EOI-2026-0001", status: "LAC_REVIEW" },
      ],
    });
    expect(inv.applicationRef).toBe("KIP-EOI-2026-0001");
    expect(inv.applicationStage).toBe("LAC review");
    expect(inv.accountStatus).toBe("Active");
    expect(inv.sector).not.toBe("PETROCHEMICALS_REFINING"); // labelled
  });

  it("dashes missing fields and handles no applications", () => {
    const inv = toSiteVisitInvestor({
      userId: "u2",
      name: null,
      designation: null,
      email: "x@y.com",
      phone: null,
      rawStatus: "PENDING_REVIEW",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      orgName: null,
      country: null,
      businessSector: null,
      companyType: null,
      registrationNumber: null,
      applications: [],
    });
    expect(inv.repName).toBe("—");
    expect(inv.phone).toBe("—");
    expect(inv.applicationRef).toBe("—");
    expect(inv.applicationStage).toBe("Not started");
  });
});
