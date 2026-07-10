import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  handleCreate,
  handleList,
  handleUpdateStatus,
} from "./site-visits.controller.js";

export const siteVisitsRouter: Router = Router();

siteVisitsRouter.use(requireAuth);

siteVisitsRouter.post("/", requireRole(UserRole.INVESTOR, UserRole.ADMIN), handleCreate);
siteVisitsRouter.get("/", requireRole(UserRole.ADMIN), handleList);
siteVisitsRouter.post("/:id/status", requireRole(UserRole.ADMIN), handleUpdateStatus);
