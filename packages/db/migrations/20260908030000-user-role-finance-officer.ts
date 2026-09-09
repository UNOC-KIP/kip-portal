import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Enum additions for the finance workspace:
 *  - UserRole.FINANCE_OFFICER — the finance officer account/role.
 *  - DocumentKind.FEE_INVOICE — the finance-attached fee invoice document.
 *
 * `ADD VALUE IF NOT EXISTS` is idempotent. Each runs as its own statement —
 * Postgres refuses ALTER TYPE ... ADD VALUE inside a transaction block.
 * Irreversible by design (Postgres cannot drop an enum value).
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE_OFFICER';`,
  )
  await qi.sequelize.query(
    `ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'FEE_INVOICE';`,
  )
}

export const down: MigrationFn<QueryInterface> = async () => {
  /* no-op — enum values cannot be dropped */
}
