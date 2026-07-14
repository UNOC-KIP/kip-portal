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
import type { ReportData } from "@/lib/admin/mappers";
import {
  buildInvestorCsv,
  buildOnboardingSummary,
  reportFilename,
} from "@/lib/report-export";

/**
 * Export/share control for the investor-onboarding report. All three actions
 * run entirely in the browser (no API call), so they work even on the read-only
 * demo where the Express API isn't deployed:
 *   • CSV     — Blob download of the per-investor table
 *   • PDF     — window.print() against the page's print stylesheet
 *   • Summary — plain-text digest copied to the clipboard
 */
export function ReportExportActions({ report }: { report: ReportData }) {
  const [copied, setCopied] = useState(false);

  const downloadCsv = () => {
    const csv = buildInvestorCsv(report.investors);
    // Prepend a BOM so Excel opens UTF-8 (accented names, — dashes) correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFilename(new Date(), "csv");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildOnboardingSummary(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — no-op; the CSV and
      // print paths remain available.
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
        <DropdownMenuItem onClick={downloadCsv}>
          <Download size={14} />
          Download CSV
          <span className="ml-auto text-[10px] text-ink-400">{report.investors.length} rows</span>
        </DropdownMenuItem>
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
