"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Opens a finance document for an application — either the payment proof
 * (receipt) the investor uploaded, or the invoice finance attached. Asks the API
 * for a short-lived presigned URL, then opens it in a new tab. The endpoints
 * enforce the role; this only drives the click.
 */
export function ProofDownloadButton({
  applicationId,
  kind = "proof",
  label,
  variant = "default",
}: {
  applicationId: string;
  kind?: "proof" | "invoice";
  label?: string;
  variant?: "default" | "outline";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/${kind}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "That file isn't available.");
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button size="sm" variant={variant} onClick={download} disabled={busy}>
        {busy ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
        ) : (
          <Download size={14} className="mr-1.5" />
        )}
        {label ?? (kind === "invoice" ? "Download invoice" : "Download proof of payment")}
      </Button>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
