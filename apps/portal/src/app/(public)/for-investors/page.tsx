import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteVisitCta } from "@/components/site-visit-cta";
import { Zap, Fuel, Shield, Globe, TreePine, Building2, CheckCircle2, ArrowRight, Percent, PackageOpen, BadgeDollarSign, Landmark, Factory, Boxes, Wheat, Store, Home as HomeIcon, Cpu } from "lucide-react";

// The site-visit CTA is gated on the booking window, which is read from the DB
// on every request — static generation would bake in whichever state was true
// at build time (and CI builds have no database at all).
export const dynamic = "force-dynamic";

const WHY_KIP = [
  { icon: Globe,    title: "Strategic Location",     body: "Located at Kabaale, Hoima District in Western Uganda — about 50 km west of Hoima City and 248 km by road from Kampala, alongside the EACOP corridor and Kabalega International Airport." },
  { icon: Fuel,     title: "Anchored by the Refinery", body: "Built around the 60,000 barrels-per-day Uganda Greenfield Refinery and EACOP Pump Station No. 1 — direct access to feedstock for petrochemical and downstream industries." },
  { icon: Zap,      title: "Serviced Industrial Land", body: "A planned 29.57 km² (7,307-acre) smart and eco-industrial hub with dedicated zones, utilities and a One-Stop Centre for streamlined investor facilitation." },
  { icon: Shield,   title: "Secure Tenure",          body: "Long-term land leases issued directly by the Uganda Refinery Holding Company (URHC), a subsidiary of UNOC, with clear title and investor aftercare services." },
  { icon: TreePine, title: "Incentives & Support",   body: "Access Uganda Investment Authority incentives — tax holidays, VAT exemptions on capital equipment, and profit repatriation — plus subsidised services rates for priority industries." },
  { icon: Building2, title: "Integrated Ecosystem",  body: "Six planned zones — heavy industry, light & downstream, agro-industrial, business park, residential estate and administration — form a fully integrated live-work environment." },
];

const ZONES = [
  { icon: Factory, name: "Heavy Industrial Zone",   badge: "Free Zone", desc: "Petrochemicals, polymers, fertiliser, bonded warehousing and free-trade-zone operations." },
  { icon: Boxes,   name: "Light & Downstream Hub",  badge: null,        desc: "Furniture, textiles, packaging, automotive parts and downstream refinery-linked manufacturing." },
  { icon: Wheat,   name: "Agro-Industrial Zone",    badge: null,        desc: "Fruit, dairy and meat processing and value-added agricultural manufacturing." },
  { icon: Store,   name: "Business / Commercial",   badge: null,        desc: "Warehousing, retail, cold storage, logistics, hospitality and events." },
  { icon: HomeIcon,name: "Residential / Estate",    badge: "Phase 2",   desc: "Housing, schools, health centres and a technology campus for a live-work community." },
  { icon: Cpu,     name: "Administration Zone",     badge: null,        desc: "ICT, security, emergency services, Park HQ and a One-Stop investor centre." },
];

const FEE_TIERS = [
  { rate: "USD 1.50", accent: "bg-blue-600",    tier: "General Industries & Commercial", items: "Light industries, warehousing & distribution, bonded warehouse, retail, hospitality & events, ICT, schools & tech colleges." },
  { rate: "USD 1.25", accent: "bg-emerald-600", tier: "Priority Industries (Subsidised)", items: "Petrochemicals, fertiliser, downstream industries, agro-based industries, cold chain, industrial gases, aviation." },
  { rate: "USD 1.00", accent: "bg-kip-gold",    tier: "Residential (Phase 2)", items: "Low-density and high-density housing — commencing in Phase 2 onboarding after the June 2026 national launch." },
];

const ELIGIBILITY = [
  "Legally incorporated company (foreign or Ugandan)",
  "Valid Certificate of Incorporation or equivalent",
  "Genuine investment intention aligned with a KIP investment zone",
  "Ability to pay the non-refundable USD 1,000 application fee",
  "Commitment to comply with Uganda's H3SE and national content requirements",
  "No conviction for financial crime in any jurisdiction in the past 5 years",
];

const STATS = [
  { value: "29.57", unit: "km²",  label: "Total Park Area" },
  { value: "60,000", unit: "bpd", label: "Refinery Capacity" },
  { value: "6",      unit: "",     label: "Investment Zones" },
  { value: "USD 1B", unit: "+",    label: "Target Investment" },
];

