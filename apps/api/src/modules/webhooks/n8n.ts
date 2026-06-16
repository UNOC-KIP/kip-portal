import { Router } from "express";
import { env } from "../../env.js";
import { Forbidden } from "../../errors.js";

export const n8nWebhookRouter: Router = Router();

/**
 * n8n calls us back after document generation, SLA breaches, or payment
 * confirmations. Authenticated via shared secret in x-n8n-secret header.
 */
n8nWebhookRouter.use((req, _res, next) => {
  const secret = req.header("x-n8n-secret");
  if (!env.N8N_WEBHOOK_SECRET || secret !== env.N8N_WEBHOOK_SECRET) {
    return next(Forbidden("Invalid n8n webhook secret"));
  }
  next();
});

n8nWebhookRouter.post("/event", (req, res) => {
  // TODO: route by req.body.type — payment.confirmed, doc.generated, sla.breach
  res.json({ received: true, event: req.body });
});
