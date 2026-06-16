"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export default function AirtelPaymentPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Payment method", href: "/dashboard/payment" },
            { label: "Airtel Money" },
          ]}
        />

        <div className="mx-auto max-w-xl">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-500 text-2xl font-black text-white shadow">
              a
            </div>
          </div>
          <h1 className="mb-1 text-center text-2xl font-bold">Airtel Money</h1>
          <p className="mb-6 text-center text-sm text-ink-500">
            You will receive a USSD prompt on your Airtel line to authorize payment.
          </p>

          {/* Amount card */}
          <div
            className="mb-6 flex items-center justify-between rounded-xl px-5 py-5 text-white sm:px-6"
            style={{ backgroundColor: "#5C5418" }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Total Charge
              </p>
              <p className="mt-1 text-2xl font-black sm:text-3xl">USD 1,000</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white/90">≈ UGX 3,680,000</p>
              <p className="text-xs text-white/60">Rate refreshes every 15 mins</p>
            </div>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6">
            {!sent ? (
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Airtel Mobile Number *
                  </label>
                  <Input
                    required
                    placeholder="+256 702 987 654"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-800">
                  Once you tap the button below, you&apos;ll receive a prompt on your Airtel
                  handset. Enter your Airtel Money PIN to approve.
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <Link href="/dashboard/payment">Cancel payment</Link>
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Sending…" : "Send Payment Request →"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                <p className="mb-3 text-3xl">✅</p>
                <p className="font-semibold text-green-800">Request sent to {phone}</p>
                <p className="mt-1 text-sm text-ink-500">
                  Check your Airtel handset for a USSD prompt and approve with your PIN.
                </p>
                <Button asChild className="mt-5 w-full">
                  <Link href="/dashboard">Return to dashboard</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
