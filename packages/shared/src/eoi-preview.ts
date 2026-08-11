/**
 * Admin EOI preview — the superuser's route into the investor journey.
 *
 * The investor portal is normally INVESTOR-only and the EOI is gated on an
 * `ApplicationWindow` being OPEN and in range. That makes the whole journey
 * — start, six sections, S3 attachments, submit — untestable in the gap
 * between calls, which is exactly when it needs testing. A preview role signs
 * into the investor portal and drives the real journey with the window gate
 * lifted.
 *
 * Three things this deliberately is NOT:
 *
 *  - It is not a mock. Every row is real: a real `Application`, real
 *    `ApplicationSection` payloads validated by the real schemas, real objects
 *    in the real S3 bucket. That is the point — a preview that stubbed S3 would
 *    not prove the bucket, its CORS policy or its region are right.
 *  - It is not an auth bypass. The actor is a fully authenticated ADMIN, and
 *    ADMIN already reads and writes every application through the console. The
 *    only thing lifted is the *window* gate, which is a business rule about
 *    when a call is open, not an access-control boundary.
 *  - It is not a second code path. Preview actors run the same service methods,
 *    the same submit guard and the same document checklist as an investor.
 *
 * The cost to keep in mind: a preview application is indistinguishable from a
 * real one in admin reports, and submitting one consumes a reference number
 * from the live window's `sequenceCounter`. Delete the application when done
 * (`DELETE /applications/:id`).
 */
import { UserRole } from "./enums";

/**
 * Roles that may drive the investor EOI journey without being an investor.
 *
 * ADMIN only, and it should stay that way: TC / LAC / ExCo are reviewers whose
 * whole purpose is to see applications they did not author.
 */
export const EOI_PREVIEW_ROLES: readonly string[] = [UserRole.ADMIN];

/** Does this role get the investor workspace in preview mode? */
export function canPreviewEoi(role: string | null | undefined): boolean {
  return role != null && EOI_PREVIEW_ROLES.includes(role);
}

/**
 * Marks the sandbox `InvestorOrg` auto-provisioned for a preview actor.
 *
 * An `Application` needs an `investorOrgId` and a staff account has none, so
 * one is created on first use. The prefix is what stops it reading as a real
 * applicant in the console — keep it in the legal name, not a separate column,
 * so it is visible everywhere an org name is rendered without any view needing
 * to know preview mode exists.
 */
export const PREVIEW_ORG_PREFIX = "[PREVIEW]";

/** Sandbox org legal name for a preview actor, from their name or email. */
export function previewOrgLegalName(label: string): string {
  return `${PREVIEW_ORG_PREFIX} ${label}`.trim();
}

/** Is this org the sandbox of a preview actor rather than a real applicant? */
export function isPreviewOrgName(name: string | null | undefined): boolean {
  return (name ?? "").startsWith(PREVIEW_ORG_PREFIX);
}
