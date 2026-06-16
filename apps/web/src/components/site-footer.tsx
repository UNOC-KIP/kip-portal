import Image from "next/image";
import Link from "next/link";

const FOOTER_COLS = [
  { title: "Our Company", links: ["About KIP", "Contact Us"] },
  { title: "Platform",    links: ["How it works", "For Investors"] },
  { title: "Support",     links: ["FAQ", "Help Centre", "Privacy Policy", "Terms of Service"] },
];

export function SiteFooter() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-[1343px] px-[100px] py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Image src="/unoc-logo.svg" alt="UNOC" width={100} height={29} className="mb-5" />
            <p className="text-[12px] leading-relaxed text-white/45">
              Uganda&apos;s flagship petroleum industrial park investment portal.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-[13px] font-semibold">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-[13px] text-white/50 transition hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-[11px] text-white/35">
          © {new Date().getFullYear()} Uganda National Oil Company Limited · Uganda Refinery Holding Company
        </div>
      </div>
    </footer>
  );
}
