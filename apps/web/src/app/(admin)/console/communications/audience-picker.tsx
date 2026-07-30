"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import {
  CommunicationAudience,
  COMMUNICATION_AUDIENCE_LABELS,
  KIP_ZONES,
} from "@kip/shared";
import { Input } from "@/components/ui/input";
import {
  DATE_PRESETS,
  EMPTY_INVESTOR_FILTERS,
  ZONE_NONE,
  activeFilterCount,
  filterInvestors,
  matchPreset,
  presetRange,
  type DatePreset,
  type InvestorFilters,
} from "@/lib/report-filters";
import { INVESTOR_SITE_VISIT_STATUSES } from "@/lib/admin/mappers";
import type { AudienceSelection, Recipient, RecipientPool } from "@/lib/communication-audience";

const AUDIENCE_ORDER: CommunicationAudience[] = [
  CommunicationAudience.ALL_INVESTORS,
  CommunicationAudience.INVESTOR_SEGMENT,
  CommunicationAudience.STAFF,
  CommunicationAudience.NOTIFY_LIST,
  CommunicationAudience.CUSTOM,
];

/** Options for the plain-select filters, derived from the data actually present. */
function optionsFor(rows: { [k: string]: unknown }[], key: string): string[] {
  return Array.from(new Set(rows.map((r) => String(r[key] ?? "")).filter(Boolean))).sort();
}

/** Zone options: every investable zone plus the explicit "not specified" bucket. */
const ZONE_OPTIONS: { value: string; label: string }[] = [
  ...KIP_ZONES.filter((z) => z.investable).map((z) => ({ value: z.key, label: z.label })),
  { value: ZONE_NONE, label: "Not specified" },
];

