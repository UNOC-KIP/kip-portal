"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Admin-only per-application submission deadline. Calls
 * PUT /applications/:id/submission-extension, which lets this one applicant
 * submit (or amend) after the window has closed for everyone else. The date is
 * taken as the end of that day in Kampala, the same zone every deadline in the
 * portal is shown in. The API decides the rest — `submissionDeadline()` in
 * @kip/shared is the rule the submit guard, the edit gate and the TC gate share.
 */
export function SubmissionExtensionControl({
  applicationId,
  currentLabel,
  active,
  allowed,
  blockedReason,
}: {
  applicationId: string;
  /** The extended deadline, already formatted, or null when none is set. */
  currentLabel: string | null;
  /** Whether that deadline is still in the future (computed on the server). */
  active: boolean;
  /** Whether this application's stage can take an extension at all. */
  allowed: boolean;
  blockedReason?: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(until: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/submission-extension`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ until, ...(notes.trim() ? { notes: notes.trim() } : {}) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      setDate("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the submission deadline");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {currentLabel && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
            active ? "border-brand-200 bg-brand-50 text-brand-800" : "border-ink-200 bg-ink-50 text-ink-600"
          }`}
        >
          <CalendarClock size={14} className="mt-0.5 shrink-0" />
          <span>
            {active ? (
              <>
                This applicant may submit and edit until <strong>{currentLabel}</strong>, whatever the
                window says. The TC cannot decide on it until then.
              </>
            ) : (
              <>The extension to {currentLabel} has ended.</>
            )}
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {allowed ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Allow submission until (end of day, Kampala)
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!date || saving}
              onClick={() => save(`${date}T23:59:59+03:00`)}
            >
              {saving ? "Saving…" : currentLabel ? "Change deadline" : "Extend deadline"}
            </Button>
            {currentLabel && active && (
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => save(null)}>
                Remove extension
              </Button>
            )}
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason (optional, recorded in the audit trail)"
            className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </>
      ) : (
        <p className="text-xs text-ink-500">{blockedReason}</p>
      )}
    </div>
  );
}
