import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Communications module — admin-composed broadcasts to investors / staff.
 *
 * `Notification` already existed from the initial migration but was never read
 * or written by any code, so rather than add a third table it is widened here
 * into the per-recipient delivery log (and, for recipients who have a portal
 * account, the row that backs the investor Messages inbox). `userId` has to
 * become nullable because notify-list recipients are bare email addresses with
 * no `User` row.
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TYPE "CommunicationStatus" AS ENUM
      ('DRAFT', 'SENDING', 'SENT', 'PARTIALLY_SENT', 'FAILED');
    CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

    CREATE TABLE "CommunicationTemplate" (
      "id"          TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      "subject"     TEXT NOT NULL,
      "body"        TEXT NOT NULL,
      "description" TEXT,
      "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CommunicationTemplate_name_key" UNIQUE ("name")
    );

    CREATE TABLE "Communication" (
      "id"              TEXT NOT NULL,
      "subject"         TEXT NOT NULL,
      "body"            TEXT NOT NULL,
      "channel"         TEXT NOT NULL DEFAULT 'EMAIL_AND_IN_APP',
      "audience"        TEXT NOT NULL,
      "audienceSummary" TEXT,
      "filters"         JSONB,
      "status"          "CommunicationStatus" NOT NULL DEFAULT 'SENDING',
      "recipientCount"  INTEGER NOT NULL DEFAULT 0,
      "sentCount"       INTEGER NOT NULL DEFAULT 0,
      "failedCount"     INTEGER NOT NULL DEFAULT 0,
      "templateId"      TEXT REFERENCES "CommunicationTemplate"("id") ON DELETE SET NULL,
      "createdById"     TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "sentAt"          TIMESTAMPTZ,
      "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "Communication_status_idx"    ON "Communication"("status");
    CREATE INDEX "Communication_createdAt_idx" ON "Communication"("createdAt");

    ALTER TABLE "Notification"
      ALTER COLUMN "userId" DROP NOT NULL,
      ADD COLUMN "communicationId" TEXT REFERENCES "Communication"("id") ON DELETE CASCADE,
      ADD COLUMN "email"           TEXT,
      ADD COLUMN "status"          "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
      ADD COLUMN "error"           TEXT;

    CREATE INDEX "Notification_communicationId_idx" ON "Notification"("communicationId");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    DROP INDEX IF EXISTS "Notification_communicationId_idx";
    ALTER TABLE "Notification"
      DROP COLUMN IF EXISTS "communicationId",
      DROP COLUMN IF EXISTS "email",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "error";
    DELETE FROM "Notification" WHERE "userId" IS NULL;
    ALTER TABLE "Notification" ALTER COLUMN "userId" SET NOT NULL;

    DROP TABLE IF EXISTS "Communication";
    DROP TABLE IF EXISTS "CommunicationTemplate";
    DROP TYPE IF EXISTS "DeliveryStatus";
    DROP TYPE IF EXISTS "CommunicationStatus";
  `)
}
