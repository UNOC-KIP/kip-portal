import { z } from "zod";
import {
  CommunicationAudience,
  CommunicationChannel,
  COMMUNICATION_ATTACHMENT_MAX_BYTES,
  COMMUNICATION_ATTACHMENT_TYPES,
} from "@kip/shared";
import { env } from "../../env.js";

/**
 * One resolved recipient. The admin console resolves the audience client-side
 * (it already holds every investor row) and posts the explicit list, so the
 * count shown on screen is provably the count that gets mailed. That makes
 * validation here the only guard on who receives a broadcast — hence the email
 * check, the duplicate rejection and the hard cap.
 */
export const recipientSchema = z.object({
  // NOT `.uuid()`: `User.id` is a TEXT column and rows predating the Sequelize
  // migration carry Prisma-era cuids, so uuid validation would reject every
  // real investor. The FK insert is the actual guard on this value.
  userId: z.string().min(1).max(64).nullable().optional(),
  email: z.string().email("Each recipient needs a valid email address"),
  name: z.string().max(200).default(""),
  company: z.string().max(300).default(""),
  reference: z.string().max(60).default(""),
});

export const createCommunicationSchema = z
  .object({
    subject: z.string().trim().min(3, "Subject is too short").max(200),
    body: z.string().trim().min(1, "Body cannot be empty").max(20_000),
    channel: z.nativeEnum(CommunicationChannel).default(CommunicationChannel.EMAIL_AND_IN_APP),
    audience: z.nativeEnum(CommunicationAudience),
    audienceSummary: z.string().max(500).optional(),
    filters: z.record(z.unknown()).optional(),
    // Communications, templates and delivery rows are all created by the new
    // models with a UUIDV4 default, so uuid validation is safe for those ids —
    // unlike `userId` above.
    templateId: z.string().uuid().optional(),
    recipients: z
      .array(recipientSchema)
      .min(1, "Select at least one recipient")
      .max(
        env.COMMUNICATION_MAX_RECIPIENTS,
        `A single broadcast is capped at ${env.COMMUNICATION_MAX_RECIPIENTS} recipients`,
      ),
  })
  .superRefine((val, ctx) => {
    const seen = new Set<string>();
    for (const r of val.recipients) {
      const key = r.email.trim().toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recipients"],
          message: `Duplicate recipient: ${r.email}`,
        });
        return;
      }
      seen.add(key);
    }
  });

/**
 * A test send always goes to the acting admin's own address — deliberately no
 * `to` field, so this endpoint cannot be used to mail arbitrary people.
 */
export const sendTestSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(20_000),
});

export const templateSchema = z.object({
  name: z.string().trim().min(2, "Template needs a name").max(120),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(20_000),
  description: z.string().trim().max(500).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
export type SendTestInput = z.infer<typeof sendTestSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type RecipientInput = z.infer<typeof recipientSchema>;

/**
 * Broadcast attachment contracts.
 *
 * Mirrors the documents module's register-after-upload shape: presign hands out
 * a PUT URL but creates no row, and the row is written only once the browser's
 * PUT has succeeded. A row created up front would leave the composer offering a
 * link to an object that was never stored.
 */
const attachmentFilename = z
  .string()
  .trim()
  .min(1, "Filename is required")
  .max(200, "Filename is too long")
  // Anything that could climb out of the key prefix or confuse the S3 key.
  .regex(/^[^/\:*?"<>|\r\n]+$/, "Filename contains invalid characters")
  .refine((v) => !v.includes(".."), "Filename contains invalid characters");

const attachmentContentType = z
  .string()
  .refine(
    (v) => !!COMMUNICATION_ATTACHMENT_TYPES[v],
    "That file type is not supported",
  );

const attachmentSize = z
  .number()
  .int()
  .positive("That file is empty")
  .max(COMMUNICATION_ATTACHMENT_MAX_BYTES, "Attachments must not exceed 25MB");

export const presignAttachmentSchema = z.object({
  filename: attachmentFilename,
  contentType: attachmentContentType,
  sizeBytes: attachmentSize,
});

export const registerAttachmentSchema = z.object({
  attachmentId: z.string().uuid(),
  filename: attachmentFilename,
  storageKey: z.string().min(1),
  mimeType: attachmentContentType,
  sizeBytes: attachmentSize,
});

export type PresignAttachmentInput = z.infer<typeof presignAttachmentSchema>;
export type RegisterAttachmentInput = z.infer<typeof registerAttachmentSchema>;
