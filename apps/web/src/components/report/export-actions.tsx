"use client";

import { useState } from "react";
import { Check, ClipboardCopy, Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildCsv, datestampedFilename } from "@/lib/report-export";

/**
 * Generic export/share control for every report tab. All actions run entirely
 * in the browser (no API call), so they work on the read-only demo:
 *   • CSV     — Blob download of `rows` serialised through the `columns` spec
 *   • PDF     — window.print() against the page's print stylesheet
 *   • Summary — plain-text digest (built server-side) copied to the clipboard
 * Omit `csv` for reports without a detail table (e.g. the Overview).
 */
export function ReportExportActions({
  filenamePrefix,
  summary,
  csv,
}: {
  filenamePrefix: string;
  summary: string;
  csv?: { columns: { header: string; key: string }[]; rows: Record<string, unknown>[] };
}) {
  const [copied, setCopied] = useState(false);

  const downloadCsv = () => {
    if (!csv) return;
    // Prepend a BOM so Excel opens UTF-8 (accented names, — dashes) correctly.
    const blob = new Blob(["﻿" + buildCsv(csv.columns, csv.rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = datestampedFilename(filenamePrefix, new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — no-op; the CSV
      // and print paths remain available.
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 print:hidden">
          {copied ? <Check size={14} className="text-green-600" /> : <FileText size={14} />}
          {copied ? "Copied" : "Export / Share"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export this report</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {csv ? (
          <DropdownMenuItem onClick={downloadCsv}>
            <Download size={14} />
            Download CSV
            <span className="ml-auto text-[10px] text-ink-400">{csv.rows.length} rows</span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer size={14} />
          Print / Save as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copySummary}>
          <ClipboardCopy size={14} />
          Copy summary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
