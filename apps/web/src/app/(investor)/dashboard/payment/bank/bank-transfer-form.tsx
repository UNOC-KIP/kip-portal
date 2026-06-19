"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB — matches presignProofSchema

interface BankDetail {
  label: string;
  value: string;
}

interface BankTransferFormProps {
  applicationId: string;
  paymentRef: string;
  bankDetails: readonly BankDetail[];
}

export function BankTransferForm({ applicationId, paymentRef, bankDetails }: BankTransferFormProps) {
  const router = useRouter();
  const [txRef, setTxRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE_BYTES) {
      setErrorMsg("File exceeds the 10 MB limit. Please choose a smaller file.");
      return;
    }
    setErrorMsg(null);
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Step 1: initiate payment — server determines the fee; never trust client amount.
      const initRes = await fetch(`${API_BASE}/payments/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ applicationId, method: "STANBIC_TRANSFER", currency: "USD" }),
      });
      if (!initRes.ok) {
        const body = await initRes.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to initiate payment.");
      }
      const { payment } = await initRes.json() as { payment: { id: string } };

      // Step 2: get presigned S3 PUT URL for the proof document.
      const presignRes = await fetch(`${API_BASE}/payments/${payment.id}/presign-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
      });
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to prepare file upload.");
      }
      const { documentId, uploadUrl } = await presignRes.json() as { documentId: string; uploadUrl: string };

      // Step 3: upload file directly to S3 via the presigned URL.
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error("File upload to storage failed. Please try again.");
      }

      // Step 4: mark proof as submitted — links the document to the payment.
      const submitRes = await fetch(`${API_BASE}/payments/${payment.id}/submit-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          documentId,
          reference: txRef,
          paidAt: new Date().toISOString(),
        }),
      });
      if (!submitRes.ok) {
        const body = await submitRes.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to submit proof. Please try again.");
      }

      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
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
                      Bank Slip, Screenshot, or MT103 · PDF, JPG, PNG · Max 10 MB
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
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {errorMsg && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </p>
            )}

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
