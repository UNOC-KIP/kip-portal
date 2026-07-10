import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TYPE "SiteVisitStatus" AS ENUM ('NEW', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

    CREATE TABLE "SiteVisitBooking" (
      "id"            TEXT NOT NULL,
      "userId"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "investorOrgId" TEXT REFERENCES "InvestorOrg"("id") ON DELETE SET NULL,
      "zone"          TEXT NOT NULL,
      "landUse"       TEXT NOT NULL,
      "description"   TEXT NOT NULL,
      "acres"         INTEGER NOT NULL,
      "status"        "SiteVisitStatus" NOT NULL DEFAULT 'NEW',
      "scheduledAt"   TIMESTAMPTZ,
      "handledById"   TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "handledAt"     TIMESTAMPTZ,
      "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "SiteVisitBooking_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "SiteVisitBooking_acres_check" CHECK ("acres" >= 1 AND "acres" <= 100)
    );
    CREATE INDEX "SiteVisitBooking_status_idx"    ON "SiteVisitBooking"("status");
    CREATE INDEX "SiteVisitBooking_userId_idx"    ON "SiteVisitBooking"("userId");
    CREATE INDEX "SiteVisitBooking_createdAt_idx" ON "SiteVisitBooking"("createdAt");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    DROP TABLE IF EXISTS "SiteVisitBooking";
    DROP TYPE IF EXISTS "SiteVisitStatus";
  `)
}
