import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ChevronDown } from "lucide-react";

type FAQ = { q: string; a: string };

const CATEGORIES: { title: string; items: FAQ[] }[] = [
  {
    title: "Application Process",
    items: [
      {
        q: "What is the Kabalega Petro-Based Industrial Park (KIP)?",
        a: "KIP is Uganda's first petroleum-integrated industrial park, located in Hoima District, Western Uganda. Developed by UNOC and URHC, it provides serviced industrial land to companies operating across the oil and gas value chain, as well as related manufacturing, logistics, and services sectors.",
      },
      {
        q: "Who can apply for a plot at KIP?",
        a: "Any legally incorporated company — Ugandan or foreign — that is involved in, or plans to be involved in, the petroleum value chain or related industries. You must meet the eligibility criteria and pay the non-refundable application fee of USD 1,000.",
      },
      {
        q: "What is an Expression of Interest (EOI)?",
        a: "An EOI is the formal application document that investors submit to UNOC/URHC to express their intent to invest at KIP. It covers six sections: Preliminary Information, Land & Business Profile, Utilities & Infrastructure, H3SE, National Content, and Declaration.",
      },
      {
        q: "Can I save my EOI and complete it over multiple sessions?",
        a: "Yes. Your progress is saved automatically after each section. You can log back in at any time before the window closes to continue. Only completed, submitted EOIs are reviewed.",
      },
      {
        q: "Can I submit more than one EOI?",
        a: "One EOI per registered investor organisation per application window.",
      },
      {
        q: "What happens after the application window closes?",
        a: "Once the window closes, no further submissions are accepted. The Technical Committee begins reviewing submitted EOIs, typically within 2–4 weeks of window closure.",
      },
    ],
  },
  {
    title: "Fees & Payments",
    items: [
      {
        q: "How much is the application fee?",
        a: "The non-refundable application fee is USD 1,000 (or equivalent in UGX at the prevailing Bank of Uganda rate). This fee is required before you can begin filling your EOI.",
      },
      {
        q: "Is the application fee refundable?",
        a: "No. The USD 1,000 application fee is non-refundable regardless of the outcome of the review process, including if your application is not shortlisted.",
      },
      {
        q: "What payment method is accepted?",
        a: "Payment is by direct Stanbic Bank transfer only. Transfer USD 1,000 to the UNOC Stanbic account provided in the portal, then upload your proof of transfer. An admin will confirm within 1–2 business days.",
      },
      {
        q: "My bank transfer was confirmed but my application still shows 'Payment Pending'. What do I do?",
        a: "Bank transfers are confirmed manually by the UNOC admin team within 1–2 business days of receiving proof of payment. If more than 2 business days have passed, please contact us at kip@unoc.co.ug with your reference and payment proof.",
      },
    ],
  },
  {
    title: "Review & Decisions",
    items: [
      {
        q: "How does the review process work?",
        a: "Submitted EOIs are reviewed in three stages: (1) Technical Committee (TC) — screens and scores applications, shortlists or rejects; (2) Land Allocation Committee (LAC) — reviews shortlisted applications and makes recommendations; (3) Executive Committee (ExCo) — ratifies final allocation decisions.",
      },
      {
        q: "How long does the review take?",
        a: "The full review process — from window closure to final ExCo decisions — typically takes 8–16 weeks. Letters of Intent are issued to successful applicants within 4 weeks of ExCo decisions.",
      },
      {
        q: "What if the TC requests clarification on my application?",
        a: "You will receive an in-portal notification and email requesting specific clarification. You must respond within the deadline stated in the request. Failure to respond may result in your application not being shortlisted.",
      },
      {
        q: "Can I appeal a rejection decision?",
        a: "ExCo decisions are final and there is no formal appeal process within the current round. You are welcome to apply in a subsequent round if one is opened.",
      },
    ],
  },
  {
    title: "Land & Leases",
    items: [
      {
        q: "What is the minimum plot size?",
        a: "Minimum sizes vary by zone: Heavy Industry (5 ha), Light Industry (1 ha), Commercial/Logistics (0.5 ha), Research & Innovation (0.5 ha), Mixed Use (2 ha). Maximum sizes also apply — see the For Investors page for details.",
      },
      {
        q: "How long is the land lease?",
        a: "Land leases are issued for up to 49 years and are renewable. The exact term is determined during the allocation process based on investment type and land category.",
      },
      {
        q: "What infrastructure is provided?",
        a: "KIP plots are fully serviced with: paved internal roads, high-voltage power (132 kV), treated water supply, industrial wastewater treatment, and fibre optic connectivity. Each investor is responsible for their own plot development.",
      },
      {
        q: "Are there annual land rent charges?",
        a: "Yes. Annual land rent is charged based on plot size and zone category. Rates are published in the KIP Land Allocation Policy and are payable to URHC. Specific amounts will be communicated in your Letter of Intent.",
      },
    ],
  },
  {
    title: "Technical & Account",
    items: [
      {
        q: "I didn't receive my account activation email. What should I do?",
        a: "Account activations are processed manually by the UNOC admin team within 1–2 business days. Check your spam/junk folder. If you still haven't received it after 2 business days, email kip@unoc.co.ug with your registered email address.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "Use the 'Forgot Password' link on the sign-in page to request a magic link to your registered email. If you no longer have access to that email, contact kip@unoc.co.ug.",
      },
      {
        q: "Which browsers are supported?",
        a: "The portal supports all modern browsers: Chrome, Firefox, Safari, and Edge (latest two versions). JavaScript must be enabled. Internet Explorer is not supported.",
      },
      {
        q: "What file formats are accepted for document uploads?",
        a: "The portal accepts PDF, JPEG, and PNG files. Maximum file size per upload is 10 MB.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen font-sans">

      {/* Gold hero */}
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Support
          </span>
          <h1 className="mt-4 text-[48px] font-extrabold leading-tight tracking-tight text-black">
            Frequently Asked<br />
            <span className="text-kip-red">Questions.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-black/60">
            Everything you need to know about applying to KIP, paying fees, the
            review process, and land allocation.
          </p>
        </div>
      </div>

      {/* Category nav */}
      <div className="sticky top-0 z-30 border-b border-black/8 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="flex gap-6 overflow-x-auto py-4">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.title}
                href={`#${cat.title.toLowerCase().replace(/\s+&?\s*/g, "-")}`}
                className="shrink-0 rounded-full border border-black/15 px-4 py-1.5 text-[12px] font-semibold text-black/60 transition hover:border-black hover:text-black"
              >
                {cat.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Questions */}
      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-[100px]">
          <div className="space-y-14">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                id={cat.title.toLowerCase().replace(/\s+&?\s*/g, "-")}
                className="scroll-mt-20"
              >
                <h2 className="mb-6 text-[20px] font-extrabold text-black">{cat.title}</h2>
                <div className="overflow-hidden rounded-[5px] border border-black/8 bg-white">
                  {cat.items.map((item, i) => (
                    <details
                      key={i}
                      className="group border-b border-black/6 last:border-b-0"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between px-7 py-5 text-[14px] font-semibold text-black transition hover:bg-ink-100/50">
                        <span className="pr-8">{item.q}</span>
                        <ChevronDown
                          size={16}
                          className="shrink-0 text-black/40 transition-transform duration-200 group-open:rotate-180"
                        />
                      </summary>
                      <div className="px-7 pb-6 pt-0">
                        <p className="text-[14px] leading-relaxed text-black/60">{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Still have questions */}
          <div className="mt-14 rounded-[5px] border border-black/8 bg-black p-10 text-center text-white">
            <h3 className="text-[22px] font-extrabold">Still have questions?</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-white/55">
              Our team is available Monday to Friday, 8 AM – 5 PM EAT.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-[4px] bg-kip-gold px-7 py-2.5 text-[13px] font-bold text-black transition hover:brightness-105"
              >
                Contact Us
              </Link>
              <Link
                href="/help"
                className="rounded-[4px] border border-white/25 px-7 py-2.5 text-[13px] font-semibold text-white transition hover:border-white"
              >
                Help Centre
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
