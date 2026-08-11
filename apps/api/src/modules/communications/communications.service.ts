import { randomUUID } from "node:crypto";
import {
  sequelize,
  Communication,
  CommunicationAttachment,
  CommunicationTemplate,
  Notification,
  User,
} from "@kip/db";
import {
  CommunicationChannel,
  CommunicationStatus,
  DeliveryStatus,
  applyMergeTokens,
  renderBodyHtml,
  sampleMergeVars,
  type MergeVars,
} from "@kip/shared";
import { env } from "../../env.js";
import { logger } from "../../logger.js";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../errors.js";
import { fireWebhook } from "../../webhooks.js";
import { announcementEmail, sendMail } from "../../mailer.js";
import { presignDownload, presignUpload } from "../../storage/index.js";
import type {
  CreateCommunicationInput,
  PresignAttachmentInput,
  RegisterAttachmentInput,
  SendTestInput,
  TemplateInput,
} from "./communications.schema.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Truncated so a verbose SMTP rejection can't bloat the row. */
function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.slice(0, 500);
}

function wantsEmail(channel: string): boolean {
  return channel !== CommunicationChannel.IN_APP;
}

// ─── Compose + send ──────────────────────────────────────────────────────────

/**
 * Persist a broadcast and its per-recipient delivery rows, then start sending.
 *
 * The rows are written first, in one transaction, so the send is restartable and
 * auditable: if the process dies mid-loop the un-sent rows are still there and
 * "Retry unsent" picks them up. Delivery itself runs **detached** from the HTTP
 * request — a 200-recipient send is paced across several minutes and would
 * otherwise time out the admin's browser.
 */
export async function createAndSend(
  input: CreateCommunicationInput,
  actorUserId: string,
): Promise<{ id: string; recipientCount: number }> {
  const communication = await sequelize.transaction(async (tx) => {
    const comm = await Communication.create(
      {
        subject: input.subject,
        body: input.body,
        channel: input.channel,
        audience: input.audience,
        audienceSummary: input.audienceSummary ?? null,
        filters: input.filters ?? null,
        templateId: input.templateId ?? null,
        createdById: actorUserId,
        status: CommunicationStatus.SENDING,
        recipientCount: input.recipients.length,
      },
      { transaction: tx },
    );

    // Merge tokens are resolved per recipient here, so the stored body is
    // exactly what that person receives — the inbox and the email can never
    // drift apart, and re-sending replays the same text.
    await Notification.bulkCreate(
      input.recipients.map((r) => {
        const vars: MergeVars = {
          company: r.company,
          repName: r.name,
          email: r.email,
          reference: r.reference,
        };
        return {
          userId: r.userId ?? null,
          communicationId: comm.id,
          email: r.email,
          channel: input.channel,
          subject: applyMergeTokens(input.subject, vars),
          body: applyMergeTokens(input.body, vars),
          status: DeliveryStatus.PENDING,
        };
      }),
      { transaction: tx },
    );

    return comm;
  });

  void deliver(communication.id).catch((err) => {
    logger.error({ err, communicationId: communication.id }, "broadcast delivery crashed");
  });

  return { id: communication.id, recipientCount: input.recipients.length };
}

/**
 * Drain the pending deliveries for one broadcast, one at a time, waiting
 * `EMAIL_SEND_INTERVAL_MS` between SMTP calls to stay under the shared
 * mailbox's ~30/min throttle. Every recipient's outcome is recorded, so a
 * partial failure is visible in the console instead of silent.
 */
export async function deliver(communicationId: string): Promise<void> {
  const communication = await Communication.findByPk(communicationId);
  if (!communication) return;

  const pending = await Notification.findAll({
    where: { communicationId, status: DeliveryStatus.PENDING },
    order: [["createdAt", "ASC"]],
  });

  const emailing = wantsEmail(communication.channel);
  let index = 0;

  for (const row of pending) {
    // Portal-only broadcasts have nothing to send — the row itself is the message.
    if (!emailing) {
      await row.update({ status: DeliveryStatus.SENT, sentAt: new Date(), error: null });
      continue;
    }

    if (!row.email) {
      await row.update({
        status: DeliveryStatus.FAILED,
        error: "Recipient has no email address",
      });
      continue;
    }

    if (index > 0 && env.EMAIL_SEND_INTERVAL_MS > 0) {
      await sleep(env.EMAIL_SEND_INTERVAL_MS);
    }
    index += 1;

    try {
      await sendMail({
        to: row.email,
        subject: row.subject,
        html: announcementEmail({
          subject: row.subject,
          bodyHtml: renderBodyHtml(row.body),
          portalUrl: env.PORTAL_PUBLIC_URL,
        }),
      });
      await row.update({ status: DeliveryStatus.SENT, sentAt: new Date(), error: null });
    } catch (err) {
      await row.update({ status: DeliveryStatus.FAILED, error: shortError(err) });
    }
  }

  await finalise(communicationId);
}

