/**
 * Server-side RBAC guards — defense in depth behind the middleware.
 *
 * Even though `middleware.ts` enforces the same policy at the edge, every
 * sensitive server component calls one of these so a misconfigured matcher or a
 * future bypass can never leak data. Server-only (uses `getServerSession` +
 * `redirect`); do NOT import from middleware (use `./rbac` there instead).
 */
import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { STAFF_ROLES, homePathForRole, type Role } from "./rbac";

/**
 * Require an authenticated user whose role is in `allowed`.
 * - Not signed in → `/sign-in`.
 * - Signed in but wrong role → that role's own home (never a forbidden page).
 * Returns the resolved `{ session, role }` for convenience.
 */
export async function requireRole(allowed: readonly Role[]) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || !role) redirect("/sign-in");
  if (!allowed.includes(role)) redirect(homePathForRole(role));
  return { session, role };
}

/** Any internal staff member (blocks investors / unauthenticated). */
export async function requireStaff() {
  return requireRole(STAFF_ROLES);
}
