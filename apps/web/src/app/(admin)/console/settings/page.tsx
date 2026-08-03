import {
  getEoiCallReadiness,
  listStaffUsers,
  listTimelineMilestones,
} from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireRole(ADMIN_ONLY);
  const [staff, milestones] = await Promise.all([listStaffUsers(), listTimelineMilestones()]);
  // Depends on the computed milestone statuses, so it runs after the pair above.
  const eoiCall = await getEoiCallReadiness(milestones);
  return <SettingsClient staff={staff} milestones={milestones} eoiCall={eoiCall} />;
}
