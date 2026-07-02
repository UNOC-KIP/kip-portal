"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { signOut } from "next-auth/react";

/** Total idle time before sign-out (30 minutes). */
const IDLE_MS = 30 * 60 * 1000;
/** How far before sign-out to show the warning modal (5 minutes). */
const WARN_BEFORE_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function IdleTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARN_BEFORE_MS / 1000);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startTimers = useCallback(() => {
    clearAll();
    setShowWarning(false);

    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(WARN_BEFORE_MS / 1000);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    }, IDLE_MS - WARN_BEFORE_MS);

    idleTimerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/sign-in?timeout=1" });
    }, IDLE_MS);
  }, [clearAll]);

  useEffect(() => {
    const onActivity = () => startTimers();

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    startTimers();

    return () => {
      clearAll();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [startTimers, clearAll]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <span className="text-lg">⏱</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-ink-900">Session expiring</h2>
            <p className="text-xs text-ink-500">You&apos;ve been inactive for a while</p>
          </div>
        </div>

        <p className="text-sm text-ink-600">
          You will be automatically signed out in{" "}
          <span className="font-bold tabular-nums text-ink-900">
            {formatCountdown(secondsLeft)}
          </span>{" "}
          to protect your account.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={startTimers}
            className="w-full rounded-md bg-brand-400 py-2.5 text-sm font-bold text-black transition hover:bg-brand-300"
          >
            Stay signed in
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="w-full rounded-md border border-ink-300 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
