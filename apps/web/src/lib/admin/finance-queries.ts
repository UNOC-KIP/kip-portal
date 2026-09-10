import "server-only";
import {
  Application,
  ApplicationPlot,
  InvestorOrg,
  Payment,
  Plot,
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
  const includes = [
    {
      model: User,
      as: "owner",
      attributes: ["name", "email", "phone", "designation"],
    },
    {
      model: InvestorOrg,
      as: "investorOrg",
      // The whole billed party — finance raises invoices off the CSV export, so
      // the registered address and legal identity travel with the row.
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
  ];

  // The queue is every submitted application PLUS any application that already
  // has a fee payment — i.e. an investor who generated an invoice early, before
  // finishing (and submitting) their application.
  const allPayments = await Payment.findAll({ order: [["createdAt", "DESC"]] });
  const paidAppIds = Array.from(new Set(allPayments.map((p) => p.applicationId)));

  const [submitted, earlyInvoiced] = await Promise.all([
    Application.findAll({
      where: { status: REFERENCED_STATUSES },
      order: [["submittedAt", "DESC"]],
      include: includes,
    }),
    paidAppIds.length
      ? Application.findAll({ where: { id: paidAppIds }, include: includes })
      : Promise.resolve([] as Application[]),
  ]);

  // Merge (dedupe by id); drop withdrawn applications.
  const byId = new Map<string, Application>();
  for (const a of [...submitted, ...earlyInvoiced]) {
    if (a.status !== "WITHDRAWN") byId.set(a.id, a);
  }
  const apps = Array.from(byId.values()).sort((x, y) => {
    const tx = x.submittedAt?.getTime() ?? x.createdAt?.getTime() ?? 0;
    const ty = y.submittedAt?.getTime() ?? y.createdAt?.getTime() ?? 0;
    return ty - tx;
  });

  const appIds = apps.map((a) => a.id);
  const [payments, plotRows] = await Promise.all([
    appIds.length
      ? Payment.findAll({ where: { applicationId: appIds }, order: [["createdAt", "DESC"]] })
      : Promise.resolve([] as Payment[]),
    appIds.length
      ? ApplicationPlot.findAll({
          where: { applicationId: appIds },
          attributes: ["applicationId", "plotId"],
        })
      : Promise.resolve([] as ApplicationPlot[]),
  ]);
  const payByApp = new Map<string, Payment>();
  for (const p of payments) if (!payByApp.has(p.applicationId)) payByApp.set(p.applicationId, p);

  // Plot names for the export — the invoice itemises the plots, not just a count.
  const plotIds = Array.from(new Set(plotRows.map((r) => r.plotId)));
  const plotRecords = plotIds.length
    ? await Plot.findAll({ where: { id: plotIds }, attributes: ["id", "plotName"] })
    : [];
  const plotNameById = new Map(plotRecords.map((p) => [p.id, p.plotName]));
  const plotNamesByApp = new Map<string, string[]>();
  for (const r of plotRows) {
    const list = plotNamesByApp.get(r.applicationId) ?? [];
    const name = plotNameById.get(r.plotId);
    if (name) list.push(name);
    plotNamesByApp.set(r.applicationId, list);
  }
  const plotByApp = new Map<string, number>();
  for (const r of plotRows) plotByApp.set(r.applicationId, (plotByApp.get(r.applicationId) ?? 0) + 1);

  return apps.map((app) => {
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
    const pay = payByApp.get(app.id);
    const plotCount = plotByApp.get(app.id) ?? 0;
    const fallback = computeApplicationFee(plotCount);
    return {
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
      currency: pay?.currency ?? fallback.currency,
      subtotal: pay?.subtotalAmount != null ? Number(pay.subtotalAmount) : fallback.subtotal,
      vat: pay?.vatAmount != null ? Number(pay.vatAmount) : fallback.vat,
      total: pay?.amount != null ? Number(pay.amount) : fallback.total,
      paymentStatus: pay?.status ?? null,
      invoiceStatus: pay?.invoiceStatus ?? InvoiceStatus.NOT_SENT,
      invoiceSentAt: pay?.invoiceSentAt?.toISOString() ?? null,
      hasReceipt: pay?.proofDocumentId != null,
      transferRef: pay?.transferRef ?? null,
      paidAt: pay?.paidAt?.toISOString() ?? null,
      confirmedAt: pay?.confirmedAt?.toISOString() ?? null,
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

// --- Applicant detail (finance inner page) -----------------------------------

export type FinancePlot = {
  plotName: string | null;
  zone: string | null;
  street: string | null;
  road: string | null;
  acreage: number | null;
};

export type FinanceApplicationDetail = {
  applicationId: string;
  reference: string | null;
  status: string;
  submittedAt: string | null;
  // Applicant (representative)
  applicant: {
    name: string | null;
    email: string | null;
    phone: string | null;
    designation: string | null;
  };
  // Company profile
  company: {
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
  } | null;
  plots: FinancePlot[];
  // Fee + payment
  currency: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentStatus: string | null;
  invoiceStatus: string;
  invoiceSentAt: string | null;
  hasInvoiceDocument: boolean;
  // Proof of payment
  hasProof: boolean;
  transferRef: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
};

/**
 * Full finance view of a single application: the applicant/company profile, the
 * plots applied for, and the fee/payment (including whether a proof of payment
 * has been uploaded). Returns null if the application doesn't exist. Reads only
 * what finance needs to invoice, reconcile and verify.
 */
export async function getFinanceApplicationDetail(
  idOrReference: string,
): Promise<FinanceApplicationDetail | null> {
  // The queue links by internal id (UUID); we also accept a human reference
  // (e.g. KIP-EOI-2026-0001) so the page can be opened directly from a ref.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrReference);
  const app = (await Application.findOne({
    where: isUuid ? { id: idOrReference } : { reference: idOrReference },
    include: [
      { model: User, as: "owner", attributes: ["name", "email", "phone", "designation"] },
      {
        model: InvestorOrg,
        as: "investorOrg",
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
  })) as
    | (Application & {
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
      })
    | null;
  if (!app) return null;

  const appPlots = await ApplicationPlot.findAll({
    where: { applicationId: app.id },
    attributes: ["plotId", "road"],
  });
  const plotIds = appPlots.map((p) => p.plotId);
  const plotRows = plotIds.length
    ? await Plot.findAll({
        where: { id: plotIds },
        attributes: ["id", "plotName", "zone", "street", "acreage"],
      })
    : [];
  const plotById = new Map(plotRows.map((p) => [p.id, p]));
  const plots: FinancePlot[] = appPlots.map((ap) => {
    const p = plotById.get(ap.plotId);
    return {
      plotName: p?.plotName ?? null,
      zone: p?.zone ?? null,
      street: p?.street ?? null,
      road: ap.road ?? null,
      acreage: p?.acreage ?? null,
    };
  });

  const pay = await Payment.findOne({
    where: { applicationId: app.id },
    order: [["createdAt", "DESC"]],
  });
  const fallback = computeApplicationFee(plots.length);

  const org = app.investorOrg;

  return {
    applicationId: app.id,
    reference: app.reference,
    status: app.status,
    submittedAt: app.submittedAt?.toISOString() ?? null,
    applicant: {
      name: app.owner?.name ?? null,
      email: app.owner?.email ?? null,
      phone: app.owner?.phone ?? null,
      designation: app.owner?.designation ?? null,
    },
    company: org
      ? {
          legalName: org.legalName ?? null,
          tradingName: org.tradingName ?? null,
          registrationNumber: org.registrationNumber ?? null,
          ursbRegistrationNumber: org.ursbRegistrationNumber ?? null,
          companyType: org.companyType ?? null,
          businessSector: org.businessSector ?? null,
          countryOfIncorporation: org.countryOfIncorporation ?? null,
          tin: org.tin ?? null,
          address: org.address ?? null,
          phone: org.phone ?? null,
          email: org.email ?? null,
        }
      : null,
    plots,
    currency: pay?.currency ?? fallback.currency,
    subtotal: pay?.subtotalAmount != null ? Number(pay.subtotalAmount) : fallback.subtotal,
    vat: pay?.vatAmount != null ? Number(pay.vatAmount) : fallback.vat,
    total: pay?.amount != null ? Number(pay.amount) : fallback.total,
    paymentStatus: pay?.status ?? null,
    invoiceStatus: pay?.invoiceStatus ?? InvoiceStatus.NOT_SENT,
    invoiceSentAt: pay?.invoiceSentAt?.toISOString() ?? null,
    hasInvoiceDocument: pay?.invoiceDocumentId != null,
    hasProof: pay?.proofDocumentId != null,
    transferRef: pay?.transferRef ?? null,
    paidAt: pay?.paidAt?.toISOString() ?? null,
    confirmedAt: pay?.confirmedAt?.toISOString() ?? null,
  };
}
