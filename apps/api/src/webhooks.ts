import crypto from "crypto";
import { env } from "./env.js";
import { logger } from "./logger.js";

export type WebhookEvent =
  | "investor-registered"
  | "investor-approved"
  | "investor-rejected"
  | "application-submitted"
  | "payment-confirmed"
  | "tc-decision"
  | "lac-decision"
  | "exco-decision"
  | "clarification-requested"
  | "window-closed"
  | "staff-invited"
  | "site-visit-requested"
  | "communication-sent";

/**
 * Fire an outbound n8n webhook. Non-blocking — errors are logged but never
 * thrown. No-op when N8N_BASE_URL or N8N_WEBHOOK_SECRET is absent.
 */
export async function fireWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!env.N8N_BASE_URL || !env.N8N_WEBHOOK_SECRET) return;

  const body = JSON.stringify({ event, ...payload });
  const sig = crypto
    .createHmac("sha256", env.N8N_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  try {
    const res = await fetch(`${env.N8N_BASE_URL}/webhook/kip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KIP-Signature": `sha256=${sig}`,
      },
      body,
    });
    if (!res.ok) {
      logger.warn({ event, status: res.status }, "n8n webhook non-OK response");
    }
  } catch (err) {
    logger.warn({ event, err }, "n8n webhook fire failed (non-fatal)");
  }
}
