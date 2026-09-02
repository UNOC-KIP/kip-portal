"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Creates the investor's `Application` row and drops them into the EOI journey.
 *
 * This is an entry point into the EOI. Each click creates a NEW application —
 * investors may run several at once — and drops the user straight into that
 * application's wizard at section 1. The button disables while the request is
 * in flight so a double-click can't create two.
 *
 * The new application starts at DRAFT_PAYMENT_PENDING, so the dashboard's
 * three-step journey takes over and asks for the fee first — the spec gates
 * Sections 1–6 behind it.
 */
export function StartEoiButton({
  label = "Start my EOI application",
  variant,
}: {
  label?: string;
  variant?: "default" | "outline" | "secondary";
} = {}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          body?.error?.message ?? "Could not start your application. Please try again.",
        );
      }
      const application = (await res.json().catch(() => ({}))) as { id?: string };
      if (application?.id) {
        router.push(`/dashboard/eoi/${application.id}/1`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div>
      <Button
        onClick={handleStart}
        disabled={busy}
        variant={variant}
        className="w-full sm:w-auto"
      >
        {busy ? (
          <>
            <Loader2 size={15} className="mr-2 animate-spin" />
            Starting…
          </>
        ) : (
          <>
            {label}
            <ArrowRight size={15} className="ml-2" />
          </>
        )}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
