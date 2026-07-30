import type { RequestHandler } from "express";
import {
  createCommunicationSchema,
  idParamSchema,
  sendTestSchema,
  templateSchema,
} from "./communications.schema.js";
import {
  createAndSend,
  createTemplate,
  deleteCommunication,
  deleteTemplate,
  markRead,
  retryUnsent,
  sendTest,
  updateTemplate,
} from "./communications.service.js";

export const handleCreate: RequestHandler = async (req, res, next) => {
  try {
    const input = createCommunicationSchema.parse(req.body ?? {});
    const result = await createAndSend(input, req.user!.id);
    // 202: the rows are committed but delivery is still draining in the
    // background, so the caller should poll rather than assume "sent".
    res.status(202).json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const handleSendTest: RequestHandler = async (req, res, next) => {
  try {
    const input = sendTestSchema.parse(req.body ?? {});
    await sendTest(input, req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleRetryUnsent: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await retryUnsent(id);
    res.status(202).json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
};

export const handleDelete: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteCommunication(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleCreateTemplate: RequestHandler = async (req, res, next) => {
  try {
    const input = templateSchema.parse(req.body ?? {});
    const { id } = await createTemplate(input, req.user!.id);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    next(e);
  }
};

export const handleUpdateTemplate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = templateSchema.parse(req.body ?? {});
    await updateTemplate(id, input);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleDeleteTemplate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteTemplate(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleMarkRead: RequestHandler = async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await markRead(id, req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
