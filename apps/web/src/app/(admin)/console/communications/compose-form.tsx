"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Paperclip, Send, TestTube2 } from "lucide-react";
import {
  CommunicationChannel,
  COMMUNICATION_ATTACHMENT_ACCEPT,
  COMMUNICATION_CHANNEL_LABELS,
  MERGE_TOKENS,
  applyMergeTokens,
  formatFileSize,
  renderBodyHtml,
  sampleMergeVars,
  validateCommunicationFile,
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

/** What `POST /communications/attachments` returns. */
type UploadedAttachment = {
  id: string;
  filename: string;
  url: string;
  sizeBytes: number;
};

async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return body?.error?.message ?? `Request failed (${res.status})`;
}

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

  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

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

  /** Insert text at the cursor rather than appending blindly. */
  function insertAtCursor(text: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + text);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  const insertToken = insertAtCursor;

  /**
   * Upload a file and drop a markdown link to it into the body.
   *
   * presign → PUT → register, the same register-after-upload order the EOI
   * documents module uses: the row is written only once S3 has the bytes, so a
   * failed transfer can never leave the composer offering a link to nothing.
   */
  async function attachFile(file: File) {
    setAttachError(null);

    // Courtesy check — the presign route enforces the same rules server-side.
    const invalid = validateCommunicationFile(file);
    if (invalid) {
      setAttachError(invalid);
      return;
    }

    setUploading(true);
    try {
      const presignRes = await fetch(`${API_BASE}/communications/attachments/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error(await errorMessage(presignRes));
      const { attachmentId, uploadUrl, storageKey } = await presignRes.json();

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        throw new Error(
          `Upload to storage failed (${put.status}). The file was not saved.`,
        );
      }

      const registerRes = await fetch(`${API_BASE}/communications/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          attachmentId,
          filename: file.name,
          storageKey,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!registerRes.ok) throw new Error(await errorMessage(registerRes));
      const saved: UploadedAttachment = await registerRes.json();

      setAttachments((prev) => [...prev, saved]);
      insertAtCursor(`[${saved.filename}](${saved.url})`);
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "Could not attach that file.");
    } finally {
      setUploading(false);
    }
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
      // Clears the composer's list only. The uploaded objects and their rows
      // stay put — the links are already in a sent message and must keep working.
      setAttachments([]);
      setAttachError(null);
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
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-ink-400">{body.length} / 20,000 characters</p>
              <div className="flex items-center gap-2">
                {uploading && (
                  <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
                    <Loader2 size={12} className="animate-spin" />
                    Uploading…
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept={COMMUNICATION_ATTACHMENT_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void attachFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600 transition hover:border-ink-400 hover:text-ink-900 disabled:opacity-50"
                >
                  <Paperclip size={12} />
                  Attach a file
                </button>
              </div>
            </div>

            {/*
              Files are linked, not attached to the email. One upload serves the
              whole audience — attaching a 3MB PDF to a 500-recipient send would
              push 1.5GB through the shared Office 365 mailbox that also carries
              credentials and password resets, and would hit its size cap.
            */}
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1.5"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Paperclip size={12} className="shrink-0 text-ink-400" />
                      <span className="truncate text-[11px] font-medium text-ink-700">
                        {a.filename}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-400">
                        {formatFileSize(a.sizeBytes)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => insertAtCursor(`[${a.filename}](${a.url})`)}
                      className="shrink-0 text-[11px] font-semibold text-ink-600 underline underline-offset-2 hover:text-ink-900"
                    >
                      Insert link
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {attachError && (
              <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-600">
                {attachError}
              </p>
            )}
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
