import { ApplicationWindow } from "@kip/db";
import {
  ApplicationWindowStatus,
  applicationEditGate,
  type ApplicationEditGate,
} from "@kip/shared";
import { Conflict } from "../../errors.js";

/**
 * The API's half of the shared edit gate (see `applicationEditGate` in
 * @kip/shared, and CLAUDE.md "Editing after submission").
 *
 * Lives in its own module rather than inside `applications.service.ts` so the
 * documents module can front its own writes with the identical rule without
 * importing the whole application service — an investor who can amend a section
 * must be able to re-attach the certificate that section refers to, and an
 * investor who cannot must not be able to delete one.
 */

/** The window the gate judges against: the most recent OPEN one, or null. */
export async function currentWindow() {
  return ApplicationWindow.findOne({
    where: { status: ApplicationWindowStatus.OPEN },
    order: [["openAt", "DESC"]],
    attributes: ["status", "openAt", "closeAt"],
  });
}

/** Resolve the gate for an application, reading the live window. */
export async function editGateFor(
  app: { status: string },
  actor: { role: string },
  now: Date = new Date(),
): Promise<ApplicationEditGate> {
  return applicationEditGate({
    status: app.status,
    role: actor.role,
    window: await currentWindow(),
    now,
  });
}

/**
 * Throw unless this actor may write to this application right now. The 409
 * carries the gate's own wording, so the message the API refuses with is the
 * same sentence the portal shows in its read-only banner.
 */
export async function assertApplicationEditable(
  app: { status: string },
  actor: { role: string },
): Promise<ApplicationEditGate> {
  const gate = await editGateFor(app, actor);
  if (!gate.editable) throw Conflict(gate.message);
  return gate;
}
