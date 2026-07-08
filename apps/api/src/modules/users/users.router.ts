import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  handleApprove,
  handleReject,
  handleCreateStaff,
  handleUpdate,
  handleDelete,
} from "./users.controller.js";

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

usersRouter.post("/staff", requireRole(UserRole.ADMIN), handleCreateStaff);
usersRouter.patch("/:id", requireRole(UserRole.ADMIN), handleUpdate);
usersRouter.delete("/:id", requireRole(UserRole.ADMIN), handleDelete);
usersRouter.post("/:id/approve", requireRole(UserRole.ADMIN), handleApprove);
usersRouter.post("/:id/reject", requireRole(UserRole.ADMIN), handleReject);
