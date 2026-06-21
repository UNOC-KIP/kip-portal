import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Adds a partial unique index so only one PENDING payment can exist per application
 * at the DB level. This closes the concurrent-creation window that the application-level
 * SELECT FOR UPDATE guard cannot cover (two concurrent calls on an empty row set both
 * pass the lock check before either commits).
 *
 * The index only covers rows WHERE status = 'PENDING', so CONFIRMED / FAILED / REFUNDED
 * rows are unaffected — an application may have a history of multiple attempts.
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "payments_pending_per_app"
    ON "Payment" ("applicationId")
    WHERE status = 'PENDING'
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`DROP INDEX IF EXISTS "payments_pending_per_app"`)
}
