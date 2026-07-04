import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PaymentPendingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
              🏦
            </div>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-ink-900">
            Proof submitted — awaiting confirmation
          </h1>
          <p className="mb-6 text-sm text-ink-500">
            Your payment proof has been received and is now under review by the UNOC Finance
            team. Confirmation typically takes up to <strong>2 business days</strong>. You will
            receive an email notification once your payment is confirmed.
          </p>

          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-sm text-amber-900">
            <p className="font-semibold">What happens next?</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>UNOC Finance verifies your bank transfer against the reference you provided.</li>
              <li>Your application status moves from <em>Awaiting Payment</em> to <em>Draft</em>.</li>
              <li>You can then complete and submit your Expression of Interest form.</li>
            </ol>
          </div>

          <Button asChild className="w-full py-6">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
