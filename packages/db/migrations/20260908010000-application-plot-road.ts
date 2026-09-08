import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/** Snapshot of the plot's road at selection time, denormalised onto the join
 * row so the review views show it without a lookup (faster team review). */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "ApplicationPlot" ADD COLUMN IF NOT EXISTS "road" VARCHAR(255);
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "ApplicationPlot" DROP COLUMN IF EXISTS "road";
  `)
}
