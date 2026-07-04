/**
 * Investor-portal RBAC policy — pure and edge-safe.
 * No `next-auth`, no `@kip/db`, no server-only imports.
 */
import { UserRole } from "@kip/shared";

export type Role = string;

export const INVESTOR_ONLY = [UserRole.INVESTOR] as const;

/**
 * Where the investor goes after login. Only INVESTOR has a workspace here;
 * everything else falls back to sign-in (staff blocked at authorize level).
 */
export function homePathForRole(role: Role | undefined | null): string {
  if (role === UserRole.INVESTOR) return "/dashboard";
  return "/sign-in";
}

/** `"any"` = any authenticated role; `string[]` = those roles; `null` = public. */
export type RolePolicy = readonly Role[] | "any" | null;

const ROUTE_POLICY: { prefix: string; policy: RolePolicy }[] = [
  { prefix: "/dashboard",    policy: INVESTOR_ONLY as readonly string[] },
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
