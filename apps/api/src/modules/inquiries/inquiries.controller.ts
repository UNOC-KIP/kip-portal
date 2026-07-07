import type { RequestHandler } from "express";
import { inquiryIdParamSchema, updateStatusBodySchema } from "./inquiries.schema.js";
import { updateInquiryStatus } from "./inquiries.service.js";

export const handleUpdateStatus: RequestHandler = async (req, res, next) => {
  try {
    const { id } = inquiryIdParamSchema.parse(req.params);
    const { status } = updateStatusBodySchema.parse(req.body ?? {});
    await updateInquiryStatus(id, status, req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
