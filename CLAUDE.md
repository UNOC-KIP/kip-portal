# CLAUDE.md — KIP Investor Portal
> Last updated: 11 August 2026. Update this file in the same commit as any architectural change.
> Admin EOI preview added 11 August 2026 — ADMIN can sign into the investor portal and run the EOI with the window gate lifted. See "Admin EOI preview".
> EOI module rebuilt 2 August 2026 to the UNOC Master Content Specification — see "EOI module".
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
│   │   ├── src/models/        19 model files
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
| `apps/portal` (port 4002) | `apps/portal/src/lib/auth.ts` | `INVESTOR`, plus `ADMIN` for EOI preview — other staff blocked at `authorize` level |
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

**`apps/portal` (investor)** — `apps/portal/src/lib/rbac.ts`. `INVESTOR_ONLY` is still the strict investor list; `PORTAL_WORKSPACE_ROLES` (`INVESTOR` + the EOI preview roles) is what actually gates `/dashboard`:
1. **Edge** — `apps/portal/src/middleware.ts` checks JWT + role on every matched route.
2. **Server** — `rbac-server.ts` `requireRole()` in every sensitive layout/page.

**`apps/web` (admin)** — `apps/web/src/lib/rbac.ts`:
1. **Edge** — `apps/web/src/middleware.ts` checks JWT + role.
2. **Server** — `rbac-server.ts` `requireRole()`/`requireStaff()` in every sensitive layout/page.

**Never rely on only one layer.**

| App | Area | Path | Allowed roles |
|---|---|---|---|
| portal | Investor dashboard | `/dashboard/*` | `INVESTOR`, `ADMIN` (preview) |
| portal | Site-visit booking | `/dashboard/site-visit` | `INVESTOR`, `ADMIN` (preview) |
| portal | Account settings | `/dashboard/settings` | `INVESTOR`, `ADMIN` (preview) |
| portal | Messages inbox | `/dashboard/messages` | `INVESTOR`, `ADMIN` (preview) |
| web | Communications | `/console/communications` | `ADMIN` |
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
**`@kip/db` depends on `@kip/shared`** (the seed validates section payloads). Never add the reverse dependency — `@kip/shared` must stay importable from client components.
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
| `Notification` | **per-recipient delivery row for one `Communication`** — `userId` (nullable: notify-list recipients have no account), `communicationId`, `email`, `channel`, `subject`, `body` (stored already merge-rendered for *this* recipient, so inbox and email match word for word), `status (DeliveryStatus)`, `error` (SMTP failure reason), `sentAt`, `readAt`. Doubles as the investor Messages inbox when `userId` is set and the channel includes the portal. Was an unused table until 30 July 2026 |
| `Communication` | one admin-composed broadcast — `subject`, `body` (raw markdown-lite), `channel (CommunicationChannel)`, `audience (CommunicationAudience)`, `audienceSummary` (human-readable, from `describeAudience()`), `filters JSONB` (the selection that produced the list), `status (CommunicationStatus)`, `recipientCount` / `sentCount` / `failedCount`, `templateId`, `createdById`, `sentAt`. Recipients are materialised as `Notification` rows at create time |
| `CommunicationAttachment` | a file uploaded once and **linked** from a broadcast body — `filename`, `storageKey`, `mimeType`, `sizeBytes`, `downloadCount`, `uploadedById`. Deliberately has **no `communicationId`**: it is uploaded while the message is still being composed and one file can be linked from several broadcasts |
| `CommunicationTemplate` | reusable subject + body for the composer — `name` (unique), `subject`, `body`, `description`, `createdById`. Bodies may carry `{{company}}`-style merge tokens |
| `Inquiry` | public contact-form / live-chat messages — `channel (InquiryChannel)`, `status (InquiryStatus)`, `respondedById` → User; tracked in `/console/inquiries` |
| `NotifySignup` | "notify me" emails from the portal home page — `email` unique |
| `TimelineMilestone` | admin-managed application timeline — `position` (unique, orders the list), `kind` (`GENERIC \| SITE_VISIT_BOOKING \| SITE_VISIT \| EOI_CALL`), `title`, `dateLabel` (display text), `startsAt` (drives the active stage), `endsAt`, `status` (`AUTO \| UPCOMING \| CURRENT \| COMPLETED` — AUTO derives from dates, others are manual overrides); pure logic + fallback in `@kip/shared` timeline.ts. `SITE_VISIT_BOOKING` = the booking window (bookings open until its `endsAt`); `SITE_VISIT` = the visits themselves (display; also gates bookings as a legacy fallback when no booking milestone exists) |
| `SiteVisitBooking` | investor site-visit request — `zone (KipZone, TEXT)`, `landUse`, `description TEXT`, `acres INTEGER` (CHECK 1–100), `status (SiteVisitStatus)`, `scheduledAt`, `handledById` → User; tracked in `/console/site-visits`. **The only place an investor declares a zone** — the investors report derives its "zone of interest" drill-down from these rows (newest booking wins; acreage is summed across bookings), so an investor with no booking lands in the "Not specified" bucket |

