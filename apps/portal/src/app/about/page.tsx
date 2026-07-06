import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  Fuel,
  Factory,
  Plane,
  Boxes,
  Wheat,
  Store,
  Home as HomeIcon,
  Cpu,
  MapPin,
  Route,
  CheckCircle2,
  ArrowRight,
  Play,
  Shield,
  Zap,
  TreePine,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About KIP — Kabalega Petro-Based Industrial Park",
  description:
    "Learn about the Kabalega Petro-Based Industrial Park (KIP) in Hoima, Uganda — a 29.57 km² petroleum-integrated smart industrial park developed by the Uganda Refinery Holding Company, anchored by the Uganda Greenfield Refinery, EACOP and Kabalega International Airport.",
};

// Hosted on S3 (public/ prefix of the documents bucket) — never commit video
// files to the repo. If set to "", the page falls back to the poster with a
// "coming soon" badge instead of a broken player.
const PROMO_VIDEO_URL =
  "https://kip-documents-unoc.s3.af-south-1.amazonaws.com/kip-promo-1080p.mp4";
const PROMO_VIDEO_POSTER = "/kip-promo-poster.jpg";

const STATS = [
  { value: "29.57", unit: "km²", label: "Total Park Area" },
  { value: "60,000", unit: "bpd", label: "Refinery Capacity" },
  { value: "6", unit: "", label: "Investment Zones" },
  { value: "USD 1B", unit: "+", label: "Target Investment" },
];

const MANDATE_POINTS = [
  "Promote petrochemical and petroleum value addition in Uganda",
  "Attract foreign and domestic investment into serviced industrial land",
  "Create sustainable employment and skills transfer for Ugandans",
  "Anchor industrialisation goals of Vision 2040 and the National Development Plan",
];

const ANCHORS = [
  {
    icon: Fuel,
    title: "Uganda Greenfield Refinery",
    detail: "60,000 barrels per day processing capacity — the industrial anchor of the park.",
  },
  {
    icon: Factory,
    title: "EACOP Pump Station No. 1",
    detail: "A key crude export node on the East African Crude Oil Pipeline corridor.",
  },
  {
    icon: Plane,
    title: "Kabalega International Airport",
    detail: "Facilitates global connectivity, cargo handling and exports.",
  },
];

const ZONES = [
  {
    icon: Factory,
    name: "Heavy Industrial Zone",
    detail: "Fertilizers, polymers and petrochemicals with free-zone privileges.",
  },
  {
    icon: Boxes,
    name: "Light & Downstream Hub",
    detail: "Furniture, textiles, packaging and automotive parts manufacturing.",
  },
  {
    icon: Wheat,
    name: "Agro-Industrial Zone",
    detail: "Fruit, dairy and meat processing leveraging nearby agricultural zones.",
  },
  {
    icon: Store,
    name: "Business Park",
    detail: "Warehousing, retail, cold storage, logistics and hospitality.",
  },
  {
    icon: HomeIcon,
    name: "Residential Estate",
    detail: "Housing, schools and health centres for a live-work community.",
  },
  {
    icon: Cpu,
    name: "Administration Zone",
    detail: "ICT, security, emergency services, Park HQ and a One-Stop Centre.",
  },
];

const CONNECTIVITY = [
  {
    icon: MapPin,
    title: "Kabaale, Hoima District",
    detail:
      "Located in Western Uganda on the shores of Lake Albert — about 50 km west of Hoima City and 248 km by road from Kampala.",
  },
  {
    icon: Plane,
    title: "Air cargo on the doorstep",
    detail:
      "Kabalega International Airport sits at the edge of the park, built to handle heavy project cargo and future passenger and export traffic.",
  },
  {
    icon: Route,
    title: "Road & pipeline corridors",
    detail:
      "Served by the upgraded Hoima–Kampala highway network and the EACOP corridor running from Kabaale to the port of Tanga, Tanzania.",
  },
  {
    icon: Fuel,
    title: "Feedstock at source",
    detail:
      "Direct access to refinery products and petrochemical feedstock — no import logistics for downstream manufacturers.",
  },
];

const GALLERY = [
  { src: "/kip-refinery-build.jpg", alt: "Refinery construction works at Kabalega Industrial Park" },
  { src: "/kip-rig.jpg", alt: "Drilling rig in the Albertine Graben" },
  { src: "/kip-yard.jpg", alt: "Logistics and laydown yard at the park" },
  { src: "/kip-infrastructure.jpg", alt: "Petroleum storage infrastructure at the park" },
];

