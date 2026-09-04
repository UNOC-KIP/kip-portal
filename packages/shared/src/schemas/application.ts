import { z } from "zod";
import { ApplicationStatus, EoiSection } from "../enums";
import { KipZone } from "../zones";

/**
 * Per-section payload. Each section is stored as JSON in the DB so we can
 * iterate on fields without migrations. Validation lives here.
 *
 * Field set follows the UNOC "KIP Expression of Interest — Investor Portal
 * Module: Master Content Specification" (Business Development Unit). Section
 * numbers in the comments below refer to that document.
 *
 * Two rules run through the whole file:
 *
 *  1. The Technical Committee compares bidders side by side, so anything it
 *     tabulates is a NUMBER in a fixed-length array — never prose. Attachments
 *     verify those numbers, they do not replace them (spec §4, §5).
 *  2. Where the spec says an item may not apply, the field is `.optional()` and
 *     a `superRefine` demands either a value or a written N/A explanation. See
 *     `naNotes` below — never make such a field required outright.
 */

/* ------------------------------------------------------------------ *
 * Not Applicable
 * ------------------------------------------------------------------ */

/**
 * Per-field "does not apply, and here is why" notes, keyed by the field's path
 * within its section (e.g. `"statutoryCompliance.nssfCertificate"`).
 *
 * Spec §8: an investor must be able to mark an item Not Applicable with a brief
 * explanation "rather than leaving the field blank" — a blank field and a
 * deliberate N/A are different things to an evaluator, and collapsing them is
 * what drives Requests for Clarification.
 */
export const naNotesSchema = z.record(
  z.string().min(5, "Explain briefly why this does not apply"),
);
export type NaNotes = z.infer<typeof naNotesSchema>;

/** True when `path` carries a usable N/A explanation. */
function isMarkedNA(notes: NaNotes | undefined, path: string): boolean {
  const note = notes?.[path];
  return typeof note === "string" && note.trim().length >= 5;
}

/**
 * Require `value` unless the investor marked `path` Not Applicable.
 * Call from a section's `superRefine` for every conditionally-applicable field.
 */
function requireUnlessNA(
  ctx: z.RefinementCtx,
  notes: NaNotes | undefined,
  path: string,
  value: unknown,
  message: string,
): void {
  const missing =
    value == null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
  if (!missing || isMarkedNA(notes, path)) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: path.split("."),
    message: `${message} — or mark it Not Applicable with a brief explanation.`,
  });
}

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

/** `YYYY-MM-DD`. Stored as a string so payload JSON round-trips unchanged. */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)");

const nonEmpty = (min: number, message: string) =>
  z.string().trim().min(min, message);

const count = z.number().int().nonnegative();
const rate = z.number().nonnegative();

/** The 3 most recently completed calendar years (spec §4.1, §5.1). */
export const REPORTING_YEARS = 3;

/** Applicant category — drives which supporting documents apply (spec §1.1). */
export const ApplicantCategory = {
  LOCAL: "LOCAL",
  INTERNATIONAL: "INTERNATIONAL",
} as const;
export type ApplicantCategory =
  (typeof ApplicantCategory)[keyof typeof ApplicantCategory];

export const APPLICANT_CATEGORY_LABELS: Record<ApplicantCategory, string> = {
  LOCAL: "Local Investor (registered in Uganda)",
  INTERNATIONAL: "International Investor (registered outside Uganda)",
};

/** Legal form as stated in the incorporation documents (spec §1.1). */
export const LegalForm = {
  PRIVATE_LIMITED_COMPANY: "PRIVATE_LIMITED_COMPANY",
  PUBLIC_LIMITED_COMPANY: "PUBLIC_LIMITED_COMPANY",
  PARTNERSHIP: "PARTNERSHIP",
  JOINT_VENTURE: "JOINT_VENTURE",
  OTHER: "OTHER",
} as const;
export type LegalForm = (typeof LegalForm)[keyof typeof LegalForm];

export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  PRIVATE_LIMITED_COMPANY: "Private Limited Company",
  PUBLIC_LIMITED_COMPANY: "Public Limited Company",
  PARTNERSHIP: "Partnership",
  JOINT_VENTURE: "Joint Venture",
  OTHER: "Other",
};

/** How an international applicant is present in Uganda today (spec §1.1). */
export const LocalPresenceType = {
  NONE: "NONE",
  BRANCH: "BRANCH",
  SUBSIDIARY: "SUBSIDIARY",
  LIAISON_OFFICE: "LIAISON_OFFICE",
} as const;
export type LocalPresenceType =
  (typeof LocalPresenceType)[keyof typeof LocalPresenceType];

export const LOCAL_PRESENCE_TYPE_LABELS: Record<LocalPresenceType, string> = {
  NONE: "No Uganda presence yet",
  BRANCH: "Registered branch",
  SUBSIDIARY: "Subsidiary",
  LIAISON_OFFICE: "Liaison office",
};

/** Whether multiple authorized representatives act alone or together (spec §1.2). */
export const ActingMode = {
  INDIVIDUALLY: "INDIVIDUALLY",
  JOINTLY: "JOINTLY",
} as const;
export type ActingMode = (typeof ActingMode)[keyof typeof ActingMode];

/**
 * Notarization path (spec §1.2). Notarization is optional for all applicants;
 * when supplied, this records which path was used. For countries outside the
 * Hague Apostille Convention, consular legalization sits on top of notarization,
 * so it is its own value.
 */
