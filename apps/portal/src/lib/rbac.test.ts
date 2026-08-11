import { describe, it, expect } from "vitest";
import {
  homePathForRole,
  allowedRolesForPath,
  roleSatisfies,
  INVESTOR_ONLY,
  PORTAL_WORKSPACE_ROLES,
} from "./rbac";

const ALL_ROLES = ["INVESTOR", "ADMIN", "TC_MEMBER", "TC_CHAIR", "LAC_MEMBER", "EXCO_MEMBER"];
/** Staff with no workspace here — reviewers, who belong on the admin portal. */
const NON_WORKSPACE_STAFF = ["TC_MEMBER", "TC_CHAIR", "LAC_MEMBER", "EXCO_MEMBER"];

describe("homePathForRole", () => {
  it("routes INVESTOR to /dashboard", () => {
    expect(homePathForRole("INVESTOR")).toBe("/dashboard");
  });
  it("routes ADMIN to /dashboard for EOI preview", () => {
    expect(homePathForRole("ADMIN")).toBe("/dashboard");
  });
  it("sends reviewer staff and unknown roles to sign-in", () => {
    for (const role of NON_WORKSPACE_STAFF) {
      expect(homePathForRole(role)).toBe("/sign-in");
    }
    expect(homePathForRole(undefined)).toBe("/sign-in");
    expect(homePathForRole(null)).toBe("/sign-in");
  });
});

describe("allowedRolesForPath", () => {
  it("gates /dashboard to the portal workspace roles", () => {
    expect(allowedRolesForPath("/dashboard")).toBe(PORTAL_WORKSPACE_ROLES);
    expect(allowedRolesForPath("/dashboard/eoi/1")).toBe(PORTAL_WORKSPACE_ROLES);
    expect(allowedRolesForPath("/dashboard/payment/bank")).toBe(PORTAL_WORKSPACE_ROLES);
  });
  it("allows /launch and /unauthorized for any authenticated role", () => {
    expect(allowedRolesForPath("/launch")).toBe("any");
    expect(allowedRolesForPath("/unauthorized")).toBe("any");
  });
  it("treats unlisted routes as public (null)", () => {
    expect(allowedRolesForPath("/")).toBeNull();
    expect(allowedRolesForPath("/sign-in")).toBeNull();
    expect(allowedRolesForPath("/faq")).toBeNull();
  });
});

describe("roleSatisfies", () => {
  it("only INVESTOR satisfies INVESTOR_ONLY", () => {
    expect(roleSatisfies(INVESTOR_ONLY, "INVESTOR")).toBe(true);
    for (const role of ["ADMIN", ...NON_WORKSPACE_STAFF]) {
      expect(roleSatisfies(INVESTOR_ONLY, role)).toBe(false);
    }
  });
  it("INVESTOR and ADMIN satisfy the dashboard policy, reviewers do not", () => {
    expect(roleSatisfies(PORTAL_WORKSPACE_ROLES, "INVESTOR")).toBe(true);
    expect(roleSatisfies(PORTAL_WORKSPACE_ROLES, "ADMIN")).toBe(true);
    for (const role of NON_WORKSPACE_STAFF) {
      expect(roleSatisfies(PORTAL_WORKSPACE_ROLES, role)).toBe(false);
    }
  });
  it("'any' allows all roles; null is public", () => {
    for (const role of ALL_ROLES) {
      expect(roleSatisfies("any", role)).toBe(true);
    }
    expect(roleSatisfies(null, undefined)).toBe(true);
  });
});

describe("no redirect loops (safety invariant)", () => {
  it("every role's home page is accessible to that role", () => {
    for (const role of ["INVESTOR", "ADMIN"]) {
      const home = homePathForRole(role);
      expect(roleSatisfies(allowedRolesForPath(home), role)).toBe(true);
    }
  });
  it("reviewer-staff home (/sign-in) is public", () => {
    for (const role of NON_WORKSPACE_STAFF) {
      const home = homePathForRole(role);
      expect(home).toBe("/sign-in");
      expect(allowedRolesForPath(home)).toBeNull();
    }
  });
});
