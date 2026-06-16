import { AlertTriangle, CheckCircle2, Download, FileText } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TcDecisionForm } from "./tc-decision-form";
import { AiScreeningButton } from "./ai-screening-button";

const SECTION_REVIEWS = [
  {
    key: "s1",
    label: "S1 — Preliminary Information",
    status: "pass",
    summary:
      "Company is duly incorporated in Uganda (reg. 2018). Directors have disclosed all directorships. No conflicts of interest identified. Proposed sector (light manufacturing — food processing) is within the permitted KIP industrial classification.",
    flag: null,
  },
  {
    key: "s2",
    label: "S2 — Land Profile",
    status: "pass",
    summary:
      "Requesting 3.5 ha in the light industrial zone. Capital investment USD 4.2 M over 3 years, with USD 1.8 M in Y1. Evidence of similar 2.8 ha facility in Naivasha, Kenya operational since 2021. Plot size and investment density are consistent with KIP minimum thresholds.",
    flag: null,
  },
  {
    key: "s3",
    label: "S3 — Utilities & Infrastructure",
    status: "pass",
    summary:
      "Water: 120 m³/day from KIP reticulated supply. Power: 1.2 MW grid connection + 200 kW solar backup (commissioning plan included). Fibre: Airtel Business 100 Mbps. Wastewater: on-site pre-treatment plant before discharge to KIP sewer.",
    flag: null,
  },
  {
    key: "s4",
    label: "S4 — H3SE",
    status: "warn",
    summary:
      "ISO 14001:2015 certificate attached (valid until Dec 2027). Emergency Response Plan references corporate procedures from the Kenya site — KIP-scale on-site monitoring procedures and organisational chart for the proposed facility are not clearly articulated. Clarification recommended before passing.",
    flag: "H3SE documentation for KIP site is insufficient. Section 4.3 (on-site monitoring) must be resubmitted.",
  },
  {
    key: "s5",
    label: "S5 — National Content",
    status: "pass",
    summary:
      "68% Ugandan workforce target committed. Apprenticeship programme MOU with Makerere University Business School attached. 5-year skills-transfer schedule for expatriate roles included. Procurement plan commits 60% to Ugandan-registered suppliers.",
    flag: null,
  },
  {
    key: "s6",
    label: "S6 — Declaration",
    status: "pass",
    summary:
      "Signed by authorised director (as per articles of association). Notarised copy of board resolution authorising submission provided. Declaration date matches submission timestamp.",
    flag: null,
  },
];

const SCORE_BREAKDOWN = [
  { section: "S1 Preliminary",  score: 15, max: 15 },
  { section: "S2 Land Profile", score: 18, max: 20 },
  { section: "S3 Utilities",    score: 17, max: 20 },
  { section: "S4 H3SE",         score: 10, max: 20 },
  { section: "S5 Nat. Content", score: 17, max: 20 },
  { section: "S6 Declaration",  score:  5, max:  5 },
];

const AUDIT = [
  { time: "01 Jul 2026 · 09:14", text: "Assigned to TC Review Queue",      actor: "System"          },
  { time: "30 Jun 2026 · 18:03", text: "AI pre-screening completed",        actor: "KIP AI Agent"    },
  { time: "30 Jun 2026 · 17:59", text: "EOI Submitted",                     actor: "Nile Industries" },
  { time: "30 Jun 2026 · 17:55", text: "MTN payment confirmed",             actor: "MTN webhook"     },
  { time: "30 Jun 2026 · 17:44", text: "Payment initiated",                 actor: "Nile Industries" },
  { time: "28 Apr 2026 · 11:20", text: "Account registered & verified",     actor: "Nile Industries" },
];

const DOCS = [
  "Certificate of Incorporation",
  "ISO 14001 Certificate",
  "Board Resolution",
  "Kenya Facility Evidence",
  "Makerere University MOU",
  "Financial Statements FY2025",
];