export const NotarizationType = {
  NOTARIZED: "NOTARIZED",
  NOTARIZED_AND_APOSTILLED: "NOTARIZED_AND_APOSTILLED",
  NOTARIZED_AND_LEGALIZED: "NOTARIZED_AND_LEGALIZED",
} as const;
export type NotarizationType =
  (typeof NotarizationType)[keyof typeof NotarizationType];

export const NOTARIZATION_TYPE_LABELS: Record<NotarizationType, string> = {
  NOTARIZED: "Notarized (Commissioner for Oaths / Notary Public)",
  NOTARIZED_AND_APOSTILLED: "Notarized and apostilled (Hague Convention country)",
  NOTARIZED_AND_LEGALIZED:
    "Notarized and legalized (Ugandan Embassy / Ministry of Foreign Affairs)",
};

/** A shareholder may be a person or an entity (spec §1.3 note). */
export const HolderType = {
  INDIVIDUAL: "INDIVIDUAL",
  ENTITY: "ENTITY",
} as const;
export type HolderType = (typeof HolderType)[keyof typeof HolderType];

export const IdentificationType = {
  PASSPORT: "PASSPORT",
  NATIONAL_ID: "NATIONAL_ID",
} as const;
export type IdentificationType =
  (typeof IdentificationType)[keyof typeof IdentificationType];

export const LandAreaUnit = { ACRES: "ACRES", SQUARE_METRES: "SQUARE_METRES" } as const;
export type LandAreaUnit = (typeof LandAreaUnit)[keyof typeof LandAreaUnit];

export const TargetMarket = {
  DOMESTIC: "DOMESTIC",
  REGIONAL: "REGIONAL",
  EXPORT: "EXPORT",
} as const;
export type TargetMarket = (typeof TargetMarket)[keyof typeof TargetMarket];

export const TARGET_MARKET_LABELS: Record<TargetMarket, string> = {
  DOMESTIC: "Domestic (Uganda)",
  REGIONAL: "Regional (East & Central Africa)",
  EXPORT: "Export (beyond the region)",
};

export const SupplyConfiguration = {
  SINGLE_PHASE: "SINGLE_PHASE",
  THREE_PHASE: "THREE_PHASE",
} as const;
export type SupplyConfiguration =
  (typeof SupplyConfiguration)[keyof typeof SupplyConfiguration];

export const SUPPLY_CONFIGURATION_LABELS: Record<SupplyConfiguration, string> = {
  SINGLE_PHASE: "Single-phase",
  THREE_PHASE: "Three-phase",
};

export const WastewaterCharacter = {
  DOMESTIC: "DOMESTIC",
  INDUSTRIAL: "INDUSTRIAL",
  CHEMICAL: "CHEMICAL",
} as const;
export type WastewaterCharacter =
  (typeof WastewaterCharacter)[keyof typeof WastewaterCharacter];

export const WASTEWATER_CHARACTER_LABELS: Record<WastewaterCharacter, string> = {
  DOMESTIC: "Domestic",
  INDUSTRIAL: "Industrial",
  CHEMICAL: "Chemical",
};

/**
 * Whose safety/employment history is being reported (spec §4.1). A newly formed
 * SPV with no record of its own reports the parent's figures and says so — the
 * alternative is a row of zeros that looks like a flawless record.
 */
export const ReportingEntity = {
  APPLICANT: "APPLICANT",
  PARENT_OR_GROUP: "PARENT_OR_GROUP",
} as const;
export type ReportingEntity =
  (typeof ReportingEntity)[keyof typeof ReportingEntity];

/** Uganda TIN state for an international applicant (spec §1.7). */
export const UgandaTinStatus = {
  REGISTERED: "REGISTERED",
  NOT_YET_REGISTERED: "NOT_YET_REGISTERED",
} as const;
export type UgandaTinStatus =
  (typeof UgandaTinStatus)[keyof typeof UgandaTinStatus];

/* ------------------------------------------------------------------ *
 * Section 1 — Preliminary Information (spec §2)
 * ------------------------------------------------------------------ */

export const shareholderSchema = z
  .object({
    holderType: z.nativeEnum(HolderType),
    /** Person's full name, or the entity's registered name. */
    name: nonEmpty(2, "Shareholder name is required"),
    /** Nationality for a person; country of registration for an entity. */
    nationality: nonEmpty(2, "Nationality / country is required"),
    shareholdingPercent: z
      .number()
      .min(0, "Shareholding cannot be negative")
      .max(100, "Shareholding cannot exceed 100%"),
    /** Individuals only. */
    identificationType: z.nativeEnum(IdentificationType).optional(),
    identificationNumber: z.string().trim().optional(),
    /** Entities only — spec §1.3 explicitly forbids demanding a passport here. */
    registrationNumber: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.holderType === HolderType.INDIVIDUAL) {
      if (!v.identificationType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["identificationType"],
          message: "Select passport or National ID for an individual shareholder",
        });
      }
      if (!v.identificationNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["identificationNumber"],
          message: "Identification number is required for an individual shareholder",
        });
      }
    } else if (!v.registrationNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationNumber"],
        message: "Registration number is required for a corporate shareholder",
      });
    }
  });
export type Shareholder = z.infer<typeof shareholderSchema>;

