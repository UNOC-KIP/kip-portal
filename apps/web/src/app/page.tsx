import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CreditCard, FileText, CheckCircle2 } from "lucide-react";
import nodemailer from "nodemailer";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CountdownTimer } from "@/components/countdown-timer";
import { getActiveApplicationWindow } from "@/lib/public-data";

async function subscribeNotifications(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  if (!email || !email.includes("@")) {
    redirect("/?notified=error");
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || "localhost",
      port: parseInt(process.env.EMAIL_SERVER_PORT || "1025"),
      secure: false,
      auth: process.env.EMAIL_SERVER_USER
        ? { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD }
        : undefined,
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@kip.local",
      to: "admin@kip.unoc.co.ug",
      subject: "KIP Portal: New Window Notification Signup",
      html: `<p>Investor signed up for KIP window notifications: <strong>${email}</strong></p>`,
    });
  } catch {
    // non-critical — don't surface errors to user
  }
  redirect("/?notified=1");
}

const PARTNERS = [
  "Uganda National Oil Company",
  "Uganda Refinery Holding Company",
  "Ministry of Energy & Mineral Development",
  "Uganda Investment Authority",
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: { notified?: string };
}) {
  const activeWindow = await getActiveApplicationWindow();
  const notified = searchParams.notified === "1";

  return (
    <div className="min-h-screen font-sans">

      {/* ── Gold zone: navbar + hero + countdown ─────────── */}
      <div className="bg-kip-gold">

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
                industrial park. Express your interest and submit your EOI securely online.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/sign-up"
                  className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110"
                >
                  Start Application
                </Link>
                <Link
                  href="/land-map"
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

        {/* ── Countdown strip ───────────────────────────────── */}
        <div className="mx-auto max-w-[1343px] px-[100px] pb-10">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[5px] bg-white/85 px-8 py-5 shadow-sm backdrop-blur-sm">
            {activeWindow ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                  <div>
                    <p className="text-[16px] font-bold text-black">Application Window Open</p>
                    <p className="text-[14px] text-black/50">{activeWindow.name} · Closes {new Date(activeWindow.closeAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} EAT</p>
                  </div>
                </div>
                <CountdownTimer closeAt={activeWindow.closeAt} variant="hero" />
              </>
            ) : (
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-black/20" />
                  <div>
                    <p className="text-[16px] font-bold text-black">Application Window Closed</p>
                    <p className="text-[14px] text-black/50">No active window — subscribe below to be notified when the next round opens.</p>
                  </div>
                </div>
                <Link href="#notify" className="rounded-[4px] bg-black px-5 py-2 text-[13px] font-bold text-white transition hover:bg-black/80">
                  Get Notified
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>{/* end gold zone */}

      {/* ── Feature cards ────────────────────────────────── */}
      <section className="bg-white pb-16 pt-8">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="grid grid-cols-1 gap-1 md:grid-cols-3">

            {/* Card 1 — Industrial Park */}
            <div className="relative flex h-[644px] flex-col items-start justify-center overflow-hidden rounded-l-[10px] px-10">
              <Image
                src="/kip-infrastructure.jpg"
                alt="KIP Infrastructure"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/65" />
              <div className="relative z-10 max-w-[260px]">
                <Building2 size={24} className="mb-5 text-white" />
                <h3 className="text-[20px] font-bold leading-snug text-white">Industrial Park</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-white/65">
                  Over 2,200 hectares of planned, serviced industrial land at Kabalega,
                  Western Uganda — adjacent to the EACOP pipeline corridor.
                </p>
              </div>
            </div>

            {/* Card 2 — Application Fee */}
            <div className="flex h-[644px] flex-col items-start justify-center bg-kip-red px-10">
              <CreditCard size={24} className="mb-5 text-white" />
              <h3 className="text-[20px] font-bold leading-snug text-white">Application Fee</h3>
              <p className="mt-2 max-w-[260px] text-[16px] leading-relaxed text-white/65">
                A non-refundable fee of USD 1,000 is required per application, payable
                by direct bank transfer to our Stanbic Bank account.
              </p>
            </div>

            {/* Card 3 — EOI Process */}
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

      {/* ── Credibility bar ──────────────────────────────── */}
      <section className="border-y border-black/8 bg-white py-7">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-widest text-black/30">
            Backed by Uganda&apos;s leading energy institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {PARTNERS.map((name) => (
              <span
                key={name}
                className="text-[13px] font-semibold text-black/40 transition hover:text-black/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── About KIP ───────────────────────────────────── */}
      <section id="about" className="scroll-mt-20 bg-ink-100 py-20">
        <div className="mx-auto max-w-[1343px] px-[100px]">

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
              { value: "221",   unit: "",      label: "Serviced Plots" },
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

      {/* ── What you'll need strip ───────────────────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-ink-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/60">
                <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />
                Pre-Application Checklist
              </span>
              <h2 className="mt-4 text-[30px] font-extrabold leading-tight text-black">
                What you&apos;ll need<br />before you start.
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-black/55">
                Have these ready before registering to avoid delays mid-application.
              </p>
              <div className="mt-5">
                <Link
                  href="/how-it-works"
                  className="text-[13px] font-semibold text-kip-red underline underline-offset-4 hover:brightness-110"
                >
                  View the full process →
                </Link>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                "Certificate of Incorporation (or equivalent)",
                "Company registration number and country",
                "Primary contact name and email address",
                "Brief description of proposed investment activity",
                "Estimated land area requirement (hectares)",
                "Proof of Stanbic Bank transfer — USD 1,000 application fee",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-[5px] border border-black/6 bg-ink-100/50 px-5 py-3.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                  <span className="text-[14px] text-black/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Notify me ───────────────────────────────────── */}
      <section id="notify" className="scroll-mt-20 bg-black py-16 text-white">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-[28px] font-extrabold leading-snug">
                Not ready yet?<br />
                <span className="text-kip-gold">We&apos;ll let you know.</span>
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-white/55">
                Enter your email to be notified when the next KIP application window opens.
                No spam — just one email when a new round begins.
              </p>
            </div>
            <div>
              {notified ? (
                <div className="flex items-center gap-3 rounded-[5px] border border-green-500/30 bg-green-900/20 px-6 py-5">
                  <CheckCircle2 size={20} className="shrink-0 text-green-400" />
                  <div>
                    <p className="font-semibold text-green-300">You&apos;re on the list.</p>
                    <p className="text-[13px] text-white/50">We&apos;ll email you when the next window opens.</p>
                  </div>
                </div>
              ) : (
                <form action={subscribeNotifications} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="your@company.com"
                    className="flex-1 rounded-[4px] border border-white/15 bg-white/10 px-4 py-3 text-[14px] text-white placeholder-white/30 outline-none transition focus:border-kip-gold focus:ring-1 focus:ring-kip-gold/30"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-[4px] bg-kip-gold px-7 py-3 text-[14px] font-bold text-black transition hover:brightness-105"
                  >
                    Notify Me
                  </button>
                </form>
              )}
              <p className="mt-3 text-[12px] text-white/30">
                By submitting you agree to our{" "}
                <Link href="/privacy" className="underline hover:text-white/60">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}
