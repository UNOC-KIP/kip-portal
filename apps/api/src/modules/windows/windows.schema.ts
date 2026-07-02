import { z } from "zod";

export const windowIdParamSchema = z.object({
  id: z.string().uuid("Window ID must be a valid UUID"),
});

export const createWindowSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(200),
    openAt: z.coerce.date(),
    closeAt: z.coerce.date(),
  })
  .refine((d) => d.closeAt > d.openAt, {
    message: "Close date must be after open date",
    path: ["closeAt"],
  });

export const updateWindowSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  closeAt: z.coerce.date().optional(),
});
