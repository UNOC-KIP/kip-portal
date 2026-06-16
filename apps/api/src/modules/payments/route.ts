import { Router } from "express";
import { Application, Payment } from "@kip/db";
import {
  initiatePaymentSchema,
  PaymentStatus,
  ApplicationStatus,
} from "@kip/shared";
import { requireAuth } from "../../middleware/auth.js";
import { BadRequest } from "../../errors.js";

export const paymentsRouter: Router = Router();

paymentsRouter.use(requireAuth);

/** POST /payments/initiate — start a payment for an application. */
paymentsRouter.post("/initiate", async (req, res, next) => {
  try {
    const input = initiatePaymentSchema.parse(req.body);

    const app = await Application.findByPk(input.applicationId);
    if (!app) throw BadRequest("Application not found");
    if (
      app.status !== ApplicationStatus.DRAFT &&
      app.status !== ApplicationStatus.DRAFT_PAYMENT_PENDING
    ) {
      throw BadRequest("Application is not in a payable state");
    }

    const payment = await Payment.create({
      applicationId: input.applicationId,
      method: input.method,
      currency: input.currency,
      amount: String(input.amount),
      status: PaymentStatus.PENDING,
    });

    if (app.status === ApplicationStatus.DRAFT) {
      await app.update({ status: ApplicationStatus.DRAFT_PAYMENT_PENDING });
    }

    // TODO: hand off to gateway for CARD, or return bank instructions for transfer.
    res.status(201).json({ payment });
  } catch (e) {
    next(e);
  }
});
