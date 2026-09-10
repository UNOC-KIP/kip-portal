import { randomUUID } from "crypto";
import { Op, type Transaction } from "sequelize";
import { sequelize, Application, ApplicationPlot, Document, InvestorOrg, Payment } from "@kip/db";
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
  computeApplicationFee,
  invoiceBlockers,
  invoiceBlockerMessage,
  type ApplicationFee,
} from "@kip/shared";
import { env } from "../../env.js";
import { presignUpload, presignDownload } from "../../storage/index.js";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../errors.js";

function ownerOrAdmin(resourceOwnerId: string, actor: { id: string; role: string }): boolean {
  return resourceOwnerId === actor.id || actor.role === UserRole.ADMIN;
}

/**
 * Server-authoritative fee for an application: per-plot fee (env) × plots, + 18%
 * VAT. The single source used at submit, on the pay page, and by finance.
 */
export async function feeForApplication(
  applicationId: string,
  currency: string = Currency.USD,
): Promise<ApplicationFee> {
  const plotCount = await ApplicationPlot.count({ where: { applicationId } });
  const perPlot =
    currency === Currency.UGX
      ? env.EOI_APPLICATION_FEE_UGX
      : env.EOI_APPLICATION_FEE_USD;
  return computeApplicationFee(plotCount, perPlot, currency);
}

/**
 * Create — idempotently — the PENDING fee payment for an application. Called at
 * submission so the amount and the invoice-tracking row exist before the
 * investor pays. Returns the existing payment if one is already PENDING /
 * PROOF_UPLOADED / CONFIRMED, and null if the application has no plots.
 */
export async function ensureFeePayment(
  applicationId: string,
  t?: Transaction,
): Promise<Payment | null> {
  const fee = await feeForApplication(applicationId);
  if (fee.plotCount < 1) return null;

  const run = async (tx: Transaction): Promise<Payment> => {
    const existing = await Payment.findOne({
      where: {
        applicationId,
        status: {
          [Op.in]: [
            PaymentStatus.PENDING,
            PaymentStatus.PROOF_UPLOADED,
            PaymentStatus.CONFIRMED,
          ],
        },
      },
      transaction: tx,
    });
    if (existing) return existing;
    return Payment.create(
      {
        applicationId,
        method: PaymentMethod.STANBIC_TRANSFER,
        currency: fee.currency,
        amount: String(fee.total),
        subtotalAmount: String(fee.subtotal),
        vatAmount: String(fee.vat),
        status: PaymentStatus.PENDING,
        invoiceStatus: "NOT_SENT",
      },
      { transaction: tx },
    );
  };
  return t ? run(t) : sequelize.transaction(run);
}

/**
 * Investor-initiated: create (or refresh) the fee payment for the plots chosen
 * so far, so an invoice can be issued and paid before the application is
 * finished. Idempotent, and safe to call again after changing plots:
 *  - no live payment yet  -> create a PENDING one for the current plots;
 *  - PENDING              -> refresh the amount to the current plots, and if an
 *                           invoice was already sent, mark it for re-issue;
 *  - PROOF_UPLOADED/CONFIRMED (settled or settling) -> returned unchanged;
 *    the fee is locked in and non-refundable.
 */
