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

/** One downloadable CSV in the dropdown. */
export type CsvExport = {
  /** Menu label — omit on the primary export, which reads "Download CSV". */
  label?: string;
  /** Overrides the component's `filenamePrefix` for this file. */
  filenamePrefix?: string;
  columns: { header: string; key: string }[];
  rows: Record<string, unknown>[];
};

/**
 * Generic export/share control for every report tab. All actions run entirely
 * in the browser (no API call), so they work on the read-only demo:
 *   • CSV     — Blob download of `rows` serialised through the `columns` spec
 *   • PDF     — window.print() against the page's print stylesheet
 *   • Summary — plain-text digest copied to the clipboard
 * Omit `csv` for reports without a detail table (e.g. the Overview). `extraCsvs`
 * adds sibling downloads — the investors report uses it to ship the sign-up
 * trend series and the zone drill-down alongside the investor detail.
 */
export function ReportExportActions({
  filenamePrefix,
  summary,
  csv,
  extraCsvs = [],
}: {
  filenamePrefix: string;
  /**
   * The digest, or a thunk producing it. Pass a thunk when building the text
   * needs the clock or anything else non-deterministic — it is only invoked on
   * click, so a client component never reads the clock during render (which
   * would make the server and client markup disagree).
   */
  summary: string | (() => string);
  csv?: CsvExport;
  extraCsvs?: CsvExport[];
}) {
  const [copied, setCopied] = useState(false);

  const downloadCsv = (spec: CsvExport) => {
    // Prepend a BOM so Excel opens UTF-8 (accented names, — dashes) correctly.
    const blob = new Blob(["﻿" + buildCsv(spec.columns, spec.rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = datestampedFilename(spec.filenamePrefix ?? filenamePrefix, new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(typeof summary === "function" ? summary() : summary);
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
          <DropdownMenuItem onClick={() => downloadCsv(csv)}>
            <Download size={14} />
            {csv.label ?? "Download CSV"}
            <span className="ml-auto text-[10px] text-ink-400">{csv.rows.length} rows</span>
          </DropdownMenuItem>
        ) : null}
        {extraCsvs.map((spec, i) => (
          <DropdownMenuItem key={spec.label ?? i} onClick={() => downloadCsv(spec)}>
            <Download size={14} />
            {spec.label ?? "Download CSV"}
            <span className="ml-auto text-[10px] text-ink-400">{spec.rows.length} rows</span>
          </DropdownMenuItem>
        ))}
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
