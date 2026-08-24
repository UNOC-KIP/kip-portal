import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { EoiGuideCallout } from "@/components/eoi-guide-callout";
import { SiteFooter } from "@/components/site-footer";
import { SiteVisitCta } from "@/components/site-visit-cta";
import { UserPlus, CreditCard, FileText, Send, ClipboardList, Award, CheckCircle2, type LucideIcon } from "lucide-react";

// The site-visit CTAs are gated on the booking window, read from the DB on
// every request — static generation would bake in whichever state was true at
// build time (and CI builds have no database at all).
export const dynamic = "force-dynamic";

type Step = {
  number: string;
  icon: LucideIcon;
  title: string;
  duration: string;
  description: string;
  items: string[];
  /** `siteVisit` routes through the booking-window gate instead of a plain link. */
  cta?: { label: string; href: string; siteVisit?: boolean };
};

const STEPS: Step[] = [
  {
    number: "01", icon: UserPlus, title: "Register & Verify Your Account", duration: "~5 minutes",
    description: "Create your investor account using your company email address. Provide your organisation's legal name and basic details. Your account is reviewed by the UNOC team, and once approved you will receive your login credentials by email.",
    items: ["Company name and country of incorporation", "Primary contact email address", "Account reviewed and activated by UNOC admin"],
    cta: { label: "Create Account", href: "/sign-up" },
  },
  {
    number: "02", icon: FileText, title: "Complete Your EOI Form", duration: "Several days",
    description: "Your Expression of Interest covers six structured sections. You can save progress and return at any time before the window closes. All six sections must be complete before you can submit.",
    items: ["Section 1 — Preliminary Information", "Section 2 — Land & Business Profile", "Section 3 — Utilities & Infrastructure Requirements", "Section 4 — Health, Safety, Security & Environment (H3SE)", "Section 5 — National Content Plan", "Section 6 — Declaration & Certification"],
  },
  {
    number: "03", icon: CreditCard, title: "Pay the Application Fee", duration: "1–2 business days",
    description: "A non-refundable application fee of USD 1,000 (or equivalent UGX) is required before you can submit your EOI. Make a direct bank transfer to the UNOC Stanbic Bank account and upload your proof of payment in the portal.",
    items: ["Non-refundable fee: USD 1,000", "Payment method: direct Stanbic Bank transfer only", "Upload proof of transfer — confirmed by UNOC admin within 1–2 business days"],
  },
  
  {
    number: "04", icon: Send, title: "Submit Your EOI", duration: "Instant",
    description: "Once all six sections are complete and the application window is still open, click Submit to finalise your EOI. You will receive a unique reference number (KIP-EOI-YYYY-NNNN) confirming your submission.",
    items: ["Submission only available while the application window is open", "All 6 sections must be completed", "Your reference number is generated automatically on submission"],
  },
  {
    number: "05", icon: ClipboardList, title: "Technical Committee Review", duration: "~4 weeks",
    description: "After the window closes, the Technical Committee (TC) reviews and scores all submitted EOIs. The TC may shortlist your application, request clarification, or mark it as not shortlisted. Shortlisted applications proceed to the Land Allocation Committee (LAC).",
    items: ["TC reviews applications for completeness and technical merit", "You may be contacted for clarification", "Shortlisted applications proceed to LAC review"],
  },
  {
    number: "06", icon: Award, title: "ExCo Decision & Land Allocation", duration: "~4–8 weeks after TC",
    description: "The Land Allocation Committee makes a recommendation, which the Executive Committee (ExCo) ratifies. Successful investors receive a Letter of Intent (LOI) followed by a formal land lease agreement for their allocated plot.",
    items: ["LAC approves or rejects applications reviewed by TC", "ExCo ratifies final allocation decisions", "Successful applicants receive a Letter of Intent"],
    cta: { label: "Book Site Visit", href: "/dashboard/site-visit", siteVisit: true },
  },
];

