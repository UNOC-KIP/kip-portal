import { z } from "zod";
import { UserRole } from "@kip/shared";

export const userIdParamSchema = z.object({
  id: z.string().uuid("User ID must be a valid UUID"),
});

export const rejectBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createStaffUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  email: z.string().email("Must be a valid email address"),
  role: z.nativeEnum(UserRole).refine((r) => r !== UserRole.INVESTOR, {
    message: "Investor role cannot be assigned to staff",
  }),
});
