"use client";

import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  subject: string;
  audience: string;
  recipientCount: number;
  channel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Last stop before a broadcast goes out. Deliberately not
 * `ConfirmDeleteDialog` — this isn't destructive, but it is irreversible in the
 * way that matters: once an email leaves the mailbox it cannot be recalled.
 */
export function SendConfirmDialog({
  open,
  subject,
  audience,
  recipientCount,
  channel,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  // The shared mailbox is paced at roughly 27 messages a minute, so a large
  // send takes real time. Show the estimate rather than let it look stuck.
  const minutes = Math.ceil(recipientCount / 27);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 text-ink-400 hover:text-ink-900"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900">
            <Send size={18} className="text-white" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-bold text-ink-900">
              Send to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}?
            </h2>
            <p className="mt-1 truncate text-sm font-semibold text-ink-900">{subject}</p>
            <p className="truncate text-xs text-ink-500">{audience}</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-ink-200 bg-ink-50 p-4">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Delivery</dt>
              <dd className="font-medium text-ink-900">{channel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Estimated time</dt>
              <dd className="font-medium text-ink-900">
                ~{minutes} minute{minutes === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>
        </div>

        <p className="mb-4 text-xs text-ink-500">
          Sending runs in the background at about 27 messages per minute to stay within the
          shared mailbox limit. You can leave this page — progress and any failures appear in
          the history tab, and failed recipients can be retried.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Starting…" : "Send now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
