import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleApprove, handleReject, handleCreateStaff } from "./users.controller.js";

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

usersRouter.post("/staff", requireRole(UserRole.ADMIN), handleCreateStaff);
usersRouter.post("/:id/approve", requireRole(UserRole.ADMIN), handleApprove);
usersRouter.post("/:id/reject", requireRole(UserRole.ADMIN), handleReject);