export default function ForInvestorsPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Investor Information
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            Why Invest in<br />
            <span className="text-kip-red">Kabalega?</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] font-medium leading-relaxed text-black/75">
            Uganda&apos;s flagship petroleum-integrated industrial park offers serviced land, subsidised priority-industry rates, and direct access to the refinery and EACOP infrastructure.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/sign-up" className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110">Create Account</Link>
            <Link href="/how-it-works" className="rounded-[4px] border-2 border-black/70 px-7 py-3 text-[14px] font-bold text-black transition hover:bg-black/10">How it works</Link>
          </div>
        </div>
      </div>

      <section className="border-b border-black/8 bg-white">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-2 gap-px bg-black/8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white px-8 py-10 text-center">
                <p className="text-[28px] sm:text-[38px] font-extrabold leading-none text-black">{s.value}<span className="text-kip-red">{s.unit}</span></p>
                <p className="mt-2 text-[13px] text-black/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
              Advantages
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold text-black">Why choose <span className="text-kip-red">KIP?</span></h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {WHY_KIP.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[5px] border border-black/8 bg-white p-7">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/30"><Icon size={20} className="text-black/75" /></div>
                <h3 className="mb-2 text-[15px] font-bold text-black">{title}</h3>
                <p className="text-[13px] leading-relaxed text-black/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-ink-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-black" />
              Land Zones
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold text-black">Six Investment Zones</h2>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-black/65">KIP is master-planned into six zones spanning the full industrial value chain — from refinery-linked heavy industry to agro-processing, commerce and residential estate.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ZONES.map(({ icon: Icon, name, badge, desc }) => (
              <div key={name} className="rounded-[5px] border border-black/8 bg-white p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-ink-100"><Icon size={18} className="text-black/70" /></div>
                  {badge && <span className="ml-auto rounded-full bg-kip-gold/25 px-2.5 py-0.5 text-[11px] font-semibold text-black/70">{badge}</span>}
                </div>
                <h3 className="text-[14px] font-bold text-black">{name}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-black/65">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />
              Services Fee Structure
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold text-black">Annual land services <span className="text-kip-red">rates.</span></h2>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-black/65">KIP charges an annual land services fee per square metre, by industry category. Priority industries benefit from a subsidised rate. These rates are separate from the one-off USD 1,000 EOI application fee.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {FEE_TIERS.map(({ rate, accent, tier, items }) => (
              <div key={tier} className="overflow-hidden rounded-[6px] border border-black/8 bg-white">
                <div className={`${accent} px-6 py-5 text-white`}>
                  <p className="text-[30px] font-extrabold leading-none">{rate}</p>
                  <p className="mt-1 text-[12px] font-medium text-white/85">per m² / year</p>
                </div>
                <div className="p-6">
                  <h3 className="text-[14px] font-bold text-black">{tier}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-black/65">{items}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-ink-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />
              Investment Incentives
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold text-black">Incentives for KIP <span className="text-kip-red">investors.</span></h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-black/65">KIP investors operating through the Uganda Investment Authority benefit from a comprehensive package of fiscal and non-fiscal incentives under Ugandan law.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              { icon: Percent, title: "Corporate Income Tax Holiday", items: ["10-year initial CIT holiday for investments above USD 50M", "5-year holiday for investments between USD 10M – 50M", "Standard Uganda CIT rate of 30% applies thereafter"] },
              { icon: PackageOpen, title: "Customs & Import Exemptions", items: ["0% import duty on capital equipment and machinery", "VAT exemption on qualifying plant and equipment", "Duty drawback on imported raw materials used for export"] },
              { icon: BadgeDollarSign, title: "Repatriation & Capital", items: ["100% repatriation of net profits and dividends", "Full repatriation of capital on divestiture", "No restriction on foreign currency accounts"] },
              { icon: Landmark, title: "Regulatory Support", items: ["One-stop investor facilitation centre at KIP", "Expedited work permit processing for skilled expatriates", "Dedicated UIA business registration desk on-site"] },
            ].map(({ icon: Icon, title, items }) => (
              <div key={title} className="rounded-[5px] border border-black/8 bg-white p-7">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/25"><Icon size={18} className="text-black/75" /></div>
                  <h3 className="text-[15px] font-bold text-black">{title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
                      <span className="text-[13px] text-black/70">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] text-black/50">Incentives are subject to UIA registration and applicable Ugandan legislation. Contact the UIA investment desk for your specific situation.</p>
        </div>
      </section>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
                <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />
                Requirements
              </span>
              <h2 className="mt-4 text-[32px] font-extrabold text-black">Eligibility Criteria</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-black/65">KIP welcomes both foreign and Ugandan investors. Applications are open to any legally incorporated entity that meets the following criteria:</p>
              <ul className="mt-6 space-y-3">
                {ELIGIBILITY.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                    <span className="text-[14px] text-black/75">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center rounded-[5px] border border-black/8 bg-black p-6 text-white sm:p-10">
              <h3 className="text-[24px] font-extrabold leading-snug">Call for EOIs opens<br /><span className="text-kip-gold">19 August 2026.</span></h3>
              <p className="mt-4 text-[14px] leading-relaxed text-white/70">Don&apos;t miss Phase 2 of the Kabalega Industrial Park onboarding. Register now and submit your Expression of Interest between 19 August and 2 September 2026.</p>
              <div className="mt-8 space-y-3">
                <SiteVisitCta
                  className="flex w-full items-center justify-between rounded-[4px] bg-kip-gold px-6 py-3 text-[14px] font-bold text-black transition hover:brightness-105"
                  closed={{ href: "/sign-up", label: <>Create your account <ArrowRight size={16} /></> }}
                >
                  Book Site Visit <ArrowRight size={16} />
                </SiteVisitCta>
                <Link href="/how-it-works" className="flex w-full items-center justify-between rounded-[4px] border border-white/20 px-6 py-3 text-[14px] font-semibold text-white transition hover:border-white">Learn how it works <ArrowRight size={16} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
