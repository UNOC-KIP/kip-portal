import { listWindows } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { WindowsClient } from "./windows-client";

export default async function WindowsPage() {
  await requireRole(ADMIN_ONLY);
  const windows = await listWindows();
  return <WindowsClient windows={windows} />;
}
