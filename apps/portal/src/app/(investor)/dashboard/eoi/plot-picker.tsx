"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, FileText, Loader2, MapPin, Users, X } from "lucide-react";
import {
  KIP_LAND_MAP_EMBED_URL,
  computeApplicationFee,
  formatMoney,
  invoiceBlockers,
} from "@kip/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceBlockersNotice } from "@/components/invoice-blockers-notice";
import type { EoiPlotOption } from "@/lib/eoi-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

function acres(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(2)} acres`;
}

/**
 * Lets an investor choose one or more plots for their EOI. The current-phase
 * plot map is embedded from the UNOC GIS viewer for reference; selection happens
 * from the zone-filterable list (the embed is a third-party viewer we can't read
 * clicks from). Selecting saves the whole set (PUT /applications/:id/plots) and
 * reports the total acreage so the wizard auto-fills the required land area.
 * Each row shows the road the plot fronts and how many OTHER investors have
 * applied for it (transparency).
 *
 * `billing` is the company's TIN + registered address; with the plot count it
 * feeds the shared invoice-readiness gate, so the "Generate invoice" button here
 * offers exactly what the API will accept.
 */
export function PlotPicker({
  applicationId,
  plots,
  selectedPlotIds,
  billing,
  disabled,
  onTotalAcresChange,
}: {
  applicationId: string;
  plots: EoiPlotOption[];
  selectedPlotIds: string[];
  billing: { tin: string | null; address: string | null };
  disabled?: boolean;
  onTotalAcresChange?: (totalAcres: number) => void;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedPlotIds);
  const [zone, setZone] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceErr, setInvoiceErr] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<
    { amount: string; currency: string; status: string } | null
  >(null);

  const selectedPlots = useMemo(
    () => plots.filter((p) => selectedIds.includes(p.id)),
    [plots, selectedIds],
  );
  const totalAcres = useMemo(
    () => selectedPlots.reduce((sum, p) => sum + (p.acreage ?? 0), 0),
    [selectedPlots],
  );

  const zones = useMemo(
    () =>
      Array.from(new Set(plots.map((p) => p.zone).filter(Boolean))).sort() as string[],
    [plots],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plots.filter(
      (p) =>
        (!zone || p.zone === zone) &&
        (!q ||
          p.plotName.toLowerCase().includes(q) ||
          (p.road ?? "").toLowerCase().includes(q)),
    );
  }, [plots, zone, query]);

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

  const fee = computeApplicationFee(selectedPlots.length);
  const blockers = invoiceBlockers({
    plotCount: selectedPlots.length,
    tin: billing.tin,
    address: billing.address,
  });

  async function generateInvoice() {
    if (invoiceBusy || blockers.length > 0) return;
    setInvoiceBusy(true);
    setInvoiceErr(null);
    try {
      const res = await fetch(
        `${API_BASE}/applications/${applicationId}/request-invoice`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d?.error?.message ?? "Could not generate your invoice");
      }
      setInvoice((await res.json()) as { amount: string; currency: string; status: string });
    } catch (e) {
      setInvoiceErr(e instanceof Error ? e.message : "Could not generate your invoice");
    } finally {
      setInvoiceBusy(false);
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
        Explore the current-phase plot map below, then choose one or more plots
        from the list. The total acreage is added up and used as your required
        land area. Each plot shows the road it fronts and how many other
        investors have already expressed interest.
      </p>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Embedded UNOC GIS plot map (reference only — selection is via the list). */}
      <div className="mb-2 overflow-hidden rounded-lg border border-ink-200">
        <iframe
          src={KIP_LAND_MAP_EMBED_URL}
          title="KIP plot map"
          className="h-[560px] w-full sm:h-[640px]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-[11px] text-ink-400">
          Map for reference — pick your plots from the list below.
        </p>
        <a
          href={KIP_LAND_MAP_EMBED_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
        >
          <ExternalLink size={11} /> Open full map
        </a>
      </div>

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
                  {p.road ? <span className="text-brand-500">· {p.road}</span> : null}
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

            {/* Early invoice: pay before finishing the application. */}
            {!disabled && (
              <div className="mt-3 border-t border-ink-100 pt-3">
                {invoice ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                    <p className="font-semibold">
                      Invoice ready — {formatMoney(Number(invoice.amount), invoice.currency)} (incl. 18% VAT).
                    </p>
                    <p className="mt-1">
                      UNOC will email it shortly. Pay by bank transfer, then upload
                      your receipt. If you change plots, generate a new invoice —
                      this only works while it&apos;s unpaid. Once paid, the fee is
                      non-refundable.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`/dashboard/payment/bank?app=${applicationId}`}
                        className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700"
                      >
                        Pay / upload receipt →
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={generateInvoice}
                        disabled={invoiceBusy}
                      >
                        {invoiceBusy ? "Updating…" : "Update invoice"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {blockers.length > 0 && (
                      <div className="mb-2">
                        <InvoiceBlockersNotice blockers={blockers} />
                      </div>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={generateInvoice}
                      disabled={invoiceBusy || blockers.length > 0}
                    >
                      {invoiceBusy ? (
                        <Loader2 size={14} className="mr-1.5 animate-spin" />
                      ) : (
                        <FileText size={14} className="mr-1.5" />
                      )}
                      Generate invoice · {formatMoney(fee.total, fee.currency)}
                    </Button>
                    <p className="mt-2 text-xs text-ink-500">
                      Get your invoice and pay now, before you finish the
                      application. Change plots later? Generate a new invoice while
                      this one is unpaid — once paid, the fee is non-refundable.
                    </p>
                  </>
                )}
                {invoiceErr && (
                  <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                    {invoiceErr}
                    {/\bTIN\b/i.test(invoiceErr) && (
                      <>
                        {" "}
                        <Link
                          href="/dashboard/settings"
                          className="font-semibold underline underline-offset-2"
                        >
                          Update in Settings →
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-500">No plots selected yet.</p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
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
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plot or road…"
          className="h-9 text-xs"
        />
      </div>

      <p className="mb-2 text-[11px] text-ink-400">
        {filtered.length} plot{filtered.length === 1 ? "" : "s"}
      </p>

      {/* Plot list — the selection surface */}
      <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
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
                    {p.road ? (
                      <span className="font-normal text-ink-500"> · {p.road}</span>
                    ) : null}
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
  );
}
