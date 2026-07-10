"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

type Status = "NEW" | "SCHEDULED" | "COMPLETED" | "CANCELLED";

export function SiteVisitActions({
  bookingId,
  rawStatus,
}: {
  bookingId: string;
  rawStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [visitDate, setVisitDate] = useState("");

  async function setStatus(status: Status, scheduledAt?: string) {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/site-visits/${bookingId}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduledAt ? { status, scheduledAt } : { status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Failed to update booking");
      }
      setScheduling(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  }

  if (scheduling) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="h-7 rounded-md border border-ink-300 px-2 text-xs outline-none focus:border-brand-500"
        />
        <Button
          size="sm"
          disabled={!visitDate || loading !== null}
          // The API takes an ISO datetime; a date input yields YYYY-MM-DD.
          onClick={() => setStatus("SCHEDULED", new Date(`${visitDate}T09:00:00Z`).toISOString())}
          className="h-7 bg-green-600 text-xs text-white hover:bg-green-700"
        >
          {loading === "SCHEDULED" ? "Saving…" : "Confirm date"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setScheduling(false); setError(null); }}
          className="h-7 text-xs text-ink-400 hover:text-ink-900"
        >
          Cancel
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rawStatus === "NEW" && (
        <Button
          size="sm"
          onClick={() => setScheduling(true)}
          disabled={loading !== null}
          className="h-7 bg-green-600 text-xs text-white hover:bg-green-700"
        >
          Schedule visit
        </Button>
      )}
      {rawStatus === "SCHEDULED" && (
        <Button
          size="sm"
          onClick={() => setStatus("COMPLETED")}
          disabled={loading !== null}
          className="h-7 bg-ink-900 text-xs text-white hover:bg-ink-800"
        >
          {loading === "COMPLETED" ? "Saving…" : "Mark completed"}
        </Button>
      )}
      {rawStatus !== "CANCELLED" && rawStatus !== "COMPLETED" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus("CANCELLED")}
          disabled={loading !== null}
          className="h-7 text-xs text-ink-500"
        >
          {loading === "CANCELLED" ? "Saving…" : "Cancel"}
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
