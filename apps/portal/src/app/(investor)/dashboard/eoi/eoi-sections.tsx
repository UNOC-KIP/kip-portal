"use client";

import {
  ActingMode,
  APPLICANT_CATEGORY_LABELS,
  ApplicantCategory,
  DECLARATION_TEXT,
  HolderType,
  IdentificationType,
  INVESTABLE_ZONES,
  LandAreaUnit,
  LEGAL_FORM_LABELS,
  LOCAL_PRESENCE_TYPE_LABELS,
  LocalPresenceType,
  NOTARIZATION_TYPE_LABELS,
  PLOT_SELECTION_ENABLED,
  ReportingEntity,
  SUPPLY_CONFIGURATION_LABELS,
  TARGET_MARKET_LABELS,
  UgandaTinStatus,
  UIA_MIN_INVESTMENT_USD,
  WASTEWATER_CHARACTER_LABELS,
} from "@kip/shared";
import { getIn } from "@/lib/form-path";
import {
  CheckboxField,
  CheckboxGroupField,
  Clause,
  DateField,
  FieldRow,
  NumberField,
  Repeatable,
  SelectField,
  TextAreaField,
  TextField,
  useEoiForm,
  YearRows,
} from "./eoi-fields";

/**
 * The six EOI sections, transcribed from the UNOC Master Content Specification.
 *
 * Each `Clause` carries the spec's own numbering and descriptor text. Spec §0
 * asks for the descriptors to sit against the fields themselves — the whole
 * point is that investors answer completely first time rather than being sent a
 * Request for Clarification.
 */

