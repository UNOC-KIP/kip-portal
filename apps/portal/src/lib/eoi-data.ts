import "server-only";

import {
  Application,
  ApplicationSection,
  Document,
  InvestorOrg,
  User,
} from "@kip/db";
import {
  ApplicationStatus,
  CompanyType,
  EoiSection,
  ApplicantCategory,
  LegalForm,
} from "@kip/shared";

/**
 * Read layer for the EOI wizard.
 *
 * Reads go direct to the DB (CLAUDE.md "Web data access — hybrid"); every write
 * the wizard performs goes back out through the Express API.
 */

export type EoiDocument = {
  id: string;
  kind: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type EoiSectionState = {
  section: EoiSection;
  payload: Record<string, unknown>;
  complete: boolean;
};

export type EoiWizardData = {
  application: {
    id: string;
    status: string;
    reference: string | null;
    lotReference: string;
  };
  /** True while the investor may still edit — drives read-only mode. */
  editable: boolean;
  sections: EoiSectionState[];
  documents: EoiDocument[];
  /** Registration data used to prefill Section 1 (see `prefillPreliminaryInfo`). */
  prefill: Record<string, unknown>;
};

/** Registration captures a subset of `CompanyType`; the EOI asks for `LegalForm`. */
const COMPANY_TYPE_TO_LEGAL_FORM: Record<string, LegalForm> = {
  [CompanyType.LIMITED_LIABILITY_COMPANY]: LegalForm.PRIVATE_LIMITED_COMPANY,
  [CompanyType.PUBLIC_LIMITED_COMPANY]: LegalForm.PUBLIC_LIMITED_COMPANY,
  [CompanyType.JOINT_VENTURE]: LegalForm.JOINT_VENTURE,
  [CompanyType.PARTNERSHIP]: LegalForm.PARTNERSHIP,
  [CompanyType.SOLE_PROPRIETORSHIP]: LegalForm.OTHER,
  [CompanyType.OTHER]: LegalForm.OTHER,
};

function isUganda(country: string | null | undefined): boolean {
  return (country ?? "").trim().toLowerCase().startsWith("uganda");
}

/**
 * Section 1 seeded from what registration already collected.
 *
 * The values are a starting point, not a lock: the investor can correct any of
 * them, and the confirmed values are stored in the section payload. That makes
 * the submitted EOI a self-contained record — a committee reading it two years
 * later sees what was declared at submission, not whatever the org row says by
 * then.
 */
export function prefillPreliminaryInfo(
  org: InvestorOrg | null,
  user: User,
): Record<string, unknown> {
  const category = isUganda(org?.countryOfIncorporation)
    ? ApplicantCategory.LOCAL
    : ApplicantCategory.INTERNATIONAL;

  return {
    applicantCategory: category,
    legalStatus: {
      companyName: org?.legalName ?? "",
      registrationNumber:
        org?.ursbRegistrationNumber || org?.registrationNumber || "",
      countryOfIncorporation: org?.countryOfIncorporation ?? "",
      legalForm: org?.companyType
        ? (COMPANY_TYPE_TO_LEGAL_FORM[org.companyType] ?? LegalForm.OTHER)
        : undefined,
    },
    powerOfAttorney: {
      grantingCompany: org?.legalName ?? "",
      representatives: [
        { fullName: user.name ?? "", position: user.designation ?? "" },
      ],
    },
    companyContact: {
      physicalAddress: org?.address ?? "",
      postalAddress: org?.address ?? "",
      email: org?.email ?? "",
      phone: org?.phone ?? "",
      primaryContactSameAsRepresentative: true,
    },
    statutoryCompliance: {
      ...(category === ApplicantCategory.LOCAL
        ? { ugandaTin: org?.tin ?? "" }
        : {}),
    },
  };
}

/** Statuses in which the investor may still edit the EOI. */
const EDITABLE_STATUSES: string[] = [
  ApplicationStatus.DRAFT_PAYMENT_PENDING,
  ApplicationStatus.DRAFT,
  ApplicationStatus.TC_CLARIFICATION_REQUESTED,
];

/**
 * Everything the wizard needs in one read. Returns null when the investor has
 * no application yet — the caller redirects to the dashboard, which owns the
 * "start your application" flow.
 */
export async function getEoiWizardData(
  userId: string,
): Promise<EoiWizardData | null> {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const application = await Application.findOne({
    where: { ownerUserId: userId },
    order: [["createdAt", "DESC"]],
  });
  if (!application) return null;

  const [sections, documents, org] = await Promise.all([
    ApplicationSection.findAll({ where: { applicationId: application.id } }),
    Document.findAll({
      where: { applicationId: application.id },
      order: [["uploadedAt", "ASC"]],
    }),
    user.investorOrgId ? InvestorOrg.findByPk(user.investorOrgId) : null,
  ]);

  return {
    application: {
      id: application.id,
      status: application.status,
      reference: application.reference ?? null,
      lotReference: application.lotReference,
    },
    editable: EDITABLE_STATUSES.includes(application.status),
    sections: sections.map((s) => ({
      section: s.section as EoiSection,
      payload: (s.payload ?? {}) as Record<string, unknown>,
      complete: s.completedAt != null,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      kind: d.kind,
      filename: d.filename,
      sizeBytes: d.sizeBytes,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    prefill: prefillPreliminaryInfo(org, user),
  };
}
