import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "InvestorOrg"
      ADD COLUMN IF NOT EXISTS "tin" TEXT
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`ALTER TABLE "InvestorOrg" DROP COLUMN IF EXISTS "tin"`)
}
