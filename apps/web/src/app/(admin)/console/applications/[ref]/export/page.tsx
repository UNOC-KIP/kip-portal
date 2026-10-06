import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { ApplicationExport } from "../../application-export";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { ref: string } }): Promise<Metadata> {
  // The browser suggests the <title> as the PDF filename.
  return { title: `EOI ${decodeURIComponent(params.ref)}` };
}

// One applicant's EOI as a print-ready dossier — see ApplicationExport.
export default async function AdminApplicationExportPage({ params }: { params: { ref: string } }) {
  await requireRole(ADMIN_ONLY);
  const ref = decodeURIComponent(params.ref);
  const app = await getAdminApplicationDetail(ref);
  if (!app) notFound();
  return <ApplicationExport app={app} backHref={`/console/applications/${encodeURIComponent(ref)}`} />;
}
