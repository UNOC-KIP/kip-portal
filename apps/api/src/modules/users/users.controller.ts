import type { RequestHandler } from "express";
import { userIdParamSchema, rejectBodySchema, createStaffUserSchema } from "./users.schema.js";
import { approveUser, rejectUser, createStaffUser } from "./users.service.js";

export const handleApprove: RequestHandler = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    await approveUser(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleReject: RequestHandler = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const { reason } = rejectBodySchema.parse(req.body ?? {});
    await rejectUser(id, reason);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleCreateStaff: RequestHandler = async (req, res, next) => {
  try {
    const body = createStaffUserSchema.parse(req.body);
    const result = await createStaffUser(body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};
