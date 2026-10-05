"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import type { LacQueueRow, LacQueueStage } from "@/lib/admin/committee-mappers";
import { cn } from "@/lib/utils";

type Row = LacQueueRow & Record<string, unknown>;

const STAGE_TONE: Record<LacQueueStage, string> = {
  "To review": "bg-purple-100 text-purple-700",
  "Awaiting investor": "bg-amber-100 text-amber-700",
  Decided: "bg-ink-100 text-ink-600",
};

const COLUMNS: DataTableColumn<Row>[] = [
  {
    key: "ref",
    header: "Reference",
    render: (row) => (
      <Link href={`/console/lac/${encodeURIComponent(row.ref)}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">
        {row.ref}
      </Link>
    ),
  },
  { key: "company", header: "Company", render: (row) => <span className="font-medium">{row.company}</span> },
  { key: "plots", header: "Plots", hideBelow: "lg", render: (row) => <span className="text-ink-600">{row.plots}</span> },
  { key: "acres", header: "Acres", hideBelow: "md", render: (row) => <span className="tabular-nums text-ink-600">{row.acres}</span> },
  {
    key: "outcome",
    header: "Status",
    render: (row) => (
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STAGE_TONE[row.stage])}>{row.outcome}</span>
    ),
  },
  { key: "tally", header: "Recommendations", hideBelow: "md", render: (row) => <span className="text-xs text-ink-600">{row.tally}</span> },
  {
    key: "myRecommendation",
    header: "Your review",
    render: (row) =>
      row.myRecommendation ? (
        <span className="text-xs font-semibold text-ink-700">{row.myRecommendation}</span>
      ) : row.stage === "To review" ? (
        <span className="text-xs font-semibold text-amber-700">Not yet</span>
      ) : (
        <span className="text-xs text-ink-400">—</span>
      ),
  },
  {
    key: "days",
    header: "In LAC",
    hideBelow: "sm",
    render: (row) => <span className="tabular-nums text-xs text-ink-500">{row.enteredAt === "—" ? "—" : `${row.days}d · since ${row.enteredAt}`}</span>,
  },
];

const TABS: (LacQueueStage | "All")[] = ["To review", "Awaiting investor", "Decided", "All"];

export function LacQueueTable({ rows }: { rows: LacQueueRow[] }) {
  const [tab, setTab] = useState<LacQueueStage | "All">("To review");
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const r of rows) c[r.stage] = (c[r.stage] ?? 0) + 1;
    return c;
  }, [rows]);
  const data = useMemo(
    () => (tab === "All" ? rows : rows.filter((r) => r.stage === tab)) as Row[],
    [rows, tab],
  );

  return (
    <DataTable
      columns={COLUMNS}
      data={data}
      rowKey="id"
      searchPlaceholder="Search reference, company or plot…"
      searchKeys={["ref", "company", "plots"]}
      filterSlot={
        <div className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === t ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200",
              )}
            >
              {t} <span className="tabular-nums opacity-70">{counts[t] ?? 0}</span>
            </button>
          ))}
        </div>
      }
      emptyState={<p className="py-8 text-center text-sm text-ink-500">No applications here.</p>}
    />
  );
}
