import Link from "next/link";
import { Download, FileText, BookOpen, ClipboardList, MapPin, Shield, ExternalLink } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

type ResourceItem = {
  icon: React.ElementType;
  title: string;
  desc: string;
  meta: string;
  action: { label: string; href: string; download?: string; external?: boolean } | { label: string; comingSoon: true };
};

const RESOURCES: { category: string; items: ResourceItem[] }[] = [
  {
    category: "Maps & Plans",
    items: [
      {
        icon: MapPin, title: "KIP Plot Allocation Map",
        desc: "Official plot layout for the Kabalega Industrial Park, showing all six land-use zones and available plots.",
        meta: "PDF · Official · 2026",
        action: { label: "Download PDF", href: "/kip-plot-map.pdf", download: "KIP-Plot-Allocation-Map-Phase2.pdf" },
      },
    ],
  },
  {
    category: "Application Guides",
    items: [
      { icon: BookOpen,    title: "EOI Applicant Guide",       desc: "Step-by-step guide for completing your Expression of Interest, including section-by-section instructions and tips.", meta: "PDF · Coming soon", action: { label: "Coming Soon", comingSoon: true } },
      { icon: ClipboardList, title: "Pre-Application Checklist", desc: "A checklist of documents and information you should have ready before starting your EOI to avoid delays.",              meta: "PDF · Coming soon", action: { label: "Coming Soon", comingSoon: true } },
    ],
  },
  {
    category: "Investment Materials",
    items: [
      { icon: FileText, title: "KIP Investment Brochure",  desc: "Overview of investment opportunities, infrastructure, incentives, and the allocation process at the Kabalega Industrial Park.", meta: "PDF · Coming soon", action: { label: "Coming Soon", comingSoon: true } },
      { icon: Shield,   title: "Land Allocation Policy",  desc: "The formal policy governing land allocation at KIP, including criteria, lease terms, renewal conditions, and investor obligations.", meta: "PDF · Coming soon", action: { label: "Coming Soon", comingSoon: true } },
    ],
  },
  {
    category: "Legal & Compliance",
    items: [
      { icon: Shield,   title: "National Content Framework",             desc: "Uganda's national content requirements applicable to KIP investors, covering local employment, procurement, and skills transfer.", meta: "External link", action: { label: "View on UIA Website", href: "https://www.ugandainvest.go.ug", external: true } },
      { icon: FileText, title: "Uganda Investment Authority — Incentives", desc: "Full breakdown of tax holidays, customs exemptions, and other incentives available to registered UIA investors at industrial parks.", meta: "External link", action: { label: "View on UIA Website", href: "https://www.ugandainvest.go.ug", external: true } },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Downloads
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            Investor<br />
            <span className="text-kip-red">Resources.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] font-medium leading-relaxed text-black/75">
            Download maps, application guides, and policy documents to support your KIP investment decision.
          </p>
        </div>
      </div>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="space-y-12">
            {RESOURCES.map(({ category, items }) => (
              <div key={category}>
                <h2 className="mb-5 text-[13px] font-bold uppercase tracking-widest text-black/55">{category}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map(({ icon: Icon, title, desc, meta, action }) => {
                    const isComingSoon = "comingSoon" in action;
                    const isExternal = !isComingSoon && "external" in action && action.external;
                    const isDownload = !isComingSoon && "download" in action;

                    return (
                      <div key={title} className={`flex gap-5 rounded-[5px] border border-black/8 bg-white p-6 ${isComingSoon ? "opacity-60" : ""}`}>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] bg-kip-gold/20">
                          <Icon size={20} className="text-black/60" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <h3 className="text-[14px] font-bold text-black">{title}</h3>
                          <p className="mt-1 text-[12px] text-black/60">{meta}</p>
                          <p className="mt-2 flex-1 text-[13px] leading-relaxed text-black/70">{desc}</p>
                          <div className="mt-4">
                            {isComingSoon ? (
                              <span className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1 text-[12px] font-semibold text-black/40">Coming Soon</span>
                            ) : isDownload ? (
                              <a href={(action as { href: string; download: string }).href} download={(action as { download: string }).download}
                                className="inline-flex items-center gap-1.5 rounded-[4px] bg-kip-red px-4 py-2 text-[13px] font-bold text-white transition hover:brightness-110">
                                <Download size={13} /> {action.label}
                              </a>
                            ) : isExternal ? (
                              <a href={(action as { href: string }).href} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-kip-red transition hover:underline">
                                {action.label} <ExternalLink size={12} />
                              </a>
                            ) : (
                              <Link href={(action as { href: string }).href} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-kip-red transition hover:underline">
                                {action.label}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-[5px] border border-black/8 bg-white px-8 py-7">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-[14px] font-bold text-black">Can&apos;t find what you need?</p>
                <p className="mt-1 text-[13px] text-black/65">Contact our investor facilitation desk and we&apos;ll send you the documents you require.</p>
              </div>
              <Link href="/contact" className="shrink-0 rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
