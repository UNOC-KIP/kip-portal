import Link from "next/link";
import { Download, MapPin, Maximize2 } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const ZONES = [
  {
    color: "bg-blue-600",
    label: "Heavy Industry",
    area: "5 – 20 ha per plot",
    plots: 24,
    desc: "Petrochemicals, refinery feedstock processing, steel fabrication, large-scale manufacturing requiring heavy utility loads.",
  },
  {
    color: "bg-emerald-600",
    label: "Light Industry",
    area: "1 – 5 ha per plot",
    plots: 62,
    desc: "Packaging, food & beverage, assembly, plastic fabrication, textiles, and other light manufacturing activities.",
  },
  {
    color: "bg-amber-500",
    label: "Commercial / Logistics",
    area: "0.5 – 2 ha per plot",
    plots: 38,
    desc: "Warehousing, cold storage, freight forwarding, distribution centres, and commercial support services.",
  },
  {
    color: "bg-purple-600",
    label: "Research & Innovation",
    area: "0.5 – 1 ha per plot",
    plots: 14,
    desc: "Technology hubs, energy R&D labs, vocational training centres, and innovation facilities.",
  },
  {
    color: "bg-rose-500",
    label: "Mixed Use",
    area: "2 – 8 ha per plot",
    plots: 10,
    desc: "Retail, hospitality, banking, medical facilities, and other commercial support services for the park.",
  },
];

const INFRASTRUCTURE = [
  { label: "Power", value: "132 kV substation — dedicated grid feed from UETCL" },
  { label: "Water", value: "Treated water supply + industrial wastewater treatment plant" },
  { label: "Roads", value: "Paved 2-lane internal roads with dedicated HGV access routes" },
  { label: "Connectivity", value: "Fibre optic backbone to all zones" },
  { label: "Airport", value: "2 km from Kabalega International Airport" },
  { label: "Pipeline", value: "Adjacent to EACOP corridor — direct tie-in points for Phase 2 plots" },
];

export default function LandMapPage() {
  return (
    <div className="min-h-screen font-sans">

      {/* Gold hero */}
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Phase 2 Plots
          </span>
          <h1 className="mt-4 text-[48px] font-extrabold leading-tight tracking-tight text-black">
            KIP Plot<br />
            <span className="text-kip-red">Allocation Map.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-black/60">
            View the official Phase 2 plot layout for the Kabalega Petro-Based Industrial
            Park. Download the full map or browse zone descriptions below.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a
              href="/kip-plot-map.pdf"
              download="KIP-Plot-Allocation-Map-Phase2.pdf"
              className="inline-flex items-center gap-2 rounded-[4px] bg-kip-red px-6 py-3 text-[14px] font-bold text-white transition hover:brightness-110"
            >
              <Download size={15} />
              Download Map (PDF)
            </a>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-[4px] border-2 border-black/70 px-6 py-3 text-[14px] font-bold text-black transition hover:bg-black/10"
            >
              Apply for a Plot
            </Link>
          </div>
        </div>
      </div>

      {/* PDF viewer */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-black">Official Plot Allocation Map</h2>
              <p className="mt-0.5 text-[13px] text-black/45">Phase 2 — Kabalega Petro-Based Industrial Park</p>
            </div>
            <a
              href="/kip-plot-map.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-black/50 transition hover:text-black"
            >
              <Maximize2 size={14} />
              Open in new tab
            </a>
          </div>

          {/* PDF embed */}
          <div className="overflow-hidden rounded-[5px] border border-black/10 bg-ink-100 shadow-sm">
            <object
              data="/kip-plot-map.pdf"
              type="application/pdf"
              className="h-[780px] w-full"
              title="KIP Plot Allocation Map — Phase 2"
            >
              {/* Fallback for mobile / unsupported browsers */}
              <div className="flex h-[780px] flex-col items-center justify-center gap-5 bg-ink-100">
                <MapPin size={40} className="text-black/20" />
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-black">PDF viewer not available</p>
                  <p className="mt-1 text-[13px] text-black/50">Your browser does not support inline PDF viewing.</p>
                </div>
                <a
                  href="/kip-plot-map.pdf"
                  download="KIP-Plot-Allocation-Map-Phase2.pdf"
                  className="inline-flex items-center gap-2 rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
                >
                  <Download size={14} />
                  Download the Map
                </a>
              </div>
            </object>
          </div>
          <p className="mt-3 text-[12px] text-black/35">
            Source: UNOC / URHC — KIP Phase 2 Plot Allocation Plan. For enquiries contact{" "}
            <a href="mailto:kip@unoc.co.ug" className="underline hover:text-black">kip@unoc.co.ug</a>
          </p>
        </div>
      </section>

      {/* Zone legend */}
      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="mb-10">
            <h2 className="text-[28px] font-extrabold text-black">Land Use Zones</h2>
            <p className="mt-2 text-[14px] text-black/50">
              Five designated zones with dedicated infrastructure and utility capacities.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ZONES.map((z) => (
              <div key={z.label} className="rounded-[5px] border border-black/8 bg-white p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-sm ${z.color}`} />
                  <h3 className="text-[14px] font-bold text-black">{z.label}</h3>
                  <span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-black/50">
                    {z.plots} plots
                  </span>
                </div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-black/35">{z.area}</p>
                <p className="text-[13px] leading-relaxed text-black/60">{z.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure specs */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-black">Shared Infrastructure</h2>
            <p className="mt-2 text-[14px] text-black/50">All plots benefit from park-wide infrastructure maintained by URHC.</p>
          </div>
          <div className="overflow-hidden rounded-[5px] border border-black/8">
            {INFRASTRUCTURE.map((item, i) => (
              <div key={item.label} className={`flex items-start gap-6 px-7 py-5 ${i % 2 === 0 ? "bg-white" : "bg-ink-100/40"} ${i > 0 ? "border-t border-black/5" : ""}`}>
                <span className="w-28 shrink-0 text-[12px] font-bold uppercase tracking-wide text-black/40">{item.label}</span>
                <span className="text-[14px] text-black/70">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-14 text-white">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-[26px] font-extrabold">Ready to secure your plot?</h2>
              <p className="mt-2 text-[14px] text-white/55">
                Submit your Expression of Interest before the window closes on 30 June 2026.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link
                href="/sign-up"
                className="rounded-[4px] bg-kip-gold px-7 py-3 text-[14px] font-bold text-black transition hover:brightness-105"
              >
                Start Application
              </Link>
              <Link
                href="/for-investors"
                className="rounded-[4px] border border-white/25 px-7 py-3 text-[14px] font-semibold text-white transition hover:border-white"
              >
                Investor Info
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
