import { Router } from "express";
import { UserRole, initiatePaymentSchema } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { initiatePayment } from "./payments.service.js";

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
