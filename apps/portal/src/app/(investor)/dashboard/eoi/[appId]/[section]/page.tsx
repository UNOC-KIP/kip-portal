import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getEoiWizardData } from "@/lib/eoi-data";
import { EOI_SECTION_ORDER } from "@kip/shared";
import { EoiWizard } from "../../eoi-wizard";

/**
 * EOI wizard shell. One read of the data layer, then the client owns the form.
 *
 * `currentYear` is resolved here rather than in the browser so the seeded
 * reporting-year rows are identical across hydration.
 */
export default async function EoiSectionPage({
  params,
}: {
  params: { appId: string; section: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const parsed = Number.parseInt(params.section, 10);
  const step = Number.isNaN(parsed)
    ? 1
    : Math.min(Math.max(parsed, 1), EOI_SECTION_ORDER.length);

  const userId = (session.user as { id: string }).id;
  const data = await getEoiWizardData(userId, params.appId);

  // The dashboard owns creating an application and the payment gate, so there
  // is nothing sensible to render here without one.
  if (!data) redirect("/dashboard");

  return (
    <EoiWizard data={data} step={step} currentYear={new Date().getUTCFullYear()} />
  );
}
