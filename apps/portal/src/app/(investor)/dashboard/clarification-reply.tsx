"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { CLARIFICATION_REPLY_MIN } from "@kip/shared";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * A review committee's open question, and the investor's reply. Sending the
 * reply returns the application to the committee that asked; the application
 * itself (sections, attachments) stays editable until then via the wizard.
 */
export function ClarificationReply({
  applicationId,
  committee,
  question,
  askedAt,
}: {
  applicationId: string;
  committee: string;
  question: string;
  askedAt: string;
}) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const ok = response.trim().length >= CLARIFICATION_REPLY_MIN;
  const asked = new Date(askedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/reviews/${applicationId}/clarification-reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: response.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Your reply could not be sent. Try again.");
      }
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your reply could not be sent. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Reply sent. Your application is back with the {committee}.
      </div>
    );
  }

  return (
    <section className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5" aria-labelledby="clarification-title">
      <div className="flex items-start gap-3">
        <MessageSquare size={20} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 id="clarification-title" className="text-sm font-bold text-ink-900">
              The {committee} needs more information
            </h2>
            <p className="text-xs text-ink-500">Asked on {asked}. Your application stays with the committee until you reply.</p>
          </div>

          <p className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-sm text-ink-800">{question}</p>

          <p className="text-xs text-ink-600">
            If the committee asked for a document or a correction,{" "}
            <Link href={`/dashboard/eoi/${applicationId}/1`} className="font-semibold text-brand-600 underline-offset-2 hover:underline">
              update your application
            </Link>{" "}
            first. Changes save as you go. Then send your reply below.
          </p>

          <div>
            <label htmlFor="clarification-response" className="mb-1 block text-xs font-semibold text-ink-700">
              Your reply
            </label>
            <textarea
              id="clarification-response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={5}
              placeholder="Answer the committee's question and mention anything you updated in your application…"
              className="w-full resize-y rounded-lg border border-ink-200 bg-white p-3 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <Button onClick={send} disabled={!ok || busy}>
            {busy && <Loader2 size={14} className="mr-1 animate-spin" />}
            Send reply to the committee
          </Button>
        </div>
      </div>
    </section>
  );
}
