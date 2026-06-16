import { Router } from "express";
import { sequelize } from "@kip/db";

export const healthRouter: Router = Router();

healthRouter.get("/", async (_req, res) => {
  let db = "down";
  try {
    await sequelize.query("SELECT 1");
    db = "up";
  } catch {
    db = "down";
  }
  res.json({
    status: db === "up" ? "ok" : "degraded",
    service: "kip-api",
    db,
    time: new Date().toISOString(),
  });
});
