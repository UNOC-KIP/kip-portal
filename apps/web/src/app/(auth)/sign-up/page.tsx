"use client";

import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";

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
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function SignUpPage() {
  const [form, setForm] = useState({
    companyName: "",
    country: "Uganda",
    tin: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
    setError("");
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (form.companyName.trim().length < 2)
      errs.companyName = ["Company name must be at least 2 characters"];
    if (!form.country)
      errs.country = ["Country is required"];
    if (form.tin.trim().length < 3)
      errs.tin = ["TIN / Company Number must be at least 3 characters"];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = ["Enter a valid email address"];
    if (form.phone.trim().length < 7)
      errs.phone = ["Enter a valid phone number"];
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          country: form.country,
          tin: form.tin.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });

      if (res.status === 201) {
        setSubmitted(true);
        return;
      }

      const data = await res.json() as { error?: string; field?: string; fields?: FieldErrors };
      if (res.status === 409) {
        setFieldErrors({ email: [data.error ?? "Email already in use"] });
      } else if (res.status === 422 && data.fields) {
        setFieldErrors(data.fields);
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
      {/* Gold zone: floating navbar + hero banner */}
      <section className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-5 sm:px-10 lg:px-[100px] pt-8 pb-12 flex items-center justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
              Register Account
            </div>
            <h1 className="text-[26px] sm:text-[36px] font-extrabold tracking-tight text-black">
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

      {/* Form card */}
      <section className="bg-ink-100 py-12">
        <div className="container max-w-2xl">
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">

            {submitted ? (
              /* Under-review confirmation panel */
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-ink-900">Registration Submitted</h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
                  Your registration has been submitted for review. Our team will verify your
                  company information and send your login credentials to{" "}
                  <strong className="text-ink-800">{form.email}</strong> once your account is approved.
                </p>
                <p className="mt-4 text-xs text-ink-400">
                  This process typically takes 2–5 business days.
                </p>
                <Link
                  href="/"
                  className="mt-8 rounded-md border border-ink-300 px-6 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  Return to home
                </Link>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-0.5 w-8 rounded-full bg-ink-900" />
                  <div className="h-0.5 w-8 rounded-full bg-ink-300" />
                  <span className="text-xs text-ink-500">Step 1 of 2</span>
                </div>

                <h2 className="text-2xl font-bold">Create your investor account</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Register to begin your KIP land allocation application. Our team will review
                  your details and send you login credentials once approved.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
                  {/* Company Information */}
                  <div>
                    <h3 className="mb-4 border-b border-brand-500 pb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                      Company Information
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
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field
                          label="Country of Registration *"
                          error={fieldErrors.country?.[0]}
                        >
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
                        <Field
                          label="TIN / Company Number *"
                          error={fieldErrors.tin?.[0]}
                        >
                          <input
                            required
                            placeholder="1000234567"
                            value={form.tin}
                            onChange={(e) => set("tin", e.target.value)}
                            className={inputCls(!!fieldErrors.tin)}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div>
                    <h3 className="mb-4 border-b border-brand-500 pb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                      Contact Details
                    </h3>
                    <div className="space-y-4">
                      <Field
                        label="Official Email Address *"
                        error={fieldErrors.email?.[0]}
                      >
                        <input
                          type="email"
                          required
                          placeholder="info@nileindustries.ug"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          className={inputCls(!!fieldErrors.email)}
                        />
                      </Field>
                      <Field
                        label="Primary Contact Phone *"
                        error={fieldErrors.phone?.[0]}
                      >
                        <input
                          type="tel"
                          required
                          placeholder="+256 414 700 001"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          className={inputCls(!!fieldErrors.phone)}
                        />
                      </Field>
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  {/* Disclaimer */}
                  <div className="flex gap-2 rounded-md bg-brand-50 px-4 py-3 text-xs text-ink-700">
                    <span className="mt-0.5 text-brand-600">ℹ</span>
                    <span>
                      The application fee of USD 1,000 is non-refundable. By creating an account
                      you acknowledge the{" "}
                      <Link
                        href="#"
                        className="font-semibold underline text-brand-700"
                      >
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
                    {loading ? "Submitting…" : "Submit Registration"}
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
