import { listInvestors } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  await requireRole(ADMIN_ONLY);
  const investors = await listInvestors();
  return <UsersClient investors={investors} />;
}
