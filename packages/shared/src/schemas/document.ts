import { z } from "zod";
import { DocumentKind } from "../enums";

export const documentMetadataSchema = z.object({
  kind: z.nativeEnum(DocumentKind),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // 50MB
});
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

export const presignUploadSchema = z.object({
  applicationId: z.string().uuid(),
  metadata: documentMetadataSchema,
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
