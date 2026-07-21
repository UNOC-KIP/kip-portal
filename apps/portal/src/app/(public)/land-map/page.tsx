import Link from "next/link";
import { Download, MapPin, Maximize2 } from "lucide-react";
import { KIP_ZONES } from "@kip/shared";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const INFRASTRUCTURE = [
  { label: "Location",   value: "Kabaale, Hoima District, Western Uganda — 29.57 km² (7,307 acres)" },
  { label: "Access",     value: "≈ 50 km west of Hoima City · ≈ 248 km by road from Kampala" },
  { label: "Refinery",   value: "Uganda Greenfield Refinery — 60,000 barrels per day capacity" },
  { label: "Pipeline",   value: "EACOP Pump Station No. 1 — a key crude export node on the pipeline corridor" },
  { label: "Airport",    value: "Kabalega International Airport — global connectivity, cargo and exports" },
  { label: "Developer",  value: "Uganda Refinery Holding Company (URHC), a subsidiary of UNOC" },
];

export default function LandMapPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Phase 2 Plots
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            KIP Plot<br />
            <span className="text-kip-red">Allocation Map.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] font-medium leading-relaxed text-black/75">
            View the official plot layout for the Kabalega Petro-Based Industrial
            Park. Download the full map or browse zone descriptions below.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a href="/kip-plot-map.pdf" download="KIP-Plot-Allocation-Map-Phase2.pdf" className="inline-flex items-center gap-2 rounded-[4px] bg-kip-red px-6 py-3 text-[14px] font-bold text-white transition hover:brightness-110">
              <Download size={15} /> Download Map (PDF)
            </a>
            <Link href="/dashboard/site-visit" className="inline-flex items-center gap-2 rounded-[4px] border-2 border-black/70 px-6 py-3 text-[14px] font-bold text-black transition hover:bg-black/10">
              Book Site Visit
            </Link>
          </div>
        </div>
      </div>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-black">Official Plot Allocation Map</h2>
              <p className="mt-0.5 text-[13px] text-black/60">Kabalega Petro-Based Industrial Park</p>
            </div>
            <a href="/kip-plot-map.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-black/50 transition hover:text-black">
              <Maximize2 size={14} /> Open in new tab
            </a>
          </div>
          <div className="overflow-hidden rounded-[5px] border border-black/10 bg-ink-100 shadow-sm">
            <object data="/kip-plot-map.pdf" type="application/pdf" className="h-[60vh] min-h-[320px] w-full lg:h-[780px]" title="KIP Plot Allocation Map — Phase 2">
              <div className="flex h-[60vh] min-h-[320px] flex-col items-center justify-center gap-5 bg-ink-100 px-6 lg:h-[780px]">
                <MapPin size={40} className="text-black/20" />
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-black">PDF viewer not available</p>
                  <p className="mt-1 text-[13px] text-black/50">Your browser does not support inline PDF viewing.</p>
                </div>
                <a href="/kip-plot-map.pdf" download="KIP-Plot-Allocation-Map-Phase2.pdf" className="inline-flex items-center gap-2 rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110">
                  <Download size={14} /> Download the Map
                </a>
              </div>
            </object>
          </div>
          <p className="mt-3 text-[12px] text-black/50">
            Source: UNOC / URHC — KIP Plot Allocation Plan. For enquiries contact{" "}
            <a href="mailto:kipinvestorrelations@unoc.com" className="underline hover:text-black">kipinvestorrelations@unoc.com</a>
          </p>
        </div>
      </section>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <h2 className="text-[28px] font-extrabold text-black">Land Use Zones</h2>
            <p className="mt-2 text-[14px] text-black/60">Six master-planned zones spanning the full industrial value chain.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {KIP_ZONES.map((z) => (
              <div key={z.key} className="rounded-[5px] border border-black/8 bg-white p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-sm ${z.color}`} />
                  <h3 className="text-[14px] font-bold text-black">{z.label}</h3>
                  <span className="ml-auto rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-semibold text-black/60">{z.area}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-black/65">{z.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-black">Anchor Infrastructure &amp; Location</h2>
            <p className="mt-2 text-[14px] text-black/60">The park is developed by URHC around three anchor assets in the Kabaale industrial area.</p>
          </div>
          <div className="overflow-hidden rounded-[5px] border border-black/8">
            {INFRASTRUCTURE.map((item, i) => (
              <div key={item.label} className={`flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:gap-6 sm:px-7 sm:py-5 ${i % 2 === 0 ? "bg-white" : "bg-ink-100/40"} ${i > 0 ? "border-t border-black/5" : ""}`}>
                <span className="w-28 shrink-0 text-[12px] font-bold uppercase tracking-wide text-black/55">{item.label}</span>
                <span className="text-[14px] text-black/75">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black py-14 text-white">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-[26px] font-extrabold">Ready to secure your plot?</h2>
              <p className="mt-2 text-[14px] text-white/70">The Call for Expressions of Interest runs 19 August to 2 September 2026 — register now to be ready.</p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link href="/dashboard/site-visit" className="rounded-[4px] bg-kip-gold px-7 py-3 text-[14px] font-bold text-black transition hover:brightness-105">Book Site Visit</Link>
              <Link href="/for-investors" className="rounded-[4px] border border-white/25 px-7 py-3 text-[14px] font-semibold text-white transition hover:border-white">Investor Info</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
