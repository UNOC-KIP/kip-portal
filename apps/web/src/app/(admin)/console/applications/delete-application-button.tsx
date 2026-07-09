"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { apiUrl } from "@/lib/api";

interface Props {
  applicationId: string;
  /** Reference shown in the confirmation, e.g. "KIP-EOI-2026-0001" or "(draft)". */
  reference: string;
  /** Applicant company name, shown under the reference. */
  company?: string;
  /** When set, navigate here after deleting (detail page → back to the list). */
  redirectTo?: string;
}

export function DeleteApplicationButton({ applicationId, reference, company, redirectTo }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/applications/${applicationId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? "Failed to delete application");
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => { setError(null); setOpen(true); }}
      >
        <Trash2 size={12} /> Delete
      </Button>

      <ConfirmDeleteDialog
        open={open}
        title="Delete this application?"
        entityName={reference}
        entityDetail={company}
        consequences={[
          "Remove the application from the admin console and the investor's dashboard",
          "Delete its payment records — confirmed amounts leave the revenue totals",
          "Withdraw it from any review queue (TC / LAC / ExCo)",
          "Keep review history in the database, but it becomes unreachable",
        ]}
        confirmLabel="Delete Application"
        loading={deleting}
        error={error}
        onCancel={() => setOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
