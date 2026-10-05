/**
 * Committee review rules — what the Technical Committee (TC) and the Land
 * Allocation Committee (LAC) may do with an application, and when.
 *
 * Pure, `now` injected. The API's write guards and the console pages read these
 * same functions, so a button the console offers is a write the API accepts.
 * Tested in `apps/web/src/lib/committee.test.ts`.
 *
 * The flow:
 *  - TC: one decision per application, only once the application window has
 *    closed. SHORTLIST moves it straight into LAC review; NOT_SHORTLIST is final;
 *    REQUEST_INFO asks the investor a question (TC_CLARIFICATION_REQUESTED).
 *  - LAC: each member records a recommendation (`LacReview`, one per member,
 *    revisable), then one LAC member or an ADMIN records the committee's single
 *    final decision — APPROVE (→ LAC_APPROVED, ExCo's queue), REJECT (final), or
 *    REQUEST_INFO (→ LAC_CLARIFICATION_REQUESTED).
 *  - Investor: replies to an open clarification; the application returns to the
 *    committee that asked.
 */
import { z } from "zod";
import { ApplicationStatus, UserRole } from "./enums";
import { openUntil, type ApplicationEditWindow } from "./application-edit";
import { longDate } from "./timeline";

// ─── Vocabulary ──────────────────────────────────────────────────────────────

export const ReviewCommittee = { TC: "TC", LAC: "LAC" } as const;
export type ReviewCommittee = (typeof ReviewCommittee)[keyof typeof ReviewCommittee];

export const REVIEW_COMMITTEE_LABELS: Record<ReviewCommittee, string> = {
  TC: "Technical Committee",
  LAC: "Land Allocation Committee",
};

export const TcDecision = {
  SHORTLIST: "SHORTLIST",
  NOT_SHORTLIST: "NOT_SHORTLIST",
  REQUEST_INFO: "REQUEST_INFO",
} as const;
export type TcDecision = (typeof TcDecision)[keyof typeof TcDecision];

export const LacDecision = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  REQUEST_INFO: "REQUEST_INFO",
} as const;
export type LacDecision = (typeof LacDecision)[keyof typeof LacDecision];

/** A member's recommendation. Stored on `LacReview.recommendation`. */
export const LacRecommendation = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  MORE_INFO: "MORE_INFO",
} as const;
export type LacRecommendation = (typeof LacRecommendation)[keyof typeof LacRecommendation];

export const LAC_RECOMMENDATION_LABELS: Record<LacRecommendation, string> = {
  APPROVE: "Approve",
  REJECT: "Reject",
  MORE_INFO: "More information needed",
};

/** Roles that may record the TC decision. */
export const TC_DECISION_ROLES: readonly string[] = [
  UserRole.TC_MEMBER,
  UserRole.TC_CHAIR,
  UserRole.ADMIN,
];
/** Roles that record an individual LAC recommendation — members only. */
export const LAC_REVIEW_ROLES: readonly string[] = [UserRole.LAC_MEMBER];
/** Roles that may record the LAC's final decision. */
export const LAC_DECISION_ROLES: readonly string[] = [UserRole.LAC_MEMBER, UserRole.ADMIN];

/** Shortest written justification a committee decision or review accepts. */
export const COMMITTEE_NOTES_MIN = 20;
/** Shortest investor reply to a clarification request. */
export const CLARIFICATION_REPLY_MIN = 10;

// ─── Statuses ────────────────────────────────────────────────────────────────

/** Statuses the TC decides on (once the window has closed). */
export const TC_DECIDABLE_STATUSES: readonly string[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_TC_REVIEW,
];

/** Statuses the LAC reviews and decides on. SHORTLISTED is legacy. */
export const LAC_DECIDABLE_STATUSES: readonly string[] = [
  ApplicationStatus.LAC_REVIEW,
  ApplicationStatus.SHORTLISTED,
];

/** Everything the LAC queue lists: open work, waiting on the investor, and decided. */
export const LAC_QUEUE_STATUSES: readonly string[] = [
  ...LAC_DECIDABLE_STATUSES,
  ApplicationStatus.LAC_CLARIFICATION_REQUESTED,
  ApplicationStatus.LAC_APPROVED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.EXCO_REVIEW,
  ApplicationStatus.ALLOCATED,
];

/** The status an open clarification parks an application in, per committee. */
export const CLARIFICATION_STATUS: Record<ReviewCommittee, ApplicationStatus> = {
  TC: ApplicationStatus.TC_CLARIFICATION_REQUESTED,
  LAC: ApplicationStatus.LAC_CLARIFICATION_REQUESTED,
};

/** Where the investor's reply sends the application back to, per committee. */
export const CLARIFICATION_RETURN_STATUS: Record<ReviewCommittee, ApplicationStatus> = {
  TC: ApplicationStatus.UNDER_TC_REVIEW,
  LAC: ApplicationStatus.LAC_REVIEW,
};

/** The committee waiting on the investor, or null when no clarification is open. */
export function clarificationCommitteeFor(status: string): ReviewCommittee | null {
  if (status === ApplicationStatus.TC_CLARIFICATION_REQUESTED) return ReviewCommittee.TC;
  if (status === ApplicationStatus.LAC_CLARIFICATION_REQUESTED) return ReviewCommittee.LAC;
  return null;
}