/**
 * Plain-string options are the common case (the filter matches the label the
 * table shows); the zone filter matches a raw `KipZone` key, so pairs are also
 * accepted.
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (string | { value: string; label: string })[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-ink-300 bg-white px-2 text-xs text-ink-700 outline-none transition focus:border-brand-500"
      >
        <option value="">All</option>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

interface Props {
  pool: RecipientPool;
  selection: AudienceSelection;
  onChange: (next: AudienceSelection) => void;
  recipients: Recipient[];
}

export function AudiencePicker({ pool, selection, onChange, recipients }: Props) {
  const [search, setSearch] = useState("");

  const set = (patch: Partial<AudienceSelection>) => onChange({ ...selection, ...patch });
  const setFilters = (patch: Partial<InvestorFilters>) =>
    set({ filters: { ...selection.filters, ...patch } });

  const activePreset = matchPreset(
    { from: selection.filters.from, to: selection.filters.to },
    new Date(),
  );

  const staffRoles = useMemo(
    () => Array.from(new Set(pool.staff.map((s) => s.role))).sort(),
    [pool.staff],
  );

  // The manual-pick list previews the segment filters too, so an admin can
  // narrow to a zone and then hand-pick from within it.
  const manualCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = filterInvestors(pool.investors, selection.filters);
    if (term === "") return rows.slice(0, 200);
    return rows
      .filter(
        (r) =>
          r.company.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term) ||
          r.rep.toLowerCase().includes(term),
      )
      .slice(0, 200);
  }, [pool.investors, selection.filters, search]);

  const manualSet = new Set(selection.manualIds);
  const toggleManual = (id: string) => {
    const next = new Set(manualSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ manualIds: Array.from(next) });
  };

  const isSegment = selection.audience === CommunicationAudience.INVESTOR_SEGMENT;
  const isCustom = selection.audience === CommunicationAudience.CUSTOM;
  const filterCount = activeFilterCount(selection.filters);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-900">Audience</p>
          <p className="mt-0.5 text-xs text-ink-500">Who receives this message.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-ink-900 px-3.5 py-1.5 text-white">
          <Users size={14} />
          <span className="text-xs font-bold">
            {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Audience mode */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {AUDIENCE_ORDER.map((a) => {
          const count =
            a === CommunicationAudience.STAFF
              ? pool.staff.length
              : a === CommunicationAudience.NOTIFY_LIST
                ? pool.signups.length
                : a === CommunicationAudience.CUSTOM
                  ? selection.manualIds.length
                  : a === CommunicationAudience.ALL_INVESTORS
                    ? pool.investors.length
                    : null;
          return (
            <button
              key={a}
              type="button"
              onClick={() => set({ audience: a })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selection.audience === a
                  ? "bg-ink-900 text-white"
                  : "border border-ink-200 bg-white text-ink-600 hover:text-ink-900"
              }`}
            >
              {COMMUNICATION_AUDIENCE_LABELS[a]}
              {count !== null && <span className="ml-1.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Segment filters — same controls as the investors report, so a broadcast
          audience and a report slice are always defined the same way. */}
      {(isSegment || isCustom) && (
        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Segment {filterCount > 0 && `· ${filterCount} filter${filterCount === 1 ? "" : "s"}`}
            </span>
            {filterCount > 0 && (
              <button
                type="button"
                onClick={() => set({ filters: EMPTY_INVESTOR_FILTERS })}
                className="text-[11px] font-semibold text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <FilterSelect
              label="Zone of interest"
              value={selection.filters.zone}
              options={ZONE_OPTIONS}
              onChange={(v) => setFilters({ zone: v })}
            />
            <FilterSelect
              label="Site visit"
              value={selection.filters.siteVisit}
              options={[...INVESTOR_SITE_VISIT_STATUSES]}
              onChange={(v) => setFilters({ siteVisit: v })}
            />
            <FilterSelect
              label="Account"
              value={selection.filters.account}
              options={optionsFor(pool.investors, "accountStatus")}
              onChange={(v) => setFilters({ account: v })}
            />
            <FilterSelect
              label="Payment"
              value={selection.filters.payment}
              options={optionsFor(pool.investors, "paymentStatus")}
              onChange={(v) => setFilters({ payment: v })}
            />
            <FilterSelect
              label="EOI stage"
              value={selection.filters.stage}
              options={optionsFor(pool.investors, "eoiStage")}
              onChange={(v) => setFilters({ stage: v })}
            />
            <FilterSelect
              label="Country"
              value={selection.filters.country}
              options={optionsFor(pool.investors, "country")}
              onChange={(v) => setFilters({ country: v })}
            />
            <FilterSelect
              label="Sector"
              value={selection.filters.sector}
              options={optionsFor(pool.investors, "sector")}
              onChange={(v) => setFilters({ sector: v })}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Registered
              </span>
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFilters(applyPreset(p.value))}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      activePreset === p.value
                        ? "bg-ink-900 text-white"
                        : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">From</span>
              <input
                type="date"
                value={selection.filters.from}
                onChange={(e) => setFilters({ from: e.target.value })}
                className="h-8 rounded-lg border border-ink-300 px-2 text-xs text-ink-700 outline-none focus:border-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">To</span>
              <input
                type="date"
                value={selection.filters.to}
                onChange={(e) => setFilters({ to: e.target.value })}
                className="h-8 rounded-lg border border-ink-300 px-2 text-xs text-ink-700 outline-none focus:border-brand-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* Staff role picker */}
      {selection.audience === CommunicationAudience.STAFF && (
        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50/50 p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            Roles — none selected means every staff member
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {staffRoles.map((role) => {
              const on = selection.staffRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() =>
                    set({
                      staffRoles: on
                        ? selection.staffRoles.filter((r) => r !== role)
                        : [...selection.staffRoles, role],
                    })
                  }
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    on
                      ? "bg-ink-900 text-white"
                      : "border border-ink-200 bg-white text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notify-list note — these addresses have no portal account, so a
          portal-inbox send would reach nobody. */}
      {selection.audience === CommunicationAudience.NOTIFY_LIST && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Notify-me addresses have no portal account, so these recipients only ever get the
          email — merge tokens fall back to neutral wording.
        </p>
      )}

      {/* Manual pick */}
      {isCustom && (
        <div className="mt-4">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact or email…"
              className="h-9 pl-9 text-xs"
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-ink-200">
            {manualCandidates.length === 0 ? (
              <p className="p-4 text-center text-xs text-ink-500">No investors match.</p>
            ) : (
              manualCandidates.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-ink-100 px-4 py-2.5 last:border-0 hover:bg-ink-50"
                >
                  <input
                    type="checkbox"
                    checked={manualSet.has(r.id)}
                    onChange={() => toggleManual(r.id)}
                    className="h-4 w-4 rounded border-ink-300 accent-ink-900"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink-900">
                      {r.company}
                    </span>
                    <span className="block truncate text-[11px] text-ink-500">
                      {r.email} · {r.eoiStage} · {r.zone}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          {selection.manualIds.length > 0 && (
            <button
              type="button"
              onClick={() => set({ manualIds: [] })}
              className="mt-2 text-[11px] font-semibold text-brand-600 hover:underline"
            >
              Clear {selection.manualIds.length} selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Preset → explicit `from`/`to` bounds, so the stored filters are self-describing. */
function applyPreset(preset: DatePreset): Partial<InvestorFilters> {
  if (preset === "all") return { from: "", to: "" };
  return presetRange(preset, new Date());
}
