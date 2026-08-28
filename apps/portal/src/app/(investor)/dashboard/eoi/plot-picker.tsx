"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EoiPlotOption } from "@/lib/eoi-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

function acres(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(2)} acres`;
}

/**
 * Lets an investor choose the plot their application is for. Plots are the local
 * mirror of the GIS register; each row shows how many OTHER investors have
 * applied for it (transparency — just the count). Selecting one calls
 * PATCH /applications/:id/plot.
 */
export function PlotPicker({
  applicationId,
  plots,
  selectedPlotId,
  disabled,
}: {
  applicationId: string;
  plots: EoiPlotOption[];
  selectedPlotId: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(selectedPlotId);
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState("");
  const [size, setSize] = useState("");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = plots.find((p) => p.id === selectedId) ?? null;

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

  async function choose(plotId: string) {
    setSavingId(plotId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/plot`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plotId }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "Could not select this plot");
      }
      setSelectedId(plotId);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not select this plot");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <MapPin size={16} className="text-brand-600" />
        <h3 className="text-sm font-bold text-ink-900">Plot of Interest</h3>
      </div>
      <p className="mb-4 text-xs text-ink-500">
        Choose the plot you are applying for. You can see how many other investors have
        already expressed interest in each plot.
      </p>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Current selection */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3">
        {selected ? (
          <div>
            <p className="text-sm font-bold text-ink-900">{selected.plotName}</p>
            <p className="text-xs text-ink-500">
              {selected.zone ?? "—"} · {acres(selected.acreage)}
              {selected.applicantCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                  <Users size={11} /> {selected.applicantCount} other
                  {selected.applicantCount === 1 ? "" : "s"} applied
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-500">No plot selected yet.</p>
        )}
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : selected ? "Change plot" : "Choose plot"}
          </Button>
        )}
      </div>

      {open && !disabled && (
        <div className="rounded-lg border border-ink-200 p-3">
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
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
              const isSel = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p.id)}
                    disabled={savingId !== null}
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
                      {savingId === p.id && <Loader2 size={13} className="animate-spin text-ink-400" />}
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
  );
}
