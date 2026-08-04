"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EoiDocument, EoiWizardData } from "@/lib/eoi-data";
import { getIn, issuesByPath, setIn } from "@/lib/form-path";
import {
  ApplicantCategory,
  EOI_SECTION_LABELS,
  EOI_SECTION_ORDER,
  EoiSection,
  REPORTING_YEARS,
  sectionSchemas,
} from "@kip/shared";
import { AlertTriangle, Check, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { DocumentSlots } from "./document-slots";
import { EoiFormProvider } from "./eoi-fields";
import {
  SectionDeclaration,
  SectionH3se,
  SectionLandBusinessProfile,
  SectionNationalContent,
  SectionPreliminaryInfo,
  SectionUtilities,
} from "./eoi-sections";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const SECTION_NAV: { label: string; sub: string }[] = [
  { label: "Preliminary Info", sub: "Identity · Ownership · POA" },
  { label: "Land & Business", sub: "Area · Track record" },
  { label: "Utilities", sub: "Water · Power · ICT" },
  { label: "H3SE", sub: "Safety · Certifications" },
  { label: "National Content", sub: "Employment · Training" },
  { label: "Declaration", sub: "Signature · Submit" },
];

type Blocker = { section: string | null; field: string | null; message: string };

/**
 * The three most recently COMPLETED calendar years, oldest first (spec §4.1).
 *
 * `currentYear` comes from the server so the seeded rows are the same on both
 * sides of hydration.
 */
function reportingYears(currentYear: number): number[] {
  return Array.from(
    { length: REPORTING_YEARS },
    (_, i) => currentYear - REPORTING_YEARS + i,
  );
}

/**
 * The payload a section starts from when the investor opens it for the first
 * time: registration prefill for Section 1, and the fixed year rows for the
 * two comparison tables. Sections already saved are returned untouched.
 */
function seedPayload(
  section: EoiSection,
  saved: Record<string, unknown> | undefined,
  prefill: Record<string, unknown>,
  currentYear: number,
): Record<string, unknown> {
  if (saved && Object.keys(saved).length > 0) return saved;

  const years = reportingYears(currentYear);

  switch (section) {
    case EoiSection.PRELIMINARY_INFO:
      return { ...prefill };
    case EoiSection.H3SE:
      return {
        safetyPerformance: { years: years.map((year) => ({ year })) },
        certifications: [],
        comparableProjectH3se: [],
      };
    case EoiSection.NATIONAL_CONTENT:
      return {
        employment: { years: years.map((year) => ({ year })) },
        training: { years: years.map((year) => ({ year })) },
        localProcurement: {},
      };
    case EoiSection.LAND_BUSINESS_PROFILE:
      return { comparableProjects: [] };
    default:
      return {};
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return body?.error?.message ?? fallback;
}

export function EoiWizard({
  data,
  step,
  currentYear,
}: {
  data: EoiWizardData;
  /** 1-based section number from the route. */
  step: number;
  currentYear: number;
}) {
  const router = useRouter();
  const section = EOI_SECTION_ORDER[step - 1] as EoiSection;

  const saved = useMemo(
    () => new Map(data.sections.map((s) => [s.section, s])),
    [data.sections],
  );

  const [payload, setPayload] = useState<Record<string, unknown>>(() =>
    seedPayload(section, saved.get(section)?.payload, data.prefill, currentYear),
  );
  const [documents, setDocuments] = useState<EoiDocument[]>(data.documents);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "draft" | "continue" | "submit">(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<Blocker[]>([]);

  const disabled = !data.editable;

  const set = useCallback((path: string, next: unknown) => {
    setPayload((current) => setIn(current, path, next) as Record<string, unknown>);
    // Clear the message on the field being edited — leaving it there while the
    // investor fixes it makes the form feel broken.
    setErrors((current) => {
      if (!(path in current)) return current;
      const { [path]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const naNotes = (payload.notApplicable ?? {}) as Record<string, string>;

  const setNa = useCallback((key: string, note: string | null) => {
    setPayload((current) => {
      const notes = { ...((current.notApplicable ?? {}) as Record<string, string>) };
      if (note === null) delete notes[key];
      else notes[key] = note;
      return { ...current, notApplicable: notes };
    });
  }, []);

  /**
   * Section 1 decides which document slots and conditional fields apply. It is
   * read from this section's own payload when we are on Section 1, and from the
   * saved copy otherwise.
   */
  const applicantCategory = (
    section === EoiSection.PRELIMINARY_INFO
      ? getIn(payload, "applicantCategory")
      : getIn(saved.get(EoiSection.PRELIMINARY_INFO)?.payload, "applicantCategory")
  ) as ApplicantCategory | undefined;

  async function save(complete: boolean): Promise<boolean> {
    const res = await fetch(`${API_BASE}/applications/${data.application.id}/section`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ section, payload, complete }),
    });
    if (res.ok) return true;

    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; details?: { issues?: { path: string; message: string }[] } };
    };
    const issues = body?.error?.details?.issues;
    if (issues?.length) setErrors(issuesByPath(issues));
    setBanner(body?.error?.message ?? "Could not save this section.");
    return false;
  }

  async function handleDraft() {
    setBusy("draft");
    setBanner(null);
    const ok = await save(false);
    setBusy(null);
    if (ok) {
      setBanner("Draft saved. You can close the portal and pick up where you left off.");
      router.refresh();
    }
  }

  async function handleContinue() {
    setBusy("continue");
    setBanner(null);
    setErrors({});

    // Validate in the browser with the SAME schema the API enforces, so the
    // investor gets per-field messages immediately instead of one server error.
    const parsed = sectionSchemas[section].safeParse(payload);
    if (!parsed.success) {
      setErrors(
        issuesByPath(
          parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        ),
      );
      // Save anyway as a draft — an investor who filled in nine fields out of
      // ten should never lose the nine.
      await save(false);
      setBusy(null);
      setBanner(
        "Some answers still need attention before this section can be marked complete. Your work has been saved as a draft.",
      );
      return;
    }

    const ok = await save(true);
    setBusy(null);
    if (!ok) return;

    router.refresh();
    if (step < EOI_SECTION_ORDER.length) router.push(`/dashboard/eoi/${step + 1}`);
    else setBanner("Section complete. Review the checklist below, then submit.");
  }

  async function handleSubmit() {
    setBusy("submit");
    setBanner(null);
    setBlockers([]);

    // Persist the declaration first — otherwise submitting straight after
    // ticking the box would be judged against the previously saved payload.
    const parsed = sectionSchemas[section].safeParse(payload);
    if (!parsed.success) {
      setErrors(
        issuesByPath(
          parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        ),
      );
      await save(false);
      setBusy(null);
      setBanner("Complete the declaration before submitting.");
      return;
    }
    if (!(await save(true))) {
      setBusy(null);
      return;
    }

    const res = await fetch(`${API_BASE}/applications/${data.application.id}/submit`, {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      router.refresh();
      router.push("/dashboard");
      return;
    }

    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; details?: { blockers?: Blocker[] } };
    };
    setBlockers(body?.error?.details?.blockers ?? []);
    setBanner(
      body?.error?.details?.blockers?.length
        ? "Your application is not ready to submit yet."
        : (body?.error?.message ?? "Could not submit the application."),
    );
    setBusy(null);
  }

  /** Dry run of the submit guard, so the investor can check before committing. */
  async function handleCheck() {
    setBusy("submit");
    setBanner(null);
    setBlockers([]);
    await save(false);
    const res = await fetch(
      `${API_BASE}/applications/${data.application.id}/blockers`,
      { credentials: "include" },
    );
    setBusy(null);
    if (!res.ok) {
      setBanner(await readError(res, "Could not check the application."));
      return;
    }
    const { blockers: found } = (await res.json()) as { blockers: Blocker[] };
    setBlockers(found);
    setBanner(
      found.length === 0
        ? "Everything checks out — this application is ready to submit."
        : `${found.length} item(s) still need attention.`,
    );
  }

  const isLast = step === EOI_SECTION_ORDER.length;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "EOI Application" },
          ]}
        />

        <div className="flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white lg:flex-row">
          {/* Step nav */}
          <div className="shrink-0 bg-brand-500 p-5 lg:w-64 lg:p-6">
            <h2 className="mb-1 text-base font-bold text-black">EOI Application</h2>
            <p className="mb-5 text-xs text-black/60">
              Six sections. Save and resume any time.
            </p>
            <ol className="flex flex-row flex-wrap gap-1 lg:flex-col lg:space-y-0.5">
              {SECTION_NAV.map((nav, index) => {
                const num = index + 1;
                const key = EOI_SECTION_ORDER[index] as EoiSection;
                const isActive = num === step;
                const isDone = saved.get(key)?.complete === true;
                return (
                  <li key={nav.label}>
                    <Link
                      href={`/dashboard/eoi/${num}`}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-3 py-2 transition",
                        isActive ? "bg-black/15" : "hover:bg-black/10",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          isDone
                            ? "bg-green-700 text-white"
                            : isActive
                              ? "bg-black text-brand-400"
                              : "bg-black/20 text-black/60",
                        )}
                      >
                        {isDone ? <Check size={10} strokeWidth={3} /> : num}
                      </span>
                      <div className="hidden lg:block">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            isActive ? "text-black" : "text-black/70",
                          )}
                        >
                          {nav.label}
                        </p>
                        <p className="text-xs text-black/50">{nav.sub}</p>
                      </div>
                      <span className="text-xs font-bold text-black lg:hidden">
                        {nav.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Form */}
          <div className="min-w-0 flex-1 bg-ink-50/40 p-4 sm:p-6">
            <h1 className="text-xl font-bold sm:text-2xl">
              Section {step} — {EOI_SECTION_LABELS[section]}
            </h1>
            <p className="mb-5 mt-1 text-sm text-ink-500">
              Every item is assessed by the KIP Land Allocation Technical Committee as
              Compliant or Not Compliant. Anything left incomplete or vague is normally
              returned as a Request for Clarification before a decision is made.
            </p>

            {disabled && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-ink-300 bg-white px-4 py-3 text-sm text-ink-700">
                <Lock size={16} className="mt-0.5 shrink-0 text-ink-400" />
                <span>
                  This application is now with the review committee and can no longer be
                  edited. It is shown here read-only.
                </span>
              </div>
            )}

            {banner && (
              <div
                role="status"
                className={cn(
                  "mb-5 rounded-lg border px-4 py-3 text-sm",
                  blockers.length > 0 || Object.keys(errors).length > 0
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-green-300 bg-green-50 text-green-800",
                )}
              >
                {banner}
              </div>
            )}

            {blockers.length > 0 && (
              <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                  <AlertTriangle size={15} />
                  Outstanding items
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900">
                  {blockers.map((b, i) => (
                    <li key={i}>{b.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <EoiFormProvider
              value={payload}
              set={set}
              errors={errors}
              disabled={disabled}
              naNotes={naNotes}
              setNa={setNa}
            >
              <div className="space-y-4">
                {section === EoiSection.PRELIMINARY_INFO && <SectionPreliminaryInfo />}
                {section === EoiSection.LAND_BUSINESS_PROFILE && (
                  <SectionLandBusinessProfile applicantCategory={applicantCategory} />
                )}
                {section === EoiSection.UTILITIES_INFRASTRUCTURE && <SectionUtilities />}
                {section === EoiSection.H3SE && <SectionH3se />}
                {section === EoiSection.NATIONAL_CONTENT && <SectionNationalContent />}
                {section === EoiSection.DECLARATION && <SectionDeclaration />}

                <DocumentSlots
                  section={section}
                  applicantCategory={applicantCategory}
                  applicationId={data.application.id}
                  documents={documents}
                  onChange={setDocuments}
                  disabled={disabled}
                />
              </div>
            </EoiFormProvider>

            {!disabled && (
              <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-ink-200 pt-5 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() =>
                    step > 1
                      ? router.push(`/dashboard/eoi/${step - 1}`)
                      : router.push("/dashboard")
                  }
                >
                  {step > 1 ? "Previous" : "Back to dashboard"}
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={handleDraft}
                    disabled={busy !== null}
                  >
                    {busy === "draft" ? (
                      <>
                        <Loader2 size={14} className="mr-1.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save draft"
                    )}
                  </Button>

                  {isLast ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleCheck}
                        disabled={busy !== null}
                      >
                        Check my application
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={busy !== null}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {busy === "submit" ? (
                          <>
                            <Loader2 size={14} className="mr-1.5 animate-spin" />
                            Submitting…
                          </>
                        ) : (
                          "Submit EOI application"
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleContinue} disabled={busy !== null}>
                      {busy === "continue" ? (
                        <>
                          <Loader2 size={14} className="mr-1.5 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save & continue"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
