"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { homePathForRole } from "@/lib/rbac";

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:4002";

const NAV_LINKS = [
  { label: "About KIP",    href: `${PORTAL_URL}/about` },
  { label: "Land Map",     href: "/land-map" },
  { label: "For Investors", href: "/for-investors" },
  { label: "FAQ",          href: "/faq" },
];

/**
 * Floating, sticky site header.
 *
 * Auth-aware: shows role-appropriate CTA for signed-in users so clicking
 * "Create Account" while already authenticated doesn't bounce them to /console.
 * Falls back to "Log in" + "Create Account" for unauthenticated visitors.
 *
 * `bg` controls the strip behind the sticky bar (the bar itself is always black).
 */
export function SiteNav({ bg = "transparent" }: { bg?: "gold" | "white" | "transparent" }) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAuthed = status === "authenticated";
  const isLoading = status === "loading";
  const [menuOpen, setMenuOpen] = useState(false);

  const bgClass = bg === "gold" ? "bg-kip-gold" : bg === "white" ? "bg-white" : "";

  return (
    <header className={`sticky top-0 z-50 ${bgClass} px-3 sm:px-10 lg:px-[100px] pt-[5px] pb-[5px]`}>
      <div className="bg-black shadow-md">
        <div className="mx-auto flex h-16 max-w-[1343px] items-center justify-between gap-2 px-3 sm:px-8">
          <Link href="/" className="shrink-0">
            <Image src="/unoc-logo.png" alt="UNOC" width={110} height={32} className="mb-5" priority />
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-white/70 md:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="transition hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right-side CTA — changes based on auth state */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded-[4px] bg-white/10" />
            ) : isAuthed ? (
              <>
                <Link
                  href={homePathForRole(role)}
                  className="rounded-[4px] border border-white/30 px-3 py-2 text-[13px] font-semibold text-white transition hover:border-white hover:bg-white hover:text-black sm:px-5"
                >
                  {role === "INVESTOR" ? "My Dashboard" : "Console"}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-[4px] bg-kip-gold px-3 py-2 text-[13px] font-bold text-black transition hover:brightness-105 sm:px-5"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-[4px] border border-white/30 px-3 py-2 text-[13px] font-semibold text-white transition hover:border-white hover:bg-white hover:text-black sm:px-5"
                >
                  Log in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-[4px] bg-kip-gold px-3 py-2 text-[13px] font-bold text-black transition hover:brightness-105 sm:px-5"
                >
                  Create Account
                </Link>
              </>
            )}

            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] text-white/80 transition hover:bg-white/10 hover:text-white md:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav links */}
        {menuOpen && (
          <nav className="border-t border-white/10 px-3 py-2 md:hidden">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-[4px] px-3 py-2.5 text-[14px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
