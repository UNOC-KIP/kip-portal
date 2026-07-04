import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const LAND_CATEGORIES = [
  { category: "Heavy Industry",        minArea: "5 – 20 ha",   plots: 24, status: "Available", style: "bg-green-50 text-green-700" },
  { category: "Light Industry",         minArea: "1 – 5 ha",    plots: 62, status: "Available", style: "bg-green-50 text-green-700" },
  { category: "Commercial / Logistics", minArea: "0.5 – 2 ha",  plots: 38, status: "Available", style: "bg-green-50 text-green-700" },
  { category: "Research & Innovation",  minArea: "0.5 – 1 ha",  plots: 14, status: "Limited",   style: "bg-amber-50 text-amber-700" },
  { category: "Mixed Use",              minArea: "2 – 8 ha",    plots: 10, status: "Reserved",  style: "bg-blue-50 text-blue-700"   },
];

const TIMELINE = [
  { date: "Now",          label: "Application window open — EOI submissions accepted", active: true  },
  { date: "30 Jun 2026",  label: "Window closes — no further submissions",             active: false },
  { date: "Jul 2026",     label: "Technical Committee pre-screening",                  active: false },
  { date: "Aug 2026",     label: "ExCo review and decisions",                          active: false },
  { date: "Sep 2026",     label: "Letters of Intent issued to successful applicants",  active: false },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen font-sans">

      {/* Gold zone: floating navbar + hero */}
      <section className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            About The Park
          </span>
          <h1 className="mt-4 text-[38px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            Kabalega Petro-Based<br />
            <span className="text-kip-red">Industrial Park.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-black/60">
            Key facts, land categories, utility infrastructure, and allocation
            policy for prospective investors.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-black/8 bg-white">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-2 gap-px bg-black/8 md:grid-cols-4">
            {[
              { value: "2,200", unit: "ha",  label: "Total Area" },
              { value: "221",   unit: "",    label: "Serviced Plots" },
              { value: "USD 1B", unit: "+",  label: "Target Investment" },
              { value: "5,000", unit: "+",   label: "Jobs Target" },
            ].map((s) => (
              <div key={s.label} className="bg-white px-8 py-10 text-center">
                <p className="text-[28px] sm:text-[38px] font-extrabold leading-none text-black">
                  {s.value}<span className="text-kip-red">{s.unit}</span>
                </p>
                <p className="mt-2 text-[13px] text-black/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Land categories + Timeline */}
      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Land Categories */}
            <div className="rounded-[5px] border border-black/8 bg-white p-8">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-black" />
                <h2 className="text-[15px] font-bold text-black">Land Categories</h2>
              </div>
              <p className="mb-5 text-[13px] text-black/45">Available plot types and minimum area requirements</p>
              <table className="w-full">
                <thead>
                  <tr className="bg-ink-100">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Category</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Min Area</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Plots</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {LAND_CATEGORIES.map((row) => (
                    <tr key={row.category} className="border-t border-black/5">
                      <td className="px-3 py-3 text-[13px] font-medium text-black">{row.category}</td>
                      <td className="px-3 py-3 text-[13px] text-black/50">{row.minArea}</td>
                      <td className="px-3 py-3 text-[13px] font-semibold text-black">{row.plots}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.style}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-7">
                <Link
                  href="/sign-up"
                  className="inline-block rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
                >
                  Start Application
                </Link>
              </div>
            </div>

            {/* Application Timeline */}
            <div className="rounded-[5px] border border-black/8 bg-white p-8">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-kip-gold" />
                <h2 className="text-[15px] font-bold text-black">Application Timeline</h2>
              </div>
              <p className="mb-8 text-[13px] text-black/45">Current round — Phase 1</p>
              <ol className="relative border-l-2 border-black/10 pl-6">
                {TIMELINE.map((item, i, arr) => (
                  <li key={i} className={i < arr.length - 1 ? "mb-7" : ""}>
                    <span className={`absolute -left-[9px] mt-0.5 h-4 w-4 rounded-full border-2 ${
                      item.active ? "border-kip-gold bg-kip-gold" : "border-black/20 bg-white"
                    }`} />
                    <p className={`text-[11px] font-bold uppercase tracking-wide ${item.active ? "text-kip-red" : "text-black/35"}`}>
                      {item.date}
                    </p>
                    <p className={`mt-0.5 text-[14px] ${item.active ? "font-semibold text-black" : "text-black/50"}`}>
                      {item.label}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
