/**
 * Role-based access policy — the single source of truth for "who can see what".
 *
 * PURE and edge-safe: no `next-auth`, no `@kip/db`, no server-only imports, so
 * it can be used from middleware (edge runtime), from server components (via
 * `rbac-server.ts`), and from unit tests. Keep it that way — server concerns
 * live in `rbac-server.ts`.
 */
import { UserRole } from "@kip/shared";

export type Role = string;

export const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.TC_MEMBER,
  UserRole.TC_CHAIR,
  UserRole.LAC_MEMBER,
  UserRole.EXCO_MEMBER,
] as const;

/** Roles that can reach the TC review area. ADMIN can see everything. */
export const TC_ROLES = [UserRole.TC_MEMBER, UserRole.TC_CHAIR, UserRole.ADMIN] as const;

/** Admin-management area (full data reads, user/window/payment management). */
export const ADMIN_ONLY = [UserRole.ADMIN] as const;

/**
 * Where each role belongs after login / when redirected off a forbidden page.
 * MUST resolve to a path that role is actually allowed to reach (see
 * `allowedRolesForPath`) — otherwise middleware would loop. This is asserted in
 * the unit tests.
 *
 * INVESTOR routes live in apps/portal (port 4002). If an investor somehow
 * authenticates on this app they are redirected to the portal.
 *
 * LAC/ExCo have no dedicated workspace yet (Phase 3), so they land on the
 * neutral `/unauthorized` notice rather than seeing admin data.
 */
export function homePathForRole(role: Role | undefined | null): string {
  switch (role) {
    case UserRole.INVESTOR:
      return process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:4002";
    case UserRole.ADMIN:
      return "/console";
    case UserRole.TC_MEMBER:
    case UserRole.TC_CHAIR:
      return "/console/tc/queue";
    case UserRole.LAC_MEMBER:
    case UserRole.EXCO_MEMBER:
      return "/unauthorized";
    default:
      return "/sign-in";
  }
}

/** `"any"` = any authenticated role; `string[]` = those roles; `null` = public. */
export type RolePolicy = readonly Role[] | "any" | null;

// Longest-prefix wins, so more specific routes (/console/tc) must precede their
// parents (/console).
const ROUTE_POLICY: { prefix: string; policy: RolePolicy }[] = [
  { prefix: "/console/tc", policy: TC_ROLES },
  { prefix: "/console", policy: ADMIN_ONLY },
  { prefix: "/launch", policy: "any" },
  { prefix: "/unauthorized", policy: "any" },
];

/** Policy for a path, or `null` if the path is public (not access-controlled). */
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

/** Does this role satisfy the given policy? (auth already established.) */
export function roleSatisfies(policy: RolePolicy, role: Role | undefined | null): boolean {
  if (policy === null || policy === "any") return true;
  return role != null && policy.includes(role);
}
