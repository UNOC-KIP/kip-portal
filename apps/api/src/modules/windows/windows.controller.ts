import type { RequestHandler } from "express";
import {
  windowIdParamSchema,
  createWindowSchema,
  updateWindowSchema,
} from "./windows.schema.js";
import {
  createWindow,
  updateWindow,
  transitionWindowStatus,
} from "./windows.service.js";

export const handleCreate: RequestHandler = async (req, res, next) => {
  try {
    const body = createWindowSchema.parse(req.body);
    const win = await createWindow(body);
    res.status(201).json(win);
  } catch (e) {
    next(e);
  }
};

export const handleUpdate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = windowIdParamSchema.parse(req.params);
    const body = updateWindowSchema.parse(req.body);
    const win = await updateWindow(id, body);
    res.json(win);
  } catch (e) {
    next(e);
  }
};

export const handleOpen: RequestHandler = async (req, res, next) => {
  try {
    const { id } = windowIdParamSchema.parse(req.params);
    await transitionWindowStatus(id, "OPEN");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleClose: RequestHandler = async (req, res, next) => {
  try {
    const { id } = windowIdParamSchema.parse(req.params);
    await transitionWindowStatus(id, "CLOSED");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleArchive: RequestHandler = async (req, res, next) => {
  try {
    const { id } = windowIdParamSchema.parse(req.params);
    await transitionWindowStatus(id, "ARCHIVED");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
