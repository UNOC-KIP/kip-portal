"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Deletes one of the investor's own DRAFT applications, gated behind a modal
 * that spells out the data loss (a destructive, one-way action deserves a real
 * confirmation, not a one-click button). The API still enforces ownership and
 * the draft-only rule; this only offers the control. On success the server
 * component re-reads and the row disappears.
 */
export function DeleteApplicationButton({
  applicationId,
  reference,
}: {
  applicationId: string;
  reference?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      setBusy(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Don't let the dialog close mid-request.
        if (busy) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 size={14} className="mr-1" />
          Delete
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ink-200 bg-white p-6 shadow-xl focus:outline-none"
          onEscapeKeyDown={(e) => busy && e.preventDefault()}
          onInteractOutside={(e) => busy && e.preventDefault()}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold text-ink-900">
                Delete this application?
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-ink-600">
                {reference ? (
                  <>
                    Application{" "}
                    <span className="font-semibold text-ink-900">
                      {reference}
                    </span>{" "}
                    and all of its progress
                  </>
                ) : (
                  "This application and all of its progress"
                )}{" "}
                will be permanently removed — every section you&apos;ve
                completed, the documents you&apos;ve uploaded, and any plots
                you&apos;ve selected.{" "}
                <span className="font-semibold text-ink-900">
                  This can&apos;t be undone.
                </span>
              </Dialog.Description>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={busy}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleDelete}
              disabled={busy}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={15} className="mr-2" />
                  Delete application
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
