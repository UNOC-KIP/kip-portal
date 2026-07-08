import { ApplicationWindow } from "@kip/db";
import { ApplicationWindowStatus } from "@kip/shared";
import { BadRequest, Conflict, NotFound } from "../../errors.js";

export async function createWindow(input: {
  name: string;
  openAt: Date;
  closeAt: Date;
}) {
  const existing = await ApplicationWindow.findOne({
    where: { status: ApplicationWindowStatus.OPEN },
  });
  if (existing) throw Conflict("An application window is already open");

  return ApplicationWindow.create({
    name: input.name,
    openAt: input.openAt,
    closeAt: input.closeAt,
    status: ApplicationWindowStatus.DRAFT,
  });
}

export async function updateWindow(
  id: string,
  input: { name?: string; closeAt?: Date },
) {
  const win = await ApplicationWindow.findByPk(id);
  if (!win) throw NotFound("Application window");

  if (win.status === ApplicationWindowStatus.ARCHIVED) {
    throw BadRequest("Cannot edit an archived window");
  }

  if (input.closeAt) {
    if (input.closeAt <= new Date(win.openAt)) {
      throw BadRequest("Close date must be after open date");
    }
  }

  await win.update({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.closeAt !== undefined ? { closeAt: input.closeAt } : {}),
  });
  return win;
}

/** Admin soft delete. An OPEN window must be closed first — it gates live submissions. */
export async function deleteWindow(id: string): Promise<void> {
  const win = await ApplicationWindow.findByPk(id);
  if (!win) throw NotFound("Application window");

  if (win.status === ApplicationWindowStatus.OPEN) {
    throw Conflict("Close the window before deleting it");
  }

  await win.destroy();
}

const STATUS_TRANSITIONS: Record<string, string> = {
  OPEN: ApplicationWindowStatus.DRAFT,
  CLOSED: ApplicationWindowStatus.OPEN,
  ARCHIVED: ApplicationWindowStatus.CLOSED,
};

export async function transitionWindowStatus(id: string, targetStatus: string) {
  const win = await ApplicationWindow.findByPk(id);
  if (!win) throw NotFound("Application window");

  const requiredCurrent = STATUS_TRANSITIONS[targetStatus];
  if (!requiredCurrent || win.status !== requiredCurrent) {
    throw Conflict(
      `Cannot transition window from ${win.status} to ${targetStatus}`,
    );
  }

  if (targetStatus === ApplicationWindowStatus.OPEN) {
    const alreadyOpen = await ApplicationWindow.findOne({
      where: { status: ApplicationWindowStatus.OPEN },
    });
    if (alreadyOpen && alreadyOpen.id !== id) {
      throw Conflict("Another window is already open");
    }
  }

  await win.update({ status: targetStatus });
  return win;
}
