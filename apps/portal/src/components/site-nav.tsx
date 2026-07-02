"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const NAV_LINKS = [
  { label: "About KIP",    href: "/#about" },
  { label: "Land Map",     href: "/land-map" },
  { label: "For Investors", href: "/for-investors" },
  { label: "FAQ",          href: "/faq" },
];

export function SiteNav({ bg = "transparent" }: { bg?: "gold" | "white" | "transparent" }) {
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated";
  const isLoading = status === "loading";

  // suppress unused warning — session is used below indirectly via isAuthed
  void session;

  const bgClass = bg === "gold" ? "bg-kip-gold" : bg === "white" ? "bg-white" : "";

  return (
    <header className={`sticky top-0 z-50 ${bgClass} px-[100px] pt-[5px] pb-[5px]`}>
      <div className="bg-black shadow-md">
        <div className="mx-auto flex h-16 max-w-[1343px] items-center justify-between px-8">
          <Link href="/" className="rounded-[6px] bg-white px-3 py-2">
            <Image
              src="/unoc-kip-logo.png"
              alt="UNOC — Kabalega Petro-Based Industrial Park"
              width={150}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-white/70 md:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="transition hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded-[4px] bg-white/10" />
            ) : isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-[4px] border border-white/30 px-5 py-2 text-[13px] font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                >
                  My Dashboard
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
