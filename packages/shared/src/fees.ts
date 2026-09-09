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

/** One row of the finance queue — submitted application + fee + payment state. */
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
