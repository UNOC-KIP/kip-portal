import type { RequestHandler } from "express";
import type { UserRole } from "@kip/shared";
import { Forbidden, Unauthorized } from "../errors.js";

/**
 * Stub auth middleware.
 * v1 plan: Next.js web sends an Authorization header with a session-derived
 * token (NextAuth JWT) that we verify here. Until that's wired, we read
 * x-debug-user-id + x-debug-role headers in development.
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

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (process.env.NODE_ENV === "development") {
    const id = req.header("x-debug-user-id");
    const role = req.header("x-debug-role") as UserRole | undefined;
    if (id && role) {
      req.user = { id, role };
      return next();
    }
  }

  // TODO: verify NextAuth session token
  return next(Unauthorized());
};

export const requireRole =
  (...allowed: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(Unauthorized());
    if (!allowed.includes(req.user.role)) return next(Forbidden());
    return next();
  };
