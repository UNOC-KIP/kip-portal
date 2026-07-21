/**
 * Pure, dependency-free display formatters.
 *
 * Deterministic by design: dates are rendered in UTC with an explicit month
 * table and money uses a fixed `en-US` locale, so output never varies by the
 * server's timezone or locale. This keeps the formatters unit-testable without
 * mocking the environment. No `@kip/db` import — safe to import from tests.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const DASH = "—";

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Dec 2026" (UTC). Returns an em dash for null/invalid input. */
export function formatShortDate(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return DASH;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "12 Dec 2026 · 14:28 UTC". Returns an em dash for null/invalid input. */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return DASH;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatShortDate(d)} · ${hh}:${mm} UTC`;
}

/**
 * "USD 1,000" — money is whole-currency display only. `amount` may be a number
 * or the DECIMAL-as-string that pg returns. Rounded to whole units (RWF/UGX
 * have no minor unit in practice here; USD fee amounts are whole).
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string,
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n == null || !Number.isFinite(n)) return `${currency} ${DASH}`;
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

/**
 * "2026-07-21" (UTC) — a sortable, locale-free date key. Used by the report
 * filters for date-range comparison and day/week/month bucketing, so the client
 * never has to re-parse a display string. Empty string for null/invalid input.
 */
export function isoDate(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Whole days between two instants (floored, never negative). */
export function daysBetween(from: Date | string | number, to: Date | string | number): number {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}
