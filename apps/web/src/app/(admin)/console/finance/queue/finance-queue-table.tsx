"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  Send,
  Download,
  Search,
  Receipt,
  UserSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatMoney,
  COMPANY_TYPE_LABELS,
  BUSINESS_SECTOR_LABELS,
  type CompanyType,
  type BusinessSector,
  type FinanceRow,
} from "@kip/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

function paymentLabel(r: FinanceRow): { label: string; cls: string } {
  if (r.paymentStatus === "CONFIRMED") return { label: "Paid", cls: "bg-green-100 text-green-700" };
  if (r.paymentStatus === "FAILED") return { label: "Failed", cls: "bg-red-100 text-red-700" };
  if (r.paymentStatus === "PROOF_UPLOADED") return { label: "Receipt uploaded", cls: "bg-amber-100 text-amber-700" };
  return { label: "Awaiting payment", cls: "bg-ink-100 text-ink-600" };
}

/** Normalised payment bucket for filtering (null/PENDING both count as awaiting). */
function payBucket(r: FinanceRow): "CONFIRMED" | "FAILED" | "PROOF_UPLOADED" | "AWAITING" {
  if (r.paymentStatus === "CONFIRMED") return "CONFIRMED";
  if (r.paymentStatus === "FAILED") return "FAILED";
  if (r.paymentStatus === "PROOF_UPLOADED") return "PROOF_UPLOADED";
  return "AWAITING";
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function dateOnly(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

/** Display label for a stored enum value, falling back to the raw value. */
function labelFor<T extends string>(map: Record<T, string>, value: string | null): string {
  if (!value) return "";
  return map[value as T] ?? value;
}

/**
 * Build a CSV (with a BOM so Excel reads UTF-8 correctly) from the given rows.
 * Finance raises invoices from this file, so it carries the billed party in
 * full — legal identity, registered address and contacts — not just the summary
 * the table has room for.
 */
function buildCsv(rows: FinanceRow[]): string {
  const headers = [
    "Reference", "Application status",
    "Applicant", "Designation", "Applicant email", "Applicant phone",
    "Company (legal name)", "Trading name", "TIN",
    "Company type", "Business sector",
    "Registration no.", "URSB no.", "Country of incorporation",
    "Registered address", "Company email", "Company phone",
    "Plots", "Plot numbers",
    "Subtotal", "VAT", "Total", "Currency",
    "Invoice", "Invoice sent",
    "Payment", "Transfer ref", "Date paid", "Verified on",
    "Proof of payment", "Submitted",
  ];
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.reference ?? "",
        r.status,
        r.applicantName ?? "",
        r.applicantDesignation ?? "",
        r.email ?? "",
        r.applicantPhone ?? "",
        r.company ?? "",
        r.tradingName ?? "",
        r.tin ?? "",
        labelFor<CompanyType>(COMPANY_TYPE_LABELS, r.companyType),
        labelFor<BusinessSector>(BUSINESS_SECTOR_LABELS, r.businessSector),
        r.registrationNumber ?? "",
        r.ursbRegistrationNumber ?? "",
        r.countryOfIncorporation ?? "",
        r.address ?? "",
        r.companyEmail ?? "",
        r.companyPhone ?? "",
        r.plotCount,
        r.plotNames.join(" | "),
        r.subtotal.toFixed(2),
        r.vat.toFixed(2),
        r.total.toFixed(2),
        r.currency,
        r.invoiceStatus === "SENT" ? "Sent" : "Not sent",
        dateOnly(r.invoiceSentAt),
        paymentLabel(r).label,
        r.transferRef ?? "",
        dateOnly(r.paidAt),
        dateOnly(r.confirmedAt),
        r.hasReceipt ? "Uploaded" : "None",
        dateOnly(r.submittedAt),
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function FinanceQueueTable({ rows }: { rows: FinanceRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const noteRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Filters
  const [query, setQuery] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [invFilter, setInvFilter] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (payFilter && payBucket(r) !== payFilter) return false;
      if (invFilter && r.invoiceStatus !== invFilter) return false;
      if (!q) return true;
      return [
        r.reference,
        r.applicantName,
        r.company,
        r.tradingName,
        r.email,
        r.tin,
        r.address,
      ].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [rows, query, payFilter, invFilter]);

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`kip-finance-${stamp}.csv`, buildCsv(filtered));
  }

  async function post(url: string, body: unknown): Promise<Response> {
    return fetch(`${API_BASE}${url}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function sendInvoice(r: FinanceRow, markOnly: boolean) {
    if (!r.paymentId) return;
    const pid = r.paymentId;
    setBusy(pid + ":inv");
    setError(null);
    try {
      let payload: Record<string, unknown> = {
        markOnly,
        note: noteRefs.current[pid]?.value || undefined,
      };
      if (!markOnly) {
        const file = fileRefs.current[pid]?.files?.[0];
        if (!file) throw new Error("Choose the invoice file to attach, or use 'Mark as sent'.");
        const pres = await post(`/finance/payments/${pid}/invoice/presign`, {
          filename: file.name,
          contentType: file.type || "application/pdf",
        });
        if (!pres.ok) throw new Error((await pres.json().catch(() => ({})))?.error?.message ?? "Could not prepare the upload.");
        const { documentId, uploadUrl, storageKey } = await pres.json();
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file,
        });
        if (!put.ok) throw new Error("Upload to storage failed.");
        payload = {
          ...payload,
          documentId,
          storageKey,
          filename: file.name,
          mimeType: file.type || "application/pdf",
          sizeBytes: file.size,
        };
      }
      const res = await post(`/finance/payments/${pid}/invoice/send`, payload);
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message ?? "Could not send the invoice.");
      setOpenInvoice(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  /** Open the receipt the investor uploaded, via a short-lived presigned URL. */
  async function downloadProof(r: FinanceRow) {
    setBusy(r.applicationId + ":proof");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${r.applicationId}/proof`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(
          (await res.json().catch(() => ({})))?.error?.message ??
            "The proof of payment isn't available.",
        );
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the proof of payment.");
    } finally {
      setBusy(null);
    }
  }

  async function verify(r: FinanceRow, result: "CONFIRMED" | "FAILED") {
    if (!r.paymentId) return;
    setBusy(r.paymentId + ":ver");
    setError(null);
    try {
      const res = await post(`/finance/payments/${r.paymentId}/verify`, { result });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message ?? "Could not verify the payment.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}

      {/* Filters + export */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, applicant, company, email, TIN…"
            className="h-9 w-72 pl-8 text-sm"
          />
        </div>
        <select
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value)}
          className="h-9 rounded-md border border-ink-300 bg-white px-2 text-sm"
        >
          <option value="">All payments</option>
          <option value="AWAITING">Awaiting payment</option>
          <option value="PROOF_UPLOADED">Receipt uploaded</option>
          <option value="CONFIRMED">Paid</option>
          <option value="FAILED">Failed</option>
        </select>
        <select
          value={invFilter}
          onChange={(e) => setInvFilter(e.target.value)}
          className="h-9 rounded-md border border-ink-300 bg-white px-2 text-sm"
        >
          <option value="">All invoices</option>
          <option value="NOT_SENT">Invoice not sent</option>
          <option value="SENT">Invoice sent</option>
        </select>
        <span className="text-xs text-ink-500">
          {filtered.length} of {rows.length}
        </span>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-3 py-3 font-semibold">Reference</th>
              <th className="px-3 py-3 font-semibold">Applicant</th>
              <th className="px-3 py-3 font-semibold">Company</th>
              <th className="px-3 py-3 font-semibold">Email</th>
              <th className="px-3 py-3 font-semibold">TIN</th>
              <th className="px-3 py-3 font-semibold">Plots</th>
              <th className="px-3 py-3 font-semibold">Amount (incl. VAT)</th>
              <th className="px-3 py-3 font-semibold">Invoice</th>
              <th className="px-3 py-3 font-semibold">Payment</th>
              <th className="px-3 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const pay = paymentLabel(r);
              const invoiceSent = r.invoiceStatus === "SENT";
              const settled = r.paymentStatus === "CONFIRMED" || r.paymentStatus === "FAILED";
              const invBusy = busy === r.paymentId + ":inv";
              const verBusy = busy === r.paymentId + ":ver";
              const proofBusy = busy === r.applicationId + ":proof";
              return (
                <tr key={r.applicationId} className="border-b border-ink-100 align-top last:border-0 hover:bg-ink-50/40">
                  <td className="px-3 py-3 font-bold tracking-tight">
                    <Link
                      href={`/console/finance/${r.applicationId}`}
                      className="text-ink-900 underline-offset-2 hover:text-brand-700 hover:underline"
                    >
                      {r.reference ?? "Draft — no ref"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-ink-700">{r.applicantName ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-700">{r.company ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-600">{r.email ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-600">{r.tin ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-700">{r.plotCount}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-900">
                    <span className="font-semibold">{formatMoney(r.total, r.currency)}</span>
                    <span className="block text-[11px] text-ink-400">
                      {formatMoney(r.subtotal, r.currency)} + VAT {formatMoney(r.vat, r.currency)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${invoiceSent ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-600"}`}>
                      {invoiceSent ? "Sent" : "Not sent"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${pay.cls}`}>{pay.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/console/finance/${r.applicationId}`}>
                            <UserSearch size={13} className="mr-1" /> View profile
                          </Link>
                        </Button>
                        {r.hasReceipt && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={proofBusy}
                            onClick={() => downloadProof(r)}
                          >
                            {proofBusy ? (
                              <Loader2 size={13} className="mr-1 animate-spin" />
                            ) : (
                              <Receipt size={13} className="mr-1" />
                            )}
                            Proof
                          </Button>
                        )}
                      </div>
                      {r.paymentId !== null && openInvoice === r.paymentId ? (
                        <div className="w-64 rounded-lg border border-ink-200 bg-white p-2 text-left shadow-sm">
                          <input
                            ref={(el) => { fileRefs.current[r.paymentId as string] = el; }}
                            type="file"
                            accept="application/pdf,image/*"
                            className="mb-2 block w-full text-xs"
                          />
                          <input
                            ref={(el) => { noteRefs.current[r.paymentId as string] = el; }}
                            type="text"
                            placeholder="Optional note to applicant"
                            className="mb-2 block w-full rounded border border-ink-200 px-2 py-1 text-xs"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" disabled={invBusy} onClick={() => sendInvoice(r, false)}>
                              {invBusy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className="mr-1" />} Attach & send
                            </Button>
                            <Button size="sm" variant="outline" disabled={invBusy} onClick={() => sendInvoice(r, true)}>
                              Mark as sent
                            </Button>
                            <Button size="sm" variant="ghost" disabled={invBusy} onClick={() => setOpenInvoice(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" disabled={!r.paymentId} onClick={() => { setOpenInvoice(r.paymentId as string); setError(null); }}>
                          <Upload size={13} className="mr-1" /> {invoiceSent ? "Resend invoice" : "Send invoice"}
                        </Button>
                      )}
                      {!settled && (
                        <div className="flex gap-1.5">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={verBusy || !r.paymentId} onClick={() => verify(r, "CONFIRMED")}>
                            {verBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} className="mr-1" />} Paid
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={verBusy || !r.paymentId} onClick={() => verify(r, "FAILED")}>
                            <XCircle size={13} className="mr-1" /> Failed
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-10 text-center text-sm text-ink-400">No applications match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