export const beneficialOwnerSchema = z.object({
  fullName: nonEmpty(2, "Beneficial owner name is required"),
  nationality: nonEmpty(2, "Nationality is required"),
  /** How control is exercised, where it is not simply direct shareholding. */
  natureOfControl: nonEmpty(5, "Describe how this person controls the company"),
});
export type BeneficialOwner = z.infer<typeof beneficialOwnerSchema>;

export const keyPersonnelSchema = z.object({
  fullName: nonEmpty(2, "Name is required"),
  title: nonEmpty(2, "Title is required"),
});
export type KeyPersonnel = z.infer<typeof keyPersonnelSchema>;

export const preliminaryInfoSchema = z
  .object({
    /** Drives the local/international document paths below (spec §1.1). */
    applicantCategory: z.nativeEnum(ApplicantCategory),

    /** 1.1 Legal Status of the Company. */
    legalStatus: z.object({
      companyName: nonEmpty(2, "Company name is required"),
      registrationNumber: nonEmpty(2, "Registration number is required"),
      dateOfIncorporation: dateString,
      countryOfIncorporation: nonEmpty(2, "Country of incorporation is required"),
      legalForm: z.nativeEnum(LegalForm),
      legalFormOther: z.string().trim().optional(),
      /** International applicants only. */
      localPresenceType: z.nativeEnum(LocalPresenceType).optional(),
      localPresenceUrsbNumber: z.string().trim().optional(),
      /** Required when there is no Uganda presence yet (spec §1.1). */
      intendedLocalRegistrationMode: z.string().trim().optional(),
    }),

    /** 1.2 Power of Attorney of the Signatory. */
    powerOfAttorney: z.object({
      grantingCompany: nonEmpty(
        2,
        "Granting company must match the Certificate of Incorporation",
      ),
      representatives: z
        .array(
          z.object({
            fullName: nonEmpty(2, "Representative name is required"),
            position: nonEmpty(2, "Position / title is required"),
          }),
        )
        .min(1, "Name at least one authorized representative"),
      /** Only meaningful with more than one representative. */
      actingMode: z.nativeEnum(ActingMode).optional(),
      scopeOfAuthority: nonEmpty(
        40,
        'State exactly what the representative may do — "to act in all matters" is too vague',
      ),
      effectiveDate: dateString,
      validityPeriod: nonEmpty(
        3,
        'State a fixed period, or "until the conclusion of the KIP land allocation process"',
      ),
      signedByName: nonEmpty(2, "Name of the granting official is required"),
      signedByTitle: nonEmpty(2, "Title of the granting official is required"),
      companySealAffixed: z.boolean(),
      // Notarization is optional for all applicants (Ugandan and international):
      // the fields stay available but are never required. Empty string and
      // absent both pass; a supplied date is still format-checked.
      notarizationType: z.nativeEnum(NotarizationType).or(z.literal("")).optional(),
      notarizedBy: z.string().trim().optional(),
      notarizedOn: dateString.or(z.literal("")).optional(),
    }),

    /** 1.3 Shareholder / Ownership Information. */
    ownership: z.object({
      shareholders: z.array(shareholderSchema).min(1, "List at least one shareholder"),
      /** Optional: only where the UBO differs from the listed shareholders. */
      ultimateBeneficialOwners: z.array(beneficialOwnerSchema).optional(),
    }),

    /** 1.4 Company Administrative / Management Structure. */
    management: z.object({
      keyPersonnel: z
        .array(keyPersonnelSchema)
        .min(1, "List at least one key management officer"),
    }),

    /** 1.5 Company Contact Details. */
    companyContact: z.object({
      postalAddress: nonEmpty(4, "Postal address is required"),
      physicalAddress: nonEmpty(4, "Physical address is required"),
      email: z.string().trim().email("Use a valid company email address"),
      phone: nonEmpty(7, "Include the country code"),
      /** Spec §1.5: only asked when different from the authorized representative. */
      primaryContactSameAsRepresentative: z.boolean(),
      primaryContactName: z.string().trim().optional(),
      primaryContactTitle: z.string().trim().optional(),
      primaryContactPhone: z.string().trim().optional(),
      primaryContactEmail: z
        .union([z.string().trim().email("Use a valid email address"), z.literal("")])
        .optional(),
    }),

    /** 1.6 Letter of Expression of Interest. */
    letterOfInterest: z.object({
      proposedBusinessActivity: nonEmpty(
        20,
        "Summarise the proposed activity, e.g. “establishment of a polypropylene packaging manufacturing plant”",
      ),
    }),

    /** 1.7 Statutory and Tax Compliance. */
    statutoryCompliance: z.object({
      /** Local applicants. */
      ugandaTin: z.string().trim().optional(),
      /** International applicants. */
      homeCountryTaxReference: z.string().trim().optional(),
      ugandaTinStatus: z.nativeEnum(UgandaTinStatus).optional(),
      /** Spec §1.7 accepts a written undertaking in place of a Uganda TIN. */
      undertakingToRegister: z.boolean().optional(),
    }),

    notApplicable: naNotesSchema.optional(),
  })
  .superRefine((v, ctx) => {
    const na = v.notApplicable;

    if (v.legalStatus.legalForm === LegalForm.OTHER && !v.legalStatus.legalFormOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalStatus", "legalFormOther"],
        message: "Describe the legal form",
      });
    }

    if (v.applicantCategory === ApplicantCategory.INTERNATIONAL) {
      if (!v.legalStatus.localPresenceType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legalStatus", "localPresenceType"],
          message: "State whether the company already has a presence in Uganda",
        });
      } else if (v.legalStatus.localPresenceType === LocalPresenceType.NONE) {
        requireUnlessNA(
          ctx,
          na,
          "legalStatus.intendedLocalRegistrationMode",
          v.legalStatus.intendedLocalRegistrationMode,
          "State your intended mode of local registration upon award",
        );
      } else if (!v.legalStatus.localPresenceUrsbNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legalStatus", "localPresenceUrsbNumber"],
          message: "Give the URSB registration number of the Uganda entity",
        });
      }

      requireUnlessNA(
        ctx,
        na,
        "statutoryCompliance.homeCountryTaxReference",
        v.statutoryCompliance.homeCountryTaxReference,
        "Home-country tax reference number is required",
      );
      if (!v.statutoryCompliance.ugandaTinStatus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["statutoryCompliance", "ugandaTinStatus"],
          message: "State whether the company has a Uganda TIN",
        });
      }
      if (
        v.statutoryCompliance.ugandaTinStatus === UgandaTinStatus.NOT_YET_REGISTERED &&
        v.statutoryCompliance.undertakingToRegister !== true
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["statutoryCompliance", "undertakingToRegister"],
          message:
            "Undertake to obtain a Uganda TIN and register with NSSF upon award",
        });
      }
    } else {
      requireUnlessNA(
        ctx,
        na,
        "statutoryCompliance.ugandaTin",
        v.statutoryCompliance.ugandaTin,
        "Uganda Revenue Authority TIN is required",
      );
    }

    // Shareholding should account for the whole company. Tolerance absorbs
    // rounding on holdings like three equal thirds.
    const total = v.ownership.shareholders.reduce(
      (sum, s) => sum + s.shareholdingPercent,
      0,
    );
    if (Math.abs(total - 100) > 0.5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownership", "shareholders"],
        message: `Shareholding totals ${total.toFixed(2)}% — it should add up to 100%`,
      });
    }

    if (v.powerOfAttorney.representatives.length > 1 && !v.powerOfAttorney.actingMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["powerOfAttorney", "actingMode"],
        message:
          "State whether the representatives may act individually or must act jointly",
      });
    }

    if (!v.companyContact.primaryContactSameAsRepresentative) {
      for (const [field, label] of [
        ["primaryContactName", "Primary contact name"],
        ["primaryContactTitle", "Primary contact title"],
        ["primaryContactPhone", "Primary contact phone"],
        ["primaryContactEmail", "Primary contact email"],
      ] as const) {
        if (!v.companyContact[field]?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["companyContact", field],
            message: `${label} is required`,
          });
        }
      }
    }
  });
