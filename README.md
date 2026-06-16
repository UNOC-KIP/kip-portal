# KIP Investor Portal

> Web platform digitising the EOI → Land Allocation journey for the
> Kabalega Petro-Based Industrial Park (KIP), Hoima District, Uganda.
> Built for UNOC (Uganda National Oil Company Limited) and URHC.

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind + shadcn/ui
- **Backend**: Express + Prisma + Postgres
- **Auth**: NextAuth (email magic link + credentials)
- **Storage**: S3 / Cloudflare R2
- **Workflow automation**: n8n (self-hosted)
- **Email (dev)**: MailHog
- **Monorepo**: pnpm workspaces

## Repository layout

```
kip-portal/
├── apps/
│   ├── web/        # Next.js 14 — investor + admin UI
│   └── api/        # Express — REST API
├── packages/
│   ├── db/         # Prisma schema, migrations, seed
│   └── shared/     # Zod schemas + enums (the contract)
├── n8n/            # Versioned workflows
├── docs/           # ARCHITECTURE, PHASES, AI_SCREENING (internal)
└── infra/          # Deployment notes
```

## Prerequisites

- Docker Desktop (everything else runs inside containers)
- OpenSSL (for generating secrets)

## Bootstrap

```bash
# 1. Copy env template and fill in secrets
cp .env.example .env

# 2. Generate a NextAuth secret and paste it into .env as NEXTAUTH_SECRET
openssl rand -base64 32

# 3. Build images and start the full stack
docker compose build
docker compose up
```

`docker compose up` runs in order: Postgres → migrate (generate + migrate + seed) → API + Web + MailHog + n8n.

You should now have:

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API | http://localhost:4000 |
| API health | http://localhost:4000/health |
| n8n | http://localhost:5678 |
| MailHog (dev email UI) | http://localhost:8025 |
| Postgres | localhost:5433 |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

## Common commands

```bash
docker compose up               # start everything
docker compose up --build       # rebuild images then start
docker compose down             # stop everything
docker compose logs -f api      # tail a specific service
docker compose logs -f web
docker compose restart api      # restart one service
```

**After changing a dependency or Prisma schema**, rebuild the affected service:

```bash
docker compose build api        # or: web
docker compose up
```

**Hot reload** is active for:
- `apps/api/src/` — tsx watch restarts the API automatically
- `apps/web/` — Next.js fast refresh
- `packages/shared/src/` — changes reflected in both apps

## Auth in dev

The credentials provider expects a `passwordHash`. For quick local testing,
use the **email magic-link** flow — it sends to MailHog, no real SMTP needed.
Open http://localhost:8025 and click the link in the captured email.

To impersonate a role against the API directly (e.g. via curl), set headers
`x-debug-user-id` and `x-debug-role` — the API auth middleware accepts these
in development only.

## Key business rules (already encoded)

- Payment must be confirmed before submission → `DRAFT_PAYMENT_PENDING` is a hard gate
- TC/ExCo/LAC cannot see submitted apps while the window is OPEN
- Application reference format: `KIP-{year}-{4-digit-seq}`
- Application fee: USD 1,000

See `docs/ARCHITECTURE.md` for the full status state machine and
`docs/PHASES.md` for the 12-week build plan.

## Internal-only

`docs/AI_SCREENING.md` covers the Anthropic Claude API integration for
TC-side decision support. Never reference this in investor-facing UI.

## License

Proprietary. © Uganda National Oil Company Limited.
