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

/**
 * Document categories — one per attachment the EOI spec asks for.
 *
 * Backed by a Postgres ENUM type, so ADDING A VALUE HERE NEEDS A MIGRATION
 * (`ALTER TYPE "DocumentKind" ADD VALUE …`). The 12 original values are kept
 * even where the spec renamed the item, because rows already reference them.
 */
export const DocumentKind = {
  // Section 1.1 — Legal status
  CERTIFICATE_OF_INCORPORATION: "CERTIFICATE_OF_INCORPORATION",
  MEMORANDUM_AND_ARTICLES:      "MEMORANDUM_AND_ARTICLES",
  UGANDA_BRANCH_REGISTRATION:   "UGANDA_BRANCH_REGISTRATION",
  // Section 1.2 — Power of attorney
  POWER_OF_ATTORNEY:            "POWER_OF_ATTORNEY",
  // Section 1.3 — Ownership
  SHAREHOLDER_ID:               "SHAREHOLDER_ID",
  BENEFICIAL_OWNERSHIP_FORM:    "BENEFICIAL_OWNERSHIP_FORM",
  // Section 1.4 — Management structure
  ORGANOGRAM:                   "ORGANOGRAM",
  // Section 1.6 — Letter of EOI
  LETTER_OF_INTEREST:           "LETTER_OF_INTEREST",
  // Section 1.7 — Statutory & tax compliance
  TAX_CLEARANCE_CERTIFICATE:    "TAX_CLEARANCE_CERTIFICATE",
  NSSF_COMPLIANCE_CERTIFICATE:  "NSSF_COMPLIANCE_CERTIFICATE",
  // Section 2.2 / 2.3 — Business operations and track record
  TRADING_LICENCE:              "TRADING_LICENCE",
  BUSINESS_EVIDENCE:            "BUSINESS_EVIDENCE",
  SIMILAR_PROJECT_EVIDENCE:     "SIMILAR_PROJECT_EVIDENCE",
  // Section 4 — H3SE
  H3SE_RECORD:                  "H3SE_RECORD",
  H3SE_CERTIFICATE:             "H3SE_CERTIFICATE",
  H3SE_POLICY:                  "H3SE_POLICY",
  H3SE_ORGANOGRAM:              "H3SE_ORGANOGRAM",
  H3SE_AUDIT_REPORT:            "H3SE_AUDIT_REPORT",
  // Section 5 — National content
  NATIONAL_CONTENT_EVIDENCE:    "NATIONAL_CONTENT_EVIDENCE",
  TRAINING_RECORD:              "TRAINING_RECORD",
  PROCUREMENT_RECORD:           "PROCUREMENT_RECORD",
  // Section 6 — Declaration
  SIGNED_DECLARATION:           "SIGNED_DECLARATION",
  // Fee step
  PAYMENT_PROOF:                "PAYMENT_PROOF",
  OTHER:                        "OTHER",
} as const;
export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  CERTIFICATE_OF_INCORPORATION: "Certificate of Incorporation / Registration",
  MEMORANDUM_AND_ARTICLES:      "Memorandum & Articles of Association",
  UGANDA_BRANCH_REGISTRATION:   "Uganda branch registration certificate",
  POWER_OF_ATTORNEY:            "Power of Attorney / Board Resolution",
  SHAREHOLDER_ID:               "Shareholder passport or National ID",
  BENEFICIAL_OWNERSHIP_FORM:    "Beneficial ownership declaration",
  ORGANOGRAM:                   "Company organogram",
  LETTER_OF_INTEREST:           "Letter of Expression of Interest",
  TAX_CLEARANCE_CERTIFICATE:    "Tax Clearance Certificate",
  NSSF_COMPLIANCE_CERTIFICATE:  "NSSF Compliance Certificate",
  TRADING_LICENCE:              "Trading Licence",
  BUSINESS_EVIDENCE:            "Business operations evidence",
  SIMILAR_PROJECT_EVIDENCE:     "Comparable project evidence",
  H3SE_RECORD:                  "H3SE incident register / safety evidence",
  H3SE_CERTIFICATE:             "H3SE certificate (ISO 45001, ISO 14001, …)",
  H3SE_POLICY:                  "Signed H3SE policy",
  H3SE_ORGANOGRAM:              "H3SE organizational chart",
  H3SE_AUDIT_REPORT:            "Most recent H3SE audit report",
  NATIONAL_CONTENT_EVIDENCE:    "Payroll / NSSF remittance evidence",
  TRAINING_RECORD:              "Training attendance & completion records",
  PROCUREMENT_RECORD:           "Procurement register / local content report",
  SIGNED_DECLARATION:           "Signed declaration page",
  PAYMENT_PROOF:                "Proof of payment",
  OTHER:                        "Other supporting document",
};

/** Legal form of an investor company — captured at registration. */
export const CompanyType = {
  LIMITED_LIABILITY_COMPANY: "LIMITED_LIABILITY_COMPANY",
  PUBLIC_LIMITED_COMPANY:    "PUBLIC_LIMITED_COMPANY",
  JOINT_VENTURE:             "JOINT_VENTURE",
  PARTNERSHIP:               "PARTNERSHIP",
  SOLE_PROPRIETORSHIP:       "SOLE_PROPRIETORSHIP",
  OTHER:                     "OTHER",
} as const;
export type CompanyType = (typeof CompanyType)[keyof typeof CompanyType];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  LIMITED_LIABILITY_COMPANY: "Limited Liability Company",
  PUBLIC_LIMITED_COMPANY:    "Public Limited Company (PLC)",
  JOINT_VENTURE:             "Joint Venture",
  PARTNERSHIP:               "Partnership",
  SOLE_PROPRIETORSHIP:       "Sole Proprietorship",
  OTHER:                     "Other",
};

