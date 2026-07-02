"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useRef, useState, Suspense } from "react";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "your email";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCount, setResendCount] = useState(3);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleDigit(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    router.push("/dashboard");
  }

  function handleResend() {
    if (resendCount > 0) setResendCount((n) => n - 1);
  }

  return (
    <div className="min-h-screen">
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

      <section className="bg-ink-100 py-12">
        <div className="container max-w-lg">
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="h-0.5 w-8 rounded-full bg-ink-900" />
              <div className="h-0.5 w-8 rounded-full bg-ink-900" />
              <span className="text-xs text-ink-500">Step 2 of 2</span>
            </div>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-2xl">
              ✉️
            </div>

            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="mt-2 text-sm text-ink-500">
              We sent a 6-digit verification code to{" "}
              <span className="font-semibold text-brand-600">{email}</span>.
              <br />
              Enter the code below to activate your account.
            </p>

            <form onSubmit={handleVerify} className="mt-8">
              <div className="flex justify-center gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`h-14 w-12 rounded-lg border-2 text-center text-xl font-bold outline-none transition ${
                      d ? "border-brand-500 bg-brand-50" : "border-ink-300"
                    } focus:border-brand-500`}
                  />
                ))}
              </div>

              <p className="mt-4 text-sm text-ink-500">
                Didn&apos;t receive a code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCount === 0}
                  className="font-semibold text-brand-600 hover:underline disabled:text-ink-400"
                >
                  Resend email
                </button>{" "}
                {resendCount > 0 && (
                  <span className="text-xs text-ink-400">({resendCount} attempts remaining)</span>
                )}
              </p>

              <button
                type="submit"
                disabled={digits.some((d) => !d) || loading}
                className="mt-6 w-full rounded-md bg-brand-400 py-3 text-sm font-bold text-black transition hover:bg-brand-300 disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
