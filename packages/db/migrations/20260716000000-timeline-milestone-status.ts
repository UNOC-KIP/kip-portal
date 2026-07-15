import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "TimelineMilestone"
      ADD COLUMN "status" TEXT NOT NULL DEFAULT 'AUTO',
      ADD CONSTRAINT "TimelineMilestone_status_check"
        CHECK ("status" IN ('AUTO', 'UPCOMING', 'CURRENT', 'COMPLETED'));
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "TimelineMilestone"
      DROP CONSTRAINT IF EXISTS "TimelineMilestone_status_check",
      DROP COLUMN IF EXISTS "status";
  `)
}
