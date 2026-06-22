import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getInvestorDashboardData } from "@/lib/investor-data";
import { BankTransferForm } from "./bank-transfer-form";

// Bank account details — set via STANBIC_* env vars; hardcoded values are
// fallbacks only. Server-only: rendered at request time, never in client bundle.
function getBankDetails() {
  return [
    { label: "Bank",         value: process.env.STANBIC_BANK_NAME        ?? "Stanbic Bank Uganda Ltd" },
    { label: "Account Name", value: process.env.STANBIC_ACCOUNT_NAME     ?? "Uganda National Oil Company Ltd" },
    { label: "Account No.",  value: process.env.STANBIC_ACCOUNT_NUMBER   ?? "9030011896005" },
    { label: "Currency",     value: "USD" },
    { label: "Swift / BIC",  value: process.env.STANBIC_SWIFT            ?? "SBICUGKX" },
  ];
}

export default async function BankTransferPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const data = await getInvestorDashboardData(userId);
  const app = data.application;

  if (!app) redirect("/dashboard");

  // Pre-submission reference for the bank's "payment reference/memo" field.
  // The KIP-EOI-YYYY-NNNN reference is only assigned at submission (after
  // payment is confirmed), so we use the application UUID prefix as the
  // investor-side reference the UNOC Finance team can match against.
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
