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
import { n8nWebhookRouter } from "./modules/webhooks/n8n.js";

export function createServer(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_PUBLIC_URL,
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
  app.use("/webhooks/n8n", n8nWebhookRouter);

  app.use(errorHandler);

  return app;
}
