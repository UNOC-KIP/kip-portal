"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function UserActionButtons({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? `Failed to ${action} user`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-ink-200 bg-white p-6">
      <h2 className="mb-4 border-b border-ink-100 pb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
        Actions
      </h2>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="flex gap-3">
        <Button
          onClick={() => handleAction("approve")}
          disabled={loading !== null}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          {loading === "approve" ? "Approving…" : "Approve & Send Credentials"}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          {loading === "reject" ? "Rejecting…" : "Reject Application"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-400">
        Approving will generate login credentials and send them to the investor&apos;s email via n8n.
      </p>
    </div>
  );
}
