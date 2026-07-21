# CLAUDE.md — KIP Investor Portal
> Last updated: 13 July 2026. Update this file in the same commit as any architectural change.
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
│   │   ├── src/models/        15 model files
│   │   ├── migrations/        umzug TypeScript migrations
│   │   └── seed.ts            Raw pg seed, idempotent
│   └── shared/       @kip/shared — enums.ts + zones.ts + timeline.ts (source of truth) + Zod schemas
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
| Email | Office 365 SMTP (`smtp.office365.com:587`, `Support.Kip@unoc.com`) — MailHog (SMTP 1025, UI 8025) still available for offline dev |
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

**Cross-subdomain session cookie.** In production the portals and API live on different subdomains (`portal.kip.unoc.com`, `kip.unoc.com`, `api.kip.unoc.com`), so browser `fetch` calls to the API only carry the session cookie if it has `Domain=.kip.unoc.com`. Set **`COOKIE_DOMAIN=.kip.unoc.com`** for both `apps/web` and `apps/portal` (runtime env; leave unset in local dev so the cookie stays host-only). Each app names its cookie distinctly to avoid clobbering on the shared domain — `kip-admin.session-token` (web) and `kip-investor.session-token` (portal), each `__Secure-`-prefixed under HTTPS. The API's `SESSION_COOKIE_NAMES` list must include both. Symptom when misconfigured: API returns 401 `Missing session token` on admin/investor actions.

**A browser can carry BOTH cookies** — on a shared host in dev (cookies ignore port, so `localhost:4000` and `localhost:4002` share a jar) and on the shared parent domain in prod. So the API's `extractToken` picks the cookie matching the request **`Origin`** (portal Origin → investor cookie, web Origin → admin cookie; `Bearer` still wins outright). Without this, a user signed into both portals authenticates as whichever cookie comes first in the header — e.g. an investor's write executes as the admin. Symptom: mutations attributed to the wrong user (a new investor gets "You already have an active site visit request" because the request ran as an admin who has one).

**Always include `UserRole.ADMIN` in `requireRole(...)` calls.**

**Investor registration self-activates.** `POST /api/register` (portal) creates the `InvestorOrg` + `User` with **`status = ACTIVE`**, generates a random password, bcrypt-hashes it, and emails the plaintext straight to the authorized representative. There is no admin approval gate — this was removed to shorten time-to-portal-access. `POST /users/:id/approve` and `/reject` remain in the API for legacy `PENDING_REVIEW` rows and for deactivating accounts; `approveUser` throws `Conflict` on an already-`ACTIVE` user. The `authorize()` guard still blocks `REJECTED` and `PENDING_REVIEW` sign-ins.

**Never put a generated password in a webhook payload from the register route.** (`investor-approved` still carries `generatedPassword` for the legacy admin-approval path.)

**Self-service credentials.** Because the password is auto-generated and emailed, users change it themselves via **`POST /users/me/password`** (verify current → bcrypt-rehash → stamp `User.passwordChangedAt` → best-effort `passwordChangedEmail`). Changing the password does **not** invalidate the current JWT session (JWT strategy), so the user stays signed in. `PATCH /users/me` edits own rep details + own org contact block only. Both live on `usersRouter` and **must stay declared before `/:id`** so `me` isn't parsed as a user id. The investor Settings page (`/dashboard/settings`) drives both; the dashboard shows a change-password nudge while `passwordChangedAt` is NULL.

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
| portal | Site-visit booking | `/dashboard/site-visit` | `INVESTOR` |
| portal | Account settings | `/dashboard/settings` | `INVESTOR` |
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
**Soft delete:** `User`, `InvestorOrg`, `Application`, `ApplicationWindow`, `Payment` are `paranoid: true` (`deletedAt` column) — `destroy()` hides the row from every default-scope query; recoverable in SQL. A soft-deleted user still owns its email (unique index) — pass `paranoid: false` when checking email uniqueness. Child tables (sections, documents, review actions) are not paranoid; they become unreachable when their parent Application is hidden.

