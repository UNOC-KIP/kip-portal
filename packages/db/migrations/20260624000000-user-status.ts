import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TYPE "UserStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED');
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'PENDING_REVIEW';
    CREATE INDEX "User_status_idx" ON "User"("status");
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE "User" DROP COLUMN IF EXISTS "status";
    DROP TYPE IF EXISTS "UserStatus";
  `)
}
