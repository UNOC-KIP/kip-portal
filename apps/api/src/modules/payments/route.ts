import { Router } from "express";
import { UserRole, initiatePaymentSchema, presignProofSchema, submitTransferProofSchema } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { BadRequest } from "../../errors.js";
import { initiatePayment, presignProof, submitProof, confirmPayment, getPaymentsByApplicationId } from "./payments.service.js";
import { getPaymentsQuerySchema } from "./payments.schema.js";

export const paymentsRouter: Router = Router();

paymentsRouter.use(requireAuth);

/** POST /payments/initiate — start a payment for an application. */
paymentsRouter.post(
  "/initiate",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const input = initiatePaymentSchema.parse(req.body);
      const payment = await initiatePayment(input, req.user!);
      res.status(201).json({ payment });
    } catch (e) {
      next(e);
    }
  },
);

/** POST /payments/:id/presign-proof — get a presigned S3 URL to upload payment proof. */
paymentsRouter.post(
  "/:id/presign-proof",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const input = presignProofSchema.parse(req.body);
      const result = await presignProof(id, input, req.user!);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

/** POST /payments/:id/submit-proof — mark proof uploaded, set status=PROOF_UPLOADED. */
paymentsRouter.post(
  "/:id/submit-proof",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const input = submitTransferProofSchema.parse(req.body);
      await submitProof(id, input, req.user!);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);

/** POST /payments/:id/confirm — ADMIN confirms a bank-transfer proof (PROOF_UPLOADED → CONFIRMED). */
paymentsRouter.post(
  "/:id/confirm",
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      await confirmPayment(id, req.user!);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);

/** GET /payments?applicationId= — list payments for an application (owner or staff). */
paymentsRouter.get(
  "/",
  async (req, res, next) => {
    try {
      const { applicationId } = getPaymentsQuerySchema.parse(req.query);
      const payments = await getPaymentsByApplicationId(applicationId, req.user!);
      res.json({ payments });
    } catch (e) {
      next(e);
    }
  },
);
