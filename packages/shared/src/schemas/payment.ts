import { z } from "zod";
import { Currency, PaymentMethod } from "../enums";

export const initiatePaymentSchema = z.object({
  applicationId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  currency: z.nativeEnum(Currency),
  // amount is intentionally omitted — the server reads EOI_APPLICATION_FEE_USD/UGX from env
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

/** Allowed MIME types for payment proof documents (PDF, JPEG, PNG). */
const PROOF_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export const presignProofSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(PROOF_CONTENT_TYPES),
  sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024), // max 10 MB (matches S3 presign condition)
});
export type PresignProofInput = z.infer<typeof presignProofSchema>;

export const submitTransferProofSchema = z.object({
  documentId: z.string().uuid(),
  reference: z.string().min(1),
  paidAt: z.string().datetime(),
});
export type SubmitTransferProofInput = z.infer<typeof submitTransferProofSchema>;
