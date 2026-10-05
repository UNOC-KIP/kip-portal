import { describe, expect, it } from "vitest";
import { ApplicationStatus } from "@kip/shared";
import {
  enteredLacAt,
  lacQueueStage,
  toClarificationView,
  toDecisionLog,
  toLacQueueRow,
  toLacReviewView,
} from "./committee-mappers";

const NOW = new Date("2026-10-05T09:00:00Z");

describe("lacQueueStage", () => {
  it("sorts statuses into the queue's tabs", () => {
    expect(lacQueueStage(ApplicationStatus.LAC_REVIEW)).toBe("To review");
    expect(lacQueueStage(ApplicationStatus.SHORTLISTED)).toBe("To review");
    expect(lacQueueStage(ApplicationStatus.LAC_CLARIFICATION_REQUESTED)).toBe("Awaiting investor");
    expect(lacQueueStage(ApplicationStatus.LAC_APPROVED)).toBe("Decided");
    expect(lacQueueStage(ApplicationStatus.ALLOCATED)).toBe("Decided");
  });
});

describe("enteredLacAt", () => {
  it("takes the earliest move into LAC review", () => {
    const at = enteredLacAt([
      { toStatus: ApplicationStatus.LAC_REVIEW, createdAt: "2026-09-20T10:00:00Z" },
      { toStatus: ApplicationStatus.LAC_CLARIFICATION_REQUESTED, createdAt: "2026-09-22T10:00:00Z" },
      { toStatus: ApplicationStatus.LAC_REVIEW, createdAt: "2026-09-25T10:00:00Z" },
      { toStatus: null, createdAt: "2026-09-01T10:00:00Z" },
    ]);
    expect(at?.toISOString()).toBe("2026-09-20T10:00:00.000Z");
  });

  it("is null when the application never entered LAC review", () => {
    expect(enteredLacAt([{ toStatus: ApplicationStatus.NOT_SHORTLISTED, createdAt: NOW }])).toBeNull();
  });
});

describe("toLacQueueRow", () => {
  const base = {
    id: "a1",
    reference: "KIP-EOI-2026-0001",
    orgName: "Gulf Petrochem",
    plotNames: ["HI-07", "HI-08"],
    totalAcres: 12.5,
    status: ApplicationStatus.LAC_REVIEW,
    reviews: [
      { reviewerId: "u1", recommendation: "APPROVE" },
      { reviewerId: "u2", recommendation: "MORE_INFO" },
    ],
    viewerId: "u1",
    enteredLacAt: "2026-09-25T09:00:00Z",
    now: NOW,
  };

  it("summarises reviews and picks out the viewer's own", () => {
    const row = toLacQueueRow(base);
    expect(row.tally).toBe("1 approve · 1 more info");
    expect(row.reviewCount).toBe(2);
    expect(row.myRecommendation).toBe("Approve");
    expect(row.plots).toBe("HI-07, HI-08");
    expect(row.acres).toBe("12.50");
    expect(row.days).toBe(10);
    expect(row.outcome).toBe("Under review");
  });

  it("leaves the viewer's review empty when they have not reviewed", () => {
    expect(toLacQueueRow({ ...base, viewerId: "u9" }).myRecommendation).toBeNull();
  });

  it("falls back cleanly with no plots, no reference and no entry date", () => {
    const row = toLacQueueRow({ ...base, reference: null, plotNames: [], totalAcres: 0, enteredLacAt: null });
    expect(row.ref).toBe("a1");
    expect(row.plots).toBe("—");
    expect(row.acres).toBe("—");
    expect(row.enteredAt).toBe("—");
    expect(row.days).toBe(0);
  });
});

describe("review page views", () => {
  it("labels a member review and marks the viewer's own", () => {
    const v = toLacReviewView({
      reviewerId: "u1",
      reviewerName: "  ",
      recommendation: "REJECT",
      notes: "Acreage exceeds the zone allowance.",
      updatedAt: NOW,
      viewerId: "u1",
    });
    expect(v.reviewerName).toBe("LAC member");
    expect(v.recommendationLabel).toBe("Reject");
    expect(v.isMine).toBe(true);
  });

  it("names the committee behind a clarification and shows an open one as unanswered", () => {
    const c = toClarificationView({
      committee: "LAC",
      notes: "Send the updated site layout.",
      askedByName: null,
      createdAt: NOW,
      response: null,
      respondedAt: null,
    });
    expect(c.committee).toBe("Land Allocation Committee");
    expect(c.askedBy).toBe("Committee");
    expect(c.response).toBeNull();
  });

  it("keeps decisions with reasons, oldest first, and drops member recommendations", () => {
    const log = toDecisionLog([
      { type: "LAC_APPROVED", notes: "Fits the plan.", actorName: "Jane", actorRole: "LAC_MEMBER", createdAt: "2026-10-02T00:00:00Z" },
      { type: "RECOMMENDED", notes: "Approve: ok", actorName: "Jane", actorRole: "LAC_MEMBER", createdAt: "2026-10-01T00:00:00Z" },
      { type: "SHORTLISTED", notes: "Meets criteria.", actorName: null, actorRole: "TC_CHAIR", createdAt: "2026-09-25T00:00:00Z" },
    ]);
    expect(log.map((e) => e.title)).toEqual(["TC: shortlisted for LAC review", "LAC: approved, sent to ExCo"]);
    expect(log[0]!.actor).toBe("TC Member");
    expect(log[1]!.actor).toBe("Jane · LAC Member");
  });
});