export async function requestInvoice(
  applicationId: string,
  actor: { id: string; role: string },
): Promise<Payment> {
  const app = (await Application.findByPk(applicationId, {
    attributes: ["id", "ownerUserId"],
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["tin", "address"] },
    ],
  })) as
    | (Application & { investorOrg?: { tin: string | null; address: string | null } })
    | null;
  if (!app) throw NotFound("Application");
  if (!ownerOrAdmin(app.ownerUserId, actor)) {
    throw Forbidden("You can only request an invoice for your own application");
  }
  const fee = await feeForApplication(app.id);
  // The shared readiness gate — plots to charge for, plus the billing identity
  // that goes on the face of a tax invoice (TIN + registered address). The
  // portal renders the same blockers, so its button and this guard agree.
  const blockers = invoiceBlockers({
    plotCount: fee.plotCount,
    tin: app.investorOrg?.tin,
    address: app.investorOrg?.address,
  });
  if (blockers.length > 0) throw BadRequest(invoiceBlockerMessage(blockers));

  return sequelize.transaction(async (t) => {
    const existing = await Payment.findOne({
      where: {
        applicationId: app.id,
        status: {
          [Op.in]: [
            PaymentStatus.PENDING,
            PaymentStatus.PROOF_UPLOADED,
            PaymentStatus.CONFIRMED,
          ],
        },
      },
      lock: true,
      transaction: t,
    });

    if (!existing) {
      return Payment.create(
        {
          applicationId: app.id,
          method: PaymentMethod.STANBIC_TRANSFER,
          currency: fee.currency,
          amount: String(fee.total),
          subtotalAmount: String(fee.subtotal),
          vatAmount: String(fee.vat),
          status: PaymentStatus.PENDING,
          invoiceStatus: "NOT_SENT",
        },
        { transaction: t },
      );
    }

    // Only an unpaid (PENDING) invoice can be regenerated for new plots.
    if (existing.status === PaymentStatus.PENDING) {
      const amountChanged = existing.amount !== String(fee.total);
      await existing.update(
        {
          amount: String(fee.total),
          subtotalAmount: String(fee.subtotal),
          vatAmount: String(fee.vat),
          // A sent invoice for a now-different amount is stale — re-issue it.
          ...(amountChanged && existing.invoiceStatus === "SENT"
            ? { invoiceStatus: "NOT_SENT", invoiceSentAt: null, invoiceDocumentId: null }
            : {}),
        },
        { transaction: t },
      );
    }
    // PROOF_UPLOADED / CONFIRMED: payment is in progress or settled — leave it.
    return existing;
  });
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

  // The fee is now created at submission (ensureFeePayment); this endpoint just
  // returns the live payment so the investor can upload their receipt. It stays
  // callable after submission (the fee is paid post-submission, invoice-first).
  const fee = await feeForApplication(app.id, input.currency);
  if (fee.plotCount < 1) {
    throw BadRequest(
      "Select at least one plot before paying — the fee is charged per plot.",
    );
  }

  // Idempotency: reuse any live payment (PENDING/PROOF_UPLOADED/CONFIRMED); the
  // partial unique index on (applicationId) WHERE status='PENDING' backs this
  // against concurrent creates.
  return sequelize.transaction(async (t) => {
    const existing = await Payment.findOne({
      where: {
        applicationId: input.applicationId,
        status: {
          [Op.in]: [
            PaymentStatus.PENDING,
            PaymentStatus.PROOF_UPLOADED,
            PaymentStatus.CONFIRMED,
          ],
        },
      },
      lock: true,
      transaction: t,
    });
    if (existing) return existing;

    return Payment.create(
      {
        applicationId: input.applicationId,
        method: input.method,
        currency: input.currency,
        amount: String(fee.total),
        subtotalAmount: String(fee.subtotal),
        vatAmount: String(fee.vat),
        status: PaymentStatus.PENDING,
        invoiceStatus: "NOT_SENT",
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
 * Finance verification — the finance officer (or admin) marks a fee payment
 * PAID (CONFIRMED) or FAILED after reconciling the bank transfer. This only
 * flags the payment; it does NOT move the application in the review pipeline
 * (review proceeds independently of payment). Allowed from PENDING or
 * PROOF_UPLOADED so finance can confirm a transfer they see on the statement
 * even if the investor never uploaded a receipt.
 */
export async function verifyPayment(
  paymentId: string,
  actor: { id: string; role: string },
  result: "CONFIRMED" | "FAILED",
): Promise<void> {
  if (actor.role !== UserRole.FINANCE_OFFICER && actor.role !== UserRole.ADMIN) {
    throw Forbidden("Only the finance officer or an admin can verify payments");
  }
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");
  if (
    payment.status !== PaymentStatus.PENDING &&
    payment.status !== PaymentStatus.PROOF_UPLOADED
  ) {
    throw Conflict(`This payment is already ${payment.status.toLowerCase()}.`);
  }
  const now = new Date();
  if (result === "CONFIRMED") {
    await payment.update({
      status: PaymentStatus.CONFIRMED,
      paidAt: payment.paidAt ?? now,
      confirmedAt: now,
    });
  } else {
    await payment.update({ status: PaymentStatus.FAILED });
  }
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
