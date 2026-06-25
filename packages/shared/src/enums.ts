/**
 * Canonical enums for the KIP portal.
 * Mirror these in the Sequelize model string literals — keep them in sync.
 */

/** Application lifecycle status — LAC committee pipeline. */
export const ApplicationStatus = {
  DRAFT_PAYMENT_PENDING:       "DRAFT_PAYMENT_PENDING",
  DRAFT:                       "DRAFT",
  SUBMITTED:                   "SUBMITTED",
  UNDER_TC_REVIEW:             "UNDER_TC_REVIEW",
  TC_CLARIFICATION_REQUESTED:  "TC_CLARIFICATION_REQUESTED",
  SHORTLISTED:                 "SHORTLISTED",
  NOT_SHORTLISTED:             "NOT_SHORTLISTED",
  LAC_REVIEW:                  "LAC_REVIEW",
  LAC_APPROVED:                "LAC_APPROVED",
  LAC_REJECTED:                "LAC_REJECTED",
  EXCO_REVIEW:                 "EXCO_REVIEW",
  ALLOCATED:                   "ALLOCATED",
  WITHDRAWN:                   "WITHDRAWN",
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

/** User roles — investor-side and internal staff. */
export const UserRole = {
  INVESTOR:    "INVESTOR",
  TC_MEMBER:   "TC_MEMBER",
  TC_CHAIR:    "TC_CHAIR",
  LAC_MEMBER:  "LAC_MEMBER",
  EXCO_MEMBER: "EXCO_MEMBER",
  ADMIN:       "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Account activation status for investor accounts. */
export const UserStatus = {
  PENDING_REVIEW: "PENDING_REVIEW",
  ACTIVE:         "ACTIVE",
  REJECTED:       "REJECTED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** Sections of the EOI standard application form (6 sections). */
export const EoiSection = {
  PRELIMINARY_INFO:         "PRELIMINARY_INFO",
  LAND_BUSINESS_PROFILE:    "LAND_BUSINESS_PROFILE",
  UTILITIES_INFRASTRUCTURE: "UTILITIES_INFRASTRUCTURE",
  H3SE:                     "H3SE",
  NATIONAL_CONTENT:         "NATIONAL_CONTENT",
  DECLARATION:              "DECLARATION",
} as const;
export type EoiSection = (typeof EoiSection)[keyof typeof EoiSection];

/** Payment status. */
export const PaymentStatus = {
  PENDING:        "PENDING",
  PROOF_UPLOADED: "PROOF_UPLOADED",
  CONFIRMED:      "CONFIRMED",
  FAILED:         "FAILED",
  REFUNDED:       "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Payment method — MoMo / Airtel are explicitly out of scope. */
export const PaymentMethod = {
  CARD:             "CARD",             // Visa / Mastercard via gateway
  STANBIC_TRANSFER: "STANBIC_TRANSFER", // manual bank transfer + proof upload
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/** Currency. */
export const Currency = {
  USD: "USD",
  UGX: "UGX",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

/** Reviewer action types — append-only audit trail. */
export const ReviewActionType = {
  ASSIGNED:                "ASSIGNED",
  COMMENTED:               "COMMENTED",
  REQUESTED_CLARIFICATION: "REQUESTED_CLARIFICATION",
  CLARIFICATION_PROVIDED:  "CLARIFICATION_PROVIDED",
  RECOMMENDED:             "RECOMMENDED",
  REJECTED:                "REJECTED",
  APPROVED:                "APPROVED",
  SHORTLISTED:             "SHORTLISTED",
  NOT_SHORTLISTED:         "NOT_SHORTLISTED",
  LAC_APPROVED:            "LAC_APPROVED",
  LAC_REJECTED:            "LAC_REJECTED",
  ALLOCATED:               "ALLOCATED",
  RETURNED_TO_TC:          "RETURNED_TO_TC",
  ESCALATED:               "ESCALATED",
} as const;
export type ReviewActionType = (typeof ReviewActionType)[keyof typeof ReviewActionType];

/** Document categories. */
export const DocumentKind = {
  CERTIFICATE_OF_INCORPORATION: "CERTIFICATE_OF_INCORPORATION",
  POWER_OF_ATTORNEY:            "POWER_OF_ATTORNEY",
  SHAREHOLDER_ID:               "SHAREHOLDER_ID",
  ORGANOGRAM:                   "ORGANOGRAM",
  LETTER_OF_INTEREST:           "LETTER_OF_INTEREST",
  BUSINESS_EVIDENCE:            "BUSINESS_EVIDENCE",
  SIMILAR_PROJECT_EVIDENCE:     "SIMILAR_PROJECT_EVIDENCE",
  H3SE_RECORD:                  "H3SE_RECORD",
  H3SE_POLICY:                  "H3SE_POLICY",
  NATIONAL_CONTENT_EVIDENCE:    "NATIONAL_CONTENT_EVIDENCE",
  PAYMENT_PROOF:                "PAYMENT_PROOF",
  OTHER:                        "OTHER",
} as const;
export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

/** Application window lifecycle. */
export const ApplicationWindowStatus = {
  DRAFT:    "DRAFT",
  OPEN:     "OPEN",
  CLOSED:   "CLOSED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ApplicationWindowStatus = (typeof ApplicationWindowStatus)[keyof typeof ApplicationWindowStatus];
