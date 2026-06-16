import { z } from "zod";
import { ApplicationStatus, EoiSection } from "../enums";

/**
 * Per-section payload. Each section is stored as JSON in the DB
 * so we can iterate on fields without migrations. Validation lives here.
 */

export const preliminaryInfoSchema = z.object({
  legalStatus: z.string().min(1, "Legal status is required"),
  powerOfAttorneySignatory: z.string().min(1),
  shareholders: z
    .array(
      z.object({
        fullName: z.string().min(1),
        idNumber: z.string().min(1),
        nationality: z.string().min(1),
      }),
    )
    .min(1, "At least one shareholder is required"),
  letterOfInterestSummary: z.string().min(20),
  companyContact: z.object({
    companyName: z.string().min(1),
    address: z.string().min(1),
    contactPerson: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
});
export type PreliminaryInfo = z.infer<typeof preliminaryInfoSchema>;

export const landBusinessProfileSchema = z.object({
  landSizeSqm: z.number().positive(),
  proposedDevelopment: z.string().min(20),
  establishedBusinesses: z.string().min(1),
  similarProjects: z.string().min(1),
});
export type LandBusinessProfile = z.infer<typeof landBusinessProfileSchema>;

export const utilitiesInfrastructureSchema = z.object({
  waterDemand: z.string().min(1),
  wastewaterPlan: z.string().min(1),
  powerDemandMW: z.number().nonnegative(),
  ictRequirements: z.string().min(1),
});
export type UtilitiesInfrastructure = z.infer<
  typeof utilitiesInfrastructureSchema
>;

export const h3seSchema = z.object({
  pastPerformanceSummary: z.string().min(1),
  hasH3sePolicy: z.boolean(),
  managementSystemSummary: z.string().min(1),
});
export type H3se = z.infer<typeof h3seSchema>;

export const nationalContentSchema = z.object({
  ugandanEmploymentHistory: z.string().min(1),
  trainingPrograms: z.string().min(1),
});
export type NationalContent = z.infer<typeof nationalContentSchema>;

export const declarationSchema = z.object({
  signatoryName: z.string().min(1),
  signatoryTitle: z.string().min(1),
  agreedAt: z.string().datetime(),
});
export type Declaration = z.infer<typeof declarationSchema>;

/** Map of section -> schema, useful for dynamic per-section validation. */
export const sectionSchemas = {
  [EoiSection.PRELIMINARY_INFO]: preliminaryInfoSchema,
  [EoiSection.LAND_BUSINESS_PROFILE]: landBusinessProfileSchema,
  [EoiSection.UTILITIES_INFRASTRUCTURE]: utilitiesInfrastructureSchema,
  [EoiSection.H3SE]: h3seSchema,
  [EoiSection.NATIONAL_CONTENT]: nationalContentSchema,
  [EoiSection.DECLARATION]: declarationSchema,
} as const;

/** API: create draft application. */
export const createApplicationSchema = z.object({
  lotReference: z.string().min(1),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

/** API: update one section of an application. */
export const updateSectionSchema = z.object({
  section: z.nativeEnum(EoiSection),
  payload: z.record(z.unknown()),
});
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

/** Status transition guard — LAC committee pipeline. */
export const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> =
  {
    [ApplicationStatus.DRAFT_PAYMENT_PENDING]: [
      ApplicationStatus.DRAFT,     // payment confirmed
      ApplicationStatus.WITHDRAWN,
    ],
    [ApplicationStatus.DRAFT]: [
      ApplicationStatus.SUBMITTED,  // all 6 sections complete + window OPEN
      ApplicationStatus.WITHDRAWN,
    ],
    [ApplicationStatus.SUBMITTED]: [
      ApplicationStatus.UNDER_TC_REVIEW, // window closes
    ],
    [ApplicationStatus.UNDER_TC_REVIEW]: [
      ApplicationStatus.TC_CLARIFICATION_REQUESTED,
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.NOT_SHORTLISTED,
    ],
    [ApplicationStatus.TC_CLARIFICATION_REQUESTED]: [
      ApplicationStatus.UNDER_TC_REVIEW, // investor responds
    ],
    [ApplicationStatus.SHORTLISTED]: [
      ApplicationStatus.LAC_REVIEW,
    ],
    [ApplicationStatus.LAC_REVIEW]: [
      ApplicationStatus.LAC_APPROVED,
      ApplicationStatus.LAC_REJECTED,
      ApplicationStatus.SHORTLISTED, // REQUEST_MORE_INFO returns to SHORTLISTED
    ],
    [ApplicationStatus.LAC_APPROVED]: [
      ApplicationStatus.EXCO_REVIEW,
    ],
    [ApplicationStatus.EXCO_REVIEW]: [
      ApplicationStatus.ALLOCATED,
      ApplicationStatus.LAC_REJECTED, // ExCo reject reuses LAC_REJECTED
    ],
    [ApplicationStatus.NOT_SHORTLISTED]: [],
    [ApplicationStatus.LAC_REJECTED]:    [],
    [ApplicationStatus.ALLOCATED]:       [],
    [ApplicationStatus.WITHDRAWN]:       [],
  };

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}