/** Primary business sector — aligned with the KIP investment zones. */
export const BusinessSector = {
  PETROCHEMICALS_REFINING: "PETROCHEMICALS_REFINING",
  FERTILISERS_CHEMICALS:   "FERTILISERS_CHEMICALS",
  LIGHT_MANUFACTURING:     "LIGHT_MANUFACTURING",
  AGRO_PROCESSING:         "AGRO_PROCESSING",
  LOGISTICS_WAREHOUSING:   "LOGISTICS_WAREHOUSING",
  COMMERCIAL_HOSPITALITY:  "COMMERCIAL_HOSPITALITY",
  ICT:                     "ICT",
  OTHER:                   "OTHER",
} as const;
export type BusinessSector = (typeof BusinessSector)[keyof typeof BusinessSector];

export const BUSINESS_SECTOR_LABELS: Record<BusinessSector, string> = {
  PETROCHEMICALS_REFINING: "Petrochemicals & Refining",
  FERTILISERS_CHEMICALS:   "Fertilisers & Chemicals",
  LIGHT_MANUFACTURING:     "Light / Downstream Manufacturing",
  AGRO_PROCESSING:         "Agro-processing",
  LOGISTICS_WAREHOUSING:   "Logistics & Warehousing",
  COMMERCIAL_HOSPITALITY:  "Commercial & Hospitality",
  ICT:                     "ICT",
  OTHER:                   "Other",
};

/** Where a public inquiry came from. */
export const InquiryChannel = {
  CONTACT_FORM: "CONTACT_FORM", // /contact page form
  LIVE_CHAT:    "LIVE_CHAT",    // chat widget → POST /api/inquiry
} as const;
export type InquiryChannel = (typeof InquiryChannel)[keyof typeof InquiryChannel];

export const INQUIRY_CHANNEL_LABELS: Record<InquiryChannel, string> = {
  CONTACT_FORM: "Contact Form",
  LIVE_CHAT:    "Live Chat",
};

/** Manual follow-up state of a public inquiry — tracked in the admin console. */
export const InquiryStatus = {
  NEW:       "NEW",
  RESPONDED: "RESPONDED",
  CLOSED:    "CLOSED",
} as const;
export type InquiryStatus = (typeof InquiryStatus)[keyof typeof InquiryStatus];

/** Follow-up state of an investor's site-visit booking request. */
export const SiteVisitStatus = {
  NEW:       "NEW",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type SiteVisitStatus = (typeof SiteVisitStatus)[keyof typeof SiteVisitStatus];

export const SITE_VISIT_STATUS_LABELS: Record<SiteVisitStatus, string> = {
  NEW:       "New Request",
  SCHEDULED: "Visit Scheduled",
  COMPLETED: "Visit Completed",
  CANCELLED: "Cancelled",
};

/**
 * Lifecycle of an admin-composed broadcast. `SENDING` is the state while the
 * paced nodemailer loop is draining; the terminal state depends on how many
 * deliveries failed — all good is `SENT`, none good is `FAILED`.
 */
export const CommunicationStatus = {
  DRAFT:          "DRAFT",
  SENDING:        "SENDING",
  SENT:           "SENT",
  PARTIALLY_SENT: "PARTIALLY_SENT",
  FAILED:         "FAILED",
} as const;
export type CommunicationStatus = (typeof CommunicationStatus)[keyof typeof CommunicationStatus];

export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> = {
  DRAFT:          "Draft",
  SENDING:        "Sending",
  SENT:           "Sent",
  PARTIALLY_SENT: "Partially Sent",
  FAILED:         "Failed",
};

/** How the recipient list for a broadcast was chosen. */
export const CommunicationAudience = {
  ALL_INVESTORS:    "ALL_INVESTORS",
  INVESTOR_SEGMENT: "INVESTOR_SEGMENT",
  STAFF:            "STAFF",
  NOTIFY_LIST:      "NOTIFY_LIST",
  CUSTOM:           "CUSTOM",
} as const;
export type CommunicationAudience = (typeof CommunicationAudience)[keyof typeof CommunicationAudience];

export const COMMUNICATION_AUDIENCE_LABELS: Record<CommunicationAudience, string> = {
  ALL_INVESTORS:    "All Investors",
  INVESTOR_SEGMENT: "Investor Segment",
  STAFF:            "Staff",
  NOTIFY_LIST:      "Notify List",
  CUSTOM:           "Hand-picked",
};

/** Where a broadcast lands. `IN_APP` skips SMTP entirely. */
export const CommunicationChannel = {
  EMAIL:           "EMAIL",
  IN_APP:          "IN_APP",
  EMAIL_AND_IN_APP: "EMAIL_AND_IN_APP",
} as const;
export type CommunicationChannel = (typeof CommunicationChannel)[keyof typeof CommunicationChannel];

export const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  EMAIL:            "Email only",
  IN_APP:           "Portal inbox only",
  EMAIL_AND_IN_APP: "Email + portal inbox",
};

/** Per-recipient delivery state of one broadcast. */
export const DeliveryStatus = {
  PENDING: "PENDING",
  SENT:    "SENT",
  FAILED:  "FAILED",
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  SENT:    "Sent",
  FAILED:  "Failed",
};

/** Application window lifecycle. */
export const ApplicationWindowStatus = {
  DRAFT:    "DRAFT",
  OPEN:     "OPEN",
  CLOSED:   "CLOSED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ApplicationWindowStatus = (typeof ApplicationWindowStatus)[keyof typeof ApplicationWindowStatus];
