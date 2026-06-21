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
import { presignUpload, presignDownload } from "../../storage/index.js";
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

  // Fee is server-configured, not client-supplied.
  const amount =
    input.currency === Currency.UGX
      ? env.EOI_APPLICATION_FEE_UGX
      : env.EOI_APPLICATION_FEE_USD;

  // Idempotency: re-check inside the transaction so concurrent calls don't
  // both slip through before either commits. lock:true issues SELECT FOR UPDATE,
  // serialising concurrent requests on the found rows. A DB-level unique partial
  // index on (applicationId) WHERE status='PENDING' would be the complete fix —
  // tracked as a future migration.
  return sequelize.transaction(async (t) => {
    const existing = await Payment.findOne({
      where: { applicationId: input.applicationId, status: PaymentStatus.PENDING },
      lock: true,
      transaction: t,
    });
    if (existing) return existing;

    return Payment.create(
      {
        applicationId: input.applicationId,
        method: input.method,
        currency: input.currency,
        amount: String(amount),
        status: PaymentStatus.PENDING,
      },
      { transaction: t },
    );
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

/**
 * ADMIN confirms a bank-transfer proof, setting payment→CONFIRMED and
 * transitioning the application from DRAFT_PAYMENT_PENDING→DRAFT so the
 * investor can fill in their EOI.
 */
export async function confirmPayment(
  paymentId: string,
  actor: { id: string; role: string },
): Promise<void> {
  if (actor.role !== UserRole.ADMIN) {
    throw Forbidden("Only ADMIN can confirm payments");
  }

  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");

  if (payment.status !== PaymentStatus.PROOF_UPLOADED) {
    throw Conflict(`Cannot confirm payment with status ${payment.status}`);
  }

  const app = await Application.findByPk(payment.applicationId);
  if (!app) throw NotFound("Application");

  await sequelize.transaction(async (t) => {
    await payment.update(
      { status: PaymentStatus.CONFIRMED, confirmedAt: new Date() },
      { transaction: t },
    );
    if (app.status === ApplicationStatus.DRAFT_PAYMENT_PENDING) {
      await app.update({ status: ApplicationStatus.DRAFT }, { transaction: t });
    }
  });

  // fireWebhook('payment-confirmed', { applicationId: payment.applicationId }) — Phase 3
}

/**
 * ADMIN rejects a bank-transfer proof.
 * Sets payment→FAILED; application stays DRAFT_PAYMENT_PENDING so the investor can retry.
 */
export async function rejectPayment(
  paymentId: string,
  actor: { id: string; role: string },
): Promise<void> {
  if (actor.role !== UserRole.ADMIN) {
    throw Forbidden("Only ADMIN can reject payments");
  }

  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");

  if (payment.status !== PaymentStatus.PROOF_UPLOADED) {
    throw Conflict(`Cannot reject payment with status ${payment.status}`);
  }

  await sequelize.transaction(async (t) => {
    await payment.update({ status: PaymentStatus.FAILED }, { transaction: t });
  });

  // fireWebhook('payment-rejected', { applicationId: payment.applicationId }) — Phase 3
}

/**
 * Returns a short-lived presigned GET URL for the payment proof document.
 * ADMIN or the owning investor can fetch this.
 */
export async function getProofDownloadUrl(
  paymentId: string,
  actor: { id: string; role: string },
): Promise<{ url: string }> {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");

  const app = await Application.findByPk(payment.applicationId, { attributes: ["ownerUserId"] });
  if (!app) throw NotFound("Application");

  if (!ownerOrAdmin(app.ownerUserId, actor)) {
    throw Forbidden("You can only view proof for your own payment");
  }

  if (!payment.proofDocumentId) {
    throw BadRequest("No proof document has been uploaded for this payment");
  }

  const doc = await Document.findByPk(payment.proofDocumentId);
  if (!doc) throw NotFound("Document");

  const url = await presignDownload({ key: doc.storageKey, expiresInSeconds: 300 });
  return { url };
}

/**
 * Returns all payments for an application.
 * Ownership enforced: investors see only their own; staff see any.
 */
export async function getPaymentsByApplicationId(
  applicationId: string,
  actor: { id: string; role: string },
): Promise<Payment[]> {
  const app = await Application.findByPk(applicationId, { attributes: ["ownerUserId"] });
  if (!app) throw NotFound("Application");

  if (!ownerOrAdmin(app.ownerUserId, actor)) {
    throw Forbidden("You can only view payments for your own application");
  }

  return Payment.findAll({
    where: { applicationId },
    order: [["createdAt", "DESC"]],
    limit: 20,
  });
}
