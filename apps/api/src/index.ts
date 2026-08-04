import { createServer } from "./server.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { hasStaticS3Credentials } from "./storage/index.js";

const app = createServer();

// Not fatal — the SDK may still find credentials via an EC2 instance role, and
// every other route works without storage. But a silent absence means the first
// symptom is an investor failing to attach an EOI document, so say it at boot.
if (!hasStaticS3Credentials()) {
  logger.warn(
    { bucket: env.S3_BUCKET, region: env.S3_REGION },
    "No S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY set — document upload and download will fail unless an instance role provides credentials",
  );
}

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "🚀 KIP API listening");
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});
