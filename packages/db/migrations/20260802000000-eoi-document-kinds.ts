import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Widen the "DocumentKind" enum to cover every attachment the UNOC EOI Master
 * Content Specification asks for. The original 12 values only covered about
 * half of them, so the wizard had nothing to file a tax clearance certificate,
 * an ISO certificate or a signed declaration page under.
 *
 * `ADD VALUE IF NOT EXISTS` is idempotent, which matters because the Vercel
 * admin build runs migrations on every deploy. Each statement is issued
 * separately: Postgres refuses to run ALTER TYPE ... ADD VALUE inside a
 * transaction block alongside other statements on the same type.
 *
 * Irreversible by design — Postgres cannot drop a value from an enum, and the
 * down migration would have to rewrite every row that used one.
 */
const NEW_KINDS = [
  'MEMORANDUM_AND_ARTICLES',
  'UGANDA_BRANCH_REGISTRATION',
  'BENEFICIAL_OWNERSHIP_FORM',
  'TAX_CLEARANCE_CERTIFICATE',
  'NSSF_COMPLIANCE_CERTIFICATE',
  'TRADING_LICENCE',
  'H3SE_CERTIFICATE',
  'H3SE_ORGANOGRAM',
  'H3SE_AUDIT_REPORT',
  'TRAINING_RECORD',
  'PROCUREMENT_RECORD',
  'SIGNED_DECLARATION',
] as const

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  for (const kind of NEW_KINDS) {
    await qi.sequelize.query(
      `ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS '${kind}';`,
    )
  }
}

export const down: MigrationFn<QueryInterface> = async () => {
  // No-op: Postgres offers no way to remove a value from an enum type.
}
