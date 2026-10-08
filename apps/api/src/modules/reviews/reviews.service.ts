import type { Transaction } from "sequelize";
import {
  sequelize,
  Application,
  ClarificationRequest,
  LacReview,
  ReviewAction,
  User,
} from "@kip/db";
import {
  ApplicationStatus,
  CLARIFICATION_RETURN_STATUS,
  LAC_RECOMMENDATION_LABELS,
  LAC_REVIEW_ROLES,
  LacDecision,
  REVIEW_COMMITTEE_LABELS,
  ReviewActionType,
  ReviewCommittee,
  TcDecision,
  UserRole,
  canTransition,
  clarificationCommitteeFor,
  lacDecisionGate,
  lacDecisionTarget,
  tcDecisionGate,
  tcDecisionTarget,
  type ClarificationReplyInput,
  type LacDecisionInput,
  type LacReviewInput,
  type TcDecisionInput,
} from "@kip/shared";
import { env } from "../../env.js";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../errors.js";
import { logger } from "../../logger.js";
import { clarificationRequestEmail, sendMail } from "../../mailer.js";
import { fireWebhook } from "../../webhooks.js";
import { currentWindow } from "../applications/application-edit.js";

/**
 * Committee review — TC decisions, LAC member reviews, the LAC final decision,
 * and the investor's reply to a request for more information.
 *
 * Every rule about *whether* a committee may act lives in `@kip/shared`
 * committee.ts (`tcDecisionGate`, `lacDecisionGate`), which the console reads
 * too. This module only enforces it, writes the audit trail, and notifies.
 *
 * Each write re-reads the application under a row lock inside its transaction,
 * so two members pressing "Confirm" at the same moment cannot both decide: the
 * second sees the status the first one set and is refused by the gate.
 */

type Actor = { id: string; role: string };

const TC_ACTION_TYPE: Record<TcDecision, ReviewActionType> = {
  SHORTLIST: ReviewActionType.SHORTLISTED,
  NOT_SHORTLIST: ReviewActionType.NOT_SHORTLISTED,
  REQUEST_INFO: ReviewActionType.REQUESTED_CLARIFICATION,
};

const LAC_ACTION_TYPE: Record<LacDecision, ReviewActionType> = {
  APPROVE: ReviewActionType.LAC_APPROVED,
  REJECT: ReviewActionType.LAC_REJECTED,
  REQUEST_INFO: ReviewActionType.REQUESTED_CLARIFICATION,
};

async function lockApplication(applicationId: string, t: Transaction): Promise<Application> {
  const app = await Application.findByPk(applicationId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!app) throw NotFound("Application");
  return app;
}

/** Move status + write the audit row. Refuses a transition the machine forbids. */
async function transition(
  app: Application,
  to: ApplicationStatus,
  actor: Actor,
  type: ReviewActionType,
  notes: string,
  t: Transaction,
): Promise<ApplicationStatus> {
  const from = app.status as ApplicationStatus;
  if (!canTransition(from, to)) {
    throw Conflict(`An application at ${from} cannot move to ${to}.`);
  }
  await app.update({ status: to }, { transaction: t });
  await ReviewAction.create(
    { applicationId: app.id, actorUserId: actor.id, type, fromStatus: from, toStatus: to, notes },
    { transaction: t },
  );
  return from;
}

/**
 * Tell the investor a committee needs more information. Best-effort: the
 * request is already recorded and visible on their dashboard, so a mail failure
 * is logged, never surfaced as a failed decision.
 */
async function notifyClarification(app: Application, committee: ReviewCommittee, question: string) {
  void fireWebhook("clarification-requested", {
    applicationId: app.id,
    reference: app.reference,
    committee,
  });
  try {
    const owner = await User.findByPk(app.ownerUserId, { attributes: ["name", "email"] });
    if (!owner) return;
    await sendMail({
      to: owner.email,
      subject: `More information requested — ${app.reference ?? "your KIP application"}`,
      html: clarificationRequestEmail({
        name: owner.name ?? "Investor",
        reference: app.reference ?? "your application",
        committee: REVIEW_COMMITTEE_LABELS[committee],
        question,
        portalUrl: env.PORTAL_PUBLIC_URL,
      }),
    });
  } catch (err) {
    logger.error({ err, applicationId: app.id }, "clarification email failed");
  }
}

// ─── TC ──────────────────────────────────────────────────────────────────────

