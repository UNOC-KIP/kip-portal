"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { bodyExcerpt } from "@kip/shared";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import type { CommunicationTemplateRow } from "@/lib/admin/mappers";
import { TemplateDialog } from "./template-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function TemplatesTab({ templates }: { templates: CommunicationTemplateRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CommunicationTemplateRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CommunicationTemplateRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/communications/templates/${deleting.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? "Failed to delete template");
      }
      setDeleting(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus size={14} className="mr-1.5" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <FileText size={28} className="mx-auto mb-3 text-ink-300" />
          <p className="text-sm font-semibold text-ink-900">No templates yet</p>
          <p className="mt-1 text-xs text-ink-500">
            Save the messages you send often — window reminders, shortlisting notices — so they
            only have to be written once.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-900">{t.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {t.description !== "—" ? `${t.description} · ` : ""}Added {t.createdAt}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                    <Pencil size={13} className="mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleting(t)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-ink-700">{t.subject}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{bodyExcerpt(t.body, 220)}</p>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <TemplateDialog open template={null} onClose={() => setCreating(false)} />
      )}
      {editing && (
        // Keyed so switching rows remounts with that template's values.
        <TemplateDialog key={editing.id} open template={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDeleteDialog
        open={deleting !== null}
        title="Delete this template?"
        entityName={deleting?.name ?? ""}
        entityDetail={deleting?.subject}
        consequences={[
          "Remove the template from the composer's template list",
          "Leave every message already sent from it untouched",
        ]}
        confirmLabel="Delete Template"
        loading={loading}
        error={error}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
