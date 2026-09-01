"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Deletes one of the investor's own DRAFT applications after an inline confirm
 * (no blocking browser dialog). The API enforces ownership and the draft-only
 * rule; this only offers the control. On success the server component re-reads
 * and the row disappears.
 */
export function DeleteApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          body?.error?.message ?? "Could not delete this application.",
        );
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center justify-end gap-2">
        <span className="text-xs text-ink-500">Delete?</span>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={handleDelete}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "Yes, delete"
          )}
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirming(true)}
        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 size={14} className="mr-1" />
        Delete
      </Button>
      {error && (
        <span role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
