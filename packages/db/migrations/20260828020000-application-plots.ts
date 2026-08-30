import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/** Applications may select several plots. Join table; total acreage across the
 * set auto-fills the required land area. See @kip/db ApplicationPlot. */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TABLE "ApplicationPlot" (
      "id"            TEXT NOT NULL,
      "applicationId" TEXT NOT NULL REFERENCES "Application"("id") ON DELETE CASCADE,
      "plotId"        TEXT NOT NULL REFERENCES "Plot"("id") ON DELETE CASCADE,
      "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "ApplicationPlot_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ApplicationPlot_app_plot_key" UNIQUE ("applicationId","plotId")
    );
    CREATE INDEX "ApplicationPlot_applicationId_idx" ON "ApplicationPlot"("applicationId");
    CREATE INDEX "ApplicationPlot_plotId_idx"        ON "ApplicationPlot"("plotId");

    -- Backfill from the single-plot column so existing selections survive.
    INSERT INTO "ApplicationPlot" ("id","applicationId","plotId","createdAt")
    SELECT gen_random_uuid()::text, "id", "plotId", now()
    FROM "Application"
    WHERE "plotId" IS NOT NULL
    ON CONFLICT DO NOTHING;
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`DROP TABLE IF EXISTS "ApplicationPlot";`)
}
