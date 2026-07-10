"use client";

import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";
import { COMPANY_TYPE_LABELS, BUSINESS_SECTOR_LABELS } from "@kip/shared";

const COUNTRIES = [
  "Uganda", "Kenya", "Tanzania", "Rwanda", "South Sudan",
  "DRC", "Ethiopia", "Burundi", "Sudan", "Other",
];

type FieldErrors = Partial<Record<string, string[]>>;

function inputCls(hasError: boolean) {
  return `block w-full rounded-md border ${
    hasError ? "border-red-400 ring-1 ring-red-200" : "border-ink-300"
  } px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200`;
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function SignUpPage() {
  const [form, setForm] = useState({
    companyName: "",
    tradingName: "",
    country: "Uganda",
    companyType: "",
    businessSector: "",
    repName: "",
    repDesignation: "",
    repEmail: "",
    repPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [emailSent, setEmailSent] = useState(true);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
    setError("");
  }

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (form.companyName.trim().length < 2)
      errs.companyName = ["Company name must be at least 2 characters"];
    if (!form.country)
      errs.country = ["Country is required"];
    if (!form.companyType)
      errs.companyType = ["Select a company type"];
    if (!form.businessSector)
      errs.businessSector = ["Select your primary sector"];
    if (form.repName.trim().length < 2)
      errs.repName = ["Full name is required"];
    if (form.repDesignation.trim().length < 2)
      errs.repDesignation = ["Designation is required"];
    if (!isEmail(form.repEmail))
      errs.repEmail = ["Enter a valid email address"];
    if (form.repPhone.trim().length < 7)
      errs.repPhone = ["Enter a valid phone number"];
    return errs;
  }

  function showErrors(errs: FieldErrors) {
    setFieldErrors(errs);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      showErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          tradingName: form.tradingName.trim(),
          country: form.country,
          companyType: form.companyType,
          businessSector: form.businessSector,
          repName: form.repName.trim(),
          repDesignation: form.repDesignation.trim(),
          repEmail: form.repEmail.trim(),
          repPhone: form.repPhone.trim(),
        }),
      });

      if (res.status === 201) {
        const data = await res.json() as { emailSent?: boolean };
        setEmailSent(data.emailSent !== false);
        setSubmitted(true);
        return;
      }

      const data = await res.json() as { error?: string; field?: string; fields?: FieldErrors };
      if (res.status === 409) {
        setFieldErrors({ repEmail: [data.error ?? "Email already in use"] });
      } else if (res.status === 422 && data.fields) {
        showErrors(data.fields);
      } else {
        setError(data.error ?? "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <section className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-8 pb-12 flex items-center justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
              Create Account
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-tight text-black">
              Already registered?
            </h1>
            <Link
              href="/sign-in"
              className="mt-5 inline-block rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-ink-100 py-12">
        <div className="container max-w-2xl">
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">

            {submitted ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-ink-900">Account Created</h2>
                {emailSent ? (
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
                    We&apos;ve emailed your login credentials to{" "}
                    <strong className="text-ink-800">{form.repEmail}</strong>. Check your
                    inbox (and spam folder) to sign in and book your site visit.
                  </p>
                ) : (
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
                    Your account is ready, but we couldn&apos;t deliver the credentials email
                    to <strong className="text-ink-800">{form.repEmail}</strong>. Please
                    contact the KIP secretariat at{" "}
                    <a href="mailto:kipinvestorrelations@unoc.com" className="font-medium underline">
                      kipinvestorrelations@unoc.com
                    </a>{" "}
                    to receive your password.
                  </p>
                )}
                <Link
                  href="/sign-in"
                  className="mt-8 rounded-md bg-brand-400 px-6 py-2.5 text-sm font-bold text-black transition hover:bg-brand-300"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Create your investor account</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Register to book a site visit and be ready when the EOI window opens.
                  Your login credentials will be emailed to you immediately.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
                  <div>
                    <h3 className="mb-4 border-b border-brand-500 pb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                      Company Identity
                    </h3>
                    <div className="space-y-4">
                      <Field label="Registered Company Name *" error={fieldErrors.companyName?.[0]}>
                        <input
                          required
                          placeholder="Nile Industries Limited"
                          value={form.companyName}
                          onChange={(e) => set("companyName", e.target.value)}
                          className={inputCls(!!fieldErrors.companyName)}
                        />
                      </Field>
                      <Field
                        label="Trading Name (if different)"
                        error={fieldErrors.tradingName?.[0]}
                      >
                        <input
                          placeholder="Nile Industries"
                          value={form.tradingName}
                          onChange={(e) => set("tradingName", e.target.value)}
                          className={inputCls(!!fieldErrors.tradingName)}
                        />
                      </Field>
                      <Field label="Country of Incorporation *" error={fieldErrors.country?.[0]}>
                        <select
                          required
                          value={form.country}
                          onChange={(e) => set("country", e.target.value)}
                          className={inputCls(!!fieldErrors.country)}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Company Type *" error={fieldErrors.companyType?.[0]}>
                          <select
                            required
                            value={form.companyType}
                            onChange={(e) => set("companyType", e.target.value)}
                            className={inputCls(!!fieldErrors.companyType)}
                          >
                            <option value="" disabled>Select company type…</option>
                            {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Primary Sector *" error={fieldErrors.businessSector?.[0]}>
                          <select
                            required
                            value={form.businessSector}
                            onChange={(e) => set("businessSector", e.target.value)}
                            className={inputCls(!!fieldErrors.businessSector)}
                          >
                            <option value="" disabled>Select primary sector…</option>
                            {Object.entries(BUSINESS_SECTOR_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 border-b border-brand-500 pb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                      Authorized Representative
                    </h3>
                    <div className="space-y-4">
                      <Field label="Full Name *" error={fieldErrors.repName?.[0]}>
                        <input
                          required
                          placeholder="Jane Mugisha"
                          value={form.repName}
                          onChange={(e) => set("repName", e.target.value)}
                          className={inputCls(!!fieldErrors.repName)}
                        />
                      </Field>
                      <Field label="Designation / Title *" error={fieldErrors.repDesignation?.[0]}>
                        <input
                          required
                          placeholder="e.g. Managing Director"
                          value={form.repDesignation}
                          onChange={(e) => set("repDesignation", e.target.value)}
                          className={inputCls(!!fieldErrors.repDesignation)}
                        />
                      </Field>
                      <Field
                        label="Email Address *"
                        hint="This email becomes your login. Your password will be sent here."
                        error={fieldErrors.repEmail?.[0]}
                      >
                        <input
                          type="email"
                          required
                          placeholder="jane.mugisha@nileindustries.ug"
                          value={form.repEmail}
                          onChange={(e) => set("repEmail", e.target.value)}
                          className={inputCls(!!fieldErrors.repEmail)}
                        />
                      </Field>
                      <Field label="Phone Number *" error={fieldErrors.repPhone?.[0]}>
                        <input
                          type="tel"
                          required
                          placeholder="+256 772 100 200"
                          value={form.repPhone}
                          onChange={(e) => set("repPhone", e.target.value)}
                          className={inputCls(!!fieldErrors.repPhone)}
                        />
                      </Field>
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-2 rounded-md bg-brand-50 px-4 py-3 text-xs text-ink-700">
                    <span className="mt-0.5 text-brand-600">ℹ</span>
                    <span>
                      By creating an account you acknowledge the{" "}
                      <Link href="/terms" className="font-semibold underline text-brand-700">
                        UNOC Land Allocation Policy
                      </Link>
                      .
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-brand-400 py-3 text-sm font-bold text-black transition hover:bg-brand-300 disabled:opacity-60"
                  >
                    {loading ? "Creating account…" : "Create Account"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
