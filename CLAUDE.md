# CLAUDE.md — KIP Investor Portal
> Last updated: 25 June 2026. Update this file in the same commit as any architectural change.
> Architecture updated 25 June 2026: split into two Next.js apps — `apps/web` (admin) + `apps/portal` (investor).

---

## What this project is

**KIP Investor Portal** — digitises EOI-to-land-allocation for UNOC/URHC's Kabalega Industrial Park (Hoima, Uganda). Investors apply for industrial plots; applications go through TC → LAC → ExCo committee pipeline.

**Solo developer:** Crispus. **Stakeholder / UAT lead:** Lilian.

---

## Monorepo structure

```
kip-portal/
├── apps/
│   ├── web/          Next.js 14 App Router — ADMIN portal (port 4000)
│   │   └── src/
│   │       ├── app/           Route groups: (auth), (admin), api
│   │       ├── components/    Admin UI + ui/ primitives
│   │       └── lib/           auth.ts, rbac.ts, format.ts, admin/
│   ├── portal/       Next.js 14 App Router — INVESTOR portal (port 4002)
│   │   └── src/
│   │       ├── app/           Route groups: (auth), (investor), api
│   │       ├── components/    Investor UI + ui/ primitives
│   │       └── lib/           auth.ts, rbac.ts, format.ts, investor-data.ts
│   └── api/          Express / Node.js — REST API (port 4001)
│       └── src/
│           ├── modules/       applications/, payments/, health/, users/
│           ├── middleware/    auth.ts, error-handler.ts
│           ├── storage/       S3 presigned URL helpers
│           ├── env.ts, errors.ts, server.ts, webhooks.ts
├── packages/
│   ├── db/           @kip/db — Sequelize 6, compiled to dist/ (run pnpm db:build after changes)
│   │   ├── src/models/        13 model files
│   │   ├── migrations/        umzug TypeScript migrations
│   │   └── seed.ts            Raw pg seed, idempotent
│   └── shared/       @kip/shared — enums.ts (source of truth) + Zod schemas
├── docker-compose.yml
└── .env
```

**Package manager: pnpm only** — never npm or yarn.

**`@kip/db` must be compiled before use.** Run `pnpm db:build` after any model/index change. Next.js loads it as a `serverExternalPackage` from `dist/index.js`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, App Router, Tailwind CSS |
| Backend | Express.js, TypeScript — port 4001 |
| ORM | Sequelize 6 + pg (pure JS, no native binaries — ARM64 Windows safe) |
| Migrations | umzug 3 + TypeScript migration files |
| Database | PostgreSQL 16 — local Docker port **5433** |
| Auth | NextAuth.js — Email magic link + Credentials (JWT strategy) |
| File storage | S3-compatible — presigned PUT/GET URLs |
| Email | MailHog (local, SMTP 1025, UI 8025) → AWS SES (prod) via n8n |
| Automation | n8n port 5678 — notifications, SLA watchdogs, AI screening |
| Hosting | AWS ap-south-1: EC2 + RDS + S3 + CloudFront + Route 53 |

---

## Authentication

**Two separate NextAuth instances share one secret and one database.**

| App | NextAuth config | Who can sign in |
|---|---|---|
| `apps/portal` (port 4002) | `apps/portal/src/lib/auth.ts` | `INVESTOR` only — staff are blocked at `authorize` level |
| `apps/web` (port 4000) | `apps/web/src/lib/auth.ts` | All staff roles — `INVESTOR` is blocked at `authorize` level |

Both use Email + Credentials providers, custom `SequelizeAdapter()`, JWT session strategy. Callbacks extend token/session with `id` and `role`.

API middleware (`apps/api/src/middleware/auth.ts`): `requireAuth` decodes the NextAuth JWT from `Authorization: Bearer` or `next-auth.session-token` cookie. Accepts tokens from either portal because all three share the same `NEXTAUTH_SECRET`. Populates `req.user = { id, role }`. `requireRole(...roles)` → 403 if role not in list.

**`NEXTAUTH_SECRET` must be identical across `apps/web`, `apps/portal`, and `apps/api`.**

**Always include `UserRole.ADMIN` in `requireRole(...)` calls.**

---

## Access control (RBAC)

Two layers per portal, each with its own policy file:

