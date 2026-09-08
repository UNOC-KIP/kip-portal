import "server-only";
import { Op } from "sequelize";
import {
  Application,
  ApplicationPlot,
  InvestorOrg,
  Payment,
  User,
} from "@kip/db";
import {
  REFERENCED_STATUSES,
  InvoiceStatus,
  computeApplicationFee,
  type FinanceRow,
} from "@kip/shared";

/** Submitted applications with finance-relevant fields only (no personal data
 * beyond what finance needs to invoice and reconcile). Amounts come from the
 * stored payment breakdown, falling back to a computed default for legacy rows. */
export async function getFinanceRows(): Promise<FinanceRow[]> {
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
  const payByApp = new Map<string, Payment>();
  for (const p of payments) if (!payByApp.has(p.applicationId)) payByApp.set(p.applicationId, p);
  const plotByApp = new Map<string, number>();
  for (const r of plotRows) plotByApp.set(r.applicationId, (plotByApp.get(r.applicationId) ?? 0) + 1);

  return apps.map((app) => {
    const a = app as Application & {
      owner?: { name: string | null; email: string | null; phone: string | null };
      investorOrg?: { legalName: string | null; tin: string | null; phone: string | null; email: string | null };
    };
    const pay = payByApp.get(app.id);
    const plotCount = plotByApp.get(app.id) ?? 0;
    const fallback = computeApplicationFee(plotCount);
    return {
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
      currency: pay?.currency ?? fallback.currency,
      subtotal: pay?.subtotalAmount != null ? Number(pay.subtotalAmount) : fallback.subtotal,
      vat: pay?.vatAmount != null ? Number(pay.vatAmount) : fallback.vat,
      total: pay?.amount != null ? Number(pay.amount) : fallback.total,
      paymentStatus: pay?.status ?? null,
      invoiceStatus: pay?.invoiceStatus ?? InvoiceStatus.NOT_SENT,
      invoiceSentAt: pay?.invoiceSentAt?.toISOString() ?? null,
      hasReceipt: pay?.proofDocumentId != null,
      submittedAt: app.submittedAt?.toISOString() ?? null,
    };
  });
}

export type FinanceSummary = {
  submitted: number;
  awaitingInvoice: number;
  invoiceSent: number;
  receiptsToVerify: number;
  paid: number;
  failed: number;
  outstandingTotal: number;
  currency: string;
};

/** KPI roll-up for the finance dashboard. */
export async function getFinanceSummary(): Promise<FinanceSummary> {
  const rows = await getFinanceRows();
  const currency = rows[0]?.currency ?? "USD";
  let awaitingInvoice = 0, invoiceSent = 0, receiptsToVerify = 0, paid = 0, failed = 0, outstanding = 0;
  for (const r of rows) {
    if (r.paymentStatus === "CONFIRMED") paid += 1;
    else if (r.paymentStatus === "FAILED") failed += 1;
    else {
      outstanding += r.total;
      if (r.paymentStatus === "PROOF_UPLOADED") receiptsToVerify += 1;
      if (r.invoiceStatus === InvoiceStatus.SENT) invoiceSent += 1;
      else awaitingInvoice += 1;
    }
  }
  return {
    submitted: rows.length,
    awaitingInvoice,
    invoiceSent,
    receiptsToVerify,
    paid,
    failed,
    outstandingTotal: outstanding,
    currency,
  };
}
