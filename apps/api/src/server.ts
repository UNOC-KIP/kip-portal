import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./modules/health/route.js";
import { applicationsRouter } from "./modules/applications/route.js";
import { paymentsRouter } from "./modules/payments/route.js";
import { documentsRouter } from "./modules/documents/documents.router.js";
import { n8nWebhookRouter } from "./modules/webhooks/n8n.js";
import { usersRouter } from "./modules/users/users.router.js";
import { windowsRouter } from "./modules/windows/windows.router.js";
import { inquiriesRouter } from "./modules/inquiries/inquiries.router.js";
import { siteVisitsRouter } from "./modules/site-visits/site-visits.router.js";
import { timelineRouter } from "./modules/timeline/timeline.router.js";
import { communicationsRouter } from "./modules/communications/communications.router.js";
import { financeRouter } from "./modules/finance/finance.router.js";

export function createServer(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: [env.WEB_PUBLIC_URL, env.PORTAL_PUBLIC_URL],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(pinoHttp({ logger: logger as any }));

  app.use("/health", healthRouter);
  app.use("/applications", applicationsRouter);
  app.use("/payments", paymentsRouter);
  app.use("/documents", documentsRouter);
  app.use("/webhooks/n8n", n8nWebhookRouter);
  app.use("/users", usersRouter);
  app.use("/windows", windowsRouter);
  app.use("/inquiries", inquiriesRouter);
  app.use("/timeline", timelineRouter);
  app.use("/site-visits", siteVisitsRouter);
  app.use("/communications", communicationsRouter);
  app.use("/finance", financeRouter);

  app.use(errorHandler);

  return app;
}