**`apps/portal` (investor)** — `apps/portal/src/lib/rbac.ts`:
1. **Edge** — `apps/portal/src/middleware.ts` checks JWT + role on every matched route.
2. **Server** — `rbac-server.ts` `requireRole()` in every sensitive layout/page.

**`apps/web` (admin)** — `apps/web/src/lib/rbac.ts`:
1. **Edge** — `apps/web/src/middleware.ts` checks JWT + role.
2. **Server** — `rbac-server.ts` `requireRole()`/`requireStaff()` in every sensitive layout/page.

**Never rely on only one layer.**

| App | Area | Path | Allowed roles |
|---|---|---|---|
| portal | Investor dashboard | `/dashboard/*` | `INVESTOR` |
| web | Admin console | `/console/*` (non-TC) | `ADMIN` |
| web | TC review | `/console/tc/*` | `TC_MEMBER`, `TC_CHAIR`, `ADMIN` |
| both | Post-login router | `/launch` | any authenticated |
| web | No-workspace | `/unauthorized` | any authenticated |

Post-login in `apps/web`: `/launch` → `homePathForRole()` → INVESTOR→`http://localhost:4002` (NEXT_PUBLIC_PORTAL_URL), ADMIN→`/console`, TC→`/console/tc/queue`, LAC/ExCo→`/unauthorized`.

---

## Web data access — hybrid

- **Reads → direct DB** via `server-only` query modules (`lib/admin/queries.ts`, `lib/investor-data.ts`). No HTTP hop. Pages call one data-layer function and render; no Sequelize in pages.
- **Writes → Express API.** All mutations go via the API — services own the status machine + n8n webhooks.

Rules:
- Queries in `server-only` modules only. Never from client components.
- DB rows → view-models in **pure** mapper modules with **no `@kip/db` import** (breaks unit tests). Pattern: `queries.ts` (DB) + `mappers.ts` (pure) + `format.ts` (pure).
- Array value in `where` = `IN` — no need to import `Op` in the web app.
- Never return `passwordHash` or any secret in a view-model.

---

## Application fee & payment

- **Fee:** USD 1,000 (`EOI_APPLICATION_FEE_USD` env var)
- **Storage:** `DECIMAL(14,2)` — never integer cents
- **Methods:** `STANBIC_TRANSFER` + `CARD` — MTN MoMo / Airtel out of scope

---

## Application status machine

```
DRAFT_PAYMENT_PENDING
    │  Payment.status = CONFIRMED
    ▼
DRAFT
    │  All 6 sections filled; ApplicationWindow must be OPEN
    ▼
SUBMITTED               ref = KIP-EOI-YYYY-NNNN assigned here
    │  Window closes
    ▼
UNDER_TC_REVIEW
    ├─ SHORTLISTED       → LAC_REVIEW
    ├─ NOT_SHORTLISTED   → terminal
    └─ TC_CLARIFICATION_REQUESTED → back to UNDER_TC_REVIEW
         ▼
    LAC_REVIEW
    ├─ LAC_APPROVED      → EXCO_REVIEW
    ├─ LAC_REJECTED      → terminal
    └─ REQUEST_MORE_INFO → new ClarificationRequest row, stays SHORTLISTED
         ▼
    EXCO_REVIEW
    ├─ ALLOCATED         → terminal (success)
    └─ LAC_REJECTED      → terminal

WITHDRAWN               → terminal (before SUBMITTED)
```

**Critical rules:**
1. Cannot leave `DRAFT_PAYMENT_PENDING` until `Payment.status = CONFIRMED`
2. `SUBMITTED` requires `ApplicationWindow.status = OPEN` and `now()` in window range
3. TC / LAC / ExCo cannot access applications while window is still open → 403
4. ExCo is one-shot — no reversal
5. LAC `REQUEST_MORE_INFO` creates a `ClarificationRequest` row; does NOT create a second LAC record

---

## Reference number

Format: `KIP-EOI-YYYY-NNNN` — assigned only at SUBMITTED transition inside a transaction.
`YYYY` = window year. `NNNN` = `ApplicationWindow.sequenceCounter` (zero-padded, atomic). Nullable until submission; unique once set. Formatter: `formatReference()` in `@kip/shared`.

---

## Database schema

**Import:** `import { sequelize, User, Application, ... } from "@kip/db"`
**Models:** `packages/db/src/models/` — `Model.init()` pattern, no decorators. Column names are camelCase.
**Long text:** always `DataTypes.TEXT`, never `DataTypes.STRING`.

