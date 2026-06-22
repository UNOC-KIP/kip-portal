# CLAUDE.md — KIP Investor Portal
> Single source of truth for every agent working in this repo.
> **Keep this file accurate.** Update it in the same task/PR as any architectural change — new files, schema migrations, new modules, env var additions, pattern changes. An outdated CLAUDE.md is worse than none.
> Last updated: 19 June 2026

---

## Documentation discipline (read first)

Every agent working in this repo **must** update this file whenever they:
- Add or remove a source file that other agents would need to find
- Change the database schema (models, enums, indexes)
- Add a new module, route, or service layer file
- Change an architectural pattern (auth, error handling, module structure)
- Add or remove environment variables
- Change any of the facts in the "Files already built" table

Update the relevant section in the same commit as the code change. Do not defer it.

---

## What this project is

The **KIP Investor Portal** is a web platform built for **UNOC** (Uganda National Oil Company) and **URHC** (Uganda Refinery Holding Company). It digitises the Expression of Interest (EOI) to land allocation journey for the **Kabalega Petro-Based Industrial Park (KIP)** in Hoima District, Uganda.

Investors apply online for industrial plots. Applications go through a multi-committee review pipeline before land is allocated.

**Solo developer:** Crispus. **Stakeholder / UAT lead:** Lilian.

---

## Monorepo structure

```
kip-portal/
├── apps/
│   ├── web/                   Next.js 14 (App Router) — investor + admin frontend
│   │   └── src/
│   │       ├── app/           Route groups: (auth), (investor), (admin), about, api
│   │       ├── components/    Shared UI components (+ ui/ primitives)
│   │       ├── context/       React context providers
│   │       └── lib/           auth.ts (NextAuth), utils.ts, investor-data.ts (placeholder data)
│   └── api/                   Express / Node.js — REST API (port 4000)
│       └── src/
│           ├── modules/       applications/, payments/, health/, webhooks/
│           ├── middleware/    auth.ts, error-handler.ts, request-context.ts
│           ├── storage/       S3 presigned URL helpers
│           ├── env.ts         Zod-validated env
│           ├── errors.ts      AppError + factory functions
│           ├── logger.ts      pino logger (LOG_LEVEL)
│           ├── server.ts      Express app setup
│           └── index.ts       Entry point
├── packages/
│   ├── db/                    Sequelize package (@kip/db) — compiled to dist/
│   │   ├── src/
│   │   │   ├── index.ts       Sequelize instance + model init + associations
│   │   │   ├── migrate.ts     umzug CLI runner (pnpm db:migrate)
│   │   │   └── models/        One file per model (13 files)
│   │   ├── migrations/        Sequelize/umzug migration files (TypeScript)
│   │   │   ├── 20260526060720-initial.ts
│   │   │   └── 20260608120000-lac-committee-pipeline.ts
│   │   ├── seed.ts            Raw pg seed — idempotent, no ORM dependency
│   │   └── dist/              Compiled CJS output (generated — do not edit)
│   └── shared/                Zod schemas + enums (@kip/shared)
│       └── src/
│           ├── enums.ts       All enums as `as const` objects + union types (source of truth — sync with DB)
│           └── schemas/       application.ts, document.ts, payment.ts
├── docker-compose.yml         PostgreSQL + n8n + MailHog + api + web
├── CLAUDE.md                  ← you are here
└── .env                       Local dev env (not committed)
```

**Package manager:** pnpm workspaces — **always use `pnpm`, never npm or yarn.**

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14, App Router, Tailwind CSS | |
| Backend | Express.js, Node.js, TypeScript | Port 4000 |
| ORM | **Sequelize 6** + pg (pure JS) | Client package: `@kip/db`. No native binaries — works on ARM64 Windows. Compiled to `dist/` so Next.js loads it as a server-external. |
| Migrations | **umzug 3** + TypeScript migration files | `packages/db/migrations/` |
| Database | PostgreSQL 16 | Local Docker port **5433** (maps to 5432 inside container) |
| Auth | **NextAuth.js** — Email magic link + Credentials | JWT session strategy. Config: `apps/web/src/lib/auth.ts` |
| File storage | S3-compatible — presigned PUT/GET URLs | Helper: `apps/api/src/storage/index.ts` |
| Email | MailHog (local, SMTP 1025, UI 8025) → AWS SES (prod) | Routed via n8n |
| Automation | n8n (port 5678) — notifications, SLA watchdogs, AI screening | |
| AI screening | Anthropic Claude API (Sonnet) via n8n | Batch API + Prompt Caching |
| Hosting | AWS: EC2 + RDS + S3 + CloudFront + Route 53. Region: **ap-south-1 (Mumbai)** | |

---

## Why Sequelize instead of Prisma

Prisma 6 has no `windows-arm64` query engine binary. Node.js v24 on this ARM64 Windows dev machine cannot load Prisma's x64 `.dll.node`. Sequelize runs pure JavaScript with `pg` — no native binary needed on any platform.

