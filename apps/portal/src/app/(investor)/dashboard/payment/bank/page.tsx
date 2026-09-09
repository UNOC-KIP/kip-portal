import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getInvestorDashboardData } from "@/lib/investor-data";
import { FeeActions } from "../../fee-actions";

export default async function BankTransferPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  // Pay for the application named in the query (owner-scoped in the data
  // layer); with none, the most recent one.
  const data = await getInvestorDashboardData(userId, searchParams.app);
  const app = data.application;
  if (!app) redirect("/dashboard");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
      <Link
        href="/dashboard/applications"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft size={15} /> All applications
      </Link>
      <h1 className="mt-2 text-xl font-bold">
        Application fee{app.reference ? ` · ${app.reference}` : ""}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Generate your invoice, download it, pay by bank transfer using the
        details on the invoice, then upload your receipt.
      </p>
      <div className="mt-5">
        <FeeActions applicationId={app.id} />
      </div>
    </main>
  );
}
