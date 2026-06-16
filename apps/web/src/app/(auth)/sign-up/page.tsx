"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";

const COUNTRIES = ["Uganda", "Kenya", "Tanzania", "Rwanda", "South Sudan", "DRC", "Other"];

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

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    router.push(`/verify?email=${encodeURIComponent(form.email)}`);
  }

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
            <h1 className="text-[36px] font-extrabold tracking-tight text-black">Already registered?</h1>
            <Link href="/sign-in" className="mt-5 inline-block rounded-[4px] bg-kip-red px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110">
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
            <p className="mt-1 text-sm text-ink-500">Register to begin your KIP land allocation application.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              {/* Company Information */}
              <div>
                <h3 className="mb-4 border-b border-brand-500 pb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                  Company Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Registered Company Name *</label>
                    <input
                      required
                      placeholder="Nile Industries Limited"
                      value={form.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                      className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Country of Registration *</label>
                      <select
                        required
                        value={form.country}
                        onChange={(e) => set("country", e.target.value)}
                        className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                      >
                        {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">TIN / Company Number *</label>
                      <input
                        required
                        placeholder="1000234567"
                        value={form.tin}
                        onChange={(e) => set("tin", e.target.value)}
                        className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Credentials */}
              <div>
                <h3 className="mb-4 border-b border-brand-500 pb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                  Account Credentials
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Official Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="info@nileindustries.ug"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Min. 8 characters"
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Confirm Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Re-enter password"
                        value={form.confirmPassword}
                        onChange={(e) => set("confirmPassword", e.target.value)}
                        className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Primary Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+256 414 700 001"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              {/* Disclaimer */}
              <div className="flex gap-2 rounded-md bg-brand-50 px-4 py-3 text-xs text-ink-700">
                <span className="mt-0.5 text-brand-600">ℹ</span>
                <span>
                  The application fee of USD 1,000 is non-refundable. By creating an account you
                  acknowledge the{" "}
                  <Link href="#" className="font-semibold underline text-brand-700">
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
