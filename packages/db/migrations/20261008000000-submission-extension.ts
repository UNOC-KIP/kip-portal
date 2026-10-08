import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Per-application submission extension.
 *
 *  - Application.submissionExtendedUntil — a deadline ADMIN can give one
 *    application past the window's close. NULL = the window is the deadline.
 *  - ReviewActionType.SUBMISSION_EXTENDED — the audit row written when it is
 *    set or removed.
 *
 * The enum addition runs on its own — Postgres refuses ALTER TYPE ... ADD VALUE
 * inside a transaction block.
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(
    `ALTER TYPE "ReviewActionType" ADD VALUE IF NOT EXISTS 'SUBMISSION_EXTENDED';`,
  )
  await qi.sequelize.query(
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "submissionExtendedUntil" TIMESTAMPTZ NULL;`,
  )
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  // Enum values cannot be dropped; the column can.
  await qi.sequelize.query(
    `ALTER TABLE "Application" DROP COLUMN IF EXISTS "submissionExtendedUntil";`,
  )
}
