import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  Zap, Truck, Shield, Globe, TreePine, Building2,
  CheckCircle2, ArrowRight, Percent, PackageOpen, BadgeDollarSign, Landmark,
} from "lucide-react";

const WHY_KIP = [
  {
    icon: Globe,
    title: "Strategic Location",
    body: "Situated in Hoima District, Western Uganda — adjacent to the East Africa Crude Oil Pipeline (EACOP) corridor and 2 km from Kabalega International Airport. Direct access to East African markets.",
  },
  {
    icon: Zap,
    title: "Ready Infrastructure",
    body: "Fully serviced plots with paved roads, high-voltage power (132 kV substation), treated water supply, and industrial wastewater treatment. Fibre connectivity to all zones.",
  },
  {
    icon: Shield,
    title: "Secure Tenure",
    body: "Investors receive long-term land leases (up to 49 years, renewable) directly from URHC, backed by the Uganda Investment Authority. Clear title and dispute resolution mechanisms in place.",
  },
  {
    icon: Truck,
    title: "Supply Chain Access",
    body: "On-site logistics hub, proximity to Lake Albert oil fields, and integration with the EACOP pipeline make KIP the ideal location for petroleum-linked manufacturing and services.",
  },
  {
    icon: TreePine,
    title: "Incentives & Support",
    body: "Uganda Investment Authority incentives include tax holidays, VAT exemptions on capital equipment, and 100% repatriation of profits. Dedicated investor facilitation desk at KIP.",
  },
  {
    icon: Building2,
    title: "Ecosystem of Sectors",
    body: "Planned zones cover heavy industry, light manufacturing, commercial logistics, research & innovation, and mixed-use — creating a fully integrated industrial ecosystem.",
  },
];

const LAND_CATEGORIES = [
  { category: "Heavy Industry",        minArea: "5 – 20 ha",   plots: 24, status: "Available", desc: "Refinery feedstock, petrochemicals, steel fabrication" },
  { category: "Light Industry",         minArea: "1 – 5 ha",    plots: 62, status: "Available", desc: "Packaging, food processing, assembly, light manufacturing" },
  { category: "Commercial / Logistics", minArea: "0.5 – 2 ha",  plots: 38, status: "Available", desc: "Warehousing, freight, cold storage, distribution" },
  { category: "Research & Innovation",  minArea: "0.5 – 1 ha",  plots: 14, status: "Limited",   desc: "Tech hubs, training facilities, energy R&D" },
  { category: "Mixed Use",              minArea: "2 – 8 ha",    plots: 10, status: "Reserved",  desc: "Retail, hospitality, commercial support services" },
];

const ELIGIBILITY = [
  "Legally incorporated company (foreign or Ugandan)",
  "Valid Certificate of Incorporation or equivalent",
  "Genuine investment intention in petroleum or related value chain",
  "Ability to pay the non-refundable USD 1,000 application fee",
  "Commitment to comply with Uganda's H3SE and national content requirements",
  "No conviction for financial crime in any jurisdiction in the past 5 years",
];

const STATS = [
  { value: "2,200",   unit: "ha",  label: "Total Park Area" },
  { value: "221",     unit: "",    label: "Serviced Plots" },
  { value: "USD 1B",  unit: "+",   label: "Target Investment" },
  { value: "49",      unit: "yr",  label: "Max Lease Term" },
];

