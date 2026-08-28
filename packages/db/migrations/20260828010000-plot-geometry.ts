import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/** Store each plot's shape (GeoJSON, WGS84) and centroid so the portal can show
 * plots on a map. Populated by the plot sync (packages/db/src/sync-plots.ts). */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "Plot"
      ADD COLUMN "geometry"    TEXT,
      ADD COLUMN "centroidLat" DOUBLE PRECISION,
      ADD COLUMN "centroidLng" DOUBLE PRECISION;
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "Plot"
      DROP COLUMN IF EXISTS "geometry",
      DROP COLUMN IF EXISTS "centroidLat",
      DROP COLUMN IF EXISTS "centroidLng";
  `)
}