export type PreliminaryInfo = z.infer<typeof preliminaryInfoSchema>;

/* ------------------------------------------------------------------ *
 * Section 2 — Land Area & Business Profile (spec §3)
 * ------------------------------------------------------------------ */

/**
 * UIA Investment Licence minimums (spec §0). Displayed as guidance next to the
 * capital investment field — guidance, not a hard floor: the licence threshold
 * is UIA's to enforce, not the portal's.
 */
export const UIA_MIN_INVESTMENT_USD: Record<ApplicantCategory, number> = {
  LOCAL: 50_000,
  INTERNATIONAL: 250_000,
};

export const comparableProjectSchema = z.object({
  name: nonEmpty(2, "Project name is required"),
  location: nonEmpty(2, "Project location is required"),
  description: nonEmpty(
    40,
    "Describe the project and its scale — production capacity, throughput, or facility size",
  ),
  capitalInvestmentUsd: z.number().nonnegative("Capital investment cannot be negative"),
  performanceOutcome: nonEmpty(
    30,
    "Give evidence the project operates successfully — current output, client base, or supply relationships",
  ),
});
export type ComparableProject = z.infer<typeof comparableProjectSchema>;

export const landBusinessProfileSchema = z
  .object({
    /** 2.1 Land Area Required. */
    landArea: z.object({
      size: z.number().positive("Land area must be greater than zero"),
      unit: z.nativeEnum(LandAreaUnit),
      /**
       * Interim (while the plot map is hidden): the investor's preferred zone.
       * Optional at the schema level so drafts saved with the map enabled stay
       * valid; the portal marks it required and submissionBlockers enforces it
       * while PLOT_SELECTION_ENABLED is false.
       */
      preferredZone: z.nativeEnum(KipZone).optional(),
      /** Spec §2.1: footprint reasoning, incl. buffer zones and future phases. */
      basisOfEstimate: nonEmpty(
        30,
        "Explain how you arrived at this area — buildings, storage, parking, buffer zones, future phases",
      ),
    }),
    capitalInvestmentUsd: z.number().positive("Capital investment is required"),

    proposedBusiness: z.object({
      description: nonEmpty(
        50,
        "Describe what will be built and operated on the plot",
      ),
      productsOrServices: nonEmpty(10, "List the products or services"),
      scaleOfOperation: nonEmpty(
        10,
        "State the scale, e.g. annual production capacity",
      ),
      targetMarkets: z
        .array(z.nativeEnum(TargetMarket))
        .min(1, "Select at least one target market"),
    }),

    /** 2.2 Evidence of Established Business Operations. */
    establishedOperations: z.object({
      /**
       * Spec §2.2 is explicit that a licence in an unrelated trade class is
       * rejected, so the class is captured as its own field — the committee
       * compares it against the proposed activity rather than opening the PDF.
       */
      tradingLicenceClass: nonEmpty(
        3,
        "State the licence class — it must match the proposed KIP activity",
      ),
      tradingLicenceNumber: nonEmpty(2, "Trading licence number is required"),
      tradingLicenceExpiry: dateString,
      yearsInOperation: z.number().int().nonnegative("Years in operation is required"),
    }),

    /** 2.3 Evidence of Similar or Related Projects Successfully Executed. */
    comparableProjects: z
      .array(comparableProjectSchema)
      .min(1, "Describe at least one comparable project you have executed"),

    notApplicable: naNotesSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.landArea.unit === LandAreaUnit.ACRES && v.landArea.size > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["landArea", "size"],
        message: "That is larger than the park — check the unit and the figure",
      });
    }
  });
