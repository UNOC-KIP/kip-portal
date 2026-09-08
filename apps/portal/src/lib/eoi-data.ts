import "server-only";

import {
  Application,
  ApplicationPartner,
  ApplicationPlot,
  ApplicationSection,
  Document,
  InvestorOrg,
  Plot,
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
  partnerId: string | null;
};

export type EoiSectionState = {
  section: EoiSection;
  payload: Record<string, unknown>;
  complete: boolean;
};

export type EoiPartner = {
  id: string;
  legalName: string;
  tradingName: string | null;
  registrationNumber: string | null;
  ursbRegistrationNumber: string | null;
  companyType: string | null;
  businessSector: string | null;
  countryOfIncorporation: string | null;
  tin: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isLead: boolean;
};

export type EoiPlotOption = {
  id: string;
  plotName: string;
  zone: string | null;
  acreage: number | null;
  areaCategory: string | null;
  /** Road/street the plot fronts. */
  road: string | null;
  /** How many OTHER investors have applied for this plot (transparency). */
  applicantCount: number;
  /** GeoJSON Polygon string (WGS84) for the map, or null if unavailable. */
  geometry: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
};

export type EoiWizardData = {
  application: {
    id: string;
    status: string;
    reference: string | null;
    lotReference: string;
    /** Plots this application has selected (may be several). */
    selectedPlotIds: string[];
  };
  /** True while the investor may still edit — drives read-only mode. */
  editable: boolean;
  sections: EoiSectionState[];
  documents: EoiDocument[];
  /** Joint-venture co-applicants (empty for a single-company application). */
  partners: EoiPartner[];
  /** Selectable plots, each with how many other investors have applied. */
  plots: EoiPlotOption[];
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
  applicationId?: string,
): Promise<EoiWizardData | null> {
  const user = await User.findByPk(userId);
  if (!user) return null;

  // Load the requested application (scoped to this owner) or, with no id, the
  // most recent one. The owner scope means a stray/foreign id simply yields no
  // application and the caller redirects to the dashboard.
  const application = applicationId
    ? await Application.findOne({
        where: { id: applicationId, ownerUserId: userId },
      })
    : await Application.findOne({
        where: { ownerUserId: userId },
        order: [["createdAt", "DESC"]],
      });
  if (!application) return null;

  // The organisation on the application, not the one on the user: they are the
  // same for an investor, but a preview actor (ADMIN) has no `investorOrgId` of
  // their own and applies through the sandbox org created with the application.
  const orgId = application.investorOrgId ?? user.investorOrgId;

  const [sections, documents, org, partners] = await Promise.all([
    ApplicationSection.findAll({ where: { applicationId: application.id } }),
    Document.findAll({
      where: { applicationId: application.id },
      order: [["uploadedAt", "ASC"]],
    }),
    orgId ? InvestorOrg.findByPk(orgId) : null,
    ApplicationPartner.findAll({
      where: { applicationId: application.id },
      order: [["position", "ASC"]],
    }),
  ]);

  // Plots for selection, the plots THIS application has chosen, and how many
  // OTHER investors have applied for each plot (transparency — just the count).
  const [plots, appPlots, apps] = await Promise.all([
    Plot.findAll({
      where: { available: true },
      order: [["zone", "ASC"], ["plotName", "ASC"]],
    }),
    ApplicationPlot.findAll({ attributes: ["applicationId", "plotId"] }),
    Application.findAll({ attributes: ["id", "status", "ownerUserId"] }),
  ]);
  const appById = new Map(apps.map((x) => [x.id, x]));
  const selectedPlotIds: string[] = [];
  const plotCounts = new Map<string, number>();
  for (const ap of appPlots) {
    if (ap.applicationId === application.id) {
      selectedPlotIds.push(ap.plotId);
      continue;
    }
    const owner = appById.get(ap.applicationId);
    if (!owner) continue;
    if (owner.status === ApplicationStatus.WITHDRAWN) continue;
    if (owner.ownerUserId === userId) continue; // "others", not the investor's own
    plotCounts.set(ap.plotId, (plotCounts.get(ap.plotId) ?? 0) + 1);
  }

  return {
    application: {
      id: application.id,
      status: application.status,
      reference: application.reference ?? null,
      lotReference: application.lotReference,
      selectedPlotIds,
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
      partnerId: d.partnerId ?? null,
    })),
    partners: partners.map((pt) => ({
      id: pt.id,
      legalName: pt.legalName,
      tradingName: pt.tradingName ?? null,
      registrationNumber: pt.registrationNumber ?? null,
      ursbRegistrationNumber: pt.ursbRegistrationNumber ?? null,
      companyType: pt.companyType ?? null,
      businessSector: pt.businessSector ?? null,
      countryOfIncorporation: pt.countryOfIncorporation ?? null,
      tin: pt.tin ?? null,
      address: pt.address ?? null,
      phone: pt.phone ?? null,
      email: pt.email ?? null,
      isLead: pt.isLead,
    })),
    plots: plots.map((pt) => ({
      id: pt.id,
      plotName: pt.plotName,
      zone: pt.zone ?? null,
      acreage: pt.acreage ?? null,
      areaCategory: pt.areaCategory ?? null,
      road: pt.street ?? null,
      applicantCount: plotCounts.get(pt.id) ?? 0,
      geometry: pt.geometry ?? null,
      centroidLat: pt.centroidLat ?? null,
      centroidLng: pt.centroidLng ?? null,
    })),
    prefill: prefillPreliminaryInfo(org, user),
  };
}
