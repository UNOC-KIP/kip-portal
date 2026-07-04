import { redirect } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Mail, Phone, MapPin, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import nodemailer from "nodemailer";
import { z } from "zod";

const contactSchema = z.object({
  name:    z.string().min(2, "Name is required"),
  email:   z.string().email("Valid email is required"),
  company: z.string().optional(),
  subject: z.enum(["General Inquiry", "Application Support", "Technical Issue", "Partnership", "Other"]),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

async function submitContact(formData: FormData) {
  "use server";

  const raw = {
    name:    formData.get("name"),
    email:   formData.get("email"),
    company: formData.get("company") || "",
    subject: formData.get("subject"),
    message: formData.get("message"),
  };

  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    redirect("/contact?error=validation");
    return;
  }

  const { name, email, company, subject, message } = result.data;

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
      from:    process.env.EMAIL_FROM || "noreply@kip.local",
      to:      "kipinvestorrelations@unoc.com",
      replyTo: email,
      subject: `KIP Investor Portal Contact: ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#C8102E">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:8px;font-weight:bold;color:#555;width:120px">Name</td><td style="padding:8px">${name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Company</td><td style="padding:8px">${company || "—"}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Subject</td><td style="padding:8px">${subject}</td></tr>
          </table>
          <h3 style="color:#333">Message</h3>
          <p style="background:#f5f5f5;padding:16px;border-radius:4px;white-space:pre-wrap">${message}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Sent from the KIP Investor Portal contact form.</p>
        </div>
      `,
    });
  } catch {
    redirect("/contact?error=send");
    return;
  }

  redirect("/contact?sent=1");
}

const CONTACT_INFO = [
  { icon: MapPin, label: "KIP Project Office", value: "Kabaale, Hoima District, Western Uganda\n~50 km west of Hoima City" },
  { icon: Mail,   label: "Email",              value: "kipinvestorrelations@unoc.com" },
  { icon: Phone,  label: "Phone",              value: "+256 417 000 000" },
  { icon: Clock,  label: "Office Hours",       value: "Monday – Friday\n8:00 AM – 5:00 PM EAT" },
];

const SUBJECTS = ["General Inquiry", "Application Support", "Technical Issue", "Partnership", "Other"] as const;

export default function ContactPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  const sent  = searchParams.sent === "1";
  const error = searchParams.error;

  return (
    <div className="min-h-screen font-sans">
      <div className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-10 pb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
            Get in Touch
          </span>
          <h1 className="mt-4 text-[34px] sm:text-[48px] font-extrabold leading-tight tracking-tight text-black">
            Contact <span className="text-kip-red">Our Team.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] font-medium leading-relaxed text-black/75">
            Have a question about the Kabalega Industrial Park or the application process?
            We&apos;re here to help.
          </p>
        </div>
      </div>

      <section className="bg-ink-100 py-16">
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-5">
              <div className="rounded-[5px] border border-black/8 bg-white p-8">
                <h2 className="mb-6 text-[15px] font-bold text-black">Contact Information</h2>
                <div className="space-y-6">
                  {CONTACT_INFO.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-kip-gold/20">
                        <Icon size={16} className="text-black/70" />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-black/55">{label}</p>
                        <p className="mt-0.5 whitespace-pre-line text-[14px] text-black/80">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[5px] border border-black/8 bg-black p-8 text-white">
                <h3 className="mb-2 text-[14px] font-bold">Ready to invest?</h3>
                <p className="mb-5 text-[13px] leading-relaxed text-white/70">
                  The application window is currently open. Start your Expression of Interest today.
                </p>
                <a href="/sign-up" className="inline-block rounded-[4px] bg-kip-gold px-5 py-2.5 text-[13px] font-bold text-black transition hover:brightness-105">
                  Start Application →
                </a>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-[5px] border border-black/8 bg-white p-8">
                <h2 className="mb-1 text-[15px] font-bold text-black">Send Us a Message</h2>
                <p className="mb-7 text-[13px] text-black/60">We typically respond within 1–2 business days.</p>

                {sent && (
                  <div className="mb-6 flex items-start gap-3 rounded-[4px] border border-green-200 bg-green-50 px-4 py-3.5">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                    <div>
                      <p className="text-[14px] font-semibold text-green-800">Message sent successfully</p>
                      <p className="text-[13px] text-green-700">Thank you for reaching out. Our team will get back to you shortly.</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-6 flex items-start gap-3 rounded-[4px] border border-red-200 bg-red-50 px-4 py-3.5">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                    <div>
                      <p className="text-[14px] font-semibold text-red-800">
                        {error === "validation" ? "Please fill in all required fields correctly." : "Failed to send your message. Please try again."}
                      </p>
                    </div>
                  </div>
                )}

                <form action={submitContact} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-black/70">Full Name <span className="text-kip-red">*</span></label>
                      <input name="name" required placeholder="John Smith" className="w-full rounded-[4px] border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-black placeholder-black/30 outline-none transition focus:border-black focus:ring-1 focus:ring-black/20" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-black/70">Email Address <span className="text-kip-red">*</span></label>
                      <input type="email" name="email" required placeholder="john@company.com" className="w-full rounded-[4px] border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-black placeholder-black/30 outline-none transition focus:border-black focus:ring-1 focus:ring-black/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-black/70">Company / Organisation</label>
                      <input name="company" placeholder="Your company name" className="w-full rounded-[4px] border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-black placeholder-black/30 outline-none transition focus:border-black focus:ring-1 focus:ring-black/20" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-black/70">Subject <span className="text-kip-red">*</span></label>
                      <select name="subject" required defaultValue="" className="w-full rounded-[4px] border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black/20">
                        <option value="" disabled>Select a subject</option>
                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-black/70">Message <span className="text-kip-red">*</span></label>
                    <textarea name="message" required rows={6} placeholder="Tell us how we can help..." className="w-full resize-none rounded-[4px] border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-black placeholder-black/30 outline-none transition focus:border-black focus:ring-1 focus:ring-black/20" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[12px] text-black/55">Fields marked <span className="text-kip-red">*</span> are required</p>
                    <button type="submit" className="rounded-[4px] bg-kip-red px-7 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110">Send Message</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
