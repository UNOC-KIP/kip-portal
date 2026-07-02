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
    if (!win) return null;
    return {
      name: win.name,
      openAt: win.openAt.toISOString(),
      closeAt: win.closeAt.toISOString(),
    };
  } catch {
    return null;
  }
}
