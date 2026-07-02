import { describe, it, expect } from "vitest";
import { formatShortDate, formatDateTime, formatMoney, daysBetween } from "./format";

describe("formatShortDate", () => {
  it("renders a UTC date as 'D Mon YYYY'", () => {
    expect(formatShortDate("2026-02-14T10:30:00Z")).toBe("14 Feb 2026");
    expect(formatShortDate(new Date("2026-12-01T00:00:00Z"))).toBe("1 Dec 2026");
  });
  it("returns an em dash for null/invalid", () => {
    expect(formatShortDate(null)).toBe("—");
    expect(formatShortDate("not-a-date")).toBe("—");
    expect(formatShortDate(undefined)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("renders date and UTC time", () => {
    expect(formatDateTime("2026-02-12T14:05:00Z")).toBe("12 Feb 2026 · 14:05 UTC");
  });
  it("pads single-digit hours and minutes", () => {
    expect(formatDateTime("2026-02-12T04:09:00Z")).toBe("12 Feb 2026 · 04:09 UTC");
  });
});

describe("formatMoney", () => {
  it("formats DECIMAL strings and numbers with grouping, no decimals", () => {
    expect(formatMoney("1000.00", "USD")).toBe("USD 1,000");
    expect(formatMoney(3700000, "UGX")).toBe("UGX 3,700,000");
  });
  it("returns an em dash amount for null/invalid", () => {
    expect(formatMoney(null, "USD")).toBe("USD —");
    expect(formatMoney("abc", "USD")).toBe("USD —");
  });
});

describe("daysBetween", () => {
  it("counts whole days, floored and non-negative", () => {
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-04T00:00:00Z")).toBe(3);
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-04T23:00:00Z")).toBe(3);
    expect(daysBetween("2026-01-04T00:00:00Z", "2026-01-01T00:00:00Z")).toBe(0);
  });
});
