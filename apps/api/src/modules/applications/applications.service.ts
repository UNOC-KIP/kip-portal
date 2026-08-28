import { Op } from "sequelize";
import {
  sequelize,
  Application,
  ApplicationPartner,
  ApplicationSection,
  ApplicationWindow,
  Document,
  Plot,
  ApplicationPlot,
  InvestorOrg,
  Payment,
  ReviewAction,
  User,
} from "@kip/db";
import {
  ApplicationStatus,
  ApplicationWindowStatus,
  EoiSection,
  UserRole,
  UNASSIGNED_LOT_REFERENCE,
  canPreviewEoi,
  canTransition,
  crossSectionIssues,
  formatReference,
  missingRequiredDocuments,
  previewOrgLegalName,
  sectionSchemas,
  EOI_SECTION_LABELS,
  ReviewActionType,
  FINAL_OUTCOME_STATUSES,
  REFERENCED_STATUSES,
  type ApplicantCategory,
  type AdminOverrideStatusInput,
  type SavePartnersInput,
  type SetApplicationPlotsInput,
} from "@kip/shared";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../errors.js";

const ALL_SECTIONS = Object.values(EoiSection);

/**
 * Admin soft delete (paranoid mode — recoverable in SQL). Payments go with the
 * application so dashboard totals and the bank-transfer queue stay consistent;
 * sections/documents/review actions stay in place but are unreachable once the
 * parent row is hidden.
 */
export async function deleteApplication(applicationId: string): Promise<void> {
  const app = await Application.findByPk(applicationId, { attributes: ["id"] });
  if (!app) throw NotFound("Application");

  await sequelize.transaction(async (t) => {
    await Payment.destroy({ where: { applicationId: app.id }, transaction: t });
    await app.destroy({ transaction: t });
  });
}

/**
 * Save one section.
 *
 * Two modes, because the spec asks for both save-and-resume (§8) and a hard
 * completeness gate (§0):
 *
 *   complete = false — a draft. The payload is stored exactly as the form had
 *     it, half-filled fields and all, and `completedAt` is CLEARED. Editing a
 *     finished section back into a draft state has to un-complete it, or the
 *     submit guard would still be counting a section the investor has since
 *     emptied.
 *
 *   complete = true — run the full section schema. A ZodError here surfaces as
 *     a 400 with per-field messages via the global error handler.
 */
export async function saveSection(
  applicationId: string,
  actor: { id: string; role: string },
  input: { section: EoiSection; payload: Record<string, unknown>; complete: boolean },
): Promise<ApplicationSection> {
  const app = await Application.findByPk(applicationId, {
    attributes: ["id", "ownerUserId", "status"],
  });
  if (!app) throw NotFound("Application");

  if (app.ownerUserId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw Forbidden("You can only edit your own application");
  }

  // Once submitted the payload is evidence before a committee, so an investor
  // can no longer edit it. ADMIN keeps write access for the raw-JSON corrections
  // the console offers.
  const editable: string[] = [
    ApplicationStatus.DRAFT_PAYMENT_PENDING,
    ApplicationStatus.DRAFT,
    ApplicationStatus.TC_CLARIFICATION_REQUESTED,
  ];
  if (!editable.includes(app.status) && actor.role !== UserRole.ADMIN) {
    throw Conflict(
      `This application can no longer be edited (status ${app.status})`,
    );
  }

  const payload = input.complete
    ? (sectionSchemas[input.section].parse(input.payload) as object)
    : (input.payload as object);

  const existing = await ApplicationSection.findOne({
    where: { applicationId, section: input.section },
  });

  const completedAt = input.complete ? new Date() : null;

  return existing
    ? existing.update({ payload, completedAt })
    : ApplicationSection.create({
        applicationId,
        section: input.section,
        payload,
        completedAt,
      });
}

/**
 * Start an EOI. Idempotent by design: an investor who already has a live
 * application gets that one back rather than a second draft.
 *
 * Without this guard a double-click, or simply revisiting the dashboard,
 * would leave the investor with two drafts and the console with a duplicate —
 * and `getInvestorDashboardData()` only ever shows the most recent, so the
 * other would become invisible but still countable in admin reports.
 */
