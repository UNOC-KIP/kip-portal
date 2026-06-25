import "server-only";
import crypto from "crypto";

/**
 * Fire an outbound n8n webhook from the Next.js server side.
 * No-op when N8N_BASE_URL or N8N_WEBHOOK_SECRET is absent.
 * Never throws — call with .catch(() => {}) at the call site.
 */
export async function fireWebhook(
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const baseUrl = process.env.N8N_BASE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!baseUrl || !secret) return;

  const body = JSON.stringify({ event, ...payload });
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  await fetch(`${baseUrl}/webhook/kip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-KIP-Signature": `sha256=${sig}`,
    },
    body,
  });
}