export default async function TcReviewPage({
  params,
}: {
  params: { ref: string };
}) {
  // Access (TC_MEMBER / TC_CHAIR / ADMIN) is enforced by the tc/ layout guard.
  const totalScore = SCORE_BREAKDOWN.reduce((s, r) => s + r.score, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard",       href: "/console" },
            { label: "TC Review Queue", href: "/console/tc/queue" },
            { label: params.ref },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText size={14} /> View all documents
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download size={14} /> Download all
              </Button>
            </div>
          }
        />

        {/* Title row */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{params.ref}</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Nile Industries Limited · 3.5 ha · Light Industry
            </p>
          </div>
          <StatusBadge variant="tc-in-progress">In Review</StatusBadge>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Left: main review content ── */}
          <div className="space-y-5 lg:col-span-2">

            {/* Pre-screening memo */}
            <div className="rounded-xl border-2 border-brand-300 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">
                  AI Pre-Screening Assessment Memo
                </h2>
                <AiScreeningButton />
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3">
                <Card className="border-2 border-brand-400 text-center">
                  <CardContent className="p-4">
                    <p className="text-3xl font-black text-brand-600">{totalScore}</p>
                    <p className="text-[11px] font-semibold text-brand-600">
                      Overall Score /100
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-4">
                    <CheckCircle2 size={22} className="mx-auto mb-1 text-green-500" />
                    <p className="text-[11px] font-semibold text-ink-500">Completeness</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-4">
                    <AlertTriangle size={22} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-[11px] font-semibold text-ink-500">H3SE Evidence</p>
                  </CardContent>
                </Card>
              </div>

              <p className="text-sm leading-relaxed text-ink-700">
                Application is substantially complete. Strong financial capacity
                evidence and a credible national content plan. H3SE documentation
                references ISO 14001 certification but the on-site monitoring
                procedures for the KIP facility are not clearly articulated. TC
                should request clarification on H3SE Section 4.3 before passing.
              </p>
            </div>

            {/* Section-by-section reviews */}
            <div>
              <h2 className="mb-3 text-sm font-bold text-ink-900">
                EOI Section Reviews
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SECTION_REVIEWS.map((s) => (
                  <Card key={s.key} className={s.flag ? "border-amber-200" : "border-ink-200"}>
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-ink-800">{s.label}</h3>
                        {s.status === "pass" ? (
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-500" />
                        ) : (
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-ink-600">{s.summary}</p>
                      {s.flag && (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5">
                          <p className="text-[11px] font-semibold text-amber-700">
                            TC Flag: {s.flag}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Decision form */}
            <TcDecisionForm />
          </div>

          {/* ── Right: metadata + score breakdown + audit ── */}
          <div className="space-y-5">
            {/* Application info */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink-900">Application Info</h2>
              <div className="divide-y divide-ink-100">
                {[
                  ["Reference",    params.ref],
                  ["Company",      "Nile Industries Limited"],
                  ["Sector",       "Light Manufacturing — Food Processing"],
                  ["Land Request", "3.5 ha"],
                  ["Investment",   "USD 4.2 M (Y1: USD 1.8 M)"],
                  ["Jobs (Y3)",    "240 direct, 180 indirect"],
                  ["Submitted",    "30 Jun 2026"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-ink-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score breakdown */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink-900">Score Breakdown</h2>
              <div className="space-y-2.5">
                {SCORE_BREAKDOWN.map((r) => {
                  const pct = Math.round((r.score / r.max) * 100);
                  return (
                    <div key={r.section}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-ink-600">{r.section}</span>
                        <span className="text-xs font-semibold text-ink-900">
                          {r.score}/{r.max}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-brand-400" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-xs font-semibold text-ink-600">Total</span>
                <span className="text-lg font-black text-brand-600">{totalScore}/100</span>
              </div>
            </div>

            {/* Submitted documents */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink-900">Submitted Documents</h2>
              <ul className="space-y-2">
                {DOCS.map((doc) => (
                  <li key={doc} className="flex items-center gap-2">
                    <FileText size={13} className="shrink-0 text-ink-400" />
                    <span className="text-xs text-ink-700">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Audit trail */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-ink-400" />
                <h2 className="text-sm font-bold">Audit Trail</h2>
              </div>
              <ol className="relative border-l border-ink-200 pl-4">
                {AUDIT.map((a, i) => (
                  <li key={i} className="mb-4">
                    <p className="text-[10px] font-semibold text-brand-600">{a.time}</p>
                    <p className="text-xs font-semibold text-ink-900">{a.text}</p>
                    <p className="text-[10px] text-ink-500">{a.actor}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
