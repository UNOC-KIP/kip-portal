import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4001),
  WEB_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  N8N_WEBHOOK_SECRET: z.string().min(8).optional(),
  N8N_BASE_URL: z.string().url().optional(),
  // Must match the web app's NEXTAUTH_SECRET — the API verifies NextAuth session
  // JWTs minted by the web app with this key.
  NEXTAUTH_SECRET: z.string().min(16),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("kip-documents"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  ANTHROPIC_API_KEY: z.string().optional(),

  EOI_APPLICATION_FEE_USD: z.coerce.number().int().positive().default(1000),
  EOI_APPLICATION_FEE_UGX: z.coerce.number().int().positive().default(3700000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
