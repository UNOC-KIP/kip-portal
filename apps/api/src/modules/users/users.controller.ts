import type { RequestHandler } from "express";
import { userIdParamSchema, rejectBodySchema } from "./users.schema.js";
import { approveUser, rejectUser } from "./users.service.js";

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
    const { reason } = rejectBodySchema.parse(req.body);
    await rejectUser(id, reason);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
