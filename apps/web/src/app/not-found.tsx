import Link from "next/link";
import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* Simple nav */}
      <header className="bg-black px-5 sm:px-10 lg:px-[100px] py-4">
        <div className="mx-auto flex h-16 max-w-[1343px] items-center">
          <Link href="/">
            <Image src="/unoc-logo.svg" alt="UNOC" width={110} height={32} />
          </Link>
        </div>
      </header>

      {/* 404 content */}
      <main className="flex flex-1 flex-col items-center justify-center bg-kip-gold px-8 py-24 text-center">
        <p className="text-[120px] font-black leading-none text-black/10">404</p>
        <h1 className="mt-4 text-[26px] sm:text-[36px] font-extrabold leading-tight text-black">
          Page not <span className="text-kip-red">found.</span>
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-black/55">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110"
          >
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="rounded-[4px] border-2 border-black/70 px-7 py-3 text-[14px] font-bold text-black transition hover:bg-black/10"
          >
            Contact Us
          </Link>
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-6 text-[13px]">
          {[
            { label: "How it Works", href: "/how-it-works" },
            { label: "For Investors", href: "/for-investors" },
            { label: "Land Map", href: "/land-map" },
            { label: "FAQ", href: "/faq" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} className="font-semibold text-black/50 transition hover:text-black underline underline-offset-4">
              {label}
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
