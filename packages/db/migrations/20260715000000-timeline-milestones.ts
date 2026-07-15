import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TABLE "TimelineMilestone" (
      "id"        TEXT NOT NULL,
      "position"  INTEGER NOT NULL,
      "kind"      TEXT NOT NULL DEFAULT 'GENERIC',
      "title"     TEXT NOT NULL,
      "dateLabel" TEXT NOT NULL,
      "startsAt"  TIMESTAMPTZ NOT NULL,
      "endsAt"    TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "TimelineMilestone_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TimelineMilestone_position_key" UNIQUE ("position"),
      CONSTRAINT "TimelineMilestone_kind_check"
        CHECK ("kind" IN ('GENERIC', 'SITE_VISIT', 'EOI_CALL'))
    );
    CREATE INDEX "TimelineMilestone_startsAt_idx" ON "TimelineMilestone"("startsAt");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`DROP TABLE IF EXISTS "TimelineMilestone";`)
}
