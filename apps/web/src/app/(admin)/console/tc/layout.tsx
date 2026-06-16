import type { ReactNode } from "react";
import { requireRole } from "@/lib/rbac-server";
import { TC_ROLES } from "@/lib/rbac";

/**
 * Guards the TC review area (`/console/tc/*`). Only TC members/chair (and ADMIN)
 * may enter; everyone else is redirected to their own home. Sits inside the
 * (admin) layout, so the sidebar/chrome are already provided.
 */
export default async function TcLayout({ children }: { children: ReactNode }) {
  await requireRole(TC_ROLES);
  return <>{children}</>;
}
