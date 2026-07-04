import type { StatusVariant } from "@/components/status-badge";

// ─── EOI section metadata ─────────────────────────────────────────────────────
// Used by both admin pages and investor portal (apps/portal has its own copy).

export const SECTION_ORDER = [
  "PRELIMINARY_INFO",
  "LAND_BUSINESS_PROFILE",
  "UTILITIES_INFRASTRUCTURE",
  "H3SE",
  "NATIONAL_CONTENT",
  "DECLARATION",
] as const;

export type SectionKey = (typeof SECTION_ORDER)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  PRELIMINARY_INFO:         "Preliminary Info",
  LAND_BUSINESS_PROFILE:    "Land & Business Profile",
  UTILITIES_INFRASTRUCTURE: "Utilities & Infrastructure",
  H3SE:                     "H3SE",
  NATIONAL_CONTENT:         "National Content",
  DECLARATION:              "Declaration",
};

// ─── Application status → badge props ────────────────────────────────────────

export function statusBadgeProps(status: string): { variant: StatusVariant; label: string } {
  switch (status) {
    case "DRAFT_PAYMENT_PENDING":      return { variant: "payment-pending",  label: "Awaiting Payment" };
    case "DRAFT":                      return { variant: "eoi-draft",         label: "Draft" };
    case "SUBMITTED":                  return { variant: "eoi-submitted",     label: "Submitted" };
    case "UNDER_TC_REVIEW":            return { variant: "tc-in-progress",    label: "Under TC Review" };
    case "TC_CLARIFICATION_REQUESTED": return { variant: "status-pending",    label: "Clarification Needed" };
    case "SHORTLISTED":                return { variant: "tc-approved",       label: "Shortlisted" };
    case "NOT_SHORTLISTED":            return { variant: "tc-rejected",       label: "Not Shortlisted" };
    case "LAC_REVIEW":                 return { variant: "tc-in-progress",    label: "LAC Review" };
    case "LAC_APPROVED":               return { variant: "tc-approved",       label: "LAC Approved" };
    case "LAC_REJECTED":               return { variant: "tc-rejected",       label: "Rejected" };
    case "EXCO_REVIEW":                return { variant: "tc-in-progress",    label: "ExCo Review" };
    case "ALLOCATED":                  return { variant: "plot-allocated",    label: "Allocated" };
    case "WITHDRAWN":                  return { variant: "window-closed",     label: "Withdrawn" };
    default:                           return { variant: "eoi-draft",         label: status };
  }
}
