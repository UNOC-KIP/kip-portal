import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TYPE "InquiryChannel" AS ENUM ('CONTACT_FORM', 'LIVE_CHAT');
    CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'RESPONDED', 'CLOSED');

    CREATE TABLE "Inquiry" (
      "id"            TEXT NOT NULL,
      "name"          TEXT NOT NULL,
      "email"         TEXT NOT NULL,
      "company"       TEXT,
      "subject"       TEXT,
      "message"       TEXT NOT NULL,
      "channel"       "InquiryChannel" NOT NULL,
      "status"        "InquiryStatus" NOT NULL DEFAULT 'NEW',
      "respondedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "respondedAt"   TIMESTAMPTZ,
      "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");
    CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

    CREATE TABLE "NotifySignup" (
      "id"         TEXT NOT NULL,
      "email"      TEXT NOT NULL,
      "notifiedAt" TIMESTAMPTZ,
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "NotifySignup_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "NotifySignup_email_key" ON "NotifySignup"("email");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    DROP TABLE IF EXISTS "NotifySignup";
    DROP TABLE IF EXISTS "Inquiry";
    DROP TYPE IF EXISTS "InquiryStatus";
    DROP TYPE IF EXISTS "InquiryChannel";
  `)
}
