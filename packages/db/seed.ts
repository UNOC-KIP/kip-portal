/**
 * KIP Portal — database seed (raw SQL via pg, no ORM needed).
 * Idempotent: safe to run multiple times. Uses ON CONFLICT DO NOTHING/UPDATE.
 */
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { sectionSchemas } from '@kip/shared'

const DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://kip:kip_dev_password@localhost:5433/kip_portal?schema=public'

const pool = new Pool({ connectionString: DB_URL })

const PASSWORD  = 'KipPortal2025!'
const WINDOW_ID = '00000000-0000-0000-0000-000000000001'

const IDS = {
  orgGulf: 'org-gulf-petrochem-001',
  orgNile: 'org-nile-energy-001',
  orgFert: 'org-ugfert-001',
  orgSaba: 'org-sabastar-001',
  app1:    'app-gulf-001',
  app2:    'app-fert-001',
  app3:    'app-saba-001',
  app4:    'app-nile-draft-001',
  payGulf: 'pay-gulf-001',
  payFert: 'pay-fert-001',
  paySaba: 'pay-saba-001',
  payNile: 'pay-nile-001',
}

async function q(sql: string, params: unknown[] = []) {
  return pool.query(sql, params)
}

async function upsertUser(
  id: string, email: string, name: string, role: string,
  pwHash: string, orgId?: string,
  rep?: { designation?: string; phone?: string },
) {
  await q(
    `INSERT INTO "User" (id, email, name, role, "passwordHash", "investorOrgId", designation, phone, status, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',now(),now())
     ON CONFLICT (email) DO UPDATE
       SET name=$3, role=$4, "passwordHash"=$5, "investorOrgId"=$6, designation=$7, phone=$8, status='ACTIVE', "updatedAt"=now()`,
    [id, email, name, role, pwHash, orgId ?? null, rep?.designation ?? null, rep?.phone ?? null],
  )
}

async function upsertOrg(
  id: string, legalName: string, country: string,
  address: string, phone: string, email: string,
  profile?: {
    tin?: string; tradingName?: string; registrationNumber?: string;
    ursbRegistrationNumber?: string; companyType?: string; businessSector?: string;
  },
) {
  await q(
    `INSERT INTO "InvestorOrg"
       (id, "legalName", "countryOfIncorporation", address, phone, email,
        tin, "tradingName", "registrationNumber", "ursbRegistrationNumber", "companyType", "businessSector",
        "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now())
     ON CONFLICT (id) DO NOTHING`,
    [
      id, legalName, country, address, phone, email,
      profile?.tin ?? null, profile?.tradingName ?? null, profile?.registrationNumber ?? null,
      profile?.ursbRegistrationNumber ?? null, profile?.companyType ?? null, profile?.businessSector ?? null,
    ],
  )
}

async function upsertApplication(
  id: string, reference: string | null, lotRef: string, status: string,
  ownerUserId: string, investorOrgId: string, submittedAt?: Date, decisionAt?: Date,
) {
  await q(
    `INSERT INTO "Application"
       (id, reference, "lotReference", status, "ownerUserId", "investorOrgId",
        "submittedAt", "decisionAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())
     ON CONFLICT (id) DO NOTHING`,
    [id, reference, lotRef, status, ownerUserId, investorOrgId, submittedAt ?? null, decisionAt ?? null],
  )
}

/**
 * Writes one section, validating it against the live schema first.
 *
 * The seed is the demo data the console and both portals render, and a payload
 * that has drifted from the schema fails silently — the section still shows as
 * complete while the submit guard rejects it. Failing loudly here is the only
 * thing keeping the two in step.
 */
