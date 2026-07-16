"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { KipZone } from "@kip/shared";
import { Button } from "@/components/ui/button";
import { SiteVisitSummary } from "@/components/site-visit-summary";
import { SiteVisitForm } from "./site-visit-form";

type ManageBooking = {
  id: string;
  zone: string;
  landUse: string;
  description: string;
  acres: number;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
};

/**
 * Investor-facing view of an existing site-visit booking: the read-only summary
 * plus Edit / Delete controls while the request is still NEW (not yet scheduled).
 * Editing swaps in the pre-filled booking form; deleting clears the request so a
 * fresh one can be made.
 */
export function SiteVisitManage({ booking }: { booking: ManageBooking }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const editable = booking.status === "NEW";

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/site-visits/${booking.id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error?.message ?? "We couldn't delete your request. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-6 sm:p-8">
        <h2 className="mb-6 text-sm font-bold text-ink-900">Edit your site visit request</h2>
        <SiteVisitForm
          mode="edit"
          bookingId={booking.id}
          initial={{
            zone: booking.zone as KipZone,
            landUse: booking.landUse,
            description: booking.description,
            acres: booking.acres,
          }}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SiteVisitSummary booking={booking} />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {editable ? (
        confirmingDelete ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-semibold text-red-800">
              Delete this site visit request?
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              This can&apos;t be undone. You can always submit a new request afterwards.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
              >
                {deleting ? "Deleting…" : "Yes, delete it"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setConfirmingDelete(false)}
                className="w-full sm:w-auto"
              >
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(true)}
              className="w-full sm:w-auto"
            >
              <Pencil size={14} className="mr-1.5" /> Edit request
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingDelete(true)}
              className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto"
            >
              <Trash2 size={14} className="mr-1.5" /> Delete request
            </Button>
          </div>
        )
      ) : (
        <p className="text-center text-xs text-ink-500">
          Need to change your request? Contact us at{" "}
          <a href="mailto:kipinvestorrelations@unoc.com" className="font-medium underline">
            kipinvestorrelations@unoc.com
          </a>
        </p>
      )}
    </div>
  );
}
