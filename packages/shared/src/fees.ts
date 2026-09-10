/**
 * Application-fee maths — pure and framework-free so the API (authoritative
 * amount), the portal (pre-submit note) and the admin finance table all agree.
 *
 * The per-plot fee is configurable server-side (EOI_APPLICATION_FEE_USD); the
 * default here mirrors that env default for display where the env is not
 * available (the browser). VAT is Uganda's standard 18%.
 */
export const EOI_VAT_RATE = 0.18;

/** Default per-plot application fee (USD). Mirrors EOI_APPLICATION_FEE_USD. */
export const DEFAULT_PER_PLOT_FEE_USD = 1000;

export type ApplicationFee = {
  currency: string;
  plotCount: number;
  perPlot: number;
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
};

/** Round to 2dp, avoiding binary-float drift on things like 0.18 multiplies. */
function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Fee for `plotCount` plots at `perPlot` each, plus 18% VAT.
 * subtotal = perPlot × plots; vat = 18% of subtotal; total = subtotal + vat.
 */
export function computeApplicationFee(
  plotCount: number,
  perPlot: number = DEFAULT_PER_PLOT_FEE_USD,
  currency: string = "USD",
): ApplicationFee {
  const count = Math.max(0, Math.trunc(plotCount));
  const subtotal = money(perPlot * count);
  const vat = money(subtotal * EOI_VAT_RATE);
  const total = money(subtotal + vat);
  return { currency, plotCount: count, perPlot, subtotal, vatRate: EOI_VAT_RATE, vat, total };
}

/** "USD 3,540.00" */
export function formatMoney(amount: number, currency: string = "USD"): string {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * One row of the finance queue — submitted application + fee + payment state,
 * plus the full applicant/company block. The extra identity fields are not shown
 * in the table (it would be unreadable); they are here because finance exports
 * the queue to CSV and raises invoices from that export, which needs the billed
 * party in full — registered address, TIN, registration numbers and contacts.
 */
export type FinanceRow = {
  paymentId: string | null;
  applicationId: string;
  reference: string | null;
  status: string;
  applicantName: string | null;
  applicantDesignation: string | null;
  applicantPhone: string | null;
  company: string | null;
  tradingName: string | null;
  registrationNumber: string | null;
  ursbRegistrationNumber: string | null;
  companyType: string | null;
  businessSector: string | null;
  countryOfIncorporation: string | null;
  address: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  email: string | null;
  tin: string | null;
  phone: string | null;
  plotCount: number;
  /** Plot names as applied for, e.g. "P-12, P-13" — what the invoice itemises. */
  plotNames: string[];
  currency: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentStatus: string | null;
  invoiceStatus: string;
  invoiceSentAt: string | null;
  hasReceipt: boolean;
  /** Bank transfer reference the investor quoted, for reconciliation. */
  transferRef: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  submittedAt: string | null;
};

// --- Invoice readiness -------------------------------------------------------

/**
 * What must be true before a fee invoice can be raised. An invoice is a tax
 * document billed per plot, so it needs the plots it is charging for and the
 * billing identity that goes on its face — the company's TIN and its registered
 * address. Registration collects neither reliably, so both are self-serviceable
 * from the portal's Settings page.
 */
export type InvoiceBlockerCode = "NO_PLOTS" | "NO_TIN" | "NO_ADDRESS";

export type InvoiceBlocker = {
  code: InvoiceBlockerCode;
  /** Investor-facing sentence, usable on its own. */
  message: string;
  /** Where the investor fixes it — "plots" (the EOI plot picker) or "settings". */
  fix: "plots" | "settings";
};

export type InvoiceReadinessInput = {
  plotCount: number;
  tin?: string | null;
  address?: string | null;
};

/**
 * The single invoice-readiness gate — read by the API before it creates or
 * refreshes a `Payment`, and by the portal so the button an investor sees and
 * what the API accepts cannot drift. Pure; order is the order to fix them in.
 */
export function invoiceBlockers(input: InvoiceReadinessInput): InvoiceBlocker[] {
  const blockers: InvoiceBlocker[] = [];
  if (!(input.plotCount > 0)) {
    blockers.push({
      code: "NO_PLOTS",
      message: "Select at least one plot — the fee is charged per plot.",
      fix: "plots",
    });
  }
  if (!input.tin?.trim()) {
    blockers.push({
      code: "NO_TIN",
      message: "Add your company TIN in Settings — an invoice is a tax document.",
      fix: "settings",
    });
  }
  if (!input.address?.trim()) {
    blockers.push({
      code: "NO_ADDRESS",
      message: "Add your company's registered address in Settings — it is billed to.",
      fix: "settings",
    });
  }
  return blockers;
}

/** One sentence naming everything outstanding, for an API error message. */
export function invoiceBlockerMessage(blockers: InvoiceBlocker[]): string {
  if (blockers.length === 0) return "";
  return `Before generating an invoice: ${blockers.map((b) => b.message).join(" ")}`;
}
