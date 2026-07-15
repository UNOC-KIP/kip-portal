/**
 * KIP Portal — database seed (raw SQL via pg, no ORM needed).
 * Idempotent: safe to run multiple times. Uses ON CONFLICT DO NOTHING/UPDATE.
 */
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

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

async function upsertSection(appId: string, section: string, payload: object) {
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

const gulfSections: Record<string, object> = {
  PRELIMINARY_INFO: {
    legalStatus: 'Limited Liability Company (LLC) — registered in UAE (JAFZA)',
    powerOfAttorneySignatory: 'Mohammed Al-Rashidi',
    shareholders: [
      { fullName: 'Gulf Petrochem Holdings Ltd', idNumber: 'JAFZA-2001-0044', nationality: 'UAE' },
      { fullName: 'Khalid Al-Mansoori', idNumber: 'UAE-784-1975-0023451', nationality: 'UAE' },
    ],
    letterOfInterestSummary:
      'Gulf Petrochem International FZE intends to establish a petroleum blending and packaging facility at KIP covering lubricants, base oils, and specialty chemicals for the East African market.',
    companyContact: {
      companyName: 'Gulf Petrochem International FZE',
      address: 'P.O. Box 18334, JAFZA, Dubai, UAE',
      contactPerson: 'Mohammed Al-Rashidi',
      phone: '+971 4 884 5500',
      email: 'eoi@gulfpetrochem.ae',
    },
  },
  LAND_BUSINESS_PROFILE: {
    landSizeSqm: 80000,
    proposedDevelopment:
      'A petroleum blending facility rated at 120,000 MT/year. Phase 1: blending and bulk storage. Phase 2: packaging and warehousing. Linked to EACOP corridor for feedstock logistics.',
    establishedBusinesses:
      'Gulf Petrochem Group operates 14 blending plants across the Middle East, Africa, and Asia. Combined installed capacity exceeds 1.2 million MT/year.',
    similarProjects:
      'Mombasa Lubricants Plant (2019, 40,000 MT/y), Dar es Salaam Storage Terminal (2021, 60,000 m³), Kampala Distribution Hub (2022).',
  },
  UTILITIES_INFRASTRUCTURE: {
    waterDemand: '250 m³/day for process cooling; closed-loop recycling planned.',
    wastewaterPlan: 'On-site effluent treatment plant; zero liquid discharge target Phase 2.',
    powerDemandMW: 4.5,
    ictRequirements: 'Fibre connectivity (100 Mbps+), dedicated SCADA network, redundant UPS + generator.',
  },
  H3SE: {
    pastPerformanceSummary:
      'Zero LTI across all facilities in the last 36 months (2022–2025). ADIPEC HSE Excellence Award 2024.',
    hasH3sePolicy: true,
    managementSystemSummary:
      'ISO 14001:2015 and ISO 45001:2018 certified. Spill containment bunding for 110% capacity; continuous air quality monitoring; monthly third-party audits.',
  },
  NATIONAL_CONTENT: {
    ugandanEmploymentHistory:
      'Kampala hub employs 38 Ugandans (82% of total). Senior roles include Plant Manager and Finance Controller.',
    trainingPrograms:
      'Annual petroleum operations apprenticeship (10 positions/year) with Makerere University. Committed to 70% Ugandan workforce within 3 years.',
  },
  DECLARATION: {
    signatoryName: 'Mohammed Al-Rashidi',
    signatoryTitle: 'Chief Executive Officer',
    agreedAt: '2026-02-14T09:00:00.000Z',
  },
}

const fertSections: Record<string, object> = {
  PRELIMINARY_INFO: {
    legalStatus: 'Private Limited Company — registered in Uganda (URSB)',
    powerOfAttorneySignatory: 'Dr. Grace Atwine',
    shareholders: [
      { fullName: 'Uganda Development Corporation', idNumber: 'UDC-URSB-1993-001', nationality: 'Ugandan' },
      { fullName: 'Dr. Grace Atwine', idNumber: 'CM91123456UGXX', nationality: 'Ugandan' },
      { fullName: 'Nile Basin Capital Partners', idNumber: 'KE-BR-2018-09934', nationality: 'Kenyan' },
    ],
    letterOfInterestSummary:
      'Uganda Fertiliser Manufacturing Co. Ltd proposes a urea and NPK fertiliser blending plant to reduce import dependency on Kenyan and Egyptian fertilisers.',
    companyContact: {
      companyName: 'Uganda Fertiliser Manufacturing Co. Ltd',
      address: 'Plot 14, Nile Avenue, Kampala, Uganda',
      contactPerson: 'Dr. Grace Atwine',
      phone: '+256 414 341 200',
      email: 'eoi@ugfertiliser.co.ug',
    },
  },
  LAND_BUSINESS_PROFILE: {
    landSizeSqm: 22000,
    proposedDevelopment:
      'NPK blending plant, 50,000 MT/year initial capacity, expandable to 150,000 MT/year. Adjacent warehouse and bagging hall.',
    establishedBusinesses:
      'Agrochemical distribution across 8 districts; annual turnover UGX 12 billion. Partners with NAADS and MAAIF.',
    similarProjects: 'Jinja Agro-Processing Facility (2020, 15,000 MT/y), Mbale Warehouse Hub (2023).',
  },
  UTILITIES_INFRASTRUCTURE: {
    waterDemand: '80 m³/day for dust suppression and staff facilities.',
    wastewaterPlan: 'Minimal process water; captured and reused for dust suppression.',
    powerDemandMW: 1.8,
    ictRequirements: 'Standard broadband (20 Mbps), ERP integration, CCTV.',
  },
  H3SE: {
    pastPerformanceSummary:
      'One minor LTI in 2023. NEMA Certificate of Compliance maintained since 2019.',
    hasH3sePolicy: true,
    managementSystemSummary:
      'OHSAS 18001 aligned. Fire suppression, secondary containment, emergency eyewash. Monthly safety committee.',
  },
  NATIONAL_CONTENT: {
    ugandanEmploymentHistory: 'All 47 current staff are Ugandan nationals. 80% of supplies sourced locally.',
    trainingPrograms: 'Annual bursary (5 students/year) at Kyambogo University. In-house apprenticeship for plant operators.',
  },
  DECLARATION: {
    signatoryName: 'Dr. Grace Atwine',
    signatoryTitle: 'Managing Director',
    agreedAt: '2026-01-30T08:00:00.000Z',
  },
}

const sabaSections: Record<string, object> = {
  PRELIMINARY_INFO: {
    legalStatus: 'Limited Liability Company — registered in Uganda (URSB)',
    powerOfAttorneySignatory: 'Hassan Sabir',
    shareholders: [
      { fullName: 'Hassan Sabir', idNumber: 'CM87654321UGXX', nationality: 'Ugandan' },
      { fullName: 'Fatuma Wambui', idNumber: 'KE-ID-1985-449922', nationality: 'Kenyan' },
    ],
    letterOfInterestSummary:
      'Sabastar General Trading Co. Ltd proposes a petroleum products warehousing and distribution hub for wholesale distribution across Western Uganda.',
    companyContact: {
      companyName: 'Sabastar General Trading Co. Ltd',
      address: 'Nakasero Road, Kampala, Uganda',
      contactPerson: 'Hassan Sabir',
      phone: '+256 772 123 456',
      email: 'sabastar@gmail.com',
    },
  },
  LAND_BUSINESS_PROFILE: {
    landSizeSqm: 5000,
    proposedDevelopment: 'Petroleum products storage tanks and a wholesale distribution depot.',
    establishedBusinesses: 'General trading in petroleum products, hardware, and construction materials since 2011.',
    similarProjects: 'None of comparable scale.',
  },
  UTILITIES_INFRASTRUCTURE: {
    waterDemand: '20 m³/day',
    wastewaterPlan: 'Connected to KIP sewerage system.',
    powerDemandMW: 0.4,
    ictRequirements: 'Standard broadband only.',
  },
  H3SE: {
    pastPerformanceSummary: 'No formal H3SE records maintained. No major incidents reported.',
    hasH3sePolicy: false,
    managementSystemSummary: 'Basic fire extinguishers on site. No formal management system.',
  },
  NATIONAL_CONTENT: {
    ugandanEmploymentHistory: '6 staff, all Ugandan.',
    trainingPrograms: 'No formal training programme.',
  },
  DECLARATION: {
    signatoryName: 'Hassan Sabir',
    signatoryTitle: 'Director',
    agreedAt: '2026-02-01T07:30:00.000Z',
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
    legalStatus: 'Private Limited Company — registered in Uganda',
    powerOfAttorneySignatory: 'Robert Ssempala',
    shareholders: [
      { fullName: 'Robert Ssempala', idNumber: 'CM91234567UGXX', nationality: 'Ugandan' },
      { fullName: 'Fatima Nakirya',  idNumber: 'CM88765432UGXX', nationality: 'Ugandan' },
    ],
    letterOfInterestSummary:
      'Nile Energy Ventures Ltd proposes an LPG cylinder filling and distribution facility serving Western Uganda and the DRC border market.',
    companyContact: {
      companyName: 'Nile Energy Ventures Ltd',
      address: 'Plot 22, Kampala Road, Kampala',
      contactPerson: 'Robert Ssempala',
      phone: '+256 700 100 200',
      email: 'invest@nileenergy.co.ug',
    },
  })
  await upsertSection(IDS.app4, 'LAND_BUSINESS_PROFILE', {
    landSizeSqm: 12000,
    proposedDevelopment:
      'LPG cylinder filling plant, 10,000 MT/year initial capacity, with storage spheres and reconditioning workshop.',
    establishedBusinesses: 'LPG retail distribution across 4 districts since 2018. Fleet of 12 bulk tankers.',
    similarProjects: 'Jinja LPG depot (2020, 2,000 MT storage).',
  })
  await upsertPayment(IDS.payNile, IDS.app4, 'STANBIC_TRANSFER', 'CONFIRMED', 'USD', '1000.00',
    'STB-TXN-20260410-00789', null, new Date('2026-04-10T15:30:00Z'), new Date('2026-04-11T09:00:00Z'))
  console.log('  ✓ app4: [no reference] [DRAFT] — Nile Energy (2/6 sections)')

  // ── Application timeline (Phase 2 Investor Onboarding schedule) ──────────
  // ON CONFLICT (position) DO NOTHING — admin edits are never overwritten.
  const milestones: [number, string, string, string, string, string | null][] = [
    [1, 'GENERIC',    'Investor registration opens — create your account and prepare your documents', '23 Jun 2026',          '2026-06-23T00:00:00+03:00', null],
    [2, 'GENERIC',    'KIP National Launch — virtual live broadcast',                                  '7 Jul 2026',           '2026-07-07T00:00:00+03:00', null],
    [3, 'SITE_VISIT', 'Investor site visits',                                                          '29 Jul – 12 Aug 2026', '2026-07-29T00:00:00+03:00', '2026-08-12T23:59:59+03:00'],
    [4, 'EOI_CALL',   'Call for Expressions of Interest — submission window open',                     '19 Aug – 2 Sep 2026',  '2026-08-19T00:00:00+03:00', '2026-09-02T23:59:59+03:00'],
    [5, 'GENERIC',    'Evaluation of Expressions of Interest',                                         '16 – 30 Sep 2026',     '2026-09-16T00:00:00+03:00', null],
    [6, 'GENERIC',    'Call for Request for Proposals',                                                '15 Oct – 12 Nov 2026', '2026-10-15T00:00:00+03:00', null],
    [7, 'GENERIC',    'RFP evaluation, due diligence, approvals & lease signing',                      'Nov 2026 – Feb 2027',  '2026-11-19T00:00:00+03:00', null],
    [8, 'GENERIC',    'Award of land & site handover',                                                 '5 Mar 2027',           '2027-03-05T00:00:00+03:00', null],
  ]
  for (const [position, kind, title, dateLabel, startsAt, endsAt] of milestones) {
    await pool.query(
      `INSERT INTO "TimelineMilestone" ("id", "position", "kind", "title", "dateLabel", "startsAt", "endsAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("position") DO NOTHING`,
      [randomUUID(), position, kind, title, dateLabel, startsAt, endsAt],
    )
  }
  console.log('  ✓ timeline: 8 Phase 2 milestones (admin-editable in /console/settings)')

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
