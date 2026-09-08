import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/** Road/street a plot fronts, from the plot register. Shown in the plot picker
 * and attached to a selection so reviewers can locate the plot quickly. */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "Plot" ADD COLUMN IF NOT EXISTS "street" VARCHAR(255);
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "Plot" DROP COLUMN IF EXISTS "street";
  `)
}
