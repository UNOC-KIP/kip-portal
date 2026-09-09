import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/** Fee breakdown (subtotal + 18% VAT; `amount` becomes the VAT-inclusive total)
 * and invoice-tracking columns for the finance workflow. */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "Payment"
      ADD COLUMN IF NOT EXISTS "subtotalAmount"      DECIMAL(14,2),
      ADD COLUMN IF NOT EXISTS "vatAmount"           DECIMAL(14,2),
      ADD COLUMN IF NOT EXISTS "invoiceStatus"       VARCHAR(32) NOT NULL DEFAULT 'NOT_SENT',
      ADD COLUMN IF NOT EXISTS "invoiceSentAt"       TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "invoiceSentByUserId" UUID,
      ADD COLUMN IF NOT EXISTS "invoiceDocumentId"   UUID;
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "Payment"
      DROP COLUMN IF EXISTS "subtotalAmount",
      DROP COLUMN IF EXISTS "vatAmount",
      DROP COLUMN IF EXISTS "invoiceStatus",
      DROP COLUMN IF EXISTS "invoiceSentAt",
      DROP COLUMN IF EXISTS "invoiceSentByUserId",
      DROP COLUMN IF EXISTS "invoiceDocumentId";
  `)
}
