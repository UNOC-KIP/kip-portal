/**
 * Client-side base URL for the Express API.
 *
 * `NEXT_PUBLIC_API_URL` is inlined into the browser bundle at BUILD time (see
 * apps/web/Dockerfile build args, and the deploy workflow's NEXT_PUBLIC_API_URL
 * variable), so it must be present when `next build` runs. When it is absent we
 * must NOT silently fall back to localhost in a deployed browser — that baked a
 * `http://localhost:4001` URL into production bundles and every admin action
 * failed with a connection error. Instead we use the local dev API only when the
 * page is actually served from localhost, and otherwise throw a clear,
 * actionable error that each caller already surfaces in its error UI.
 */
const CONFIGURED = process.env.NEXT_PUBLIC_API_URL;

const MISCONFIGURED_MESSAGE =
  "API URL is not configured for this deployment — the site was built without " +
  "NEXT_PUBLIC_API_URL, so admin actions cannot reach the API. Rebuild the web " +
  "app with NEXT_PUBLIC_API_URL set to the API origin.";

/** Resolve the API base URL, or throw a clear error if the build was misconfigured. */
export function apiBase(): string {
  if (CONFIGURED) return CONFIGURED.replace(/\/+$/, "");

  const isLocalBrowser =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (isLocalBrowser) return "http://localhost:4001";

  throw new Error(MISCONFIGURED_MESSAGE);
}

/** Build a full API URL for `path` (leading slash optional). */
export function apiUrl(path: string): string {
  return `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}
