/**
 * Investor-portal RBAC policy — pure and edge-safe.
 * No `next-auth`, no `@kip/db`, no server-only imports.
 */
import { UserRole, EOI_PREVIEW_ROLES, canPreviewEoi } from "@kip/shared";

export type Role = string;

export const INVESTOR_ONLY = [UserRole.INVESTOR] as const;

/**
 * Roles that get an investor workspace on this portal: real investors, plus the
 * preview roles (ADMIN) driving the EOI journey for testing. Every other staff
 * role is still blocked at the `authorize` level and never reaches a policy.
 */
export const PORTAL_WORKSPACE_ROLES: readonly Role[] = [
  UserRole.INVESTOR,
  ...EOI_PREVIEW_ROLES,
];

/**
 * Where a signed-in user goes after login. INVESTOR and the preview roles have
 * a workspace here; everything else falls back to sign-in.
 */
export function homePathForRole(role: Role | undefined | null): string {
  if (role === UserRole.INVESTOR || canPreviewEoi(role)) return "/dashboard";
  return "/sign-in";
}

/** `"any"` = any authenticated role; `string[]` = those roles; `null` = public. */
export type RolePolicy = readonly Role[] | "any" | null;

const ROUTE_POLICY: { prefix: string; policy: RolePolicy }[] = [
  { prefix: "/dashboard",    policy: PORTAL_WORKSPACE_ROLES },
  { prefix: "/launch",       policy: "any" },
  { prefix: "/unauthorized", policy: "any" },
];

/** Policy for a path, or `null` if the path is public. */
export function allowedRolesForPath(pathname: string): RolePolicy {
  let match: RolePolicy = null;
  let matchedLen = -1;
  for (const { prefix, policy } of ROUTE_POLICY) {
    const hit = pathname === prefix || pathname.startsWith(prefix + "/");
    if (hit && prefix.length > matchedLen) {
      match = policy;
      matchedLen = prefix.length;
    }
  }
  return match;
}

/** Does this role satisfy the given policy? */
export function roleSatisfies(policy: RolePolicy, role: Role | undefined | null): boolean {
  if (policy === null || policy === "any") return true;
  return role != null && policy.includes(role);
}
