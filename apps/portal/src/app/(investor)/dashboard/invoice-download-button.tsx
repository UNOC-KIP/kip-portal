"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Fetches a short-lived download URL for this application's fee invoice and
 * opens it. Shown only when an invoice document has been attached.
 */
export function InvoiceDownloadButton({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openInvoice() {
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <Button type="button" size="sm" variant="outline" onClick={openInvoice} disabled={busy}>
        {busy ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
        ) : (
          <Download size={14} className="mr-1.5" />
        )}
        Download invoice
      </Button>
      {error && (
        <span role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</span>
      )}
    </span>
  );
}
