"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type Msg = { from: "team" | "user"; text: string };

const GREETING: Msg = {
  from: "team",
  text: "Hi 👋 Welcome to the Kabalega Industrial Park. Ask us anything about plots, the EOI process, or fees — leave your name and email and our team will reply by email.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!email.includes("@")) return setError("Please enter a valid email.");
    if (message.trim().length < 5) return setError("Please enter a longer message.");

    const outgoing = message.trim();
    setMessages((m) => [...m, { from: "user", text: outgoing }]);
    setMessage("");
    setSending(true);

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: outgoing }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setMessages((m) => [
        ...m,
        {
          from: "team",
          text: `Thanks, ${name.trim().split(" ")[0]}! We've received your message and will reply to ${email.trim()} within 1–2 business days.`,
        },
      ]);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // roll the user message back into the composer so nothing is lost
      setMessage(outgoing);
      setMessages((m) => m.filter((msg) => !(msg.from === "user" && msg.text === outgoing)));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with us"}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-kip-red text-white shadow-lg shadow-black/25 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-kip-red/30"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[540px] max-h-[calc(100vh-7rem)] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-[14px] border border-black/10 bg-white shadow-2xl shadow-black/25">
          {/* Header */}
          <div className="flex items-center gap-3 bg-black px-5 py-4 text-white">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-kip-gold text-black">
              <MessageCircle size={18} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black bg-green-400" />
            </span>
            <div className="leading-tight">
              <p className="text-[14px] font-bold">KIP Investor Support</p>
              <p className="text-[11px] text-white/55">Typically replies within 1–2 business days</p>
            </div>
          </div>

          {/* Thread */}
          <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto bg-ink-100 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.from === "user"
                      ? "rounded-br-sm bg-kip-red text-white"
                      : "rounded-bl-sm bg-white text-black/80 shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          {done ? (
            <div className="border-t border-black/8 bg-white px-4 py-4 text-center">
              <p className="text-[13px] text-black/60">
                Need anything else?{" "}
                <button
                  onClick={() => {
                    setDone(false);
                    setMessage("");
                  }}
                  className="font-semibold text-kip-red underline underline-offset-2"
                >
                  Send another message
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-2 border-t border-black/8 bg-white px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-[8px] border border-black/12 bg-white px-3 py-2 text-[13px] text-black placeholder-black/35 outline-none transition focus:border-black/40"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="rounded-[8px] border border-black/12 bg-white px-3 py-2 text-[13px] text-black placeholder-black/35 outline-none transition focus:border-black/40"
                />
              </div>
              {error && <p className="text-[12px] font-medium text-kip-red">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  rows={2}
                  placeholder="Type your message…"
                  className="max-h-24 flex-1 resize-none rounded-[8px] border border-black/12 bg-white px-3 py-2 text-[13px] text-black placeholder-black/35 outline-none transition focus:border-black/40"
                />
                <button
                  type="submit"
                  disabled={sending}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kip-red text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