| Model | Key columns / notes |
|---|---|
| `User` | `email`, `passwordHash`, `name`, `role`, `status (UserStatus)`, `investorOrgId` |
| `Account`, `Session`, `VerificationToken` | NextAuth tables |
| `InvestorOrg` | `legalName`, `countryOfIncorporation`, `tin`, `address`, `phone`, `email` |
| `ApplicationWindow` | open/close period, `sequenceCounter` |
| `Application` | central EOI record |
| `ApplicationSection` | one row per section, `payload` JSON |
| `Document` | S3 file metadata |
| `Payment` | `amount DECIMAL(14,2)`, `currency`, gates DRAFT_PAYMENT_PENDING→DRAFT |
| `ReviewAction` | append-only audit log |
| `ClarificationRequest` | LAC REQUEST_MORE_INFO records |
| `Notification` | in-app + email records |

**Enums** (`packages/shared/src/enums.ts` — source of truth):
- `UserRole`: `INVESTOR | TC_MEMBER | TC_CHAIR | LAC_MEMBER | EXCO_MEMBER | ADMIN`
- `UserStatus`: `PENDING_REVIEW | ACTIVE | REJECTED`
- `ApplicationStatus`: see machine above
- `EoiSection`: `PRELIMINARY_INFO | LAND_BUSINESS_PROFILE | UTILITIES_INFRASTRUCTURE | H3SE | NATIONAL_CONTENT | DECLARATION`
- `PaymentMethod`: `CARD | STANBIC_TRANSFER`
- `PaymentStatus`: `PENDING | PROOF_UPLOADED | CONFIRMED | FAILED | REFUNDED`
- `Currency`: `USD | UGX`
- `DocumentKind`: 12 values incl. `CERTIFICATE_OF_INCORPORATION`, `PAYMENT_PROOF`, `OTHER`
- `ReviewActionType`: `ASSIGNED | COMMENTED | REQUESTED_CLARIFICATION | CLARIFICATION_PROVIDED | RECOMMENDED | REJECTED | APPROVED | SHORTLISTED | NOT_SHORTLISTED | LAC_APPROVED | LAC_REJECTED | ALLOCATED | RETURNED_TO_TC | ESCALATED`
- `ApplicationWindowStatus`: `DRAFT | OPEN | CLOSED | ARCHIVED`

---

## Roles

```
INVESTOR      — create / save / submit own EOI; view own status
ADMIN         — full read; confirm payments; manage users + windows (not review decisions)
TC_MEMBER     — list + score + decide SUBMITTED apps (after window closes)
TC_CHAIR      — TC_MEMBER + assign apps
LAC_MEMBER    — list + review SHORTLISTED apps
EXCO_MEMBER   — list + approve/reject LAC_APPROVED apps
```

---

## Module structure

Each module: `apps/api/src/modules/<name>/` with 4 files:
- `<name>.schema.ts` — Zod request schemas
- `<name>.service.ts` — all DB access, status transitions, webhook firing
- `<name>.controller.ts` — parse request → call service → `res.json()` / `next(err)`. No Sequelize.
- `<name>.router.ts` — mount routes, apply guards

Service pattern: fetch → guard status → `sequelize.transaction()` → fire webhook after commit (non-blocking).

| Module | Status |
|---|---|
| `applications/` | create draft, get, update section, submit (DRAFT→SUBMITTED assigns ref) |
| `payments/` | initiate only |
| `users/` | `POST /staff` (create staff); `POST /:id/approve` + `POST /:id/reject` (ADMIN only) |
| `windows/` | `POST /` create; `PATCH /:id` update; `POST /:id/open|close|archive` status transitions (ADMIN only) |
| `health/` | complete |

---

## Error handling

Use factory functions from `apps/api/src/errors.ts` — never `throw new Error()`:
`NotFound` (404) · `BadRequest` (400) · `Unauthorized` (401) · `Forbidden` (403) · `Conflict` (409)

Global error handler maps `AppError`, `ZodError`, Sequelize errors → `{ "error": { "code", "message" } }`.

---

## n8n webhooks

