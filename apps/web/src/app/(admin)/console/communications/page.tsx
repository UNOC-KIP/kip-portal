import { getCommunicationsView } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { CommunicationsClient } from "./communications-client";

export default async function CommunicationsPage() {
  await requireRole(ADMIN_ONLY);
  const view = await getCommunicationsView();
  return <CommunicationsClient view={view} />;
}