export type LandBusinessProfile = z.infer<typeof landBusinessProfileSchema>;

/* ------------------------------------------------------------------ *
 * Section 3 — Utilities & Infrastructure (spec §4)
 * ------------------------------------------------------------------ */

/**
 * Every figure is unit-bound and numeric. Spec §4 rejects answers like
 * "standard supply" outright, and URHC sizes shared services off these numbers.
 * Power is stored in kW so bidders are directly comparable; the form offers an
 * MW entry that converts.
 */
export const utilitiesInfrastructureSchema = z
  .object({
    water: z.object({
      supplyM3PerDay: rate,
      wastewaterM3PerDay: rate,
      wastewaterCharacteristics: z
        .array(z.nativeEnum(WastewaterCharacter))
        .min(1, "Select the expected wastewater characteristics"),
      wastewaterTreatmentPlan: nonEmpty(
        20,
        "Describe your on-site treatment / discharge approach",
      ),
      solidWasteTonnesPerDay: rate,
      solidWasteCategory: nonEmpty(3, "State the waste category"),
      /** Spec §3.1 marks this "if applicable". */
      firefightingReserveM3: z.number().nonnegative().optional(),
    }),

    power: z.object({
      peakDemandKw: z.number().positive("Peak power demand is required"),
      supplyConfiguration: z.nativeEnum(SupplyConfiguration),
      /** Optional: not every applicant plans backup generation. */
      backupGeneratorKva: z.number().nonnegative().optional(),
    }),

    ict: z.object({
      bandwidthMbps: z.number().positive("Bandwidth requirement is required"),
      fibreRequired: z.boolean(),
      specialRequirements: z.string().trim().optional(),
    }),

    notApplicable: naNotesSchema.optional(),
  })
  .superRefine((v, ctx) => {
    requireUnlessNA(
      ctx,
      v.notApplicable,
      "water.firefightingReserveM3",
      v.water.firefightingReserveM3,
      "State the firefighting water reserve required",
    );
  });
export type UtilitiesInfrastructure = z.infer<typeof utilitiesInfrastructureSchema>;

/* ------------------------------------------------------------------ *
 * Section 4 — H3SE (spec §5)
 * ------------------------------------------------------------------ */

/** One calendar year of company-wide safety performance (spec §4.1). */
export const safetyYearSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  /** Recordable injuries per 200,000 hours worked. */
  trir: rate,
  /** Lost-time injuries per million hours worked. */
  ltifr: rate,
  fatalities: count,
  majorEnvironmentalIncidents: count,
  regulatoryPenalties: count,
  /** Required whenever `regulatoryPenalties` is non-zero — enforced below. */
  regulatoryPenaltiesDescription: z.string().trim().optional(),
  lostTimeDays: count,
});
export type SafetyYear = z.infer<typeof safetyYearSchema>;

export const certificationSchema = z.object({
  /** e.g. "ISO 45001 (Occupational H&S)". */
  certification: nonEmpty(3, "Certification name is required"),
  certifyingBody: nonEmpty(2, "Accredited certifying body is required"),
  certificateNumber: nonEmpty(2, "Certificate number is required"),
  issueDate: dateString,
  expiryDate: dateString,
});
export type Certification = z.infer<typeof certificationSchema>;

export const comparableProjectH3seSchema = z.object({
  projectName: nonEmpty(2, "Project name is required"),
  location: nonEmpty(2, "Project location is required"),
  incidentRecord: nonEmpty(15, "Describe the incident record on this project"),
  certificationsApplied: nonEmpty(5, "List the certifications applied"),
  regulatoryFindings: nonEmpty(
    5,
    'State any regulatory findings, or "none" if there were none',
  ),
  verification: nonEmpty(5, "Give a client reference or regulator record"),
});
export type ComparableProjectH3se = z.infer<typeof comparableProjectH3seSchema>;

