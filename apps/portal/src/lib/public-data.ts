import "server-only";
import { ApplicationWindow } from "@kip/db";

export type ActiveWindow = {
  name: string;
  openAt: string;
  closeAt: string;
} | null;

export async function getActiveApplicationWindow(): Promise<ActiveWindow> {
  try {
    const win = await ApplicationWindow.findOne({
      where: { status: "OPEN" },
      attributes: ["name", "openAt", "closeAt"],
    });
    // An OPEN window whose close date has passed is no longer accepting
    // submissions — treat it as inactive so the home page shows the next round.
    if (!win || win.closeAt.getTime() <= Date.now()) return null;
    return {
      name: win.name,
      openAt: win.openAt.toISOString(),
      closeAt: win.closeAt.toISOString(),
    };
  } catch {
    return null;
  }
}
