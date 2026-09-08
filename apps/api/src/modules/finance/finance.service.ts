import { randomUUID } from "crypto";
import { Op } from "sequelize";
import {
  Application,
  ApplicationPlot,
  Document,
  InvestorOrg,
  Payment,
  User,
} from "@kip/db";
import {
  UserRole,
  DocumentKind,
  InvoiceStatus,
  REFERENCED_STATUSES,
  formatMoney,
} from "@kip/shared";
import { env } from "../../env.js";
import {
  presignUpload,
  presignDownload,
  getObjectBuffer,
} from "../../storage/index.js";
import { feeForApplication } from "../payments/payments.service.js";
import { feeInvoiceEmail, sendMail } from "../../mailer.js";
import { BadRequest, Forbidden, NotFound } from "../../errors.js";

function assertFinance(actor: { role: string }): void {
  if (actor.role !== UserRole.FINANCE_OFFICER && actor.role !== UserRole.ADMIN) {
    throw Forbidden("Finance access only");
  }
}

/** KIP-APP-XXXXXXXX — the transfer reference shown on the invoice/bank page. */
function paymentRefFor(applicationId: string): string {
  return `KIP-APP-${applicationId.slice(0, 8).toUpperCase()}`;
}

function bankDetails(): { label: string; value: string }[] {
  return [
    { label: "Bank", value: process.env.STANBIC_BANK_NAME ?? "Stanbic Bank Uganda Ltd" },
    { label: "Account Name", value: process.env.STANBIC_ACCOUNT_NAME ?? "Uganda National Oil Company Ltd" },
    { label: "Account No.", value: process.env.STANBIC_ACCOUNT_NUMBER ?? "9030011896005" },
    { label: "Currency", value: "USD" },
    { label: "Swift / BIC", value: process.env.STANBIC_SWIFT ?? "SBICUGKX" },
  ];
}

export type FinanceRow = {
  paymentId: string | null;
  applicationId: string;
  reference: string | null;
  status: string;
  applicantName: string | null;
  company: string | null;
  email: string | null;
  tin: string | null;
  phone: string | null;
  plotCount: number;
  currency: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentStatus: string | null;
  invoiceStatus: string;
  invoiceSentAt: string | null;
  hasReceipt: boolean;
  submittedAt: string | null;
};

/**
 * Every submitted application, with just the finance-relevant fields (applicant,
 * company, email, TIN, plots, amount, payment/invoice status). No personal
 * user data beyond what finance needs to invoice and reconcile.
 */
export async function listFinanceApplications(
  actor: { role: string },
): Promise<FinanceRow[]> {
  assertFinance(actor);

  const apps = await Application.findAll({
    where: { status: { [Op.in]: REFERENCED_STATUSES } },
    order: [["submittedAt", "DESC"]],
    include: [
      { model: User, as: "owner", attributes: ["name", "email", "phone"] },
      {
        model: InvestorOrg,
        as: "investorOrg",
        attributes: ["legalName", "tin", "phone", "email"],
      },
    ],
  });

  const appIds = apps.map((a) => a.id);
  const [payments, plotRows] = await Promise.all([
    Payment.findAll({ where: { applicationId: { [Op.in]: appIds } }, order: [["createdAt", "DESC"]] }),
    ApplicationPlot.findAll({ where: { applicationId: { [Op.in]: appIds } }, attributes: ["applicationId"] }),
  ]);
  const paymentByApp = new Map<string, Payment>();
  for (const p of payments) if (!paymentByApp.has(p.applicationId)) paymentByApp.set(p.applicationId, p);
  const plotCountByApp = new Map<string, number>();
  for (const r of plotRows) plotCountByApp.set(r.applicationId, (plotCountByApp.get(r.applicationId) ?? 0) + 1);

  const rows: FinanceRow[] = [];
  for (const app of apps) {
    const a = app as Application & {
      owner?: { name: string | null; email: string | null; phone: string | null };
      investorOrg?: { legalName: string | null; tin: string | null; phone: string | null; email: string | null };
    };
    const pay = paymentByApp.get(app.id);
    const plotCount = plotCountByApp.get(app.id) ?? 0;
    // Prefer the stored breakdown; fall back to a live computation for legacy rows.
    const fee = await feeForApplication(app.id);
    const subtotal = pay?.subtotalAmount != null ? Number(pay.subtotalAmount) : fee.subtotal;
    const vat = pay?.vatAmount != null ? Number(pay.vatAmount) : fee.vat;
    const total = pay?.amount != null ? Number(pay.amount) : fee.total;
    rows.push({
      paymentId: pay?.id ?? null,
      applicationId: app.id,
      reference: app.reference,
      status: app.status,
      applicantName: a.owner?.name ?? null,
      company: a.investorOrg?.legalName ?? null,
      email: a.owner?.email ?? a.investorOrg?.email ?? null,
      tin: a.investorOrg?.tin ?? null,
      phone: a.investorOrg?.phone ?? a.owner?.phone ?? null,
      plotCount,
      currency: pay?.currency ?? fee.currency,
      subtotal,
      vat,
      total,
      paymentStatus: pay?.status ?? null,
      invoiceStatus: pay?.invoiceStatus ?? InvoiceStatus.NOT_SENT,
      invoiceSentAt: pay?.invoiceSentAt?.toISOString() ?? null,
      hasReceipt: pay?.proofDocumentId != null,
      submittedAt: app.submittedAt?.toISOString() ?? null,
    });
  }
  return rows;
}