export const h3seSchema = z
  .object({
    /** 4.1 Historical Safety Performance. */
    safetyPerformance: z.object({
      reportingEntity: z.nativeEnum(ReportingEntity),
      /** Required when reporting a parent's or group's figures (spec §4.1). */
      parentRelationship: z.string().trim().optional(),
      years: z
        .array(safetyYearSchema)
        .length(
          REPORTING_YEARS,
          `Report the ${REPORTING_YEARS} most recently completed calendar years`,
        ),
    }),

    /** 4.2 Certifications Held — current and third-party issued only. */
    certifications: z.array(certificationSchema),

    /** 4.3 Demonstrated H3SE Management System. */
    managementSystem: z.object({
      policy: z.object({
        /**
         * Spec §4.3(i): "a policy dated the same month as this application,
         * with no revision history, will be queried" — hence both dates.
         */
        inForceSince: dateString,
        lastReviewedOn: dateString,
      }),
      organization: z.object({
        functionInPlaceSince: dateString,
        headcount: z.number().int().positive("State the current H3SE headcount"),
      }),
      audits: z.object({
        internalAuditsLast3Years: count,
        externalAuditsLast3Years: count,
        mostRecentAuditDate: dateString,
        mostRecentAuditOutcome: nonEmpty(
          10,
          "Summarise the outcome of the most recent audit",
        ),
      }),
    }),

    /** 4.4 Comparable Project H3SE Track Record — up to three. */
    comparableProjectH3se: z
      .array(comparableProjectH3seSchema)
      .max(3, "List at most three comparable projects"),

    notApplicable: naNotesSchema.optional(),
  })
  .superRefine((v, ctx) => {
    const na = v.notApplicable;

    if (
      v.safetyPerformance.reportingEntity === ReportingEntity.PARENT_OR_GROUP &&
      !v.safetyPerformance.parentRelationship?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["safetyPerformance", "parentRelationship"],
        message: "Identify your relationship to the parent or group being reported",
      });
    }

    v.safetyPerformance.years.forEach((year, i) => {
      if (year.regulatoryPenalties > 0 && !year.regulatoryPenaltiesDescription?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["safetyPerformance", "years", i, "regulatoryPenaltiesDescription"],
          message: "Describe the nature of the penalties recorded for this year",
        });
      }
    });

    // Certifications may genuinely be absent, but silence and "none" read the
    // same to an evaluator, so an empty table needs an explicit explanation.
    requireUnlessNA(
      ctx,
      na,
      "certifications",
      v.certifications,
      "List your current H3SE certifications",
    );

    requireUnlessNA(
      ctx,
      na,
      "comparableProjectH3se",
      v.comparableProjectH3se,
      "Give the H3SE track record of at least one comparable project",
    );

    for (const [i, c] of v.certifications.entries()) {
      if (c.expiryDate < c.issueDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["certifications", i, "expiryDate"],
          message: "Expiry date cannot precede the issue date",
        });
      }
    }

    if (
      v.managementSystem.policy.lastReviewedOn < v.managementSystem.policy.inForceSince
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["managementSystem", "policy", "lastReviewedOn"],
        message: "The review date cannot precede the date the policy came into force",
      });
    }
  });
export type H3se = z.infer<typeof h3seSchema>;

/* ------------------------------------------------------------------ *
 * Section 5 — National Content (spec §6)
 * ------------------------------------------------------------------ */

/**
 * One calendar year of company-wide Ugandan employment (spec §5.1).
 *
 * Totals are captured alongside the Ugandan counts so percentages are DERIVED
 * (see `ugandanEmploymentPercentages`) rather than typed. A self-reported
 * percentage that disagrees with its own counts is exactly the kind of item the
 * committee sends back for clarification.
 */
export const employmentYearSchema = z
  .object({
    year: z.number().int().min(1900).max(2200),
    totalEmployees: count,
    ugandanEmployees: count,
    seniorManagementTotal: count,
    ugandanSeniorManagement: count,
    technicalSkilledTotal: count,
    ugandanTechnicalSkilled: count,
  })
  .superRefine((v, ctx) => {
    const pairs = [
      ["ugandanEmployees", "totalEmployees", "Ugandan employees"],
      ["ugandanSeniorManagement", "seniorManagementTotal", "Ugandan senior management"],
      ["ugandanTechnicalSkilled", "technicalSkilledTotal", "Ugandan technical/skilled staff"],
    ] as const;
    for (const [part, whole, label] of pairs) {
      if (v[part] > v[whole]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [part],
          message: `${label} cannot exceed the total`,
        });
      }
    }
  });
export type EmploymentYear = z.infer<typeof employmentYearSchema>;

/** Derived percentages for the cross-applicant comparison view. */
export function ugandanEmploymentPercentages(year: EmploymentYear): {
  overall: number;
  seniorManagement: number;
  technicalSkilled: number;
} {
  const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
  return {
    overall: pct(year.ugandanEmployees, year.totalEmployees),
    seniorManagement: pct(year.ugandanSeniorManagement, year.seniorManagementTotal),
    technicalSkilled: pct(year.ugandanTechnicalSkilled, year.technicalSkilledTotal),
  };
}

/** One calendar year of completed training (spec §5.2). */
export const trainingYearSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  ugandansTrained: count,
  programmesCompleted: count,
  apprenticeshipsCompleted: count,
});
export type TrainingYear = z.infer<typeof trainingYearSchema>;

