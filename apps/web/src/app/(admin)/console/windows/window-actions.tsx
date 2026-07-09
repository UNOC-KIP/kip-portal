"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Play, Square, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CreateWindowDialog } from "./create-window-dialog";
import { apiUrl } from "@/lib/api";
import type { WindowRow } from "@/lib/admin/mappers";

type TransitionAction = "open" | "close" | "archive";

const ACTION_LABELS: Record<TransitionAction, string> = {
  open: "Open",
  close: "Close",
  archive: "Archive",
};

const ACTION_CONFIRM: Record<TransitionAction, string> = {
  open: "Open this window? Investors will be able to submit applications.",
  close: "Close this window? No new submissions will be accepted.",
  archive: "Archive this window? This cannot be undone.",
};

export function WindowActions({ window: w }: { window: WindowRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<TransitionAction | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleTransition(action: TransitionAction) {
    if (!confirm(ACTION_CONFIRM[action])) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/windows/${w.id}/${action}`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Failed to ${action} window`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setBusy(null);
    }
  }

  const canOpen    = w.status === "DRAFT";
  const canClose   = w.status === "OPEN";
  const canArchive = w.status === "CLOSED";
  const canEdit    = w.status !== "ARCHIVED";
  const canDelete  = w.status !== "OPEN";

  async function handleDelete() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(apiUrl(`/windows/${w.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? "Failed to delete window");
      }
      setDeleteOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEditOpen(true)}
          >
            <Edit2 size={12} /> Edit
          </Button>
        )}

        {canOpen && (
          <Button
            size="sm"
            className="h-7 gap-1.5 bg-green-600 text-xs hover:bg-green-700"
            disabled={busy !== null}
            onClick={() => handleTransition("open")}
          >
            <Play size={12} />
            {busy === "open" ? "Opening…" : ACTION_LABELS.open}
          </Button>
        )}

        {canClose && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-amber-300 text-xs text-amber-700 hover:bg-amber-50"
            disabled={busy !== null}
            onClick={() => handleTransition("close")}
          >
            <Square size={12} />
            {busy === "close" ? "Closing…" : ACTION_LABELS.close}
          </Button>
        )}

        {canArchive && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-ink-300 text-xs text-ink-500 hover:bg-ink-50"
            disabled={busy !== null}
            onClick={() => handleTransition("archive")}
          >
            <Archive size={12} />
            {busy === "archive" ? "Archiving…" : ACTION_LABELS.archive}
          </Button>
        )}

        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-red-300 text-xs text-red-700 hover:bg-red-50"
            disabled={busy !== null}
            onClick={() => { setError(null); setDeleteOpen(true); }}
          >
            <Trash2 size={12} /> Delete
          </Button>
        )}
      </div>

      {error && !deleteOpen && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <CreateWindowDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={{ id: w.id, name: w.name, closeAt: "" }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        title="Delete this application window?"
        entityName={w.name}
        entityDetail={`${w.openAt} – ${w.closeAt} · ${w.statusLabel ?? w.status}`}
        consequences={[
          "Remove the window from this list",
          w.sequenceCounter > 0
            ? `Keep the ${w.sequenceCounter} already-assigned reference${w.sequenceCounter === 1 ? "" : "s"} on their applications`
            : "No references have been assigned from this window",
          "Windows cannot be recovered from the console — create a new one for a future round",
        ]}
        confirmLabel="Delete Window"
        loading={busy === "delete"}
        error={error}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
