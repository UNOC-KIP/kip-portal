"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

interface Props {
  open: boolean;
  onClose: () => void;
  /** If provided, pre-populates the form and sends a PATCH instead of POST */
  editing?: {
    id: string;
    name: string;
    closeAt: string; // ISO or short-date string
  };
}

export function CreateWindowDialog({ open, onClose, editing }: Props) {
  const router = useRouter();
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name ?? "");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState(editing?.closeAt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEdit
        ? `${API_BASE}/windows/${editing!.id}`
        : `${API_BASE}/windows`;

      const body = isEdit
        ? { name: name || undefined, closeAt: closeAt || undefined }
        : { name, openAt, closeAt };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-400 hover:text-ink-900"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="mb-1 text-base font-bold text-ink-900">
          {isEdit ? "Edit Application Window" : "Create Application Window"}
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          {isEdit
            ? "Update the window name or extend the closing date."
            : "Only one window may be OPEN at a time. New windows are created as Draft."}
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">Window Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Phase 1 — Round 2: Priority Industries"
              required
            />
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">Opens At</label>
              <Input
                type="datetime-local"
                value={openAt}
                onChange={(e) => setOpenAt(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">
              {isEdit ? "Extend Close Date To" : "Closes At"}
            </label>
            <Input
              type="datetime-local"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
              required={!isEdit}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Window"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
