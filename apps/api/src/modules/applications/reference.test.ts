import { describe, it, expect } from "vitest";
import { formatReference, parseReference } from "@kip/shared";

describe("formatReference", () => {
  it("formats KIP-EOI-YYYY-NNNN, zero-padded", () => {
    expect(formatReference(2026, 1)).toBe("KIP-EOI-2026-0001");
    expect(formatReference(2026, 42)).toBe("KIP-EOI-2026-0042");
    expect(formatReference(2026, 9999)).toBe("KIP-EOI-2026-9999");
  });
  it("does not truncate sequences past 9999", () => {
    expect(formatReference(2026, 12345)).toBe("KIP-EOI-2026-12345");
  });
  it("rejects invalid year/sequence", () => {
    expect(() => formatReference(1999, 1)).toThrow();
    expect(() => formatReference(2026, 0)).toThrow();
    expect(() => formatReference(2026, -1)).toThrow();
    expect(() => formatReference(2026.5, 1)).toThrow();
  });
});

describe("parseReference", () => {
  it("round-trips with formatReference", () => {
    expect(parseReference("KIP-EOI-2026-0001")).toEqual({ year: 2026, seq: 1 });
    expect(parseReference(formatReference(2026, 314))).toEqual({ year: 2026, seq: 314 });
  });
  it("returns null for malformed references", () => {
    expect(parseReference("KIP-2026-0001")).toBeNull();
    expect(parseReference("KIP-EOI-2026-01")).toBeNull();
    expect(parseReference("nope")).toBeNull();
  });
});
