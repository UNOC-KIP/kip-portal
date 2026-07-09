"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { apiUrl } from "@/lib/api";
import { EditUserDialog, type UserEditData } from "./edit-user-dialog";

interface Props {
  userId: string;
  /** Display name used in the delete confirmation (company or email). */
  displayName: string;
  /** Application reference shown in the delete warning, if the investor has one. */
  applicationRef?: string | null;
  edit: UserEditData;
}

export function UserManageButtons({ userId, displayName, applicationRef, edit }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consequences = edit.hasOrg
    ? [
        "Disable sign-in for this account immediately",
        applicationRef
          ? `Delete application ${applicationRef} and its payment records`
          : "Delete all applications and payment records belonging to this account",
        "Delete the company profile if no other account uses it",
        "Remove the account from the users list and all reports",
      ]
    : [
        "Disable sign-in for this account immediately",
        "Remove the account from the staff list",
        "Keep past review actions visible in application audit trails",
      ];

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/users/${userId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? "Failed to delete user");
      }
      router.push("/console/users");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
        <Edit2 size={13} /> Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
        onClick={() => { setError(null); setDeleteOpen(true); }}
      >
        <Trash2 size={13} /> Delete
      </Button>

      <EditUserDialog open={editOpen} onClose={() => setEditOpen(false)} userId={userId} initial={edit} />

      <ConfirmDeleteDialog
        open={deleteOpen}
        title={edit.hasOrg ? "Delete this investor account?" : "Delete this staff account?"}
        entityName={displayName}
        entityDetail={edit.email}
        consequences={consequences}
        confirmLabel="Delete Account"
        loading={deleting}
        error={error}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