export default function ForInvestorsPage() {
  return (
    <div className="min-h-screen font-sans">

      {/* Gold hero */}
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Investor Information
          </span>
          <h1 className="mt-4 text-[48px] font-extrabold leading-tight tracking-tight text-black">
            Why Invest in<br />
            <span className="text-kip-red">Kabalega?</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-black/60">
            Uganda&apos;s first petroleum-integrated industrial park offers serviced land,
            strong legal protections, and direct access to EACOP infrastructure.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/sign-up"
              className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110"
            >
              Apply Now
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-[4px] border-2 border-black/70 px-7 py-3 text-[14px] font-bold text-black transition hover:bg-black/10"
            >
              How it works
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <section className="border-b border-black/8 bg-white">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="grid grid-cols-2 gap-px bg-black/8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white px-8 py-10 text-center">
                <p className="text-[38px] font-extrabold leading-none text-black">
                  {s.value}<span className="text-kip-red">{s.unit}</span>
                </p>
                <p className="mt-2 text-[13px] text-black/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why KIP */}
      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="mb-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/60">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
              Advantages
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold text-black">
              Why choose <span className="text-kip-red">KIP?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {WHY_KIP.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[5px] border border-black/8 bg-white p-7">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/30">
                  <Icon size={20} className="text-black/70" />
                </div>
                <h3 className="mb-2 text-[15px] font-bold text-black">{title}</h3>
                <p className="text-[13px] leading-relaxed text-black/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Land categories */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="mb-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-ink-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/60">
              <span className="h-1.5 w-1.5 rounded-full bg-black" />
              Land Zones
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold text-black">Available Plot Categories</h2>
          </div>
          <div className="overflow-hidden rounded-[5px] border border-black/8">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-100">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Category</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Min Area</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Plots</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Typical Uses</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Status</th>
                </tr>
              </thead>
              <tbody>
                {LAND_CATEGORIES.map((row, i) => (
                  <tr key={row.category} className={`border-t border-black/5 ${i % 2 === 0 ? "bg-white" : "bg-ink-100/40"}`}>
                    <td className="px-5 py-4 text-[13px] font-semibold text-black">{row.category}</td>
                    <td className="px-5 py-4 text-[13px] text-black/55">{row.minArea}</td>
                    <td className="px-5 py-4 text-[13px] font-bold text-black">{row.plots}</td>
                    <td className="px-5 py-4 text-[13px] text-black/55">{row.desc}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        row.status === "Available" ? "bg-green-50 text-green-700" :
                        row.status === "Limited"   ? "bg-amber-50 text-amber-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Investment incentives */}
      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="mb-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/60">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />
              Investment Incentives
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold text-black">
              Incentives for KIP <span className="text-kip-red">investors.</span>
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-black/55">
              KIP investors operating through the Uganda Investment Authority benefit from a
              comprehensive package of fiscal and non-fiscal incentives under Ugandan law.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              {
                icon: Percent,
                title: "Corporate Income Tax Holiday",
                items: [
                  "10-year initial CIT holiday for investments above USD 50M",
                  "5-year holiday for investments between USD 10M – 50M",
                  "Standard Uganda CIT rate of 30% applies thereafter",
                ],
              },
              {
                icon: PackageOpen,
                title: "Customs & Import Exemptions",
                items: [
                  "0% import duty on capital equipment and machinery",
                  "VAT exemption on qualifying plant and equipment",
                  "Duty drawback on imported raw materials used for export",
                ],
              },
              {
                icon: BadgeDollarSign,
                title: "Repatriation & Capital",
                items: [
                  "100% repatriation of net profits and dividends",
                  "Full repatriation of capital on divestiture",
                  "No restriction on foreign currency accounts",
                ],
              },
              {
                icon: Landmark,
                title: "Regulatory Support",
                items: [
                  "One-stop investor facilitation centre at KIP",
                  "Expedited work permit processing for skilled expatriates",
                  "Dedicated UIA business registration desk on-site",
                ],
              },
            ].map(({ icon: Icon, title, items }) => (
              <div key={title} className="rounded-[5px] border border-black/8 bg-white p-7">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/25">
                    <Icon size={18} className="text-black/70" />
                  </div>
                  <h3 className="text-[15px] font-bold text-black">{title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
                      <span className="text-[13px] text-black/60">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] text-black/40">
            Incentives are subject to UIA registration and applicable Ugandan legislation. Contact the UIA investment desk for your specific situation.
          </p>
        </div>
      </section>

      {/* Eligibility */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/60">
                <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />
                Requirements
              </span>
              <h2 className="mt-4 text-[32px] font-extrabold text-black">
                Eligibility Criteria
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-black/55">
                KIP welcomes both foreign and Ugandan investors. Applications are open
                to any legally incorporated entity that meets the following criteria:
              </p>
              <ul className="mt-6 space-y-3">
                {ELIGIBILITY.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                    <span className="text-[14px] text-black/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center rounded-[5px] border border-black/8 bg-black p-10 text-white">
              <h3 className="text-[24px] font-extrabold leading-snug">
                Application window<br />
                <span className="text-kip-gold">is currently open.</span>
              </h3>
              <p className="mt-4 text-[14px] leading-relaxed text-white/55">
                Don&apos;t miss Phase 1 — Round 1 of the Kabalega Industrial Park EOI round.
                Register and complete your application before 30 June 2026.
              </p>
              <div className="mt-8 space-y-3">
                <Link
                  href="/sign-up"
                  className="flex w-full items-center justify-between rounded-[4px] bg-kip-gold px-6 py-3 text-[14px] font-bold text-black transition hover:brightness-105"
                >
                  Start Application
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/how-it-works"
                  className="flex w-full items-center justify-between rounded-[4px] border border-white/20 px-6 py-3 text-[14px] font-semibold text-white transition hover:border-white"
                >
                  Learn how it works
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
