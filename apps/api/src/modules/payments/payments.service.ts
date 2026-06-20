import { randomUUID } from "crypto";
import { sequelize, Application, Document, Payment } from "@kip/db";
import {
  UserRole,
  ApplicationStatus,
  DocumentKind,
  PaymentStatus,
  PaymentMethod,
  Currency,
  type InitiatePaymentInput,
  type PresignProofInput,
  type SubmitTransferProofInput,
} from "@kip/shared";
import { env } from "../../env.js";
import { presignUpload } from "../../storage/index.js";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../errors.js";

function ownerOrAdmin(resourceOwnerId: string, actor: { id: string; role: string }): boolean {
  return resourceOwnerId === actor.id || actor.role === UserRole.ADMIN;
}

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

  if (!ownerOrAdmin(app.ownerUserId, actor)) {
    throw Forbidden("You can only pay for your own application");
  }

  // Only DRAFT_PAYMENT_PENDING is a valid state for initiating payment.
  // DRAFT means payment was already confirmed — do not regress its status.
  if (app.status !== ApplicationStatus.DRAFT_PAYMENT_PENDING) {
    throw BadRequest(
      `Application is not awaiting payment (status: ${app.status})`,
    );
  }

  // Idempotency: return the existing PENDING payment rather than creating a
  // duplicate. This covers the case where the investor refreshes the page
  // after step 1 completes but before step 4 succeeds.
  const existing = await Payment.findOne({
    where: { applicationId: input.applicationId, status: PaymentStatus.PENDING },
  });
  if (existing) return existing;

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

/**
 * Creates a Document row (kind=PAYMENT_PROOF) and returns a presigned S3 PUT
 * URL so the client can upload the proof file directly to S3.
 * Only valid for STANBIC_TRANSFER payments in PENDING status.
 */
export async function presignProof(
  paymentId: string,
  input: PresignProofInput,
  actor: { id: string; role: string },
): Promise<{ documentId: string; uploadUrl: string }> {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");

  const app = await Application.findByPk(payment.applicationId, { attributes: ["ownerUserId"] });
  if (!app) throw NotFound("Application");

  if (!ownerOrAdmin(app.ownerUserId, actor)) {
    throw Forbidden("You can only upload proof for your own payment");
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw Conflict(`Cannot presign proof for payment with status ${payment.status}`);
  }

  if (payment.method !== PaymentMethod.STANBIC_TRANSFER) {
    throw BadRequest("Proof upload is only supported for bank transfers");
  }

  const documentId = randomUUID();
  const storageKey = `applications/${payment.applicationId}/documents/${documentId}/${input.filename}`;

  const [doc, { url: uploadUrl }] = await Promise.all([
    Document.create({
      id: documentId,
      applicationId: payment.applicationId,
      kind: DocumentKind.PAYMENT_PROOF,
      filename: input.filename,
      storageKey,
      mimeType: input.contentType,
      sizeBytes: input.sizeBytes,
    }),
    presignUpload({ key: storageKey, contentType: input.contentType, expiresInSeconds: 600 }),
  ]);

  return { documentId: doc.id, uploadUrl };
}

/**
 * Records that the investor has uploaded their transfer proof.
 * Sets payment status to PROOF_UPLOADED and links the Document row.
 * The ADMIN will confirm it manually (PROOF_UPLOADED → CONFIRMED).
 */
export async function submitProof(
  paymentId: string,
  input: SubmitTransferProofInput,
  actor: { id: string; role: string },
): Promise<void> {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");

  const app = await Application.findByPk(payment.applicationId, { attributes: ["ownerUserId"] });
  if (!app) throw NotFound("Application");

  if (!ownerOrAdmin(app.ownerUserId, actor)) {
    throw Forbidden("You can only submit proof for your own payment");
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw Conflict(`Payment is already in status ${payment.status}`);
  }

  const doc = await Document.findByPk(input.documentId);
  if (!doc || doc.applicationId !== payment.applicationId) {
    throw BadRequest("Document does not belong to this application");
  }

  await sequelize.transaction(async (t) => {
    await payment.update(
      {
        status: PaymentStatus.PROOF_UPLOADED,
        proofDocumentId: input.documentId,
        transferRef: input.reference,
        paidAt: new Date(input.paidAt),
      },
      { transaction: t },
    );
  });
}
