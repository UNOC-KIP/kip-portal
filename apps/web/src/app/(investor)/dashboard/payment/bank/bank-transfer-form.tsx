"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BankDetail {
  label: string;
  value: string;
}

interface BankTransferFormProps {
  applicationId: string;
  paymentRef: string;
  bankDetails: readonly BankDetail[];
}

export function BankTransferForm({ applicationId: _applicationId, paymentRef, bankDetails }: BankTransferFormProps) {
  const router = useRouter();
  const [txRef, setTxRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO(Phase 3): call POST /payments/initiate (STANBIC_TRANSFER, USD), then
    // upload proof via presigned PUT, then POST /payments/submit-proof with
    // { paymentId, documentId, reference: txRef, paidAt }.
    // For now, redirect back to dashboard as a placeholder.
    await new Promise((r) => setTimeout(r, 800));
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Payment method", href: "/dashboard/payment" },
            { label: "Bank Transfer" },
          ]}
        />

        <div className="mx-auto max-w-xl">
          <h1 className="mb-1 text-center text-2xl font-bold">Bank Transfer</h1>
          <p className="mb-4 text-center text-sm text-ink-500">
            Transfer USD 1,000 to UNOC&apos;s Stanbic Bank account, then upload your proof of
            payment.
          </p>

          {/* Notice */}
          <div className="mb-5 rounded-lg border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-ink-700">
            Bank transfers are manually confirmed by the UNOC Finance team within 2 business
            days. Your Submit button will be enabled once confirmed.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bank details */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-brand-600">
                UNOC Bank Account Details
              </h2>
              <div className="divide-y divide-ink-100">
                {bankDetails.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-ink-500">{label}</span>
                    <span
                      className={`text-sm font-semibold text-ink-900 ${
                        label === "Payment Reference" ? "font-mono text-brand-600" : ""
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-500">
                Use <span className="font-mono font-semibold">{paymentRef}</span> as the
                payment reference in your bank&apos;s transfer form so UNOC Finance can match
                your payment.
              </p>
            </div>

            {/* Tx reference */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Your Bank Transaction Reference *
              </label>
              <Input
                required
                placeholder="TXN/20260422/081234"
                value={txRef}
                className="font-mono"
                onChange={(e) => setTxRef(e.target.value)}
              />
            </div>

            {/* Upload */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Upload proof of payment
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-300 bg-brand-50 py-8 transition hover:border-brand-400">
                <Upload size={20} className="mb-2 text-ink-400" />
                {file ? (
                  <p className="text-sm font-semibold text-brand-600">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-ink-700">
                      Upload proof of payment
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Bank Slip, Screenshot, or MT103 · PDF, JPG, PNG · Max 5 MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 pointer-events-none"
                    >
                      Browse Files
                    </Button>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !txRef || !file}
              className="w-full py-6"
            >
              {loading ? "Submitting…" : "Submit Proof for Finance Review"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
