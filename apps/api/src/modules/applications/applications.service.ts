import {
  sequelize,
  Application,
  ApplicationSection,
  ApplicationWindow,
  Payment,
} from "@kip/db";
import {
  ApplicationStatus,
  ApplicationWindowStatus,
  EoiSection,
  UserRole,
  canTransition,
  formatReference,
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
 * SUBMITTED transition. Owns the status machine for this step (the API is the
 * single writer; see CLAUDE.md "Service pattern"):
 *   1. fetch + ownership guard
 *   2. status guard (DRAFT → SUBMITTED, via the shared transition table)
 *   3. completeness guard (all 6 sections) + window-open guard
 *   4. atomically increment the window sequence and assign KIP-EOI-YYYY-NNNN
 *
 * Reference assignment and the counter bump happen in one transaction, so two
 * concurrent submits can never collide on a number.
 */
export async function submitApplication(
  applicationId: string,
  actor: { id: string; role: string },
): Promise<Application> {
  const app = await Application.findByPk(applicationId, {
    include: [
      { model: ApplicationSection, as: "sections", attributes: ["section", "completedAt"] },
    ],
  });
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

  // Completeness: every section present and completed.
  const sections =
    (app as Application & { sections?: ApplicationSection[] }).sections ?? [];
  const completed = new Set(
    sections.filter((s) => s.completedAt != null).map((s) => s.section),
  );
  const missing = ALL_SECTIONS.filter((s) => !completed.has(s));
  if (missing.length > 0) {
    throw BadRequest(
      `All sections must be completed before submitting. Missing: ${missing.join(", ")}`,
    );
  }

  // Window: there must be an OPEN window and now must be within its bounds.
  const window = await ApplicationWindow.findOne({
    where: { status: ApplicationWindowStatus.OPEN },
    order: [["openAt", "DESC"]],
  });
  if (!window) throw Conflict("No open application window");
  const now = new Date();
  if (now < window.openAt || now > window.closeAt) {
    throw Forbidden("The application window is closed");
  }

  return sequelize.transaction(async (t) => {
    // Atomic counter bump (row-locked UPDATE), then read the value back.
    await window.increment("sequenceCounter", { by: 1, transaction: t });
    await window.reload({ transaction: t });
    const reference = formatReference(
      window.openAt.getUTCFullYear(),
      window.sequenceCounter,
    );
    await app.update(
      { status: ApplicationStatus.SUBMITTED, submittedAt: now, reference },
      { transaction: t },
    );
    // TODO(Phase 3): fireWebhook("application-submitted", …) after commit.
    return app;
  });
}
