"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";

const COUNTRIES = [
  "Uganda", "Kenya", "Tanzania", "Rwanda", "South Sudan",
  "DRC", "Ethiopia", "Burundi", "Sudan", "Other",
];

type FieldErrors = Partial<Record<string, string[]>>;

function passwordStrength(pw: string): { score: number; label: string; barColor: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", barColor: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", barColor: "bg-orange-400" };
  if (score <= 3) return { score, label: "Good", barColor: "bg-yellow-500" };
  return { score, label: "Strong", barColor: "bg-green-500" };
}

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
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    country: "Uganda",
    tin: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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
    if (form.password.length < 8)
      errs.password = ["Password must be at least 8 characters"];
    else if (!/[A-Z]/.test(form.password))
      errs.password = ["Must contain at least one uppercase letter"];
    else if (!/[a-z]/.test(form.password))
      errs.password = ["Must contain at least one lowercase letter"];
    else if (!/[0-9]/.test(form.password))
      errs.password = ["Must contain at least one number"];
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = ["Passwords do not match"];
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
          password: form.password,
          phone: form.phone.trim(),
        }),
      });

      if (res.status === 201) {
        router.push(`/sign-in?registered=1`);
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

  const strength = passwordStrength(form.password);
  const showStrength = form.password.length > 0;

  return (
    <div className="min-h-screen">
      {/* Gold zone: floating navbar + hero banner */}
      <section className="bg-kip-gold">
        <SiteNav />
        <div className="mx-auto max-w-[1343px] px-[100px] pt-8 pb-12 flex items-center justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70">
              <span className="h-1.5 w-1.5 rounded-full bg-kip-red" />
              Register Account
            </div>
            <h1 className="text-[36px] font-extrabold tracking-tight text-black">
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
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-3">
              <div className="h-0.5 w-8 rounded-full bg-ink-900" />
              <div className="h-0.5 w-8 rounded-full bg-ink-300" />
              <span className="text-xs text-ink-500">Step 1 of 2</span>
            </div>

            <h2 className="text-2xl font-bold">Create your investor account</h2>
            <p className="mt-1 text-sm text-ink-500">
              Register to begin your KIP land allocation application.
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
                  <div className="grid grid-cols-2 gap-4">
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

              {/* Account Credentials */}
              <div>
                <h3 className="mb-4 border-b border-brand-500 pb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                  Account Credentials
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Field label="Password *" error={fieldErrors.password?.[0]}>
                        <input
                          type="password"
                          required
                          placeholder="Min. 8 characters"
                          value={form.password}
                          onChange={(e) => set("password", e.target.value)}
                          className={inputCls(!!fieldErrors.password)}
                        />
                      </Field>
                      {showStrength && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  i <= strength.score
                                    ? strength.barColor
                                    : "bg-ink-200"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-ink-500">
                            Password strength: <span className="font-medium">{strength.label}</span>
                          </p>
                        </div>
                      )}
                    </div>
                    <Field
                      label="Confirm Password *"
                      error={fieldErrors.confirmPassword?.[0]}
                    >
                      <input
                        type="password"
                        required
                        placeholder="Re-enter password"
                        value={form.confirmPassword}
                        onChange={(e) => set("confirmPassword", e.target.value)}
                        className={inputCls(!!fieldErrors.confirmPassword)}
                      />
                    </Field>
                  </div>
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
                {loading ? "Creating account…" : "Create Account & Continue"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
