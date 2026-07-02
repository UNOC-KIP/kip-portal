import { describe, it, expect } from "vitest";
import {
  homePathForRole,
  allowedRolesForPath,
  roleSatisfies,
  STAFF_ROLES,
  TC_ROLES,
  ADMIN_ONLY,
} from "./rbac";

const ALL_ROLES = [
  "INVESTOR",
  "ADMIN",
  "TC_MEMBER",
  "TC_CHAIR",
  "LAC_MEMBER",
  "EXCO_MEMBER",
];

describe("homePathForRole", () => {
  it("routes each role to its workspace", () => {
    // INVESTOR is served by apps/portal — home is an external URL
    expect(homePathForRole("INVESTOR")).toMatch(/localhost:4002|portal/);
    expect(homePathForRole("ADMIN")).toBe("/console");
    expect(homePathForRole("TC_MEMBER")).toBe("/console/tc/queue");
    expect(homePathForRole("TC_CHAIR")).toBe("/console/tc/queue");
    expect(homePathForRole("LAC_MEMBER")).toBe("/unauthorized");
    expect(homePathForRole("EXCO_MEMBER")).toBe("/unauthorized");
  });
  it("sends unknown/empty to sign-in", () => {
    expect(homePathForRole(undefined)).toBe("/sign-in");
    expect(homePathForRole("WAT")).toBe("/sign-in");
  });
});

describe("allowedRolesForPath", () => {
  it("matches the most specific prefix first", () => {
    expect(allowedRolesForPath("/console/tc/queue")).toBe(TC_ROLES);
    expect(allowedRolesForPath("/console/tc/KIP-EOI-2026-0001")).toBe(TC_ROLES);
    expect(allowedRolesForPath("/console")).toBe(ADMIN_ONLY);
    expect(allowedRolesForPath("/console/users")).toBe(ADMIN_ONLY);
    expect(allowedRolesForPath("/console/bank-transfers")).toBe(ADMIN_ONLY);
  });
  it("gates auth-only routes", () => {
    // /dashboard is no longer in apps/web — it lives in apps/portal
    expect(allowedRolesForPath("/dashboard/eoi/PRELIMINARY_INFO")).toBeNull();
    expect(allowedRolesForPath("/launch")).toBe("any");
    expect(allowedRolesForPath("/unauthorized")).toBe("any");
  });
  it("treats unlisted routes as public (null)", () => {
    expect(allowedRolesForPath("/about")).toBeNull();
    expect(allowedRolesForPath("/")).toBeNull();
  });
});

describe("roleSatisfies", () => {
  it("admin can enter the TC area; investors cannot enter admin", () => {
    expect(roleSatisfies(TC_ROLES, "ADMIN")).toBe(true);
    expect(roleSatisfies(ADMIN_ONLY, "INVESTOR")).toBe(false);
    expect(roleSatisfies(ADMIN_ONLY, "TC_MEMBER")).toBe(false);
  });
  it("'any' allows any role; null is public", () => {
    expect(roleSatisfies("any", "EXCO_MEMBER")).toBe(true);
    expect(roleSatisfies(null, undefined)).toBe(true);
  });
});

describe("no redirect loops (safety invariant)", () => {
  it("every staff role's home page is a page that role may actually access", () => {
    for (const role of ALL_ROLES) {
      if (role === "INVESTOR") {
        // INVESTOR home is an absolute URL in apps/portal — invariant doesn't apply here
        continue;
      }
      const home = homePathForRole(role);
      const policy = allowedRolesForPath(home);
      expect(
        roleSatisfies(policy, role),
        `${role} is redirected to ${home} but isn't allowed there`,
      ).toBe(true);
    }
  });
});

describe("role sets are consistent", () => {
  it("TC area and admin area both include ADMIN", () => {
    expect(TC_ROLES).toContain("ADMIN");
    expect(ADMIN_ONLY).toEqual(["ADMIN"]);
    expect(STAFF_ROLES).toContain("ADMIN");
    expect(STAFF_ROLES).not.toContain("INVESTOR");
  });
});
