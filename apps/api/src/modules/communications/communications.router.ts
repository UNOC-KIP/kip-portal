import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  handleCreate,
  handleCreateTemplate,
  handleDelete,
  handleDeleteTemplate,
  handleMarkRead,
  handleRetryUnsent,
  handleSendTest,
  handleUpdateTemplate,
} from "./communications.controller.js";

export const communicationsRouter: Router = Router();

communicationsRouter.use(requireAuth);

// Literal paths must stay declared before the `/:id` routes, or `templates`
// and `inbox` get parsed as communication ids.
communicationsRouter.post("/test", requireRole(UserRole.ADMIN), handleSendTest);

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
