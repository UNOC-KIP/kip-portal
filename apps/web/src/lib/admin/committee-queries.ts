/**
 * Committee review read layer — server-only. Feeds the TC and LAC review pages.
 *
 * Writes go through the API's `reviews/` module; the rules for when a committee
 * may act are the pure gates in `@kip/shared` committee.ts, evaluated here
 * against the same live window the API reads.
 */
import "server-only";
import {
  Application,
  ApplicationWindow,
  ClarificationRequest,
  InvestorOrg,
  LacReview,
  Plot,
  ReviewAction,
  User,
} from "@kip/db";
import {
  ApplicationWindowStatus,
  LAC_QUEUE_STATUSES,
  lacDecisionGate,
  tallyLacReviews,
  tcDecisionGate,
  type CommitteeGate,
  type LacRecommendation,
  type LacReviewTally,
} from "@kip/shared";
import {
  enteredLacAt,
  toClarificationView,
  toDecisionLog,
  toLacQueueRow,
  toLacReviewView,
  type ClarificationView,
  type DecisionLogEntry,
  type LacQueueRow,
  type LacReviewView,
} from "./committee-mappers";

/** The window the gates judge against — the most recent OPEN one. Same read as the API. */
async function currentWindow() {
  return ApplicationWindow.findOne({
    where: { status: ApplicationWindowStatus.OPEN },
    order: [["openAt", "DESC"]],
    attributes: ["status", "openAt", "closeAt"],
  });
}

// ─── LAC queue ───────────────────────────────────────────────────────────────

export async function getLacQueue(viewerId: string, now: Date = new Date()): Promise<LacQueueRow[]> {
  const apps = await Application.findAll({
    where: { status: [...LAC_QUEUE_STATUSES] },
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
      { model: Plot, as: "plots", attributes: ["plotName", "acreage"], through: { attributes: [] } },
      { model: LacReview, as: "lacReviews", attributes: ["reviewerId", "recommendation"] },
      { model: ReviewAction, as: "reviewActions", attributes: ["toStatus", "createdAt"] },
    ],
    order: [["submittedAt", "ASC"]],
    limit: 500,
  });

  return apps.map((row) => {
    const a = row as Application & {
      investorOrg?: InvestorOrg;
      plots?: Plot[];
      lacReviews?: LacReview[];
      reviewActions?: ReviewAction[];
    };
    const plots = (a.plots ?? []).slice().sort((x, y) => x.plotName.localeCompare(y.plotName));
    return toLacQueueRow({
      id: a.id,
      reference: a.reference,
      orgName: a.investorOrg?.legalName ?? "—",
      plotNames: plots.map((p) => p.plotName),
      totalAcres: plots.reduce((sum, p) => sum + (p.acreage ?? 0), 0),
      status: a.status,
      reviews: (a.lacReviews ?? []).map((r) => ({ reviewerId: r.reviewerId, recommendation: r.recommendation })),
      viewerId,
      enteredLacAt: enteredLacAt(
        (a.reviewActions ?? []).map((ra) => ({ toStatus: ra.toStatus ?? null, createdAt: ra.createdAt })),
      ),
      now,
    });
  });
}

// ─── Review page context ─────────────────────────────────────────────────────

export type CommitteeContext = {
  tcGate: CommitteeGate;
  lacGate: CommitteeGate;
  lacReviews: LacReviewView[];
  lacTally: LacReviewTally;
  /** The viewer's own recommendation, to prefill their form. */
  myLacReview: { recommendation: LacRecommendation; notes: string } | null;
  clarifications: ClarificationView[];
  decisionLog: DecisionLogEntry[];
};

/**
 * Everything the committee panels need beyond the application itself: both
 * gates, member reviews, clarification history, and decisions with reasons.
 */
export async function getCommitteeContext(
  applicationId: string,
  status: string,
  viewerId: string,
  now: Date = new Date(),
): Promise<CommitteeContext> {
  const [window, reviews, clarifications, actions] = await Promise.all([
    currentWindow(),
    LacReview.findAll({
      where: { applicationId },
      include: [{ model: User, as: "reviewer", attributes: ["name", "email"] }],
      order: [["updatedAt", "ASC"]],
    }),
    ClarificationRequest.findAll({
      where: { applicationId },
      include: [{ model: User, as: "requestedBy", attributes: ["name", "email"] }],
      order: [["createdAt", "ASC"]],
    }),
    ReviewAction.findAll({
      where: { applicationId },
      include: [{ model: User, as: "actor", attributes: ["name", "role"] }],
      order: [["createdAt", "ASC"]],
    }),
  ]);

  const mine = reviews.find((r) => r.reviewerId === viewerId);

  return {
    tcGate: tcDecisionGate({ status, window, now }),
    lacGate: lacDecisionGate({ status }),
    lacReviews: reviews.map((row) => {
      const r = row as LacReview & { reviewer?: User };
      return toLacReviewView({
        reviewerId: r.reviewerId,
        reviewerName: r.reviewer?.name ?? r.reviewer?.email ?? null,
        recommendation: r.recommendation,
        notes: r.notes,
        updatedAt: r.updatedAt,
        viewerId,
      });
    }),
    lacTally: tallyLacReviews(reviews),
    myLacReview: mine
      ? { recommendation: mine.recommendation as LacRecommendation, notes: mine.notes }
      : null,
    clarifications: clarifications.map((row) => {
      const c = row as ClarificationRequest & { requestedBy?: User };
      return toClarificationView({
        committee: c.committee,
        notes: c.notes,
        askedByName: c.requestedBy?.name ?? c.requestedBy?.email ?? null,
        createdAt: c.createdAt,
        response: c.response ?? null,
        respondedAt: c.respondedAt ?? null,
      });
    }),
    decisionLog: toDecisionLog(
      actions.map((row) => {
        const ra = row as ReviewAction & { actor?: User };
        return {
          type: ra.type,
          notes: ra.notes ?? null,
          actorName: ra.actor?.name ?? null,
          actorRole: ra.actor?.role ?? null,
          createdAt: ra.createdAt,
        };
      }),
    ),
  };
}
