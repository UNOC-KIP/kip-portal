import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

/**
 * Files an admin can hand out from a broadcast.
 *
 * Deliberately NOT a per-message attachment table. The shared Office 365
 * mailbox is capped at ~30 messages/minute and around 25MB per message, so
 * attaching a 3MB PDF to a 500-recipient broadcast would push ~1.5GB through
 * the same mailbox that carries credentials and password resets. Instead the
 * file is uploaded to S3 once and the body carries a link to it, which is why
 * this table has no `communicationId` — one upload can be linked from several
 * broadcasts, and it exists before any `Communication` row does.
 *
 * `id` doubles as the download capability: the public download route takes no
 * session because notify-list recipients have no account, so an unguessable
 * UUID is the only thing standing in front of the object (the same model a
 * presigned URL uses, minus the expiry).
 */
export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TABLE "CommunicationAttachment" (
      "id"            TEXT NOT NULL,
      "filename"      TEXT NOT NULL,
      "storageKey"    TEXT NOT NULL,
      "mimeType"      TEXT NOT NULL,
      "sizeBytes"     INTEGER NOT NULL,
      "downloadCount" INTEGER NOT NULL DEFAULT 0,
      "uploadedById"  TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "CommunicationAttachment_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "CommunicationAttachment_createdAt_idx"
      ON "CommunicationAttachment" ("createdAt" DESC);
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`DROP TABLE IF EXISTS "CommunicationAttachment";`)
}
