# KIP Investor Portal — Architecture

## System overview

```
                            ┌──────────────────┐
                            │   Investors &    │
                            │  Internal Staff  │
                            └────────┬─────────┘
                                     │ HTTPS
                            ┌────────▼─────────┐
                            │   Next.js 14     │
                            │   (web app)      │
                            │   NextAuth       │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │   Express API    │
                            │   (REST/JSON)    │
                            └────┬─────────┬───┘
                                 │         │
              ┌──────────────────┘         └──────────────────┐
              │                                                │
        ┌─────▼──────┐                                  ┌─────▼──────┐
        │ PostgreSQL │                                  │  n8n       │
        │ (Prisma)   │                                  │  workflows │
        └────────────┘                                  └─────┬──────┘
                                                              │
                                            ┌─────────────────┼─────────────────┐
                                            │                 │                 │
                                      ┌─────▼─────┐    ┌──────▼─────┐    ┌─────▼─────┐
                                      │ SMTP/SES  │    │ Payment GW │    │ Anthropic │
                                      │ email     │    │ Stanbic    │    │ AI screen │
                                      └───────────┘    └────────────┘    └───────────┘

         Document storage (all uploads):  S3 / Cloudflare R2
```

## Components

### apps/web (Next.js 14)
App Router, React Server Components, Tailwind + shadcn/ui. Hosts both investor and admin surfaces, gated by role in middleware. NextAuth for sessions (email magic link + credentials).

### apps/api (Express + TypeScript)
Stateless JSON API. Talks to Postgres via Prisma. Authenticates via NextAuth JWT forwarded from the web app. All long-running and side-effectful work is offloaded to n8n.

### packages/db (Prisma)
Single source of truth for the schema. Migrations versioned in git. Seed script provides an admin user and a sample application window.

### packages/shared (Zod)
Enums and Zod schemas imported by both web and api. Encodes:
- The status state machine (`validTransitions`)
- Per-EOI-section payload validation
- Document and payment validation

### n8n
Self-hosted. Owns:
- Investor and staff notifications (email)
- SLA watchdogs (e.g., TC has 7 days to review)
- Document generation (outcome letters, RFP invitations) via the `docx` npm package
- External integrations (payment gateway webhooks, Stanbic transfer confirmations)
- AI screening calls to Anthropic Claude API (internal-only)

## Key business rules encoded

| Rule | Where |
|------|-------|
| Payment must be confirmed before submission | `ApplicationStatus.DRAFT_PAYMENT_PENDING` gate; `validTransitions` in `@kip/shared` |
| TC/ExCo/LAC cannot view submitted apps while the window is open | `ApplicationWindow.status` + middleware check in API (todo) |
| All review actions auditable | `ReviewAction` model |
| Application reference format: KIP-{year}-{4-digit-seq} | Generated in `applications/route.ts` |
| Application fee: USD 1,000 | `EOI_APPLICATION_FEE_USD` env var |

## Status state machine

```
DRAFT → DRAFT_PAYMENT_PENDING → SUBMITTED → UNDER_TC_REVIEW
                                                  ↓
                          ┌──── TC_CLARIFICATION_REQUESTED ⇄ UNDER_TC_REVIEW
                          │
                          ├──── TC_RECOMMENDED → GM_REVIEW → EXCO_REVIEW
                          │                          ↓            ↓
                          │                  (GM objection)  (ExCo sendback)
                          │                          ↓            ↓
                          │                    UNDER_TC_REVIEW (loops)
                          │                                       ↓
                          │                  INVESTMENT_COMMITTEE_REVIEW
                          │                                       ↓
                          │                              BOARD_APPROVED
                          │                                       ↓
                          │                       SHORTLISTED → RFP_INVITED
                          │
                          └──── NOT_SHORTLISTED (terminal)

WITHDRAWN can be reached from DRAFT or DRAFT_PAYMENT_PENDING (terminal).
```

## Deployment targets

- **Web + API**: AWS (likely ECS Fargate or App Runner; behind ALB)
- **Postgres**: AWS RDS Postgres 16
- **Object storage**: S3 or Cloudflare R2
- **n8n**: Self-hosted on a small EC2 instance or Fly.io app (separate from prod DB)
- **Email**: AWS SES in prod, MailHog in dev

See `infra/README.md` for env templates.