export const nationalContentSchema = z
  .object({
    /** 5.1 Historical Ugandan Employment. */
    employment: z.object({
      reportingEntity: z.nativeEnum(ReportingEntity),
      parentRelationship: z.string().trim().optional(),
      years: z
        .array(employmentYearSchema)
        .length(
          REPORTING_YEARS,
          `Report the ${REPORTING_YEARS} most recently completed calendar years`,
        ),
      /** Not applicable to an international applicant with no Uganda staff. */
      nssfConsecutiveMonths: z.number().int().nonnegative().optional(),
      nssfAsOfDate: z.string().trim().optional(),
    }),

    /**
     * 5.2 Training Actually Delivered. Completed training only — spec §5.2 is
     * explicit that planned or in-design programmes belong to the RFP stage.
     */
    training: z.object({
      years: z
        .array(trainingYearSchema)
        .length(
          REPORTING_YEARS,
          `Report the ${REPORTING_YEARS} most recently completed calendar years`,
        ),
    }),

    /** 5.3 Local Procurement Record. */
    localProcurement: z.object({
      localSupplierSpendPercent: z.number().min(0).max(100).optional(),
      financialYear: z.string().trim().optional(),
    }),

    notApplicable: naNotesSchema.optional(),
  })
  .superRefine((v, ctx) => {
    const na = v.notApplicable;

    if (
      v.employment.reportingEntity === ReportingEntity.PARENT_OR_GROUP &&
      !v.employment.parentRelationship?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["employment", "parentRelationship"],
        message: "Identify your relationship to the parent or group being reported",
      });
    }

    requireUnlessNA(
      ctx,
      na,
      "employment.nssfConsecutiveMonths",
      v.employment.nssfConsecutiveMonths,
      "State the months of consecutive NSSF remittance",
    );
    if (v.employment.nssfConsecutiveMonths != null) {
      requireUnlessNA(
        ctx,
        na,
        "employment.nssfAsOfDate",
        v.employment.nssfAsOfDate,
        "State the as-of date for the NSSF remittance figure",
      );
    }

    requireUnlessNA(
      ctx,
      na,
      "localProcurement.localSupplierSpendPercent",
      v.localProcurement.localSupplierSpendPercent,
      "State the percentage of procurement sourced from Uganda-registered suppliers",
    );
    if (v.localProcurement.localSupplierSpendPercent != null) {
      requireUnlessNA(
        ctx,
        na,
        "localProcurement.financialYear",
        v.localProcurement.financialYear,
        "State the financial year the figure covers",
      );
    }
  });
export type NationalContent = z.infer<typeof nationalContentSchema>;

/* ------------------------------------------------------------------ *
 * Section 6 — Declaration (spec §7)
 * ------------------------------------------------------------------ */

/** Shown verbatim to the investor for acknowledgement (spec §7). */
export const DECLARATION_TEXT =
  "I, the undersigned, do hereby certify that the information provided in this application is true and accurate to the best of my knowledge.";

export const declarationSchema = z.object({
  /**
   * Must match the individual named in the Power of Attorney (spec §7). That is
   * a cross-SECTION check, so it lives in `crossSectionIssues()` below rather
   * than here — this schema only sees its own payload.
   */
  signatoryName: nonEmpty(2, "Name of the authorized signatory is required"),
  signatoryTitle: nonEmpty(2, "Position / title is required"),
  signedOn: dateString,
  declarationAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the declaration to submit" }),
  }),
  /** Set when the checkbox is ticked; the audit trail for the acceptance. */
  acceptedAt: z.string().datetime(),
  notApplicable: naNotesSchema.optional(),
});
export type Declaration = z.infer<typeof declarationSchema>;

/* ------------------------------------------------------------------ *
 * Section registry
 * ------------------------------------------------------------------ */

/** Map of section -> schema, for dynamic per-section validation. */
export const sectionSchemas = {
  [EoiSection.PRELIMINARY_INFO]: preliminaryInfoSchema,
  [EoiSection.LAND_BUSINESS_PROFILE]: landBusinessProfileSchema,
  [EoiSection.UTILITIES_INFRASTRUCTURE]: utilitiesInfrastructureSchema,
  [EoiSection.H3SE]: h3seSchema,
  [EoiSection.NATIONAL_CONTENT]: nationalContentSchema,
  [EoiSection.DECLARATION]: declarationSchema,
} as const;

/** Wizard order + display labels. Index + 1 is the `/dashboard/eoi/:n` step. */
export const EOI_SECTION_ORDER: readonly EoiSection[] = [
  EoiSection.PRELIMINARY_INFO,
  EoiSection.LAND_BUSINESS_PROFILE,
  EoiSection.UTILITIES_INFRASTRUCTURE,
  EoiSection.H3SE,
  EoiSection.NATIONAL_CONTENT,
  EoiSection.DECLARATION,
] as const;

export const EOI_SECTION_LABELS: Record<EoiSection, string> = {
  [EoiSection.PRELIMINARY_INFO]: "Preliminary Information",
  [EoiSection.LAND_BUSINESS_PROFILE]: "Land Area & Business Profile",
  [EoiSection.UTILITIES_INFRASTRUCTURE]: "Utilities & Infrastructure",
  [EoiSection.H3SE]: "Health, Safety, Security, Social & Environment",
  [EoiSection.NATIONAL_CONTENT]: "National Content",
  [EoiSection.DECLARATION]: "Declaration",
};

/* ------------------------------------------------------------------ *
 * Cross-section consistency (spec §8)
 * ------------------------------------------------------------------ */

export type CrossSectionIssue = {
  section: EoiSection;
  field: string;
  message: string;
};