/** Presigned PUT so finance can upload the invoice file they prepared. */
export async function presignInvoiceUpload(
  paymentId: string,
  actor: { role: string },
  input: { filename: string; contentType: string },
): Promise<{ documentId: string; uploadUrl: string; storageKey: string }> {
  assertFinance(actor);
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");
  const documentId = randomUUID();
  const safe = input.filename.replace(/[^\w.\-]+/g, "_");
  const storageKey = `applications/${payment.applicationId}/invoices/${documentId}/${safe}`;
  const { url: uploadUrl } = await presignUpload({
    key: storageKey,
    contentType: input.contentType,
    expiresInSeconds: 600,
  });
  return { documentId, uploadUrl, storageKey };
}

/**
 * Record that the invoice has been sent. Two modes:
 *  - attach + email: finance uploaded an invoice (documentId/storageKey/…) and
 *    we email it to the applicant with the amount breakdown + bank details;
 *  - markOnly: the invoice was sent outside the app — we just flag it SENT.
 */
export async function sendInvoice(
  paymentId: string,
  actor: { id: string; role: string },
  input: {
    markOnly?: boolean;
    documentId?: string;
    storageKey?: string;
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    note?: string;
  },
): Promise<void> {
  assertFinance(actor);
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw NotFound("Payment");

  const app = await Application.findByPk(payment.applicationId);
  if (!app) throw NotFound("Application");
  const owner = await User.findByPk(app.ownerUserId, { attributes: ["name", "email"] });

  let invoiceDocumentId: string | null = payment.invoiceDocumentId ?? null;

  if (!input.markOnly) {
    if (!owner?.email) throw BadRequest("The applicant has no email on file.");
    if (!input.storageKey || !input.documentId || !input.filename) {
      throw BadRequest("Attach the invoice file, or use 'mark as sent' if it was sent outside the app.");
    }
    // Register the invoice document (single FEE_INVOICE per application).
    await Document.destroy({ where: { applicationId: app.id, kind: DocumentKind.FEE_INVOICE } });
    await Document.create({
      id: input.documentId,
      applicationId: app.id,
      kind: DocumentKind.FEE_INVOICE,
      filename: input.filename,
      storageKey: input.storageKey,
      mimeType: input.mimeType ?? "application/pdf",
      sizeBytes: input.sizeBytes ?? 0,
    });
    invoiceDocumentId = input.documentId;

    // Attach the file if we can pull the bytes; otherwise fall back to a link.
    const obj = await getObjectBuffer(input.storageKey);
    const invoiceUrl = obj
      ? null
      : await presignDownload({ key: input.storageKey, expiresInSeconds: 60 * 60 * 24 * 7 });

    const html = feeInvoiceEmail({
      name: owner.name ?? "Applicant",
      reference: app.reference ?? "your application",
      plotCount: await ApplicationPlot.count({ where: { applicationId: app.id } }),
      subtotalLabel: formatMoney(Number(payment.subtotalAmount ?? 0), payment.currency),
      vatLabel: formatMoney(Number(payment.vatAmount ?? 0), payment.currency),
      totalLabel: formatMoney(Number(payment.amount ?? 0), payment.currency),
      bank: bankDetails(),
      paymentRef: paymentRefFor(app.id),
      invoiceUrl,
      note: input.note ?? null,
    });

    await sendMail({
      to: owner.email,
      subject: `KIP application fee invoice — ${app.reference ?? ""}`.trim(),
      html,
      attachments: obj
        ? [{ filename: input.filename, content: obj.buffer, contentType: obj.contentType ?? input.mimeType }]
        : undefined,
    });
  }

  await payment.update({
    invoiceStatus: InvoiceStatus.SENT,
    invoiceSentAt: new Date(),
    invoiceSentByUserId: actor.id,
    invoiceDocumentId,
  });
}
