import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const EFFECTIVE_DATE = "25 June 2026";
const CONTACT_EMAIL  = "legal@unoc.co.ug";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By registering for an account on the KIP Investor Portal ("Portal") or submitting an Expression of Interest ("EOI"), you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy, which is incorporated herein by reference.

If you are accessing the Portal on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these Terms. If you do not have such authority, or if you do not agree with these Terms, you must not use the Portal.

These Terms are governed by the laws of Uganda. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Uganda.`,
  },
  {
    title: "2. About the Portal",
    body: `The KIP Investor Portal is operated by Uganda National Oil Company Limited ("UNOC") and Uganda Refinery Holding Company Limited ("URHC") to manage the Expression of Interest process for the Kabalega Petro-Based Industrial Park ("KIP") located in Hoima District, Uganda.

The Portal facilitates investor registration, EOI submission, payment processing, and application status tracking. Use of the Portal does not guarantee land allocation at KIP.`,
  },
  {
    title: "3. Eligibility",
    body: `You may use the Portal only if you:

• Are a legally incorporated company (or authorised representative thereof)
• Have not been convicted of financial crime, fraud, or money laundering in any jurisdiction in the past 5 years
• Are not subject to sanctions by the United Nations, the African Union, or the Government of Uganda
• Are at least 18 years of age if acting as an individual authorised representative

UNOC/URHC reserve the right to verify eligibility and to reject or suspend accounts that do not meet these criteria.`,
  },
  {
    title: "4. Account Registration",
    body: `To use the Portal you must create an account. You agree to:

• Provide accurate, current, and complete information during registration
• Maintain and promptly update your account information to keep it accurate
• Keep your password confidential and not share it with any third party
• Notify us immediately of any unauthorised access to your account at kip@unoc.co.ug
• Accept responsibility for all activity that occurs under your account

We reserve the right to refuse, suspend, or terminate any account at our discretion, including for violation of these Terms.`,
  },
  {
    title: "5. Application Fee",
    body: `A non-refundable application fee of USD 1,000 (one thousand United States Dollars) or the equivalent in Ugandan Shillings is required before an EOI may be submitted.

The fee is:
• Non-refundable under all circumstances, including rejection, withdrawal, or window closure
• Payable once per application window per registered investor organisation
• Not transferable to another application round

Payment must be made through the accepted methods listed in the Portal (Stanbic Bank transfer only). Proof of bank transfer must be uploaded to the Portal. UNOC/URHC reserve the right to verify all payments before confirming an application.`,
  },
  {
    title: "6. Expression of Interest Submission",
    body: `By submitting an EOI, you represent and warrant that:

• All information provided is true, accurate, complete, and not misleading
• All uploaded documents are genuine and unaltered originals or certified copies
• You have the authority to submit the EOI on behalf of the investor organisation
• The proposed investment complies with applicable Ugandan law

Submission of an EOI does not create any contractual right to land allocation. UNOC/URHC make no representation that any particular application will be approved.

You may not submit more than one EOI per application window per registered investor organisation.`,
  },
  {
    title: "7. Review Process",
    body: `EOIs are reviewed at UNOC/URHC's sole discretion. The review process involves the Technical Committee, the Land Allocation Committee, and the Executive Committee. UNOC/URHC reserve the right to:

• Request clarification or additional documentation at any stage
• Reject applications that do not meet eligibility or quality criteria
• Adjust review timelines without prior notice
• Cancel or postpone the application window at any time

Decisions made by the Executive Committee are final. There is no formal appeals process within the Portal.`,
  },
  {
    title: "8. Intellectual Property",
    body: `All content on the Portal, including but not limited to text, graphics, logos, interface design, and software, is the property of UNOC, URHC, or their respective licensors and is protected by Ugandan and international intellectual property laws.

You may not copy, reproduce, distribute, or create derivative works from any Portal content without prior written permission from UNOC. Your EOI content remains your intellectual property; by submitting it you grant UNOC/URHC a non-exclusive licence to use it for the purposes of the KIP allocation process.`,
  },
  {
    title: "9. Prohibited Conduct",
    body: `You agree not to:

• Submit false, misleading, or fraudulent information or documents
• Attempt to gain unauthorised access to any part of the Portal or other users' accounts
• Use the Portal in any way that violates applicable Ugandan or international law
• Transmit malicious code, viruses, or other harmful content
• Interfere with the operation of the Portal or its infrastructure
• Engage in any conduct that could damage the reputation of UNOC, URHC, or KIP

Violation of this section may result in immediate account termination and may be referred to law enforcement authorities.`,
  },
  {
    title: "10. Limitation of Liability",
    body: `To the maximum extent permitted by Ugandan law, UNOC and URHC shall not be liable for:

• Loss of business opportunity, profits, revenue, or data arising from use of the Portal
• Indirect, incidental, special, or consequential damages
• Interruptions to Portal access, data loss, or technical failures
• Decisions made by the Technical Committee, LAC, or ExCo regarding any application
• Actions taken by any third-party payment processor

UNOC's and URHC's total aggregate liability under these Terms shall not exceed the amount of the application fee paid by the relevant investor.`,
  },
  {
    title: "11. Disclaimers",
    body: `The Portal is provided on an "as is" and "as available" basis. We make no warranty that:

• The Portal will be uninterrupted, error-free, or free of viruses
• Information on the Portal is accurate, complete, or up to date at all times
• Any particular investment outcome will result from using the Portal

We may update, modify, or discontinue the Portal at any time without notice.`,
  },
  {
    title: "12. Amendments",
    body: `We may revise these Terms at any time by posting an updated version on the Portal. Material changes will be communicated to registered users by email at least 14 days before they take effect.

Your continued use of the Portal after the effective date of any revised Terms constitutes your acceptance of those Terms. If you do not agree to the revised Terms, you must stop using the Portal and may request account deletion.`,
  },
  {
    title: "13. Governing Law & Disputes",
    body: `These Terms are governed by and construed in accordance with the laws of the Republic of Uganda, without regard to conflict of law principles. Any dispute arising out of or relating to these Terms or your use of the Portal shall be subject to the exclusive jurisdiction of the High Court of Uganda, Kampala.

Before initiating legal proceedings, you agree to attempt to resolve any dispute informally by contacting us at ${CONTACT_EMAIL}.`,
  },
  {
    title: "14. Contact",
    body: `For questions about these Terms, contact our Legal Department:

Email: ${CONTACT_EMAIL}
Post: Legal Department, Uganda National Oil Company Limited, Plot 15 George Street, Kampala, Uganda`,
  },
];

export default function TermsPage() {
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
            Terms of<br />
            <span className="text-kip-red">Service.</span>
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
              <div className="rounded-[5px] border border-blue-200 bg-blue-50 px-5 py-4 text-[13px] leading-relaxed text-blue-800">
                Please read these Terms carefully before using the KIP Investor Portal. By registering or submitting an EOI, you agree to be bound by these Terms.
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
                Questions about these Terms? <Link href="/contact" className="font-semibold text-black/70 underline underline-offset-2 hover:text-kip-red">Contact Us</Link> or email {CONTACT_EMAIL}.
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
