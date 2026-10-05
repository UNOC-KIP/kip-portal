import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Committee review — real TC decisions and the LAC module.
 *
 *  - ApplicationStatus.LAC_CLARIFICATION_REQUESTED — the LAC asked the investor
 *    a question; the TC already had its own (TC_CLARIFICATION_REQUESTED).
 *  - ReviewActionType.ADMIN_STATUS_OVERRIDE — written by the admin stage
 *    override since it shipped, but never added to the enum, so every override
 *    failed on insert. Added here.
 *  - ClarificationRequest.committee — which committee asked (TC | LAC), so the
 *    investor's reply returns the application to the right queue.
 *  - LacReview — one recommendation per LAC member per application, recorded
 *    before the committee's single final decision.
 *
 * Enum additions run as separate statements — Postgres refuses
 * ALTER TYPE ... ADD VALUE inside a transaction block.
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(
    `ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'LAC_CLARIFICATION_REQUESTED';`,
  )
  await qi.sequelize.query(
    `ALTER TYPE "ReviewActionType" ADD VALUE IF NOT EXISTS 'ADMIN_STATUS_OVERRIDE';`,
  )

  await qi.sequelize.query(`
    ALTER TABLE "ClarificationRequest"
      ADD COLUMN IF NOT EXISTS "committee" TEXT NOT NULL DEFAULT 'TC';
    ALTER TABLE "ClarificationRequest"
      DROP CONSTRAINT IF EXISTS "ClarificationRequest_committee_check";
    ALTER TABLE "ClarificationRequest"
      ADD CONSTRAINT "ClarificationRequest_committee_check" CHECK ("committee" IN ('TC', 'LAC'));
  `)

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "LacReview" (
      "id"             TEXT NOT NULL,
      "applicationId"  TEXT NOT NULL REFERENCES "Application"("id") ON DELETE CASCADE,
      "reviewerId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
      "recommendation" TEXT NOT NULL,
      "notes"          TEXT NOT NULL,
      "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "LacReview_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "LacReview_recommendation_check"
        CHECK ("recommendation" IN ('APPROVE', 'REJECT', 'MORE_INFO'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "LacReview_applicationId_reviewerId_key"
      ON "LacReview"("applicationId", "reviewerId");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  // Enum values cannot be dropped; the table and column can.
  await qi.sequelize.query(`
    DROP TABLE IF EXISTS "LacReview";
    ALTER TABLE "ClarificationRequest" DROP CONSTRAINT IF EXISTS "ClarificationRequest_committee_check";
    ALTER TABLE "ClarificationRequest" DROP COLUMN IF EXISTS "committee";
  `)
}
