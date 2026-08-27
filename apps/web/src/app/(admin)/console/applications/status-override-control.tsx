"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

interface Opt {
  value: string;
  label: string;
}

/**
 * Admin-only stage override. Calls PATCH /applications/:id/status behind an
 * explicit confirmation that names the source and target stage, since it steps
 * outside the committee pipeline. The API refuses to move an application that
 * already holds a final outcome; `locked` reflects that here so the control is
 * never even offered in that case.
 */
export function StatusOverrideControl({
  applicationId,
  currentStatus,
  currentLabel,
  options,
  locked,
  lockedReason,
}: {
  applicationId: string;
  currentStatus: string;
  currentLabel: string;
  options: Opt[];
  locked: boolean;
  lockedReason?: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choices = options.filter((o) => o.value !== currentStatus);

  if (locked) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600">
        <ShieldAlert size={14} className="mt-0.5 shrink-0 text-ink-400" />
        <span>
          {lockedReason ??
            "This application has a final outcome — its stage can no longer be overridden."}
        </span>
      </div>
    );
  }

  async function apply() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: target,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      setConfirming(false);
      setTarget("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not override the stage");
    } finally {
      setSaving(false);
    }
  }

  const targetLabel = choices.find((c) => c.value === target)?.label ?? "";

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {!confirming ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              Move to stage
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Select a stage…</option>
              {choices.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!target}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
          >
            Override stage
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="mb-2 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-900">
              This bypasses the TC → LAC → ExCo committee flow and moves the application from{" "}
              <strong>{currentLabel}</strong> to <strong>{targetLabel}</strong>. It is recorded in the
              audit trail.
            </p>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Reason for the override (optional, recorded)"
            className="mb-2 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={apply} disabled={saving}>
              {saving ? "Applying…" : "Confirm override"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
