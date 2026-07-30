"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

interface Props {
  communicationId: string;
  subject: string;
  failedCount: number;
  /** Retry is offered while anything is still unsent, including a stalled run. */
  unsentCount: number;
  isSending: boolean;
}

export function CommunicationActions({
  communicationId,
  subject,
  failedCount,
  unsentCount,
  isSending,
}: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/communications/${communicationId}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? "Failed to retry");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setRetrying(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/communications/${communicationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? "Failed to delete");
      }
      router.push("/console/communications");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.refresh()} disabled={retrying}>
          Refresh
        </Button>
        {unsentCount > 0 && (
          <Button onClick={handleRetry} disabled={retrying}>
            <RefreshCw size={14} className="mr-1.5" />
            {retrying
              ? "Starting…"
              : failedCount > 0
                ? `Retry ${failedCount} failed`
                : `Resume ${unsentCount} unsent`}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={isSending}
          title={isSending ? "Wait for sending to finish" : undefined}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <ConfirmDeleteDialog
        open={confirmOpen}
        title="Delete this communication?"
        entityName={subject}
        consequences={[
          "Remove the broadcast and its per-recipient delivery log",
          "Remove the message from every recipient's portal inbox",
          "Leave emails already delivered untouched — they cannot be recalled",
        ]}
        confirmLabel="Delete Communication"
        loading={deleting}
        error={null}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
