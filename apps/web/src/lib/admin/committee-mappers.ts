/**
 * Pure view-model mappers for the committee review pages (TC + LAC).
 *
 * No `@kip/db`, no `server-only` — unit-tested in `committee-mappers.test.ts`.
 * The DB reads that feed these live in `committee-queries.ts`.
 */
import {
  ApplicationStatus,
  LAC_RECOMMENDATION_LABELS,
  REVIEW_COMMITTEE_LABELS,
  ReviewActionType,
  describeLacTally,
  tallyLacReviews,
  type LacRecommendation,
  type ReviewCommittee,
} from "@kip/shared";
import { formatDateTime, formatShortDate } from "../format";
import { roleLabel } from "./mappers";

const DAY_MS = 86_400_000;

// ─── LAC queue ───────────────────────────────────────────────────────────────

export type LacQueueStage = "To review" | "Awaiting investor" | "Decided";

/** Which tab of the LAC queue an application belongs on. */
export function lacQueueStage(status: string): LacQueueStage {
  switch (status) {
    case ApplicationStatus.LAC_REVIEW:
    case ApplicationStatus.SHORTLISTED:
      return "To review";
    case ApplicationStatus.LAC_CLARIFICATION_REQUESTED:
      return "Awaiting investor";
    default:
      return "Decided";
  }
}

/** Committee-facing outcome wording for the queue's status column. */
export function lacOutcomeLabel(status: string): string {
  switch (status) {
    case ApplicationStatus.LAC_REVIEW:
    case ApplicationStatus.SHORTLISTED:
      return "Under review";
    case ApplicationStatus.LAC_CLARIFICATION_REQUESTED:
      return "More info requested";
    case ApplicationStatus.LAC_APPROVED:
      return "Approved · to ExCo";
    case ApplicationStatus.LAC_REJECTED:
      return "Rejected";
    case ApplicationStatus.EXCO_REVIEW:
      return "ExCo review";
    case ApplicationStatus.ALLOCATED:
      return "Allocated";
    default:
      return status;
  }
}

export type LacQueueRow = {
  id: string;
  ref: string;
  company: string;
  plots: string;
  acres: string;
  stage: LacQueueStage;
  outcome: string;
  /** "2 approve · 1 reject", or "No reviews yet". */
  tally: string;
  reviewCount: number;
  /** The viewer's own recommendation label, or null when they have not reviewed. */
  myRecommendation: string | null;
  /** When the application entered LAC review (TC shortlisting). */
  enteredAt: string;
  /** Days since entering LAC review. */
  days: number;
};

export function toLacQueueRow(a: {
  id: string;
  reference: string | null;
  orgName: string;
  plotNames: string[];
  totalAcres: number;
  status: string;
  reviews: { reviewerId: string; recommendation: string }[];
  viewerId: string;
  enteredLacAt: Date | string | null;
  now: Date;
}): LacQueueRow {
  const tally = tallyLacReviews(a.reviews);
  const mine = a.reviews.find((r) => r.reviewerId === a.viewerId);
  const entered = a.enteredLacAt ? new Date(a.enteredLacAt) : null;
  return {
    id: a.id,
    ref: a.reference ?? a.id,
    company: a.orgName,
    plots: a.plotNames.length ? a.plotNames.join(", ") : "—",
    acres: a.totalAcres > 0 ? a.totalAcres.toFixed(2) : "—",
    stage: lacQueueStage(a.status),
    outcome: lacOutcomeLabel(a.status),
    tally: describeLacTally(tally),
    reviewCount: tally.total,
    myRecommendation: mine
      ? LAC_RECOMMENDATION_LABELS[mine.recommendation as LacRecommendation] ?? mine.recommendation
      : null,
    enteredAt: entered ? formatShortDate(entered) : "—",
    days: entered ? Math.max(0, Math.floor((a.now.getTime() - entered.getTime()) / DAY_MS)) : 0,
  };
}

