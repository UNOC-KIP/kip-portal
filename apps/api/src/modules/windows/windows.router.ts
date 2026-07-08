import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  handleCreate,
  handleUpdate,
  handleDelete,
  handleOpen,
  handleClose,
  handleArchive,
} from "./windows.controller.js";

export const windowsRouter: Router = Router();

windowsRouter.use(requireAuth);

windowsRouter.post("/", requireRole(UserRole.ADMIN), handleCreate);
windowsRouter.patch("/:id", requireRole(UserRole.ADMIN), handleUpdate);
windowsRouter.delete("/:id", requireRole(UserRole.ADMIN), handleDelete);
windowsRouter.post("/:id/open", requireRole(UserRole.ADMIN), handleOpen);
windowsRouter.post("/:id/close", requireRole(UserRole.ADMIN), handleClose);
windowsRouter.post("/:id/archive", requireRole(UserRole.ADMIN), handleArchive);
