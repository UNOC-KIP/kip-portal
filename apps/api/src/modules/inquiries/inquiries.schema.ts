import { z } from "zod";
import { InquiryStatus } from "@kip/shared";

export const inquiryIdParamSchema = z.object({
  id: z.string().uuid("Inquiry ID must be a valid UUID"),
});

export const updateStatusBodySchema = z.object({
  status: z.nativeEnum(InquiryStatus),
});