`fireWebhook(event, payload)` — `apps/api/src/webhooks.ts`. HMAC-SHA256 signed (`N8N_WEBHOOK_SECRET`). No-op when `N8N_BASE_URL` or `N8N_WEBHOOK_SECRET` absent. Fire **after** transaction commits, never before. Web mirror: `apps/web/src/lib/webhooks.ts`.

Events: `investor-registered`, `investor-approved` (includes `generatedPassword`), `investor-rejected`, `staff-invited` (includes `tempPassword`), `application-submitted`, `payment-confirmed`, `tc-decision`, `lac-decision`, `exco-decision`, `clarification-requested`, `window-closed`

**Omit `N8N_WEBHOOK_SECRET` from test `.env`** — setting it to `''` causes startup failure (Zod requires `min(8)` when key is present).

---

## S3

Path: `applications/{applicationId}/documents/{documentId}/{originalFilename}`
MIME: `application/pdf`, `image/jpeg`, `image/png`. Max: 10 MB. PUT expiry: 10 min. GET expiry: 5 min.
Helper: `apps/api/src/storage/index.ts` — `presignUpload()`, `presignDownload()`.

---

## Environment variables

### API (`apps/api/src/env.ts`)

```env
NODE_ENV=development
DATABASE_URL=postgresql://kip:kip_dev_password@localhost:5433/kip_portal?schema=public
API_PORT=4001
WEB_PUBLIC_URL=http://localhost:4000
LOG_LEVEL=info
NEXTAUTH_SECRET=          # REQUIRED; must match both portals
N8N_WEBHOOK_SECRET=       # optional; omit for tests
N8N_BASE_URL=             # e.g. http://localhost:5678
S3_ENDPOINT=              # empty = AWS
S3_REGION=auto
S3_BUCKET=kip-documents
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
ANTHROPIC_API_KEY=        # optional
EOI_APPLICATION_FEE_USD=1000
EOI_APPLICATION_FEE_UGX=3700000
```

### Admin portal (`apps/web`) / NextAuth

```env
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=          # min 32 chars, must match API + investor portal
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_PORTAL_URL=http://localhost:4002   # investor portal URL — used to redirect INVESTOR role after login
EMAIL_SERVER_HOST=localhost
EMAIL_SERVER_PORT=1025
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=noreply@kip.local
```

### Investor portal (`apps/portal`) / NextAuth

```env
NEXTAUTH_URL=http://localhost:4002
NEXTAUTH_SECRET=          # min 32 chars, must match API + admin portal
NEXT_PUBLIC_API_URL=http://localhost:4001
EMAIL_SERVER_HOST=localhost
EMAIL_SERVER_PORT=1025
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=noreply@kip.local
```

Planned (not yet wired): `PAYMENT_GATEWAY_PUBLIC_KEY`, `PAYMENT_GATEWAY_SECRET_KEY`, `PAYMENT_GATEWAY_WEBHOOK_SECRET`.

---

## Seed accounts (`pnpm db:seed`)

Password: **`KipPortal2025!`**

| Role | Email |
|---|---|
| ADMIN | admin@kip.unoc.co.ug |
| TC_CHAIR | tc.chair@kip.unoc.co.ug |
| TC_MEMBER | tc.reviewer@kip.unoc.co.ug |
| LAC_MEMBER | lac.member@kip.unoc.co.ug |
| EXCO_MEMBER | exco@kip.unoc.co.ug |

| Email | Org | App ref | Status |
|---|---|---|---|
| investor@gulfpetrochem.ae | Gulf Petrochem International FZE | KIP-EOI-2026-0001 | LAC_REVIEW |
| investor@ugfertiliser.co.ug | Uganda Fertiliser Manufacturing Co. Ltd | KIP-EOI-2026-0002 | ALLOCATED |
| investor@sabastar.co.ug | Sabastar General Trading Co. Ltd | KIP-EOI-2026-0003 | NOT_SHORTLISTED |
| investor.ug@nileenergy.co.ug | Nile Energy Ventures Ltd | *(draft)* | DRAFT |

Window: "Phase 1 — Round 1: Priority Industries" — `OPEN`, Jan–Jun 2026. `sequenceCounter = 3`.

---

## Key files

