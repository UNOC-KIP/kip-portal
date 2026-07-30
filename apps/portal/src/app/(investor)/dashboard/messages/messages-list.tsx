"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Mail, MailOpen } from "lucide-react";
import { renderBodyHtml } from "@kip/shared";
import type { InboxMessage } from "@/lib/inbox-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function MessagesList({ messages }: { messages: InboxMessage[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  // Optimistic: the row stops looking unread the moment it's opened, even before
  // the API call lands, so expanding never feels laggy.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  async function toggle(m: InboxMessage) {
    if (openId === m.id) {
      setOpenId(null);
      return;
    }
    setOpenId(m.id);
    if (!m.isUnread || readIds.has(m.id)) return;

    setReadIds((prev) => new Set(prev).add(m.id));
    try {
      const res = await fetch(`${API_BASE}/communications/inbox/${m.id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) router.refresh();
    } catch {
      // Read receipts are cosmetic — a failure just leaves the badge up.
    }
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const unread = m.isUnread && !readIds.has(m.id);
        const open = openId === m.id;
        return (
          <div
            key={m.id}
            className={`overflow-hidden rounded-xl border bg-white transition ${
              unread ? "border-brand-300" : "border-ink-200"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(m)}
              className="flex w-full items-start gap-3 p-5 text-left hover:bg-ink-50/60"
              aria-expanded={open}
            >
              <span
                className={`mt-0.5 shrink-0 ${unread ? "text-brand-600" : "text-ink-300"}`}
              >
                {unread ? <Mail size={18} /> : <MailOpen size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm ${
                      unread ? "font-bold text-ink-900" : "font-semibold text-ink-700"
                    }`}
                  >
                    {m.subject}
                  </span>
                  {unread && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-ink-400">{m.receivedAt}</span>
                {!open && (
                  <span className="mt-1.5 block text-xs leading-relaxed text-ink-500">
                    {m.excerpt}
                  </span>
                )}
              </span>
              <span className="mt-0.5 shrink-0 text-ink-400">
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {open && (
              <div className="border-t border-ink-100 px-5 py-5 sm:pl-14">
                <div
                  className="text-sm leading-relaxed text-ink-700"
                  // Safe: renderBodyHtml() escapes the authored text before
                  // emitting its own tags — see packages/shared/src/communications.ts.
                  dangerouslySetInnerHTML={{ __html: renderBodyHtml(m.body) }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
