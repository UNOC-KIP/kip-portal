# KIP Portal — 12-Week Build Phases

Solo development. Each week ends with a working, demoable slice.

## W1 — Foundation (current scaffold)
- Monorepo, Postgres, n8n, MailHog all booting with one command
- Prisma schema migrated, seed data loaded
- NextAuth magic-link sign-in working end-to-end
- Health check green

## W2 — Investor account + Discovery
- Sign-up flow that collects investor org details
- Discovery pages: KIP overview, master plan, lot listings, FAQ
- Basic responsive layout from Figma
- User role gates verified

## W3 — EOI Wizard, sections 1–3
- Multi-step wizard shell with autosave (debounced PUT to `/applications/:id/section`)
- Section 1: Preliminary Info (with shareholder repeater)
- Section 2: Land & Business Profile
- Section 3: Utilities & Infrastructure
- Document upload via S3 presigned URLs

## W4 — EOI Wizard, sections 4–6
- Section 4: H3SE
- Section 5: National Content
- Section 6: Declaration with e-signature capture
- Review summary page before submission

## W5 — Payment
- Card flow via gateway (sandbox first)
- Stanbic transfer flow with proof-of-payment upload
- `DRAFT_PAYMENT_PENDING` gate enforced
- Manual confirmation tooling in admin console

## W6 — Submission + Investor status tracker
- Submission action (window-open check)
- Investor status timeline view
- Email confirmation via n8n
- PDF receipt generation

## W7 — TC review console
- TC queue (window-gated visibility)
- Side-by-side application + document viewer
- Clarification request flow (TC ⇄ Investor)
- TC recommendation action

## W8 — GM no-objection → ExCo → Investment Committee
- GM-URHC dashboard with objection-with-justification flow
- ExCo loop (send back to TC)
- Investment Committee queue and Board recommendation

## W9 — Decision & notification
- Decision letter generation via n8n + `docx` (uses the same letter format as the Sabastar example)
- Email + in-app notification
- Investor sees final outcome on status tracker

## W10 — RFP invitation
- Auto-generated RFP invitation for shortlisted applicants
- RFP submission stub (more detailed forms — placeholder for the deeper RFP build)

## W11 — Admin reporting & hardening
- Reporting dashboard (intake by lot, review SLA stats, decision outcomes)
- Audit log viewer with filters
- Rate limiting, input fuzzing, CSRF audit, dependency scan

## W12 — UAT
- Lilian-led walkthrough of the full happy path + edge cases
- Bug bash & fix
- Production deploy rehearsal
- Handover docs
