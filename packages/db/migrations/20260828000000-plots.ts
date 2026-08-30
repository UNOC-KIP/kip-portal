import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Local mirror of the UNOC GIS "KIP Phase 2" plot register, plus Application.plotId
 * so an investor can apply for a specific plot. Populated by the plot sync job
 * (packages/db/src/sync-plots.ts). See @kip/db Plot.
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TABLE "Plot" (
      "id"           TEXT NOT NULL,
      "gisObjectId"  INTEGER NOT NULL,
      "plotName"     TEXT NOT NULL,
      "zone"         TEXT,
      "acreage"      DOUBLE PRECISION,
      "areaCategory" TEXT,
      "lot"          TEXT,
      "usage"        TEXT,
      "gisStatus"    TEXT,
      "gisInvestor"  TEXT,
      "available"    BOOLEAN NOT NULL DEFAULT true,
      "lastSyncedAt" TIMESTAMPTZ,
      "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "Plot_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Plot_gisObjectId_key" UNIQUE ("gisObjectId")
    );
    CREATE INDEX "Plot_zone_idx"      ON "Plot"("zone");
    CREATE INDEX "Plot_available_idx" ON "Plot"("available");

    ALTER TABLE "Application"
      ADD COLUMN "plotId" TEXT REFERENCES "Plot"("id") ON DELETE SET NULL;
    CREATE INDEX "Application_plotId_idx" ON "Application"("plotId");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    DROP INDEX IF EXISTS "Application_plotId_idx";
    ALTER TABLE "Application" DROP COLUMN IF EXISTS "plotId";
    DROP TABLE IF EXISTS "Plot";
  `)
}
