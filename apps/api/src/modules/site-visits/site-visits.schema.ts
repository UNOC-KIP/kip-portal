import { z } from "zod";
import {
  KipZone,
  SiteVisitStatus,
  SITE_VISIT_MIN_ACRES,
  SITE_VISIT_MAX_ACRES,
  isInvestableZone,
  landUsesForZone,
} from "@kip/shared";

export const createBookingSchema = z
  .object({
    zone: z.nativeEnum(KipZone, {
      errorMap: () => ({ message: "Select a zone" }),
    }),
    landUse: z.string().min(1, "Select an intended land use"),
    description: z
      .string()
      .min(20, "Describe your intended use in at least 20 characters")
      .max(2000, "Description is too long"),
    acres: z
      .number()
      .int("Acreage must be a whole number")
      .min(SITE_VISIT_MIN_ACRES)
      .max(SITE_VISIT_MAX_ACRES),
  })
  .superRefine((v, ctx) => {
    // Residential / Administration appear on the public land map but are not
    // offered for allocation.
    if (!isInvestableZone(v.zone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zone"],
        message: "This zone is not available for allocation",
      });
      return;
    }
    if (!landUsesForZone(v.zone).includes(v.landUse)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["landUse"],
        message: "Land use is not valid for the selected zone",
      });
    }
  });

export const bookingIdParamSchema = z.object({
  id: z.string().uuid("Booking ID must be a valid UUID"),
});

export const updateStatusBodySchema = z.object({
  status: z.nativeEnum(SiteVisitStatus),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
