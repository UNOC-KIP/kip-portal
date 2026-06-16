import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  // Add new ApplicationStatus values
  await qi.sequelize.query(`ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'LAC_REVIEW'`)
  await qi.sequelize.query(`ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'LAC_APPROVED'`)
  await qi.sequelize.query(`ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'LAC_REJECTED'`)
  await qi.sequelize.query(`ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ALLOCATED'`)

  // Rebuild ApplicationStatus without old pipeline statuses
  await qi.sequelize.query(`ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old"`)
  await qi.sequelize.query(`
    CREATE TYPE "ApplicationStatus" AS ENUM (
      'DRAFT_PAYMENT_PENDING','DRAFT','SUBMITTED','UNDER_TC_REVIEW',
      'TC_CLARIFICATION_REQUESTED','SHORTLISTED','NOT_SHORTLISTED',
      'LAC_REVIEW','LAC_APPROVED','LAC_REJECTED','EXCO_REVIEW','ALLOCATED','WITHDRAWN'
    )
  `)
  await qi.sequelize.query(`
    ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Application"
      ALTER COLUMN "status" TYPE "ApplicationStatus"
      USING "status"::text::"ApplicationStatus";
    ALTER TABLE "Application"
      ALTER COLUMN "status" SET DEFAULT 'DRAFT_PAYMENT_PENDING'::"ApplicationStatus";
    ALTER TABLE "ReviewAction"
      ALTER COLUMN "fromStatus" TYPE "ApplicationStatus"
      USING "fromStatus"::text::"ApplicationStatus";
    ALTER TABLE "ReviewAction"
      ALTER COLUMN "toStatus" TYPE "ApplicationStatus"
      USING "toStatus"::text::"ApplicationStatus";
    DROP TYPE "ApplicationStatus_old";
  `)

  // Rebuild UserRole without old roles
  await qi.sequelize.query(`ALTER TYPE "UserRole" RENAME TO "UserRole_old"`)
  await qi.sequelize.query(`
    CREATE TYPE "UserRole" AS ENUM (
      'INVESTOR','TC_MEMBER','TC_CHAIR','LAC_MEMBER','EXCO_MEMBER','ADMIN'
    )
  `)
  await qi.sequelize.query(`
    ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "User"
      ALTER COLUMN "role" TYPE "UserRole"
      USING "role"::text::"UserRole";
    ALTER TABLE "User"
      ALTER COLUMN "role" SET DEFAULT 'INVESTOR'::"UserRole";
    DROP TYPE "UserRole_old";
  `)

  // Add new ReviewActionType values
  await qi.sequelize.query(`ALTER TYPE "ReviewActionType" ADD VALUE IF NOT EXISTS 'SHORTLISTED'`)
  await qi.sequelize.query(`ALTER TYPE "ReviewActionType" ADD VALUE IF NOT EXISTS 'NOT_SHORTLISTED'`)
  await qi.sequelize.query(`ALTER TYPE "ReviewActionType" ADD VALUE IF NOT EXISTS 'LAC_APPROVED'`)
  await qi.sequelize.query(`ALTER TYPE "ReviewActionType" ADD VALUE IF NOT EXISTS 'LAC_REJECTED'`)
  await qi.sequelize.query(`ALTER TYPE "ReviewActionType" ADD VALUE IF NOT EXISTS 'ALLOCATED'`)

  // Application.reference: make nullable
  await qi.sequelize.query(`ALTER TABLE "Application" ALTER COLUMN "reference" DROP NOT NULL`)

  // ApplicationWindow.sequenceCounter
  await qi.sequelize.query(`
    ALTER TABLE "ApplicationWindow"
      ADD COLUMN IF NOT EXISTS "sequenceCounter" INTEGER NOT NULL DEFAULT 0
  `)

  // ClarificationRequest table
  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "ClarificationRequest" (
      "id"            TEXT         NOT NULL,
      "applicationId" TEXT         NOT NULL,
      "requestedById" TEXT         NOT NULL,
      "notes"         TEXT         NOT NULL,
      "response"      TEXT,
      "respondedAt"   TIMESTAMP(3),
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ClarificationRequest_pkey" PRIMARY KEY ("id")
    );
    ALTER TABLE "ClarificationRequest"
      ADD CONSTRAINT "ClarificationRequest_applicationId_fkey"
      FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "ClarificationRequest"
      ADD CONSTRAINT "ClarificationRequest_requestedById_fkey"
      FOREIGN KEY ("requestedById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    CREATE INDEX IF NOT EXISTS "ClarificationRequest_applicationId_idx"
      ON "ClarificationRequest"("applicationId");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`DROP TABLE IF EXISTS "ClarificationRequest" CASCADE`)
  await qi.sequelize.query(`ALTER TABLE "ApplicationWindow" DROP COLUMN IF EXISTS "sequenceCounter"`)
  // Note: PostgreSQL does not support removing enum values; full rollback requires schema recreation
}
