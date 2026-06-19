import { sequelize, Application, Payment } from "@kip/db";
import {
  UserRole,
  ApplicationStatus,
  PaymentStatus,
  Currency,
  type InitiatePaymentInput,
} from "@kip/shared";
import { env } from "../../env.js";
import { BadRequest, Forbidden, NotFound } from "../../errors.js";

/**
 * Initiates a payment for an application in DRAFT_PAYMENT_PENDING status.
 * Fee amount is a server-side business rule — never trusted from the client.
 * Payment row is created inside a transaction.
 */
export async function initiatePayment(
  input: InitiatePaymentInput,
  actor: { id: string; role: string },
): Promise<Payment> {
  const app = await Application.findByPk(input.applicationId);
  if (!app) throw NotFound("Application");

  if (app.ownerUserId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw Forbidden("You can only pay for your own application");
  }

  // Only DRAFT_PAYMENT_PENDING is a valid state for initiating payment.
  // DRAFT means payment was already confirmed — do not regress its status.
  if (app.status !== ApplicationStatus.DRAFT_PAYMENT_PENDING) {
    throw BadRequest(
      `Application is not awaiting payment (status: ${app.status})`,
    );
  }

  // Fee is server-configured, not client-supplied.
  const amount =
    input.currency === Currency.UGX
      ? env.EOI_APPLICATION_FEE_UGX
      : env.EOI_APPLICATION_FEE_USD;

  return sequelize.transaction(async (t) => {
    const payment = await Payment.create(
      {
        applicationId: input.applicationId,
        method: input.method,
        currency: input.currency,
        amount: String(amount),
        status: PaymentStatus.PENDING,
      },
      { transaction: t },
    );
    return payment;
  });
}
