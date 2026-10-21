/**
 * Bot defences for `POST /api/register`. Pure — no DB, no Next.js — so the
 * rules are unit-tested in `signup-guard.test.ts`.
 *
 * Why these exist: registration self-activates and immediately emails the
 * company name back to the address given. From 11 October 2026 a bot used
 * that to send link spam through the Support.Kip mailbox ("🔥 bonus …
 * https://bit.ly/…" as the company name, gmail "+N" aliases as recipients).
 */

/** A URL, a shortener or a bare `domain.tld/path` — never legitimate in a name. */
const LINK_PATTERN =
  /(https?:\/\/|www\.|bit\.ly|\.ly\/|t\.me\/|tinyurl|\b[a-z0-9-]+\.(com|net|org|xyz|top|ru|io|me|co|info|biz)\/)/i;

export function containsLink(value: string | undefined | null): boolean {
  return !!value && LINK_PATTERN.test(value);
}

/** Name of the hidden form field humans never fill and form-filling bots do. */
export const HONEYPOT_FIELD = "website";

/**
 * The client IP behind Caddy. Caddy overwrites X-Forwarded-For from untrusted
 * clients, but take the last hop anyway so a spoofed leading entry can't be
 * used to dodge the limit.
 */
export function clientIp(forwardedFor: string | null, realIp: string | null): string {
  const hops = (forwardedFor ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return hops[hops.length - 1] ?? realIp ?? "unknown";
}

/**
 * Fixed-window counter, in-memory — the portal runs as one process (same
 * trade-off as the RFP limiter in the API). `now` injected for tests.
 */
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function allow(key: string, now: number): boolean {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      // Opportunistic sweep so the map can't grow without bound under attack.
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}
