import type { RequestHandler } from "express";
import { BadRequest } from "../../errors.js";
import {
  presignDocumentSchema,
  registerDocumentSchema,
  listDocumentsSchema,
} from "./documents.schema.js";
import * as service from "./documents.service.js";

/** Parse request → call service → respond. No Sequelize in here. */

export const presign: RequestHandler = async (req, res, next) => {
  try {
    const input = presignDocumentSchema.parse(req.body);
    res.json(await service.presignDocument(input, req.user!));
  } catch (e) {
    next(e);
  }
};

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = registerDocumentSchema.parse(req.body);
    const doc = await service.registerDocument(input, req.user!);
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    const { applicationId } = listDocumentsSchema.parse(req.query);
    res.json(await service.listDocuments(applicationId, req.user!));
  } catch (e) {
    next(e);
  }
};

export const download: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw BadRequest("id required");
    res.json(await service.getDownloadUrl(id, req.user!));
  } catch (e) {
    next(e);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw BadRequest("id required");
    await service.deleteDocument(id, req.user!);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
