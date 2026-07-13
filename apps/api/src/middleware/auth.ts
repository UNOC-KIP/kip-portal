import type { Request, RequestHandler } from "express";
import { decode } from "next-auth/jwt";
import type { UserRole } from "@kip/shared";
import { env } from "../env.js";
import { Forbidden, Unauthorized } from "../errors.js";

/**
 * Verifies the NextAuth session JWT minted by the web app and attaches the
 * authenticated user to the request. The token may arrive either as
 * `Authorization: Bearer <token>` (server-to-server calls from the web's API
 * client — preferred) or as the NextAuth session cookie (if cookies are
 * forwarded). Verification uses `NEXTAUTH_SECRET`, shared with the web app.
 *
 * There is deliberately NO dev header bypass — a global auth-skip is a leak risk
 * on a role-segregated platform.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

// Accept the NextAuth default names (local dev / older builds) plus the
// per-app names the web + portal set in production so the cookie can be shared
// across the *.kip.unoc.com subdomains (see COOKIE_DOMAIN in each app's auth.ts).
const ADMIN_COOKIES = ["kip-admin.session-token", "__Secure-kip-admin.session-token"];
const INVESTOR_COOKIES = ["kip-investor.session-token", "__Secure-kip-investor.session-token"];
const DEFAULT_COOKIES = ["next-auth.session-token", "__Secure-next-auth.session-token"];
const SESSION_COOKIE_NAMES = [...ADMIN_COOKIES, ...INVESTOR_COOKIES, ...DEFAULT_COOKIES];

// The admin and investor session cookies coexist on the browser — on a shared
// host in dev (cookies ignore port) and on the shared parent domain in prod
// (Domain=.kip.unoc.com) — so a request can carry BOTH. Pick the cookie that
// belongs to the calling app by its Origin, otherwise a user signed into both
// portals authenticates as whichever cookie happens to come first, executing
// e.g. an investor's write as the admin. Bearer tokens still win outright.
function cookiePreferenceForOrigin(origin: string | undefined): string[] {
  if (origin && origin === env.PORTAL_PUBLIC_URL) {
    return [...INVESTOR_COOKIES, ...DEFAULT_COOKIES, ...ADMIN_COOKIES];
  }
  if (origin && origin === env.WEB_PUBLIC_URL) {
    return [...ADMIN_COOKIES, ...DEFAULT_COOKIES, ...INVESTOR_COOKIES];
  }
  return SESSION_COOKIE_NAMES;
}

function extractToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const jar: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (SESSION_COOKIE_NAMES.includes(name)) {
      jar[name] = decodeURIComponent(part.slice(eq + 1).trim());
    }
  }

  for (const name of cookiePreferenceForOrigin(req.header("origin") ?? undefined)) {
    if (jar[name]) return jar[name]!;
  }
  return null;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return next(Unauthorized("Missing session token"));

    const payload = await decode({ token, secret: env.NEXTAUTH_SECRET });
    const id = payload?.id ?? payload?.sub;
    const role = payload?.role;
    if (!id || !role) return next(Unauthorized("Invalid session"));

    req.user = { id: String(id), role: role as UserRole };
    return next();
  } catch {
    return next(Unauthorized("Invalid session token"));
  }
};

export const requireRole =
  (...allowed: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(Unauthorized());
    if (!allowed.includes(req.user.role)) return next(Forbidden());
    return next();
  };
