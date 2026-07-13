import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

// Tracks when a user last set their own password. NULL means the account is
// still on the auto-generated password emailed at registration/invitation — the
// portal uses this to nudge investors to choose their own password.
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMPTZ
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "User"
      DROP COLUMN IF EXISTS "passwordChangedAt"
  `)
}