| File | What it is |
|---|---|
| `packages/db/src/index.ts` | Sequelize singleton + 13 model inits + associations |
| `packages/db/src/models/` | 13 model files |
| `packages/db/migrations/` | All applied migrations (initial, lac-pipeline, investor-org-tin, user-status, payment-unique-index) |
| `packages/db/seed.ts` | Raw pg seed — idempotent |
| `packages/shared/src/enums.ts` | All enums — source of truth |
| `packages/shared/src/schemas/` | Zod schemas for sections, documents, payments |
| `apps/api/src/errors.ts` | `AppError` + factory functions |
| `apps/api/src/env.ts` | Zod-validated env |
| `apps/api/src/server.ts` | Express setup — CORS, helmet, middleware, routes |
| `apps/api/src/middleware/auth.ts` | `requireAuth` + `requireRole` |
| `apps/api/src/storage/index.ts` | `presignUpload()`, `presignDownload()` |
| `apps/api/src/webhooks.ts` | `fireWebhook()` utility |
| `apps/api/src/modules/applications/` | Draft, get, section update, submit |
| `apps/api/src/modules/payments/` | Initiate payment |
| `apps/api/src/modules/users/` | Approve + reject investor accounts |
| `apps/web/src/lib/auth.ts` | NextAuth config — Email + Credentials, custom SequelizeAdapter |
| `apps/web/src/lib/rbac.ts` | RBAC policy — single source for both middleware + server guards |
| `apps/web/src/lib/format.ts` | Pure formatters (date/money) — deterministic, unit-tested |
| `apps/web/src/lib/admin/queries.ts` | `server-only` admin read layer |
| `apps/web/src/lib/admin/mappers.ts` | Pure DB-row → view-model mappers, unit-tested |
| `apps/web/src/lib/investor-data.ts` | Investor read data layer — live on seeded data |
| `apps/web/src/lib/webhooks.ts` | Server-only `fireWebhook()` for Next.js API routes |
| `apps/web/src/components/` | Shared UI: `site-nav`, `admin-topbar`, `dashboard-sidebar`, `stat-card`, `status-badge`, `data-table`, `payment-amount-card`, `countdown-timer` — check before building new UI |
| `apps/web/src/components/ui/` | Primitives: `alert`, `avatar`, `badge`, `button`, `card`, `dropdown-menu`, `input`, `separator`, `sheet`, `table`, `tooltip` |
| `apps/web/src/app/(admin)/console/users/[id]/page.tsx` | User detail page |
| `apps/web/src/app/(admin)/console/users/[id]/user-action-buttons.tsx` | Approve/Reject client component |
| `apps/web/src/app/(admin)/console/users/invite-staff-dialog.tsx` | Invite staff member dialog (calls `POST /users/staff`) |
| `apps/web/src/app/(admin)/console/windows/windows-client.tsx` | Windows page client shell with Create dialog |
| `apps/web/src/app/(admin)/console/windows/create-window-dialog.tsx` | Create/edit window dialog |
| `apps/web/src/app/(admin)/console/windows/window-actions.tsx` | Per-window open/close/archive action buttons |
| `apps/web/src/app/api/register/route.ts` | `POST /api/register` — creates InvestorOrg + User (PENDING_REVIEW), fires webhook |
| `apps/web/src/app/contact/page.tsx` | Public contact form — server action sends email via nodemailer to admin@kip.unoc.co.ug |
| `apps/web/src/app/how-it-works/page.tsx` | 6-step EOI process walkthrough — public static page |
| `apps/web/src/app/for-investors/page.tsx` | Investor benefits, incentives, land categories, eligibility — public static page |
| `apps/web/src/app/faq/page.tsx` | FAQ accordion (5 categories, `<details>/<summary>`) — public static page |
| `apps/web/src/app/help/page.tsx` | Help centre with 6 category cards linking to FAQ — public static page |
| `apps/web/src/app/privacy/page.tsx` | Privacy Policy document (Uganda DPPA 2019) — public static page |
| `apps/web/src/app/terms/page.tsx` | Terms of Service document — public static page |
| `apps/web/src/app/land-map/page.tsx` | Land map page — embeds `/kip-plot-map.pdf` + zone legend + infrastructure specs |
| `apps/web/src/app/resources/page.tsx` | Downloads page — KIP plot map PDF + coming-soon placeholders |
| `apps/web/src/app/not-found.tsx` | Custom 404 page matching site design |
| `apps/web/src/lib/public-data.ts` | `server-only` — `getActiveApplicationWindow()` queries DB for OPEN window (used on home page) |
| `apps/web/public/kip-plot-map.pdf` | Official KIP Phase 2 plot allocation map |
| `apps/web/public/kip-infrastructure.jpg` | BRIC2922 — yellow COSL petroleum tanks (used in home page feature card) |
| `apps/web/public/kip-refinery.jpg` | BRIC2979 — refinery construction scaffolding (used in sign-in left panel) |

