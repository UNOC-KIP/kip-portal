import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { UserCircle, CreditCard, FileText, Send, Settings, ShieldCheck, ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    icon: UserCircle, title: "Getting Started", slug: "getting-started",
    description: "Account registration, verification, and your first login.",
    articles: [
      { title: "How to create an investor account", href: "/faq#application-process" },
      { title: "Why is my account pending activation?", href: "/faq#application-process" },
      { title: "How do I sign in for the first time?", href: "/faq#technical-&-account" },
      { title: "Resetting your password", href: "/faq#technical-&-account" },
    ],
  },
  {
    icon: CreditCard, title: "Payments & Fees", slug: "payments",
    description: "Paying the application fee, supported methods, and confirmation.",
    articles: [
      { title: "How to pay via Stanbic bank transfer", href: "/faq#fees-&-payments" },
      { title: "My payment is still pending after 2 days", href: "/faq#fees-&-payments" },
      { title: "Is the application fee refundable?", href: "/faq#fees-&-payments" },
      { title: "What is the payment reference for?", href: "/faq#fees-&-payments" },
    ],
  },
  {
    icon: FileText, title: "Completing Your EOI", slug: "eoi",
    description: "Filling, saving, and managing your six-section Expression of Interest.",
    articles: [
      { title: "Overview of the six EOI sections", href: "/faq#application-process" },
      { title: "How to save and resume your application", href: "/faq#application-process" },
      { title: "Uploading supporting documents", href: "/faq#technical-&-account" },
      { title: "What file formats are accepted?", href: "/faq#technical-&-account" },
    ],
  },
  {
    icon: Send, title: "Submitting Your EOI", slug: "submission",
    description: "Finalising and submitting your completed application.",
    articles: [
      { title: "How to submit your completed EOI", href: "/faq#application-process" },
      { title: "What is a reference number?", href: "/faq#application-process" },
      { title: "Can I edit my EOI after submission?", href: "/faq#application-process" },
      { title: "What happens after submission?", href: "/faq#application-process" },
    ],
  },
  {
    icon: ShieldCheck, title: "Review & Decisions", slug: "review",
    description: "Understanding the TC, LAC, and ExCo review pipeline.",
    articles: [
      { title: "How the three-stage review works", href: "/faq#review-&-decisions" },
      { title: "What is a clarification request?", href: "/faq#review-&-decisions" },
      { title: "How long does review take?", href: "/faq#review-&-decisions" },
      { title: "Understanding your application status", href: "/faq#review-&-decisions" },
    ],
  },
  {
    icon: Settings, title: "Technical Support", slug: "technical",
    description: "Browser compatibility, file uploads, and account issues.",
    articles: [
      { title: "Supported browsers", href: "/faq#technical-&-account" },
      { title: "The portal won't load — what should I do?", href: "/contact" },
      { title: "I'm getting an error uploading a document", href: "/contact" },
      { title: "My session keeps expiring", href: "/faq#technical-&-account" },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Help Centre
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            How can we<br />
            <span className="text-kip-red">help you?</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-black/75">Browse help articles by category or contact our team directly.</p>
          <Link href="/faq" className="mt-7 flex w-full max-w-lg items-center gap-3 rounded-[4px] border-2 border-black/20 bg-white px-5 py-3 text-[14px] text-black/40 transition hover:border-black/40">
            <svg className="h-4 w-4 shrink-0 text-black/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            Search help articles…
          </Link>
        </div>
      </div>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(({ icon: Icon, title, description, articles }) => (
              <div key={title} id={title.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-20 rounded-[5px] border border-black/8 bg-white">
                <div className="border-b border-black/6 px-7 py-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[4px] bg-kip-gold/25"><Icon size={18} className="text-black/70" /></div>
                  <h2 className="text-[15px] font-bold text-black">{title}</h2>
                  <p className="mt-1 text-[12px] text-black/60">{description}</p>
                </div>
                <ul className="px-7 py-4">
                  {articles.map(({ title: art, href }) => (
                    <li key={art}>
                      <Link href={href} className="flex items-center justify-between py-2.5 text-[13px] text-black/65 transition hover:text-black">
                        {art}
                        <ArrowRight size={13} className="shrink-0 text-black/25" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex items-center gap-6 rounded-[5px] border border-black/8 bg-white p-7">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] bg-kip-red/10">
                <svg className="h-5 w-5 text-kip-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-bold text-black">Email Support</p>
                <p className="mt-0.5 text-[13px] text-black/60">Get a response within 1–2 business days.</p>
                <Link href="/contact" className="mt-2 inline-block text-[13px] font-semibold text-kip-red hover:underline">Send a message →</Link>
              </div>
            </div>
            <div className="flex items-center gap-6 rounded-[5px] border border-black/8 bg-white p-7">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] bg-kip-gold/20">
                <svg className="h-5 w-5 text-black/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-bold text-black">Browse FAQ</p>
                <p className="mt-0.5 text-[13px] text-black/60">Quick answers to common questions.</p>
                <Link href="/faq" className="mt-2 inline-block text-[13px] font-semibold text-kip-red hover:underline">View FAQ →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
