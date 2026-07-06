import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "InvestorOrg"
      ADD COLUMN IF NOT EXISTS "tradingName" TEXT,
      ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "ursbRegistrationNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "companyType" TEXT,
      ADD COLUMN IF NOT EXISTS "businessSector" TEXT
  `)
  await qi.sequelize.query(`
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "designation" TEXT,
      ADD COLUMN IF NOT EXISTS "phone" TEXT
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "InvestorOrg"
      DROP COLUMN IF EXISTS "tradingName",
      DROP COLUMN IF EXISTS "registrationNumber",
      DROP COLUMN IF EXISTS "ursbRegistrationNumber",
      DROP COLUMN IF EXISTS "companyType",
      DROP COLUMN IF EXISTS "businessSector"
  `)
  await qi.sequelize.query(`
    ALTER TABLE "User"
      DROP COLUMN IF EXISTS "designation",
      DROP COLUMN IF EXISTS "phone"
  `)
}
