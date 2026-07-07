import { getInquiriesView } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { InquiriesClient } from "./inquiries-client";

export default async function InquiriesPage() {
  await requireRole(ADMIN_ONLY);
  const view = await getInquiriesView();
  return <InquiriesClient view={view} />;
}
