/**
 * Server-side RBAC guards — defense in depth behind the middleware.
 */
import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { PORTAL_WORKSPACE_ROLES, homePathForRole, type Role } from "./rbac";

/**
 * Require an authenticated user whose role is in `allowed`.
 * - Not signed in → `/sign-in`.
 * - Signed in but wrong role → that role's own home.
 */
export async function requireRole(allowed: readonly Role[]) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || !role) redirect("/sign-in");
  if (!allowed.includes(role)) redirect(homePathForRole(role));
  return { session, role };
}

/**
 * Require a role that has a workspace on this portal — INVESTOR, or a preview
 * role (ADMIN) driving the EOI journey. Returns the role so a layout can render
 * the preview banner without a second session read.
 */
export async function requirePortalWorkspace() {
  return requireRole(PORTAL_WORKSPACE_ROLES);
}