export async function createApplication(
  actor: { id: string; role: string },
  input: { lotReference?: string },
): Promise<{ application: Application; created: boolean }> {
  const preview = canPreviewEoi(actor.role);

  const user = await User.findByPk(actor.id, {
    attributes: ["id", "name", "email", "investorOrgId"],
  });
  if (!user) throw NotFound("User");

  // A preview actor is staff and has no organisation, so one is provisioned on
  // first use. Every other account must already have one.
  const investorOrgId =
    user.investorOrgId ?? (preview ? (await previewOrgFor(user)).id : null);
  if (!investorOrgId) {
    throw BadRequest("User has no associated investor organisation");
  }

  const existing = await Application.findOne({
    where: {
      ownerUserId: actor.id,
      status: { [Op.ne]: ApplicationStatus.WITHDRAWN },
    },
    order: [["createdAt", "DESC"]],
  });
  if (existing) return { application: existing, created: false };

  // A window is needed both to gate the start and to draw the reference number.
  // Real investors need an OPEN, in-range window; a preview actor (ADMIN) may
  // start between calls and falls back to the most recent window of any status.
  const now = new Date();
  const openWindow = await ApplicationWindow.findOne({
    where: { status: ApplicationWindowStatus.OPEN },
    order: [["openAt", "DESC"]],
  });
  const inRange =
    openWindow != null && now >= openWindow.openAt && now <= openWindow.closeAt;
  const window = inRange
    ? openWindow
    : preview
      ? await ApplicationWindow.findOne({ order: [["openAt", "DESC"]] })
      : null;
  if (!window) {
    throw Conflict(
      preview
        ? "No application window exists to draw a reference number from. Create one in the admin console first."
        : "The EOI application window is not currently open. You will be notified when the next Call for Expressions of Interest opens.",
    );
  }

  // The reference is assigned the moment the application is started, drawn
  // atomically from the window's sequence — so every application (draft or not)
  // has a KIP-EOI-YYYY-NNNN reference throughout. (This consumes a sequence
  // number even for drafts that are never submitted.)
  return sequelize.transaction(async (t) => {
    await window.increment("sequenceCounter", { by: 1, transaction: t });
    await window.reload({ transaction: t });
    const reference = formatReference(
      window.openAt.getUTCFullYear(),
      window.sequenceCounter,
    );
    const application = await Application.create(
      {
        lotReference: input.lotReference ?? UNASSIGNED_LOT_REFERENCE,
        reference,
        status: ApplicationStatus.DRAFT_PAYMENT_PENDING,
        ownerUserId: actor.id,
        investorOrgId,
      },
      { transaction: t },
    );
    return { application, created: true };
  });
}

/**
 * The sandbox `InvestorOrg` backing a preview actor's application.
 *
 * Found-or-created by legal name so a preview admin who deletes their test
 * application and starts another lands on the same org rather than accumulating
 * one per attempt. The `[PREVIEW]` prefix is what keeps it legible as a sandbox
 * in the console — see `previewOrgLegalName` in @kip/shared.
 */
async function previewOrgFor(user: User): Promise<InvestorOrg> {
  const legalName = previewOrgLegalName(user.name || user.email);
  const [org] = await InvestorOrg.findOrCreate({
    where: { legalName },
    defaults: {
      legalName,
      countryOfIncorporation: "Uganda",
      email: user.email,
    },
  });
  return org;
}

/** A reason the application is not yet submittable, in investor-facing wording. */
export type SubmissionBlocker = {
  section: EoiSection | null;
  field: string | null;
  message: string;
};

/**
 * Everything standing between this application and SUBMITTED.
 *
 * Deliberately re-validates each stored payload against its section schema
 * rather than trusting `completedAt`. The flag records that a section passed
 * validation *at the time it was saved*; a schema change, an admin raw-JSON
 * edit, or a payload written before the field set was tightened can all leave a
 * section flagged complete but no longer compliant. Spec §0 puts the burden on
 * the portal to guarantee no required field is blank at submission, so the
 * check runs against the data itself.
 *
 * Shared by the dry-run preflight the wizard calls and the submit path, so the
 * review screen can never disagree with what submit enforces.
 */
