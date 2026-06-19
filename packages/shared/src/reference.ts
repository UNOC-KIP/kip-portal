/**
 * Application reference numbers: `KIP-EOI-YYYY-NNNN`.
 *
 * Assigned once, at the SUBMITTED transition, from the active
 * ApplicationWindow's atomically-incremented `sequenceCounter` (see the API's
 * applications service). Pure + framework-free so it can be shared and tested.
 */

export const REFERENCE_PREFIX = "KIP-EOI";

const REFERENCE_RE = /^KIP-EOI-(\d{4})-(\d{4,})$/;

/** Build a reference. `year` is the window's year, `seq` its 1-based counter. */
export function formatReference(year: number, seq: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error(`Invalid reference year: ${year}`);
  }
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Invalid reference sequence: ${seq}`);
  }
  return `${REFERENCE_PREFIX}-${year}-${String(seq).padStart(4, "0")}`;
}

/** Parse a reference back into its parts, or `null` if malformed. */
export function parseReference(ref: string): { year: number; seq: number } | null {
  const m = REFERENCE_RE.exec(ref);
  if (!m) return null;
  return { year: Number(m[1]), seq: Number(m[2]) };
}