---

## Deployment — Vercel demo (`apps/web` + `apps/portal`)

- Two Vercel projects, one per app: `kip-portal` (admin, Root Directory `apps/web`) and `kip-portal-investor` (investor, Root Directory `apps/portal`). Both share the same Neon store and the same `NEXTAUTH_SECRET`.
- `apps/web/vercel.json` / `apps/portal/vercel.json` — install/build commands. "Include source files outside of the Root Directory" must stay enabled (pnpm workspace). Only the **admin** build runs migrations + idempotent seed against `DATABASE_URL_UNPOOLED` (Neon marketplace env vars are *sensitive* — not pullable locally); the portal build just compiles `@kip/db` + `next build`.
- Database: hosted Postgres (Neon, provisioned via Vercel Storage). TLS: `packages/db/src/ssl.ts` `databaseNeedsSsl()` — any non-local host gets TLS `dialectOptions` unless the URL says `sslmode=disable`; local Docker URLs are unaffected.
- Read-only demo: the Express API (`apps/api`) is **not** deployed — admin mutation buttons (approve/reject, invite staff, window actions, bank-transfer confirm) will fail. Reads work because the web app queries the DB directly.
- Required Vercel env vars: `DATABASE_URL`, `NEXTAUTH_URL` (the Vercel URL), `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PORTAL_URL`. Email magic link + contact form need SMTP and are non-functional on the demo; credentials sign-in works.

---

## Common commands

```bash
pnpm dev                    # web + api in parallel
pnpm db:build               # compile @kip/db (required after model changes)
pnpm db:migrate             # apply pending migrations
pnpm db:migrate:status      # show applied/pending
pnpm db:migrate:fake        # mark pending as applied without running SQL
pnpm db:seed                # seed test data
pnpm build                  # build all
pnpm typecheck              # typecheck all
pnpm lint                   # lint all
pnpm docker:up              # postgres + n8n + mailhog
pnpm docker:down
pnpm docker:logs
```

---

## Testing

Runner: **Vitest**. `pnpm test` runs all; `pnpm --filter @kip/web test` for web only.

Unit-test only **pure** functions (mappers, formatters) — they have no `@kip/db` import and need no DB. Tests live next to source as `*.test.ts`. Query modules and server components are not unit-tested (need DB/runtime).

Before committing a data-layer change: `pnpm --filter @kip/web typecheck && pnpm --filter @kip/web test`.

---

## Payment method

**Bank transfer only** — Stanbic Bank direct transfer is the only accepted payment method for the application fee. Do not implement or re-introduce card (Visa/Mastercard) payment flows in any UI. The `PaymentMethod.CARD` enum value remains in the schema but is not exposed.

---

## What NOT to do

- `throw new Error()` in services — use factory functions from `errors.ts`
- Sequelize queries in controllers — controllers call services only
- `@kip/db` import in mappers/formatters — breaks unit tests
- Non-deterministic time in mappers — take `now` as a parameter
- `DataTypes.STRING` for long text — use `DataTypes.TEXT`
- Select/return `passwordHash` or any secret in a view-model
- Write through the read layer — mutations go via the API
- Query `@kip/db` from a client component or directly inside a page
- One-layer route protection — need both middleware policy entry AND `requireRole()`
- `NEXTAUTH_SECRET` drift between web and api
- Hardcode API base URL in client components — use `NEXT_PUBLIC_API_URL`, pass `credentials: "include"`
- Fire webhooks before the DB transaction commits
- Hardcode payment amounts — read from env
- Assign `reference` outside the submit transaction
- Add a global auth-bypass flag (the removed `SKIP_AUTH_DEV`)
- Hardcode role strings in pages — import from `lib/rbac.ts`
- Implement MTN MoMo or Airtel Money — out of scope
- Expose AI screening data to INVESTOR role
- Edit `packages/db/dist/` — generated by `pnpm db:build`
- Use npm or yarn — pnpm only
- Update CLAUDE.md as a follow-up — same commit as the code change
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            