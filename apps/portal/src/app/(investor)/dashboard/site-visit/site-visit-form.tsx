"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  INVESTABLE_ZONES,
  SITE_VISIT_MAX_ACRES,
  SITE_VISIT_MIN_ACRES,
  landUsesForZone,
  type KipZone,
} from "@kip/shared";
import { Button } from "@/components/ui/button";

const MIN_DESCRIPTION = 20;

export function SiteVisitForm() {
  const router = useRouter();
  const [zone, setZone] = useState<KipZone | "">("");
  const [landUse, setLandUse] = useState("");
  const [description, setDescription] = useState("");
  const [acres, setAcres] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const landUseOptions = zone ? landUsesForZone(zone) : [];

  function selectZone(next: KipZone) {
    setZone(next);
    setLandUse(""); // land uses are zone-specific — a stale value would be rejected
    setError("");
  }

  const descriptionShort = description.trim().length < MIN_DESCRIPTION;
  const canSubmit = !!zone && !!landUse && !descriptionShort && !loading;

  
  const acresFillPct =
    ((acres - SITE_VISIT_MIN_ACRES) /
      (SITE_VISIT_MAX_ACRES - SITE_VISIT_MIN_ACRES)) *
    100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/site-visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          zone,
          landUse,
          description: description.trim(),
          acres,
        }),
      });

      if (res.status === 201) {
        setDone(true);
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data?.error?.message ?? "We couldn't submit your request. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto text-green-600" />
        <h2 className="mt-4 text-lg font-bold text-green-900">Site visit request received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-green-800">
          We&apos;ve emailed you a confirmation. The KIP team will get back to you shortly
          with available dates and a formal invitation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Zone ─────────────────────────────────────────────── */}
      <fieldset>
        <legend className="text-sm font-bold text-ink-900">Preferred zone</legend>
        <p className="mt-0.5 text-xs text-ink-500">
          Which part of the park are you interested in?
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INVESTABLE_ZONES.map((z) => {
            const selected = zone === z.key;
            return (
              <label
                key={z.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                    : "border-ink-200 bg-white hover:border-ink-300"
                }`}
              >
                <input
                  type="radio"
                  name="zone"
                  value={z.key}
                  checked={selected}
                  onChange={() => selectZone(z.key)}
                  className="sr-only"
                />
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${z.color}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-900">{z.label}</span>
                  <span className="block text-xs text-ink-500">{z.area}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ── Land use ─────────────────────────────────────────── */}
      <div>
        <label htmlFor="landUse" className="block text-sm font-bold text-ink-900">
          Intended land use
        </label>
        <p className="mt-0.5 text-xs text-ink-500">
          {zone ? "Select the activity closest to your plans." : "Select a zone first."}
        </p>
        <select
          id="landUse"
          value={landUse}
          disabled={!zone}
          onChange={(e) => setLandUse(e.target.value)}
          className="mt-3 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400"
        >
          <option value="" disabled>
            {zone ? "Select land use…" : "Select a zone first…"}
          </option>
          {landUseOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* ── Description ──────────────────────────────────────── */}
      <div>
        <label htmlFor="description" className="block text-sm font-bold text-ink-900">
          What do you want to do on the land?
        </label>
        <p className="mt-0.5 text-xs text-ink-500">
          Describe your intended activity in some detail — at least {MIN_DESCRIPTION} characters.
        </p>
        <textarea
          id="description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Establish a polymer compounding plant serving the East African packaging market, with an on-site warehouse and rail siding."
          className="mt-3 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        <p
          className={`mt-1 text-xs ${
            description.length > 0 && descriptionShort ? "text-amber-600" : "text-ink-400"
          }`}
        >
          {description.trim().length} / {MIN_DESCRIPTION} characters minimum
        </p>
      </div>

      {/* ── Acreage ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="acres" className="block text-sm font-bold text-ink-900">
            Land required
          </label>
          <span className="text-lg font-black tracking-tight text-ink-900">
            {acres === SITE_VISIT_MAX_ACRES ? `${acres}+` : acres}{" "}
            <span className="text-sm font-medium text-ink-500">
              acre{acres === 1 ? "" : "s"}
            </span>
          </span>
        </div>
        <input
          id="acres"
          type="range"
          min={SITE_VISIT_MIN_ACRES}
          max={SITE_VISIT_MAX_ACRES}
          step={1}
          value={acres}
          onChange={(e) => setAcres(Number(e.target.value))}
          // Gold fill shows progress from 0 → the thumb; grey for the remainder.
          style={{
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${acresFillPct}%, #e5e7eb ${acresFillPct}%, #e5e7eb 100%)`,
          }}
          className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full accent-brand-500"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-400">
          <span>{SITE_VISIT_MIN_ACRES}</span>
          <span>{SITE_VISIT_MAX_ACRES}+</span>
        </div>
        {acres === SITE_VISIT_MAX_ACRES && (
          <p className="mt-2 text-xs text-ink-500">
            Need more than {SITE_VISIT_MAX_ACRES} acres? Let us know at the visit —
            larger allocations are discussed case by case.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        {loading ? "Submitting…" : "Request Site Visit"}
      </Button>
    </form>
  );
}
