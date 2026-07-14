# Reports redesign — review & plan

> For review before implementation. Branch: `feat/dashboar-report`. 14 July 2026.

## 1. Review of current state

**What exists**

| Surface | What it covers | Gap |
|---|---|---|
| `/console` dashboard | Operational snapshot: app counts, payments, pending transfers, activity feed | Fine as-is — it's a "what needs my attention today" view |
| `/console/report` | Investor Onboarding Report only (KPIs, funnel, country/sector/type breakdowns, per-investor table, CSV/print/copy exports) | Sidebar says "Reports" but there's one report; applications, payments, site visits, inquiries have **no reporting at all** — only raw list pages |

**What's good and should be kept**
- Reads go direct-to-DB (`queries.ts`) → reports work on the read-only Vercel demo with no API.
- Pure mappers + client-side exports (CSV Blob, `window.print()`, clipboard) — demo-safe, unit-testable.
- Print CSS already wired into topbar/sidebar/data-table.
- `report-export.ts` already contains generic `buildCsv()` + `datestampedFilename()` — currently **unused**, clearly intended for exactly this expansion.

**Weaknesses in the current design**
1. **Single-audience.** Only answers "how is investor onboarding going" — nothing for the payments story (Lilian/finance), the review-pipeline story (TC/LAC/ExCo throughput), or engagement (site visits, inquiries).
2. **No time dimension.** Everything is all-time totals; no trends, no per-window slicing — yet the whole domain is organised around `ApplicationWindow` rounds.
3. **No stage-timing insight.** `ReviewAction` is an append-only audit log with timestamps — avg days in TC review, time-to-allocation etc. are sitting in the data unused.
4. **Report UI primitives (`BarList`, `Panel`, `MiniStat`) are private to `report/page.tsx`** — can't be reused without copy-paste.

## 2. Proposed design — a Reports hub

One hub at `/console/report` with a tab bar; each tab is its own route (own query, own export):

```
/console/report              → Overview  (cross-domain summary + trends)
/console/report/investors    → current Investor Onboarding Report (moved)
/console/report/applications → Applications & Review Pipeline
/console/report/payments     → Payments & Fees
/console/report/engagement   → Site Visits + Inquiries
```

**Cross-cutting features (all tabs)**
- **Window filter** — `?window=<id>` dropdown (All / per ApplicationWindow). The single most useful slice for KIP.
- **Export/Share dropdown** on every tab — reuses `ReportExportActions` generalised over `buildCsv()`; CSV + Print/PDF + Copy summary, all client-side.
- Shared primitives extracted to `apps/web/src/components/report/` (`Panel`, `BarList`, `MiniStat`, `TrendBars`).
- ADMIN-only via `requireRole(ADMIN_ONLY)` (open question below: give TC_CHAIR read access to the applications tab?).

**Per-tab content**

| Tab | KPIs | Visuals | Detail table (CSV) |
|---|---|---|---|
| **Overview** | Investors, EOIs submitted, fees collected, site visits, open inquiries, days to window close | 12-week trend bars: registrations / submissions / confirmed payments per week; condensed funnel | — (links into other tabs) |
| **Investors** | (as built today) | (as built) | (as built) |
| **Applications** | Total, submitted, in-review, decided, clarifications outstanding | Status-machine funnel by window; **avg days per stage** from `ReviewAction` (submit→TC decision, TC→LAC, LAC→ExCo); TC/LAC/ExCo decision split | Per-application: ref, company, status, stage age, window |
| **Payments** | Confirmed count + amount, pending proofs, aging (>7d unconfirmed), avg confirmation lag | Fees per week; method split; payment→submission conversion | Per-payment: company, amount, currency, method, status, initiated, confirmed |
| **Engagement** | Site visits by status, inquiries open/responded, notify-me signups | Visits by zone + land use + acres distribution; inquiries by channel; response rate | Per-visit and per-inquiry tables |

**Data-layer approach** — one `get<X>ReportData(windowId?, now)` per tab in `queries.ts`, all shaping in pure mapper functions (unit-tested), weekly bucketing done in JS (data scale is small). No schema changes, no migrations, no new API endpoints needed.

## 3. Implementation plan (phased, each phase shippable)

| Phase | Work | Est. size |
|---|---|---|
| **0 — Hygiene** | Add `.gitattributes` (`* text=auto`) to kill the CRLF noise; commit the existing onboarding-report work cleanly; add missing unit tests for `applicationStageLabel` / `toInvestorReportRow` | small |
| **1 — Hub scaffold** | Move current report → `/console/report/investors`; add `report/layout.tsx` tab bar; extract `Panel`/`BarList`/`MiniStat` to `components/report/`; generalise `ReportExportActions` to take `{columns, rows, summary, filename}` and wire `buildCsv()` | small-med |
| **2 — Applications report** | `getApplicationsReportData()` + stage-duration mappers from `ReviewAction`; page + exports | medium |
| **3 — Payments report** | `getPaymentsReportData()` + aging/lag mappers; page + exports | medium |
| **4 — Engagement report** | `getEngagementReportData()` (site visits, inquiries, notify signups); page + exports | medium |
| **5 — Overview + window filter** | Weekly trend bucketing helper (pure, tested); overview page; add `?window=` filter across tabs | medium |

Each phase: `pnpm --filter @kip/web typecheck && pnpm --filter @kip/web test` (run in Cursor — my sandbox can't resolve the Windows-installed node_modules), CLAUDE.md updated in the same commit.

## 4. Open questions

1. **RBAC** — keep all reports ADMIN-only, or let `TC_CHAIR` see the Applications tab (read-only)? Default: ADMIN-only.
2. **Route naming** — keep `/console/report` (no URL break) or rename to `/console/reports`? Default: keep `report`.
3. **Charts** — stay with the current pure-CSS bars (zero deps, print-safe) or add a chart library? Default: pure CSS.
4. Phase order — payments before applications if finance visibility is the more urgent ask.