function optionsFrom(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

/* ------------------------------------------------------------------ *
 * Section 1 — Preliminary Information
 * ------------------------------------------------------------------ */

export function SectionPreliminaryInfo() {
  const { value } = useEoiForm();
  const category = getIn(value, "applicantCategory") as ApplicantCategory | undefined;
  const isInternational = category === ApplicantCategory.INTERNATIONAL;
  const presence = getIn(value, "legalStatus.localPresenceType");
  const legalForm = getIn(value, "legalStatus.legalForm");
  const repCount = (getIn(value, "powerOfAttorney.representatives") as unknown[] | undefined)
    ?.length;
  const contactSame = getIn(value, "companyContact.primaryContactSameAsRepresentative");
  const tinStatus = getIn(value, "statutoryCompliance.ugandaTinStatus");

  return (
    <div className="space-y-4">
      <Clause
        number="1.1"
        title="Legal Status of the Company"
        intro="Certificate of Incorporation/Registration and governing documents. Local and international applicants follow slightly different documentation paths."
      >
        <SelectField
          path="applicantCategory"
          label="Applicant category"
          hint="This determines which supporting documents apply to you."
          required
          options={optionsFrom(APPLICANT_CATEGORY_LABELS)}
        />
        <TextField
          path="legalStatus.companyName"
          label="Company name"
          hint="Exactly as it appears on the Certificate of Incorporation. International applicants: the name as registered in your home country."
          required
        />
        <FieldRow>
          <TextField
            path="legalStatus.registrationNumber"
            label="Company registration number"
            hint={
              isInternational
                ? "As issued by the registrar in your country of incorporation."
                : "As issued by the Uganda Registration Services Bureau (URSB)."
            }
            required
          />
          <DateField
            path="legalStatus.dateOfIncorporation"
            label="Date of incorporation"
            required
          />
        </FieldRow>
        <FieldRow>
          <TextField
            path="legalStatus.countryOfIncorporation"
            label="Country of incorporation"
            required
          />
          <SelectField
            path="legalStatus.legalForm"
            label="Legal form"
            hint="As stated in the incorporation documents."
            required
            options={optionsFrom(LEGAL_FORM_LABELS)}
          />
        </FieldRow>
        {legalForm === "OTHER" && (
          <TextField
            path="legalStatus.legalFormOther"
            label="Describe the legal form"
            required
          />
        )}

        {isInternational && (
          <>
            <SelectField
              path="legalStatus.localPresenceType"
              label="Local presence in Uganda"
              hint="Whether the company already has a registered branch, subsidiary or liaison office in Uganda."
              required
              options={optionsFrom(LOCAL_PRESENCE_TYPE_LABELS)}
            />
            {presence === LocalPresenceType.NONE ? (
              <TextAreaField
                path="legalStatus.intendedLocalRegistrationMode"
                label="Intended mode of local registration upon award"
                hint="How you would establish a Ugandan legal presence if land is allocated to you."
                required
                allowNa
                rows={2}
              />
            ) : presence ? (
              <TextField
                path="legalStatus.localPresenceUrsbNumber"
                label="URSB registration number of the Uganda entity"
                required
              />
            ) : null}
          </>
        )}
      </Clause>

      <Clause
        number="1.2"
        title="Power of Attorney of the Signatory"
        intro="Proves that the person signing this EOI is legally authorized to do so. Evaluation history shows this is the item most often submitted incompletely — a signed letter alone is not sufficient. For government-linked applicants, a Board Delegation of Authority naming a specific officer serves the same purpose."
      >
        <TextField
          path="powerOfAttorney.grantingCompany"
          label="Granting company"
          hint="Full legal name of the company issuing the authorization. It must match the Certificate of Incorporation exactly."
          required
        />
        <Repeatable
          path="powerOfAttorney.representatives"
          label="Authorized representative(s)"
          hint="The individual(s) authorized to act on the company's behalf."
          itemNoun="Representative"
          min={1}
          newItem={() => ({ fullName: "", position: "" })}
        >
          {(item) => (
            <FieldRow>
              <TextField path={`${item}.fullName`} label="Full name" required />
              <TextField
                path={`${item}.position`}
                label="Position / title"
                hint="e.g. Managing Director, Country Manager, Legal Counsel."
                required
              />
            </FieldRow>
          )}
        </Repeatable>
        {(repCount ?? 0) > 1 && (
          <SelectField
            path="powerOfAttorney.actingMode"
            label="May the representatives act individually or must they act jointly?"
            required
            options={[
              { value: ActingMode.INDIVIDUALLY, label: "Individually" },
              { value: ActingMode.JOINTLY, label: "Jointly" },
            ]}
          />
        )}
        <TextAreaField
          path="powerOfAttorney.scopeOfAuthority"
          label="Scope of authority"
          hint={`A clear statement of what the representative may do — e.g. "to sign, submit, and negotiate on behalf of [Company] all documents relating to the Expression of Interest for land allocation at the Kabalega Petro-Based Industrial Park." Avoid vague wording such as "to act for the company in all matters."`}
          required
          rows={3}
        />
        <FieldRow>
          <DateField
            path="powerOfAttorney.effectiveDate"
            label="Effective date"
            required
          />
          <TextField
            path="powerOfAttorney.validityPeriod"
            label="Expiry / validity period"
            hint='A fixed period, or "until the conclusion of the KIP land allocation process".'
            required
          />
        </FieldRow>
        <FieldRow>
          <TextField
            path="powerOfAttorney.signedByName"
            label="Granted by (name)"
            hint="Typically the Board Chairperson, Managing Director, or Company Secretary."
            required
          />
          <TextField
            path="powerOfAttorney.signedByTitle"
            label="Granted by (title)"
            required
          />
        </FieldRow>
        <FieldRow>
          <SelectField
            path="powerOfAttorney.notarizationType"
            label="Notarization / legalization (optional)"
            hint="Optional for all applicants. If your document is notarized (and, for some countries, apostilled or legalized), record it here."
            options={optionsFrom(NOTARIZATION_TYPE_LABELS)}
          />
          <DateField
            path="powerOfAttorney.notarizedOn"
            label="Date notarized (optional)"
          />
        </FieldRow>
        <TextField
          path="powerOfAttorney.notarizedBy"
          label="Notarized by (optional)"
          hint="Name of the Commissioner for Oaths or Notary Public, if notarized."
        />
        <CheckboxField
          path="powerOfAttorney.companySealAffixed"
          label="The company seal or stamp is affixed where required under the laws of the country of incorporation."
        />
      </Clause>

      <Clause
        number="1.3"
        title="Shareholder / Ownership Information"
        intro="Confirms who owns and ultimately controls the applicant company, so URHC can verify beneficial ownership ahead of land allocation. Corporate and institutional shareholders are identified by registration details — no passport is required for them."
      >
        <Repeatable
          path="ownership.shareholders"
          label="Shareholders"
          hint="Every shareholder, individual and corporate. Shareholdings should add up to 100%."
          itemNoun="Shareholder"
          min={1}
          newItem={() => ({ holderType: HolderType.INDIVIDUAL })}
        >
          {(item) => <ShareholderFields itemPath={item} />}
        </Repeatable>
        <Repeatable
          path="ownership.ultimateBeneficialOwners"
          label="Ultimate beneficial owner(s)"
          hint="The individual(s) who ultimately own or control the company, where different from the shareholders listed above. Leave empty if the shareholders above are the ultimate owners."
          itemNoun="Beneficial owner"
          newItem={() => ({ fullName: "", nationality: "", natureOfControl: "" })}
        >
          {(item) => (
            <>
              <FieldRow>
                <TextField path={`${item}.fullName`} label="Full name" required />
                <TextField path={`${item}.nationality`} label="Nationality" required />
              </FieldRow>
              <TextAreaField
                path={`${item}.natureOfControl`}
                label="Nature of control"
                hint="How this person ultimately owns or controls the company."
                required
                rows={2}
              />
            </>
          )}
        </Repeatable>
      </Clause>

      <Clause
        number="1.4"
        title="Company Administrative / Management Structure"
        intro="Shows how the company is organized and who the key decision-makers are — used to assess your institutional capacity to deliver the proposed project."
      >
        <Repeatable
          path="management.keyPersonnel"
          label="Key management personnel"
          hint="e.g. Managing Director, Chief Financial Officer, Head of Operations."
          itemNoun="Officer"
          min={1}
          newItem={() => ({ fullName: "", title: "" })}
        >
          {(item) => (
            <FieldRow>
              <TextField path={`${item}.fullName`} label="Full name" required />
              <TextField path={`${item}.title`} label="Title" required />
            </FieldRow>
          )}
        </Repeatable>
      </Clause>

      <Clause
        number="1.5"
        title="Company Contact Details"
        intro="So UNOC can direct all communication on this application to the correct company channels."
      >
        <TextAreaField
          path="companyContact.postalAddress"
          label="Company postal address"
          required
          rows={2}
        />
        <TextAreaField
          path="companyContact.physicalAddress"
          label="Company physical address"
          required
          rows={2}
        />
        <FieldRow>
          <TextField
            path="companyContact.email"
            label="Company email address"
            hint="An official company address, not a personal one."
            required
          />
          <TextField
            path="companyContact.phone"
            label="Company phone number"
            hint="Include the country code."
            required
          />
        </FieldRow>
        <CheckboxField
          path="companyContact.primaryContactSameAsRepresentative"
          label="The primary contact for this application is the Authorized Representative named in 1.2."
        />
        {contactSame === false && (
          <>
            <FieldRow>
              <TextField
                path="companyContact.primaryContactName"
                label="Primary contact name"
                required
              />
              <TextField
                path="companyContact.primaryContactTitle"
                label="Primary contact title"
                required
              />
            </FieldRow>
            <FieldRow>
              <TextField
                path="companyContact.primaryContactPhone"
                label="Primary contact phone"
                required
              />
              <TextField
                path="companyContact.primaryContactEmail"
                label="Primary contact email"
                required
              />
            </FieldRow>
          </>
        )}
      </Clause>

      <Clause
        number="1.6"
        title="Letter of Expression of Interest"
        intro="The formal cover letter confirming your interest and proposed business activity, signed by the Authorized Representative and addressed to the Chief Executive Officer, Uganda National Oil Company Limited."
      >
        <TextAreaField
          path="letterOfInterest.proposedBusinessActivity"
          label="Proposed business activity (summary)"
          hint={`A short statement in your own words of the industry or activity proposed for the KIP plot — e.g. "establishment of a polypropylene packaging manufacturing plant".`}
          required
          rows={3}
        />
      </Clause>

      <Clause
        number="1.7"
        title="Statutory and Tax Compliance"
        intro="Confirms the company is in good standing with the relevant tax and social security authorities."
      >
        {isInternational ? (
          <>
            <TextField
              path="statutoryCompliance.homeCountryTaxReference"
              label="Home-country tax reference number"
              hint="Your company's tax identification number in its country of incorporation."
              required
              allowNa
            />
            <SelectField
              path="statutoryCompliance.ugandaTinStatus"
              label="Uganda TIN status"
              required
              options={[
                { value: UgandaTinStatus.REGISTERED, label: "Registered" },
                { value: UgandaTinStatus.NOT_YET_REGISTERED, label: "Not yet registered" },
              ]}
            />
            {tinStatus === UgandaTinStatus.NOT_YET_REGISTERED && (
              <CheckboxField
                path="statutoryCompliance.undertakingToRegister"
                label="We undertake to obtain a Uganda TIN and register with NSSF upon award."
                hint="A written undertaking is acceptable at the EOI stage in place of a Uganda TIN."
              />
            )}
          </>
        ) : (
          <TextField
            path="statutoryCompliance.ugandaTin"
            label="Tax Identification Number (TIN)"
            hint="As issued by the Uganda Revenue Authority."
            required
            allowNa
          />
        )}
      </Clause>
    </div>
  );
}

/** Shareholder row — the ID fields depend on whether it is a person or a company. */
function ShareholderFields({ itemPath }: { itemPath: string }) {
  const { value } = useEoiForm();
  const holderType = getIn(value, `${itemPath}.holderType`);
  const isEntity = holderType === HolderType.ENTITY;

  return (
    <>
      <FieldRow>
        <SelectField
          path={`${itemPath}.holderType`}
          label="Shareholder type"
          required
          options={[
            { value: HolderType.INDIVIDUAL, label: "Individual" },
            { value: HolderType.ENTITY, label: "Company / institution" },
          ]}
        />
        <NumberField
          path={`${itemPath}.shareholdingPercent`}
          label="Shareholding"
          suffix="%"
          step={0.01}
          min={0}
          max={100}
          required
        />
      </FieldRow>
      <FieldRow>
        <TextField
          path={`${itemPath}.name`}
          label={isEntity ? "Registered name" : "Full name"}
          required
        />
        <TextField
          path={`${itemPath}.nationality`}
          label={isEntity ? "Country of registration" : "Nationality"}
          required
        />
      </FieldRow>
      {isEntity ? (
        <TextField
          path={`${itemPath}.registrationNumber`}
          label="Registration number"
          hint="The corporate shareholder's registration number — no passport or ID is required."
          required
        />
      ) : (
        <FieldRow>
          <SelectField
            path={`${itemPath}.identificationType`}
            label="Identification type"
            required
            options={[
              { value: IdentificationType.PASSPORT, label: "Passport" },
              { value: IdentificationType.NATIONAL_ID, label: "National ID" },
            ]}
          />
          <TextField
            path={`${itemPath}.identificationNumber`}
            label="Identification number"
            required
          />
        </FieldRow>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Section 2 — Land Area & Business Profile
 * ------------------------------------------------------------------ */

/**
 * `applicantCategory` is read from Section 1 and passed in, because the UIA
 * licence threshold shown against the capital investment field depends on it
 * and it does not belong in this section's own payload.
 */
export function SectionLandBusinessProfile({
  applicantCategory,
}: {
  applicantCategory: ApplicantCategory | undefined;
}) {
  const threshold =
    UIA_MIN_INVESTMENT_USD[applicantCategory ?? ApplicantCategory.LOCAL];

  return (
    <div className="space-y-4">
      <Clause
        number="2.1"
        title="Land Area Required"
        intro="Establishes what you propose to build and how much land it requires."
      >
        {!PLOT_SELECTION_ENABLED && (
          <>
            <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3.5 py-3 text-sm text-ink-700">
              Choosing plots on the interactive map is temporarily unavailable
              while we update it. For now, select your preferred zone and enter
              the land size you require — our team will confirm specific plots
              with you, and we&apos;ll let you know when the map is back.
            </div>
            <SelectField
              path="landArea.preferredZone"
              label="Preferred zone"
              required
              options={INVESTABLE_ZONES.map((z) => ({
                value: z.key,
                label: z.label,
              }))}
            />
          </>
        )}
        <FieldRow>
          <NumberField
            path="landArea.size"
            label="Exact size of land required"
            step={0.01}
            min={0}
            required
          />
          <SelectField
            path="landArea.unit"
            label="Unit"
            required
            options={[
              { value: LandAreaUnit.ACRES, label: "Acres" },
              { value: LandAreaUnit.SQUARE_METRES, label: "Square metres" },
            ]}
          />
        </FieldRow>
        <TextAreaField
          path="landArea.basisOfEstimate"
          label="Basis of the estimate"
          hint="Base this on your facility footprint, including buildings, storage, parking, buffer zones, and any planned future expansion phases."
          required
          rows={3}
        />
        <NumberField
          path="capitalInvestmentUsd"
          label="Capital investment (USD)"
          hint={`Minimum investment thresholds for a Uganda Investment Authority (UIA) Investment Licence are USD 50,000 for local investors and USD 250,000 for foreign investors. For your applicant category that is USD ${threshold.toLocaleString()}. These thresholds may influence the scale of land considered for allocation.`}
          step={1000}
          min={0}
          required
        />
        <TextAreaField
          path="proposedBusiness.description"
          label="Proposed business / industry description"
          hint="A structured description of what will be built and operated on the plot."
          required
          rows={4}
        />
        <FieldRow>
          <TextField
            path="proposedBusiness.productsOrServices"
            label="Products or services"
            required
          />
          <TextField
            path="proposedBusiness.scaleOfOperation"
            label="Scale of operation"
            hint="e.g. annual production capacity or throughput."
            required
          />
        </FieldRow>
        <CheckboxGroupField
          path="proposedBusiness.targetMarkets"
          label="Target market"
          required
          options={optionsFrom(TARGET_MARKET_LABELS)}
        />
      </Clause>

      <Clause
        number="2.2"
        title="Evidence of Established Business Operations"
        intro="Proves the applicant is an operating business, not a shell company, and is licensed to trade."
      >
        <TextField
          path="establishedOperations.tradingLicenceClass"
          label="Trading licence class"
          hint="A licence for an unrelated trade class (e.g. general wholesale) will not be accepted as evidence for a specialized industrial activity — the class must match the KIP activity you propose."
          required
        />
        <FieldRow>
          <TextField
            path="establishedOperations.tradingLicenceNumber"
            label="Trading licence number"
            required
          />
          <DateField
            path="establishedOperations.tradingLicenceExpiry"
            label="Licence expiry date"
            required
          />
        </FieldRow>
        <NumberField
          path="establishedOperations.yearsInOperation"
          label="Years in operation"
          hint="How long the company has been actively trading."
          suffix="years"
          min={0}
          required
        />
      </Clause>

      <Clause
        number="2.3"
        title="Evidence of Similar or Related Projects Successfully Executed"
        intro="The single most commonly under-documented item in past submissions. A general statement of experience is not sufficient — the Committee looks for verifiable, specific evidence that scales with the risk profile of the activity you propose. Experience in an unrelated field (e.g. construction, for a chemical plant proposal) may be found insufficient even if extensive."
      >
        <Repeatable
          path="comparableProjects"
          label="Comparable projects"
          itemNoun="Project"
          min={1}
          newItem={() => ({ name: "", location: "", description: "", performanceOutcome: "" })}
        >
          {(item) => (
            <>
              <FieldRow>
                <TextField path={`${item}.name`} label="Project name" required />
                <TextField path={`${item}.location`} label="Location" required />
              </FieldRow>
              <TextAreaField
                path={`${item}.description`}
                label="Description and scale"
                hint="Including production capacity, throughput, or facility size."
                required
                rows={3}
              />
              <NumberField
                path={`${item}.capitalInvestmentUsd`}
                label="Capital invested (USD)"
                step={1000}
                min={0}
                required
              />
              <TextAreaField
                path={`${item}.performanceOutcome`}
                label="Performance / outcome"
                hint="Evidence the project is operating successfully — current output, client base, or supply relationships established."
                required
                rows={3}
              />
            </>
          )}
        </Repeatable>
      </Clause>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section 3 — Utilities & Infrastructure
 * ------------------------------------------------------------------ */

export function SectionUtilities() {
  return (
    <div className="space-y-4">
      <Clause
        number="3.1"
        title="Water Supply and Wastewater Management"
        intro={`Quantified demand, so URHC and its infrastructure partners can plan shared services capacity across KIP. Vague answers such as "standard supply" are not sufficient. Example from past submissions: "Water supply: 100 m³/day, plus 1,800 m³ reserved for firefighting."`}
      >
        <FieldRow>
          <NumberField
            path="water.supplyM3PerDay"
            label="Water supply requirement"
            suffix="m³/day"
            step={0.1}
            min={0}
            required
          />
          <NumberField
            path="water.wastewaterM3PerDay"
            label="Wastewater generation"
            suffix="m³/day"
            step={0.1}
            min={0}
            required
          />
        </FieldRow>
        <CheckboxGroupField
          path="water.wastewaterCharacteristics"
          label="Expected wastewater characteristics"
          required
          options={optionsFrom(WASTEWATER_CHARACTER_LABELS)}
        />
        <TextAreaField
          path="water.wastewaterTreatmentPlan"
          label="Wastewater management approach"
          hint="Your on-site treatment or discharge approach."
          required
          rows={3}
        />
        <FieldRow>
          <NumberField
            path="water.solidWasteTonnesPerDay"
            label="Solid waste generation"
            suffix="t/day"
            step={0.1}
            min={0}
            required
          />
          <TextField
            path="water.solidWasteCategory"
            label="Waste category"
            required
          />
        </FieldRow>
        <NumberField
          path="water.firefightingReserveM3"
          label="Firefighting water reserve"
          hint="Additional water volume required for fire suppression systems."
          suffix="m³"
          step={1}
          min={0}
          required
          allowNa
        />
      </Clause>

      <Clause
        number="3.2"
        title="Power Supply Requirements"
        intro={`Example from past submissions: "Three-phase supply; backup generator 1,000 kVA; daily peak demand 664 kW."`}
      >
        <NumberField
          path="power.peakDemandKw"
          label="Peak power demand"
          hint="State in kilowatts. 1 MW = 1,000 kW — so a 12 MW requirement is entered as 12000."
          suffix="kW"
          step={1}
          min={0}
          required
        />
        <FieldRow>
          <SelectField
            path="power.supplyConfiguration"
            label="Supply configuration"
            required
            options={optionsFrom(SUPPLY_CONFIGURATION_LABELS)}
          />
          <NumberField
            path="power.backupGeneratorKva"
            label="Backup generation capacity"
            hint="Leave blank if no backup generation is planned."
            suffix="kVA"
            step={1}
            min={0}
          />
        </FieldRow>
      </Clause>

      <Clause
        number="3.3"
        title="ICT and Telecommunications Connectivity"
        intro={`Example from past submissions: "200 Mbps stable broadband for operations and ERP systems; fibre-optic connectivity; ICT infrastructure for CCTV."`}
      >
        <NumberField
          path="ict.bandwidthMbps"
          label="Bandwidth requirement"
          suffix="Mbps"
          step={1}
          min={0}
          required
        />
        <CheckboxField
          path="ict.fibreRequired"
          label="Fibre-optic connectivity is required."
        />
        <TextAreaField
          path="ict.specialRequirements"
          label="Special ICT infrastructure needs"
          hint="e.g. dedicated lines for ERP systems, CCTV/security infrastructure, or redundant/failover connections."
          rows={3}
        />
      </Clause>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section 4 — H3SE
 * ------------------------------------------------------------------ */

export function SectionH3se() {
  const { value } = useEoiForm();
  const entity = getIn(value, "safetyPerformance.reportingEntity");

  return (
    <div className="space-y-4">
      <Clause
        number="4.1"
        title="Historical Safety Performance"
        intro="Company-wide figures for the last three completed calendar years. These structured figures are what the Committee compares bidders on directly — attachments verify them, they do not replace them. If you are a newly formed special-purpose entity with no independent history, report the parent company's or group's figures and identify the relationship."
      >
        <SelectField
          path="safetyPerformance.reportingEntity"
          label="Whose figures are these?"
          required
          options={[
            { value: ReportingEntity.APPLICANT, label: "The applicant company" },
            { value: ReportingEntity.PARENT_OR_GROUP, label: "Parent company or group" },
          ]}
        />
        {entity === ReportingEntity.PARENT_OR_GROUP && (
          <TextField
            path="safetyPerformance.parentRelationship"
            label="Relationship to the entity reported"
            hint="e.g. “wholly owned subsidiary of X Holdings Ltd”."
            required
          />
        )}
        <YearRows
          path="safetyPerformance.years"
          label="Safety performance by year"
          hint="Enter 0 where there were none — a blank cell reads as unanswered."
        >
          {(item) => (
            <>
              <FieldRow>
                <NumberField
                  path={`${item}.trir`}
                  label="TRIR"
                  hint="Total Recordable Incident Rate — recordable injuries per 200,000 hours worked, company-wide."
                  step={0.01}
                  min={0}
                  required
                />
                <NumberField
                  path={`${item}.ltifr`}
                  label="LTIFR"
                  hint="Lost Time Injury Frequency Rate — lost-time injuries per million hours worked."
                  step={0.01}
                  min={0}
                  required
                />
              </FieldRow>
              <FieldRow>
                <NumberField
                  path={`${item}.fatalities`}
                  label="Work-related fatalities"
                  min={0}
                  required
                />
                <NumberField
                  path={`${item}.lostTimeDays`}
                  label="Lost time days"
                  hint="Total workdays lost to injury."
                  min={0}
                  required
                />
              </FieldRow>
              <FieldRow>
                <NumberField
                  path={`${item}.majorEnvironmentalIncidents`}
                  label="Major environmental incidents"
                  hint="Reportable spills, releases, or environmental violations."
                  min={0}
                  required
                />
                <NumberField
                  path={`${item}.regulatoryPenalties`}
                  label="Regulatory penalties / fines"
                  hint="H3SE-related fines or sanctions issued by any regulator."
                  min={0}
                  required
                />
              </FieldRow>
              <TextAreaField
                path={`${item}.regulatoryPenaltiesDescription`}
                label="Nature of the penalties"
                hint="Required if you recorded any penalties for this year."
                rows={2}
              />
            </>
          )}
        </YearRows>
      </Clause>

      <Clause
        number="4.2"
        title="Certifications Held"
        intro="Only currently valid, third-party issued certifications — not certifications in progress or planned."
      >
        <Repeatable
          path="certifications"
          label="Current certifications"
          hint="e.g. ISO 45001 (Occupational H&S), ISO 14001 (Environmental Management), or other sector-specific certification."
          itemNoun="Certification"
          newItem={() => ({ certification: "", certifyingBody: "", certificateNumber: "" })}
        >
          {(item) => (
            <>
              <FieldRow>
                <TextField
                  path={`${item}.certification`}
                  label="Certification"
                  required
                />
                <TextField
                  path={`${item}.certifyingBody`}
                  label="Certifying body"
                  hint="The accredited certification body."
                  required
                />
              </FieldRow>
              <TextField
                path={`${item}.certificateNumber`}
                label="Certificate number"
                required
              />
              <FieldRow>
                <DateField path={`${item}.issueDate`} label="Issue date" required />
                <DateField path={`${item}.expiryDate`} label="Expiry date" required />
              </FieldRow>
            </>
          )}
        </Repeatable>
      </Clause>

      <Clause
        number="4.3"
        title="Demonstrated H3SE Management System"
        intro="Evidence that a system has actually been in operation, not merely documented for this application. All three elements are assessed individually."
      >
        <FieldRow>
          <DateField
            path="managementSystem.policy.inForceSince"
            label="H3SE policy in force since"
            hint="A policy dated the same month as this application, with no revision history, will be queried."
            required
          />
          <DateField
            path="managementSystem.policy.lastReviewedOn"
            label="Most recent policy review"
            required
          />
        </FieldRow>
        <FieldRow>
          <DateField
            path="managementSystem.organization.functionInPlaceSince"
            label="Dedicated H3SE function in place since"
            hint="How long you have maintained a named H3SE manager or department."
            required
          />
          <NumberField
            path="managementSystem.organization.headcount"
            label="Current H3SE headcount"
            min={1}
            required
          />
        </FieldRow>
        <FieldRow>
          <NumberField
            path="managementSystem.audits.internalAuditsLast3Years"
            label="Internal H3SE audits (last 3 years)"
            min={0}
            required
          />
          <NumberField
            path="managementSystem.audits.externalAuditsLast3Years"
            label="External H3SE audits (last 3 years)"
            min={0}
            required
          />
        </FieldRow>
        <DateField
          path="managementSystem.audits.mostRecentAuditDate"
          label="Date of the most recent audit"
          required
        />
        <TextAreaField
          path="managementSystem.audits.mostRecentAuditOutcome"
          label="Outcome of the most recent audit"
          required
          rows={3}
        />
      </Clause>

      <Clause
        number="4.4"
        title="Comparable Project H3SE Track Record"
        intro="Up to three completed or currently operating projects most similar in scale and risk to the KIP activity you propose. The projects you listed in Section 2.3 may be reused here."
      >
        <Repeatable
          path="comparableProjectH3se"
          label="Project H3SE record"
          itemNoun="Project"
          max={3}
          newItem={() => ({ projectName: "", location: "" })}
        >
          {(item) => (
            <>
              <FieldRow>
                <TextField
                  path={`${item}.projectName`}
                  label="Project name"
                  required
                />
                <TextField path={`${item}.location`} label="Location" required />
              </FieldRow>
              <TextAreaField
                path={`${item}.incidentRecord`}
                label="Incident record on this project"
                required
                rows={2}
              />
              <TextAreaField
                path={`${item}.certificationsApplied`}
                label="Certifications applied"
                required
                rows={2}
              />
              <TextAreaField
                path={`${item}.regulatoryFindings`}
                label="Regulatory findings"
                hint='State "none" if there were none.'
                required
                rows={2}
              />
              <TextAreaField
                path={`${item}.verification`}
                label="Verification"
                hint="A client reference or regulator record the Committee can check."
                required
                rows={2}
              />
            </>
          )}
        </Repeatable>
      </Clause>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section 5 — National Content
 * ------------------------------------------------------------------ */

export function SectionNationalContent() {
  const { value } = useEoiForm();
  const entity = getIn(value, "employment.reportingEntity");

  return (
    <div className="space-y-4">
      <Clause
        number="5.1"
        title="Historical Ugandan Employment"
        intro="What you have actually delivered, not what you plan to do. Company-wide figures for the last three completed calendar years, covering the full company structure — not limited to any single department. This table is the primary basis for comparing National Content performance across applicants bidding for the same plot."
      >
        <SelectField
          path="employment.reportingEntity"
          label="Whose figures are these?"
          required
          options={[
            { value: ReportingEntity.APPLICANT, label: "The applicant company" },
            { value: ReportingEntity.PARENT_OR_GROUP, label: "Parent company or group" },
          ]}
        />
        {entity === ReportingEntity.PARENT_OR_GROUP && (
          <TextField
            path="employment.parentRelationship"
            label="Relationship to the entity reported"
            required
          />
        )}
        <YearRows
          path="employment.years"
          label="Employment by year"
          hint="Percentages are calculated from these counts, so you do not need to enter them."
        >
          {(item) => (
            <>
              <FieldRow>
                <NumberField
                  path={`${item}.totalEmployees`}
                  label="Total employees (company-wide)"
                  min={0}
                  required
                />
                <NumberField
                  path={`${item}.ugandanEmployees`}
                  label="of whom Ugandan nationals"
                  min={0}
                  required
                />
              </FieldRow>
              <FieldRow>
                <NumberField
                  path={`${item}.seniorManagementTotal`}
                  label="Senior management roles"
                  min={0}
                  required
                />
                <NumberField
                  path={`${item}.ugandanSeniorManagement`}
                  label="of whom Ugandan"
                  min={0}
                  required
                />
              </FieldRow>
              <FieldRow>
                <NumberField
                  path={`${item}.technicalSkilledTotal`}
                  label="Technical / skilled positions"
                  min={0}
                  required
                />
                <NumberField
                  path={`${item}.ugandanTechnicalSkilled`}
                  label="of whom Ugandan"
                  min={0}
                  required
                />
              </FieldRow>
            </>
          )}
        </YearRows>
        <FieldRow>
          <NumberField
            path="employment.nssfConsecutiveMonths"
            label="Consecutive months of NSSF remittance"
            hint="Verifiable NSSF remittance for Ugandan staff, most recent period."
            suffix="months"
            min={0}
            required
            allowNa
          />
          <DateField
            path="employment.nssfAsOfDate"
            label="NSSF figure as of"
            allowNa
          />
        </FieldRow>
      </Clause>

      <Clause
        number="5.2"
        title="Training Actually Delivered"
        intro="Completed training only. Planned, proposed, or in-design programmes belong to the RFP stage, not the EOI."
      >
        <YearRows path="training.years" label="Training delivered by year">
          {(item) => (
            <>
              <NumberField
                path={`${item}.ugandansTrained`}
                label="Ugandans who completed a formal training / upskilling programme"
                min={0}
                required
              />
              <FieldRow>
                <NumberField
                  path={`${item}.programmesCompleted`}
                  label="Distinct programmes delivered"
                  min={0}
                  required
                />
                <NumberField
                  path={`${item}.apprenticeshipsCompleted`}
                  label="Apprenticeships / internships completed"
                  min={0}
                  required
                />
              </FieldRow>
            </>
          )}
        </YearRows>
      </Clause>

      <Clause
        number="5.3"
        title="Local Procurement Record"
        intro="A standard national-content indicator, captured for comparability across applicants."
      >
        <FieldRow>
          <NumberField
            path="localProcurement.localSupplierSpendPercent"
            label="Local supplier spend"
            hint="Percentage of total procurement value sourced from Uganda-registered suppliers, most recently completed financial year."
            suffix="%"
            step={0.1}
            min={0}
            max={100}
            required
            allowNa
          />
          <TextField
            path="localProcurement.financialYear"
            label="Financial year"
            hint="e.g. 2025 or FY2024/25."
            allowNa
          />
        </FieldRow>
      </Clause>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section 6 — Declaration
 * ------------------------------------------------------------------ */

export function SectionDeclaration() {
  const { value, set, disabled, errors } = useEoiForm();
  const accepted = getIn(value, "declarationAccepted") === true;

  return (
    <div className="space-y-4">
      <Clause
        number="6"
        title="Declaration & Authorized Signature"
        intro="The final, legally binding confirmation that the information submitted is accurate and complete."
      >
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm leading-relaxed text-ink-800">
          {DECLARATION_TEXT}
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={accepted}
            disabled={disabled}
            onChange={(e) => {
              const on = e.target.checked;
              set("declarationAccepted", on);
              // The acceptance timestamp is the audit trail for the tick, so it
              // is stamped here rather than at submit time.
              set("acceptedAt", on ? new Date().toISOString() : undefined);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span className="text-sm text-ink-800">
            I confirm the declaration above.
          </span>
        </label>
        {errors["declarationAccepted"] && (
          <p role="alert" className="pl-7 text-xs font-medium text-red-600">
            {errors["declarationAccepted"]}
          </p>
        )}

        <FieldRow>
          <TextField
            path="signatoryName"
            label="Name of authorized signatory"
            hint="Must match an individual named in the Power of Attorney in Section 1.2."
            required
          />
          <TextField path="signatoryTitle" label="Position / title" required />
        </FieldRow>
        <DateField path="signedOn" label="Date of signing" required />
      </Clause>
    </div>
  );
}
