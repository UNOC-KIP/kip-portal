import { describe, expect, it } from "vitest";
import { invoiceBlockers, invoiceBlockerMessage } from "@kip/shared";

/**
 * The invoice-readiness gate is shared by the portal's "Generate invoice"
 * buttons and the API's `requestInvoice`, so these cases pin what both allow.
 */
describe("invoiceBlockers", () => {
  const ready = { plotCount: 2, tin: "1000123456", address: "Plot 1, Kampala" };

  it("passes a complete billing profile with plots", () => {
    expect(invoiceBlockers(ready)).toEqual([]);
  });

  it("blocks when no plot has been selected", () => {
    expect(invoiceBlockers({ ...ready, plotCount: 0 }).map((b) => b.code)).toEqual([
      "NO_PLOTS",
    ]);
  });

  it("blocks a missing or blank TIN", () => {
    expect(invoiceBlockers({ ...ready, tin: null }).map((b) => b.code)).toEqual(["NO_TIN"]);
    expect(invoiceBlockers({ ...ready, tin: "   " }).map((b) => b.code)).toEqual(["NO_TIN"]);
  });

  it("blocks a missing registered address", () => {
    expect(invoiceBlockers({ ...ready, address: null }).map((b) => b.code)).toEqual([
      "NO_ADDRESS",
    ]);
  });

  it("reports every outstanding requirement at once", () => {
    const blockers = invoiceBlockers({ plotCount: 0, tin: null, address: "" });
    expect(blockers.map((b) => b.code)).toEqual(["NO_PLOTS", "NO_TIN", "NO_ADDRESS"]);
    expect(blockers.filter((b) => b.fix === "settings")).toHaveLength(2);
  });

  it("names each requirement in the API error message", () => {
    const message = invoiceBlockerMessage(invoiceBlockers({ plotCount: 0, tin: null, address: null }));
    expect(message).toMatch(/plot/i);
    expect(message).toMatch(/TIN/);
    expect(message).toMatch(/address/i);
    expect(invoiceBlockerMessage([])).toBe("");
  });
});
