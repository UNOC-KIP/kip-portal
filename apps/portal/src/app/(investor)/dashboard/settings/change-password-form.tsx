"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard, Field, inputClass } from "./settings-ui";

const MIN_LENGTH = 8;

export function ChangePasswordForm({ needsChange }: { needsChange: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const sameAsCurrent = next.length > 0 && next === current;
  const canSave =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    next === confirm &&
    !sameAsCurrent &&
    !saving;

  function onChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setDone(false);
      setError("");
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    setDone(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        setDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d?.error?.message ?? "We couldn't change your password. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} id="password">
      <SettingsCard
        icon={Lock}
        title="Password"
        description="Choose a strong password only you know."
      >
        {needsChange && !done && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                You&apos;re still using the password we emailed you
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                For your security, set a new password that only you know.
              </p>
            </div>
          </div>
        )}

        {done ? (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">Password changed</p>
              <p className="mt-0.5 text-xs text-green-700">
                We&apos;ve emailed you a confirmation. Use your new password next time you sign in.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid max-w-md grid-cols-1 gap-4">
              <Field label="Current password" htmlFor="current">
                <input
                  id="current"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={current}
                  onChange={onChange(setCurrent)}
                  className={inputClass}
                />
              </Field>
              <Field
                label="New password"
                htmlFor="next"
                hint={`At least ${MIN_LENGTH} characters.`}
              >
                <input
                  id="next"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={next}
                  onChange={onChange(setNext)}
                  className={inputClass}
                />
                {tooShort && (
                  <p className="mt-1 text-xs text-amber-600">
                    Use at least {MIN_LENGTH} characters.
                  </p>
                )}
                {sameAsCurrent && (
                  <p className="mt-1 text-xs text-amber-600">
                    Choose a password different from your current one.
                  </p>
                )}
              </Field>
              <Field label="Confirm new password" htmlFor="confirm">
                <input
                  id="confirm"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={onChange(setConfirm)}
                  className={inputClass}
                />
                {mismatch && (
                  <p className="mt-1 text-xs text-amber-600">Passwords don&apos;t match.</p>
                )}
              </Field>

              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="flex w-fit items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-900"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
                {show ? "Hide passwords" : "Show passwords"}
              </button>
            </div>

            {error && (
              <p className="mt-4 max-w-md rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5">
              <Button type="submit" disabled={!canSave}>
                {saving ? "Updating…" : "Update password"}
              </Button>
            </div>
          </>
        )}
      </SettingsCard>
    </form>
  );
}
