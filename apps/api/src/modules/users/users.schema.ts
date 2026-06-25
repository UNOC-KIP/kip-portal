import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.string().uuid("User ID must be a valid UUID"),
});

export const rejectBodySchema = z.object({
  reason: z.string().max(500).optional(),
});
