"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

interface Props {
  applicationId: string;
  section: string;
  label: string;
  payload: unknown;
}

/**
 * Admin escape hatch for correcting EOI section content. Edits the raw JSON
 * payload; the API validates it against the section's Zod schema before
 * saving, so malformed or incomplete payloads are rejected server-side.
 */
export function SectionEditButton({ applicationId, section, label, payload }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setText(JSON.stringify(payload ?? {}, null, 2));
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Not valid JSON — check for missing quotes, commas or braces.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/section`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, payload: parsed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-2 text-xs text-ink-400 hover:text-ink-900"
        onClick={handleOpen}
      >
        <Edit2 size={11} /> Edit
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-ink-400 hover:text-ink-900" aria-label="Close">
              <X size={18} />
            </button>

            <h2 className="mb-1 text-base font-bold text-ink-900">Edit Section — {label}</h2>
            <p className="mb-4 text-xs text-ink-500">
              Raw section data (JSON). Saved values are validated against the section schema.
            </p>

            {error && (
              <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              rows={18}
              className="w-full rounded-md border border-ink-300 bg-ink-50 p-3 font-mono text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save Section"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
