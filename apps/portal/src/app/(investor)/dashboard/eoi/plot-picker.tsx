"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EoiPlotOption } from "@/lib/eoi-data";
import { PlotMap } from "./plot-map";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

function acres(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(2)} acres`;
}

/**
 * Lets an investor choose one or more plots on the land map or from the list.
 * Selecting/deselecting saves the whole set (PUT /applications/:id/plots) and
 * reports the total acreage so the wizard can auto-fill the required land area.
 * Each plot shows how many OTHER investors have applied (transparency).
 */
export function PlotPicker({
  applicationId,
  plots,
  selectedPlotIds,
  disabled,
  onTotalAcresChange,
}: {
  applicationId: string;
  plots: EoiPlotOption[];
  selectedPlotIds: string[];
  disabled?: boolean;
  onTotalAcresChange?: (totalAcres: number) => void;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedPlotIds);
  const [zone, setZone] = useState("");
  const [size, setSize] = useState("");
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMap = useMemo(() => plots.some((p) => p.geometry), [plots]);
  const selectedPlots = useMemo(
    () => plots.filter((p) => selectedIds.includes(p.id)),
    [plots, selectedIds],
  );
  const totalAcres = useMemo(
    () => selectedPlots.reduce((sum, p) => sum + (p.acreage ?? 0), 0),
    [selectedPlots],
  );

  const zones = useMemo(
    () => Array.from(new Set(plots.map((p) => p.zone).filter(Boolean))).sort() as string[],
    [plots],
  );
  const sizes = useMemo(
    () => Array.from(new Set(plots.map((p) => p.areaCategory).filter(Boolean))).sort() as string[],
    [plots],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plots.filter(
      (p) =>
        (!zone || p.zone === zone) &&
        (!size || p.areaCategory === size) &&
        (!q || p.plotName.toLowerCase().includes(q)),
    );
  }, [plots, zone, size, query]);

  async function toggle(plotId: string) {
    if (disabled || saving) return;
    const next = selectedIds.includes(plotId)
      ? selectedIds.filter((x) => x !== plotId)
      : [...selectedIds, plotId];
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/plots`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plotIds: next }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "Could not update your plot selection");
      }
      setSelectedIds(next);
      const total = plots
        .filter((p) => next.includes(p.id))
        .reduce((sum, p) => sum + (p.acreage ?? 0), 0);
      onTotalAcresChange?.(total);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your plot selection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <MapPin size={16} className="text-brand-600" />
        <h3 className="text-sm font-bold text-ink-900">Plots of Interest</h3>
        {saving && <Loader2 size={13} className="animate-spin text-ink-400" />}
      </div>
      <p className="mb-4 text-xs text-ink-500">
        Choose one or more plots — click them on the map or pick from the list. The total
        acreage is added up and used as your required land area. Each plot shows how many
        other investors have already expressed interest.
      </p>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Selected plots + total */}
      <div className="mb-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3">
        {selectedPlots.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {selectedPlots.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                >
                  {p.plotName}
                  <span className="text-brand-500">· {acres(p.acreage)}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      disabled={saving}
                      aria-label={`Remove ${p.plotName}`}
                      className="ml-0.5 text-brand-400 hover:text-brand-700"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm font-bold text-ink-900">
              Total: {totalAcres.toFixed(2)} acres
              <span className="ml-2 text-xs font-normal text-ink-500">
                across {selectedPlots.length} plot{selectedPlots.length === 1 ? "" : "s"} · fills your
                required land area
              </span>
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-500">No plots selected yet.</p>
        )}
      </div>

      {/* Zone filter — drives both the map and the list */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-ink-600">Zone</label>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>

      {/* Map */}
      {hasMap ? (
        <PlotMap
          plots={plots}
          selectedIds={selectedIds}
          zone={zone}
          onSelect={toggle}
          disabled={disabled}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-ink-200 p-3 text-xs text-ink-400">
          The plot map isn&apos;t available yet — pick plots from the list below.
        </p>
      )}

      {/* Browse as list */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          {showList ? "Hide plot list" : "Browse plots as a list"}
        </button>

        {showList && (
          <div className="mt-2 rounded-lg border border-ink-200 p-3">
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">All sizes</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>{s} acres</option>
                ))}
              </select>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plot name…"
                className="h-9 text-xs"
              />
            </div>

            <p className="mb-2 text-[11px] text-ink-400">
              {filtered.length} plot{filtered.length === 1 ? "" : "s"}
            </p>

            <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
              {filtered.map((p) => {
                const isSel = selectedIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      disabled={disabled || saving}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                        isSel ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:bg-ink-50"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink-900">
                          {p.plotName}
                          {isSel && <Check size={13} className="ml-1.5 inline text-brand-600" />}
                        </span>
                        <span className="block truncate text-xs text-ink-500">
                          {p.zone ?? "—"} · {acres(p.acreage)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {p.applicantCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Users size={10} /> {p.applicantCount}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-ink-400">
                  No plots match these filters.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
