"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CardPaymentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ cardNumber: "", expiry: "", cvv: "", name: "" });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Payment method", href: "/dashboard/payment" },
            { label: "Card Payment" },
          ]}
        />

        <div className="mx-auto max-w-xl">
          <h1 className="mb-1 text-center text-2xl font-bold">Visa / Mastercard</h1>
          <p className="mb-6 text-center text-sm text-ink-500">
            Credit or Debit Card · 3D Secure · All Major Cards
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
            <div className="flex items-center gap-2">
              <span className="rounded border border-white/30 bg-white/10 px-2 py-0.5 text-xs font-bold">
                VISA
              </span>
              <span className="rounded border border-white/30 bg-white/10 px-2 py-0.5 text-xs font-bold">
                MC
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6">
            <p className="mb-4 text-sm font-semibold text-ink-700">🔒 Secure card entry</p>
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Card Number</label>
                <Input
                  required
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  value={form.cardNumber}
                  className="font-mono"
                  onChange={(e) =>
                    set("cardNumber", e.target.value.replace(/[^\d\s]/g, ""))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Expiry</label>
                  <Input
                    required
                    placeholder="08 / 28"
                    maxLength={7}
                    value={form.expiry}
                    onChange={(e) => set("expiry", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">CVV</label>
                  <Input
                    required
                    placeholder="···"
                    maxLength={4}
                    type="password"
                    value={form.cvv}
                    onChange={(e) => set("cvv", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name on Card</label>
                <Input
                  required
                  placeholder="NILE INDUSTRIES LTD"
                  value={form.name}
                  className="font-mono uppercase"
                  onChange={(e) => set("name", e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full py-6">
                {loading ? "Processing…" : "Pay USD 1,000.00 securely →"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
