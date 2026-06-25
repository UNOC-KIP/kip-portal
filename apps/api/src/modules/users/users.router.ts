import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleApprove, handleReject } from "./users.controller.js";

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

usersRouter.post("/:id/approve", requireRole(UserRole.ADMIN), handleApprove);
usersRouter.post("/:id/reject", requireRole(UserRole.ADMIN), handleReject);
