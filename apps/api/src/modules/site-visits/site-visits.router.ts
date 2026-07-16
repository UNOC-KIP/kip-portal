import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  handleCreate,
  handleDelete,
  handleList,
  handleUpdate,
  handleUpdateStatus,
} from "./site-visits.controller.js";

export const siteVisitsRouter: Router = Router();

siteVisitsRouter.use(requireAuth);

siteVisitsRouter.post("/", requireRole(UserRole.INVESTOR, UserRole.ADMIN), handleCreate);
siteVisitsRouter.get("/", requireRole(UserRole.ADMIN), handleList);
// Owner (or admin) may edit/delete their own request while it is still NEW.
siteVisitsRouter.patch("/:id", requireRole(UserRole.INVESTOR, UserRole.ADMIN), handleUpdate);
siteVisitsRouter.delete("/:id", requireRole(UserRole.INVESTOR, UserRole.ADMIN), handleDelete);
siteVisitsRouter.post("/:id/status", requireRole(UserRole.ADMIN), handleUpdateStatus);
