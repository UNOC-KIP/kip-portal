import { describe, expect, it } from "vitest";
import {
  ApplicationStatus,
  ApplicationWindowStatus,
  UserRole,
  applicationEditGate,
  canEditPlots,
  type ApplicationEditWindow,
} from "@kip/shared";

/**
 * One gate decides whether an investor may still edit: the wizard's read-only
 * mode, the row action on the applications list, and the API's write guards on
 * sections, partners and documents all read it. These cases pin what all three
 * allow — most importantly that submission is no longer the lock.
 */

const now = new Date("2026-09-10T09:00:00+03:00");

const openWindow: ApplicationEditWindow = {
  status: ApplicationWindowStatus.OPEN,
  openAt: "2026-09-01T00:00:00+03:00",
  closeAt: "2026-09-15T23:59:59+03:00",
};

/** Status OPEN but the closing date has passed — the stale-window trap. */
const expiredWindow: ApplicationEditWindow = {
  status: ApplicationWindowStatus.OPEN,
  openAt: "2026-06-01T00:00:00+03:00",
  closeAt: "2026-06-30T23:59:59+03:00",
};

const gate = (status: string, window: ApplicationEditWindow, role?: string) =>
  applicationEditGate({ status, role, window, now });

describe("applicationEditGate", () => {
  it("lets an investor amend a submitted application while the window is open", () => {
    const g = gate(ApplicationStatus.SUBMITTED, openWindow);
    expect(g.editable).toBe(true);
    expect(g.mode).toBe("AMEND");
    expect(g.closesAt).toBe(new Date("2026-09-15T23:59:59+03:00").toISOString());
    expect(g.message).toMatch(/still change it/i);
  });

  it("locks a submitted application once the window has closed", () => {
    const g = gate(ApplicationStatus.SUBMITTED, null);
    expect(g.editable).toBe(false);
    expect(g.mode).toBe("LOCKED");
    expect(g.message).toMatch(/window has closed/i);
  });

  it("does not reopen a submitted application on a stale OPEN window", () => {
    // Status OPEN alone is not enough — a window left OPEN with a past closeAt
    // must not hand editing back to the applicant.
    expect(gate(ApplicationStatus.SUBMITTED, expiredWindow).editable).toBe(false);
  });

  it("does not reopen a submitted application before the window starts", () => {
    const notYet = applicationEditGate({
      status: ApplicationStatus.SUBMITTED,
      window: openWindow,
      now: new Date("2026-08-20T09:00:00+03:00"),
    });
    expect(notYet.editable).toBe(false);
  });

  it("keeps drafts editable with or without an open window", () => {
    for (const status of [
      ApplicationStatus.DRAFT_PAYMENT_PENDING,
      ApplicationStatus.DRAFT,
    ]) {
      expect(gate(status, openWindow).mode).toBe("DRAFT");
      expect(gate(status, null).editable).toBe(true);
    }
  });

  it("names the submission deadline on a draft while the window is open", () => {
    expect(gate(ApplicationStatus.DRAFT, openWindow).closesAt).not.toBeNull();
    expect(gate(ApplicationStatus.DRAFT, null).closesAt).toBeNull();
  });

  it("honours a clarification request whatever the schedule", () => {
    // The TC may raise one after the window shuts, and the applicant has to be
    // able to answer it.
    const g = gate(ApplicationStatus.TC_CLARIFICATION_REQUESTED, null);
    expect(g.editable).toBe(true);
    expect(g.mode).toBe("CLARIFICATION");
    expect(g.message).toContain("Technical Committee");
  });

  it("honours an LAC clarification request the same way, and names the LAC", () => {
    const g = gate(ApplicationStatus.LAC_CLARIFICATION_REQUESTED, expiredWindow);
    expect(g.editable).toBe(true);
    expect(g.mode).toBe("CLARIFICATION");
    expect(g.message).toContain("Land Allocation Committee");
  });

  it("locks every committee stage", () => {
    for (const status of [
      ApplicationStatus.UNDER_TC_REVIEW,
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.LAC_REVIEW,
      ApplicationStatus.LAC_APPROVED,
      ApplicationStatus.LAC_REJECTED,
      ApplicationStatus.EXCO_REVIEW,
      ApplicationStatus.ALLOCATED,
      ApplicationStatus.NOT_SHORTLISTED,
      ApplicationStatus.WITHDRAWN,
    ]) {
      expect(gate(status, openWindow).editable).toBe(false);
    }
  });

  it("gives ADMIN write access at every stage", () => {
    for (const status of [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.LAC_REVIEW,
      ApplicationStatus.ALLOCATED,
    ]) {
      const g = gate(status, null, UserRole.ADMIN);
      expect(g.editable).toBe(true);
      expect(g.mode).toBe("STAFF");
    }
  });

  it("does not widen access for other staff roles", () => {
    // TC/LAC/ExCo review applications; they do not author them.
    expect(gate(ApplicationStatus.SUBMITTED, null, UserRole.TC_CHAIR).editable).toBe(
      false,
    );
  });
});

describe("canEditPlots", () => {
  it("allows plot changes before submission but not during an amendment", () => {
    // Submitting prices the fee per plot and hands finance an invoice, so plots
    // are the one thing an amendment may not touch.
    expect(canEditPlots(gate(ApplicationStatus.DRAFT, openWindow))).toBe(true);
    expect(canEditPlots(gate(ApplicationStatus.SUBMITTED, openWindow))).toBe(false);
  });

  it("is false whenever the application is locked", () => {
    expect(canEditPlots(gate(ApplicationStatus.LAC_REVIEW, openWindow))).toBe(false);
  });

  it("still allows ADMIN to correct a plot selection", () => {
    expect(canEditPlots(gate(ApplicationStatus.SUBMITTED, null, UserRole.ADMIN))).toBe(
      true,
    );
  });
});
