import { createServer } from "./server.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

const app = createServer();

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "🚀 KIP API listening");
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});
