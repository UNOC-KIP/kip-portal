/**
 * When an investor may still edit an EOI application — the single definition.
 *
 * Submission used to be the lock: the moment an application left DRAFT it was
 * read-only to its author, even if the Call for Expressions of Interest still
 * had two weeks to run. That is stricter than the call itself, and it turned
 * every typo into a Request for Clarification. The rule is now the one
 * investors are actually told: **you can change your application until the
 * application window closes.**
 *
 * Three consumers read this one function, which is the point — the fields the
 * portal lets an investor type into and the writes the API accepts cannot
 * drift:
 *
 *  - the EOI wizard (`getEoiWizardData` → `EoiWizardData.edit`), which decides
 *    read-only mode, the banner, and whether the row offers "Edit" or "View";
 *  - the API's write guards (`assertApplicationEditable`) fronting section
 *    saves, partner saves and document add/remove;
 *  - the applications list, for the action on each row.
 *
 * Pure, `now` injected, unit-tested in
 * `apps/portal/src/lib/application-edit.test.ts`.
 */
import {
  ApplicationStatus,
  ApplicationWindowStatus,
  UserRole,
} from "./enums";
import { longDate } from "./timeline";

/**
 * The application window, as much of it as the gate needs. Shaped so a
 * Sequelize row, a view-model and a plain literal all satisfy it.
 *
 * There is deliberately no `windowId` on `Application`: the gate asks whether a
 * window is open *now*, exactly as `submitApplication()` does, rather than
 * which window the application was started in.
 */
export type ApplicationEditWindow = {
  status: string;
  openAt: string | Date;
  closeAt: string | Date;
} | null | undefined;

/**
 * Why editing is (or is not) allowed. The mode drives wording and which
 * controls the wizard shows — an amendment is not a draft and must not offer a
 * "Submit" button for something already submitted.
 */
export type ApplicationEditMode =
  /** Pre-submission. The normal save-and-resume wizard. */
  | "DRAFT"
  /** Submitted, but the window is still open — changes land immediately. */
  | "AMEND"
  /** The TC asked for something; editing is the answer, whatever the schedule. */
  | "CLARIFICATION"
  /** ADMIN, who writes at any stage (console corrections + EOI preview). */
  | "STAFF"
  /** Read-only. */
  | "LOCKED";

export type ApplicationEditGate = {
  editable: boolean;
  mode: ApplicationEditMode;
  /** ISO instant after which edits are refused, when a deadline applies. */
  closesAt: string | null;
  /** Investor-facing wording — also the API's refusal message. */
  message: string;
};

/** Statuses the investor may edit regardless of the schedule. */
const ALWAYS_EDITABLE: readonly string[] = [
  ApplicationStatus.DRAFT_PAYMENT_PENDING,
  ApplicationStatus.DRAFT,
];

/**
 * The window's close instant if it is genuinely open right now, else null.
 *
 * Status `OPEN` alone is not enough — a stale window left OPEN with a past
 * `closeAt` must not reopen a submitted application (see CLAUDE.md, "a stale
 * window left OPEN with a past closeAt").
 */
function openUntil(window: ApplicationEditWindow, now: Date): Date | null {
  if (!window || window.status !== ApplicationWindowStatus.OPEN) return null;
  const openAt = new Date(window.openAt);
  const closeAt = new Date(window.closeAt);
  if (now < openAt || now > closeAt) return null;
  return closeAt;
}

/**
 * May this actor edit this application right now?
 *
 * @param window the most recent OPEN `ApplicationWindow`, or null when none is.
 */
export function applicationEditGate(input: {
  status: string;
  role?: string | null;
  window: ApplicationEditWindow;
  now: Date;
}): ApplicationEditGate {
  const { status, role, window, now } = input;

  // ADMIN keeps write access at every stage: the console's raw-JSON section
  // editor is the correction path when an application is stuck, and the EOI
  // preview drives the real journey between calls.
  if (role === UserRole.ADMIN) {
    return {
      editable: true,
      mode: "STAFF",
      closesAt: null,
      message: "Administrator edit — the window and stage guards do not apply.",
    };
  }

  if (ALWAYS_EDITABLE.includes(status)) {
    const closeAt = openUntil(window, now);
    return {
      editable: true,
      mode: "DRAFT",
      closesAt: closeAt ? closeAt.toISOString() : null,
      message: closeAt
        ? `This application is a draft. It must be submitted by ${longDate(closeAt)}.`
        : "This application is a draft and has not been submitted.",
    };
  }

  // A clarification request is an explicit invitation to edit, so it outranks
  // the schedule — the TC may raise one after the window has closed, and the
  // applicant has to be able to answer it.
  if (status === ApplicationStatus.TC_CLARIFICATION_REQUESTED) {
    return {
      editable: true,
      mode: "CLARIFICATION",
      closesAt: null,
      message:
        "The Technical Committee has requested clarification. Update the items they raised — your answers go straight back to them.",
    };
  }

  // The change this whole module exists for: a submitted application stays the
  // applicant's until the call closes.
  if (status === ApplicationStatus.SUBMITTED) {
    const closeAt = openUntil(window, now);
    if (closeAt) {
      return {
        editable: true,
        mode: "AMEND",
        closesAt: closeAt.toISOString(),
        message: `Your application has been submitted, and you can still change it until the window closes on ${longDate(closeAt)}. Edits are saved straight away — there is nothing to submit again.`,
      };
    }
    return {
      editable: false,
      mode: "LOCKED",
      closesAt: null,
      message:
        "The application window has closed. This application is now with the review committee and can no longer be edited.",
    };
  }

  return {
    editable: false,
    mode: "LOCKED",
    closesAt: null,
    message: `This application is with the review committee and can no longer be edited (status ${status}).`,
  };
}

/**
 * Plot selection is the one thing an amendment may NOT touch.
 *
 * Submitting raises the fee, which is priced per plot (`computeApplicationFee`)
 * and turned into an invoice by finance. Letting an applicant add a plot after
 * that would silently desync an invoice that may already have been sent and
 * paid, so plots stay pre-submission only and a change goes through the
 * secretariat.
 */
export function canEditPlots(gate: ApplicationEditGate): boolean {
  return gate.editable && gate.mode !== "AMEND";
}
