import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getInvestorDashboardData } from "@/lib/investor-data";
import { BankTransferForm } from "./bank-transfer-form";

function getBankDetails() {
  return [
    { label: "Bank",         value: process.env.STANBIC_BANK_NAME        ?? "Stanbic Bank Uganda Ltd" },
    { label: "Account Name", value: process.env.STANBIC_ACCOUNT_NAME     ?? "Uganda National Oil Company Ltd" },
    { label: "Account No.",  value: process.env.STANBIC_ACCOUNT_NUMBER   ?? "9030011896005" },
    { label: "Currency",     value: "USD" },
    { label: "Swift / BIC",  value: process.env.STANBIC_SWIFT            ?? "SBICUGKX" },
  ];
}

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

  const paymentRef = `KIP-APP-${app.id.slice(0, 8).toUpperCase()}`;
  const bankDetails = getBankDetails();

  return (
    <BankTransferForm
      applicationId={app.id}
      paymentRef={paymentRef}
      bankDetails={[...bankDetails, { label: "Payment Reference", value: paymentRef }]}
    />
  );
}