/** Recompute roll-up counts and settle the broadcast's terminal status. */
async function finalise(communicationId: string): Promise<void> {
  const communication = await Communication.findByPk(communicationId);
  if (!communication) return;

  const [sentCount, failedCount, pendingCount] = await Promise.all([
    Notification.count({ where: { communicationId, status: DeliveryStatus.SENT } }),
    Notification.count({ where: { communicationId, status: DeliveryStatus.FAILED } }),
    Notification.count({ where: { communicationId, status: DeliveryStatus.PENDING } }),
  ]);

  // Anything still pending means the loop was interrupted; stay in SENDING so
  // the console keeps offering "Retry unsent".
  const status =
    pendingCount > 0
      ? CommunicationStatus.SENDING
      : failedCount === 0
        ? CommunicationStatus.SENT
        : sentCount === 0
          ? CommunicationStatus.FAILED
          : CommunicationStatus.PARTIALLY_SENT;

  await communication.update({
    sentCount,
    failedCount,
    status,
    sentAt: communication.sentAt ?? new Date(),
  });

  if (pendingCount === 0) {
    await fireWebhook("communication-sent", {
      communicationId,
      subject: communication.subject,
      audience: communication.audience,
      channel: communication.channel,
      recipientCount: communication.recipientCount,
      sentCount,
      failedCount,
      status,
      sentAt: new Date().toISOString(),
    });
  }
}

/**
 * Re-queue everything that never made it out — failed rows plus any left
 * `PENDING` by an interrupted run — and start the loop again.
 */
export async function retryUnsent(communicationId: string): Promise<{ retried: number }> {
  const communication = await Communication.findByPk(communicationId);
  if (!communication) throw NotFound("Communication");

  await Notification.update(
    { status: DeliveryStatus.PENDING, error: null },
    { where: { communicationId, status: DeliveryStatus.FAILED } },
  );

  const retried = await Notification.count({
    where: { communicationId, status: DeliveryStatus.PENDING },
  });
  if (retried === 0) throw Conflict("Nothing left to send for this communication.");

  await communication.update({ status: CommunicationStatus.SENDING });

  void deliver(communicationId).catch((err) => {
    logger.error({ err, communicationId }, "broadcast retry crashed");
  });

  return { retried };
}

/** Send the draft to the acting admin only, with sample merge values filled in. */
export async function sendTest(input: SendTestInput, actorUserId: string): Promise<void> {
  const actor = await User.findByPk(actorUserId);
  if (!actor) throw NotFound("User");

  const vars = sampleMergeVars();
  const subject = applyMergeTokens(input.subject, vars);

  await sendMail({
    to: actor.email,
    subject: `[TEST] ${subject}`,
    html: announcementEmail({
      subject,
      bodyHtml: renderBodyHtml(applyMergeTokens(input.body, vars)),
      portalUrl: env.PORTAL_PUBLIC_URL,
    }),
  });
}