| Model | Key columns / notes |
|---|---|
| `User` | `email`, `passwordHash`, `name`, `designation`, `phone`, `role`, `status (UserStatus)`, `investorOrgId`, `passwordChangedAt` (NULL = still on the auto-generated password; drives the portal's "change your password" nudge) — for INVESTOR, `name/designation/phone/email` describe the authorized representative (email = login) |
| `Account`, `Session`, `VerificationToken` | NextAuth tables |
| `InvestorOrg` | `legalName`, `tradingName`, `registrationNumber`, `ursbRegistrationNumber`, `companyType (CompanyType)`, `businessSector (BusinessSector)`, `countryOfIncorporation`, `tin`, `address`, `phone`, `email` — company-official contact, distinct from the rep's on `User` |
| `ApplicationWindow` | open/close period, `sequenceCounter` |
| `Application` | central EOI record |
| `ApplicationSection` | one row per section, `payload` JSON |
| `Document` | S3 file metadata |
| `Payment` | `amount DECIMAL(14,2)`, `currency`, gates DRAFT_PAYMENT_PENDING→DRAFT |
| `ReviewAction` | append-only audit log |
| `ClarificationRequest` | LAC REQUEST_MORE_INFO records |
| `Notification` | in-app + email records |
| `Inquiry` | public contact-form / live-chat messages — `channel (InquiryChannel)`, `status (InquiryStatus)`, `respondedById` → User; tracked in `/console/inquiries` |
| `NotifySignup` | "notify me" emails from the portal home page — `email` unique |
| `TimelineMilestone` | admin-managed application timeline — `position` (unique, orders the list), `kind` (`GENERIC \| SITE_VISIT_BOOKING \| SITE_VISIT \| EOI_CALL`), `title`, `dateLabel` (display text), `startsAt` (drives the active stage), `endsAt`, `status` (`AUTO \| UPCOMING \| CURRENT \| COMPLETED` — AUTO derives from dates, others are manual overrides); pure logic + fallback in `@kip/shared` timeline.ts. `SITE_VISIT_BOOKING` = the booking window (bookings open until its `endsAt`); `SITE_VISIT` = the visits themselves (display; also gates bookings as a legacy fallback when no booking milestone exists) |
| `SiteVisitBooking` | investor site-visit request — `zone (KipZone, TEXT)`, `landUse`, `description TEXT`, `acres INTEGER` (CHECK 1–100), `status (SiteVisitStatus)`, `scheduledAt`, `handledById` → User; tracked in `/console/site-visits` |

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
- `CompanyType`: `LIMITED_LIABILITY_COMPANY | PUBLIC_LIMITED_COMPANY | JOINT_VENTURE | PARTNERSHIP | SOLE_PROPRIETORSHIP | OTHER`
- `BusinessSector`: `PETROCHEMICALS_REFINING | FERTILISERS_CHEMICALS | LIGHT_MANUFACTURING | AGRO_PROCESSING | LOGISTICS_WAREHOUSING | COMMERCIAL_HOSPITALITY | ICT | OTHER`
- `InquiryChannel`: `CONTACT_FORM | LIVE_CHAT`
- `InquiryStatus`: `NEW | RESPONDED | CLOSED`
- `SiteVisitStatus`: `NEW | SCHEDULED | COMPLETED | CANCELLED`
- `COMPANY_TYPE_LABELS` / `BUSINESS_SECTOR_LABELS` / `INQUIRY_CHANNEL_LABELS` / `SITE_VISIT_STATUS_LABELS` display-label maps live beside the enums

**Zones** (`packages/shared/src/zones.ts` — source of truth): `KipZone` = `HEAVY_INDUSTRIAL | LIGHT_DOWNSTREAM | AGRO_INDUSTRIAL | BUSINESS_COMMERCIAL | RESIDENTIAL_ESTATE | ADMINISTRATION`. `KIP_ZONES` carries each zone's label, legend colour, area, description, `investable` flag and `landUses[]`. Only the four `investable` zones are offered in the site-visit form (`INVESTABLE_ZONES`); the land map renders all six. Helpers: `landUsesForZone()`, `isInvestableZone()`, `KIP_ZONE_LABELS`, `SITE_VISIT_MIN_ACRES` / `SITE_VISIT_MAX_ACRES`.

> `KIP_ZONES[].color` holds Tailwind classes, so `packages/shared/src/**/*.ts` is in the `content` glob of **both** apps' `tailwind.config.ts`. Removing it silently purges the zone swatches.

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
| `applications/` | create draft, get, update section (owner or ADMIN), submit (DRAFT→SUBMITTED assigns ref); `DELETE /:id` soft delete + payments (ADMIN only) |
| `payments/` | initiate only |
| `users/` | **Self-service (any authenticated user, declared before `/:id`):** `PATCH /me` (own rep details + own org contact block — never email/role/status/legal identity); `POST /me/password` (verify current → set new, stamps `passwordChangedAt`, best-effort confirmation email). **ADMIN only:** `POST /staff` (create staff); `PATCH /:id` edit user + org (role changes staff→staff only); `DELETE /:id` soft delete (guards: not self, not last admin; cascades to own applications + payments, org if orphaned); `POST /:id/approve` + `POST /:id/reject`; `POST /:id/reset-password` (ACTIVE accounts only — generates a new temp password, clears `passwordChangedAt`, emails it to the login address; plaintext never returned to the admin or any webhook) |
| `windows/` | `POST /` create; `PATCH /:id` update; `DELETE /:id` soft delete (not while OPEN); `POST /:id/open|close|archive` status transitions (ADMIN only) |
| `inquiries/` | `POST /:id/status` — move inquiry NEW/RESPONDED/CLOSED (ADMIN only) |
| `site-visits/` | `POST /` create booking (INVESTOR); `GET /` list (ADMIN); `PATCH /:id` edit + `DELETE /:id` (owner INVESTOR or ADMIN, **only while status = NEW** — delete is a hard delete so the investor can immediately re-book); `POST /:id/status` schedule/complete/cancel (ADMIN) — moving to `SCHEDULED` with a `scheduledAt` emails the investor a `siteVisitScheduledEmail` confirmation (best-effort). Zod `superRefine` rejects non-investable zones + land uses that don't belong to the chosen zone |
| `timeline/` | `POST /` create, `PATCH /:id` update, `DELETE /:id` delete timeline milestones (ADMIN only). Position uniqueness + end-after-start guarded in the service; both portals read the table directly with `FALLBACK_MILESTONES` when empty |
| `health/` | complete |

---

## Error handling

Use factory functions from `apps/api/src/errors.ts` — never `throw new Error()`:
`NotFound` (404) · `BadRequest` (400) · `Unauthorized` (401) · `Forbidden` (403) · `Conflict` (409)

Global error handler maps `AppError`, `ZodError`, Sequelize errors → `{ "error": { "code", "message" } }`.

---

## n8n webhooks

`fireWebhook(event, payload)` — `apps/api/src/webhooks.ts`. HMAC-SHA256 signed (`N8N_WEBHOOK_SECRET`). No-op when `N8N_BASE_URL` or `N8N_WEBHOOK_SECRET` absent. Fire **after** transaction commits, never before. Web mirror: `apps/web/src/lib/webhooks.ts`.

Events: `investor-registered` (company + rep profile, `activatedAt`; **never** carries the generated password), `investor-approved` (includes `generatedPassword` — legacy approval path only), `investor-rejected`, `staff-invited` (includes `tempPassword`), `application-submitted`, `payment-confirmed`, `tc-decision`, `lac-decision`, `exco-decision`, `clarification-requested`, `window-closed`, `site-visit-requested`

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
EMAIL_SERVER_HOST=smtp.office365.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=Support.Kip@unoc.com
EMAIL_SERVER_PASSWORD=
EMAIL_FROM="Support KIP <Support.Kip@unoc.com>"
```

### Investor portal (`apps/portal`) / NextAuth

```env
NEXTAUTH_URL=http://localhost:4002
NEXTAUTH_SECRET=          # min 32 chars, must match API + admin portal
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_GTM_ID=       # Google Tag Manager container; leave empty in dev (GTM won't load)
EMAIL_SERVER_HOST=smtp.office365.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=Support.Kip@unoc.com
EMAIL_SERVER_PASSWORD=
EMAIL_FROM="Support KIP <Support.Kip@unoc.com>"
```

Planned (not yet wired): `PAYMENT_GATEWAY_PUBLIC_KEY`, `PAYMENT_GATEWAY_SECRET_KEY`, `PAYMENT_GATEWAY_WEBHOOK_SECRET`.

---

## Email / SMTP

All three apps send through one Office 365 mailbox, **`Support.Kip@unoc.com`** (display name "Support KIP").

Connection options are built by `smtpTransportOptions()` — `apps/portal/src/lib/smtp.ts` and `apps/web/src/lib/smtp.ts`, mirrored inline in `apps/api/src/mailer.ts`. Every transport in the repo goes through it: the two NextAuth `EmailProvider`s, both `mailer.ts` modules, and the notify-me signup action.

Rules and gotchas:

- **Port 587 + STARTTLS.** `secure` is true only on 465; Office 365 submission does not offer implicit TLS. `requireTLS` is set whenever `EMAIL_SERVER_USER` is present, so a credentialed login can never silently downgrade to plaintext. MailHog advertises no STARTTLS, so leaving `EMAIL_SERVER_USER` blank keeps offline dev working.
- **`EMAIL_FROM` must be the authenticated mailbox** (or a permitted *Send As* alias). Any other address is rejected with `5.7.60 Client does not have permissions to send as this sender`.
- The mailbox needs **SMTP AUTH enabled** and must be exempt from MFA / security defaults. If Exchange later enforces MFA, basic auth breaks and the fix is OAuth2, not a new password.
- **Throttle: ~30 messages/minute, 10,000 recipients/day.** Bulk sends (window-open blasts) must go through n8n/SES, not this mailbox.
- In `deploy/.env.production`, write `EMAIL_FROM` **unquoted** — Compose `env_file` reads values literally and quotes would land in the header.
- Auth can take several seconds on first connect; that is Exchange throttling, not a hang.

---

## Analytics — Google Tag Manager

Container **`GTM-T23BP8QS`**. **`apps/portal` only, and only on the public marketing pages** — `apps/web` (admin) has no GTM at all, and neither does the investor dashboard, the auth pages or `/launch`.

- Mounted in `apps/portal/src/app/(public)/layout.tsx`, not the root layout: `<GoogleTagManagerNoScript />` (the `<noscript>` iframe) then `<GoogleTagManager />` (loader, `next/script` `strategy="afterInteractive"`). Component: `apps/portal/src/components/google-tag-manager.tsx`.
- The **`(public)` route group** holds home + about, contact, faq, for-investors, help, how-it-works, land-map, privacy, resources, terms. Route groups don't change URLs. **A new public page must go inside `(public)` or it gets no analytics**; a new signed-in page must stay outside it.
- Gated on **`NEXT_PUBLIC_GTM_ID`**; both components return `null` when unset, so local dev, CI and preview builds send nothing.
- `NEXT_PUBLIC_*` is baked in at **build time**. In Docker the id comes from the `NEXT_PUBLIC_GTM_ID` build arg (`apps/portal/Dockerfile` defaults to the real container, matching the `NEXT_PUBLIC_API_URL` pattern) and is passed by `deploy.yml` from `vars.NEXT_PUBLIC_GTM_ID`. Setting it only in `/opt/kip/.env.production` changes nothing — GTM is client-side.
- `not-found.tsx` must stay at the app root, so 404s are untracked.
- Never hand-write the GTM snippet into a page or a `dangerouslySetInnerHTML` block — render the component so the env gate can't be bypassed.

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
| `packages/db/src/index.ts` | Sequelize singleton + 14 model inits + associations |
| `packages/db/src/models/` | 14 model files |
| `packages/db/migrations/` | All applied migrations (initial, lac-pipeline, investor-org-tin, user-status, payment-unique-index, registration-profile-fields, inquiries, soft-delete, site-visit-bookings, user-password-changed-at, timeline-milestones) |
| `packages/db/seed.ts` | Raw pg seed — idempotent |
| `packages/shared/src/enums.ts` | All enums — source of truth |
| `packages/shared/src/timeline.ts` | `TimelineMilestoneKind`, `TimelineMilestoneStatus`, `computeTimeline()` (active = last started, manual status overrides win), `findMilestoneOfKind()`, `longDate()` (EAT), `FALLBACK_MILESTONES` (published Phase 2 schedule — seed data + render fallback). Tested in `apps/portal/src/lib/timeline.test.ts` |
| `packages/shared/src/zones.ts` | `KIP_ZONES` — zone labels, colours, areas, land uses. Source of truth for the land map + site-visit form |
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
| `apps/api/src/modules/site-visits/` | Create / list / schedule site-visit bookings |
| `apps/api/src/mailer.ts` | `sendMail()` + `credentialsEmail`, `rejectionEmail`, `siteVisitConfirmationEmail` (request received), `siteVisitScheduledEmail` (admin confirmed the visit), `siteVisitNotificationEmail`, `passwordChangedEmail`, `passwordResetEmail` (admin reset — temp credentials) |
| `apps/portal/src/lib/mailer.ts` | Portal-side `sendMail()` + `escapeHtml()` + `credentialsEmail` (registration). Shared transport for contact form + live chat |
| `apps/portal/src/lib/smtp.ts` | `smtpTransportOptions()` — single source for the portal's SMTP options (mailer, NextAuth EmailProvider, notify-me action) |
| `apps/web/src/lib/smtp.ts` | `smtpTransportOptions()` — same, for the admin app's NextAuth EmailProvider |
| `apps/portal/src/app/(investor)/dashboard/site-visit/` | Investor booking form (zone → land use → description → acres slider) + booking status view. The booking summary + status block is the shared `components/site-visit-summary.tsx`, also rendered on the dashboard overview so a scheduled visit shows on sign-in |
| `apps/portal/src/lib/timeline-data.ts` | `server-only` — `getTimelineData()` reads `TimelineMilestone` (fallback when empty/no DB) → `{ timeline, eoiCall, siteVisit }`. Consumed by portal home, About, investor dashboard stage tracker, and the site-visit booking gate |
| `apps/web/src/app/(admin)/console/settings/timeline-editor.tsx` | Admin CRUD for the application timeline (add/edit/delete milestones, kind picker, current-stage marker) — calls the `timeline/` API module; changes are live on the portals immediately |
| `apps/portal/src/app/(investor)/dashboard/settings/` | Investor account settings — profile + company-contact edit (`PATCH /users/me`) and change password (`POST /users/me/password`); read-only legal identity + account meta. `settings-ui.tsx` = shared card/field primitives. Sidebar "Settings" nav + a dashboard nudge appear while `passwordChangedAt` is NULL |
| `apps/web/src/app/(admin)/console/site-visits/` | Admin site-visit tracker — searchable/filterable table; row opens `site-visit-detail-modal.tsx` (full request + investor profile: rep, company, account status, EOI progress via `SiteVisitRow.investor`) with schedule / complete / cancel actions (`POST /site-visits/:id/status`); CSV/print/copy export via the shared report export dropdown |
| `apps/web/src/app/(admin)/console/report/` | **Reports hub** (ADMIN) — tabbed reports, one route per report: `page.tsx` Overview (cross-domain KPIs, 12-week trends, funnel), `investors/` Investor Onboarding (KPIs, funnel, country/sector/type breakdowns, detail table), `applications/` review pipeline (stage breakdown, committee decisions, avg days per stage mined from `ReviewAction`), `payments/` fees (confirmation lag, aging, weekly trend, method split), `engagement/` site visits + inquiries + notify signups. Shared chrome in `layout.tsx`. All print-optimised |
| `apps/web/src/components/report/` | Reports-hub building blocks: `report-ui.tsx` server-safe primitives (`Panel`, `BarList`, `MiniStat`, `FunnelBars`, `TrendBars`, `PrintHeading`), `report-tabs.tsx` tab bar, `report-table.tsx` generic searchable detail table (declarative column spec, badge maps), `export-actions.tsx` generic export dropdown — CSV via `buildCsv()` (Blob + UTF-8 BOM), Print/Save-as-PDF (`window.print()`), Copy summary. All client-side so exports work on the read-only demo |
| `apps/web/src/lib/report-export.ts` | Pure CSV + text-summary builders for all report exports (`buildCsv`, per-report `build*Summary`, filename stampers) — no `@kip/db`/`server-only`, unit-tested (`report-export.test.ts`) |
| `apps/web/src/lib/auth.ts` | NextAuth config — Email + Credentials, custom SequelizeAdapter |
| `apps/web/src/lib/rbac.ts` | RBAC policy — single source for both middleware + server guards |
| `apps/web/src/lib/format.ts` | Pure formatters (date/money) — deterministic, unit-tested |
| `apps/web/src/lib/admin/queries.ts` | `server-only` admin read layer |
| `apps/web/src/lib/admin/mappers.ts` | Pure DB-row → view-model mappers, unit-tested |
| `apps/web/src/lib/investor-data.ts` | Investor read data layer — live on seeded data |
| `apps/web/src/lib/webhooks.ts` | Server-only `fireWebhook()` for Next.js API routes |
| `apps/web/src/components/` | Shared UI: `site-nav`, `admin-topbar`, `dashboard-sidebar`, `stat-card`, `status-badge`, `data-table`, `payment-amount-card`, `countdown-timer`, `confirm-delete-dialog` (all admin deletes go through it) — check before building new UI |
| `apps/web/src/components/ui/` | Primitives: `alert`, `avatar`, `badge`, `button`, `card`, `dropdown-menu`, `input`, `separator`, `sheet`, `table`, `tooltip` |
| `apps/web/src/app/(admin)/console/users/[id]/page.tsx` | User detail page — identity header (avatar, role/status badges), pending-review banner, Account & Security / Representative / Company cards (password state from `passwordChangedAt`, EOI ref + stage) |
| `apps/web/src/app/(admin)/console/users/[id]/user-action-buttons.tsx` | Approve/Reject client component |
| `apps/web/src/app/(admin)/console/users/[id]/user-manage-buttons.tsx` | Admin Edit + Delete for any account (opens `edit-user-dialog.tsx`, calls `PATCH`/`DELETE /users/:id`) |
| `apps/web/src/app/(admin)/console/users/[id]/reset-password-button.tsx` | Admin password reset (confirm dialog → `POST /users/:id/reset-password`; new password is emailed, never displayed) |
| `apps/web/src/app/(admin)/console/applications/delete-application-button.tsx` | Admin delete for an application (list + detail page), calls `DELETE /applications/:id` |
| `apps/web/src/app/(admin)/console/applications/[ref]/section-edit-button.tsx` | Admin raw-JSON editor per EOI section — `PUT /applications/:id/section`, Zod-validated server-side |
| `apps/web/src/app/(admin)/console/users/invite-staff-dialog.tsx` | Invite staff member dialog (calls `POST /users/staff`) |
| `apps/web/src/app/(admin)/console/windows/windows-client.tsx` | Windows page client shell with Create dialog |
| `apps/web/src/app/(admin)/console/windows/create-window-dialog.tsx` | Create/edit window dialog |
| `apps/web/src/app/(admin)/console/windows/window-actions.tsx` | Per-window open/close/archive action buttons |
| `apps/portal/src/app/api/register/route.ts` | `POST /api/register` — one-step registration (company name/country/type/sector + authorized rep), creates InvestorOrg + User (**ACTIVE**), emails generated credentials, fires webhook. The web app's `/sign-up` redirects to the portal form |
| `apps/portal/src/app/(public)/layout.tsx` | Public marketing route group — the only place GTM is mounted (see Analytics). No chrome of its own; pages render their own nav/footer |
| `apps/portal/src/components/google-tag-manager.tsx` | GTM loader + `<noscript>` fallback, gated on `NEXT_PUBLIC_GTM_ID` |
| `apps/portal/src/app/(public)/contact/page.tsx` | Public contact form — server action persists an `Inquiry` row, then best-effort email to kipinvestorrelations@unoc.com |
| `apps/portal/src/app/api/inquiry/route.ts` | Live-chat widget endpoint — persists an `Inquiry` row (channel LIVE_CHAT), then best-effort email |
| `apps/web/src/app/(admin)/console/inquiries/page.tsx` | Admin inquiries tracker — contact/chat inquiries + notify-me signup list, status actions via `POST /inquiries/:id/status` |
| `apps/portal/src/app/(public)/how-it-works/page.tsx` | 6-step EOI process walkthrough — public static page |
| `apps/portal/src/app/(public)/for-investors/page.tsx` | Investor benefits, incentives, land categories, eligibility — public static page |
| `apps/portal/src/app/(public)/faq/page.tsx` | FAQ accordion (5 categories, `<details>/<summary>`) — public static page |
| `apps/portal/src/app/(public)/help/page.tsx` | Help centre with 6 category cards linking to FAQ — public static page |
| `apps/portal/src/app/(public)/privacy/page.tsx` | Privacy Policy document (Uganda DPPA 2019) — public static page |
| `apps/portal/src/app/(public)/terms/page.tsx` | Terms of Service document — public static page |
| `apps/portal/src/app/(public)/land-map/page.tsx` | Land map page — embeds `/kip-plot-map.pdf` + zone legend + infrastructure specs |
| `apps/portal/src/app/(public)/about/page.tsx` | Dedicated About page — promo video, story/mandate, stats, zones, connectivity, gallery, partners, timeline. Video is hosted on S3/CloudFront (`PROMO_VIDEO_URL` const, `preload="none"`) — **never commit video files to the repo** |
| `apps/portal/src/app/(public)/resources/page.tsx` | Downloads page — KIP plot map PDF + coming-soon placeholders |
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
- Read-only demo: the Express API (`apps/api`) is **not** deployed — admin mutation buttons (approve/reject, invite staff, window actions, bank-transfer confirm) and **investor site-visit booking** will fail. Reads work because both apps query the DB directly. Registration still works: it's a portal route handler, not an API call.
- Required Vercel env vars: `DATABASE_URL`, `NEXTAUTH_URL` (the Vercel URL), `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PORTAL_URL`. Email magic link + contact form need SMTP and are non-functional on the demo; credentials sign-in works.

---

## Deployment — AWS EC2 (full stack)

Full runbook: **`DEPLOYMENT.md`**. Single EC2 (ap-south-1) runs the whole stack via `deploy/docker-compose.prod.yml`: Caddy (auto-TLS) → investor portal + admin + Express API; plus internal-only Postgres 16 + n8n.

**Live since 5 July 2026** on Elastic IP `15.240.34.84`: `kip.unoc.com` = investor, `portal.kip.unoc.com` = admin, `api.kip.unoc.com` = API. DNS A records live in the cPanel Zone Editor for `unoc.com` (Namecheap hosting nameservers). The pre-domain `*.15-240-34-84.sslip.io` hosts 308-redirect to the real hosts (hostname-change checklist in DEPLOYMENT.md).

- Production Dockerfiles: `apps/{api,web,portal}/Dockerfile`. The API image doubles as the migrate/seed job image and runs under **tsx, not node** (`@kip/shared`'s entry is raw TS). Next.js images ship the full workspace — **never switch them to `output: "standalone"`** (breaks the `serverExternalPackages` webpack workaround) — and set a dummy `DATABASE_URL` during `next build` (Sequelize instantiates at import time; no connection is made). `NEXT_PUBLIC_*` values are Docker build args (baked into client bundles at build time).
- CI/CD: `.github/workflows/ci.yml` (branch/PR checks: db:build, typecheck, test) + `deploy.yml` (push to `main` → build 3 images → GHCR `ghcr.io/unoc-kip/kip-{api,web,portal-app}` → SSH to EC2 → pull, migrate, up). GHCR owner hardcoded lowercase — Docker rejects the uppercase org name.
- GitHub secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`. Variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PORTAL_URL`, `NEXT_PUBLIC_GTM_ID` (optional — the portal Dockerfile already defaults to the live container). App secrets live only in `/opt/kip/.env.production` on the server (template: `deploy/.env.production.example`; values are read literally — no `${VAR}` interpolation).
- `DATABASE_URL` on the server must keep `?sslmode=disable` — `packages/db/src/ssl.ts` treats the compose hostname `postgres` as hosted Postgres and enables TLS, which the plain container doesn't support.
- `apps/portal/src/app/(public)/page.tsx` AND `apps/portal/src/app/(public)/about/page.tsx` must keep `export const dynamic = "force-dynamic"` — CI Docker builds have no DB; static generation would bake "no open window" into the home page.

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
- Send a generated password through a webhook from the register route
- Interpolate user input into email HTML unescaped — use `escapeHtml()` from the app's `mailer.ts`
- Build a nodemailer transport by hand — call `smtpTransportOptions()` so STARTTLS stays enforced
- Set `EMAIL_FROM` to anything but the authenticated mailbox or a Send As alias — Exchange rejects it with 5.7.60
- Commit the `Support.Kip@unoc.com` password — it lives only in gitignored `.env` files and `/opt/kip/.env.production`
- Re-introduce an admin approval gate on investor registration (removed 10 July 2026)
- Edit `packages/db/dist/` — generated by `pnpm db:build`
- Use npm or yarn — pnpm only
- Update CLAUDE.md as a follow-up — same commit as the code change
