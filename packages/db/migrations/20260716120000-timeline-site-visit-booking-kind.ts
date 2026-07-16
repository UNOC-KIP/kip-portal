import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Widen the TimelineMilestone kind CHECK to allow SITE_VISIT_BOOKING — a
 * dedicated booking-window milestone, distinct from the SITE_VISIT visits
 * themselves. See @kip/shared timeline.ts.
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "TimelineMilestone"
      DROP CONSTRAINT IF EXISTS "TimelineMilestone_kind_check",
      ADD CONSTRAINT "TimelineMilestone_kind_check"
        CHECK ("kind" IN ('GENERIC', 'SITE_VISIT_BOOKING', 'SITE_VISIT', 'EOI_CALL'));
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "TimelineMilestone"
      DROP CONSTRAINT IF EXISTS "TimelineMilestone_kind_check",
      ADD CONSTRAINT "TimelineMilestone_kind_check"
        CHECK ("kind" IN ('GENERIC', 'SITE_VISIT', 'EOI_CALL'));
  `)
}
