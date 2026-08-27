import { z } from "zod";
import { DocumentKind, EOI_MAX_FILE_BYTES } from "@kip/shared";

/**
 * EOI attachment contracts.
 *
 * The PDF-only / 5MB rules come from spec §8 and are enforced here as well as
 * in the browser — a client-side check is a courtesy, not a control, and the
 * presign step is what actually hands out write access to the bucket.
 */

const filename = z
  .string()
  .trim()
  .min(1, "Filename is required")
  .max(200, "Filename is too long")
  // Anything that could climb out of the key prefix or confuse the S3 key.
  .regex(/^[^/\\:*?"<>|\r\n]+$/, "Filename contains invalid characters")
  .refine((v) => !v.includes(".."), "Filename contains invalid characters");

export const presignDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  partnerId: z.string().uuid().optional(),
  kind: z.nativeEnum(DocumentKind),
  filename,
  contentType: z.literal("application/pdf", {
    errorMap: () => ({ message: "Attachments must be PDF files" }),
  }),
  sizeBytes: z
    .number()
    .int()
    .positive("That file is empty")
    .max(EOI_MAX_FILE_BYTES, "Attachments must not exceed 5MB"),
});
export type PresignDocumentInput = z.infer<typeof presignDocumentSchema>;

/**
 * Registers a document only AFTER the browser has PUT it to S3.
 *
 * Deliberately not merged into the presign step: a row created up front would
 * still be there if the upload failed, and the submit guard counts rows — an
 * investor would be told their certificate was attached when the bucket held
 * nothing. `storageKey` and `documentId` are echoed back from presign and
 * re-checked server-side so neither can be pointed at another application.
 */
export const registerDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  partnerId: z.string().uuid().optional(),
  documentId: z.string().uuid(),
  kind: z.nativeEnum(DocumentKind),
  filename,
  storageKey: z.string().min(1),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(EOI_MAX_FILE_BYTES),
});
export type RegisterDocumentInput = z.infer<typeof registerDocumentSchema>;

export const listDocumentsSchema = z.object({
  applicationId: z.string().uuid(),
});
