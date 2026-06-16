import { describe, it, expect } from "vitest";
import {
  isSubmitted,
  eoiLabel,
  paymentLabel,
  tcStatusLabel,
  roleLabel,
  userStatusLabel,
  hectaresFromSqm,
  computeTransferSla,
  toApplicationRow,
  toTransferRow,
  toUserRow,
  toTcAppRow,
  toWindowRow,
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

  it("userStatusLabel is Active with a verified email or a password", () => {
    expect(userStatusLabel(null, true)).toBe("Active");
    expect(userStatusLabel(new Date(), false)).toBe("Active");
    expect(userStatusLabel(null, false)).toBe("Pending");
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
        reference: "KIP-EOI-2026-0001",
        status: "LAC_REVIEW",
        createdAt: "2026-02-14T10:30:00Z",
        orgName: "Gulf Petrochem International FZE",
        country: "UAE",
        payments: [{ status: "CONFIRMED" }],
      }),
    ).toEqual({
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
        reference: "KIP-EOI-2026-0002",
        orgName: "Hoima Energy Corp",
        transferRef: "STB-TXN-1",
        uploadedAt: "2026-01-01T00:00:00Z",
        now: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toEqual({
      ref: "KIP-EOI-2026-0002",
      company: "Hoima Energy Corp",
      txRef: "STB-TXN-1",
      date: "1 Jan 2026",
      sla: "2 days left",
      slaUrgency: "ok",
    });
  });

  it("toUserRow uses name, derives status, dashes the unknowns", () => {
    expect(
      toUserRow({
        name: "Mohammed Al-Rashidi",
        email: "investor@gulfpetrochem.ae",
        role: "INVESTOR",
        orgName: "Gulf Petrochem International FZE",
        reference: "KIP-EOI-2026-0001",
        emailVerified: null,
        hasPassword: true,
      }),
    ).toEqual({
      company: "Mohammed Al-Rashidi",
      email: "investor@gulfpetrochem.ae",
      role: "Investor",
      ref: "KIP-EOI-2026-0001",
      status: "Active",
      lastLogin: "—",
    });
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
    const base = { name: "Round 1", openAt: "2026-01-15T00:00:00Z", closeAt: "2026-06-30T00:00:00Z", sequenceCounter: 3 };
    expect(toWindowRow({ ...base, status: "OPEN" }).statusVariant).toBe("window-active");
    expect(toWindowRow({ ...base, status: "OPEN" }).statusLabel).toBe("Active");
    expect(toWindowRow({ ...base, status: "CLOSED" }).statusVariant).toBe("window-closed");
    expect(toWindowRow({ ...base, status: "WEIRD" }).statusVariant).toBe(null);
  });
});
