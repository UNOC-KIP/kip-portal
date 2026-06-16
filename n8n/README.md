# n8n Workflows

Self-hosted n8n absorbs all automation, notification, and integration
complexity. The core API stays thin.

## Local

`docker compose up -d n8n` brings it up at http://localhost:5678. The first
visit prompts you to create an owner account.

## Workflows to build (rough order)

1. **`investor-notifications`** — email investors on status changes (uses MailHog in dev, SES in prod)
2. **`payment-confirmation`** — receives payment-gateway webhook, validates HMAC, POSTs to `/webhooks/n8n/event` to flip the app to SUBMITTED
3. **`tc-sla-watchdog`** — runs hourly, flags applications stuck in `UNDER_TC_REVIEW` past SLA
4. **`outcome-letter-generator`** — on decision, generates docx letter using the shared helper module (`kip_helpers.js`) and uploads to S3
5. **`rfp-invitation`** — on `RFP_INVITED`, send templated email with attached invitation
6. **`tc-ai-prescreen`** — internal-only, calls Anthropic API (see `docs/AI_SCREENING.md`)

## Versioning

Workflows are exported as JSON into `workflows/` so they're version-controlled.
Re-import via the n8n UI (`File → Import from File`) on a fresh n8n instance.

## Webhook contract

All n8n → API callbacks hit `POST /webhooks/n8n/event` and must include
header `x-n8n-secret: <N8N_WEBHOOK_SECRET>`. Payload shape:

```json
{
  "type": "payment.confirmed" | "doc.generated" | "sla.breach" | ...,
  "applicationId": "uuid",
  "data": { ... }
}
```
