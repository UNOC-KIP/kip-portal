import Image from "next/image";
import Link from "next/link";
import { Building2, CreditCard, FileText } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <div className="min-h-screen font-sans">

      {/* ── Gold zone: navbar + hero + countdown ─────────── */}
      <div className="bg-kip-gold">

        {/* ── Navbar ───────────────────────────────────────── */}
        <SiteNav />

        {/* ── Hero ─────────────────────────────────────────── */}
        <section>
          <div className="mx-auto grid max-w-[1343px] grid-cols-1 items-center px-[100px] pt-14 pb-10 lg:grid-cols-2 lg:gap-12">

            {/* Left — text */}
            <div>
              <h1 className="text-[56px] font-extrabold leading-[1.08] tracking-tight text-black lg:text-[64px]">
                Kabalega<br />
                Petro-Based<br />
                <span className="text-kip-red">Industrial Park.</span>
              </h1>

              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-black/65">
                Investor land allocation portal for Uganda&apos;s flagship petroleum
                industrial park. Express your interest, pay your application fee,
                and submit your EOI securely online.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/sign-up"
                  className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110"
                >
                  Start Application
                </Link>
                <Link
                  href="#"
                  className="rounded-[4px] border-2 border-black/80 px-7 py-3 text-[14px] font-bold text-black transition hover:bg-black/10"
                >
                  View Land Map
                </Link>
              </div>
            </div>

            {/* Right — dashboard image */}
            <div className="hidden lg:flex lg:items-center lg:justify-end">
              <Image
                src="/dasbaord-image.png"
                alt="KIP Dashboard"
                width={520}
                height={420}
                className="object-contain drop-shadow-xl"
                priority
              />
            </div>

          </div>
        </section>

        {/* ── Countdown — full-width strip ─────────────────── */}
        <div className="mx-auto max-w-[1343px] px-[100px] pb-10">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[5px] bg-white/85 px-8 py-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <div>
                <p className="text-[16px] font-bold text-black">Application Window Open</p>
                <p className="text-[14px] text-black/50">Closes 30 June 2026 at 23:59 EAT</p>
              </div>
            </div>
            <div className="flex items-center gap-10">
              {[["68", "DAYS"], ["14", "HOURS"], ["22", "MINS"]].map(([n, label]) => (
                <div key={label} className="text-center">
                  <p className="text-[32px] font-extrabold leading-none text-black">{n}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-kip-red">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>{/* end gold zone */}

      {/* ── Feature cards ────────────────────────────────── */}
      <section className="bg-white pb-16 pt-8">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="grid grid-cols-1 gap-1 md:grid-cols-3">

            {/* Card 1 — Industrial Park (image bg) */}
            <div className="relative flex h-[644px] flex-col items-start justify-center overflow-hidden rounded-l-[10px] px-10">
              <Image
                src="/industry-park.jpg"
                alt="Industrial Park"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative z-10 max-w-[260px]">
                <Building2 size={24} className="mb-5 text-white" />
                <h3 className="text-[20px] font-bold leading-snug text-white">Industrial Park</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-white/65">
                  Over 2,200 hectares of planned, serviced industrial land at Kabalega,
                  Western Uganda — adjacent to the EACOP pipeline corridor.
                </p>
              </div>
            </div>

            {/* Card 2 — Application Fee (solid red) */}
            <div className="flex h-[644px] flex-col items-start justify-center bg-kip-red px-10">
              <CreditCard size={24} className="mb-5 text-white" />
              <h3 className="text-[20px] font-bold leading-snug text-white">Application Fee</h3>
              <p className="mt-2 max-w-[260px] text-[16px] leading-relaxed text-white/65">
                A non-refundable fee of USD 1,000 is required per application, payable
                via MTN MoMo, Airtel Money, Visa/Mastercard, or bank transfer.
              </p>
            </div>

            {/* Card 3 — EOI Process (image bg) */}
            <div className="relative flex h-[644px] flex-col items-start justify-center overflow-hidden rounded-r-[10px] px-10">
              <Image
                src="/eoi-process.jpg"
                alt="EOI Process"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative z-10 max-w-[260px]">
                <FileText size={24} className="mb-5 text-white" />
                <h3 className="text-[20px] font-bold leading-snug text-white">EOI Process</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-white/65">
                  Submit a six-section Expression of Interest covering company profile,
                  land requirements, utilities, H3SE, national content, and declaration.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── About KIP ───────────────────────────────────── */}
      <section id="about" className="scroll-mt-20 bg-ink-100 py-20">
        <div className="mx-auto max-w-[1343px] px-[100px]">

          {/* Section header */}
          <div className="mb-12">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/60">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
              About The Park
            </span>
            <h2 className="mt-4 text-[36px] font-extrabold leading-tight tracking-tight text-black">
              Kabalega Petro-Based{" "}
              <span className="text-kip-red">Industrial Park.</span>
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-black/55">
              Key facts, land categories, utility infrastructure, and allocation
              policy for prospective investors.
            </p>
          </div>

          {/* Stats row */}
          <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-black/8 bg-black/8 md:grid-cols-4">
            {[
              { value: "2,200", unit: "ha",   label: "Total Area" },
              { value: "148",   unit: "",      label: "Serviced Plots" },
              { value: "USD 1B", unit: "+",   label: "Target Investment" },
              { value: "5,000", unit: "+",    label: "Jobs Target" },
            ].map((s) => (
              <div key={s.label} className="bg-white px-8 py-8 text-center">
                <p className="text-[38px] font-extrabold leading-none text-black">
                  {s.value}<span className="text-kip-red">{s.unit}</span>
                </p>
                <p className="mt-2 text-[13px] text-black/50">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Land categories + Timeline */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Land Categories */}
            <div className="rounded-[5px] border border-black/8 bg-white p-8">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-black" />
                <h3 className="text-[15px] font-bold text-black">Land Categories</h3>
              </div>
              <p className="mb-5 text-[13px] text-black/45">Available plot types and minimum area requirements</p>
              <table className="w-full">
                <thead>
                  <tr className="rounded-[3px] bg-ink-100">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Category</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Min Area</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Plots</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { category: "Heavy Industry",        minArea: "5 – 20 ha",   plots: 24, status: "Available", style: "bg-green-50 text-green-700" },
                    { category: "Light Industry",         minArea: "1 – 5 ha",    plots: 62, status: "Available", style: "bg-green-50 text-green-700" },
                    { category: "Commercial / Logistics", minArea: "0.5 – 2 ha",  plots: 38, status: "Available", style: "bg-green-50 text-green-700" },
                    { category: "Research & Innovation",  minArea: "0.5 – 1 ha",  plots: 14, status: "Limited",   style: "bg-amber-50 text-amber-700" },
                    { category: "Mixed Use",              minArea: "2 – 8 ha",    plots: 10, status: "Reserved",  style: "bg-blue-50 text-blue-700"   },
                  ].map((row) => (
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
                <h3 className="text-[15px] font-bold text-black">Application Timeline</h3>
              </div>
              <p className="mb-8 text-[13px] text-black/45">Current round — Phase 1</p>
              <ol className="relative border-l-2 border-black/10 pl-6">
                {[
                  { date: "Now",          label: "Application window open — EOI submissions accepted", active: true  },
                  { date: "30 Jun 2026",  label: "Window closes — no further submissions",             active: false },
                  { date: "Jul 2026",     label: "Technical Committee pre-screening",                  active: false },
                  { date: "Aug 2026",     label: "ExCo review and decisions",                          active: false },
                  { date: "Sep 2026",     label: "Letters of Intent issued to successful applicants",  active: false },
                ].map((item, i, arr) => (
                  <li key={i} className={i < arr.length - 1 ? "mb-7" : ""}>
                    <span className={`absolute -left-[9px] mt-0.5 h-4 w-4 rounded-full border-2 ${
                      item.active
                        ? "border-kip-gold bg-kip-gold"
                        : "border-black/20 bg-white"
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
