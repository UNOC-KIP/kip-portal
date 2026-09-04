import { DocumentKind, EoiSection } from "./enums";
import { ApplicantCategory } from "./schemas/application";

/**
 * The EOI attachment checklist — one entry per "Attach:" bullet in the UNOC
 * Master Content Specification.
 *
 * Single source of truth for three consumers that must agree, or the investor
 * sees one checklist and the submit guard enforces another:
 *   - the wizard's upload slots,
 *   - the submit-time completeness guard in the API,
 *   - the admin/committee view of what was supplied.
 */

/**
 * Spec §8: "clear, legible PDF copies not exceeding 5MB per file."
 *
 * Deliberately stricter than the 10MB / PDF+JPEG+PNG rule the S3 helper applies
 * to payment proof — §1 explicitly allows a photo of a deposit slip, while
 * every EOI attachment is a formal document.
 */
export const EOI_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const EOI_ACCEPTED_MIME_TYPES = ["application/pdf"] as const;
export const EOI_ACCEPT_ATTRIBUTE = ".pdf,application/pdf";

export type EoiDocumentRequirement = {
  kind: DocumentKind;
  section: EoiSection;
  /** Spec reference, e.g. "1.2" — shown to the investor and the committee. */
  clause: string;
  label: string;
  /** The descriptor shown against the upload slot (spec §0 asks for this). */
  description: string;
  required: boolean;
  /** More than one file may be filed under this kind (e.g. one ID per shareholder). */
  multiple: boolean;
  /** Undefined = applies to both applicant categories. */
  appliesTo?: readonly ApplicantCategory[];
  /** Whether "Not Applicable + explanation" satisfies this slot (spec §8). */
  allowNotApplicable: boolean;
};

