import { redirect } from "next/navigation";

// Bank transfer is the only accepted payment method (per UNOC policy).
// Skip the method selection screen and go straight to the bank transfer flow.
export default function PaymentMethodPage() {
  redirect("/dashboard/payment/bank");
}
