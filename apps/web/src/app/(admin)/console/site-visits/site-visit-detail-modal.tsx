"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Building2, MapPin, ExternalLink, Mail, Phone } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import type { SiteVisitRow } from "@/lib/admin/mappers";
import { SiteVisitActions } from "./site-visit-actions";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <div className="mt-0.5 text-sm text-ink-800">{children}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-500">
      <Icon size={13} /> {children}
    </h3>
  );
}

/**
 * Detail modal for one site-visit booking: the full request on the left, the
 * investor behind it on the right (rep, company, account, EOI progress), with
 * the schedule / complete / cancel actions in the footer. Receives the fresh
 * row on every render (parent stores only the selected id), so a status change
 * via the actions re-renders with up-to-date data after `router.refresh()`.
 */
export function SiteVisitDetailModal({
  booking,
  statusVariant,
  onClose,
}: {
  booking: SiteVisitRow;
  statusVariant: StatusVariant;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inv = booking.investor;
  const mailto = `mailto:${booking.contactEmail}?subject=${encodeURIComponent(
    "Your KIP site visit — Kabalega Industrial Park",
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Site visit request from ${booking.companyName}`}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-ink-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-bold text-ink-900">{booking.companyName}</h2>
              <StatusBadge variant={statusVariant}>{booking.status}</StatusBadge>
            </div>
            <p className="mt-0.5 text-xs text-ink-400">Requested {booking.requestedAt}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          {/* ── Visit request ── */}
          <div>
            <SectionTitle icon={MapPin}>Visit Request</SectionTitle>
            <div className="space-y-3">
              <Field label="Zone">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${booking.zoneColor}`} />
                  {booking.zone}
                </span>
              </Field>
              <Field label="Intended Land Use">{booking.landUse}</Field>
              <Field label="Land Required">{booking.acresLabel}</Field>
              <Field label="Visit Date">{booking.scheduledAt}</Field>
              <Field label="Handled By">{booking.handledBy}</Field>
              <Field label="Investor's Description">
                <p className="whitespace-pre-wrap rounded-lg bg-ink-100/60 px-3 py-2 text-[13px] leading-relaxed">
                  {booking.description}
                </p>
              </Field>
            </div>
          </div>

          {/* ── Investor ── */}
          <div className="border-t border-ink-100 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <SectionTitle icon={Building2}>Investor</SectionTitle>
            {inv ? (
              <div className="space-y-3">
                <Field label="Representative">
                  {inv.repName}
                  {inv.designation !== "—" && (
                    <span className="text-ink-400"> · {inv.designation}</span>
                  )}
                </Field>
                <Field label="Contact">
                  <span className="flex flex-col gap-0.5">
                    <a href={mailto} className="flex items-center gap-1.5 text-blue-700 underline underline-offset-2 hover:text-blue-900">
                      <Mail size={12} /> {inv.email}
                    </a>
                    <span className="flex items-center gap-1.5 text-ink-600">
                      <Phone size={12} /> {inv.phone}
                    </span>
                  </span>
                </Field>
                <Field label="Company">{inv.orgName}</Field>
                <Field label="Country / Sector">
                  {inv.country} · {inv.sector}
                </Field>
                <Field label="Company Type">{inv.companyType}</Field>
                <Field label="Registration No.">{inv.registrationNumber}</Field>
                <Field label="Account">
                  <span className="flex items-center gap-2">
                    <StatusBadge
                      variant={
                        inv.rawAccountStatus === "ACTIVE"
                          ? "status-active"
                          : inv.rawAccountStatus === "REJECTED"
                            ? "status-rejected"
                            : "status-pending"
                      }
                    >
                      {inv.accountStatus}
                    </StatusBadge>
                    <span className="text-xs text-ink-400">since {inv.memberSince}</span>
                  </span>
                </Field>
                <Field label="EOI Application">
                  {inv.applicationRef !== "—" ? (
                    <>
                      <span className="font-mono text-xs">{inv.applicationRef}</span>
                      <span className="text-ink-400"> · {inv.applicationStage}</span>
                    </>
                  ) : (
                    <span className="text-ink-400">{inv.applicationStage}</span>
                  )}
                </Field>
                <Link
                  href={`/console/users/${inv.userId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                >
                  Open full investor profile <ExternalLink size={11} />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-ink-400">
                Investor account no longer available (deleted or detached).
              </p>
            )}
          </div>
        </div>

        {/* Footer — status actions */}
        <div className="border-t border-ink-100 px-6 py-4">
          <SiteVisitActions bookingId={booking.id} rawStatus={booking.rawStatus} />
        </div>
      </div>
    </div>
  );
}
