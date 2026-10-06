import Link from "next/link";
import { FileDown } from "lucide-react";

/**
 * "Export EOI" button for one application. `href` is the export route of the
 * area the viewer is in (applications/, tc/ or lac/), so the export inherits
 * that area's access guard rather than sending a committee member to an
 * admin-only path.
 */
export function ExportEoiLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
    >
      <FileDown className="h-4 w-4" />
      Export EOI
    </Link>
  );
}