export function tcDecisionTarget(decision: TcDecision): ApplicationStatus {
  switch (decision) {
    case TcDecision.SHORTLIST:     return ApplicationStatus.LAC_REVIEW;
    case TcDecision.NOT_SHORTLIST: return ApplicationStatus.NOT_SHORTLISTED;
    case TcDecision.REQUEST_INFO:  return ApplicationStatus.TC_CLARIFICATION_REQUESTED;
  }
}

export function lacDecisionTarget(decision: LacDecision): ApplicationStatus {
  switch (decision) {
    case LacDecision.APPROVE:      return ApplicationStatus.LAC_APPROVED;
    case LacDecision.REJECT:       return ApplicationStatus.LAC_REJECTED;
    case LacDecision.REQUEST_INFO: return ApplicationStatus.LAC_CLARIFICATION_REQUESTED;
  }
}

// ─── Gates ───────────────────────────────────────────────────────────────────

export type CommitteeGate = {
  /** May the committee act on this application right now? */
  open: boolean;
  /** Why not, in words staff can act on. Null when open. */
  reason: string | null;
};

/**
 * May the TC record a decision? Never while the application window is live
 * (CLAUDE.md rule 3 — the committee does not see applications mid-call), and
 * only once per application.
 *
 * @param window the most recent OPEN `ApplicationWindow`, or null.
 */
export function tcDecisionGate(input: {
  status: string;
  window: ApplicationEditWindow;
  now: Date;
}): CommitteeGate {
  const closeAt = openUntil(input.window, input.now);
  if (closeAt) {
    return {
      open: false,
      reason: `The application window is open until ${longDate(closeAt)}. The Technical Committee can review applications once it closes.`,
    };
  }
  if (TC_DECIDABLE_STATUSES.includes(input.status)) return { open: true, reason: null };
  if (input.status === ApplicationStatus.TC_CLARIFICATION_REQUESTED) {
    return {
      open: false,
      reason: "Waiting for the investor to reply to the Technical Committee's request for more information.",
    };
  }
  return { open: false, reason: "The Technical Committee's decision on this application has been recorded." };
}

/**
 * May the LAC review and decide? Member recommendations and the final decision
 * share one gate: once the decision is recorded, recommendations freeze with it.
 */
export function lacDecisionGate(input: { status: string }): CommitteeGate {
  if (LAC_DECIDABLE_STATUSES.includes(input.status)) return { open: true, reason: null };
  if (input.status === ApplicationStatus.LAC_CLARIFICATION_REQUESTED) {
    return {
      open: false,
      reason: "Waiting for the investor to reply to the committee's request for more information.",
    };
  }
  if (LAC_QUEUE_STATUSES.includes(input.status)) {
    return { open: false, reason: "The Land Allocation Committee's decision on this application has been recorded." };
  }
  return { open: false, reason: "This application is not with the Land Allocation Committee." };
}

// ─── Summaries ───────────────────────────────────────────────────────────────

export type LacReviewTally = Record<LacRecommendation, number> & { total: number };

/** Count member recommendations by kind. Unknown values are ignored. */
export function tallyLacReviews(reviews: readonly { recommendation: string }[]): LacReviewTally {
  const tally: LacReviewTally = { APPROVE: 0, REJECT: 0, MORE_INFO: 0, total: 0 };
  for (const r of reviews) {
    if (r.recommendation in LAC_RECOMMENDATION_LABELS) {
      tally[r.recommendation as LacRecommendation] += 1;
      tally.total += 1;
    }
  }
  return tally;
}

/** "2 approve · 1 reject" — empty kinds left out; "No reviews yet" when none. */
export function describeLacTally(tally: LacReviewTally): string {
  if (tally.total === 0) return "No reviews yet";
  const parts: string[] = [];
  if (tally.APPROVE) parts.push(`${tally.APPROVE} approve`);
  if (tally.REJECT) parts.push(`${tally.REJECT} reject`);
  if (tally.MORE_INFO) parts.push(`${tally.MORE_INFO} more info`);
  return parts.join(" · ");
}

// ─── Request schemas ─────────────────────────────────────────────────────────

const committeeNotes = z
  .string()
  .trim()
  .min(COMMITTEE_NOTES_MIN, `Give at least ${COMMITTEE_NOTES_MIN} characters of justification.`)
  .max(5000);

export const tcDecisionSchema = z.object({
  decision: z.nativeEnum(TcDecision),
  notes: committeeNotes,
});
export type TcDecisionInput = z.infer<typeof tcDecisionSchema>;

export const lacReviewSchema = z.object({
  recommendation: z.nativeEnum(LacRecommendation),
  notes: committeeNotes,
});
export type LacReviewInput = z.infer<typeof lacReviewSchema>;

export const lacDecisionSchema = z.object({
  decision: z.nativeEnum(LacDecision),
  notes: committeeNotes,
});
export type LacDecisionInput = z.infer<typeof lacDecisionSchema>;

export const clarificationReplySchema = z.object({
  response: z
    .string()
    .trim()
    .min(CLARIFICATION_REPLY_MIN, `Write at least ${CLARIFICATION_REPLY_MIN} characters.`)
    .max(5000),
});
export type ClarificationReplyInput = z.infer<typeof clarificationReplySchema>;