/**
 * When an application entered LAC review: the earliest audit row that moved it
 * to LAC_REVIEW (or the legacy SHORTLISTED resting state).
 */
export function enteredLacAt(
  actions: { toStatus: string | null; createdAt: Date | string }[],
): Date | null {
  let earliest: number | null = null;
  for (const a of actions) {
    if (a.toStatus !== ApplicationStatus.LAC_REVIEW && a.toStatus !== ApplicationStatus.SHORTLISTED) continue;
    const t = new Date(a.createdAt).getTime();
    if (earliest === null || t < earliest) earliest = t;
  }
  return earliest === null ? null : new Date(earliest);
}

// ─── Review page ─────────────────────────────────────────────────────────────

export type LacReviewView = {
  reviewerName: string;
  recommendation: string;
  recommendationLabel: string;
  notes: string;
  updatedAt: string;
  isMine: boolean;
};

export function toLacReviewView(r: {
  reviewerId: string;
  reviewerName: string | null;
  recommendation: string;
  notes: string;
  updatedAt: Date | string;
  viewerId: string;
}): LacReviewView {
  return {
    reviewerName: r.reviewerName?.trim() || "LAC member",
    recommendation: r.recommendation,
    recommendationLabel:
      LAC_RECOMMENDATION_LABELS[r.recommendation as LacRecommendation] ?? r.recommendation,
    notes: r.notes,
    updatedAt: formatDateTime(r.updatedAt),
    isMine: r.reviewerId === r.viewerId,
  };
}

export type ClarificationView = {
  committee: string;
  question: string;
  askedBy: string;
  askedAt: string;
  response: string | null;
  respondedAt: string | null;
};

export function toClarificationView(c: {
  committee: string;
  notes: string;
  askedByName: string | null;
  createdAt: Date | string;
  response: string | null;
  respondedAt: Date | string | null;
}): ClarificationView {
  return {
    committee: REVIEW_COMMITTEE_LABELS[c.committee as ReviewCommittee] ?? c.committee,
    question: c.notes,
    askedBy: c.askedByName?.trim() || "Committee",
    askedAt: formatDateTime(c.createdAt),
    response: c.response,
    respondedAt: c.respondedAt ? formatDateTime(c.respondedAt) : null,
  };
}

/** Audit types that carry a committee's written reasoning, and how to title them. */
const DECISION_TITLES: Partial<Record<string, string>> = {
  [ReviewActionType.SHORTLISTED]: "TC: shortlisted for LAC review",
  [ReviewActionType.NOT_SHORTLISTED]: "TC: not shortlisted",
  [ReviewActionType.LAC_APPROVED]: "LAC: approved, sent to ExCo",
  [ReviewActionType.LAC_REJECTED]: "LAC: rejected",
  [ReviewActionType.REQUESTED_CLARIFICATION]: "More information requested",
  [ReviewActionType.CLARIFICATION_PROVIDED]: "Investor replied",
  [ReviewActionType.ADMIN_STATUS_OVERRIDE]: "Stage changed by an administrator",
};

export type DecisionLogEntry = {
  title: string;
  notes: string | null;
  actor: string;
  time: string;
};

/**
 * The committee's decisions with their written reasons, oldest first. Member
 * recommendations are left out — they have their own panel.
 */
export function toDecisionLog(
  actions: {
    type: string;
    notes: string | null;
    actorName: string | null;
    actorRole: string | null;
    createdAt: Date | string;
  }[],
): DecisionLogEntry[] {
  return actions
    .filter((a) => DECISION_TITLES[a.type])
    .slice()
    .sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime())
    .map((a) => ({
      title: DECISION_TITLES[a.type]!,
      notes: a.notes,
      actor: [a.actorName?.trim(), a.actorRole ? roleLabel(a.actorRole) : null].filter(Boolean).join(" · ") || "—",
      time: formatDateTime(a.createdAt),
    }));
}
