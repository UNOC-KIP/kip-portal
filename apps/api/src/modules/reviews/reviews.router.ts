import { Router } from "express";
import {
  UserRole,
  clarificationReplySchema,
  lacDecisionSchema,
  lacReviewSchema,
  tcDecisionSchema,
} from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { BadRequest } from "../../errors.js";
import {
  recordLacDecision,
  recordTcDecision,
  replyToClarification,
  saveLacReview,
} from "./reviews.service.js";

/**
 * Committee review writes. Reads go direct to the DB from the console and the
 * portal, like everywhere else. Rules for *when* a committee may act live in
 * `@kip/shared` committee.ts; the service enforces them.
 */
export const reviewsRouter: Router = Router();

reviewsRouter.use(requireAuth);

function idParam(id: string | undefined): string {
  if (!id) throw BadRequest("applicationId required");
  return id;
}

/** POST /reviews/:applicationId/tc-decision — shortlist / not shortlist / request info. */
reviewsRouter.post(
  "/:applicationId/tc-decision",
  requireRole(UserRole.TC_MEMBER, UserRole.TC_CHAIR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const input = tcDecisionSchema.parse(req.body);
      const app = await recordTcDecision(idParam(req.params.applicationId), req.user!, input);
      res.json({ id: app.id, status: app.status });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * PUT /reviews/:applicationId/lac-review — record or revise the caller's own
 * recommendation. LAC members only (the service refuses ADMIN: an admin's view
 * is not a committee member's and must not count in the tally).
 */
reviewsRouter.put(
  "/:applicationId/lac-review",
  requireRole(UserRole.LAC_MEMBER, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const input = lacReviewSchema.parse(req.body);
      const review = await saveLacReview(idParam(req.params.applicationId), req.user!, input);
      res.json({ id: review.id, recommendation: review.recommendation });
    } catch (e) {
      next(e);
    }
  },
);

/** POST /reviews/:applicationId/lac-decision — the committee's single final decision. */
reviewsRouter.post(
  "/:applicationId/lac-decision",
  requireRole(UserRole.LAC_MEMBER, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const input = lacDecisionSchema.parse(req.body);
      const app = await recordLacDecision(idParam(req.params.applicationId), req.user!, input);
      res.json({ id: app.id, status: app.status });
    } catch (e) {
      next(e);
    }
  },
);

/** POST /reviews/:applicationId/clarification-reply — investor answers a committee. */
reviewsRouter.post(
  "/:applicationId/clarification-reply",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const input = clarificationReplySchema.parse(req.body);
      const app = await replyToClarification(idParam(req.params.applicationId), req.user!, input);
      res.json({ id: app.id, status: app.status });
    } catch (e) {
      next(e);
    }
  },
);
