"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import type { TimelineMilestoneRow } from "@/lib/admin/mappers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const KIND_OPTIONS = [
  { value: "GENERIC", label: "Milestone" },
  { value: "SITE_VISIT", label: "Site-visit programme (gates bookings)" },
  { value: "EOI_CALL", label: "Call for EOI (drives countdown)" },
];

type FormState = {
  position: string;
  kind: string;
  title: string;
  dateLabel: string;
  startsAt: string; // datetime-local value
  endsAt: string;
};

const emptyForm = (nextPosition: number): FormState => ({
  position: String(nextPosition),
  kind: "GENERIC",
  title: "",
  dateLabel: "",
  startsAt: "",
  endsAt: "",
});

/** ISO → `datetime-local` input value in the browser's timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Admin editor for the public application timeline. Every save is immediately
 * live on the portal home/about timelines, the investor dashboard stage
 * tracker, the EOI countdown, and the site-visit booking gate.
 */
export function TimelineEditor({ milestones }: { milestones: TimelineMilestoneRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TimelineMilestoneRow | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(1));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    const next = Math.max(0, ...milestones.map((m) => m.position)) + 1;
    setForm(emptyForm(next));
    setError(null);
    setEditing("new");
  };
  const openEdit = (m: TimelineMilestoneRow) => {
    setForm({
      position: String(m.position),
      kind: m.kind,
      title: m.title,
      dateLabel: m.dateLabel,
      startsAt: toLocalInput(m.startsAtIso),
      endsAt: toLocalInput(m.endsAtIso),
    });
    setError(null);
    setEditing(m);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        position: Number(form.position),
        kind: form.kind,
        title: form.title.trim(),
        dateLabel: form.dateLabel.trim(),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      const isNew = editing === "new";
      const res = await fetch(
        isNew ? `${API_BASE}/timeline` : `${API_BASE}/timeline/${(editing as TimelineMilestoneRow).id}`,
        {
          method: isNew ? "POST" : "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Failed to save milestone");
      }
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: TimelineMilestoneRow) {
    if (!window.confirm(`Delete milestone "${m.title}"? The public timeline updates immediately.`)) return;
    setDeletingId(m.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/timeline/${m.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Failed to delete milestone");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setDeletingId(null);
    }
  }

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-600">{label}</span>
      {node}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );

  return (
    <section className="rounded-xl border border-ink-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-ink-500" />
          <h2 className="text-sm font-bold text-ink-900">Application Timeline</h2>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
            {milestones.length} milestone{milestones.length === 1 ? "" : "s"}
          </span>
        </div>
        <Button size="sm" className="gap-2" onClick={openNew}>
          <Plus size={14} /> Add milestone
        </Button>
      </div>

      <div className="px-5 py-2">
        <p className="py-2 text-xs text-ink-400">
          Shown on the portal home and About pages and the investor dashboard. The{" "}
          <span className="font-semibold">Call for EOI</span> milestone drives the home-page
          countdown; the <span className="font-semibold">Site-visit programme</span> milestone
          closes bookings when it starts. Changes go live immediately.
        </p>
        {error && <p className="pb-2 text-sm text-red-600">{error}</p>}
        {milestones.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">
            No milestones yet — the portals are showing the built-in fallback schedule. Add the
            first milestone to take over.
          </p>
        ) : (
          <ol className="divide-y divide-ink-100">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-4 py-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    m.isActive ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {m.position}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{m.title}</p>
                  <p className="text-[11px] text-ink-400">
                    {m.dateLabel} · starts {m.startsAtLabel}
                    {m.kind !== "GENERIC" && <> · {m.kindLabel}</>}
                  </p>
                </div>
                {m.isActive && <StatusBadge variant="status-active">Current stage</StatusBadge>}
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)} aria-label={`Edit ${m.title}`}>
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                    disabled={deletingId === m.id}
                    onClick={() => remove(m)}
                    aria-label={`Delete ${m.title}`}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setEditing(null)}
              aria-label="Close"
              className="absolute right-4 top-4 text-ink-400 hover:text-ink-900"
            >
              <X size={16} />
            </button>
            <h2 className="mb-4 text-base font-bold text-ink-900">
              {editing === "new" ? "Add milestone" : "Edit milestone"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {field(
                  "Position",
                  <Input
                    type="number"
                    min={1}
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />,
                  "Order on the timeline (1 = first)",
                )}
                {field(
                  "Type",
                  <select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    className="h-9 w-full rounded-md border border-ink-300 bg-white px-2 text-sm outline-none focus:border-brand-500"
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>,
                )}
              </div>
              {field(
                "Title",
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Evaluation of Expressions of Interest"
                />,
              )}
              {field(
                "Displayed dates",
                <Input
                  value={form.dateLabel}
                  onChange={(e) => setForm({ ...form, dateLabel: e.target.value })}
                  placeholder="e.g. 16 – 30 Sep 2026"
                />,
                "Free text shown on the public timeline",
              )}
              <div className="grid grid-cols-2 gap-3">
                {field(
                  "Starts",
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />,
                  "Becomes the current stage at this moment",
                )}
                {field(
                  "Ends (optional)",
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  />,
                  "Required for the Call for EOI window",
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={saving || !form.title.trim() || !form.dateLabel.trim() || !form.startsAt}
                  className="bg-ink-900 text-white hover:bg-ink-800"
                >
                  {saving ? "Saving…" : editing === "new" ? "Add milestone" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
