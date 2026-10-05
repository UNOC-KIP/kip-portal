import type { ReactNode } from "react";
import { requireRole } from "@/lib/rbac-server";
import { LAC_ROLES } from "@/lib/rbac";

/**
 * Guards the LAC review area (`/console/lac/*`). Only LAC members (and ADMIN)
 * may enter; everyone else is redirected to their own home. Sits inside the
 * (admin) layout, so the sidebar/chrome are already provided.
 */
export default async function LacLayout({ children }: { children: ReactNode }) {
  await requireRole(LAC_ROLES);
  return <>{children}</>;
}
