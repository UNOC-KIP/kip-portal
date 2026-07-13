import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  handleApprove,
  handleReject,
  handleCreateStaff,
  handleUpdate,
  handleDelete,
  handleUpdateMe,
  handleChangePassword,
} from "./users.controller.js";

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

// Self-service routes — any authenticated user acting on their own account.
// MUST be declared before "/:id" so Express doesn't match "me" as an id param
// (which would hit the ADMIN-only guard and 403).
usersRouter.patch("/me", handleUpdateMe);
usersRouter.post("/me/password", handleChangePassword);

usersRouter.post("/staff", requireRole(UserRole.ADMIN), handleCreateStaff);
usersRouter.patch("/:id", requireRole(UserRole.ADMIN), handleUpdate);
usersRouter.delete("/:id", requireRole(UserRole.ADMIN), handleDelete);
usersRouter.post("/:id/approve", requireRole(UserRole.ADMIN), handleApprove);
usersRouter.post("/:id/reject", requireRole(UserRole.ADMIN), handleReject);
