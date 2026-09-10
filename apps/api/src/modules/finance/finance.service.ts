import { randomUUID } from "crypto";
import { Op } from "sequelize";
import {
  Application,
  ApplicationPlot,
  Document,
  InvestorOrg,
  Payment,
  Plot,
  User,
} from "@kip/db";
import {
  UserRole,
  DocumentKind,
  InvoiceStatus,
  REFERENCED_STATUSES,
  formatMoney,
  type FinanceRow,
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
      {
        model: User,
        as: "owner",
        attributes: ["name", "email", "phone", "designation"],
      },
      {
        model: InvestorOrg,
        as: "investorOrg",
        // The full billed party — an invoice needs the legal identity and the
        // registered address, not just a name and a TIN.
        attributes: [
          "legalName",
          "tradingName",
          "registrationNumber",
          "ursbRegistrationNumber",
          "companyType",
          "businessSector",
          "countryOfIncorporation",
          "tin",
          "address",
          "phone",
          "email",
        ],
      },
    ],
  });

  const appIds = apps.map((a) => a.id);
  const [payments, plotRows] = await Promise.all([
    Payment.findAll({ where: { applicationId: { [Op.in]: appIds } }, order: [["createdAt", "DESC"]] }),
    ApplicationPlot.findAll({
      where: { applicationId: { [Op.in]: appIds } },
      attributes: ["applicationId", "plotId"],
    }),
  ]);
  const paymentByApp = new Map<string, Payment>();
  for (const p of payments) if (!paymentByApp.has(p.applicationId)) paymentByApp.set(p.applicationId, p);
  const plotCountByApp = new Map<string, number>();
  for (const r of plotRows) plotCountByApp.set(r.applicationId, (plotCountByApp.get(r.applicationId) ?? 0) + 1);

  // Plot names travel with the row — an invoice itemises plots, not a count.
  const plotIds = Array.from(new Set(plotRows.map((r) => r.plotId)));
  const plotRecords = plotIds.length
    ? await Plot.findAll({ where: { id: { [Op.in]: plotIds } }, attributes: ["id", "plotName"] })
    : [];
  const plotNameById = new Map(plotRecords.map((p) => [p.id, p.plotName]));
  const plotNamesByApp = new Map<string, string[]>();
  for (const r of plotRows) {
    const list = plotNamesByApp.get(r.applicationId) ?? [];
    const name = plotNameById.get(r.plotId);
    if (name) list.push(name);
    plotNamesByApp.set(r.applicationId, list);
  }

  const rows: FinanceRow[] = [];
  for (const app of apps) {
    const a = app as Application & {
      owner?: {
        name: string | null;
        email: string | null;
        phone: string | null;
        designation: string | null;
      };
      investorOrg?: {
        legalName: string | null;
        tradingName: string | null;
        registrationNumber: string | null;
        ursbRegistrationNumber: string | null;
        companyType: string | null;
        businessSector: string | null;
        countryOfIncorporation: string | null;
        tin: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
      };
    };
    const org = a.investorOrg;
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
      applicantDesignation: a.owner?.designation ?? null,
      applicantPhone: a.owner?.phone ?? null,
      company: org?.legalName ?? null,
      tradingName: org?.tradingName ?? null,
      registrationNumber: org?.registrationNumber ?? null,
      ursbRegistrationNumber: org?.ursbRegistrationNumber ?? null,
      companyType: org?.companyType ?? null,
      businessSector: org?.businessSector ?? null,
      countryOfIncorporation: org?.countryOfIncorporation ?? null,
      address: org?.address ?? null,
      companyEmail: org?.email ?? null,
      companyPhone: org?.phone ?? null,
      email: a.owner?.email ?? org?.email ?? null,
      tin: org?.tin ?? null,
      phone: org?.phone ?? a.owner?.phone ?? null,
      plotCount,
      plotNames: plotNamesByApp.get(app.id) ?? [],
      currency: pay?.currency ?? fee.currency,
      subtotal,
      vat,
      total,
      paymentStatus: pay?.status ?? null,
      invoiceStatus: pay?.invoiceStatus ?? InvoiceStatus.NOT_SENT,
      invoiceSentAt: pay?.invoiceSentAt?.toISOString() ?? null,
      hasReceipt: pay?.proofDocumentId != null,
      transferRef: pay?.transferRef ?? null,
      paidAt: pay?.paidAt?.toISOString() ?? null,
      confirmedAt: pay?.confirmedAt?.toISOString() ?? null,
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

/**
 * A presigned download URL for an application's fee invoice. The application
 * owner (or finance/admin) may fetch it; 404 if no invoice document has been
 * attached (e.g. it was sent outside the app).
 */
export async function getInvoiceDownloadUrl(
  applicationId: string,
  actor: { id: string; role: string },
): Promise<string> {
  const app = await Application.findByPk(applicationId, {
    attributes: ["id", "ownerUserId"],
  });
  if (!app) throw NotFound("Application");
  const isOwner = app.ownerUserId === actor.id;
  const isStaff =
    actor.role === UserRole.ADMIN || actor.role === UserRole.FINANCE_OFFICER;
  if (!isOwner && !isStaff) {
    throw Forbidden("You can only view your own invoice");
  }
  const payment = await Payment.findOne({
    where: { applicationId },
    order: [["createdAt", "DESC"]],
  });
  const docId = payment?.invoiceDocumentId;
  if (!docId) throw NotFound("Invoice");
  const doc = await Document.findByPk(docId, { attributes: ["storageKey"] });
  if (!doc) throw NotFound("Invoice");
  return presignDownload({ key: doc.storageKey, expiresInSeconds: 300 });
}

/**
 * A presigned download URL for the payment proof (receipt) an investor uploaded
 * against an application. Finance/admin only — this is how the finance officer
 * verifies a payment. 404 if no proof has been uploaded yet.
 */
export async function getProofDownloadUrl(
  applicationId: string,
  actor: { role: string },
): Promise<{ url: string; filename: string }> {
  assertFinance(actor);
  const app = await Application.findByPk(applicationId, { attributes: ["id"] });
  if (!app) throw NotFound("Application");

  const payment = await Payment.findOne({
    where: { applicationId },
    order: [["createdAt", "DESC"]],
  });
  const docId = payment?.proofDocumentId;
  if (!docId) throw NotFound("Payment proof");
  const doc = await Document.findByPk(docId, {
    attributes: ["storageKey", "filename"],
  });
  if (!doc) throw NotFound("Payment proof");
  const url = await presignDownload({ key: doc.storageKey, expiresInSeconds: 300 });
  return { url, filename: doc.filename };
}
