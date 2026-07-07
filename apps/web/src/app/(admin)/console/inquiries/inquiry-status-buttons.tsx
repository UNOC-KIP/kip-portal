"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

type Status = "NEW" | "RESPONDED" | "CLOSED";

export function InquiryStatusButtons({ inquiryId, rawStatus }: { inquiryId: string; rawStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: Status) {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Failed to update inquiry");
      }
      router.refresh();
      setLoading(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rawStatus === "NEW" && (
        <Button
          size="sm"
          onClick={() => setStatus("RESPONDED")}
          disabled={loading !== null}
          className="h-7 bg-green-600 text-xs text-white hover:bg-green-700"
        >
          {loading === "RESPONDED" ? "Saving…" : "Mark Responded"}
        </Button>
      )}
      {rawStatus !== "CLOSED" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus("CLOSED")}
          disabled={loading !== null}
          className="h-7 text-xs text-ink-500"
        >
          {loading === "CLOSED" ? "Saving…" : "Close"}
        </Button>
      )}
      {rawStatus !== "NEW" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setStatus("NEW")}
          disabled={loading !== null}
          className="h-7 text-xs text-ink-400 hover:text-ink-900"
        >
          {loading === "NEW" ? "Saving…" : "Reopen"}
        </Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
