"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export type DecisionOption = {
  value: string;
  label: string;
  icon: React.ElementType;
  /** Classes for the selected state. */
  activeClass: string;
  placeholder: string;
  /** Label of the submit button once this option is chosen. */
  submitLabel: string;
};

/**
 * One committee form — pick an option, justify it, confirm. Used for the TC
 * decision, an LAC member's recommendation, and the LAC final decision; each
 * caller supplies its own options and endpoint.
 *
 * `final` adds a second confirmation step: a committee decision moves the
 * application and cannot be taken back from the console.
 */
export function DecisionForm({
  title,
  description,
  method,
  path,
  field,
  options,
  minNotes,
  initial,
  final = false,
  successText,
}: {
  title: string;
  description: string;
  method: "POST" | "PUT";
  /** API path, e.g. `/reviews/<id>/tc-decision`. */
  path: string;
  /** Body key for the chosen option: `decision` or `recommendation`. */
  field: "decision" | "recommendation";
  options: DecisionOption[];
  minNotes: number;
  initial?: { value: string; notes: string } | null;
  final?: boolean;
  successText: string;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(initial?.value ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const active = options.find((o) => o.value === choice) ?? null;
  const notesOk = notes.trim().length >= minNotes;

  async function submit() {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: active.value, notes: notes.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "The decision could not be saved. Try again.");
      }
      setSaved(true);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The decision could not be saved. Try again.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
        <p className="mt-0.5 text-xs text-ink-500">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = choice === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setChoice(opt.value);
                setConfirming(false);
                setSaved(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                selected ? opt.activeClass : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
              )}
              aria-pressed={selected}
            >
              <Icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="space-y-3">
          <label htmlFor={`${field}-notes`} className="block text-xs font-semibold text-ink-700">
            Justification
            <span className="ml-1 font-normal text-ink-400">(required, at least {minNotes} characters)</span>
          </label>
          <textarea
            id={`${field}-notes`}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
            placeholder={active.placeholder}
            rows={5}
            className="w-full resize-y rounded-lg border border-ink-200 p-3 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          {saved ? (
            <p className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
              <CheckCircle2 size={14} /> {successText}
            </p>
          ) : confirming ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                <strong>{active.label}</strong> is the committee&apos;s decision and moves the application on.
                It can&apos;t be changed afterwards from the console.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={submit} disabled={busy}>
                  {busy && <Loader2 size={14} className="mr-1 animate-spin" />}
                  Yes, record the decision
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
                  Go back
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="w-full"
              disabled={!notesOk || busy}
              onClick={() => (final ? setConfirming(true) : submit())}
            >
              {busy && <Loader2 size={14} className="mr-1 animate-spin" />}
              {active.submitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
