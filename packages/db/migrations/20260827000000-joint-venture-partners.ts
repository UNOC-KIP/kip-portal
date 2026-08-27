import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Joint-venture support: a table of co-venturer companies per application, and
 * a Document.partnerId so an attachment can be tied to the venture it belongs
 * to. See @kip/db ApplicationPartner and @kip/shared partner schemas.
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TABLE "ApplicationPartner" (
      "id"                     TEXT NOT NULL,
      "applicationId"          TEXT NOT NULL REFERENCES "Application"("id") ON DELETE CASCADE,
      "legalName"              TEXT NOT NULL,
      "tradingName"            TEXT,
      "registrationNumber"     TEXT,
      "ursbRegistrationNumber" TEXT,
      "companyType"            TEXT,
      "businessSector"         TEXT,
      "countryOfIncorporation" TEXT,
      "tin"                    TEXT,
      "address"                TEXT,
      "phone"                  TEXT,
      "email"                  TEXT,
      "isLead"                 BOOLEAN NOT NULL DEFAULT false,
      "position"               INTEGER NOT NULL DEFAULT 0,
      "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "ApplicationPartner_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "ApplicationPartner_applicationId_idx" ON "ApplicationPartner"("applicationId");

    ALTER TABLE "Document"
      ADD COLUMN "partnerId" TEXT REFERENCES "ApplicationPartner"("id") ON DELETE SET NULL;
    CREATE INDEX "Document_partnerId_idx" ON "Document"("partnerId");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    DROP INDEX IF EXISTS "Document_partnerId_idx";
    ALTER TABLE "Document" DROP COLUMN IF EXISTS "partnerId";
    DROP TABLE IF EXISTS "ApplicationPartner";
  `)
}
