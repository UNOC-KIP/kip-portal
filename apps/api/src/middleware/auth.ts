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
const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "kip-admin.session-token",
  "__Secure-kip-admin.session-token",
  "kip-investor.session-token",
  "__Secure-kip-investor.session-token",
];

function extractToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      if (SESSION_COOKIE_NAMES.includes(name)) {
        return decodeURIComponent(part.slice(eq + 1).trim());
      }
    }
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