function normalisedName(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

/**
 * Checks that only make sense across two sections, run at submit time.
 *
 * Spec §8 names the two the committee actually hits: a Power of Attorney
 * naming someone other than the Declaration signatory, and a company name that
 * drifts between the incorporation details and the POA. Both are blocking at
 * submit — §1.2 requires the granting company to match the Certificate of
 * Incorporation "exactly", and §7 requires the signatory to be the individual
 * named in the POA.
 *
 * A POA naming several representatives is legitimate and does NOT trip this:
 * the signatory only has to be one of the named people.
 */
export function crossSectionIssues(
  payloads: Partial<Record<EoiSection, unknown>>,
): CrossSectionIssue[] {
  const issues: CrossSectionIssue[] = [];

  const prelim = payloads[EoiSection.PRELIMINARY_INFO] as PreliminaryInfo | undefined;
  const declaration = payloads[EoiSection.DECLARATION] as Declaration | undefined;

  if (prelim && declaration) {
    const authorized = (prelim.powerOfAttorney?.representatives ?? []).map((r) =>
      normalisedName(r.fullName),
    );
    const signatory = normalisedName(declaration.signatoryName);
    if (authorized.length > 0 && signatory && !authorized.includes(signatory)) {
      issues.push({
        section: EoiSection.DECLARATION,
        field: "signatoryName",
        message: `The declaration is signed by "${declaration.signatoryName}", who is not named in the Power of Attorney (${prelim.powerOfAttorney.representatives
          .map((r) => r.fullName)
          .join(", ")}).`,
      });
    }

    const granting = normalisedName(prelim.powerOfAttorney?.grantingCompany);
    const incorporated = normalisedName(prelim.legalStatus?.companyName);
    if (granting && incorporated && granting !== incorporated) {
      issues.push({
        section: EoiSection.PRELIMINARY_INFO,
        field: "powerOfAttorney.grantingCompany",
        message: `The Power of Attorney is granted by "${prelim.powerOfAttorney.grantingCompany}", which does not match the company name on the Certificate of Incorporation ("${prelim.legalStatus.companyName}").`,
      });
    }
  }

  return issues;
}

/* ------------------------------------------------------------------ *
 * API contracts
 * ------------------------------------------------------------------ */

/**
 * API: create draft application.
 *
 * `lotReference` is optional because the EOI does not allocate a plot — the
 * applicant states the AREA they need (§2.1) and a specific lot is assigned
 * only at the allocation stage. The column is NOT NULL, so the service fills
 * `UNASSIGNED_LOT_REFERENCE` when the caller has no lot in mind.
 */
export const UNASSIGNED_LOT_REFERENCE = "UNASSIGNED";

export const createApplicationSchema = z.object({
  lotReference: z.string().min(1).optional(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

/**
 * API: update one section.
 *
 * `complete: false` is a save-and-resume draft (spec §8) — the payload is
 * stored as-is and the section is left incomplete. `complete: true` runs the
 * full section schema and is what the submit guard counts.
 */
export const updateSectionSchema = z.object({
  section: z.nativeEnum(EoiSection),
  payload: z.record(z.unknown()),
  complete: z.boolean().default(false),
});
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

/* ------------------------------------------------------------------ *
 * Status machine
 * ------------------------------------------------------------------ */

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

/**
 * Statuses an application can no longer be moved OUT of — the committee's final
 * outcomes. An admin stage override (PATCH /applications/:id/status) refuses to
 * touch an application sitting in one of these, so a decision is never silently
 * undone.
 */
export const FINAL_OUTCOME_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.ALLOCATED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.NOT_SHORTLISTED,
];

/** Statuses that presuppose a submitted application, so a reference must exist. */
export const REFERENCED_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_TC_REVIEW,
  ApplicationStatus.TC_CLARIFICATION_REQUESTED,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.NOT_SHORTLISTED,
  ApplicationStatus.LAC_REVIEW,
  ApplicationStatus.LAC_APPROVED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.EXCO_REVIEW,
  ApplicationStatus.ALLOCATED,
];

/** Admin stage-override request body. */
export const adminOverrideStatusSchema = z.object({
  status: z.enum(
    Object.values(ApplicationStatus) as [ApplicationStatus, ...ApplicationStatus[]],
  ),
  notes: z.string().trim().max(1000).optional(),
});
export type AdminOverrideStatusInput = z.infer<typeof adminOverrideStatusSchema>;

// ─── Joint-venture partners ──────────────────────────────────────────────────
//
// A JV application is several companies applying together. Each co-venturer is
// captured with the same company/business fields as the primary applicant. The
// list is saved whole (replace-all) via PUT /applications/:id/partners.

export const partnerCompanySchema = z.object({
  id: z.string().uuid().optional(), // set when editing an existing partner row
  legalName: z.string().trim().min(1, "Legal name is required"),
  tradingName: z.string().trim().optional().nullable(),
  registrationNumber: z.string().trim().optional().nullable(),
  ursbRegistrationNumber: z.string().trim().optional().nullable(),
  companyType: z.string().trim().optional().nullable(),
  businessSector: z.string().trim().optional().nullable(),
  countryOfIncorporation: z.string().trim().optional().nullable(),
  tin: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  isLead: z.boolean().optional(),
});
export type PartnerCompanyInput = z.infer<typeof partnerCompanySchema>;

export const savePartnersSchema = z.object({
  partners: z.array(partnerCompanySchema).max(10),
});
export type SavePartnersInput = z.infer<typeof savePartnersSchema>;

/** Set the plot an application is for. */
export const setApplicationPlotSchema = z.object({
  plotId: z.string().uuid(),
});
export type SetApplicationPlotInput = z.infer<typeof setApplicationPlotSchema>;

/** Set the full set of plots an application is for (replace-all). */
export const setApplicationPlotsSchema = z.object({
  plotIds: z.array(z.string().uuid()).max(50),
});
export type SetApplicationPlotsInput = z.infer<typeof setApplicationPlotsSchema>;
