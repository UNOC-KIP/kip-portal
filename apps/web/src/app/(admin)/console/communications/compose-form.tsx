"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Send, TestTube2 } from "lucide-react";
import {
  CommunicationChannel,
  COMMUNICATION_CHANNEL_LABELS,
  MERGE_TOKENS,
  applyMergeTokens,
  renderBodyHtml,
  sampleMergeVars,
} from "@kip/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_AUDIENCE,
  describeAudience,
  previewVarsFor,
  resolveRecipients,
  type AudienceSelection,
} from "@/lib/communication-audience";
import type { CommunicationsView } from "@/lib/admin/queries";
import type { CommunicationTemplateRow } from "@/lib/admin/mappers";
import { AudiencePicker } from "./audience-picker";
import { SendConfirmDialog } from "./send-confirm-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const CHANNELS = [
  CommunicationChannel.EMAIL_AND_IN_APP,
  CommunicationChannel.EMAIL,
  CommunicationChannel.IN_APP,
];

export function ComposeForm({
  view,
  onSent,
}: {
  view: CommunicationsView;
  onSent: () => void;
}) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<string>(CommunicationChannel.EMAIL_AND_IN_APP);
  const [selection, setSelection] = useState<AudienceSelection>(EMPTY_AUDIENCE);
  const [showPreview, setShowPreview] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recipients = useMemo(
    () => resolveRecipients(view.pool, selection),
    [view.pool, selection],
  );

  // Preview against the first real recipient when there is one, so the admin
  // sees the actual merged text rather than placeholder samples.
  const previewVars = useMemo(
    () => previewVarsFor(recipients) ?? sampleMergeVars(),
    [recipients],
  );
  const previewSubject = applyMergeTokens(subject, previewVars);
  const previewHtml = useMemo(
    () => renderBodyHtml(applyMergeTokens(body, previewVars)),
    [body, previewVars],
  );

  const canSend = subject.trim().length >= 3 && body.trim().length > 0 && recipients.length > 0;

  /** Insert a merge token at the cursor rather than appending blindly. */
  function insertToken(token: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function loadTemplate(t: CommunicationTemplateRow) {
    setSubject(t.subject);
    setBody(t.body);
    setNotice(`Loaded template “${t.name}”.`);
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/communications/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      setNotice("Test email sent to your own address.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setTesting(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/communications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          channel,
          audience: selection.audience,
          audienceSummary: describeAudience(selection, recipients.length),
          filters: selection.filters,
          recipients,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      setConfirmOpen(false);
      setSubject("");
      setBody("");
      setSelection(EMPTY_AUDIENCE);
      onSent();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <AudiencePicker
        pool={view.pool}
        selection={selection}
        onChange={setSelection}
        recipients={recipients}
      />

      <div className="rounded-xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-900">Message</p>
            <p className="mt-0.5 text-xs text-ink-500">
              Supports <code className="rounded bg-ink-100 px-1">**bold**</code>,{" "}
              <code className="rounded bg-ink-100 px-1">*italic*</code>, bullet lines starting
              with <code className="rounded bg-ink-100 px-1">-</code>, and{" "}
              <code className="rounded bg-ink-100 px-1">[text](https://…)</code> links.
            </p>
          </div>
          {view.templates.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Template
              </span>
              <select
                value=""
                onChange={(e) => {
                  const t = view.templates.find((x) => x.id === e.target.value);
                  if (t) loadTemplate(t);
                }}
                className="h-8 rounded-lg border border-ink-300 bg-white px-2 text-xs text-ink-700 outline-none focus:border-brand-500"
              >
                <option value="">Load a template…</option>
                {view.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. EOI window closes Friday 14 August"
              maxLength={200}
            />
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-ink-700">Body</label>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Insert
                </span>
                {MERGE_TOKENS.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => insertToken(t.token)}
                    title={`${t.label} — e.g. ${t.sample}`}
                    className="rounded-full border border-ink-200 bg-white px-2.5 py-0.5 font-mono text-[11px] text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
                  >
                    {t.token}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              maxLength={20_000}
              placeholder={"Dear {{company}},\n\nThe Kabalega Industrial Park EOI window closes on…"}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-ink-400">{body.length} / 20,000 characters</p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Deliver via
              </span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="h-8 rounded-lg border border-ink-300 bg-white px-2 text-xs text-ink-700 outline-none focus:border-brand-500"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {COMMUNICATION_CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 hover:text-ink-900"
            >
              <Eye size={14} />
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
          <p className="text-xs text-ink-500">{describeAudience(selection, recipients.length)}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || subject.trim().length < 3 || body.trim() === ""}
            >
              <TestTube2 size={14} className="mr-1.5" />
              {testing ? "Sending…" : "Send test to me"}
            </Button>
            <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!canSend}>
              <Send size={14} className="mr-1.5" />
              Send to {recipients.length}
            </Button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <p className="text-sm font-bold text-ink-900">Preview</p>
          <p className="mt-0.5 text-xs text-ink-500">
            Rendered with{" "}
            {recipients.length > 0
              ? `${recipients[0]?.company || recipients[0]?.email}'s details`
              : "sample details"}{" "}
            — this is the exact renderer the email and portal inbox use.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-ink-200">
            <div className="bg-ink-900 px-5 py-3">
              <p className="text-sm font-bold text-white">UNOC / KIP Investor Portal</p>
            </div>
            <div className="bg-white p-5">
              <p className="mb-4 text-base font-semibold text-ink-900">
                {previewSubject || "(no subject)"}
              </p>
              {body.trim() === "" ? (
                <p className="text-sm text-ink-400">Nothing to preview yet.</p>
              ) : (
                <div
                  className="text-sm leading-relaxed text-ink-700"
                  // Safe: renderBodyHtml() escapes the authored text before
                  // emitting its own tags — see packages/shared/src/communications.ts.
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <SendConfirmDialog
        open={confirmOpen}
        subject={previewSubject}
        audience={describeAudience(selection, recipients.length)}
        recipientCount={recipients.length}
        channel={COMMUNICATION_CHANNEL_LABELS[channel as CommunicationChannel] ?? channel}
        loading={sending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSend}
      />
    </div>
  );
}
