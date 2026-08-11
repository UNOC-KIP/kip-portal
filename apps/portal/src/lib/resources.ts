/**
 * Published investor documents hosted outside the repo.
 *
 * These live in the `public/` prefix of the documents bucket (object-level
 * public-read, unlike the EOI attachments under `applications/`, which are only
 * ever reached through a presigned URL). They are large binaries that must not
 * be committed — same rule as the promo video on the About page.
 *
 * Defined once because the guide is linked from several places (home, how it
 * works, resources, the investor dashboard and the EOI wizard); a dead link
 * inside a published guide is not something we want to fix in five files.
 */

const BUCKET_PUBLIC_BASE =
  "https://kip-documents-unoc.s3.af-south-1.amazonaws.com/public";

/**
 * The EOI Investor Guide — the 13-page document that explains the whole EOI:
 * the six sections, the document checklist, local vs international
 * requirements, and the FAQ. This is what an investor should read *before*
 * starting an application, so it is linked prominently rather than buried on
 * the downloads page.
 */
export const EOI_INVESTOR_GUIDE = {
  title: "EOI Application — Investor Guide",
  /** Shown next to the link so the size is not a surprise on a mobile connection. */
  meta: "PDF · 13 pages · 381 KB · August 2026",
  description:
    "Everything you need before you apply: the six EOI sections explained, a full document checklist, local vs international requirements, and answers to the questions investors ask most.",
  url: `${BUCKET_PUBLIC_BASE}/KIP-LAND-ALLOCATION-EOI-APPLICATION-INVESTOR-GUIDE-AUGUST-2026.pdf`,
  /** Filename the browser saves it as, rather than the long key. */
  filename: "KIP-EOI-Investor-Guide-August-2026.pdf",
} as const;
