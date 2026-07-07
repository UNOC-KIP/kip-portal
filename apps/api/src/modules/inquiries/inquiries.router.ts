import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleUpdateStatus } from "./inquiries.controller.js";

export const inquiriesRouter: Router = Router();

inquiriesRouter.use(requireAuth);

inquiriesRouter.post("/:id/status", requireRole(UserRole.ADMIN), handleUpdateStatus);
