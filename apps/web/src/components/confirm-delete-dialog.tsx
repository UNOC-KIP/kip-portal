"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  /** Question the admin is answering, e.g. "Delete this investor account?" */
  title: string;
  /** The record being deleted, shown prominently, e.g. company name or reference. */
  entityName: string;
  /** Optional secondary line under the entity name, e.g. the login email. */
  entityDetail?: string;
  /** What will happen, one bullet per consequence. */
  consequences: string[];
  /** Confirm button label, e.g. "Delete Account". */
  confirmLabel: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Shared destructive-action confirmation. Records are soft-deleted (hidden,
 * recoverable by a database administrator) — the footer states this so admins
 * know deletion is immediate but not unrecoverable.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  entityName,
  entityDetail,
  consequences,
  confirmLabel,
  loading,
  error,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={20} className="text-red-600" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-bold text-ink-900">{title}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-ink-900">{entityName}</p>
            {entityDetail && <p className="truncate text-xs text-ink-500">{entityDetail}</p>}
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-red-700">
            This will:
          </p>
          <ul className="space-y-1.5">
            {consequences.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-red-800">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <p className="mb-4 text-xs text-ink-500">
          The record is hidden immediately across both portals. It is not permanently
          erased — a database administrator can restore it if this was a mistake.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
