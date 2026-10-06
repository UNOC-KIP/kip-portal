import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { TC_ROLES } from "@/lib/rbac";
import { ApplicationExport } from "../../../applications/application-export";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { ref: string } }): Promise<Metadata> {
  // The browser suggests the <title> as the PDF filename.
  return { title: `EOI ${decodeURIComponent(params.ref)}` };
}

// Same access as the TC review page: TC_ROLES, also enforced by the tc/ layout guard.
export default async function TcApplicationExportPage({ params }: { params: { ref: string } }) {
  await requireRole(TC_ROLES);
  const ref = decodeURIComponent(params.ref);
  const app = await getAdminApplicationDetail(ref);
  if (!app) notFound();
  return <ApplicationExport app={app} backHref={`/console/tc/${encodeURIComponent(ref)}`} />;
}
