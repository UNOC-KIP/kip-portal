"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

const METHODS = [
  {
    id: "card",
    label: "Visa / Mastercard",
    sub: "Credit or debit card · 3D Secure · All major cards · Instant confirmation",
    icon: (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-lg text-white">
        💳
      </div>
    ),
    href: "/dashboard/payment/card",
  },
  {
    id: "bank",
    label: "Stanbic Bank Transfer",
    sub: "Manual bank transfer · Upload proof · Admin confirms within 2 business days",
    icon: (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-700 text-lg text-white">
        🏦
      </div>
    ),
    href: "/dashboard/payment/bank",
  },
] as const;

export default function PaymentMethodPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("card");

  const chosen = METHODS.find((m) => m.id === selected)!;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Payment method" }]} />

        <div className="mx-auto max-w-xl">
          <p className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-ink-500">
            Application Fee Payment
          </p>
          <h1 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
            Select payment method
          </h1>
          <p className="mb-6 text-center text-sm text-ink-500">
            Choose how you&apos;d like to pay the non-refundable application fee.
          </p>

          {/* Amount card */}
          <div
            className="mb-6 flex items-center justify-between rounded-xl px-5 py-5 text-white sm:px-6"
            style={{ backgroundColor: "#5C5418" }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Application Fee
              </p>
              <p className="mt-1 text-2xl font-black sm:text-3xl">USD 1,000</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white/80">Non-refundable</p>
              <p className="text-xs text-white/60">One-time payment per application</p>
            </div>
          </div>

          {/* Method options */}
          <div className="space-y-3">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                  selected === m.id
                    ? "border-brand-400 bg-brand-50"
                    : "border-ink-200 bg-white hover:border-ink-300"
                }`}
              >
                {m.icon}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-900">{m.label}</p>
                  <p className="text-xs text-ink-500">{m.sub}</p>
                </div>
                <div
                  className={`h-4 w-4 shrink-0 rounded-full border-2 transition ${
                    selected === m.id
                      ? "border-brand-500 bg-brand-500"
                      : "border-ink-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <Button
            onClick={() => router.push(chosen.href)}
            className="mt-6 w-full py-6 text-sm"
          >
            Continue with {chosen.label}
          </Button>

          <p className="mt-4 text-center text-xs text-ink-500">
            Secured by UNOC · PCI-DSS compliant · All amounts in USD
          </p>
        </div>
      </main>
    </div>
  );
}