const PARTNERS = [
  {
    name: "Uganda National Oil Company",
    logo: "/unoc-logo.png",
    width: 180,
    height: 48,
  },
  {
    name: "Ministry of Energy & Mineral Development",
    logo: "/ministry-of-energy-and-mineral-development-uganda-seeklogo.png",
    width: 56,
    height: 56,
  },
  {
    name: "Uganda Investment Authority",
    logo: "/investment_authority.png",
    width: 104,
    height: 56,
  },
];

const WHY_INVEST = [
  {
    icon: Zap,
    title: "Serviced land, ready to build",
    detail: "Zoned plots with utilities, roads and a One-Stop Centre for investor facilitation.",
  },
  {
    icon: Shield,
    title: "Secure long-term tenure",
    detail: "Leases issued directly by URHC with clear title and investor aftercare.",
  },
  {
    icon: TreePine,
    title: "Incentives for priority industries",
    detail: "UIA tax incentives plus subsidised land rates for priority sectors.",
  },
];

const TIMELINE = [
  { date: "Now", label: "Application window open — EOI submissions accepted", active: true },
  { date: "30 Jun 2026", label: "Window closes — no further submissions", active: false },
  { date: "Jul 2026", label: "Technical Committee pre-screening", active: false },
  { date: "Aug 2026", label: "ExCo review and decisions", active: false },
  { date: "Sep 2026", label: "Letters of Intent issued to successful applicants", active: false },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen font-sans">
      {/* Hero */}
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            About The Park
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            The home of Uganda&apos;s<br />
            <span className="text-kip-red">industrial future.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] font-medium leading-relaxed text-black/75">
            The Kabalega Petro-Based Industrial Park is a 29.57 km² smart and eco-industrial hub
            in Hoima, developed by the Uganda Refinery Holding Company around the Uganda
            Greenfield Refinery, EACOP and Kabalega International Airport.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/sign-up" className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110">Apply Now</Link>
            <Link href="/land-map" className="rounded-[4px] border-2 border-black/70 px-7 py-3 text-[14px] font-bold text-black transition hover:bg-black/10">View Land Map</Link>
          </div>
        </div>
      </div>

      {/* Promotional video */}
      <section className="bg-black py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-8 text-center">
            <h2 className="text-[26px] sm:text-[34px] font-extrabold leading-tight tracking-tight text-white">
              See the park <span className="text-kip-gold">take shape.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-white/60">
              A look at the refinery works, the airport and the serviced land that will host
              Uganda&apos;s next generation of industries.
            </p>
          </div>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[8px] border border-white/10">
            {PROMO_VIDEO_URL ? (
              <video
                controls
                preload="none"
                playsInline
                poster={PROMO_VIDEO_POSTER}
                className="aspect-video w-full bg-black object-cover"
              >
                <source src={PROMO_VIDEO_URL} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="relative aspect-video w-full">
                <Image
                  src={PROMO_VIDEO_POSTER}
                  alt="Kabalega Industrial Park promotional film"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-kip-gold">
                    <Play size={26} className="ml-1 text-black" fill="currentColor" />
                  </span>
                  <span className="rounded-full bg-black/60 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-widest text-white/85">
                    Promotional film coming soon
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Story & mandate */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-ink-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
                <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
                Our Story & Mandate
              </span>
              <h2 className="mt-4 text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-black">
                From oil discovery to an{" "}
                <span className="text-kip-red">industrial ecosystem.</span>
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-black/65">
                The Kabalega Industrial Park is developed by the Uganda Refinery Holding Company
                (URHC), a subsidiary of the Uganda National Oil Company (UNOC). Built on
                Uganda&apos;s Albertine Graben oil discoveries, the park converts the country&apos;s
                petroleum resources into lasting industrial capacity — refining crude at home and
                feeding downstream manufacturing instead of exporting raw value.
              </p>
              <ul className="mt-6 space-y-3">
                {MANDATE_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                    <span className="text-[14px] leading-relaxed text-black/70">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[8px] border border-black/8">
              <Image
                src="/kip-refinery.jpg"
                alt="Uganda Greenfield Refinery construction at Kabalega Industrial Park"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-black/8 bg-black/8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white px-4 py-6 text-center sm:px-8 sm:py-8">
                <p className="text-[28px] sm:text-[38px] font-extrabold leading-none text-black">
                  {s.value}<span className="text-kip-red">{s.unit}</span>
                </p>
                <p className="mt-2 text-[13px] text-black/60">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Anchor infrastructure */}
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {ANCHORS.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-[5px] border border-black/8 bg-white p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[6px] bg-kip-gold/20">
                  <Icon size={20} className="text-black/75" />
                </div>
                <h3 className="text-[15px] font-bold text-black">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-black/65">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment zones */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-black">
              Six zones, one <span className="text-kip-red">value chain.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/65">
              The park is master-planned as an integrated live-work environment spanning the full
              industrial value chain — from heavy petrochemicals to housing for the workforce.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ZONES.map(({ icon: Icon, name, detail }) => (
              <div key={name} className="rounded-[5px] border border-black/8 bg-white p-7">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/30">
                  <Icon size={18} className="text-black/75" />
                </div>
                <h3 className="text-[15px] font-bold text-black">{name}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-black/65">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location & connectivity */}
      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-black">
              Connected by <span className="text-kip-red">air, road and pipeline.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/65">
              KIP sits at the centre of Uganda&apos;s new energy corridor — with the infrastructure
              to move people, cargo and product in and out of the Albertine region.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CONNECTIVITY.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-[5px] border border-black/8 bg-white p-7">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/30">
                  <Icon size={18} className="text-black/75" />
                </div>
                <h3 className="text-[15px] font-bold text-black">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-black/65">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/land-map" className="inline-flex items-center gap-2 text-[14px] font-bold text-kip-red transition hover:brightness-90">
              Explore the plot allocation map <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Photo gallery */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-8">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-black">
              On the ground <span className="text-kip-red">today.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/65">
              Construction of the anchor infrastructure is under way — this is not a paper park.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {GALLERY.map((photo) => (
              <div key={photo.src} className="relative aspect-[4/3] overflow-hidden rounded-[5px] border border-black/8">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition duration-300 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners & governance */}
      <section className="border-y border-black/8 bg-ink-100 py-14">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-[24px] sm:text-[30px] font-extrabold leading-tight tracking-tight text-black">
                Backed by the <span className="text-kip-red">Government of Uganda.</span>
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-black/65">
                The park is delivered by URHC under UNOC, working with the Ministry of Energy and
                Mineral Development and the Uganda Investment Authority — so land tenure,
                licensing and investment incentives are handled through official channels.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-x-12 gap-y-8 lg:justify-end">
              {PARTNERS.map((p) => (
                <Image
                  key={p.name}
                  src={p.logo}
                  alt={p.name}
                  title={p.name}
                  width={p.width}
                  height={p.height}
                  className="h-10 w-auto object-contain opacity-75 transition hover:opacity-100 sm:h-12"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why invest teaser */}
      <section className="bg-kip-gold py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-black">
            Why investors choose <span className="text-kip-red">Kabalega.</span>
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {WHY_INVEST.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-[5px] border border-black/10 bg-white/60 p-7">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[4px] bg-black/10">
                  <Icon size={18} className="text-black/80" />
                </div>
                <h3 className="text-[15px] font-bold text-black">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-black/70">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/for-investors" className="inline-flex items-center gap-2 rounded-[4px] bg-black px-7 py-3 text-[14px] font-bold text-white transition hover:bg-black/85">
              See incentives &amp; land rates <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Application timeline */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-black">
                Where we are in <span className="text-kip-red">the process.</span>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-black/65">
                Land is allocated through open application windows. The current round — Phase 1 —
                is accepting Expressions of Interest now, with committee reviews following once
                the window closes.
              </p>
              <div className="mt-6">
                <Link href="/how-it-works" className="inline-flex items-center gap-2 text-[14px] font-bold text-kip-red transition hover:brightness-90">
                  How the application works <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="rounded-[5px] border border-black/8 bg-white p-8">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-kip-gold" />
                <h3 className="text-[15px] font-bold text-black">Application Timeline</h3>
              </div>
              <p className="mb-8 text-[13px] text-black/55">Current round — Phase 1</p>
              <ol className="relative border-l-2 border-black/10 pl-6">
                {TIMELINE.map((item, i, arr) => (
                  <li key={i} className={i < arr.length - 1 ? "mb-7" : ""}>
                    <span className={`absolute -left-[9px] mt-0.5 h-4 w-4 rounded-full border-2 ${
                      item.active ? "border-kip-gold bg-kip-gold" : "border-black/20 bg-white"
                    }`} />
                    <p className={`text-[11px] font-bold uppercase tracking-wide ${item.active ? "text-kip-red" : "text-black/45"}`}>
                      {item.date}
                    </p>
                    <p className={`mt-0.5 text-[14px] ${item.active ? "font-semibold text-black" : "text-black/60"}`}>
                      {item.label}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] text-center">
          <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-white">
            Ready to build in <span className="text-kip-gold">Kabalega?</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-white/60">
            Create an account, pay the application fee and submit your Expression of Interest
            before the current window closes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/sign-up" className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110">Start Your Application</Link>
            <Link href="/contact" className="rounded-[4px] border border-white/30 px-7 py-3 text-[14px] font-bold text-white transition hover:border-white hover:bg-white hover:text-black">Talk to Us</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
