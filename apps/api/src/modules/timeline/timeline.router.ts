import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { handleCreate, handleUpdate, handleDelete } from "./timeline.controller.js";

export const timelineRouter: Router = Router();

timelineRouter.use(requireAuth);

timelineRouter.post("/", requireRole(UserRole.ADMIN), handleCreate);
timelineRouter.patch("/:id", requireRole(UserRole.ADMIN), handleUpdate);
timelineRouter.delete("/:id", requireRole(UserRole.ADMIN), handleDelete);
