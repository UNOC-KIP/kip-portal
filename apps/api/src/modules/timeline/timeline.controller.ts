import type { RequestHandler } from "express";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  milestoneIdParamSchema,
} from "./timeline.schema.js";
import { createMilestone, updateMilestone, deleteMilestone } from "./timeline.service.js";

export const handleCreate: RequestHandler = async (req, res, next) => {
  try {
    const input = createMilestoneSchema.parse(req.body ?? {});
    const { id } = await createMilestone(input);
    res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
};

export const handleUpdate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = milestoneIdParamSchema.parse(req.params);
    const input = updateMilestoneSchema.parse(req.body ?? {});
    await updateMilestone(id, input);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleDelete: RequestHandler = async (req, res, next) => {
  try {
    const { id } = milestoneIdParamSchema.parse(req.params);
    await deleteMilestone(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
