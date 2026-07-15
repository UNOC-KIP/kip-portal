import { z } from "zod";
import { TimelineMilestoneKind, TimelineMilestoneStatus } from "@kip/shared";

const base = z.object({
  position: z.coerce.number().int().min(1).max(99),
  kind: z.nativeEnum(TimelineMilestoneKind).default(TimelineMilestoneKind.GENERIC),
  status: z.nativeEnum(TimelineMilestoneStatus).default(TimelineMilestoneStatus.AUTO),
  title: z.string().trim().min(3).max(300),
  dateLabel: z.string().trim().min(3).max(120),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
});

const endsAfterStarts = (
  data: { startsAt?: Date; endsAt?: Date | null },
  ctx: z.RefinementCtx,
) => {
  if (data.endsAt && data.startsAt && data.endsAt.getTime() <= data.startsAt.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "End date must be after the start date",
    });
  }
};

export const createMilestoneSchema = base.superRefine(endsAfterStarts);
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = base.partial().superRefine(endsAfterStarts);
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export const milestoneIdParamSchema = z.object({ id: z.string().uuid() });
