import type { RequestHandler } from "express";
import {
  userIdParamSchema,
  rejectBodySchema,
  createStaffUserSchema,
  updateUserSchema,
} from "./users.schema.js";
import {
  approveUser,
  rejectUser,
  createStaffUser,
  updateUser,
  deleteUser,
} from "./users.service.js";

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

export const handleUpdate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const body = updateUserSchema.parse(req.body);
    await updateUser(id, body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleDelete: RequestHandler = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    await deleteUser(id, req.user!);
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
