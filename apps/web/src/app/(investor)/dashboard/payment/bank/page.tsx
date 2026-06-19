import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getInvestorDashboardData } from "@/lib/investor-data";
import { BankTransferForm } from "./bank-transfer-form";

// Bank account details — update via UNOC Finance when account changes.
// These are intentionally server-side: they are injected at render time
// so they never need to be committed to env or leaked to the client bundle.
const BANK_DETAILS = [
  { label: "Bank",         value: "Stanbic Bank Uganda Ltd" },
  { label: "Account Name", value: "Uganda National Oil Company Ltd" },
  { label: "Account No.",  value: "9030011896005" },
  { label: "Currency",     value: "USD" },
  { label: "Swift / BIC",  value: "SBICUGKX" },
] as const;

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

  return (
    <BankTransferForm
      applicationId={app.id}
      paymentRef={paymentRef}
      bankDetails={[...BANK_DETAILS, { label: "Payment Reference", value: paymentRef }]}
    />
  );
}
