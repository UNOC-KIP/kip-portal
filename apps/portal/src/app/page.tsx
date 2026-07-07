import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileText,
  CheckCircle2,
  ArrowRight,
  Factory,
  Fuel,
  Plane,
  Boxes,
  Wheat,
  Store,
  Home as HomeIcon,
  Cpu,
} from "lucide-react";
import nodemailer from "nodemailer";
import { NotifySignup } from "@kip/db";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CountdownTimer } from "@/components/countdown-timer";
import { HeroCarousel } from "@/components/hero-carousel";
import { getActiveApplicationWindow } from "@/lib/public-data";
import { EOI_CALL, getPhase2Timeline } from "@/lib/timeline";

// Renders live window data from the DB — must not be statically generated at
// build time (Docker/CI builds have no database).
export const dynamic = "force-dynamic";

async function subscribeNotifications(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    redirect("/?notified=error");
    return;
  }
  // Persist first — the admin console tracks signups from the DB, so the
  // address is never lost even when email delivery is unavailable.
  try {
    await NotifySignup.findOrCreate({ where: { email }, defaults: { email } });
  } catch {
    // fall through to the email attempt
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
      to: "kipinvestorrelations@unoc.com",
      subject: "KIP Investor Portal: New Window Notification Signup",
      html: `<p>Investor signed up for KIP window notifications: <strong>${email}</strong></p>`,
    });
  } catch {
    // non-critical
  }
  redirect("/?notified=1");
}

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: { notified?: string };
}) {
  const activeWindow = await getActiveApplicationWindow();
  const notified = searchParams.notified === "1";

  return (
    <div className="min-h-screen font-sans">

      <div className="relative overflow-hidden">
        <HeroCarousel />

        <div className="relative z-10">
        <SiteNav />

        <section>
          <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-14 pb-10">
            <div className="max-w-2xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
                Kabaale, Hoima · Western Uganda
              </span>
              <h1 className="text-[38px] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-lg sm:text-[52px] lg:text-[64px]">
                Kabalega<br />
                Petro-Based<br />
                <span className="text-kip-gold">Industrial Park.</span>
              </h1>
              <p className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-white/90 drop-shadow">
                Uganda&apos;s flagship smart &amp; eco-industrial hub — 29.57 km² anchored by a
                60,000 bpd refinery. Express your interest and submit your EOI securely online.
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
                  className="rounded-[4px] border-2 border-white/80 px-7 py-3 text-[14px] font-bold text-white transition hover:bg-white/10"
                >
                  View Land Map
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pb-10">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[5px] bg-white/85 px-5 py-5 shadow-sm backdrop-blur-sm sm:px-8">
            {activeWindow ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                  <div>
                    <p className="text-[16px] font-bold text-black">Application Window Open</p>
                    <p className="text-[14px] text-black/60">
                      {activeWindow.name} · Closes{" "}
                      {new Date(activeWindow.closeAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      EAT
                    </p>
                  </div>
                </div>
                <CountdownTimer closeAt={activeWindow.closeAt} variant="hero" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-kip-gold" />
                  <div>
                    <p className="text-[16px] font-bold text-black">Call for Expressions of Interest</p>
                    <p className="text-[14px] text-black/60">
                      Opens {EOI_CALL.opensLabel} · Closes {EOI_CALL.closesLabel} EAT ·{" "}
                      <Link href="#notify" className="font-semibold text-kip-red underline underline-offset-2 hover:brightness-90">
                        Get notified
                      </Link>
                    </p>
                  </div>
                </div>
                <CountdownTimer closeAt={EOI_CALL.opensAt} variant="hero" expiredText="EOI window opening soon" />
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Feature cards */}
      <section className="bg-white pb-16 pt-8">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
            {/* Industrial Park */}
            <div className="relative flex min-h-[380px] flex-col items-start justify-center overflow-hidden rounded-t-[10px] px-6 py-12 sm:px-10 md:h-[644px] md:rounded-t-none md:rounded-l-[10px] md:py-0">
              <Image src="/kip-infrastructure.jpg" alt="KIP Infrastructure" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/70" />
              <div className="relative z-10 max-w-[280px]">
                <Building2 size={26} className="mb-5 text-kip-gold" />
                <h3 className="text-[21px] font-bold leading-snug text-white">Industrial Park</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-white/90">
                  Over 7,300 acres of planned, serviced industrial land at Kabalega, Western
                  Uganda — adjacent to the EACOP pipeline corridor.
                </p>
                <Link
                  href="/land-map"
                  className="mt-6 inline-flex items-center gap-2 rounded-[4px] bg-white px-5 py-2.5 text-[13px] font-bold text-black transition hover:bg-kip-gold"
                >
                  Explore the land map <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Application Fee */}
            <div className="flex min-h-[380px] flex-col items-start justify-center bg-kip-red px-6 py-12 sm:px-10 md:h-[644px] md:py-0">
              <CreditCard size={26} className="mb-5 text-white" />
              <h3 className="text-[21px] font-bold leading-snug text-white">Application Fee</h3>
              <p className="mt-3 max-w-[280px] text-[16px] leading-relaxed text-white/90">
                A non-refundable fee of USD 1,000 is required per application, payable by direct
                bank transfer to our Stanbic Bank account.
              </p>
              <Link
                href="/sign-up"
                className="mt-6 inline-flex items-center gap-2 rounded-[4px] bg-white px-5 py-2.5 text-[13px] font-bold text-kip-red transition hover:bg-black hover:text-white"
              >
                Start your application <ArrowRight size={15} />
              </Link>
            </div>

            {/* EOI Process */}
            <div className="relative flex min-h-[380px] flex-col items-start justify-center overflow-hidden rounded-b-[10px] px-6 py-12 sm:px-10 md:h-[644px] md:rounded-b-none md:rounded-r-[10px] md:py-0">
              <Image src="/kip-refinery.jpg" alt="EOI Process" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/70" />
              <div className="relative z-10 max-w-[280px]">
                <FileText size={26} className="mb-5 text-kip-gold" />
                <h3 className="text-[21px] font-bold leading-snug text-white">EOI Process</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-white/90">
                  Submit a six-section Expression of Interest covering company profile, land
                  requirements, utilities, H3SE, national content, and declaration.
                </p>
                <Link
                  href="/how-it-works"
                  className="mt-6 inline-flex items-center gap-2 rounded-[4px] bg-white px-5 py-2.5 text-[13px] font-bold text-black transition hover:bg-kip-gold"
                >
                  See the 6 steps <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Credibility bar */}
      <section className="border-y border-black/8 bg-white py-7">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-widest text-black/40">
            Backed by Uganda&apos;s leading energy institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
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
      </section>

      {/* About KIP */}
      <section id="about" className="scroll-mt-20 bg-ink-100 py-20">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-12">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
              About The Park
            </span>
            <h2 className="mt-4 text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-black">
              A catalyst for Uganda&apos;s{" "}
              <span className="text-kip-red">industrial future.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/65">
              Developed by the Uganda Refinery Holding Company, KIP promotes petrochemical value
              addition, attracts foreign and domestic investment, and creates sustainable
              employment — anchored in Uganda&apos;s Vision 2040 and the National Development Plan.
            </p>
          </div>

          <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-black/8 bg-black/8 md:grid-cols-4">
            {[
              { value: "29.57", unit: "km²", label: "Total Area" },
              { value: "60,000", unit: "bpd", label: "Refinery Capacity" },
              { value: "6", unit: "", label: "Investment Zones" },
              { value: "USD 1B", unit: "+", label: "Target Investment" },
            ].map((s) => (
              <div key={s.label} className="bg-white px-4 py-6 text-center sm:px-8 sm:py-8">
                <p className="text-[28px] sm:text-[38px] font-extrabold leading-none text-black">
                  {s.value}<span className="text-kip-red">{s.unit}</span>
                </p>
                <p className="mt-2 text-[13px] text-black/60">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Anchor infrastructure */}
          <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Investment zones */}
            <div className="rounded-[5px] border border-black/8 bg-white p-8">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-black" />
                <h3 className="text-[15px] font-bold text-black">Investment Zones</h3>
              </div>
              <p className="mb-6 text-[13px] text-black/55">Six planned zones spanning the full industrial value chain</p>
              <ul className="space-y-4">
                {ZONES.map(({ icon: Icon, name, detail }) => (
                  <li key={name} className="flex items-start gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-ink-100">
                      <Icon size={17} className="text-black/70" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-black">{name}</p>
                      <p className="text-[13px] leading-relaxed text-black/60">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Link href="/sign-up" className="inline-block rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110">
                  Start Application
                </Link>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-[5px] border border-black/8 bg-white p-8">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-kip-gold" />
                <h3 className="text-[15px] font-bold text-black">Application Timeline</h3>
              </div>
              <p className="mb-8 text-[13px] text-black/55">Phase 2 — Investor Onboarding</p>
              <ol className="relative border-l-2 border-black/10 pl-6">
                {getPhase2Timeline(new Date()).map((item, i, arr) => (
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

          <div className="mt-10 text-center">
            <Link href="/about" className="inline-flex items-center gap-2 text-[14px] font-bold text-kip-red transition hover:brightness-90">
              Learn more about the park <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* What you'll need */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-ink-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
                <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />
                Pre-Application Checklist
              </span>
              <h2 className="mt-4 text-[30px] font-extrabold leading-tight text-black">
                What you&apos;ll need<br />before you start.
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-black/65">
                Have these ready before registering to avoid delays mid-application.
              </p>
              <div className="mt-5">
                <Link href="/how-it-works" className="text-[13px] font-semibold text-kip-red underline underline-offset-4 hover:brightness-110">
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
                  <span className="text-[14px] text-black/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Notify me */}
      <section id="notify" className="scroll-mt-20 bg-black py-16 text-white">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-[28px] font-extrabold leading-snug">
                Not ready yet?<br />
                <span className="text-kip-gold">We&apos;ll let you know.</span>
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-white/70">
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
                    <p className="text-[13px] text-white/60">We&apos;ll email you when the next window opens.</p>
                  </div>
                </div>
              ) : (
                <form action={subscribeNotifications} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="your@company.com"
                    className="flex-1 rounded-[4px] border border-white/15 bg-white/10 px-4 py-3 text-[14px] text-white placeholder-white/40 outline-none transition focus:border-kip-gold focus:ring-1 focus:ring-kip-gold/30"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-[4px] bg-kip-gold px-7 py-3 text-[14px] font-bold text-black transition hover:brightness-105"
                  >
                    Notify Me
                  </button>
                </form>
              )}
              <p className="mt-3 text-[12px] text-white/40">
                By submitting you agree to our{" "}
                <Link href="/privacy" className="underline hover:text-white/70">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