export const EOI_DOCUMENT_REQUIREMENTS: readonly EoiDocumentRequirement[] = [
  // ---- Section 1: Preliminary Information ----
  {
    kind: DocumentKind.CERTIFICATE_OF_INCORPORATION,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.1",
    label: "Certificate of Incorporation / Registration",
    description:
      "Local applicants: the URSB certificate. International applicants: the home-country equivalent.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.UGANDA_BRANCH_REGISTRATION,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.1",
    label: "Uganda branch registration certificate",
    description:
      "Only if your company already has a registered branch, subsidiary or liaison office in Uganda.",
    required: false,
    multiple: false,
    appliesTo: [ApplicantCategory.INTERNATIONAL],
    allowNotApplicable: true,
  },
  {
    kind: DocumentKind.MEMORANDUM_AND_ARTICLES,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.1",
    label: "Memorandum & Articles of Association",
    description:
      "Or the equivalent constitutive document under the laws of your country of incorporation — a Board Charter or Company Statute.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.POWER_OF_ATTORNEY,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.2",
    label: "Power of Attorney / Board Resolution",
    description:
      "Naming the specific individual authorized to sign. Notarization (and legalization where applicable) is accepted but not required. A signed letter on its own is not sufficient.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.SHAREHOLDER_ID,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.3",
    label: "Shareholder passport or National ID",
    description:
      "One per individual shareholder named above. Corporate shareholders are identified by registration details instead — no ID is needed for them.",
    required: true,
    multiple: true,
    allowNotApplicable: true,
  },
  {
    kind: DocumentKind.BENEFICIAL_OWNERSHIP_FORM,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.3",
    label: "Beneficial ownership declaration",
    description:
      "The URSB Beneficial Ownership form for Uganda-registered companies, or your home-country equivalent.",
    required: true,
    multiple: false,
    allowNotApplicable: true,
  },
  {
    kind: DocumentKind.ORGANOGRAM,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.4",
    label: "Company organogram",
    description:
      "Organizational chart showing reporting lines from the Board down through senior management.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.LETTER_OF_INTEREST,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.6",
    label: "Signed Letter of Expression of Interest",
    description:
      "On company letterhead, addressed to the Chief Executive Officer, Uganda National Oil Company Limited, stating your interest in KIP land allocation and the proposed business activity.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.TAX_CLEARANCE_CERTIFICATE,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.7",
    label: "Tax Clearance Certificate",
    description:
      "Local applicants: a valid certificate from the Uganda Revenue Authority. International applicants: a Tax Clearance Certificate or Certificate of Good Standing from your home-country tax authority.",
    required: true,
    multiple: false,
    allowNotApplicable: true,
  },
  {
    kind: DocumentKind.NSSF_COMPLIANCE_CERTIFICATE,
    section: EoiSection.PRELIMINARY_INFO,
    clause: "1.7",
    label: "NSSF Compliance Certificate",
    description:
      "Where the company has employees registered with NSSF. Mark Not Applicable if you have no Uganda operations yet.",
    required: true,
    multiple: false,
    appliesTo: [ApplicantCategory.LOCAL],
    allowNotApplicable: true,
  },

  // ---- Section 2: Land Area & Business Profile ----
  {
    kind: DocumentKind.TRADING_LICENCE,
    section: EoiSection.LAND_BUSINESS_PROFILE,
    clause: "2.2",
    label: "Current Trading Licence",
    description:
      "The licence class must match your proposed KIP activity — a licence for an unrelated trade class (e.g. general wholesale for a specialized industrial activity) will not be accepted.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.SIMILAR_PROJECT_EVIDENCE,
    section: EoiSection.LAND_BUSINESS_PROFILE,
    clause: "2.3",
    label: "Comparable project evidence",
    description:
      "Certificates, purchase orders, contracts or independent verification for the projects you described. This is the most commonly under-documented item — evidence should scale with the risk of the activity you propose.",
    required: true,
    multiple: true,
    allowNotApplicable: false,
  },

  // ---- Section 4: H3SE ----
  {
    kind: DocumentKind.H3SE_RECORD,
    section: EoiSection.H3SE,
    clause: "4.1",
    label: "Safety performance evidence",
    description:
      "Incident registers, regulator correspondence or independent audit reports substantiating the figures you reported.",
    required: true,
    multiple: true,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.H3SE_CERTIFICATE,
    section: EoiSection.H3SE,
    clause: "4.2",
    label: "H3SE certificates",
    description:
      "A copy of each currently valid certificate listed in the table. Certifications in progress or planned do not count.",
    required: true,
    multiple: true,
    allowNotApplicable: true,
  },
  {
    kind: DocumentKind.H3SE_POLICY,
    section: EoiSection.H3SE,
    clause: "4.3",
    label: "Signed H3SE policy",
    description:
      "The current policy document, dated and signed by your Authorized Signatory.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.H3SE_ORGANOGRAM,
    section: EoiSection.H3SE,
    clause: "4.3",
    label: "H3SE organizational chart",
    description: "Showing your dedicated H3SE function and its reporting lines.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
  {
    kind: DocumentKind.H3SE_AUDIT_REPORT,
    section: EoiSection.H3SE,
    clause: "4.3",
    label: "Most recent H3SE audit report",
    description:
      "Your latest internal or external audit report, or a relevant certification such as ISO 45001:2018 as indicative evidence of established procedures.",
    required: true,
    multiple: false,
    allowNotApplicable: true,
  },

  // ---- Section 5: National Content ----
  {
    kind: DocumentKind.NATIONAL_CONTENT_EVIDENCE,
    section: EoiSection.NATIONAL_CONTENT,
    clause: "5.1",
    label: "Employment evidence",
    description:
      "Payroll reports or headcount registers, NSSF proof of payment / remittance schedules for the most recent available period, and sample employment contracts.",
    required: true,
    multiple: true,
    allowNotApplicable: true,
  },
  {
    kind: DocumentKind.TRAINING_RECORD,
    section: EoiSection.NATIONAL_CONTENT,
    clause: "5.2",
    label: "Training records",
    description:
      "Attendance registers, completion certificates or training records evidencing the programmes you reported.",
    required: true,
    multiple: true,
    allowNotApplicable: true,
  },
  {
    kind: DocumentKind.PROCUREMENT_RECORD,
    section: EoiSection.NATIONAL_CONTENT,
    clause: "5.3",
    label: "Procurement record",
    description:
      "Procurement register or auditor-confirmed local content report, where available.",
    required: false,
    multiple: false,
    allowNotApplicable: true,
  },

  // ---- Section 6: Declaration ----
  {
    kind: DocumentKind.SIGNED_DECLARATION,
    section: EoiSection.DECLARATION,
    clause: "6",
    label: "Signed declaration page",
    description:
      "The declaration page bearing the signature and company seal/stamp of the Authorized Signatory.",
    required: true,
    multiple: false,
    allowNotApplicable: false,
  },
] as const;

/** Requirements that apply to one section, for a given applicant category. */
export function documentRequirementsFor(
  section: EoiSection,
  category: ApplicantCategory | undefined,
): EoiDocumentRequirement[] {
  return EOI_DOCUMENT_REQUIREMENTS.filter(
    (r) =>
      r.section === section &&
      // Until the investor picks a category, show the category-neutral slots
      // only — offering an NSSF slot to an applicant who may be international
      // invites exactly the wrong upload.
      (!r.appliesTo || (category != null && r.appliesTo.includes(category))),
  );
}

/** Every requirement that applies, across all sections. */
export function allDocumentRequirementsFor(
  category: ApplicantCategory | undefined,
): EoiDocumentRequirement[] {
  return EOI_DOCUMENT_REQUIREMENTS.filter(
    (r) => !r.appliesTo || (category != null && r.appliesTo.includes(category)),
  );
}

/**
 * Required attachments that have neither a file nor an N/A explanation.
 *
 * `naNotes` are keyed by document kind (`notApplicable["SHAREHOLDER_ID"]`),
 * which is a different namespace from the per-field notes inside a section
 * payload — a kind is never also a field path, so the two cannot collide.
 */
export function missingRequiredDocuments(args: {
  category: ApplicantCategory | undefined;
  uploadedKinds: readonly string[];
  naNotes?: Record<string, string>;
}): EoiDocumentRequirement[] {
  const uploaded = new Set(args.uploadedKinds);
  return allDocumentRequirementsFor(args.category).filter((r) => {
    if (!r.required) return false;
    if (uploaded.has(r.kind)) return false;
    if (r.allowNotApplicable) {
      const note = args.naNotes?.[r.kind];
      if (typeof note === "string" && note.trim().length >= 5) return false;
    }
    return true;
  });
}

/** Human-readable reason a file was rejected, or null when it is acceptable. */
export function validateEoiFile(file: {
  mimeType: string;
  sizeBytes: number;
}): string | null {
  if (!EOI_ACCEPTED_MIME_TYPES.includes(file.mimeType as "application/pdf")) {
    return "Attachments must be PDF files.";
  }
  if (file.sizeBytes <= 0) return "That file is empty.";
  if (file.sizeBytes > EOI_MAX_FILE_BYTES) {
    return `Attachments must not exceed ${Math.round(
      EOI_MAX_FILE_BYTES / (1024 * 1024),
    )}MB — that file is ${(file.sizeBytes / (1024 * 1024)).toFixed(1)}MB.`;
  }
  return null;
}
