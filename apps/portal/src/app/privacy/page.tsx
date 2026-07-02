import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const EFFECTIVE_DATE = "25 June 2026";
const CONTACT_EMAIL  = "privacy@unoc.co.ug";

const SECTIONS = [
  {
    title: "1. Who We Are",
    body: `This Privacy Policy applies to the KIP Investor Portal ("Portal"), operated by Uganda National Oil Company Limited ("UNOC") and Uganda Refinery Holding Company Limited ("URHC"), collectively referred to as "we", "us", or "our".

UNOC is incorporated under the Companies Act (Uganda) and is a wholly owned government enterprise under the Ministry of Energy and Mineral Development.

For privacy inquiries, contact our Data Protection Officer at ${CONTACT_EMAIL}.`,
  },
  {
    title: "2. Information We Collect",
    body: `We collect information you provide directly when you:

• Register for an investor account (name, company name, email address, country of incorporation, phone number)
• Complete an Expression of Interest (EOI), including company profile, land requirements, utility needs, H3SE plans, and national content details
• Make a payment (payment reference, proof of payment document; we do not store card numbers)
• Upload documents (Certificate of Incorporation, company registration documents, payment proofs)
• Contact our support team

We also collect certain technical information automatically: IP address, browser type and version, device type, pages visited, and session duration. This is used solely for security and performance monitoring.`,
  },
  {
    title: "3. How We Use Your Information",
    body: `We use your personal information to:

• Process your investor account registration and activation
• Enable you to complete and submit your Expression of Interest
• Process and confirm application fee payments
• Communicate with you about your application status, clarification requests, and decisions
• Notify you of relevant application window openings and policy updates
• Maintain the security and integrity of the Portal
• Comply with our legal obligations under Ugandan law, including the Uganda Investment Authority Act and the Data Protection and Privacy Act 2019 (DPPA)
• Conduct internal analytics and improve Portal performance

We do not use your information for advertising, profiling unrelated to the application process, or sale to third parties.`,
  },
  {
    title: "4. Legal Basis for Processing",
    body: `Under Uganda's Data Protection and Privacy Act 2019, we process your personal data on the following lawful bases:

• Contractual necessity — to process your application and manage your investor account
• Legal obligation — to comply with Uganda Investment Authority requirements and other statutory obligations
• Legitimate interests — to maintain portal security and prevent fraud
• Consent — where we request specific optional permissions (e.g. marketing communications)`,
  },
  {
    title: "5. How We Share Your Information",
    body: `We may share your information in the following limited circumstances:

• Within UNOC and URHC for the purposes described above
• With government bodies including the Uganda Investment Authority, Ministry of Energy and Mineral Development, and other statutory agencies, as required by law
• With technical service providers who host and maintain the Portal (subject to data processing agreements that prohibit independent use)
• With our automated notification systems (email delivery providers) to send you application status updates
• If required by law, court order, or regulatory authority

We do not sell your personal information to any third party.`,
  },
  {
    title: "6. Data Retention",
    body: `We retain your personal data for as long as necessary to fulfil the purposes outlined in this policy or as required by Ugandan law. Specifically:

• Active investor accounts: retained for the duration of your relationship with KIP/UNOC
• Rejected or withdrawn applications: retained for 5 years from the date of rejection/withdrawal for audit and compliance purposes
• Successful allocation records: retained for the duration of the land lease plus 7 years
• Technical logs: retained for 12 months

After the applicable retention period, data is securely deleted or anonymised.`,
  },
  {
    title: "7. Your Rights",
    body: `Under the Uganda Data Protection and Privacy Act 2019, you have the right to:

• Access — request a copy of the personal data we hold about you
• Rectification — request correction of inaccurate or incomplete data
• Erasure — request deletion of your data (subject to our legal retention obligations)
• Restriction — request that we limit processing of your data
• Objection — object to processing based on legitimate interests
• Data portability — receive your data in a structured, machine-readable format

To exercise any of these rights, contact our Data Protection Officer at ${CONTACT_EMAIL}. We will respond within 21 days. There is no charge for exercising these rights.`,
  },
  {
    title: "8. Cookies & Tracking",
    body: `The Portal uses strictly necessary session cookies to maintain your authenticated session. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.

A session cookie is deleted automatically when you close your browser. We do not use persistent tracking cookies.`,
  },
  {
    title: "9. Security",
    body: `We implement appropriate technical and organisational measures to protect your personal data, including:

• Encrypted data transmission (TLS/HTTPS) for all Portal communications
• Encrypted storage of passwords using industry-standard hashing (bcrypt)
• Role-based access controls limiting staff access to data on a need-to-know basis
• Regular security reviews

While we take reasonable precautions, no internet transmission is entirely secure. If you suspect a security incident affecting your account, contact us immediately at ${CONTACT_EMAIL}.`,
  },
  {
    title: "10. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify registered users of material changes by email at least 14 days before they take effect. The effective date at the top of this page indicates when the current version was last updated.

Continued use of the Portal after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    title: "11. Contact & Complaints",
    body: `For any privacy-related questions or to exercise your rights, contact our Data Protection Officer:

Email: ${CONTACT_EMAIL}
Post: Data Protection Officer, Uganda National Oil Company Limited, Plot 15 George Street, Kampala, Uganda

If you are not satisfied with our response, you have the right to lodge a complaint with the Personal Data Protection Office of Uganda (PDPO).`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Legal
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            Privacy<br />
            <span className="text-kip-red">Policy.</span>
          </h1>
          <p className="mt-4 text-[14px] text-black/55">Effective date: <strong>{EFFECTIVE_DATE}</strong></p>
        </div>
      </div>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-black/40">Contents</p>
                <nav className="space-y-1.5">
                  {SECTIONS.map((s) => (
                    <a key={s.title} href={`#${s.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}
                      className="block text-[12px] text-black/50 transition hover:text-black">{s.title}</a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="max-w-2xl space-y-10">
              <div className="rounded-[5px] border border-amber-200 bg-amber-50 px-5 py-4 text-[13px] leading-relaxed text-amber-800">
                This policy governs the processing of personal data by UNOC and URHC through the KIP Investor Portal, in accordance with the Uganda Data Protection and Privacy Act 2019.
              </div>

              {SECTIONS.map((s) => (
                <section key={s.title} id={s.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")} className="scroll-mt-24">
                  <h2 className="mb-3 text-[17px] font-extrabold text-black">{s.title}</h2>
                  <div className="space-y-3">
                    {s.body.split("\n\n").map((para, i) => (
                      <p key={i} className="whitespace-pre-line text-[14px] leading-relaxed text-black/65">{para}</p>
                    ))}
                  </div>
                </section>
              ))}

              <div className="border-t border-black/8 pt-8 text-[13px] text-black/40">
                Questions? <Link href="/contact" className="font-semibold text-black/70 underline underline-offset-2 hover:text-kip-red">Contact Us</Link> or email {CONTACT_EMAIL}.
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
