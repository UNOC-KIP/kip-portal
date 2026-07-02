"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { homePathForRole } from "@/lib/rbac";

const NAV_LINKS = [
  { label: "About KIP",    href: "/#about" },
  { label: "Land Map",     href: "/land-map" },
  { label: "For Investors", href: "/for-investors" },
  { label: "FAQ",          href: "/faq" },
];

/**
 * Floating, sticky site header.
 *
 * Auth-aware: shows role-appropriate CTA for signed-in users so clicking
 * "Apply Now" while already authenticated doesn't bounce them to /console.
 * Falls back to "Log in" + "Apply Now" for unauthenticated visitors.
 *
 * `bg` controls the strip behind the sticky bar (the bar itself is always black).
 */
export function SiteNav({ bg = "transparent" }: { bg?: "gold" | "white" | "transparent" }) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAuthed = status === "authenticated";
  const isLoading = status === "loading";

  const bgClass = bg === "gold" ? "bg-kip-gold" : bg === "white" ? "bg-white" : "";

  return (
    <header className={`sticky top-0 z-50 ${bgClass} px-[100px] pt-[5px] pb-[5px]`}>
      <div className="bg-black shadow-md">
        <div className="mx-auto flex h-16 max-w-[1343px] items-center justify-between px-8">
          <Link href="/">
            <Image src="/unoc-logo.svg" alt="UNOC" width={110} height={32} className="mb-5" priority />
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-white/70 md:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="transition hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right-side CTA — changes based on auth state */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded-[4px] bg-white/10" />
            ) : isAuthed ? (
              <>
                <Link
                  href={homePathForRole(role)}
                  className="rounded-[4px] border border-white/30 px-5 py-2 text-[13px] font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                >
                  {role === "INVESTOR" ? "My Dashboard" : "Console"}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-[4px] bg-kip-gold px-5 py-2 text-[13px] font-bold text-black transition hover:brightness-105"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-[4px] border border-white/30 px-5 py-2 text-[13px] font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                >
                  Log in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-[4px] bg-kip-gold px-5 py-2 text-[13px] font-bold text-black transition hover:brightness-105"
                >
                  Apply Now
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
