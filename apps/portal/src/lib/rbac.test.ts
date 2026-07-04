import { describe, it, expect } from "vitest";
import { homePathForRole, allowedRolesForPath, roleSatisfies, INVESTOR_ONLY } from "./rbac";

const ALL_ROLES = ["INVESTOR", "ADMIN", "TC_MEMBER", "TC_CHAIR", "LAC_MEMBER", "EXCO_MEMBER"];

describe("homePathForRole", () => {
  it("routes INVESTOR to /dashboard", () => {
    expect(homePathForRole("INVESTOR")).toBe("/dashboard");
  });
  it("sends all staff and unknown roles to sign-in", () => {
    for (const role of ["ADMIN", "TC_MEMBER", "TC_CHAIR", "LAC_MEMBER", "EXCO_MEMBER"]) {
      expect(homePathForRole(role)).toBe("/sign-in");
    }
    expect(homePathForRole(undefined)).toBe("/sign-in");
    expect(homePathForRole(null)).toBe("/sign-in");
  });
});

describe("allowedRolesForPath", () => {
  it("gates /dashboard to INVESTOR only", () => {
    expect(allowedRolesForPath("/dashboard")).toBe(INVESTOR_ONLY);
    expect(allowedRolesForPath("/dashboard/eoi/1")).toBe(INVESTOR_ONLY);
    expect(allowedRolesForPath("/dashboard/payment/bank")).toBe(INVESTOR_ONLY);
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
    for (const role of ["ADMIN", "TC_MEMBER", "TC_CHAIR", "LAC_MEMBER", "EXCO_MEMBER"]) {
      expect(roleSatisfies(INVESTOR_ONLY, role)).toBe(false);
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
  it("INVESTOR home page is accessible to INVESTOR", () => {
    const home = homePathForRole("INVESTOR");
    const policy = allowedRolesForPath(home);
    expect(roleSatisfies(policy, "INVESTOR")).toBe(true);
  });
  it("staff home (/sign-in) is public", () => {
    for (const role of ["ADMIN", "TC_MEMBER", "TC_CHAIR", "LAC_MEMBER", "EXCO_MEMBER"]) {
      const home = homePathForRole(role);
      expect(home).toBe("/sign-in");
      expect(allowedRolesForPath(home)).toBeNull();
    }
  });
});
