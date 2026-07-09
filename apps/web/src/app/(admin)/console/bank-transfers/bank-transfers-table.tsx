"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PaymentStatus } from "@kip/shared";
import { apiUrl } from "@/lib/api";
import type { TransferRow } from "@/lib/admin/mappers";

const SLA_CLASSES: Record<TransferRow["slaUrgency"], string> = {
  ok:      "text-ink-500",
  warn:    "text-amber-600 font-semibold",
  due:     "text-red-600 font-semibold",
  overdue: "text-red-700 font-bold",
};

export function BankTransfersTable({ data }: { data: TransferRow[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleConfirm(paymentId: string) {
    setConfirming((prev) => new Set(prev).add(paymentId));
    setErrors((prev) => { const next = { ...prev }; delete next[paymentId]; return next; });

    try {
      const res = await fetch(apiUrl(`/payments/${paymentId}/confirm`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = (body as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`;
        setErrors((prev) => ({ ...prev, [paymentId]: message }));
        return;
      }
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, [paymentId]: "Network error — please try again" }));
    } finally {
      setConfirming((prev) => { const next = new Set(prev); next.delete(paymentId); return next; });
    }
  }

  async function handleReject(paymentId: string) {
    setRejecting((prev) => new Set(prev).add(paymentId));
    setErrors((prev) => { const next = { ...prev }; delete next[paymentId]; return next; });

    try {
      const res = await fetch(apiUrl(`/payments/${paymentId}/reject`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = (body as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`;
        setErrors((prev) => ({ ...prev, [paymentId]: message }));
        return;
      }
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, [paymentId]: "Network error — please try again" }));
    } finally {
      setRejecting((prev) => { const next = new Set(prev); next.delete(paymentId); return next; });
    }
  }

  async function handleView(paymentId: string) {
    setViewing((prev) => new Set(prev).add(paymentId));
    setErrors((prev) => { const next = { ...prev }; delete next[paymentId]; return next; });

    try {
      const res = await fetch(apiUrl(`/payments/${paymentId}/proof`), {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = (body as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`;
        setErrors((prev) => ({ ...prev, [paymentId]: message }));
        return;
      }
      const { url } = await res.json() as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setErrors((prev) => ({ ...prev, [paymentId]: "Network error — please try again" }));
    } finally {
      setViewing((prev) => { const next = new Set(prev); next.delete(paymentId); return next; });
    }
  }

  const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
    {
      key: "ref",
      header: "Application",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-brand-600">
          {String(row.ref)}
        </span>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (row) => <span>{String(row.company)}</span>,
    },
    {
      key: "txRef",
      header: "Tx Reference",
      hideBelow: "md",
      render: (row) => (
        <span className="font-mono text-xs text-ink-500">{String(row.txRef)}</span>
      ),
    },
    {
      key: "date",
      header: "Date Uploaded",
      hideBelow: "md",
      render: (row) => (
        <span className="text-ink-500">{String(row.date)}</span>
      ),
    },
    {
      key: "sla",
      header: "SLA",
      render: (row) => (
        <span
          className={cn(
            "text-xs",
            SLA_CLASSES[(row.slaUrgency as TransferRow["slaUrgency"]) ?? "ok"],
          )}
        >
          {String(row.sla)}
        </span>
      ),
    },
    {
      key: "proof",
      header: "Proof",
      render: (row) => {
        const paymentId = String(row.paymentId);
        const paymentStatus = String(row.paymentStatus);
        const hasProof = paymentStatus === PaymentStatus.PROOF_UPLOADED || paymentStatus === PaymentStatus.CONFIRMED || paymentStatus === PaymentStatus.FAILED;
        const isViewLoading = viewing.has(paymentId);
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-green-200 bg-green-50 text-xs text-green-700 hover:bg-green-100"
            disabled={!hasProof || isViewLoading}
            title={hasProof ? "Download payment proof" : "No proof uploaded yet"}
            onClick={() => handleView(paymentId)}
          >
            {isViewLoading ? "Loading…" : "View"}
          </Button>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const paymentId = String(row.paymentId);
        const paymentStatus = String(row.paymentStatus);
        const isConfirming = confirming.has(paymentId);
        const isRejecting = rejecting.has(paymentId);
        const isBusy = isConfirming || isRejecting;
        const canActOnProof = paymentStatus === PaymentStatus.PROOF_UPLOADED;
        const errorMsg = errors[paymentId];
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 bg-green-500 text-xs hover:bg-green-600"
                disabled={!canActOnProof || isBusy}
                title={
                  !canActOnProof
                    ? "Proof has not been uploaded yet"
                    : isConfirming
                    ? "Confirming…"
                    : "Confirm this bank transfer"
                }
                onClick={() => handleConfirm(paymentId)}
              >
                {isConfirming ? "Confirming…" : "Confirm"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                disabled={!canActOnProof || isBusy}
                title={
                  !canActOnProof
                    ? "Proof has not been uploaded yet"
                    : isRejecting
                    ? "Rejecting…"
                    : "Reject this bank transfer proof"
                }
                onClick={() => handleReject(paymentId)}
              >
                {isRejecting ? "Rejecting…" : "Reject"}
              </Button>
            </div>
            {errorMsg && (
              <span className="text-xs text-red-600">{errorMsg}</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="ref"
      searchPlaceholder="Search company or reference…"
      searchKeys={["ref", "company", "txRef"] as never[]}
      exportLabel="Export"
    />
  );
}
