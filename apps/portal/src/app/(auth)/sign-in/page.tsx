"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// useSearchParams() forces a CSR bailout during prerender — Next.js requires a
// Suspense boundary around it for `next build` to succeed.
export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setSuccessMsg(
        "Your registration is under review. You will receive your login credentials by email once approved.",
      );
    } else if (searchParams.get("timeout") === "1") {
      setWarningMsg("Your session expired due to inactivity. Please sign in again.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/launch",
    });
    if (result?.error) {
      const msg = result.error;
      if (msg.includes("Staff accounts must sign in")) {
        setWarningMsg("Staff accounts must sign in at the admin portal.");
      } else if (msg.includes("pending") || msg.includes("not been approved")) {
        setError(msg);
      } else {
        setError("Invalid email or password.");
      }
    } else if (result?.url) {
      window.location.href = result.url;
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand image */}
      <div className="relative hidden w-5/12 flex-col justify-between overflow-hidden bg-slate-900 p-10 lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/kip-refinery.jpg')" }}
        />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            KIP Investor Portal
          </span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black leading-tight text-white">
            Kabalega{" "}
            <span className="text-brand-400">Industrial</span>{" "}
            Park.
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
            Uganda&apos;s flagship petroleum-based industrial park. Over 2,200 hectares
            of serviced land adjacent to the EACOP pipeline corridor.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center">
            <Image src="/unoc-logo.svg" alt="UNOC" width={130} height={38} />
          </div>

          <h1 className="text-center text-2xl font-bold text-ink-900">Welcome back</h1>
          <p className="mt-1 text-center text-sm text-ink-500">
            Sign in to your KIP investor account
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-800">
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="info@nileindustries.ug"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); setWarningMsg(""); }}
                className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-800">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
            </div>

            {warningMsg && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {warningMsg}
              </p>
            )}

            {successMsg && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                {successMsg}
              </p>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-md bg-brand-400 py-3 text-sm font-bold text-black transition hover:bg-brand-300 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Am an investor without an account{" "}
            <Link href="/sign-up" className="font-semibold text-ink-900 underline hover:text-ink-700">
              Register here.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