export async function recordTcDecision(
  applicationId: string,
  actor: Actor,
  input: TcDecisionInput,
): Promise<Application> {
  const window = await currentWindow();

  const app = await sequelize.transaction(async (t) => {
    const app = await lockApplication(applicationId, t);
    const gate = tcDecisionGate({
      status: app.status,
      window,
      extendedUntil: app.submissionExtendedUntil,
      now: new Date(),
    });
    if (!gate.open) throw Conflict(gate.reason ?? "The TC cannot act on this application.");

    await transition(app, tcDecisionTarget(input.decision), actor, TC_ACTION_TYPE[input.decision], input.notes, t);
    if (input.decision === TcDecision.REQUEST_INFO) {
      await ClarificationRequest.create(
        { applicationId: app.id, requestedById: actor.id, committee: ReviewCommittee.TC, notes: input.notes },
        { transaction: t },
      );
    }
    return app;
  });

  void fireWebhook("tc-decision", {
    applicationId: app.id,
    reference: app.reference,
    decision: input.decision,
    status: app.status,
  });
  if (input.decision === TcDecision.REQUEST_INFO) {
    await notifyClarification(app, ReviewCommittee.TC, input.notes);
  }
  return app;
}

// ─── LAC ─────────────────────────────────────────────────────────────────────

/**
 * Record or revise this member's own recommendation. Moves no status — the
 * committee's final decision does that. Allowed only while the LAC can still
 * decide, so recommendations freeze with the decision.
 */
export async function saveLacReview(
  applicationId: string,
  actor: Actor,
  input: LacReviewInput,
): Promise<LacReview> {
  if (!LAC_REVIEW_ROLES.includes(actor.role)) {
    throw Forbidden(
      "Only Land Allocation Committee members record a recommendation. Record the committee's final decision instead.",
    );
  }

  return sequelize.transaction(async (t) => {
    const app = await lockApplication(applicationId, t);
    const gate = lacDecisionGate({ status: app.status });
    if (!gate.open) throw Conflict(gate.reason ?? "The LAC cannot act on this application.");

    const existing = await LacReview.findOne({
      where: { applicationId: app.id, reviewerId: actor.id },
      transaction: t,
    });
    const review = existing
      ? await existing.update({ recommendation: input.recommendation, notes: input.notes }, { transaction: t })
      : await LacReview.create(
          { applicationId: app.id, reviewerId: actor.id, recommendation: input.recommendation, notes: input.notes },
          { transaction: t },
        );

    await ReviewAction.create(
      {
        applicationId: app.id,
        actorUserId: actor.id,
        type: ReviewActionType.RECOMMENDED,
        notes: `${LAC_RECOMMENDATION_LABELS[input.recommendation]}: ${input.notes}`,
      },
      { transaction: t },
    );
    return review;
  });
}

export async function recordLacDecision(
  applicationId: string,
  actor: Actor,
  input: LacDecisionInput,
): Promise<Application> {
  const app = await sequelize.transaction(async (t) => {
    const app = await lockApplication(applicationId, t);
    const gate = lacDecisionGate({ status: app.status });
    if (!gate.open) throw Conflict(gate.reason ?? "The LAC cannot act on this application.");

    await transition(app, lacDecisionTarget(input.decision), actor, LAC_ACTION_TYPE[input.decision], input.notes, t);
    if (input.decision === LacDecision.REQUEST_INFO) {
      await ClarificationRequest.create(
        { applicationId: app.id, requestedById: actor.id, committee: ReviewCommittee.LAC, notes: input.notes },
        { transaction: t },
      );
    }
    return app;
  });

  // LAC outcomes stay internal until ExCo — no investor email for approve/reject.
  void fireWebhook("lac-decision", {
    applicationId: app.id,
    reference: app.reference,
    decision: input.decision,
    status: app.status,
  });
  if (input.decision === LacDecision.REQUEST_INFO) {
    await notifyClarification(app, ReviewCommittee.LAC, input.notes);
  }
  return app;
}

// ─── Investor reply ──────────────────────────────────────────────────────────

/**
 * The investor answers an open request for more information. The application
 * goes back to the committee that asked. Owner only (ADMIN for EOI preview).
 */
export async function replyToClarification(
  applicationId: string,
  actor: Actor,
  input: ClarificationReplyInput,
): Promise<Application> {
  return sequelize.transaction(async (t) => {
    const app = await lockApplication(applicationId, t);
    if (app.ownerUserId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw Forbidden("You can only reply on your own application");
    }
    const committee = clarificationCommitteeFor(app.status);
    if (!committee) {
      throw BadRequest("There is no open request for information on this application.");
    }

    // Older TC clarifications predate the request row, so a missing one is
    // tolerated — the reply still lands on the audit trail.
    const request = await ClarificationRequest.findOne({
      where: { applicationId: app.id, committee, response: null },
      order: [["createdAt", "DESC"]],
      transaction: t,
    });
    if (request) {
      await request.update({ response: input.response, respondedAt: new Date() }, { transaction: t });
    }

    await transition(
      app,
      CLARIFICATION_RETURN_STATUS[committee],
      actor,
      ReviewActionType.CLARIFICATION_PROVIDED,
      input.response,
      t,
    );
    return app;
  });
}
