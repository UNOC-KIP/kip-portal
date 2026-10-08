import { describe, expect, it } from "vitest";
import {
  ApplicationStatus,
  ApplicationWindowStatus,
  LacDecision,
  LAC_QUEUE_STATUSES,
  TcDecision,
  canTransition,
  clarificationCommitteeFor,
  CLARIFICATION_RETURN_STATUS,
  describeLacTally,
  lacDecisionGate,
  lacDecisionSchema,
  lacDecisionTarget,
  tallyLacReviews,
  tcDecisionGate,
  tcDecisionSchema,
  tcDecisionTarget,
  type ApplicationEditWindow,
} from "@kip/shared";

/**
 * The committee rules the console's buttons and the API's write guards share
 * (`@kip/shared` committee.ts). If these pass, a button the console offers is
 * a write the API accepts.
 */

const now = new Date("2026-10-05T09:00:00+03:00");

const liveWindow: ApplicationEditWindow = {
  status: ApplicationWindowStatus.OPEN,
  openAt: "2026-09-01T00:00:00+03:00",
  closeAt: "2026-10-31T23:59:59+03:00",
};

/** Status OPEN but past its close date — must not lock the committee out. */
const staleWindow: ApplicationEditWindow = {
  status: ApplicationWindowStatus.OPEN,
  openAt: "2026-01-15T00:00:00+03:00",
  closeAt: "2026-07-01T12:59:59+03:00",
};

describe("tcDecisionGate", () => {
  it("refuses while the application window is live (rule 3)", () => {
    const g = tcDecisionGate({ status: ApplicationStatus.SUBMITTED, window: liveWindow, now });
    expect(g.open).toBe(false);
    expect(g.reason).toMatch(/window is open/);
  });

  it("opens once the window has closed, including a stale OPEN window", () => {
    for (const window of [null, staleWindow]) {
      expect(tcDecisionGate({ status: ApplicationStatus.SUBMITTED, window, now }).open).toBe(true);
      expect(tcDecisionGate({ status: ApplicationStatus.UNDER_TC_REVIEW, window, now }).open).toBe(true);
    }
  });

  it("waits for an applicant still inside their own submission extension", () => {
    const g = tcDecisionGate({
      status: ApplicationStatus.SUBMITTED,
      window: null,
      extendedUntil: "2026-10-20T23:59:59+03:00",
      now,
    });
    expect(g.open).toBe(false);
    expect(g.reason).toMatch(/extension/);
    // A spent extension no longer holds the committee back.
    expect(
      tcDecisionGate({ status: ApplicationStatus.SUBMITTED, window: null, extendedUntil: "2026-10-01T00:00:00+03:00", now }).open,
    ).toBe(true);
  });

  it("is one-shot: closed once the TC has decided", () => {
    for (const status of [
      ApplicationStatus.LAC_REVIEW,
      ApplicationStatus.NOT_SHORTLISTED,
      ApplicationStatus.ALLOCATED,
    ]) {
      expect(tcDecisionGate({ status, window: null, now }).open).toBe(false);
    }
  });

  it("waits for the investor while a TC clarification is open", () => {
    const g = tcDecisionGate({ status: ApplicationStatus.TC_CLARIFICATION_REQUESTED, window: null, now });
    expect(g.open).toBe(false);
    expect(g.reason).toMatch(/investor/);
  });
});

describe("lacDecisionGate", () => {
  it("opens for applications in LAC review, and legacy SHORTLISTED ones", () => {
    expect(lacDecisionGate({ status: ApplicationStatus.LAC_REVIEW }).open).toBe(true);
    expect(lacDecisionGate({ status: ApplicationStatus.SHORTLISTED }).open).toBe(true);
  });

  it("closes once decided, while waiting on the investor, and outside the LAC stage", () => {
    for (const status of [
      ApplicationStatus.LAC_APPROVED,
      ApplicationStatus.LAC_REJECTED,
      ApplicationStatus.LAC_CLARIFICATION_REQUESTED,
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_TC_REVIEW,
    ]) {
      expect(lacDecisionGate({ status }).open).toBe(false);
    }
    expect(lacDecisionGate({ status: ApplicationStatus.SUBMITTED }).reason).toMatch(/not with the Land Allocation/);
  });
});

describe("decision targets agree with the status machine", () => {
  it("every TC decision is a legal move from SUBMITTED and UNDER_TC_REVIEW", () => {
    for (const d of Object.values(TcDecision)) {
      expect(canTransition(ApplicationStatus.SUBMITTED, tcDecisionTarget(d))).toBe(true);
      expect(canTransition(ApplicationStatus.UNDER_TC_REVIEW, tcDecisionTarget(d))).toBe(true);
    }
  });

  it("shortlisting lands straight in LAC review", () => {
    expect(tcDecisionTarget(TcDecision.SHORTLIST)).toBe(ApplicationStatus.LAC_REVIEW);
  });

  it("every LAC decision is a legal move from each status the LAC may decide on", () => {
    for (const d of Object.values(LacDecision)) {
      expect(canTransition(ApplicationStatus.LAC_REVIEW, lacDecisionTarget(d))).toBe(true);
      expect(canTransition(ApplicationStatus.SHORTLISTED, lacDecisionTarget(d))).toBe(true);
    }
  });

  it("an investor reply returns the application to the committee that asked", () => {
    for (const status of [ApplicationStatus.TC_CLARIFICATION_REQUESTED, ApplicationStatus.LAC_CLARIFICATION_REQUESTED]) {
      const committee = clarificationCommitteeFor(status)!;
      expect(canTransition(status, CLARIFICATION_RETURN_STATUS[committee])).toBe(true);
    }
    expect(clarificationCommitteeFor(ApplicationStatus.LAC_REVIEW)).toBeNull();
  });

  it("the LAC queue covers every status an LAC decision can produce", () => {
    for (const d of Object.values(LacDecision)) {
      expect(LAC_QUEUE_STATUSES).toContain(lacDecisionTarget(d));
    }
  });
});

describe("tallyLacReviews / describeLacTally", () => {
  it("counts recommendations by kind and ignores unknown values", () => {
    const tally = tallyLacReviews([
      { recommendation: "APPROVE" },
      { recommendation: "APPROVE" },
      { recommendation: "REJECT" },
      { recommendation: "BOGUS" },
    ]);
    expect(tally).toEqual({ APPROVE: 2, REJECT: 1, MORE_INFO: 0, total: 3 });
    expect(describeLacTally(tally)).toBe("2 approve · 1 reject");
  });

  it("says so when nobody has reviewed", () => {
    expect(describeLacTally(tallyLacReviews([]))).toBe("No reviews yet");
  });
});

describe("request schemas", () => {
  it("require a written justification", () => {
    expect(tcDecisionSchema.safeParse({ decision: "SHORTLIST", notes: "too short" }).success).toBe(false);
    expect(
      lacDecisionSchema.safeParse({ decision: "APPROVE", notes: "Zoning, acreage and access all fit the plan." }).success,
    ).toBe(true);
    expect(lacDecisionSchema.safeParse({ decision: "SHORTLIST", notes: "x".repeat(30) }).success).toBe(false);
  });
});