export async function submissionBlockers(
  applicationId: string,
): Promise<SubmissionBlocker[]> {
  const [sections, documents, plotCount] = await Promise.all([
    ApplicationSection.findAll({ where: { applicationId } }),
    Document.findAll({ where: { applicationId }, attributes: ["kind"] }),
    ApplicationPlot.count({ where: { applicationId } }),
  ]);

  const blockers: SubmissionBlocker[] = [];
  if (plotCount < 1) {
    blockers.push({
      section: EoiSection.LAND_BUSINESS_PROFILE,
      field: null,
      message: "Select at least one plot on the land map (Section 2).",
    });
  }
  const payloads: Partial<Record<EoiSection, unknown>> = {};
  /** N/A notes gathered across sections, keyed by DocumentKind. */
  const documentNaNotes: Record<string, string> = {};

  for (const section of ALL_SECTIONS) {
    const row = sections.find((s) => s.section === section);
    const label = EOI_SECTION_LABELS[section];

    if (!row) {
      blockers.push({
        section,
        field: null,
        message: `${label} has not been started.`,
      });
      continue;
    }

    const parsed = sectionSchemas[section].safeParse(row.payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        blockers.push({
          section,
          field: issue.path.join("."),
          message: `${label}: ${issue.message}`,
        });
      }
      continue;
    }

    payloads[section] = parsed.data;

    const notes = (row.payload as { notApplicable?: Record<string, string> })
      ?.notApplicable;
    if (notes) Object.assign(documentNaNotes, notes);
  }

  // Attachments. The applicant category decides which slots apply, so a payload
  // too broken to tell us the category means the document check cannot run —
  // the section-level blockers above already cover that case.
  const category = (
    payloads[EoiSection.PRELIMINARY_INFO] as
      | { applicantCategory?: ApplicantCategory }
      | undefined
  )?.applicantCategory;

  if (category) {
    const missing = missingRequiredDocuments({
      category,
      uploadedKinds: documents.map((d) => d.kind),
      naNotes: documentNaNotes,
    });
    for (const req of missing) {
      blockers.push({
        section: req.section,
        field: req.kind,
        message: `${EOI_SECTION_LABELS[req.section]}: attach the ${req.label} (spec ${req.clause}).`,
      });
    }
  }

  // Cross-field consistency (spec §8) — only worth running once every section
  // parsed, since it reads fields from two sections at once.
  if (blockers.length === 0) {
    for (const issue of crossSectionIssues(payloads)) {
      blockers.push({
        section: issue.section,
        field: issue.field,
        message: issue.message,
      });
    }
  }

  return blockers;
}

/**
 * SUBMITTED transition. Owns the status machine for this step (the API is the
 * single writer; see CLAUDE.md "Service pattern"):
 *   1. fetch + ownership guard
 *   2. status guard (DRAFT → SUBMITTED, via the shared transition table)
 *   3. completeness guard (every section re-validated + required attachments)
 *   4. window-open guard
 *   5. atomically increment the window sequence and assign KIP-EOI-YYYY-NNNN
 *
 * Reference assignment and the counter bump happen in one transaction, so two
 * concurrent submits can never collide on a number.
 */
export async function submitApplication(
  applicationId: string,
  actor: { id: string; role: string },
): Promise<Application> {
  const app = await Application.findByPk(applicationId);
  if (!app) throw NotFound("Application");

  // Ownership: only the applicant may submit (ADMIN may act on their behalf).
  if (app.ownerUserId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw Forbidden("You can only submit your own application");
  }

  // Status: must be a legal transition into SUBMITTED (i.e. currently DRAFT —
  // which means payment was already confirmed).
  if (!canTransition(app.status as ApplicationStatus, ApplicationStatus.SUBMITTED)) {
    throw Conflict(`Cannot submit an application in status ${app.status}`);
  }

  const blockers = await submissionBlockers(applicationId);
  if (blockers.length > 0) {
    throw BadRequest(
      `This application is not complete. ${blockers.length} item(s) need attention: ${blockers
        .slice(0, 5)
        .map((b) => b.message)
        .join(" ")}${blockers.length > 5 ? " …" : ""}`,
      { blockers },
    );
  }

  // Window: there must be an OPEN window and now must be within its bounds.
  //
  // A preview actor may submit against a window that is closed or out of range,
  // but a window row must still exist — the reference number is drawn from its
  // year and its `sequenceCounter`, and there is nowhere else to get one. Note
  // that this consumes a real number from that window's sequence.
  const preview = canPreviewEoi(actor.role);
  const window =
    (await ApplicationWindow.findOne({
      where: { status: ApplicationWindowStatus.OPEN },
      order: [["openAt", "DESC"]],
    })) ??
    (preview
      ? await ApplicationWindow.findOne({ order: [["openAt", "DESC"]] })
      : null);

  if (!window) {
    throw Conflict(
      preview
        ? "No application window exists to draw a reference number from. Create one in the admin console to test submission."
        : "No open application window",
    );
  }

  const now = new Date();
  if (!preview && (now < window.openAt || now > window.closeAt)) {
    throw Forbidden("The application window is closed");
  }

  return sequelize.transaction(async (t) => {
    // The reference is normally assigned at creation; submission only stamps the
    // status + timestamp. A pre-existing draft with no reference (created before
    // this change) gets one minted here as a fallback.
    let reference = app.reference;
    if (!reference) {
      await window.increment("sequenceCounter", { by: 1, transaction: t });
      await window.reload({ transaction: t });
      reference = formatReference(
        window.openAt.getUTCFullYear(),
        window.sequenceCounter,
      );
    }
    await app.update(
      { status: ApplicationStatus.SUBMITTED, submittedAt: now, reference },
      { transaction: t },
    );
    // TODO(Phase 3): fireWebhook("application-submitted", …) after commit.
    return app;
  });
}