**Enums** (`packages/shared/src/enums.ts` — source of truth):
- `UserRole`: `INVESTOR | TC_MEMBER | TC_CHAIR | LAC_MEMBER | EXCO_MEMBER | ADMIN`
- `UserStatus`: `PENDING_REVIEW | ACTIVE | REJECTED`
- `ApplicationStatus`: see machine above
- `EoiSection`: `PRELIMINARY_INFO | LAND_BUSINESS_PROFILE | UTILITIES_INFRASTRUCTURE | H3SE | NATIONAL_CONTENT | DECLARATION`
- `PaymentMethod`: `CARD | STANBIC_TRANSFER`
- `PaymentStatus`: `PENDING | PROOF_UPLOADED | CONFIRMED | FAILED | REFUNDED`
- `Currency`: `USD | UGX`
- `DocumentKind`: 24 values — one per "Attach:" bullet in the EOI spec, plus `PAYMENT_PROOF` and `OTHER`. **Backed by a Postgres ENUM type, so adding a value needs a migration** (`ALTER TYPE … ADD VALUE`). Labels in `DOCUMENT_KIND_LABELS`
- `ReviewActionType`: `ASSIGNED | COMMENTED | REQUESTED_CLARIFICATION | CLARIFICATION_PROVIDED | RECOMMENDED | REJECTED | APPROVED | SHORTLISTED | NOT_SHORTLISTED | LAC_APPROVED | LAC_REJECTED | ALLOCATED | RETURNED_TO_TC | ESCALATED`
- `ApplicationWindowStatus`: `DRAFT | OPEN | CLOSED | ARCHIVED`
- `CompanyType`: `LIMITED_LIABILITY_COMPANY | PUBLIC_LIMITED_COMPANY | JOINT_VENTURE | PARTNERSHIP | SOLE_PROPRIETORSHIP | OTHER`
- `BusinessSector`: `PETROCHEMICALS_REFINING | FERTILISERS_CHEMICALS | LIGHT_MANUFACTURING | AGRO_PROCESSING | LOGISTICS_WAREHOUSING | COMMERCIAL_HOSPITALITY | ICT | OTHER`
- `InquiryChannel`: `CONTACT_FORM | LIVE_CHAT`
- `InquiryStatus`: `NEW | RESPONDED | CLOSED`
- `SiteVisitStatus`: `NEW | SCHEDULED | COMPLETED | CANCELLED`
- `CommunicationStatus`: `DRAFT | SENDING | SENT | PARTIALLY_SENT | FAILED`
- `CommunicationAudience`: `ALL_INVESTORS | INVESTOR_SEGMENT | STAFF | NOTIFY_LIST | CUSTOM`
- `CommunicationChannel`: `EMAIL | IN_APP | EMAIL_AND_IN_APP`
- `DeliveryStatus`: `PENDING | SENT | FAILED`
- **EOI form enums live in `packages/shared/src/schemas/application.ts`, not `enums.ts`** (they describe the application payload, not a DB column): `ApplicantCategory`, `LegalForm`, `LocalPresenceType`, `ActingMode`, `NotarizationType`, `HolderType`, `IdentificationType`, `LandAreaUnit`, `TargetMarket`, `SupplyConfiguration`, `WastewaterCharacter`, `ReportingEntity`, `UgandaTinStatus` — each with a `*_LABELS` map
- `COMPANY_TYPE_LABELS` / `BUSINESS_SECTOR_LABELS` / `INQUIRY_CHANNEL_LABELS` / `SITE_VISIT_STATUS_LABELS` / `COMMUNICATION_STATUS_LABELS` / `COMMUNICATION_AUDIENCE_LABELS` / `COMMUNICATION_CHANNEL_LABELS` / `DELIVERY_STATUS_LABELS` display-label maps live beside the enums

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
| `applications/` | create draft, get, `PUT /:id/section` (owner or ADMIN — **`complete` flag splits draft saves from completion**), `GET /:id/blockers` (dry run of the submit guard), submit (DRAFT→SUBMITTED assigns ref); `DELETE /:id` soft delete + payments (ADMIN only) |
| `documents/` | EOI attachments. `POST /presign` → S3 PUT URL; `POST /` registers the row **after** the upload succeeds; `GET /?applicationId=`; `GET /:id/download`; `DELETE /:id`. Owner-or-ADMIN, PDF-only, 5 MB. Payment proof is rejected here — it belongs to `payments/` |
| `payments/` | initiate only |
| `users/` | **Self-service (any authenticated user, declared before `/:id`):** `PATCH /me` (own rep details + own org contact block — never email/role/status/legal identity); `POST /me/password` (verify current → set new, stamps `passwordChangedAt`, best-effort confirmation email). **ADMIN only:** `POST /staff` (create staff); `PATCH /:id` edit user + org (role changes staff→staff only); `DELETE /:id` soft delete (guards: not self, not last admin; cascades to own applications + payments, org if orphaned); `POST /:id/approve` + `POST /:id/reject`; `POST /:id/reset-password` (ACTIVE accounts only — generates a new temp password, clears `passwordChangedAt`, emails it to the login address; plaintext never returned to the admin or any webhook) |
| `windows/` | `POST /` create; `PATCH /:id` update; `DELETE /:id` soft delete (not while OPEN); `POST /:id/open|close|archive` status transitions (ADMIN only) |
| `inquiries/` | `POST /:id/status` — move inquiry NEW/RESPONDED/CLOSED (ADMIN only) |
| `site-visits/` | `POST /` create booking (INVESTOR); `GET /` list (ADMIN); `PATCH /:id` edit + `DELETE /:id` (owner INVESTOR or ADMIN, **only while status = NEW** — delete is a hard delete so the investor can immediately re-book); `POST /:id/status` schedule/complete/cancel (ADMIN) — moving to `SCHEDULED` with a `scheduledAt` emails the investor a `siteVisitScheduledEmail` confirmation (best-effort). Zod `superRefine` rejects non-investable zones + land uses that don't belong to the chosen zone |
| `timeline/` | `POST /` create, `PATCH /:id` update, `DELETE /:id` delete timeline milestones (ADMIN only). Position uniqueness + end-after-start guarded in the service; both portals read the table directly with `FALLBACK_MILESTONES` when empty |
| `communications/` | admin broadcasts. `POST /` compose + send (ADMIN) — writes the `Communication` + one `Notification` per recipient in one transaction, then drains delivery **detached from the request**; `POST /test` send the draft to the acting admin only (deliberately no `to` field, so it can't relay); `POST /:id/retry` re-queue failed *and* stalled-`PENDING` rows; `DELETE /:id` (blocked while `SENDING`); `POST /templates`, `PATCH /templates/:id`, `DELETE /templates/:id`; `POST /inbox/:id/read` (INVESTOR/ADMIN, owner-checked in the service); `POST /attachments/presign` + `POST /attachments` (ADMIN) and **`GET /attachments/:id`** — the one unauthenticated route, declared above `requireAuth`, 302 to a signed S3 URL. Literal routes are declared before `/:id`. **The recipient list is resolved in the browser and posted** — see the Communications section below |
| `health/` | complete |

---

## Error handling

Use factory functions from `apps/api/src/errors.ts` — never `throw new Error()`:
`NotFound` (404) · `BadRequest` (400) · `Unauthorized` (401) · `Forbidden` (403) · `Conflict` (409)

Global error handler maps `AppError`, `ZodError`, Sequelize errors → `{ "error": { "code", "message" } }`.

---

## n8n webhooks

`fireWebhook(event, payload)` — `apps/api/src/webhooks.ts`. HMAC-SHA256 signed (`N8N_WEBHOOK_SECRET`). No-op when `N8N_BASE_URL` or `N8N_WEBHOOK_SECRET` absent. Fire **after** transaction commits, never before. Web mirror: `apps/web/src/lib/webhooks.ts`.

Events: `investor-registered` (company + rep profile, `activatedAt`; **never** carries the generated password), `investor-approved` (includes `generatedPassword` — legacy approval path only), `investor-rejected`, `staff-invited` (includes `tempPassword`), `application-submitted`, `payment-confirmed`, `tc-decision`, `lac-decision`, `exco-decision`, `clarification-requested`, `window-closed`, `site-visit-requested`, `communication-sent` (fired once a broadcast finishes draining — counts + terminal status, never the recipient list)

**Omit `N8N_WEBHOOK_SECRET` from test `.env`** — setting it to `''` causes startup failure (Zod requires `min(8)` when key is present).

---

## S3

Path: `applications/{applicationId}/documents/{documentId}/{originalFilename}`
MIME: `application/pdf`, `image/jpeg`, `image/png`. Max: 10 MB. PUT expiry: 10 min. GET expiry: 5 min.
**EOI attachments are stricter — PDF only, 5 MB** (spec §8, enforced by `validateEoiFile()` + the `documents/` Zod schemas). The looser rule above applies only to payment proof, where spec §1 permits a photo of a deposit slip.
Helper: `apps/api/src/storage/index.ts` — `presignUpload()`, `presignDownload()`.

**Presigning is offline — a 200 from `/documents/presign` proves nothing.** `getSignedUrl()` signs locally and makes no network call, so it cannot tell you the bucket exists, the key is authorised, or the browser will be allowed to PUT. The one failure it does raise locally is a total absence of credentials, and `asConfigError()` turns that `CredentialsProviderError` into a **503 `STORAGE_NOT_CONFIGURED`** instead of an unexplained 500 mid-upload; the API also warns at boot when no static keys are set (`hasStaticS3Credentials()` in `index.ts`). Everything else surfaces at the browser's PUT.

**The documents bucket needs a CORS policy allowing PUT from both portal hosts** — investors upload straight from the browser to S3, bypassing the API. Missing CORS is invisible server-side and presents as uploads failing in the wizard while the API log looks clean. Setup + the exact `put-bucket-cors` call: DEPLOYMENT.md Phase 3 step 4. Re-run it whenever the hostnames change.

**The bucket is `kip-documents-unoc` in `af-south-1` — a different region from the rest of the stack** (`ap-south-1`). `S3_REGION` must name the *bucket's* region: presigned URLs are signed for it, and a browser cannot follow S3's cross-region redirect, so a mismatch fails every upload with `400 IllegalLocationConstraintException`. Do not diagnose this with the AWS CLI — it silently retries in the correct region and reports success while the app is broken. Check with `curl -sI https://<bucket>.s3.amazonaws.com | grep x-amz-bucket-region`, and validate access with an object round-trip rather than `head-bucket` (the `kip-api` IAM user has object rights only, so `head-bucket` 403s even when everything works).

---

## Environment variables

### API (`apps/api/src/env.ts`)

```env
NODE_ENV=development
DATABASE_URL=postgresql://kip:kip_dev_password@localhost:5433/kip_portal?schema=public
API_PORT=4001
WEB_PUBLIC_URL=http://localhost:4000
API_PUBLIC_URL=http://localhost:4001   # public base for broadcast attachment links (goes into emails)
LOG_LEVEL=info
NEXTAUTH_SECRET=          # REQUIRED; must match both portals
N8N_WEBHOOK_SECRET=       # optional; omit for tests
N8N_BASE_URL=             # e.g. http://localhost:5678
S3_ENDPOINT=              # empty = AWS
S3_REGION=auto            # PROD: af-south-1 — the bucket's region, NOT the stack's ap-south-1
S3_BUCKET=kip-documents   # PROD: kip-documents-unoc (already exists; also holds the promo video)
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true  # PROD: false for real AWS
ANTHROPIC_API_KEY=        # optional
EOI_APPLICATION_FEE_USD=1000
EOI_APPLICATION_FEE_UGX=3700000
EMAIL_SEND_INTERVAL_MS=2200        # broadcast pacing — ~27 msg/min, under the O365 cap
COMMUNICATION_MAX_RECIPIENTS=500   # hard ceiling on one broadcast
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
- **Throttle: ~30 messages/minute, 10,000 recipients/day.** The Communications module paces its own sends at `EMAIL_SEND_INTERVAL_MS` (default 2200ms ≈ 27/min) and caps one broadcast at `COMMUNICATION_MAX_RECIPIENTS` (500). Anything larger than that — a full window-open blast to thousands — must go through n8n/SES, not this mailbox.
- In `deploy/.env.production`, write `EMAIL_FROM` **unquoted** — Compose `env_file` reads values literally and quotes would land in the header.
- Auth can take several seconds on first connect; that is Exchange throttling, not a hang.

---

## Communications (admin broadcasts)

Admins compose and send messages to investors or staff from **`/console/communications`**; recipients with a portal account also see them at **`/dashboard/messages`** on the investor portal.

**Rendering is shared, and escaping is the security boundary.** `packages/shared/src/communications.ts` owns `renderBodyHtml()`, which **escapes the whole authored body first and only then applies formatting** (blank-line paragraphs, `**bold**`, `*italic*`, `- ` lists, `[text](https://…)` links; `javascript:`/`data:`/protocol-relative hrefs are dropped and render as plain text). The composer preview, the email, the admin detail page and the portal inbox all call the same function, so a preview can never disagree with what a recipient sees. It is the only reason the three `dangerouslySetInnerHTML` call sites are safe — never hand-render a body.

**Merge tokens.** `MERGE_TOKENS` / `applyMergeTokens()` support `{{company}}`, `{{repName}}`, `{{email}}`, `{{reference}}`. Unknown tokens are left verbatim (a typo stays visible); empty values fall back to neutral wording, so a broadcast never reads "Dear ,". Tokens are resolved **per recipient at send time** and the result is stored on the `Notification` row — the inbox copy and the emailed copy are identical, and a retry replays the same text.

**The recipient list is resolved in the browser.** `apps/web/src/lib/communication-audience.ts` (pure, DB-free, unit-tested) turns an `AudienceSelection` into concrete recipients, delegating segment filtering to the existing `filterInvestors()` in `report-filters.ts`. The console posts that explicit array to `POST /communications`. This keeps one filter implementation (a broadcast to "Heavy Industrial · Shortlisted" hits exactly the rows `/console/report/investors` shows) and guarantees the count next to the Send button is the count that gets mailed. It is not a privilege hole — the route is ADMIN-only and admins already read every address — but the API still validates each email, rejects duplicate addresses, and caps the array at `COMMUNICATION_MAX_RECIPIENTS`.

**Attachments are linked, never mailed.** `POST /communications/attachments/presign` → browser PUT → `POST /communications/attachments` (register-after-upload, exactly like the documents module) stores the file once under `communications/attachments/{id}/{filename}` and returns a permanent URL the composer inserts as a `[filename](url)` markdown link. Mailing the file instead would push it through the shared `Support.Kip@unoc.com` mailbox once **per recipient** — a 3 MB PDF to 500 investors is ~1.5 GB against a mailbox capped at ~30 messages/minute and ~25 MB per message, and it is the same mailbox that carries credentials and password resets. So `CommunicationAttachment` has **no `communicationId`**: one upload can be linked from several broadcasts and exists before any `Communication` row does. Limits (25 MB, PDF/image/Office) live in `@kip/shared` `validateCommunicationFile()` and are enforced in the browser *and* at presign.

**The attachment download route is the module's only unauthenticated endpoint, and that is deliberate.** `GET /communications/attachments/:id` is declared **above `communicationsRouter.use(requireAuth)`** and 302s to a freshly signed 5-minute S3 URL. Notify-list recipients have no `User` row, so a link demanding a session would be dead for exactly the audience a public announcement targets; the unguessable UUID is the capability, the same model as a presigned URL minus the expiry. Never move it below `requireAuth`, never give it an enumerable id, and never proxy the bytes through the API. Links are built from **`API_PUBLIC_URL`** — a wrong value produces dead links inside already-sent mail, which cannot be edited.

**Sending is direct nodemailer, paced, and detached.** No queue table and no worker: `createAndSend()` commits the `Communication` plus one `PENDING` `Notification` per recipient in a single transaction, then kicks off `deliver()` with `void … .catch(log)`. `deliver()` loops sequentially, sleeping `EMAIL_SEND_INTERVAL_MS` between SMTP calls, and records each outcome (`SENT` + `sentAt`, or `FAILED` + the SMTP error). Consequences to keep in mind:

- A 500-recipient send takes ~18 minutes. The request returns **202**, not 200 — the caller must poll (the console has a Refresh button), never assume "sent".
- Rows left `PENDING` by a restart keep the broadcast in `SENDING`, and **`POST /:id/retry` re-queues failed *and* stalled rows** — that is why it isn't named "resend failed" in the service.
- Terminal status is derived, not set: no failures → `SENT`, none delivered → `FAILED`, otherwise `PARTIALLY_SENT`.
- `CommunicationChannel.IN_APP` skips SMTP entirely; the `Notification` row *is* the message. An `EMAIL`-only send still writes rows (that's the delivery log) but the portal inbox filters them out.

## EOI module (investor application)

The six-section EOI is a transcription of the UNOC **"KIP Expression of Interest — Investor Portal Module: Master Content Specification"** (Business Development Unit). When a field's wording, requiredness or unit is in question, that document is the authority; `packages/shared/src/schemas/application.ts` is its executable form and carries the clause numbers in comments.

**Two principles run through the schemas.** First, anything the Technical Committee tabulates across bidders is a **number in a fixed-length array**, never prose — the 3-year H3SE table (TRIR, LTIFR, fatalities, environmental incidents, penalties, lost days) and the 3-year Ugandan employment table exist so applicants for the same plot compare like for like. Attachments verify those numbers; they never replace them. Second, percentages are **derived, not typed** (`ugandanEmploymentPercentages()`) — a self-reported percentage that disagrees with its own counts is precisely what triggers a Request for Clarification.

**Draft vs complete is the save-and-resume mechanism.** `PUT /applications/:id/section` takes `complete`. `false` stores the payload as-is without validating and **clears `completedAt`**; `true` runs the full section schema. Editing a finished section back into a partial state must un-complete it, or the submit guard counts a section the investor has since emptied. The wizard runs the *same* schema in the browser first, so errors land per-field before a request is made, and saves a draft even when validation fails — an investor who filled nine fields of ten never loses the nine.

**Not Applicable is a first-class answer** (spec §8). Each section payload carries `notApplicable: Record<string, string>` — a path (`"statutoryCompliance.nssfCertificate"`) or a `DocumentKind` mapped to a written explanation. A blank field and a deliberate N/A are different things to an evaluator; collapsing them is what drives clarification requests. `requireUnlessNA()` in the schema treats a field as satisfied when it carries an explanation of 5+ characters. Document-kind keys and field paths share the map but can never collide (one is SCREAMING_SNAKE, the other dotted camelCase).

**The submit guard re-validates the data, not the flags.** `submissionBlockers()` re-parses every stored payload against its section schema rather than trusting `completedAt` — a schema change, an admin raw-JSON edit, or an older payload can all leave a section flagged complete but no longer compliant. It also checks required attachments and the spec §8 cross-field rules (`crossSectionIssues()`: the declaration signatory must be one of the people named in the Power of Attorney, and the POA's granting company must match the Certificate of Incorporation). `GET /:id/blockers` is the same function exposed as a dry run, so the wizard's "Check my application" can never disagree with what submit enforces.

**Attachments are registered after the upload, not before.** `POST /documents/presign` hands out a PUT URL but creates **no row**; `POST /documents` creates it once the browser's PUT succeeded. The payment-proof path in `payments/` does the opposite (row first) — do not copy it here: the submit guard counts rows, so a failed transfer would tell an investor their certificate was attached when the bucket held nothing. Single-file slots replace rather than accumulate. EOI limits are **PDF only, 5 MB** (`validateEoiFile()`), deliberately stricter than the 10 MB PDF/JPEG/PNG the S3 helper allows payment proof, because spec §1 explicitly permits a photo of a deposit slip.

**One checklist, three consumers.** `packages/shared/src/eoi-documents.ts` (`EOI_DOCUMENT_REQUIREMENTS`) drives the wizard's upload slots, the submit-time completeness guard and the committee's view of what was supplied. Add an attachment there, not in the UI. Requirements are filtered by `ApplicantCategory` (LOCAL / INTERNATIONAL) — until the investor picks one, category-specific slots stay hidden rather than inviting the wrong upload.

**`TimelineMilestone` and `ApplicationWindow` are different things — the window is the only gate.** The `EOI_CALL` milestone in `/console/settings` is *display*: it drives the portal stage tracker and the public schedule. Whether an investor can start or submit an EOI is decided solely by an `ApplicationWindow` with `status = OPEN` **and `now` inside `openAt`…`closeAt`** (`investor-data.ts`, `createApplication()`, `submitApplication()`). Setting the milestone to CURRENT opens nothing. Keep the two aligned by hand in `/console/windows`; a stale window left OPEN with a past `closeAt` presents as "the EOI application window is not currently open" with no explanation.

Two guards now make that divergence visible instead of leaving it to be discovered by an investor:
- **`eoiCallReadiness()`** (`admin/mappers.ts`, pure, `now` injected) cross-checks the advertised stage against the gate, and `/console/settings` renders it above the timeline editor — amber when an `EOI_CALL` milestone is CURRENT but no window is live (naming the stale window and whether it expired or hasn't started), blue for the reverse.
- **`toWindowRow()` takes `now`** and no longer labels an out-of-range OPEN window "Active" — it reads `Open · date passed` / `Open · not started`. Status `OPEN` alone was rendering as Active on `/console/windows`, which is precisely what made an expired window look healthy.

**`POST /applications` is the single entry point, and it is idempotent.** The dashboard's "Start my EOI application" card (`start-eoi-button.tsx`) is the only way an investor gets an `Application` row — one is never created at registration. The service returns an existing non-`WITHDRAWN` application instead of making a second, so a double-click cannot leave the investor with two drafts (only the newest is ever shown, so the other would be invisible but still counted in admin reports). `lotReference` is optional and defaults to `UNASSIGNED_LOT_REFERENCE` — the EOI states the area required (§2.1); a specific plot is assigned at allocation.

**Admin EOI preview — the one thing that lifts the window gate.** An `ADMIN` may sign into the *investor* portal (`apps/portal`) and drive the whole EOI journey with the `ApplicationWindow` gate lifted, so the flow is testable between calls. `packages/shared/src/eoi-preview.ts` is the single source: `EOI_PREVIEW_ROLES` (ADMIN only — TC/LAC/ExCo are reviewers and stay out), `canPreviewEoi()`, and `previewOrgLegalName()`. All three apps read it, so widening preview access is a one-line change in one file.

What preview does and does not change:
- **Lifted:** every schedule gate. `createApplication()` skips the open-window check entirely; `submitApplication()` skips the date-range check and falls back to the most recent window of any status when none is OPEN; the dashboard journey (`eoiUnlocked`) and the site-visit booking form open regardless of the published timeline. The schedule constrains outside investors, not the admin. The one thing submit still needs is *some* `ApplicationWindow` row — not for permission, but because the reference number is drawn from its year and `sequenceCounter`, and there is nowhere else to get one.
- **Not lifted:** the payment gate, the section schemas, `submissionBlockers()`, the document checklist, ownership checks. A preview actor runs the *same* service methods as an investor — there is no second code path, which is the only reason preview proves anything.
- **Sandbox org:** an `Application` needs an `investorOrgId` and staff have none, so `previewOrgFor()` find-or-creates an `InvestorOrg` named `[PREVIEW] <name>`. The admin's own `User.investorOrgId` is deliberately **not** written — investor reports filter on `role = INVESTOR`, so the admin stays out of them. Because the org now lives on the application rather than the user, `getEoiWizardData()` and `getInvestorDashboardData()` resolve it from `Application.investorOrgId` first.
- **Real, not mocked:** real rows, real Zod validation, real S3 objects. That is the point — a stubbed S3 would not prove the bucket, its CORS policy or its region are right. `AdminPreviewBanner` says so on every dashboard page.
- **Costs:** the test application is indistinguishable from a real one in admin reports, and submitting one consumes a number from the live window's `sequenceCounter`. Delete it (`DELETE /applications/:id`) when done.

**Section 1 is prefilled from registration but stays editable.** `prefillPreliminaryInfo()` seeds company name, registration number, country, legal form, TIN and contacts from `InvestorOrg`/`User`; the confirmed values are written into the section payload. The submitted EOI is therefore a self-contained record — a committee reading it later sees what was declared at submission, not whatever the org row says by then.

**The seed validates itself.** `upsertSection()` in `packages/db/seed.ts` parses every payload against `sectionSchemas` and throws on failure, which is why `@kip/db` now depends on `@kip/shared`. Demo data that drifts from the schema otherwise fails silently — sections show as complete while submit rejects them.

**The EOI Investor Guide is the investor-facing companion to the spec.** The 13-page UNOC guide (document checklist, the six sections explained, local vs international paths, FAQ) lives in the documents bucket under the **public-read `public/` prefix** — a different access model from EOI attachments under `applications/`, which are only ever reachable through a presigned URL. The URL is defined once in `apps/portal/src/lib/resources.ts` and rendered by `EoiGuideCallout` on the home page, How It Works, Resources and the signed-in dashboard. Two things to keep right: **never commit the PDF to the repo** (same rule as the promo video), and keep `target="_blank"` on the link — browsers ignore the `download` attribute cross-origin, so without it the click navigates the investor off the portal.

## Analytics — Google Tag Manager

Container **`GTM-T23BP8QS`**. **`apps/portal` only, but now across the whole app** — public marketing pages, the signed-in investor dashboard, the auth pages and `/launch`. `apps/web` (admin) still has no GTM at all. Widened from public-pages-only on 30 July 2026.

- Mounted in the **root layout**, `apps/portal/src/app/layout.tsx`: `<GoogleTagManagerNoScript />` (the `<noscript>` iframe, must stay the first child of `<body>`) then `<GoogleTagManager />` (loader, `next/script` `strategy="afterInteractive"`). Component: `apps/portal/src/components/google-tag-manager.tsx`.
- Because it's in the root layout, **every portal route is tracked automatically** — including `not-found.tsx` (404s are now tracked) and the `(investor)` dashboard, where URLs and interactions describe signed-in behaviour. Keep PII out of any `dataLayer` push, and remember GTM tags fire on `/dashboard/*` pages.
- `(public)/layout.tsx` deliberately mounts **nothing** — re-adding GTM there loads the container twice on every marketing page.
- Gated on **`NEXT_PUBLIC_GTM_ID`**; both components return `null` when unset, so local dev, CI and preview builds send nothing.
- `NEXT_PUBLIC_*` is baked in at **build time**. In Docker the id comes from the `NEXT_PUBLIC_GTM_ID` build arg (`apps/portal/Dockerfile` defaults to the real container, matching the `NEXT_PUBLIC_API_URL` pattern) and is passed by `deploy.yml` from `vars.NEXT_PUBLIC_GTM_ID`. Setting it only in `/opt/kip/.env.production` changes nothing — GTM is client-side.
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
| `packages/db/src/index.ts` | Sequelize singleton + 19 model inits + associations |
| `packages/db/src/models/` | 19 model files |
| `packages/db/migrations/` | All applied migrations (initial, lac-pipeline, investor-org-tin, user-status, payment-unique-index, registration-profile-fields, inquiries, soft-delete, site-visit-bookings, user-password-changed-at, timeline-milestones, communications, eoi-document-kinds) |
| `packages/db/seed.ts` | Raw pg seed — idempotent. Section payloads are Zod-validated on write (see EOI module) |
| `packages/shared/src/enums.ts` | All enums — source of truth |
| `packages/shared/src/timeline.ts` | `TimelineMilestoneKind`, `TimelineMilestoneStatus`, `computeTimeline()` (active = last started, manual status overrides win), `findMilestoneOfKind()`, `longDate()` (EAT), `FALLBACK_MILESTONES` (published Phase 2 schedule — seed data + render fallback). Tested in `apps/portal/src/lib/timeline.test.ts` |
| `packages/shared/src/zones.ts` | `KIP_ZONES` — zone labels, colours, areas, land uses. Source of truth for the land map + site-visit form |
| `packages/shared/src/communications.ts` | Pure broadcast rendering — `MERGE_TOKENS`, `applyMergeTokens()`, `sampleMergeVars()`, `renderBodyHtml()` (escape-then-format; the XSS boundary), `bodyExcerpt()`, plus the broadcast-attachment rules (`COMMUNICATION_ATTACHMENT_MAX_BYTES`, `COMMUNICATION_ATTACHMENT_TYPES`, `validateCommunicationFile()`, `formatFileSize()`). Shared by the composer preview, the API's send, and the portal inbox. Tested in `apps/web/src/lib/communications.test.ts` |
| `packages/shared/src/schemas/application.ts` | **The EOI, in executable form** — six section schemas transcribed from the Master Content Specification, the `notApplicable` mechanism (`requireUnlessNA`), EOI form enums + label maps, `ugandanEmploymentPercentages()`, `crossSectionIssues()`, `EOI_SECTION_ORDER`/`_LABELS`, `updateSectionSchema` (the `complete` flag), and the status transition table |
| `packages/shared/src/eoi-preview.ts` | Admin EOI preview policy — `EOI_PREVIEW_ROLES`, `canPreviewEoi()`, `previewOrgLegalName()`, `isPreviewOrgName()`. Pure; read by all three apps |
| `apps/portal/src/components/admin-preview-banner.tsx` | Banner shown on every investor-portal page while a preview role is signed in — warns that the data is real |
| `packages/shared/src/eoi-documents.ts` | The attachment checklist — `EOI_DOCUMENT_REQUIREMENTS` (kind, clause, descriptor, required, multiple, applicant category, N/A allowed), `documentRequirementsFor()`, `missingRequiredDocuments()`, `validateEoiFile()`, `EOI_MAX_FILE_BYTES` (5 MB, PDF only). Pure |
| `packages/shared/src/schemas/` | Zod schemas for sections, documents, payments |
| `apps/api/src/modules/documents/` | EOI attachments — presign / register-after-upload / list / download / delete, owner-or-ADMIN scoped |
| `apps/portal/src/lib/eoi-data.ts` | `server-only` — `getEoiWizardData()` (application + sections + documents + prefill in one read) and `prefillPreliminaryInfo()` |
| `apps/portal/src/lib/form-path.ts` | Pure dotted-path `getIn`/`setIn`/`appendTo`/`removeAt`/`issuesByPath` over section payloads — paths match Zod's `issue.path.join(".")` so errors map onto inputs with no translation layer. Unit-tested |
| `apps/portal/src/app/(investor)/dashboard/eoi/` | The EOI wizard — `[section]/page.tsx` server shell → `eoi-wizard.tsx` (state, draft/complete saves, submit, blockers) + `eoi-sections.tsx` (the six forms) + `eoi-fields.tsx` (path-bound primitives, N/A toggles, repeatables, year rows) + `document-slots.tsx` (presign → PUT → register) |
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
| `apps/api/src/modules/communications/` | Broadcasts — `createAndSend()` (transaction → detached paced `deliver()`), `retryUnsent()`, `sendTest()`, template CRUD, `markRead()` (owner-checked) |
| `apps/api/src/mailer.ts` | `sendMail()` + `escapeHtml()` + a private `shell()` (card chrome; the older templates still inline their own copy — left alone deliberately) + `credentialsEmail`, `rejectionEmail`, `siteVisitConfirmationEmail` (request received), `siteVisitScheduledEmail` (admin confirmed the visit), `siteVisitNotificationEmail`, `passwordChangedEmail`, `passwordResetEmail` (admin reset — temp credentials), `announcementEmail` (broadcasts — takes body HTML already rendered by `renderBodyHtml()`, never a raw body) |
| `apps/portal/src/lib/mailer.ts` | Portal-side `sendMail()` + `escapeHtml()` + `credentialsEmail` (registration). Shared transport for contact form + live chat |
| `apps/portal/src/lib/smtp.ts` | `smtpTransportOptions()` — single source for the portal's SMTP options (mailer, NextAuth EmailProvider, notify-me action) |
| `apps/web/src/lib/smtp.ts` | `smtpTransportOptions()` — same, for the admin app's NextAuth EmailProvider |
| `apps/portal/src/app/(investor)/dashboard/site-visit/` | Investor booking form (zone → land use → description → acres slider) + booking status view. The booking summary + status block is the shared `components/site-visit-summary.tsx`, also rendered on the dashboard overview so a scheduled visit shows on sign-in |
| `apps/portal/src/lib/timeline-data.ts` | `server-only` — `getTimelineData()` reads `TimelineMilestone` (fallback when empty/no DB) → `{ timeline, eoiCall, siteVisit }`. Consumed by portal home, About, investor dashboard stage tracker, and the site-visit booking gate |
| `apps/web/src/app/(admin)/console/settings/timeline-editor.tsx` | Admin CRUD for the application timeline (add/edit/delete milestones, kind picker, current-stage marker) — calls the `timeline/` API module; changes are live on the portals immediately |
| `apps/portal/src/app/(investor)/dashboard/settings/` | Investor account settings — profile + company-contact edit (`PATCH /users/me`) and change password (`POST /users/me/password`); read-only legal identity + account meta. `settings-ui.tsx` = shared card/field primitives. Sidebar "Settings" nav + a dashboard nudge appear while `passwordChangedAt` is NULL |
| `apps/web/src/app/(admin)/console/site-visits/` | Admin site-visit tracker — searchable/filterable table; row opens `site-visit-detail-modal.tsx` (full request + investor profile: rep, company, account status, EOI progress via `SiteVisitRow.investor`) with schedule / complete / cancel actions (`POST /site-visits/:id/status`); CSV/print/copy export via the shared report export dropdown |
| `apps/web/src/app/(admin)/console/report/` | **Reports hub** (ADMIN) — tabbed reports, one route per report: `page.tsx` Overview (cross-domain KPIs, 12-week trends, funnel), `investors/` Investor Onboarding (see below), `applications/` review pipeline (stage breakdown, committee decisions, avg days per stage mined from `ReviewAction`), `payments/` fees (confirmation lag, aging, weekly trend, method split), `site-visits/` site-visit demand (see below), `engagement/` inquiries + notify signups. Tab order lives in `components/report/report-tabs.tsx`; shared chrome in `layout.tsx`. All print-optimised |
| `apps/web/src/app/(admin)/console/report/investors/` | Investor Onboarding report. `page.tsx` is a thin server shell — one `getReportData()` read, then `investors-report-client.tsx` owns **all** filtering in the browser: zone drill-down cards, registration date range (presets + custom `from`/`to`), site-visit/account/payment/stage/country/sector selects, and a day/week/month sign-up trend. `siteVisitStatus` (`investorSiteVisitStatus()` in `mappers.ts`) collapses an investor's bookings to the **furthest-along** one — Completed > Scheduled > Requested > Cancelled, else "Not booked" — so it answers "have they booked a site visit?" in the table, the filter and the CSV. Every KPI, funnel, breakdown, chart and CSV re-derives from the *filtered* subset, so the numbers and the export always describe the same slice. Zone cards deliberately ignore the zone filter (denominator = `zoneScopeStats`, not `stats`) so you can still see what you drilled away from |
| `apps/web/src/app/(admin)/console/report/site-visits/` | Site Visits report — same server-shell + client-drill-down shape as `investors/`, over `getSiteVisitsReportData()`. Zone demand cards (requests + acreage), request date range, status / land-use / plot-size / country filters, day/week/month request trend, request→scheduled→completed funnel (a completed visit still counts as scheduled), avg days to schedule. **Distinct from `/console/site-visits`**, which is the operational tracker where admins schedule/complete/cancel; this tab is read-only analysis |
| `apps/web/src/components/report/` | Reports-hub building blocks: `report-ui.tsx` server-safe primitives (`Panel`, `BarList`, `MiniStat`, `FunnelBars`, `TrendBars`, `SeriesBars` labelled trend chart, `PrintHeading`), `report-tabs.tsx` tab bar, `report-table.tsx` generic searchable detail table (declarative column spec, badge maps), `export-actions.tsx` generic export dropdown — CSV via `buildCsv()` (Blob + UTF-8 BOM), Print/Save-as-PDF (`window.print()`), Copy summary; `extraCsvs` adds sibling downloads. All client-side so exports work on the read-only demo |
| `apps/web/src/app/(admin)/console/communications/` | Communications hub (ADMIN) — `page.tsx` server shell → `communications-client.tsx` (Compose / History / Templates tabs + KPI row). `compose-form.tsx` owns subject + body + merge-token inserts + live preview + "Send test to me" + `send-confirm-dialog.tsx`; `audience-picker.tsx` is the audience mode selector (reuses the investors-report filter controls, staff role chips, searchable hand-pick list) with a live recipient count; `templates-tab.tsx` + `template-dialog.tsx` are template CRUD; `[id]/page.tsx` is the broadcast detail page (roll-up, rendered message, per-recipient delivery log) with `[id]/communication-actions.tsx` for retry/delete |
| `apps/web/src/lib/communication-audience.ts` | Pure audience resolution — `resolveRecipients()` (delegates to `filterInvestors`, de-dupes by lowercased email, drops unusable addresses), `describeAudience()`, `previewVarsFor()`. No `@kip/db`/`server-only`/React; unit-tested (`communication-audience.test.ts`) |
| `apps/portal/src/lib/inbox-data.ts` | `server-only` — `getInbox(userId)` + `getUnreadCount(userId)` over `Notification`, filtered to channels that include the portal. Try/catch-guarded like `timeline-data.ts` so a dashboard still renders if the read fails |
| `apps/portal/src/app/(investor)/dashboard/messages/` | Investor Messages inbox — expandable list, marks read via `POST /communications/inbox/:id/read`. Unread count drives the sidebar badge (passed from `(investor)/layout.tsx`, which is where the DB read happens) and a dashboard nudge |
| `apps/web/src/lib/report-filters.ts` | Pure filter + aggregation logic behind the drill-down report tabs. Shared core: `zoneBreakdown()` (any `{zoneKey, acresRaw}` row), `countBy()`, `bucketByPeriod()` (day/week/month, gap-filled, capped at 200 buckets then falls back to occupied ones), `trendStats()`, `presetRange()`/`matchPreset()`, `activeFilterCount()`. Then one section per report: `filterInvestors`/`computeInvestorStats`/`computeFunnel`/`describeInvestorFilters` and `filterSiteVisits`/`computeSiteVisitStats`/`computeSiteVisitFunnel`/`describeSiteVisitFilters` + `ACRE_BANDS`. Filter shapes are written out per report rather than driven by a generic predicate engine — keep it that way. No `@kip/db`/`server-only`/React; unit-tested (`report-filters.test.ts`) |
| `apps/web/src/lib/report-export.ts` | Pure CSV + text-summary builders for all report exports (`buildCsv`, column specs incl. `INVESTOR_EXPORT_COLUMNS` / `SITE_VISIT_EXPORT_COLUMNS` / `PERIOD_TREND_COLUMNS` / `ZONE_BREAKDOWN_COLUMNS` / `INQUIRY_EXPORT_COLUMNS`, per-report `build*Summary`, filename stampers) — no `@kip/db`/`server-only`, unit-tested (`report-export.test.ts`). Shared row fixtures live in `lib/test-fixtures.ts` |
| `apps/web/src/lib/auth.ts` | NextAuth config — Email + Credentials, custom SequelizeAdapter |
| `apps/web/src/lib/rbac.ts` | RBAC policy — single source for both middleware + server guards |
| `apps/web/src/lib/format.ts` | Pure formatters (date/money) — deterministic, unit-tested |
| `apps/web/src/lib/admin/queries.ts` | `server-only` admin read layer |
| `apps/web/src/lib/admin/mappers.ts` | Pure DB-row → view-model mappers, unit-tested |
| `apps/web/src/lib/investor-data.ts` | Investor read data layer — live on seeded data |
| `apps/web/src/lib/webhooks.ts` | Server-only `fireWebhook()` for Next.js API routes |
| `apps/web/src/components/` | Shared UI: `site-nav`, `admin-topbar`, `dashboard-sidebar`, `stat-card`, `status-badge`, `data-table`, `payment-amount-card`, `countdown-timer`, `confirm-delete-dialog` (all admin deletes go through it) — check before building new UI |
| `apps/web/src/components/ui/` | Primitives: `alert`, `avatar`, `badge`, `button`, `card`, `dropdown-menu`, `input`, `separator`, `sheet`, `table`, `textarea`, `tooltip` |
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
| `apps/portal/src/app/layout.tsx` | Portal root layout — fonts, `Providers`, chat widget, and the GTM mount that covers every portal route (see Analytics) |
| `apps/portal/src/app/(public)/layout.tsx` | Public marketing route group — pass-through only (no chrome, no GTM); pages render their own nav/footer |
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
| `apps/portal/src/app/(public)/resources/page.tsx` | Downloads page — KIP plot map PDF, the EOI Investor Guide, + coming-soon placeholders |
| `apps/portal/src/lib/resources.ts` | Published investor documents hosted in the bucket's public `public/` prefix — currently `EOI_INVESTOR_GUIDE`. **Never commit these binaries**, same rule as the promo video |
| `apps/portal/src/components/eoi-guide-callout.tsx` | "Start here" download callout for the EOI Investor Guide — `light` (public pages) / `dark` (dashboard rail). Rendered on home, how-it-works, resources and the investor dashboard |
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
- Trust `ApplicationSection.completedAt` as proof a section is valid — re-validate the payload (`submissionBlockers()`); the flag only records that it passed *when saved*
- Full-validate a section on a draft save, or stamp `completedAt` on one — that breaks save-and-resume (spec §8)
- Create a `Document` row before the S3 upload succeeds — the submit guard counts rows, so a failed transfer would report a missing attachment as attached
- Add an EOI attachment slot in the wizard UI — add it to `EOI_DOCUMENT_REQUIREMENTS`, which the guard and the committee view also read
- Add a `DocumentKind` value without a migration — it is a Postgres ENUM type
- Store a self-reported percentage the payload can already derive from its own counts (Ugandan employment); derive it instead
- Ask for H3SE or National Content history as prose — those are the cross-bidder comparison tables and must stay numeric
- Treat a blank field as Not Applicable — N/A needs a written explanation in the section's `notApplicable` map
- Expect a `TimelineMilestone` (incl. `EOI_CALL`) to open or close anything — only `ApplicationWindow` gates the EOI
- Widen EOI preview beyond `ADMIN`, or hardcode the role check — change `EOI_PREVIEW_ROLES` in `@kip/shared`, which all three apps read
- Give a preview actor a separate code path, mock S3, or skip validation — preview runs the real services or it proves nothing
- Write `User.investorOrgId` on a staff account — the preview sandbox org hangs off the `Application`, which is what keeps admins out of investor reports
- Assume an investor has an `Application` — registration creates none; `POST /applications` from the dashboard does
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
- Render a broadcast body any way other than `renderBodyHtml()` from `@kip/shared` — it escapes before formatting, and is what makes the `dangerouslySetInnerHTML` call sites safe
- Attach a file to a broadcast email instead of linking it — one upload serves the whole audience; mailing it sends the bytes once per recipient through the throttled shared mailbox
- Move `GET /communications/attachments/:id` below `requireAuth`, or give it an enumerable id — notify-list recipients have no account, and the unguessable UUID is the capability
- Add a free-form `to` field to `POST /communications/test` — a test send goes to the acting admin's own address, or it becomes an open relay
- Send a broadcast larger than `COMMUNICATION_MAX_RECIPIENTS` through the shared mailbox — that needs SES/n8n
- Await `deliver()` inside a request handler — a paced send runs for minutes and would time out the browser
- Build a nodemailer transport by hand — call `smtpTransportOptions()` so STARTTLS stays enforced
- Set `EMAIL_FROM` to anything but the authenticated mailbox or a Send As alias — Exchange rejects it with 5.7.60
- Commit the `Support.Kip@unoc.com` password — it lives only in gitignored `.env` files and `/opt/kip/.env.production`
- Re-introduce an admin approval gate on investor registration (removed 10 July 2026)
- Edit `packages/db/dist/` — generated by `pnpm db:build`
- Use npm or yarn — pnpm only
- Update CLAUDE.md as a follow-up — same commit as the code change
