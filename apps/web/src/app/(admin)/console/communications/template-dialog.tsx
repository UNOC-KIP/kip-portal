"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MERGE_TOKENS } from "@kip/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CommunicationTemplateRow } from "@/lib/admin/mappers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

interface Props {
  open: boolean;
  /** Null = create; a row = edit that template. */
  template: CommunicationTemplateRow | null;
  onClose: () => void;
}

export function TemplateDialog({ open, template, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [description, setDescription] = useState(
    template && template.description !== "—" ? template.description : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        template
          ? `${API_BASE}/communications/templates/${template.id}`
          : `${API_BASE}/communications/templates`,
        {
          method: template ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, body, description: description || undefined }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-ink-400 hover:text-ink-900"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="mb-1 text-base font-bold text-ink-900">
          {template ? "Edit Template" : "New Template"}
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          Use {MERGE_TOKENS.map((t) => t.token).join(", ")} to personalise each recipient&apos;s copy.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Window closing reminder"
              required
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">
              Description <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When to use this template"
              maxLength={500}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">Body</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              required
              maxLength={20_000}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : template ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
