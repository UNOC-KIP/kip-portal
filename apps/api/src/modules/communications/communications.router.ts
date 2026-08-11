import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  handleCreate,
  handleCreateTemplate,
  handleDelete,
  handleDeleteTemplate,
  handleDownloadAttachment,
  handleMarkRead,
  handlePresignAttachment,
  handleRegisterAttachment,
  handleRetryUnsent,
  handleSendTest,
  handleUpdateTemplate,
} from "./communications.controller.js";

export const communicationsRouter: Router = Router();

/**
 * Attachment download — the ONLY unauthenticated route in this module, and so
 * declared above `requireAuth` deliberately.
 *
 * Broadcast recipients include notify-list addresses with no portal account, so
 * a link that demanded a session would be dead for them. The unguessable
 * attachment id is the capability (same model as a presigned URL, without the
 * expiry) and the handler 302s to a short-lived S3 URL. Keep this route free of
 * any enumerable identifier, and do not move it below `requireAuth`.
 */
communicationsRouter.get("/attachments/:id", handleDownloadAttachment);

communicationsRouter.use(requireAuth);

// Literal paths must stay declared before the `/:id` routes, or `templates`
// and `inbox` get parsed as communication ids.
communicationsRouter.post("/test", requireRole(UserRole.ADMIN), handleSendTest);

communicationsRouter.post(
  "/attachments/presign",
  requireRole(UserRole.ADMIN),
  handlePresignAttachment,
);
communicationsRouter.post(
  "/attachments",
  requireRole(UserRole.ADMIN),
  handleRegisterAttachment,
);

communicationsRouter.post("/templates", requireRole(UserRole.ADMIN), handleCreateTemplate);
communicationsRouter.patch("/templates/:id", requireRole(UserRole.ADMIN), handleUpdateTemplate);
communicationsRouter.delete("/templates/:id", requireRole(UserRole.ADMIN), handleDeleteTemplate);

// Ownership is checked in the service — a message id is not authorisation.
communicationsRouter.post(
  "/inbox/:id/read",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  handleMarkRead,
);

communicationsRouter.post("/", requireRole(UserRole.ADMIN), handleCreate);
communicationsRouter.post("/:id/retry", requireRole(UserRole.ADMIN), handleRetryUnsent);
communicationsRouter.delete("/:id", requireRole(UserRole.ADMIN), handleDelete);