async function upsertSection(appId: string, section: string, payload: object) {
  const schema = sectionSchemas[section as keyof typeof sectionSchemas]
  if (!schema) throw new Error(`Unknown EOI section in seed data: ${section}`)
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Seed payload for section ${section} is invalid:\n${issues}`)
  }

  await q(
    `INSERT INTO "ApplicationSection"
       (id, "applicationId", section, payload, "completedAt", "updatedAt")
     VALUES ($1,$2,$3,$4,now(),now())
     ON CONFLICT ("applicationId", section) DO UPDATE
       SET payload=$4, "completedAt"=now(), "updatedAt"=now()`,
    [randomUUID(), appId, section, JSON.stringify(payload)],
  )
}

async function upsertPayment(
  id: string, appId: string, method: string, status: string, currency: string,
  amount: string, transferRef: string | null, gatewayRef: string | null,
  paidAt: Date, confirmedAt: Date,
) {
  await q(
    `INSERT INTO "Payment"
       (id, "applicationId", method, status, currency, amount,
        "transferRef", "gatewayRef", "paidAt", "confirmedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
     ON CONFLICT (id) DO NOTHING`,
    [id, appId, method, status, currency, amount, transferRef, gatewayRef, paidAt, confirmedAt],
  )
}

async function upsertReviewAction(
  id: string, appId: string, actorId: string, type: string,
  fromStatus: string | null, toStatus: string | null, notes: string | null, createdAt: Date,
) {
  await q(
    `INSERT INTO "ReviewAction"
       (id, "applicationId", "actorUserId", type, "fromStatus", "toStatus", notes, "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO NOTHING`,
    [id, appId, actorId, type, fromStatus, toStatus, notes, createdAt],
  )
}


// ─── Section payloads ────────────────────────────────────────────────────────
//
// Shaped to the UNOC EOI Master Content Specification (see
// packages/shared/src/schemas/application.ts). The three applicants are
// deliberately different in quality so the review console shows a realistic
// spread: Gulf Petrochem is a strong international bid, Uganda Fertiliser a
// strong local one, and Sabastar the thin submission the Committee did not
// shortlist — its H3SE and National Content rows are exactly the kind of record
// the spec's "Example the Committee found insufficient" describes.
//
// Reporting years are 2023–2025 throughout: the three most recently completed
// calendar years as of the seeded window, matching what the wizard seeds.

const gulfSections: Record<string, object> = {
  PRELIMINARY_INFO: {
    applicantCategory: 'INTERNATIONAL',
    legalStatus: {
      companyName: 'Gulf Petrochem International FZE',
      registrationNumber: 'JAFZA-FZE-2001-0044',
      dateOfIncorporation: '2001-03-19',
      countryOfIncorporation: 'United Arab Emirates',
      legalForm: 'PRIVATE_LIMITED_COMPANY',
      localPresenceType: 'BRANCH',
      localPresenceUrsbNumber: 'URSB-BR-2019-114302',
    },
    powerOfAttorney: {
      grantingCompany: 'Gulf Petrochem International FZE',
      representatives: [
        { fullName: 'Mohammed Al-Rashidi', position: 'Chief Executive Officer' },
      ],
      scopeOfAuthority:
        'To sign, submit, and negotiate on behalf of Gulf Petrochem International FZE all documents relating to the Expression of Interest for land allocation at the Kabalega Petro-Based Industrial Park.',
      effectiveDate: '2025-11-03',
      validityPeriod: 'Until the conclusion of the KIP land allocation process',
      signedByName: 'Khalid Al-Mansoori',
      signedByTitle: 'Chairman of the Board',
      companySealAffixed: true,
      notarizationType: 'NOTARIZED_AND_LEGALIZED',
      notarizedBy: 'Notary Public, Dubai Courts — legalized by the Ugandan Embassy, Abu Dhabi',
      notarizedOn: '2025-11-07',
    },
    ownership: {
      shareholders: [
        {
          holderType: 'ENTITY',
          name: 'Gulf Petrochem Holdings Ltd',
          nationality: 'United Arab Emirates',
          shareholdingPercent: 74,
          registrationNumber: 'JAFZA-2001-0044',
        },
        {
          holderType: 'INDIVIDUAL',
          name: 'Khalid Al-Mansoori',
          nationality: 'Emirati',
          shareholdingPercent: 26,
          identificationType: 'PASSPORT',
          identificationNumber: 'UAE-784-1975-0023451',
        },
      ],
      ultimateBeneficialOwners: [
        {
          fullName: 'Khalid Al-Mansoori',
          nationality: 'Emirati',
          natureOfControl:
            'Holds 26% directly and a controlling 61% interest in Gulf Petrochem Holdings Ltd.',
        },
      ],
    },
    management: {
      keyPersonnel: [
        { fullName: 'Mohammed Al-Rashidi', title: 'Chief Executive Officer' },
        { fullName: 'Priya Nair', title: 'Chief Financial Officer' },
        { fullName: 'Samuel Okecho', title: 'Head of East Africa Operations' },
      ],
    },
    companyContact: {
      postalAddress: 'P.O. Box 18334, JAFZA, Dubai, United Arab Emirates',
      physicalAddress: 'Warehouse 12, South Zone, Jebel Ali Free Zone, Dubai, UAE',
      email: 'eoi@gulfpetrochem.ae',
      phone: '+971 4 884 5500',
      primaryContactSameAsRepresentative: false,
      primaryContactName: 'Samuel Okecho',
      primaryContactTitle: 'Head of East Africa Operations',
      primaryContactPhone: '+256 414 220 118',
      primaryContactEmail: 's.okecho@gulfpetrochem.ae',
    },
    letterOfInterest: {
      proposedBusinessActivity:
        'Establishment of a petroleum blending and packaging facility covering lubricants, base oils, and specialty chemicals for the East African market.',
    },
    statutoryCompliance: {
      homeCountryTaxReference: 'UAE-TRN-100234567800003',
      ugandaTinStatus: 'REGISTERED',
    },
  },
  LAND_BUSINESS_PROFILE: {
    landArea: {
      size: 19.8,
      unit: 'ACRES',
      basisOfEstimate:
        'Blending hall and tank farm 5.2 acres, bulk storage 4.1 acres, packaging and warehousing 3.4 acres, internal roads and parking 2.6 acres, statutory buffer zone 2.0 acres, Phase 2 expansion reserve 2.5 acres.',
    },
    capitalInvestmentUsd: 41000000,
    proposedBusiness: {
      description:
        'A petroleum blending facility rated at 120,000 MT/year. Phase 1 covers blending and bulk storage; Phase 2 adds packaging and warehousing. The plant is sited to draw feedstock along the EACOP corridor and will supply lubricants and specialty chemicals into Uganda and the wider region.',
      productsOrServices:
        'Automotive and industrial lubricants, base oils, greases, specialty chemicals',
      scaleOfOperation: '120,000 MT/year installed blending capacity',
      targetMarkets: ['DOMESTIC', 'REGIONAL', 'EXPORT'],
    },
    establishedOperations: {
      tradingLicenceClass: 'Petroleum products blending and manufacturing',
      tradingLicenceNumber: 'UG-TL-2025-441022',
      tradingLicenceExpiry: '2026-12-31',
      yearsInOperation: 24,
    },
    comparableProjects: [
      {
        name: 'Mombasa Lubricants Blending Plant',
        location: 'Mombasa, Kenya',
        description:
          'Greenfield lubricants blending plant rated at 40,000 MT/year, comprising a blending hall, a 12-tank base oil farm and an automated filling line.',
        capitalInvestmentUsd: 18500000,
        performanceOutcome:
          'Commissioned 2019 and operating at 86% of nameplate capacity. Supplies 340 retail sites and four OEM workshops across Kenya and Tanzania.',
      },
      {
        name: 'Dar es Salaam Storage Terminal',
        location: 'Dar es Salaam, Tanzania',
        description:
          'Bulk petroleum storage terminal of 60,000 m³ across nine tanks, with marine loading arms and a road tanker gantry.',
        capitalInvestmentUsd: 26000000,
        performanceOutcome:
          'Operating since 2021 with throughput of 480,000 m³ in 2025 under long-term contracts with two regional marketers.',
      },
    ],
  },
  UTILITIES_INFRASTRUCTURE: {
    water: {
      supplyM3PerDay: 250,
      wastewaterM3PerDay: 95,
      wastewaterCharacteristics: ['INDUSTRIAL', 'CHEMICAL'],
      wastewaterTreatmentPlan:
        'On-site effluent treatment plant with oil-water separation and dissolved air flotation. Closed-loop cooling recycling; zero liquid discharge targeted from Phase 2.',
      solidWasteTonnesPerDay: 1.8,
      solidWasteCategory: 'Industrial — spent filter media, contaminated packaging, sludge',
      firefightingReserveM3: 2400,
    },
    power: {
      peakDemandKw: 4500,
      supplyConfiguration: 'THREE_PHASE',
      backupGeneratorKva: 2500,
    },
    ict: {
      bandwidthMbps: 200,
      fibreRequired: true,
      specialRequirements:
        'Dedicated SCADA network segregated from corporate traffic, redundant failover link, CCTV across the tank farm, and a leased line for ERP replication to Dubai.',
    },
  },
  H3SE: {
    safetyPerformance: {
      reportingEntity: 'APPLICANT',
      years: [
        { year: 2023, trir: 0.42, ltifr: 0.31, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 4 },
        { year: 2024, trir: 0.28, ltifr: 0.19, fatalities: 0, majorEnvironmentalIncidents: 1, regulatoryPenalties: 1, regulatoryPenaltiesDescription: 'Administrative fine from Dubai Municipality for a delayed quarterly emissions return. Paid in full; reporting process revised.', lostTimeDays: 2 },
        { year: 2025, trir: 0.21, ltifr: 0.11, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 1 },
      ],
    },
    certifications: [
      { certification: 'ISO 45001 (Occupational Health & Safety)', certifyingBody: 'Bureau Veritas', certificateNumber: 'BV-OHS-2023-88214', issueDate: '2023-05-12', expiryDate: '2026-05-11' },
      { certification: 'ISO 14001 (Environmental Management)', certifyingBody: 'Bureau Veritas', certificateNumber: 'BV-ENV-2023-88215', issueDate: '2023-05-12', expiryDate: '2026-05-11' },
      { certification: 'ISO 9001 (Quality Management)', certifyingBody: 'SGS', certificateNumber: 'SGS-QMS-2024-11907', issueDate: '2024-02-20', expiryDate: '2027-02-19' },
    ],
    managementSystem: {
      policy: { inForceSince: '2012-04-01', lastReviewedOn: '2025-09-15' },
      organization: { functionInPlaceSince: '2010-01-01', headcount: 14 },
      audits: {
        internalAuditsLast3Years: 11,
        externalAuditsLast3Years: 3,
        mostRecentAuditDate: '2025-10-08',
        mostRecentAuditOutcome:
          'Bureau Veritas surveillance audit closed with two minor non-conformities on document control, both remediated within 30 days. No major findings.',
      },
    },
    comparableProjectH3se: [
      {
        projectName: 'Mombasa Lubricants Blending Plant',
        location: 'Mombasa, Kenya',
        incidentRecord: 'Zero lost-time injuries since commissioning in 2019; two first-aid cases in 2024.',
        certificationsApplied: 'ISO 45001:2018, ISO 14001:2015',
        regulatoryFindings: 'None. NEMA Kenya compliance licence renewed annually without condition.',
        verification: 'Client reference: Head of HSE, Kenya Pipeline Company. NEMA Kenya licence KE/EIA/4471.',
      },
      {
        projectName: 'Dar es Salaam Storage Terminal',
        location: 'Dar es Salaam, Tanzania',
        incidentRecord: 'One lost-time injury in 2022 (hand laceration, 6 days lost). No environmental incidents.',
        certificationsApplied: 'ISO 45001:2018',
        regulatoryFindings: 'None outstanding. NEMC inspection March 2025 closed with no action.',
        verification: 'Regulator record: NEMC Tanzania inspection report NEMC/INSP/2025/0312.',
      },
    ],
  },
  NATIONAL_CONTENT: {
    employment: {
      reportingEntity: 'APPLICANT',
      years: [
        { year: 2023, totalEmployees: 41, ugandanEmployees: 31, seniorManagementTotal: 6, ugandanSeniorManagement: 2, technicalSkilledTotal: 18, ugandanTechnicalSkilled: 12 },
        { year: 2024, totalEmployees: 44, ugandanEmployees: 35, seniorManagementTotal: 6, ugandanSeniorManagement: 2, technicalSkilledTotal: 20, ugandanTechnicalSkilled: 15 },
        { year: 2025, totalEmployees: 46, ugandanEmployees: 38, seniorManagementTotal: 7, ugandanSeniorManagement: 3, technicalSkilledTotal: 22, ugandanTechnicalSkilled: 17 },
      ],
      nssfConsecutiveMonths: 68,
      nssfAsOfDate: '2026-01-31',
    },
    training: {
      years: [
        { year: 2023, ugandansTrained: 18, programmesCompleted: 3, apprenticeshipsCompleted: 8 },
        { year: 2024, ugandansTrained: 24, programmesCompleted: 4, apprenticeshipsCompleted: 10 },
        { year: 2025, ugandansTrained: 27, programmesCompleted: 4, apprenticeshipsCompleted: 10 },
      ],
    },
    localProcurement: { localSupplierSpendPercent: 34.5, financialYear: 'FY2025' },
  },
  DECLARATION: {
    signatoryName: 'Mohammed Al-Rashidi',
    signatoryTitle: 'Chief Executive Officer',
    signedOn: '2026-02-14',
    declarationAccepted: true,
    acceptedAt: '2026-02-14T09:00:00.000Z',
  },
}

const fertSections: Record<string, object> = {
  PRELIMINARY_INFO: {
    applicantCategory: 'LOCAL',
    legalStatus: {
      companyName: 'Uganda Fertiliser Manufacturing Co. Ltd',
      registrationNumber: 'URSB-80020000123456',
      dateOfIncorporation: '2014-07-22',
      countryOfIncorporation: 'Uganda',
      legalForm: 'PRIVATE_LIMITED_COMPANY',
    },
    powerOfAttorney: {
      grantingCompany: 'Uganda Fertiliser Manufacturing Co. Ltd',
      representatives: [
        { fullName: 'Dr. Grace Atwine', position: 'Managing Director' },
      ],
      scopeOfAuthority:
        'To sign, submit, and negotiate on behalf of Uganda Fertiliser Manufacturing Co. Ltd all documents relating to the Expression of Interest for land allocation at the Kabalega Petro-Based Industrial Park.',
      effectiveDate: '2025-12-01',
      validityPeriod: 'Until the conclusion of the KIP land allocation process',
      signedByName: 'Eng. Patrick Musoke',
      signedByTitle: 'Board Chairperson',
      companySealAffixed: true,
      notarizationType: 'NOTARIZED',
      notarizedBy: 'Nakawa & Co. Advocates, Commissioner for Oaths',
      notarizedOn: '2025-12-04',
    },
    ownership: {
      shareholders: [
        {
          holderType: 'ENTITY',
          name: 'Uganda Development Corporation',
          nationality: 'Uganda',
          shareholdingPercent: 51,
          registrationNumber: 'UDC-URSB-1993-001',
        },
        {
          holderType: 'INDIVIDUAL',
          name: 'Dr. Grace Atwine',
          nationality: 'Ugandan',
          shareholdingPercent: 29,
          identificationType: 'NATIONAL_ID',
          identificationNumber: 'CM91123456UGXX',
        },
        {
          holderType: 'ENTITY',
          name: 'Nile Basin Capital Partners',
          nationality: 'Kenya',
          shareholdingPercent: 20,
          registrationNumber: 'KE-BR-2018-09934',
        },
      ],
      ultimateBeneficialOwners: [
        {
          fullName: 'Dr. Grace Atwine',
          nationality: 'Ugandan',
          natureOfControl: 'Largest individual shareholder and Managing Director.',
        },
      ],
    },
    management: {
      keyPersonnel: [
        { fullName: 'Dr. Grace Atwine', title: 'Managing Director' },
        { fullName: 'Joseph Kigozi', title: 'Chief Financial Officer' },
        { fullName: 'Sarah Namuli', title: 'Head of Plant Operations' },
        { fullName: 'Eng. Robert Ssempala', title: 'H3SE Manager' },
      ],
    },
    companyContact: {
      postalAddress: 'P.O. Box 7134, Kampala, Uganda',
      physicalAddress: 'Plot 14, Nile Avenue, Kampala, Uganda',
      email: 'eoi@ugfertiliser.co.ug',
      phone: '+256 414 341 200',
      primaryContactSameAsRepresentative: true,
    },
    letterOfInterest: {
      proposedBusinessActivity:
        'Establishment of a urea and NPK fertiliser blending plant to reduce national import dependency on Kenyan and Egyptian fertilisers.',
    },
    statutoryCompliance: { ugandaTin: '1000456789' },
  },
  LAND_BUSINESS_PROFILE: {
    landArea: {
      size: 5.4,
      unit: 'ACRES',
      basisOfEstimate:
        'Blending plant and bagging hall 1.9 acres, raw material warehouse 1.4 acres, finished goods store 0.8 acres, weighbridge and truck marshalling 0.7 acres, buffer and landscaping 0.6 acres.',
    },
    capitalInvestmentUsd: 8600000,
    proposedBusiness: {
      description:
        'An NPK fertiliser blending plant with an initial capacity of 50,000 MT/year, expandable to 150,000 MT/year, together with an adjacent warehouse and bagging hall. Output is aimed at Ugandan smallholder and commercial farmers through the existing NAADS and agro-dealer channels.',
      productsOrServices: 'NPK compound fertilisers, urea blends, soil-specific formulations',
      scaleOfOperation: '50,000 MT/year initial, 150,000 MT/year at full build-out',
      targetMarkets: ['DOMESTIC', 'REGIONAL'],
    },
    establishedOperations: {
      tradingLicenceClass: 'Agro-chemical manufacturing and distribution',
      tradingLicenceNumber: 'KCCA-TL-2025-118804',
      tradingLicenceExpiry: '2026-12-31',
      yearsInOperation: 11,
    },
    comparableProjects: [
      {
        name: 'Jinja Agro-Processing Facility',
        location: 'Jinja, Uganda',
        description:
          'Fertiliser blending and bagging facility rated at 15,000 MT/year, including a four-hopper batch blender and an automated bagging line.',
        capitalInvestmentUsd: 3200000,
        performanceOutcome:
          'Operating since 2020 at 92% capacity utilisation. Supplies 210 agro-dealers across eastern Uganda and holds a standing supply contract with NAADS.',
      },
      {
        name: 'Mbale Warehouse & Distribution Hub',
        location: 'Mbale, Uganda',
        description:
          '6,000 m² covered warehouse with climate-controlled storage for hygroscopic fertiliser stock and a rail siding connection.',
        capitalInvestmentUsd: 1800000,
        performanceOutcome:
          'Commissioned 2023; handled 22,000 MT in its first full year with under 0.4% product loss.',
      },
    ],
  },
  UTILITIES_INFRASTRUCTURE: {
    water: {
      supplyM3PerDay: 80,
      wastewaterM3PerDay: 18,
      wastewaterCharacteristics: ['DOMESTIC', 'INDUSTRIAL'],
      wastewaterTreatmentPlan:
        'Minimal process water. Wash-down water is captured in a settling pit and reused for dust suppression; domestic effluent connects to the KIP sewerage system.',
      solidWasteTonnesPerDay: 0.6,
      solidWasteCategory: 'Non-hazardous — bag offcuts, pallets, dust collector fines',
      firefightingReserveM3: 900,
    },
    power: {
      peakDemandKw: 1800,
      supplyConfiguration: 'THREE_PHASE',
      backupGeneratorKva: 800,
    },
    ict: {
      bandwidthMbps: 50,
      fibreRequired: true,
      specialRequirements:
        'ERP integration with the Jinja and Mbale sites, CCTV across the warehouse and weighbridge.',
    },
  },
  H3SE: {
    safetyPerformance: {
      reportingEntity: 'APPLICANT',
      years: [
        { year: 2023, trir: 1.14, ltifr: 0.98, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 11 },
        { year: 2024, trir: 0.87, ltifr: 0.62, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 6 },
        { year: 2025, trir: 0.66, ltifr: 0.44, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 3 },
      ],
    },
    certifications: [
      { certification: 'ISO 45001 (Occupational Health & Safety)', certifyingBody: 'SGS Uganda', certificateNumber: 'SGS-UG-OHS-2024-3318', issueDate: '2024-08-19', expiryDate: '2027-08-18' },
      { certification: 'NEMA Certificate of Compliance', certifyingBody: 'National Environment Management Authority', certificateNumber: 'NEMA/CC/2019/00814', issueDate: '2019-06-11', expiryDate: '2026-06-10' },
    ],
    managementSystem: {
      policy: { inForceSince: '2019-02-18', lastReviewedOn: '2025-07-30' },
      organization: { functionInPlaceSince: '2019-01-07', headcount: 4 },
      audits: {
        internalAuditsLast3Years: 8,
        externalAuditsLast3Years: 2,
        mostRecentAuditDate: '2025-08-14',
        mostRecentAuditOutcome:
          'SGS surveillance audit passed. One minor non-conformity raised on contractor induction records, closed out in September 2025.',
      },
    },
    comparableProjectH3se: [
      {
        projectName: 'Jinja Agro-Processing Facility',
        location: 'Jinja, Uganda',
        incidentRecord: 'One lost-time injury in 2023 (ankle sprain, 5 days lost). No environmental incidents since commissioning.',
        certificationsApplied: 'ISO 45001:2018, NEMA Certificate of Compliance',
        regulatoryFindings: 'None. NEMA annual environmental audit accepted without condition in 2024 and 2025.',
        verification: 'Regulator record: NEMA audit acceptance NEMA/AEA/2025/1188.',
      },
    ],
  },
  NATIONAL_CONTENT: {
    employment: {
      reportingEntity: 'APPLICANT',
      years: [
        { year: 2023, totalEmployees: 39, ugandanEmployees: 39, seniorManagementTotal: 5, ugandanSeniorManagement: 5, technicalSkilledTotal: 16, ugandanTechnicalSkilled: 16 },
        { year: 2024, totalEmployees: 43, ugandanEmployees: 43, seniorManagementTotal: 5, ugandanSeniorManagement: 5, technicalSkilledTotal: 19, ugandanTechnicalSkilled: 19 },
        { year: 2025, totalEmployees: 47, ugandanEmployees: 47, seniorManagementTotal: 6, ugandanSeniorManagement: 6, technicalSkilledTotal: 21, ugandanTechnicalSkilled: 21 },
      ],
      nssfConsecutiveMonths: 84,
      nssfAsOfDate: '2026-01-31',
    },
    training: {
      years: [
        { year: 2023, ugandansTrained: 22, programmesCompleted: 3, apprenticeshipsCompleted: 5 },
        { year: 2024, ugandansTrained: 29, programmesCompleted: 4, apprenticeshipsCompleted: 5 },
        { year: 2025, ugandansTrained: 31, programmesCompleted: 5, apprenticeshipsCompleted: 6 },
      ],
    },
    localProcurement: { localSupplierSpendPercent: 78.2, financialYear: 'FY2025' },
  },
  DECLARATION: {
    signatoryName: 'Dr. Grace Atwine',
    signatoryTitle: 'Managing Director',
    signedOn: '2026-01-30',
    declarationAccepted: true,
    acceptedAt: '2026-01-30T08:00:00.000Z',
  },
}

const sabaSections: Record<string, object> = {
  PRELIMINARY_INFO: {
    applicantCategory: 'LOCAL',
    legalStatus: {
      companyName: 'Sabastar General Trading Co. Ltd',
      registrationNumber: 'URSB-80020000998877',
      dateOfIncorporation: '2011-09-05',
      countryOfIncorporation: 'Uganda',
      legalForm: 'PRIVATE_LIMITED_COMPANY',
    },
    powerOfAttorney: {
      grantingCompany: 'Sabastar General Trading Co. Ltd',
      representatives: [{ fullName: 'Hassan Sabir', position: 'Director' }],
      scopeOfAuthority:
        'To sign and submit on behalf of Sabastar General Trading Co. Ltd all documents relating to the Expression of Interest for land allocation at the Kabalega Petro-Based Industrial Park.',
      effectiveDate: '2026-01-20',
      validityPeriod: '12 months from the effective date',
      signedByName: 'Hassan Sabir',
      signedByTitle: 'Director',
      companySealAffixed: false,
      notarizationType: 'NOTARIZED',
      notarizedBy: 'Kampala Central Commissioner for Oaths',
      notarizedOn: '2026-01-22',
    },
    ownership: {
      shareholders: [
        {
          holderType: 'INDIVIDUAL',
          name: 'Hassan Sabir',
          nationality: 'Ugandan',
          shareholdingPercent: 60,
          identificationType: 'NATIONAL_ID',
          identificationNumber: 'CM87654321UGXX',
        },
        {
          holderType: 'INDIVIDUAL',
          name: 'Fatuma Wambui',
          nationality: 'Kenyan',
          shareholdingPercent: 40,
          identificationType: 'PASSPORT',
          identificationNumber: 'KE-ID-1985-449922',
        },
      ],
    },
    management: {
      keyPersonnel: [
        { fullName: 'Hassan Sabir', title: 'Director' },
        { fullName: 'Fatuma Wambui', title: 'Operations Manager' },
      ],
    },
    companyContact: {
      postalAddress: 'P.O. Box 22119, Kampala, Uganda',
      physicalAddress: 'Nakasero Road, Kampala, Uganda',
      email: 'sabastar@gmail.com',
      phone: '+256 772 123 456',
      primaryContactSameAsRepresentative: true,
    },
    letterOfInterest: {
      proposedBusinessActivity:
        'Petroleum products warehousing and a wholesale distribution hub serving Western Uganda.',
    },
    statutoryCompliance: { ugandaTin: '1000998877' },
  },
  LAND_BUSINESS_PROFILE: {
    landArea: {
      size: 1.2,
      unit: 'ACRES',
      basisOfEstimate: 'Storage tanks and depot building with vehicle access.',
    },
    capitalInvestmentUsd: 620000,
    proposedBusiness: {
      description:
        'Petroleum products storage tanks and a wholesale distribution depot supplying fuel retailers across Western Uganda from a single consolidated site.',
      productsOrServices: 'Wholesale petroleum products',
      scaleOfOperation: 'Approximately 400 m³ storage',
      targetMarkets: ['DOMESTIC'],
    },
    establishedOperations: {
      tradingLicenceClass: 'General wholesale trade',
      tradingLicenceNumber: 'KCCA-TL-2025-660231',
      tradingLicenceExpiry: '2026-12-31',
      yearsInOperation: 14,
    },
    comparableProjects: [
      {
        name: 'Kasese hardware and construction supply contract',
        location: 'Kasese, Uganda',
        description:
          'Supply of construction materials and general hardware to a district water-supply project, coordinated from a leased 400 m² yard.',
        capitalInvestmentUsd: 95000,
        performanceOutcome:
          'Contract completed in 2022. No petroleum storage or handling was involved.',
      },
    ],
  },
  UTILITIES_INFRASTRUCTURE: {
    water: {
      supplyM3PerDay: 20,
      wastewaterM3PerDay: 15,
      wastewaterCharacteristics: ['DOMESTIC'],
      wastewaterTreatmentPlan: 'Connected to the KIP sewerage system.',
      solidWasteTonnesPerDay: 0.2,
      solidWasteCategory: 'General non-hazardous waste',
      firefightingReserveM3: 120,
    },
    power: {
      peakDemandKw: 400,
      supplyConfiguration: 'THREE_PHASE',
    },
    ict: {
      bandwidthMbps: 20,
      fibreRequired: false,
    },
  },
  H3SE: {
    safetyPerformance: {
      reportingEntity: 'APPLICANT',
      years: [
        { year: 2023, trir: 0, ltifr: 0, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 0 },
        { year: 2024, trir: 0, ltifr: 0, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 0 },
        { year: 2025, trir: 0, ltifr: 0, fatalities: 0, majorEnvironmentalIncidents: 0, regulatoryPenalties: 0, lostTimeDays: 0 },
      ],
    },
    certifications: [],
    managementSystem: {
      policy: { inForceSince: '2026-01-15', lastReviewedOn: '2026-01-15' },
      organization: { functionInPlaceSince: '2026-01-15', headcount: 1 },
      audits: {
        internalAuditsLast3Years: 0,
        externalAuditsLast3Years: 0,
        mostRecentAuditDate: '2026-01-15',
        mostRecentAuditOutcome: 'No audit has been carried out to date.',
      },
    },
    comparableProjectH3se: [],
    notApplicable: {
      certifications:
        'The company holds no third-party H3SE certifications at this time.',
      comparableProjectH3se:
        'No previous project of comparable scale or risk profile has been undertaken.',
      H3SE_CERTIFICATE: 'No current certifications are held, so none can be attached.',
      H3SE_AUDIT_REPORT: 'No internal or external H3SE audit has been carried out to date.',
    },
  },
  NATIONAL_CONTENT: {
    employment: {
      reportingEntity: 'APPLICANT',
      years: [
        { year: 2023, totalEmployees: 5, ugandanEmployees: 5, seniorManagementTotal: 2, ugandanSeniorManagement: 1, technicalSkilledTotal: 1, ugandanTechnicalSkilled: 1 },
        { year: 2024, totalEmployees: 6, ugandanEmployees: 6, seniorManagementTotal: 2, ugandanSeniorManagement: 1, technicalSkilledTotal: 1, ugandanTechnicalSkilled: 1 },
        { year: 2025, totalEmployees: 6, ugandanEmployees: 6, seniorManagementTotal: 2, ugandanSeniorManagement: 1, technicalSkilledTotal: 2, ugandanTechnicalSkilled: 2 },
      ],
      nssfConsecutiveMonths: 9,
      nssfAsOfDate: '2026-01-31',
    },
    training: {
      years: [
        { year: 2023, ugandansTrained: 0, programmesCompleted: 0, apprenticeshipsCompleted: 0 },
        { year: 2024, ugandansTrained: 0, programmesCompleted: 0, apprenticeshipsCompleted: 0 },
        { year: 2025, ugandansTrained: 2, programmesCompleted: 1, apprenticeshipsCompleted: 0 },
      ],
    },
    localProcurement: { localSupplierSpendPercent: 95, financialYear: 'FY2025' },
    notApplicable: {
      TRAINING_RECORD:
        'Only one informal supplier-led product training was delivered; no attendance registers were kept.',
      PROCUREMENT_RECORD:
        'The company does not maintain a formal procurement register.',
    },
  },
  DECLARATION: {
    signatoryName: 'Hassan Sabir',
    signatoryTitle: 'Director',
    signedOn: '2026-02-01',
    declarationAccepted: true,
    acceptedAt: '2026-02-01T07:30:00.000Z',
  },
}


// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding KIP database…\n')

  const pw = await bcrypt.hash(PASSWORD, 12)
  console.log('  ✓ password hash computed')

  await q(
    `INSERT INTO "ApplicationWindow"
       (id, name, "openAt", "closeAt", status, "sequenceCounter", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,now(),now())
     ON CONFLICT (id) DO UPDATE
       SET name=$2, "openAt"=$3, "closeAt"=$4, status=$5, "sequenceCounter"=$6, "updatedAt"=now()`,
    [WINDOW_ID, 'Phase 1 — Round 1: Priority Industries',
     new Date('2026-01-15T08:00:00Z'), new Date('2026-06-30T23:59:59Z'), 'OPEN', 3],
  )
  console.log('  ✓ window: Phase 1 — Round 1 [OPEN]')

  const staffId = (role: string) => `staff-${role.toLowerCase().replace(/_/g, '-')}-001`
  await upsertUser(staffId('ADMIN'),       'admin@kip.unoc.co.ug',       'KIP System Admin',                  'ADMIN',       pw)
  await upsertUser(staffId('TC_CHAIR'),    'tc.chair@kip.unoc.co.ug',    'Head, Industrial Park Development', 'TC_CHAIR',    pw)
  await upsertUser(staffId('TC_MEMBER'),   'tc.reviewer@kip.unoc.co.ug', 'Samuel Opio (TC Reviewer)',         'TC_MEMBER',   pw)
  await upsertUser(staffId('LAC_MEMBER'),  'lac.member@kip.unoc.co.ug',  'Agnes Nakato (LAC Member)',         'LAC_MEMBER',  pw)
  await upsertUser(staffId('EXCO_MEMBER'), 'exco@kip.unoc.co.ug',        'Peter Owori (ExCo Member)',         'EXCO_MEMBER', pw)
  console.log('  ✓ staff: 5 accounts')

  await upsertOrg(IDS.orgGulf, 'Gulf Petrochem International FZE',        'UAE',    'P.O. Box 18334, JAFZA, Dubai',      '+971 4 884 5500',   'eoi@gulfpetrochem.ae',
    { tin: '100543219', tradingName: 'Gulf Petrochem', registrationNumber: 'JAFZA-18334', ursbRegistrationNumber: 'URSB-F-2026-00871', companyType: 'PUBLIC_LIMITED_COMPANY', businessSector: 'PETROCHEMICALS_REFINING' })
  await upsertOrg(IDS.orgNile, 'Nile Energy Ventures Ltd',                'Uganda', 'Plot 22, Kampala Road, Kampala',    '+256 700 100 200',  'invest@nileenergy.co.ug',
    { tin: '1001234567', registrationNumber: '80020004521', companyType: 'LIMITED_LIABILITY_COMPANY', businessSector: 'LOGISTICS_WAREHOUSING' })
  await upsertOrg(IDS.orgFert, 'Uganda Fertiliser Manufacturing Co. Ltd', 'Uganda', 'Plot 14, Nile Avenue, Kampala',     '+256 414 341 200',  'eoi@ugfertiliser.co.ug',
    { tin: '1000987654', tradingName: 'UgaFert', registrationNumber: '80020001988', companyType: 'LIMITED_LIABILITY_COMPANY', businessSector: 'FERTILISERS_CHEMICALS' })
  await upsertOrg(IDS.orgSaba, 'Sabastar General Trading Co. Ltd',        'Uganda', 'Nakasero Road, Kampala',            '+256 772 123 456',  'sabastar@gmail.com',
    { tin: '1000456789', registrationNumber: '80020007743', companyType: 'LIMITED_LIABILITY_COMPANY', businessSector: 'AGRO_PROCESSING' })

  const gulfUserId = 'user-gulf-investor-001'
  const nileUserId = 'user-nile-investor-001'
  const fertUserId = 'user-fert-investor-001'
  const sabaUserId = 'user-saba-investor-001'
  await upsertUser(gulfUserId, 'investor@gulfpetrochem.ae',    'Mohammed Al-Rashidi', 'INVESTOR', pw, IDS.orgGulf,
    { designation: 'Business Development Director', phone: '+971 50 234 5678' })
  await upsertUser(nileUserId, 'investor.ug@nileenergy.co.ug', 'Robert Ssempala',     'INVESTOR', pw, IDS.orgNile,
    { designation: 'Managing Director', phone: '+256 700 100 201' })
  await upsertUser(fertUserId, 'investor@ugfertiliser.co.ug',  'Dr. Grace Atwine',    'INVESTOR', pw, IDS.orgFert,
    { designation: 'Chief Executive Officer', phone: '+256 772 341 200' })
  await upsertUser(sabaUserId, 'investor@sabastar.co.ug',      'Hassan Sabir',        'INVESTOR', pw, IDS.orgSaba,
    { designation: 'General Manager', phone: '+256 772 123 457' })
  console.log('  ✓ investors: 4 orgs + 4 accounts')

  const tcChairId  = staffId('TC_CHAIR')
  const tcMemberId = staffId('TC_MEMBER')
  const lacId      = staffId('LAC_MEMBER')
  const excoId     = staffId('EXCO_MEMBER')

  // App 1: Gulf Petrochem — LAC_REVIEW
  await upsertApplication(IDS.app1, 'KIP-EOI-2026-0001', 'KIP-HI-LOT-007', 'LAC_REVIEW',
    gulfUserId, IDS.orgGulf, new Date('2026-02-14T10:30:00Z'))
  for (const [section, payload] of Object.entries(gulfSections)) {
    await upsertSection(IDS.app1, section, payload)
  }
  await upsertPayment(IDS.payGulf, IDS.app1, 'STANBIC_TRANSFER', 'CONFIRMED', 'USD', '1000.00',
    'STB-TXN-20260211-00447', null, new Date('2026-02-11T11:00:00Z'), new Date('2026-02-12T14:00:00Z'))
  await upsertReviewAction('ra-g-1', IDS.app1, tcChairId,  'ASSIGNED',    'SUBMITTED',       'UNDER_TC_REVIEW', null, new Date('2026-03-10T09:00:00Z'))
  await upsertReviewAction('ra-g-2', IDS.app1, tcMemberId, 'SHORTLISTED', 'UNDER_TC_REVIEW', 'SHORTLISTED',     'Strong technical capability. Recommend for LAC.', new Date('2026-03-25T14:00:00Z'))
  await upsertReviewAction('ra-g-3', IDS.app1, lacId,      'ASSIGNED',    'SHORTLISTED',     'LAC_REVIEW',      null, new Date('2026-04-10T09:00:00Z'))
  console.log('  ✓ app1: KIP-EOI-2026-0001 [LAC_REVIEW] — Gulf Petrochem')

  // App 2: Uganda Fertiliser — ALLOCATED
  await upsertApplication(IDS.app2, 'KIP-EOI-2026-0002', 'KIP-LI-LOT-014', 'ALLOCATED',
    fertUserId, IDS.orgFert, new Date('2026-01-31T09:00:00Z'), new Date('2026-05-05T11:00:00Z'))
  for (const [section, payload] of Object.entries(fertSections)) {
    await upsertSection(IDS.app2, section, payload)
  }
  await upsertPayment(IDS.payFert, IDS.app2, 'CARD', 'CONFIRMED', 'USD', '1000.00',
    null, 'FLW-TXN-20260129-88312', new Date('2026-01-29T08:15:00Z'), new Date('2026-01-29T08:15:00Z'))
  await upsertReviewAction('ra-f-1', IDS.app2, tcChairId,  'ASSIGNED',    'SUBMITTED',       'UNDER_TC_REVIEW', null, new Date('2026-02-15T09:00:00Z'))
  await upsertReviewAction('ra-f-2', IDS.app2, tcMemberId, 'SHORTLISTED', 'UNDER_TC_REVIEW', 'SHORTLISTED',     'Excellent national content. Strong financials.', new Date('2026-03-01T14:00:00Z'))
  await upsertReviewAction('ra-f-3', IDS.app2, lacId,      'LAC_APPROVED','LAC_REVIEW',      'LAC_APPROVED',    'Land proposal consistent with zoning requirements.', new Date('2026-03-22T10:00:00Z'))
  await upsertReviewAction('ra-f-4', IDS.app2, excoId,     'ALLOCATED',   'EXCO_REVIEW',     'ALLOCATED',       'Approved. Proceed to LOI issuance.', new Date('2026-05-05T11:00:00Z'))
  console.log('  ✓ app2: KIP-EOI-2026-0002 [ALLOCATED] — Uganda Fertiliser')

  // App 3: Sabastar — NOT_SHORTLISTED
  await upsertApplication(IDS.app3, 'KIP-EOI-2026-0003', 'KIP-CL-LOT-003', 'NOT_SHORTLISTED',
    sabaUserId, IDS.orgSaba, new Date('2026-02-01T08:00:00Z'), new Date('2026-03-20T10:00:00Z'))
  for (const [section, payload] of Object.entries(sabaSections)) {
    await upsertSection(IDS.app3, section, payload)
  }
  await upsertPayment(IDS.paySaba, IDS.app3, 'STANBIC_TRANSFER', 'CONFIRMED', 'USD', '1000.00',
    'STB-TXN-20260130-00291', null, new Date('2026-01-30T14:00:00Z'), new Date('2026-01-31T10:00:00Z'))
  await upsertReviewAction('ra-s-1', IDS.app3, tcChairId,  'ASSIGNED',        'SUBMITTED',       'UNDER_TC_REVIEW', null, new Date('2026-02-20T09:00:00Z'))
  await upsertReviewAction('ra-s-2', IDS.app3, tcMemberId, 'NOT_SHORTLISTED', 'UNDER_TC_REVIEW', 'NOT_SHORTLISTED', 'Lacks H3SE system evidence. Business track record insufficient.', new Date('2026-03-20T10:00:00Z'))
  console.log('  ✓ app3: KIP-EOI-2026-0003 [NOT_SHORTLISTED] — Sabastar')

  // App 4: Nile Energy — DRAFT
  await upsertApplication(IDS.app4, null, 'KIP-LI-LOT-021', 'DRAFT', nileUserId, IDS.orgNile)
  await upsertSection(IDS.app4, 'PRELIMINARY_INFO', {
    applicantCategory: 'LOCAL',
    legalStatus: {
      companyName: 'Nile Energy Ventures Ltd',
      registrationNumber: 'URSB-80020000551204',
      dateOfIncorporation: '2018-04-16',
      countryOfIncorporation: 'Uganda',
      legalForm: 'PRIVATE_LIMITED_COMPANY',
    },
    powerOfAttorney: {
      grantingCompany: 'Nile Energy Ventures Ltd',
      representatives: [{ fullName: 'Robert Ssempala', position: 'Managing Director' }],
      scopeOfAuthority:
        'To sign, submit, and negotiate on behalf of Nile Energy Ventures Ltd all documents relating to the Expression of Interest for land allocation at the Kabalega Petro-Based Industrial Park.',
      effectiveDate: '2026-03-02',
      validityPeriod: 'Until the conclusion of the KIP land allocation process',
      signedByName: 'Fatima Nakirya',
      signedByTitle: 'Company Secretary',
      companySealAffixed: true,
      notarizationType: 'NOTARIZED',
      notarizedBy: 'Kampala Central Commissioner for Oaths',
      notarizedOn: '2026-03-04',
    },
    ownership: {
      shareholders: [
        {
          holderType: 'INDIVIDUAL',
          name: 'Robert Ssempala',
          nationality: 'Ugandan',
          shareholdingPercent: 65,
          identificationType: 'NATIONAL_ID',
          identificationNumber: 'CM91234567UGXX',
        },
        {
          holderType: 'INDIVIDUAL',
          name: 'Fatima Nakirya',
          nationality: 'Ugandan',
          shareholdingPercent: 35,
          identificationType: 'NATIONAL_ID',
          identificationNumber: 'CM88765432UGXX',
        },
      ],
    },
    management: {
      keyPersonnel: [
        { fullName: 'Robert Ssempala', title: 'Managing Director' },
        { fullName: 'Fatima Nakirya', title: 'Company Secretary' },
        { fullName: 'Denis Byaruhanga', title: 'Head of Distribution' },
      ],
    },
    companyContact: {
      postalAddress: 'P.O. Box 31877, Kampala, Uganda',
      physicalAddress: 'Plot 22, Kampala Road, Kampala, Uganda',
      email: 'invest@nileenergy.co.ug',
      phone: '+256 700 100 200',
      primaryContactSameAsRepresentative: true,
    },
    letterOfInterest: {
      proposedBusinessActivity:
        'Establishment of an LPG cylinder filling and distribution facility serving Western Uganda and the DRC border market.',
    },
    statutoryCompliance: { ugandaTin: '1000551204' },
  })
  await upsertSection(IDS.app4, 'LAND_BUSINESS_PROFILE', {
    landArea: {
      size: 3.0,
      unit: 'ACRES',
      basisOfEstimate:
        'Filling hall and carousel 0.9 acres, LPG storage spheres with statutory separation distances 1.1 acres, cylinder reconditioning workshop 0.4 acres, truck loading and marshalling 0.4 acres, perimeter buffer 0.2 acres.',
    },
    capitalInvestmentUsd: 5400000,
    proposedBusiness: {
      description:
        'An LPG cylinder filling plant with an initial capacity of 10,000 MT/year, comprising bulk storage spheres, an automated filling carousel, and a cylinder reconditioning and requalification workshop serving Western Uganda and cross-border demand from eastern DRC.',
      productsOrServices: 'Filled LPG cylinders (6 kg, 13 kg, 45 kg), bulk LPG, cylinder reconditioning',
      scaleOfOperation: '10,000 MT/year initial filling capacity',
      targetMarkets: ['DOMESTIC', 'REGIONAL'],
    },
    establishedOperations: {
      tradingLicenceClass: 'LPG storage, filling and distribution',
      tradingLicenceNumber: 'KCCA-TL-2025-770914',
      tradingLicenceExpiry: '2026-12-31',
      yearsInOperation: 8,
    },
    comparableProjects: [
      {
        name: 'Jinja LPG Depot',
        location: 'Jinja, Uganda',
        description:
          'Bulk LPG storage depot with 2,000 MT capacity across four mounded vessels, a road tanker offloading bay and a cylinder exchange yard.',
        capitalInvestmentUsd: 1400000,
        performanceOutcome:
          'Operating since 2020, supplying 90 retail outlets across four districts with an average monthly throughput of 260 MT.',
      },
    ],
  })
  await upsertPayment(IDS.payNile, IDS.app4, 'STANBIC_TRANSFER', 'CONFIRMED', 'USD', '1000.00',
    'STB-TXN-20260410-00789', null, new Date('2026-04-10T15:30:00Z'), new Date('2026-04-11T09:00:00Z'))
  console.log('  ✓ app4: [no reference] [DRAFT] — Nile Energy (2/6 sections)')

  // ── Application timeline (Phase 2 Investor Onboarding schedule) ──────────
  // ON CONFLICT (position) DO NOTHING — admin edits are never overwritten.
  const milestones: [number, string, string, string, string, string | null][] = [
    [1, 'GENERIC',    'Investor registration opens — create your account and prepare your documents', '23 Jun 2026',          '2026-06-23T00:00:00+03:00', null],
    [2, 'GENERIC',    'KIP National Launch — virtual live broadcast',                                  '7 Jul 2026',           '2026-07-07T00:00:00+03:00', null],
    [3, 'SITE_VISIT_BOOKING', 'Site visits booking',                                                   '8 Jul – 28 Jul 2026', '2026-07-08T00:00:00+03:00', '2026-07-28T23:59:59+03:00'],
    [4, 'SITE_VISIT', 'Investor site visits',                                                          '11 Aug – 25 Aug 2026', '2026-08-11T00:00:00+03:00', '2026-08-25T23:59:59+03:00'],
    [5, 'EOI_CALL',   'Call for Expressions of Interest — submission window open',                     '1 Sep – 15 Sep 2026',  '2026-09-01T00:00:00+03:00', '2026-09-15T23:59:59+03:00'],
    [6, 'GENERIC',    'Evaluation of Expressions of Interest',                                         '16 – 30 Sep 2026',     '2026-09-16T00:00:00+03:00', null],
    [7, 'GENERIC',    'Call for Request for Proposals',                                                '15 Oct – 12 Nov 2026', '2026-10-15T00:00:00+03:00', null],
    [8, 'GENERIC',    'RFP evaluation, due diligence, approvals & lease signing',                      'Nov 2026 – Feb 2027',  '2026-11-19T00:00:00+03:00', null],
    [9, 'GENERIC',    'Award of land & site handover',                                                 '5 Mar 2027',           '2027-03-05T00:00:00+03:00', null],
  ]
  for (const [position, kind, title, dateLabel, startsAt, endsAt] of milestones) {
    await pool.query(
      `INSERT INTO "TimelineMilestone" ("id", "position", "kind", "title", "dateLabel", "startsAt", "endsAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("position") DO NOTHING`,
      [randomUUID(), position, kind, title, dateLabel, startsAt, endsAt],
    )
  }
  console.log('  ✓ timeline: 9 Phase 2 milestones (admin-editable in /console/settings)')

  console.log('\n✅  Seed complete\n')
  console.log('  Seed accounts (password: KipPortal2025!):')
  console.log('  ┌──────────────────────────────────────────────┬───────────────┐')
  console.log('  │ Email                                         │ Role          │')
  console.log('  ├──────────────────────────────────────────────┼───────────────┤')
  console.log('  │ admin@kip.unoc.co.ug                         │ ADMIN         │')
  console.log('  │ tc.chair@kip.unoc.co.ug                      │ TC_CHAIR      │')
  console.log('  │ tc.reviewer@kip.unoc.co.ug                   │ TC_MEMBER     │')
  console.log('  │ lac.member@kip.unoc.co.ug                    │ LAC_MEMBER    │')
  console.log('  │ exco@kip.unoc.co.ug                          │ EXCO_MEMBER   │')
  console.log('  │ investor@gulfpetrochem.ae                     │ INVESTOR      │')
  console.log('  │ investor@ugfertiliser.co.ug                   │ INVESTOR      │')
  console.log('  │ investor@sabastar.co.ug                       │ INVESTOR      │')
  console.log('  │ investor.ug@nileenergy.co.ug                  │ INVESTOR      │')
  console.log('  └──────────────────────────────────────────────┴───────────────┘')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => pool.end())
