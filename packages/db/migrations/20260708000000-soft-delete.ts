import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

// Soft delete (Sequelize paranoid mode) for admin-manageable records.
// Rows with a non-null deletedAt are excluded from all default-scope queries.
const TABLES = ['User', 'InvestorOrg', 'Application', 'ApplicationWindow', 'Payment']

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  for (const table of TABLES) {
    await qi.sequelize.query(`
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL;
    `)
  }
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  for (const table of TABLES) {
    await qi.sequelize.query(`
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "deletedAt";
    `)
  }
}
