import { getSiteVisitsView } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { SiteVisitsClient } from "./site-visits-client";

export default async function SiteVisitsPage() {
  await requireRole(ADMIN_ONLY);
  const view = await getSiteVisitsView();
  return <SiteVisitsClient view={view} />;
}