export async function deleteCommunication(communicationId: string): Promise<void> {
  const communication = await Communication.findByPk(communicationId);
  if (!communication) throw NotFound("Communication");
  if (communication.status === CommunicationStatus.SENDING) {
    throw Conflict("This communication is still sending — wait for it to finish.");
  }
  // Delivery rows cascade via the FK.
  await communication.destroy();
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function createTemplate(
  input: TemplateInput,
  actorUserId: string,
): Promise<{ id: string }> {
  const existing = await CommunicationTemplate.findOne({ where: { name: input.name } });
  if (existing) throw Conflict("A template with that name already exists.");

  const template = await CommunicationTemplate.create({
    name: input.name,
    subject: input.subject,
    body: input.body,
    description: input.description ?? null,
    createdById: actorUserId,
  });
  return { id: template.id };
}

export async function updateTemplate(
  templateId: string,
  input: TemplateInput,
): Promise<void> {
  const template = await CommunicationTemplate.findByPk(templateId);
  if (!template) throw NotFound("Template");

  const clash = await CommunicationTemplate.findOne({ where: { name: input.name } });
  if (clash && clash.id !== templateId) {
    throw Conflict("A template with that name already exists.");
  }

  await template.update({
    name: input.name,
    subject: input.subject,
    body: input.body,
    description: input.description ?? null,
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const template = await CommunicationTemplate.findByPk(templateId);
  if (!template) throw NotFound("Template");
  // Communications keep their copy of the text; templateId is SET NULL.
  await template.destroy();
}

// ─── Investor inbox ──────────────────────────────────────────────────────────

/** Mark one inbox message read. Owner-only — an id alone is not authorisation. */
export async function markRead(notificationId: string, actorUserId: string): Promise<void> {
  const row = await Notification.findByPk(notificationId);
  if (!row) throw NotFound("Message");
  if (!row.userId) throw BadRequest("This message has no portal recipient.");
  if (row.userId !== actorUserId) throw Forbidden("This message belongs to another user.");
  if (row.readAt) return;

  await row.update({ readAt: new Date() });
}

// ─── Attachments ─────────────────────────────────────────────────────────────

/**
 * S3 key for a broadcast attachment. The id is in the path so two uploads of
 * `map.pdf` cannot collide, and the original filename is kept as the last
 * segment so a downloaded file arrives with a name that means something.
 */
function attachmentKeyFor(attachmentId: string, filename: string): string {
  return `communications/attachments/${attachmentId}/${filename}`;
}

/** Hands out a PUT URL. Creates no row — see `registerAttachment`. */
export async function presignAttachment(
  input: PresignAttachmentInput,
): Promise<{ attachmentId: string; uploadUrl: string; storageKey: string }> {
  const attachmentId = randomUUID();
  const storageKey = attachmentKeyFor(attachmentId, input.filename);

  const { url: uploadUrl } = await presignUpload({
    key: storageKey,
    contentType: input.contentType,
    expiresInSeconds: 600,
  });

  return { attachmentId, uploadUrl, storageKey };
}

/**
 * Records the attachment once the browser's PUT has succeeded, and returns the
 * permanent download URL to paste into the body.
 *
 * The URL points at this API rather than at S3 directly: a presigned GET expires
 * in minutes, which is useless in an email someone opens next week, and making
 * the object public would put it outside the bucket's private policy. The
 * redirect route mints a fresh short-lived URL on each click instead.
 */
export async function registerAttachment(
  input: RegisterAttachmentInput,
  actor: { id: string },
): Promise<{ id: string; filename: string; url: string; sizeBytes: number }> {
  // Rebuilt rather than trusted, so a caller cannot register a row pointing at
  // some other prefix in the bucket.
  const expectedKey = attachmentKeyFor(input.attachmentId, input.filename);
  if (input.storageKey !== expectedKey) {
    throw BadRequest("Storage key does not match this upload");
  }

  const existing = await CommunicationAttachment.findByPk(input.attachmentId);
  if (existing) throw Conflict("That attachment has already been registered");

  const row = await CommunicationAttachment.create({
    id: input.attachmentId,
    filename: input.filename,
    storageKey: input.storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedById: actor.id,
  });

  return {
    id: row.id,
    filename: row.filename,
    url: attachmentUrl(row.id),
    sizeBytes: row.sizeBytes,
  };
}

/** The public, permanent link that goes in the body. */
export function attachmentUrl(attachmentId: string): string {
  return `${env.API_PUBLIC_URL}/communications/attachments/${attachmentId}`;
}

/**
 * Resolves an attachment to a short-lived S3 URL for the download redirect.
 *
 * Intentionally unauthenticated: recipients drawn from the notify list have no
 * account, so requiring a session would make the link dead for exactly the
 * audience most likely to receive a public announcement. The unguessable id is
 * the capability — the same security model as a presigned URL, without the
 * expiry. Do not add an enumerable identifier to this route.
 */
export async function resolveAttachmentDownload(
  attachmentId: string,
): Promise<string> {
  const row = await CommunicationAttachment.findByPk(attachmentId);
  if (!row) throw NotFound("Attachment");

  // Best-effort: a failed counter must never block the download.
  row.increment("downloadCount").catch((err) => {
    logger.warn({ err, attachmentId }, "failed to bump attachment downloadCount");
  });

  return presignDownload({ key: row.storageKey, expiresInSeconds: 300 });
}
