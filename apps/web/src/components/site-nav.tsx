import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { label: "About KIP", href: "/#about" },
  { label: "Land Map",  href: "#" },
  { label: "Policy",    href: "#" },
  { label: "FAQ",       href: "#" },
];

/**
 * Floating, sticky site header.
 *
 * The black nav bar is `sticky top-0` so it stays accessible as the user scrolls
 * any page it appears on. The backing strip is transparent by default, so only
 * the solid black bar shows — it floats over the gold hero zones and over white
 * content alike.
 */
export function SiteNav({ bg = "transparent" }: { bg?: "gold" | "white" | "transparent" }) {
  const bgClass = bg === "gold" ? "bg-kip-gold" : bg === "white" ? "bg-white" : "";

  return (
    <header className={`sticky top-0 z-50 ${bgClass} px-[100px] pt-[5px] pb-[5px]`}>
      <div className="bg-black shadow-md">
        <div className="mx-auto flex h-16 max-w-[1343px] items-center justify-between px-8">
          <Link href="/">
            <Image src="/unoc-logo.svg" alt="UNOC" width={110} height={32} priority />
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-white/70 md:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="transition hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </div>
    </header>
  );
}