/**
 * Admin stage override — PATCH /applications/:id/status (ADMIN only, enforced at
 * the route). Deliberately separate from the committee endpoints: the TC/LAC/ExCo
 * modules own the normal pipeline, this is the escape hatch when an application
 * is stuck or was moved in error.
 *
 * Guard: an application already sitting in a final committee outcome
 * (ALLOCATED / LAC_REJECTED / NOT_SHORTLISTED) is locked — a decision is never
 * silently undone. Every override writes a ReviewAction so it is auditable.
 */
export async function overrideApplicationStatus(
  applicationId: string,
  actor: { id: string; role: string },
  input: AdminOverrideStatusInput,
): Promise<Application> {
  const app = await Application.findByPk(applicationId);
  if (!app) throw NotFound("Application");

  const current = app.status as ApplicationStatus;
  const target = input.status;

  if (current === target) {
    throw BadRequest(`This application is already at ${target}`);
  }
  if (FINAL_OUTCOME_STATUSES.includes(current)) {
    throw Conflict(
      `This application has a final outcome (${current}) and its stage can no longer be overridden.`,
    );
  }

  return sequelize.transaction(async (t) => {
    let reference = app.reference;
    let submittedAt = app.submittedAt;

    // A submitted-or-later stage assumes a reference number. If the override
    // jumps an application there without one, mint it from the most recent
    // window, mirroring submitApplication() (this consumes a sequence number).
    if (!reference && REFERENCED_STATUSES.includes(target)) {
      const window = await ApplicationWindow.findOne({
        order: [["openAt", "DESC"]],
        transaction: t,
      });
      if (!window) {
        throw Conflict(
          "No application window exists to draw a reference number from. Create one in the admin console first.",
        );
      }
      await window.increment("sequenceCounter", { by: 1, transaction: t });
      await window.reload({ transaction: t });
      reference = formatReference(
        window.openAt.getUTCFullYear(),
        window.sequenceCounter,
      );
      if (!submittedAt) submittedAt = new Date();
    }

    await app.update(
      { status: target, reference, submittedAt },
      { transaction: t },
    );
    await ReviewAction.create(
      {
        applicationId: app.id,
        actorUserId: actor.id,
        type: ReviewActionType.ADMIN_STATUS_OVERRIDE,
        fromStatus: current,
        toStatus: target,
        notes: input.notes ?? null,
      },
      { transaction: t },
    );
    return app;
  });
}


/**
 * Replace the joint-venture partner list on an application (owner or ADMIN,
 * only while the application is still editable). Reconciles by id so a partner
 * that keeps its id keeps its documents (Document.partnerId); a removed partner
 * is deleted and its documents' partnerId is SET NULL by the FK. Exactly one
 * partner is marked lead — an explicit flag if given, otherwise the first.
 */
