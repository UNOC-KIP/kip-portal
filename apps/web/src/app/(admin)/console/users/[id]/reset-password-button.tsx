"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Admin password reset for a locked-out user. Calls
 * `POST /users/:id/reset-password` — the API generates a fresh temporary
 * password and emails it straight to the account's login address; the
 * plaintext is never shown to the admin.
 */
export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Failed to reset password");
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => { setDone(false); setError(null); setOpen(true); }}
      >
        <KeyRound size={13} /> Reset Password
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-md rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 text-ink-400 hover:text-ink-900"
            >
              <X size={16} />
            </button>

            {done ? (
              <>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Check size={18} className="text-green-700" />
                </div>
                <h2 className="text-base font-bold text-ink-900">Password reset</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  A new temporary password has been emailed to{" "}
                  <span className="font-medium text-ink-900">{email}</span>. The user will be
                  nudged to change it after signing in.
                </p>
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <KeyRound size={18} className="text-amber-700" />
                </div>
                <h2 className="text-base font-bold text-ink-900">Reset this user&apos;s password?</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  A new temporary password will be generated and emailed to{" "}
                  <span className="font-medium text-ink-900">{email}</span>. Their current
                  password stops working immediately. You will not see the new password.
                </p>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReset}
                    disabled={loading}
                    className="bg-ink-900 text-white hover:bg-ink-800"
                  >
                    {loading ? "Resetting…" : "Reset & Email"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
