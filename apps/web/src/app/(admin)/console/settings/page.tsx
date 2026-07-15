import { listStaffUsers, listTimelineMilestones } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireRole(ADMIN_ONLY);
  const [staff, milestones] = await Promise.all([listStaffUsers(), listTimelineMilestones()]);
  return <SettingsClient staff={staff} milestones={milestones} />;
}
