import { z } from "zod";
import { Currency, PaymentMethod } from "../enums";

export const initiatePaymentSchema = z.object({
  applicationId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  currency: z.nativeEnum(Currency),
  // amount is intentionally omitted — the server reads EOI_APPLICATION_FEE_USD/UGX from env
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const submitTransferProofSchema = z.object({
  paymentId: z.string().uuid(),
  documentId: z.string().uuid(),
  reference: z.string().min(1),
  paidAt: z.string().datetime(),
});
export type SubmitTransferProofInput = z.infer<
  typeof submitTransferProofSchema
>;