const FAQS = [
  { q: "Can I save my EOI and come back later?", a: "Yes. Your progress is auto-saved after every section. You can log back in at any time before the window closes to continue." },
  { q: "What happens if the window closes before I submit?", a: "Submissions are not accepted after the window closes. Monitor the countdown on our home page and plan accordingly." },
  { q: "Is the application fee refundable?", a: "No. The USD 1,000 application fee is non-refundable regardless of the outcome of the review process." },
  { q: "Can I submit more than one EOI?", a: "One EOI per registered investor organisation per application window." },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            The Process
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            How the KIP<br />
            <span className="text-kip-red">Application Works.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] font-medium leading-relaxed text-black/75">
            Six clear steps from registration to land allocation. The entire journey is managed online through this portal.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/sign-up" className="rounded-[4px] bg-kip-red px-7 py-3 text-[14px] font-bold text-white transition hover:brightness-110">Create Account</Link>
            <Link href="/faq" className="rounded-[4px] border-2 border-black/70 px-7 py-3 text-[14px] font-bold text-black transition hover:bg-black/10">View FAQ</Link>
          </div>
        </div>
      </div>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <EoiGuideCallout className="mb-14" />

          <div className="mb-14 hidden items-center gap-0 md:flex">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[12px] font-black text-white">{step.number}</div>
                </div>
                {i < STEPS.length - 1 && <div className="mx-1 h-px flex-1 bg-black/15" />}
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isEven = i % 2 === 1;
              return (
                <div key={step.number} className={`rounded-[5px] border border-black/8 p-8 ${isEven ? "bg-ink-100" : "bg-white"}`}>
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr]">
                    <div>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-[48px] font-black leading-none text-black/8">{step.number}</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/30">
                          <Icon size={20} className="text-black/70" />
                        </div>
                      </div>
                      <h2 className="text-[20px] font-bold leading-snug text-black">{step.title}</h2>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-black/55">
                        <span className="h-1.5 w-1.5 rounded-full bg-kip-gold" />{step.duration}
                      </p>
                    </div>
                    <div>
                      <p className="mb-5 text-[14px] leading-relaxed text-black/70">{step.description}</p>
                      <ul className="space-y-2.5">
                        {step.items.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-600" />
                            <span className="text-[14px] text-black/70">{item}</span>
                          </li>
                        ))}
                      </ul>
                      {step.cta && (
                        <div className="mt-6">
                          {step.cta.siteVisit ? (
                            <SiteVisitCta
                              className="inline-block rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
                              closed={{ href: "/contact", label: "Contact Us →" }}
                            >
                              {step.cta.label} →
                            </SiteVisitCta>
                          ) : (
                            <Link href={step.cta.href} className="inline-block rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110">
                              {step.cta.label} →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="mb-10">
            <h2 className="text-[28px] font-extrabold text-black">Common Questions</h2>
            <p className="mt-2 text-[14px] text-black/60">Quick answers about the application process.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-[5px] border border-black/8 bg-white p-6">
                <p className="mb-2 text-[14px] font-semibold text-black">{q}</p>
                <p className="text-[13px] leading-relaxed text-black/65">{a}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/faq" className="text-[14px] font-semibold text-black underline underline-offset-4 hover:text-kip-red">View all FAQs →</Link>
          </div>
        </div>
      </section>

      <section className="bg-black py-16 text-white">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] text-center">
          <h2 className="text-[32px] font-extrabold">Ready to apply?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">Registration is open now. The Call for Expressions of Interest runs 19 August to 2 September 2026.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {/* Hidden once bookings close — "Contact Us" already covers it. */}
            <SiteVisitCta className="rounded-[4px] bg-kip-gold px-8 py-3 text-[14px] font-bold text-black transition hover:brightness-105" closed={null} />
            <Link href="/contact" className="rounded-[4px] border border-white/30 px-8 py-3 text-[14px] font-semibold text-white transition hover:border-white">Contact Us</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
