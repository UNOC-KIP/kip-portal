"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Screen-only controls above the EOI dossier. "Save as PDF" is the browser's
 * print dialog against the page's print styles — the same model as the reports
 * hub, so it needs no API and no PDF library. The page <title> is the
 * suggested filename.
 */
export function ExportToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-4 w-4" />
        Print / Save as PDF
      </Button>
    </div>
  );
}
