import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { allowedRolesForPath, homePathForRole, roleSatisfies } from "@/lib/rbac";

const AUTH_PAGES = ["/sign-in", "/sign-up"];

// Must match the custom session cookie name set in lib/auth.ts. getToken()
// otherwise defaults to NextAuth's name and can't find our renamed cookie, so
// every request looks unauthenticated → /dashboard redirect loop.
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const SESSION_COOKIE_NAME = `${useSecureCookies ? "__Secure-" : ""}kip-investor.session-token`;

/**
 * Edge RBAC gate. Investor portal only — no /console routes.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
  });
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

  // Authorization: wrong role → bounce to that role's own home.
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
  ],
};
