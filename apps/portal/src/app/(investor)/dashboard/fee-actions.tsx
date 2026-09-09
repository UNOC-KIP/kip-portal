"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@kip/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png"];

type PaymentLite = {
  id: string;
  status: string;
  invoiceStatus: string | null;
  invoiceDocumentId: string | null;
  currency: string;
  amount: string;
  subtotalAmount: string | null;
  vatAmount: string | null;
};

/**
 * Everything an investor needs for one application's fee: generate the invoice,
 * download it, and upload the payment receipt. Self-contained — give it an
 * applicationId and it fetches and manages its own state.
 */
export function FeeActions({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentLite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const refRef = useRef<HTMLInputElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/payments?applicationId=${applicationId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const { payments } = (await res.json()) as { payments: PaymentLite[] };
        setPayment(payments?.[0] ?? null);
      }
    } catch {
      /* ignore — surfaced on actions */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  async function generate() {
    setBusy("gen");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/request-invoice`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "Could not generate the invoice.");
      }
      setNotice("Invoice generated. UNOC will email it to you shortly.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadInvoice() {
    setBusy("dl");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/invoice`, {
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "Invoice isn't available yet.");
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the invoice.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadReceipt() {
    if (!payment) return;
    setError(null);
    setNotice(null);
    const file = fileRef.current?.files?.[0];
    const reference = refRef.current?.value?.trim();
    const dateVal = dateRef.current?.value;
    if (!file) return setError("Choose your receipt file first.");
    if (!PROOF_TYPES.includes(file.type)) return setError("Upload a PDF, JPG, or PNG.");
    if (file.size > 10 * 1024 * 1024) return setError("File must be 10 MB or smaller.");
    if (!reference) return setError("Enter the bank transfer reference.");
    if (!dateVal) return setError("Enter the date you paid.");

    setBusy("upload");
    try {
      // 1. presign
      const pres = await fetch(`${API_BASE}/payments/${payment.id}/presign-proof`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
      });
      if (!pres.ok) {
        const d = (await pres.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "Could not start the upload.");
      }
      const { documentId, uploadUrl } = (await pres.json()) as { documentId: string; uploadUrl: string };
      // 2. PUT to S3
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload to storage failed. Please try again.");
      // 3. submit proof
      const sub = await fetch(`${API_BASE}/payments/${payment.id}/submit-proof`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          reference,
          paidAt: new Date(dateVal).toISOString(),
        }),
      });
      if (!sub.ok) {
        const d = (await sub.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "Could not submit your receipt.");
      }
      setShowUpload(false);
      setNotice("Receipt uploaded. The finance team will verify your payment.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Loader2 size={15} className="animate-spin" /> Loading fee…
      </div>
    );
  }

  const status = payment?.status ?? null;
  const paid = status === "CONFIRMED";
  const proofUploaded = status === "PROOF_UPLOADED";
  const failed = status === "FAILED";
  const invoiceReady = !!payment?.invoiceDocumentId;

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      {payment ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-ink-900">
              Application fee: {formatMoney(Number(payment.amount), payment.currency)}
              <span className="ml-1 text-xs font-normal text-ink-500">(incl. 18% VAT)</span>
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                paid ? "bg-green-100 text-green-700"
                : failed ? "bg-red-100 text-red-700"
                : proofUploaded ? "bg-amber-100 text-amber-700"
                : "bg-ink-100 text-ink-600"
              }`}
            >
              {paid ? "Paid" : failed ? "Payment failed" : proofUploaded ? "Receipt under review" : "Awaiting payment"}
            </span>
          </div>

          <p className="mt-2 text-sm text-ink-600">
            {paid
              ? "Your fee has been received and verified. Thank you."
              : failed
                ? "We couldn't verify your payment. Please re-check your receipt or contact the secretariat."
                : proofUploaded
                  ? "We've received your receipt — the finance team is verifying it."
                  : invoiceReady
                    ? "Pay by bank transfer using the account and details on your invoice, then upload your receipt below."
                    : "Your invoice is being prepared and will be emailed to you. You can download it here once ready."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {invoiceReady && (
              <Button size="sm" variant="outline" onClick={downloadInvoice} disabled={busy === "dl"}>
                {busy === "dl" ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
                Download invoice
              </Button>
            )}
            {!paid && !proofUploaded && !failed && (
              <Button size="sm" onClick={() => { setShowUpload((v) => !v); setError(null); }}>
                <Upload size={14} className="mr-1.5" /> {showUpload ? "Cancel" : "Upload receipt"}
              </Button>
            )}
          </div>

          {showUpload && !paid && !proofUploaded && (
            <div className="mt-4 space-y-3 rounded-lg border border-ink-200 bg-ink-50/50 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  Receipt (PDF, JPG or PNG)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-700">Bank transfer reference</label>
                  <Input ref={refRef} placeholder="e.g. FT2609ABC123" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-700">Date paid</label>
                  <Input ref={dateRef} type="date" className="h-9 text-sm" />
                </div>
              </div>
              <Button size="sm" onClick={uploadReceipt} disabled={busy === "upload"}>
                {busy === "upload" ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Upload size={14} className="mr-1.5" />}
                Submit receipt
              </Button>
            </div>
          )}

          {status === "PENDING" && (
            <button
              type="button"
              onClick={generate}
              disabled={busy === "gen"}
              className="mt-3 block text-xs font-medium text-ink-500 underline underline-offset-2 hover:text-ink-900"
            >
              {busy === "gen" ? "Updating…" : "Plots changed? Update the invoice amount"}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-ink-900">No invoice yet</p>
          <p className="mt-1 text-sm text-ink-600">
            Generate your application-fee invoice for the plots you&apos;ve selected. UNOC
            will email it to you, and you can pay and upload your receipt here. If you
            change plots later, generate a new invoice while this one is unpaid — once
            paid, the fee is non-refundable.
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={generate} disabled={busy === "gen"}>
              {busy === "gen" ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileText size={14} className="mr-1.5" />}
              Generate invoice
            </Button>
          </div>
        </>
      )}

      {notice && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-700">
          <CheckCircle2 size={13} /> {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {error}
          {/\bTIN\b/i.test(error) && (
            <>
              {" "}
              <Link
                href="/dashboard/settings"
                className="font-semibold underline underline-offset-2"
              >
                Add it in Settings →
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
