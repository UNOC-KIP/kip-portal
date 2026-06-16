import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { allowedRolesForPath, homePathForRole, roleSatisfies } from "@/lib/rbac";

const AUTH_PAGES = ["/sign-in", "/sign-up"];

/**
 * Edge RBAC gate. Runs before every matched route and enforces the policy in
 * `lib/rbac.ts`. There is deliberately NO global auth-bypass flag — server
 * components re-check via `rbac-server.ts` as defense in depth.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role;

  // Authenticated users should never sit on the sign-in/up pages.
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (token) return NextResponse.redirect(new URL(homePathForRole(role), req.url));
    return NextResponse.next();
  }

  const policy = allowedRolesForPath(pathname);
  if (policy === null) return NextResponse.next(); // public route

  // Authentication required for every access-controlled route.
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Authorization: wrong role → bounce to that role's own home (never forbidden).
  if (!roleSatisfies(policy, role)) {
    return NextResponse.redirect(new URL(homePathForRole(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sign-in",
    "/sign-up",
    "/launch",
    "/unauthorized",
    "/dashboard/:path*",
    "/console/:path*",
  ],
};