export async function savePartners(
  applicationId: string,
  actor: { id: string; role: string },
  input: SavePartnersInput,
): Promise<ApplicationPartner[]> {
  const app = await Application.findByPk(applicationId, {
    attributes: ["id", "ownerUserId", "status"],
  });
  if (!app) throw NotFound("Application");
  if (app.ownerUserId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw Forbidden("You can only edit your own application");
  }
  const editable: string[] = [
    ApplicationStatus.DRAFT_PAYMENT_PENDING,
    ApplicationStatus.DRAFT,
    ApplicationStatus.TC_CLARIFICATION_REQUESTED,
  ];
  if (!editable.includes(app.status) && actor.role !== UserRole.ADMIN) {
    throw Conflict(`This application can no longer be edited (status ${app.status})`);
  }

  const partners = input.partners;
  // Only an explicitly flagged partner is the lead; the co-venturer list may
  // have none (the primary applicant company lives on the application itself).
  const leadIndex = partners.findIndex((p) => p.isLead);

  return sequelize.transaction(async (t) => {
    const existing = await ApplicationPartner.findAll({
      where: { applicationId },
      transaction: t,
    });
    const incomingIds = new Set(
      partners.filter((p) => p.id).map((p) => p.id as string),
    );

    for (const row of existing) {
      if (!incomingIds.has(row.id)) await row.destroy({ transaction: t });
    }

    const existingById = new Map(existing.map((r) => [r.id, r]));
    const saved: ApplicationPartner[] = [];
    for (let i = 0; i < partners.length; i++) {
      const p = partners[i]!;
      const fields = {
        legalName: p.legalName,
        tradingName: p.tradingName ?? null,
        registrationNumber: p.registrationNumber ?? null,
        ursbRegistrationNumber: p.ursbRegistrationNumber ?? null,
        companyType: p.companyType ?? null,
        businessSector: p.businessSector ?? null,
        countryOfIncorporation: p.countryOfIncorporation ?? null,
        tin: p.tin ?? null,
        address: p.address ?? null,
        phone: p.phone ?? null,
        email: p.email ?? null,
        isLead: i === leadIndex,
        position: i,
      };
      const current = p.id ? existingById.get(p.id) : undefined;
      saved.push(
        current
          ? await current.update(fields, { transaction: t })
          : await ApplicationPartner.create(
              { applicationId, ...fields },
              { transaction: t },
            ),
      );
    }
    return saved;
  });
}


/**
 * Set the full set of plots an application is for (owner or ADMIN, only while
 * editable). Replace-all: the ApplicationPlot join is rebuilt to match plotIds.
 * The first plot is mirrored into plotId and the plot names into lotReference so
 * existing single-plot displays keep working.
 */
export async function setApplicationPlots(
  applicationId: string,
  actor: { id: string; role: string },
  input: SetApplicationPlotsInput,
): Promise<Application> {
  const app = await Application.findByPk(applicationId, {
    attributes: ["id", "ownerUserId", "status", "lotReference", "plotId"],
  });
  if (!app) throw NotFound("Application");
  if (app.ownerUserId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw Forbidden("You can only edit your own application");
  }
  const editable: string[] = [
    ApplicationStatus.DRAFT_PAYMENT_PENDING,
    ApplicationStatus.DRAFT,
    ApplicationStatus.TC_CLARIFICATION_REQUESTED,
  ];
  if (!editable.includes(app.status) && actor.role !== UserRole.ADMIN) {
    throw Conflict(`This application can no longer be edited (status ${app.status})`);
  }

  const plotIds = Array.from(new Set(input.plotIds));
  const plots = plotIds.length
    ? await Plot.findAll({ where: { id: plotIds }, attributes: ["id", "plotName"] })
    : [];
  if (plots.length !== plotIds.length) throw BadRequest("One or more plots are unknown");

  // Keep the incoming order for display (find returns arbitrary order).
  const byId = new Map(plots.map((p) => [p.id, p]));
  const ordered = plotIds.map((id) => byId.get(id)!);

  return sequelize.transaction(async (t) => {
    await ApplicationPlot.destroy({ where: { applicationId: app.id }, transaction: t });
    if (ordered.length) {
      await ApplicationPlot.bulkCreate(
        ordered.map((p) => ({ applicationId: app.id, plotId: p.id })),
        { transaction: t },
      );
    }
    const names = ordered.map((p) => p.plotName).join(", ");
    await app.update(
      {
        plotId: ordered[0]?.id ?? null,
        lotReference: names.slice(0, 250) || UNASSIGNED_LOT_REFERENCE,
      },
      { transaction: t },
    );
    return app;
  });
}
