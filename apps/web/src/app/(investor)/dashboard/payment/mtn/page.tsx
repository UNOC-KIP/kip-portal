"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MtnPaymentPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

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
            { label: "MTN Mobile Money" },
          ]}
        />

        <div className="mx-auto max-w-xl">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-400 text-sm font-black text-black shadow">
              MTN
            </div>
          </div>
          <h1 className="mb-1 text-center text-2xl font-bold">MTN Mobile Money</h1>
          <p className="mb-6 text-center text-sm text-ink-500">
            You will receive a USSD prompt on your MTN line to authorize payment.
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
                    MTN Mobile Number *
                  </label>
                  <Input
                    required
                    placeholder="+256 772 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/dashboard/payment")}
                  >
                    Cancel payment
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Sending…" : "Send Payment Request →"}
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                  <p className="mb-2 text-2xl">🔄</p>
                  <p className="font-semibold text-green-800">
                    Waiting for your authorization
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    A USSD prompt has been sent to {phone}. Enter your MTN MoMo PIN to
                    approve.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <p className="text-sm font-semibold">How it works</p>
                  </div>
                  <ol className="space-y-2 border-l-2 border-ink-200 pl-4">
                    {[
                      "Your phone receives a USSD pop-up notification from MTN",
                      "Enter your 5-digit MTN MoMo PIN to approve the UGX 3,680,000 deduction",
                      "Your KIP portal will update automatically within 30 seconds",
                    ].map((step, i) => (
                      <li key={i} className="text-sm text-ink-700">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  onClick={() => router.push("/dashboard")}
                >
                  Cancel payment
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
