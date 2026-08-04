import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import * as controller from "./documents.controller.js";

export const documentsRouter: Router = Router();

documentsRouter.use(requireAuth);

// Literal routes before "/:id" so "presign" is never parsed as a document id.
documentsRouter.post(
  "/presign",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  controller.presign,
);
documentsRouter.post(
  "/",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  controller.register,
);

/** Reads are open to every authenticated role — the service scopes them. */
documentsRouter.get("/", controller.list);
documentsRouter.get("/:id/download", controller.download);

documentsRouter.delete(
  "/:id",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  controller.remove,
);