**`@kip/db` must be compiled before use.** Run `pnpm db:build` (or `pnpm --filter @kip/db build`) after any change to `packages/db/src/`. Next.js loads `@kip/db` as a `serverExternalPackage` from `dist/index.js` — if you skip the build step the web app will use stale code.

---

## Authentication — NextAuth (current implementation)

Auth is handled by **NextAuth.js** in the web app. The Express API **verifies the same NextAuth session JWT** — there is no stub/bypass. The web app mints a JWT session (signed/encrypted with `NEXTAUTH_SECRET`); the API decodes it with the same secret.

**NextAuth config:** `apps/web/src/lib/auth.ts`
- Providers: `EmailProvider` (magic link) + `CredentialsProvider` (email + bcrypt password)
- Adapter: custom `SequelizeAdapter()` (inline in `auth.ts`) — no external adapter package. Writes to `Account`, `Session`, `VerificationToken` tables using `@kip/db` Sequelize models.
- Session strategy: JWT
- Callbacks: JWT token and session callbacks extend the user object with `id` and `role`

**Web pages:** `/sign-in`, `/sign-up`, `/verify` — in `apps/web/src/app/(auth)/`

**API middleware:** `apps/api/src/middleware/auth.ts`
- `requireAuth` reads the token from `Authorization: Bearer <token>` (preferred, for server-to-server calls) or the `next-auth.session-token` cookie, then `decode({ token, secret: NEXTAUTH_SECRET })` (from `next-auth/jwt`). Populates `req.user = { id, role }`. Invalid/absent → 401.
- `requireRole(...allowed)` → 403 if `req.user.role` isn't allowed.
- **`NEXTAUTH_SECRET` must be identical in `apps/web` and `apps/api`** (the API can't verify tokens otherwise). It's required in `apps/api/src/env.ts`.
- Mutating routes also enforce **ownership** in the handler/service (an investor may only act on their own application; ADMIN may act on any).

**ADMIN can access all role-gated routes** — always include `UserRole.ADMIN` in `requireRole(...)` calls.

---

## Access control (RBAC) — read before touching any protected route

**Two enforced layers, one policy.** The policy lives in `apps/web/src/lib/rbac.ts` (pure, edge-safe, unit-tested). Both layers consult it:

1. **Edge — `middleware.ts`.** Runs on every matched route (`/dashboard/*`, `/console/*`, `/launch`, `/unauthorized`, auth pages). Requires a valid NextAuth JWT and checks the role against the path policy. Unauthenticated → `/sign-in?from=…`; wrong role → that role's own home (never a forbidden page).
2. **Server — `rbac-server.ts` (`requireRole` / `requireStaff`).** Every sensitive server component/layout calls one of these. Defense in depth: even if the matcher is misconfigured, the page still refuses to render data for the wrong role.

**Never rely on only one layer.** A new protected page must (a) fall under a middleware-matched prefix with a policy entry, **and** (b) call `requireRole(...)` (or live under a layout that does).

### Role → access map

| Area | Path | Allowed roles |
|---|---|---|
| Investor | `/dashboard/*` | `INVESTOR` |
| Admin console | `/console`, `/console/applications`, `/console/users`, `/console/windows`, `/console/bank-transfers`, `/console/land-plots`, `/console/report` | `ADMIN` |
| TC review | `/console/tc/*` | `TC_MEMBER`, `TC_CHAIR`, `ADMIN` |
| Post-login router | `/launch` | any authenticated |
| No-workspace notice | `/unauthorized` | any authenticated |

- **Post-login routing:** sign-in sends everyone to `/launch`, which redirects via `homePathForRole()` — INVESTOR→`/dashboard`, ADMIN→`/console`, TC→`/console/tc/queue`, LAC/ExCo→`/unauthorized`.
- **LAC/ExCo** have no dedicated screens yet (Phase 3). They land on `/unauthorized` rather than seeing admin data. Build their queues, then add the policy entries + a layout guard.
- **`homePathForRole` must point each role at a page it can actually reach** — otherwise middleware loops. This invariant is asserted in `rbac.test.ts`; keep it green when changing the policy.
- **Guard layers must agree.** When you add a `requireRole` to a page, add/confirm the matching middleware policy entry (and vice-versa).

> **Removed:** the old `SKIP_AUTH_DEV` global auth-bypass. It disabled the entire middleware, which is unacceptable on a platform with role-segregated data. To preview a screen, sign in with a seed account (see "Seed accounts").

---

## Web data access — hybrid (reads direct, writes via API)

**Decided 2026-06-16.** The web app has two ways to reach data and uses each where it is strongest:

- **Reads → direct DB from Next.js server components.** Server components/pages call a typed, server-only data layer that queries `@kip/db` (Sequelize) directly. No HTTP hop, no second auth, fully type-safe. `@kip/db` already runs inside Next (NextAuth's `SequelizeAdapter` needs it), so this adds no new infrastructure. This is the established pattern — see `apps/web/src/lib/investor-data.ts` (investor side) and `apps/web/src/lib/admin/queries.ts` (admin side).
- **Writes → the Express API.** Mutations (confirm payment, submit EOI, TC/LAC/ExCo decisions, initiate payment) go through the API so its **services own the status machine and fire n8n webhooks** (see "Service pattern"). Never write through the read layer.

**Read data-layer rules (follow for every new read):**
1. **Server-only.** Put queries in a module that starts with `import "server-only"`. Never query `@kip/db` from a client component.
2. **Pages stay presentational.** A page calls one data-layer function and renders the result. No Sequelize in pages.
3. **Separate pure mapping from DB access.** DB rows → view-models happens in a **pure** module with **no `@kip/db` import** (importing `@kip/db` instantiates Sequelize at load and breaks unit tests). The query module pulls Sequelize rows, reduces them to plain objects, and calls the pure mappers. Pattern: `lib/admin/queries.ts` (DB) + `lib/admin/mappers.ts` (pure) + `lib/format.ts` (pure formatters).
4. **`IN` without `Op`.** Sequelize treats an array value as `IN` (`where: { status: ["A", "B"] }`). The web app does not depend on `sequelize` directly, so avoid importing `Op`.
5. **Never select-and-return secrets.** You may read `passwordHash` to derive a boolean (e.g. `hasPassword`), but never return it in a view-model. No PII/tokens in logs or responses.
6. **Empty states are real.** Seeded data legitimately yields empty results (e.g. no pending bank transfers — all seed payments are `CONFIRMED`). Render an explicit empty state, never fake rows.

---

## Application fee & payment

- **Fee:** USD 1,000
- **Amount storage:** `DECIMAL(14,2)` — e.g. `1000.00` (not integer cents)
- **Currency:** stored as `Currency` enum — `USD` or `UGX`
- **Methods in scope:** `STANBIC_TRANSFER` (manual bank transfer, proof upload, confirmed by ADMIN) + `CARD` (Visa/Mastercard via PSP webhook)
- **Out of scope — do not implement:** MTN MoMo, Airtel Money

---

## Application status machine

**Migrations applied** (initial + `20260608120000-lac-committee-pipeline`). Schema is live. Implement all new modules against this pipeline.

### Pipeline (live in schema and DB)

```
DRAFT_PAYMENT_PENDING
    │  Payment.status = CONFIRMED (admin confirms Stanbic, or PSP webhook)
    ▼
DRAFT
    │  Investor fills all 6 sections; ApplicationWindow must be OPEN
    ▼
SUBMITTED               referenceNumber = KIP-EOI-YYYY-NNNN assigned here
    │  Window closes; TC access unblocked
    ▼
UNDER_TC_REVIEW
    │
    ├─ SHORTLISTED       → proceeds to LAC
    ├─ NOT_SHORTLISTED   → terminal
    └─ TC_CLARIFICATION_REQUESTED → investor responds → back to UNDER_TC_REVIEW
         │
         ▼ (from SHORTLISTED only)
    LAC_REVIEW
    │
    ├─ LAC_APPROVED      → proceeds to ExCo
    ├─ LAC_REJECTED      → terminal
    └─ REQUEST_MORE_INFO → creates ClarificationRequest, stays SHORTLISTED
         │
         ▼ (from LAC_APPROVED only)
    EXCO_REVIEW
    │
    ├─ ALLOCATED         → terminal (success)
    └─ LAC_REJECTED      → terminal (ExCo reject reuses same status)

WITHDRAWN               → terminal — investor can withdraw before SUBMITTED
```

**Critical business rules:**
1. Cannot leave `DRAFT_PAYMENT_PENDING` until a `Payment` with `status=CONFIRMED` exists
2. `SUBMITTED` only allowed while `ApplicationWindow.status = OPEN` and `now()` is between `openAt` and `closeAt`
3. TC / LAC / ExCo **cannot access submitted applications while the window is still open** — return `403 FORBIDDEN`
4. ExCo is one-shot — no API reversal path once a decision is recorded
5. LAC `REQUEST_MORE_INFO` creates a new `ClarificationRequest` row; does **not** create a second LAC review record

---

## Reference number format

`KIP-EOI-YYYY-NNNN` — assigned on `SUBMITTED` transition.

- `YYYY` = year of the active `ApplicationWindow`
- `NNNN` = zero-padded 4-digit sequence, incremented atomically via `ApplicationWindow.sequenceCounter` inside a Sequelize transaction
- `reference` is nullable until submission; unique once set

**Implemented** (`apps/api/src/modules/applications/`): `POST /applications` creates a draft with `reference = null`; `POST /applications/:id/submit` (service: `applications.service.ts → submitApplication`) does the DRAFT→SUBMITTED transition — ownership + completeness (all 6 sections) + window-open guards, then increments `sequenceCounter` and assigns the reference in one transaction. Formatter: `formatReference(year, seq)` in `@kip/shared` (unit-tested). Do not assign references anywhere else.

---

## Database schema

**Migrations:** `packages/db/migrations/` — TypeScript files run via umzug (`pnpm db:migrate`)
**Import as:** `import { sequelize, User, Application, ... } from "@kip/db"`
**Model files:** `packages/db/src/models/` — one `.ts` per model, `Model.init()` pattern (no decorators)

### Current models (13 models, 9 enums)

| Model | Purpose |
|---|---|
| `User` | All roles in one table. Investors self-register; staff seeded by ADMIN |
| `Account` | NextAuth OAuth/email accounts linked to a User |
| `Session` | NextAuth active sessions |
| `VerificationToken` | NextAuth email verification tokens |
| `InvestorOrg` | Investor's company. Created at sign-up. User.investorOrgId links here |
| `ApplicationWindow` | Configures the open/close period for an EOI round |
| `Application` | Central EOI record |
| `ApplicationSection` | One row per section per application. `payload` is JSON validated by `@kip/shared` Zod schemas |
| `Document` | S3 file metadata. One row per upload |
| `Payment` | Payment record. `amount DECIMAL(14,2)` + `currency`. Gates `DRAFT_PAYMENT_PENDING → DRAFT` |
| `ReviewAction` | Append-only audit log of all review decisions and comments |
| `ClarificationRequest` | LAC REQUEST_MORE_INFO records — linked to Application + requestedBy User |
| `Notification` | In-app and email notification records |

### Enums (defined in `packages/shared/src/enums.ts` — source of truth — keep Sequelize model strings in sync)

- `UserRole`: `INVESTOR | TC_MEMBER | TC_CHAIR | LAC_MEMBER | EXCO_MEMBER | ADMIN`
- `ApplicationStatus`: see status machine above
- `EoiSection`: `PRELIMINARY_INFO | LAND_BUSINESS_PROFILE | UTILITIES_INFRASTRUCTURE | H3SE | NATIONAL_CONTENT | DECLARATION`
- `PaymentMethod`: `CARD | STANBIC_TRANSFER`
- `PaymentStatus`: `PENDING | PROOF_UPLOADED | CONFIRMED | FAILED | REFUNDED`
- `Currency`: `USD | UGX`
- `DocumentKind`: 12 values including `CERTIFICATE_OF_INCORPORATION`, `PAYMENT_PROOF`, `OTHER`, etc.
- `ReviewActionType`: `ASSIGNED | COMMENTED | REQUESTED_CLARIFICATION | CLARIFICATION_PROVIDED | RECOMMENDED | REJECTED | APPROVED | SHORTLISTED | NOT_SHORTLISTED | LAC_APPROVED | LAC_REJECTED | ALLOCATED | RETURNED_TO_TC | ESCALATED`
- `ApplicationWindowStatus`: `DRAFT | OPEN | CLOSED | ARCHIVED`

**Column names are camelCase** — matching the PostgreSQL columns created by the initial migration. Sequelize's `quoteIdentifiers: true` (default) handles quoted identifiers automatically.

**Long text fields use `DataTypes.TEXT`** in the model `init()` call — never `DataTypes.STRING` for fields that can exceed 255 chars.

---

## Roles and access

```
INVESTOR      — create / save / submit their own EOI; view own application status
ADMIN         — full read; confirm Stanbic payments; manage users and windows
TC_MEMBER     — list + score + decide SUBMITTED applications (only after window closes)
TC_CHAIR      — same as TC_MEMBER + can assign applications
LAC_MEMBER    — list + review SHORTLISTED applications
EXCO_MEMBER   — list + approve/reject LAC_APPROVED applications
```

**ADMIN reads all data but does not make review decisions** (exception: payment confirmation).

---

## Module structure — follow this for every new module

Each module lives at `apps/api/src/modules/<name>/` with exactly four files:

```
src/modules/lac/
├── lac.schema.ts      Zod — request body and query param schemas
├── lac.service.ts     Business logic — all DB access, status transitions, webhook firing
├── lac.controller.ts  Thin — parse request, call service, return response
└── lac.router.ts      Mount routes, apply guards
```

**Controllers are thin.** Only: parse with Zod, call service, `res.json()`, `next(err)`. No Sequelize. No business logic.

**Services own the status machine.** Always fetch the application first, check current status, then write inside a `sequelize.transaction()`.

### Current modules (single-file `route.ts` — migrate to 4-file pattern when adding business logic)

| Module | File | Status |
|---|---|---|
| applications | `src/modules/applications/route.ts` + `applications.service.ts` | create draft, get (owner/staff), update section, **submit** (DRAFT→SUBMITTED, assigns reference). Role + ownership enforced. |
| payments | `src/modules/payments/route.ts` | Partial — initiate only (role + ownership enforced) |
| health | `src/modules/health/route.ts` | Complete |
| webhooks | `src/modules/webhooks/n8n.ts` | Stub |

---

## Service pattern — the standard transaction block

```typescript
import { sequelize, Application, ReviewAction } from '@kip/db'
import { ApplicationStatus } from '@kip/shared'
import { NotFound, Conflict } from '../errors.js'

export async function submitLACReview(applicationId: string, reviewerId: string, input: LACReviewInput) {
  // 1. Fetch — always get current status first
  const application = await Application.findByPk(applicationId, {
    include: [{ model: ReviewAction, as: 'reviewActions' }],
  })
  if (!application) throw NotFound('Application')

  // 2. Guard — check status is valid for this transition
  if (application.status !== ApplicationStatus.SHORTLISTED) {
    throw Conflict(`Cannot LAC-review an application with status ${application.status}`)
  }

  // 3. Transact — all writes in one transaction
  const updated = await sequelize.transaction(async (t) => {
    await application.update({ status: newStatus }, { transaction: t })
    await ReviewAction.create({
      applicationId, actorUserId: reviewerId, type: 'APPROVED', ...
    }, { transaction: t })
    return application
  })

  // 4. Fire webhook — AFTER commit, non-blocking, never throws
  await fireWebhook('lac-decision', { applicationId, decision: input.decision })

  return updated
}
```

---

## Error handling

**Use the factory functions from `apps/api/src/errors.ts`** — never `throw new Error()` in services.

```typescript
import { NotFound, BadRequest, Unauthorized, Forbidden, Conflict } from '../errors.js'

throw NotFound('Application')              // 404 NOT_FOUND
throw BadRequest('Window is closed')       // 400 BAD_REQUEST
throw Unauthorized()                       // 401 UNAUTHORIZED
throw Forbidden('Window still open')       // 403 FORBIDDEN
throw Conflict('Duplicate payment')        // 409 CONFLICT
```

Global error handler (`src/middleware/error-handler.ts`) maps `AppError`, `ZodError`, and Sequelize errors to:
```json
{ "error": { "code": "NOT_FOUND", "message": "Application not found" } }
```

---

## Validation

Every route has a Zod schema in `<module>.schema.ts` (new modules) or inline in `route.ts` (existing modules). Parse in the controller before calling any service.

```typescript
const input = lacReviewSchema.parse(req.body)  // ZodError → caught by errorHandler
```

**Query param schemas use `z.coerce`** for numbers:
```typescript
const listQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

---

## n8n webhook pattern

**Express fires webhooks; n8n handles everything downstream** (emails, PDF generation, SLA timers, AI screening). Keep Express thin.

```typescript
// Pattern: fire AFTER transaction commits, non-blocking
await fireWebhook('lac-decision', {
  applicationId,
  investorEmail: application.owner.email,
  decision:      input.decision,
  newStatus,
})
```

- `fireWebhook` is non-blocking — if n8n is down, the DB write already committed
- Payloads are HMAC-SHA256 signed with `N8N_WEBHOOK_SECRET`; n8n validates `X-KIP-Signature`
- **Omit** `N8N_WEBHOOK_SECRET` from test `.env` entirely — once `fireWebhook` is implemented (Phase 3), it will be a no-op when the var is absent. Setting it to `''` causes a startup failure because the Zod schema requires `min(8)` when the key is present.

**Webhook events:**
`application-submitted`, `payment-confirmed`, `tc-decision`, `lac-decision`, `exco-decision`, `clarification-requested`, `window-closed`

---

## S3 document paths

```
applications/{applicationId}/documents/{documentId}/{originalFilename}
```

- Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`
- Max file size: 10 MB (enforced via S3 content-length condition on presigned URL)
- Presigned PUT: 10-minute expiry
- Presigned GET: 5-minute expiry
- Helper: `apps/api/src/storage/index.ts` — `presignUpload()`, `presignDownload()`

---

## AI screening

- Handled **entirely in n8n** using the Anthropic Claude API (Sonnet)
- **Never expose AI screening scores or memos to INVESTOR role** — internal-only
- Use **Batch API + Prompt Caching** for cost efficiency

---

## Environment variables

### API — validated in `apps/api/src/env.ts` (Zod)

These are the **only** variables the API enforces. The process exits on startup if a required one is missing or malformed. Defaults below match the schema.

```env
NODE_ENV=development        # development | test | production (default: development)
DATABASE_URL=postgresql://kip:kip_dev_password@localhost:5433/kip_portal?schema=public
API_PORT=4000               # default: 4000
WEB_PUBLIC_URL=http://localhost:3000   # default
LOG_LEVEL=info              # fatal|error|warn|info|debug|trace (default: info)
NEXTAUTH_SECRET=            # REQUIRED; must equal apps/web NEXTAUTH_SECRET (API verifies web-minted JWTs)
N8N_WEBHOOK_SECRET=         # optional; empty/unset = webhooks are no-ops (good for tests)

# S3 / R2
S3_ENDPOINT=                # empty = AWS; set for R2 or MinIO
S3_REGION=auto              # default: "auto"
S3_BUCKET=kip-documents     # default
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true     # default: "true"

# AI
ANTHROPIC_API_KEY=          # optional

# Fee amounts — server-side business rule; never trust the client amount
EOI_APPLICATION_FEE_USD=1000     # default: 1000 (USD cents are whole francs here — no subunit)
EOI_APPLICATION_FEE_UGX=3700000  # default: 3700000 (UGX)
```

### Web / NextAuth — consumed by the Next.js app (not in the API schema)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=            # min 32 chars random string

# Express API base URL — used by client components (e.g. BankTransferForm) to reach the API.
# Must have NEXT_PUBLIC_ prefix to be available in the browser bundle.
# Code falls back to http://localhost:4000 when unset.
NEXT_PUBLIC_API_URL=http://localhost:4000

# Email (MailHog local)
EMAIL_SERVER_HOST=localhost
EMAIL_SERVER_PORT=1025
EMAIL_SERVER_USER=          # leave blank for MailHog
EMAIL_SERVER_PASSWORD=      # leave blank for MailHog
EMAIL_FROM=noreply@kip.local

# Stanbic bank account details (bank transfer payment page).
# Defaults to UNOC production values; override to change without a code redeploy.
STANBIC_BANK_NAME=Stanbic Bank Uganda Ltd
STANBIC_ACCOUNT_NAME=Uganda National Oil Company Ltd
STANBIC_ACCOUNT_NUMBER=9030011896005
STANBIC_SWIFT=SBICUGKX

# Bank-transfer SLA for the admin console. Hours from proof upload until the
# "Overdue" label appears. Default 48. Parsed in admin/queries.ts at request time.
BANK_TRANSFER_SLA_HOURS=48
```

### Planned — referenced in design but NOT yet wired/validated

These appear in roadmap/design but are **not** read by `env.ts` or any current code. Don't assume they're live; add to `env.ts` when the consuming feature lands.

```env
N8N_BASE_URL=http://localhost:5678
PAYMENT_GATEWAY_PUBLIC_KEY=
PAYMENT_GATEWAY_SECRET_KEY=
PAYMENT_GATEWAY_WEBHOOK_SECRET=
```

> `SKIP_AUTH_DEV` was removed (it bypassed all RBAC — see "Access control"). Don't reintroduce a global auth-bypass flag.

---

## Seed accounts (after `pnpm db:seed`)

Seed password for all accounts: **`KipPortal2025!`** (bcrypt-hashed, works with Credentials provider).

**Staff:**

| Role | Email |
|---|---|
| ADMIN | admin@kip.unoc.co.ug |
| TC_CHAIR | tc.chair@kip.unoc.co.ug |
| TC_MEMBER | tc.reviewer@kip.unoc.co.ug |
| LAC_MEMBER | lac.member@kip.unoc.co.ug |
| EXCO_MEMBER | exco@kip.unoc.co.ug |

**Investors (each linked to their InvestorOrg):**

| Email | Org | App ref | Status |
|---|---|---|---|
| investor@gulfpetrochem.ae | Gulf Petrochem International FZE | KIP-EOI-2026-0001 | LAC_REVIEW |
| investor@ugfertiliser.co.ug | Uganda Fertiliser Manufacturing Co. Ltd | KIP-EOI-2026-0002 | ALLOCATED |
| investor@sabastar.co.ug | Sabastar General Trading Co. Ltd | KIP-EOI-2026-0003 | NOT_SHORTLISTED |
| investor.ug@nileenergy.co.ug | Nile Energy Ventures Ltd | *(draft — no ref)* | DRAFT |

**Application window:** "Phase 1 — Round 1: Priority Industries" — `OPEN`, Jan–Jun 2026. `sequenceCounter = 3`.

**Seed implementation note:** `packages/db/seed.ts` uses `pg` Pool directly (raw SQL) — no ORM dependency. Idempotent (ON CONFLICT DO NOTHING/UPDATE). Safe to run repeatedly.

---

## Files already built — read before modifying anything they touch

| File | What it is |
|---|---|
| `packages/db/src/index.ts` | Sequelize singleton + all 13 model inits + all associations |
| `packages/db/src/migrate.ts` | umzug migration CLI runner — `up`, `down`, `status`, `fake` commands |
| `packages/db/src/models/` | 13 model files: user, account, session, verification-token, investor-org, application-window, application, application-section, document, payment, review-action, clarification-request, notification |
| `packages/db/migrations/20260526060720-initial.ts` | Full initial schema — all tables, enums, indexes, foreign keys |
| `packages/db/migrations/20260608120000-lac-committee-pipeline.ts` | LAC pipeline migration — updated enums, ClarificationRequest, sequenceCounter, nullable reference |
| `packages/db/migrations/20260621000000-payment-pending-unique-index.ts` | Partial unique index `payments_pending_per_app` on `Payment(applicationId) WHERE status='PENDING'` — closes the concurrent-creation race |
| `packages/db/seed.ts` | Full seed — 9 accounts, 4 orgs, 4 apps (LAC_REVIEW / ALLOCATED / NOT_SHORTLISTED / DRAFT), payments, sections, review history |
| `packages/shared/src/enums.ts` | All enums (`as const` objects + union types, not TS `enum`) — source of truth; keep Sequelize model strings in sync |
| `packages/shared/src/schemas/` | Zod schemas for application sections, documents, payments |
| `apps/api/src/errors.ts` | `AppError` class + `NotFound`/`BadRequest`/`Forbidden`/`Conflict`/`Unauthorized` factories |
| `apps/api/src/env.ts` | Zod-validated env schema |
| `apps/api/src/server.ts` | Express app setup — CORS, helmet, middleware, route mounting |
| `apps/api/src/middleware/auth.ts` | `requireAuth` + `requireRole` (stub — real JWT verify is TODO) |
| `apps/api/src/middleware/error-handler.ts` | Global error handler |
| `apps/api/src/storage/index.ts` | `presignUpload()` + `presignDownload()` |
| `apps/api/src/modules/applications/route.ts` | POST /, GET /:id, PUT /:id/section |
| `apps/api/src/modules/payments/route.ts` | POST /initiate |
| `apps/web/src/lib/auth.ts` | NextAuth config — Email + Credentials providers, custom SequelizeAdapter, JWT callbacks |
| `apps/web/src/components/site-nav.tsx` | Sticky floating site nav — `bg` prop: `"gold" \| "white" \| "transparent"` |
| `apps/web/src/components/` (shared) | Page chrome + cards: `site-footer`, `page-header`, `admin-topbar`, `dashboard-topbar`, `dashboard-sidebar`, `sidebar-inset`, `stat-card`, `status-badge`, `data-table`, `payment-amount-card`, `countdown-timer`. **Check here before building new UI.** |
| `apps/web/src/components/ui/` | Primitive set (shadcn-style): `alert`, `avatar`, `badge`, `button`, `card`, `dropdown-menu`, `input`, `separator`, `sheet`, `table`, `tooltip` |
| `apps/web/src/context/sidebar-context.tsx` | Dashboard sidebar open/collapsed state |
| `apps/web/src/lib/investor-data.ts` | Hardcoded investor/dashboard test data — pending live wiring |
| `apps/web/src/app/page.tsx` | Public home page |
| `apps/web/src/app/(auth)/sign-up/page.tsx` | Investor registration form |
| `apps/web/src/app/(auth)/sign-in/page.tsx` | Sign-in (split-panel layout) |
| `apps/web/src/app/(auth)/verify/page.tsx` | OTP / magic link verify step |
| `apps/web/src/lib/format.ts` | Pure display formatters (date/money), deterministic (UTC + fixed locale). Unit-tested. No `@kip/db`. |
| `apps/web/src/lib/investor-data.ts` | Investor read data layer — direct-DB server queries (dashboard + application detail). **Live on seeded data.** |
| `apps/web/src/lib/admin/mappers.ts` | Pure DB-row → table-row mappers + SLA/label helpers for the admin console. Unit-tested. No `@kip/db`. |
| `apps/web/src/lib/admin/queries.ts` | `server-only` admin read layer (applications, app detail, bank transfers, users, windows, TC queue, dashboard stats). Direct-DB via `@kip/db`. |
| `apps/web/src/app/(investor)/dashboard/` | Investor dashboard — **live** via `investor-data.ts`. |
| `apps/web/src/app/(admin)/console/` | Admin console — **live on seeded data** via `admin/queries.ts` (applications list + `[ref]` detail, bank-transfers, users, windows, TC queue, overview). `land-plots`/`report` still placeholder (no backing models yet). |

---

## Common commands

```bash
pnpm dev                         # start web + api in parallel
pnpm --filter @kip/web dev       # web only  (port 3000)
pnpm --filter @kip/api dev       # api only  (port 4000)

pnpm db:build                    # compile @kip/db to dist/ (run after any model change)
pnpm db:migrate                  # apply pending migrations to the DB
pnpm db:migrate:status           # show applied vs pending migrations
pnpm db:migrate:fake             # mark all pending migrations as applied WITHOUT running SQL
                                 # (use on a DB already migrated by a previous tool)
pnpm db:seed                     # seed test data (raw pg, no ORM dependency)

pnpm build                       # build all packages
pnpm typecheck                   # typecheck all packages
pnpm lint                        # lint all packages

docker compose up -d             # start postgres (5433) + n8n (5678) + mailhog (1025/8025)
docker compose down              # stop all local services
docker compose logs -f           # tail all service logs
# pnpm aliases for the three above: pnpm docker:up / docker:down / docker:logs
```

---

## Testing

**Runner: Vitest.** Wired in `apps/web` and `apps/api` (`pnpm --filter @kip/web test` / `--filter @kip/api test`, watch: `test:watch`). `pnpm test` at the root runs every package's `test` script. Config: each app's `vitest.config.ts` (`environment: "node"`, `include: ["src/**/*.test.ts"]`). API unit tests so far cover the reference formatter (`modules/applications/reference.test.ts`).

**What we unit-test today:** the **pure** layer — formatters (`lib/format.ts`) and view-model mappers (`lib/admin/mappers.ts`). These have no `@kip/db` import, so they run with no database. Tests live next to source as `*.test.ts` (e.g. `lib/format.test.ts`, `lib/admin/mappers.test.ts`).

**How to add a testable read (the pattern to copy):**
1. Put the DB→row transform in a **pure** mapper function (no `@kip/db`, no I/O). Inject `now`/clock as a parameter so time-based logic (SLAs, "days in queue") is deterministic.
2. Render dates/money only through `lib/format.ts` (UTC + fixed `en-US` locale → deterministic output, no TZ/locale flakiness).
3. Write `*.test.ts` next to the pure module. Assert exact outputs.
4. Keep the Sequelize query in the `server-only` query module — it is integration-tested against a seeded DB, not unit-tested.

**Conventions:**
- Don't unit-test query modules or React server components directly — they need a DB/runtime. Test the pure functions they delegate to.
- A formatter/mapper must be a pure function of its inputs. If you need the current time, take it as an argument with a default of `new Date()`.
- Before committing a data-layer change: `pnpm --filter @kip/web typecheck` **and** `pnpm --filter @kip/web test`.

**Not yet set up (Phase 4):** integration tests against a test Postgres, API service tests, and golden/component tests. When adding them, record the approach here.

---

## What NOT to do

- **Never use `throw new Error()`** in service files — always use the `AppError` factory functions
- **Never write Sequelize queries in controllers** — controllers call services only
- **Never implement MTN MoMo or Airtel Money** — explicitly out of scope
- **Never expose AI screening data to INVESTOR role** — internal only
- **Never fire n8n webhooks before the DB transaction commits** — write first, then fire
- **Never hardcode payment amounts** — read from env; store as `DECIMAL(14,2)` in DB
- **Never use `DataTypes.STRING` for long text columns** — use `DataTypes.TEXT` to prevent silent truncation at 255 chars
- **Never use `npm` or `yarn`** — this repo uses pnpm workspaces
- **Never implement new modules against the old status machine** (GM_REVIEW / BOARD_APPROVED etc.) — target pipeline is TC → LAC → ExCo → ALLOCATED
- **Never update CLAUDE.md as a separate follow-up** — it must be updated in the same commit as the code change it describes
- **Never edit `packages/db/dist/`** — it is generated by `pnpm db:build`; edit `src/` instead
- **Never query `@kip/db` from a client component or directly inside a page** — reads go through a `server-only` data layer (`lib/.../queries.ts`); pages stay presentational (see "Web data access")
- **Never write data through the read layer** — mutations go through the Express API so its services own the status machine + n8n webhooks
- **Never import `@kip/db` into a pure mapper/formatter** — it instantiates Sequelize at load and breaks unit tests; keep `mappers.ts`/`format.ts` dependency-free
- **Never use non-deterministic time inside a mapper** — take `now` as a parameter (default `new Date()`) so transforms stay unit-testable
- **Never protect a route with only one layer** — a sensitive page needs both a `middleware.ts` policy entry AND a `requireRole(...)` guard (or a guarding layout). See "Access control (RBAC)"
- **Never add a global auth-bypass flag** (the removed `SKIP_AUTH_DEV`) — it disables RBAC for every role; sign in with a seed account to preview instead
- **Never hardcode role strings in pages** — import the role sets (`ADMIN_ONLY`, `TC_ROLES`, …) from `lib/rbac.ts` so the policy stays in one place
- **Never assign an application `reference` outside the submit transaction** — it must come from `formatReference()` + the window's `sequenceCounter`, at the SUBMITTED transition only
- **Never add an unauthenticated/owner-unaware API mutation** — every API route runs `requireAuth`; mutations add `requireRole(...)` AND an ownership check (investor acts only on their own application; ADMIN may act on any)
- **Never let `apps/web` and `apps/api` `NEXTAUTH_SECRET` drift apart** — the API can't verify the web's session tokens if they differ
- **Never hardcode TC deadlines or date offsets in pages** — compute them in the query layer (e.g. `tcDeadlineLabel = closeAt + 21 days` in `getTcQueueView`) so they stay in sync with the active window. See `lib/admin/queries.ts`.
- **Never compare `TcAppRow.status` against raw string literals** — import `TC_STATUS_LABELS` from `lib/admin/mappers.ts` so a rename in `tcStatusLabel()` breaks at the import site rather than silently breaking stat counts.
- **Client components calling the Express API use `NEXT_PUBLIC_API_URL`** (fallback: `http://localhost:4000`). Always pass `credentials: "include"` so the `next-auth.session-token` cookie is forwarded. Do not hardcode the API base URL in client components.
