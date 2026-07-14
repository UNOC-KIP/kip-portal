"use client";

import { useState, useMemo } from "react";
import { Search, FileText, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Hide this column below the given breakpoint */
  hideBelow?: "sm" | "md" | "lg";
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: keyof T;
  searchPlaceholder?: string;
  searchKeys?: Array<keyof T>;
  filterSlot?: React.ReactNode;
  exportLabel?: string;
  onExport?: () => void;
  pageSize?: number;
  emptyState?: React.ReactNode;
  className?: string;
}

const HIDE_CLASSES: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  searchPlaceholder = "Search…",
  searchKeys = [],
  filterSlot,
  exportLabel,
  onExport,
  pageSize = 10,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Client-side search
  const filtered = useMemo(() => {
    if (!query.trim() || searchKeys.length === 0) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
    );
  }, [data, query, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Reset to page 1 whenever search changes
  const handleQuery = (v: string) => {
    setQuery(v);
    setPage(1);
  };

  return (
    <div className={cn("rounded-xl border border-ink-200 bg-white", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 print:hidden">
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {filterSlot ?? (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter size={13} />
              Filter
            </Button>
          )}
          {exportLabel && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onExport}
            >
              <FileText size={13} />
              {exportLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-ink-200 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold text-ink-500",
                    col.hideBelow && HIDE_CLASSES[col.hideBelow],
                    col.className,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-ink-400"
                >
                  {emptyState ?? "No results found."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow
                  key={String(row[rowKey])}
                  className="border-ink-100 hover:bg-ink-50"
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "text-sm",
                        col.hideBelow && HIDE_CLASSES[col.hideBelow],
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0 text-ink-500"
            >
              ‹
            </Button>
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={p === currentPage ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className={cn(
                    "h-7 min-w-[28px] p-0 text-xs",
                    p !== currentPage && "text-ink-500",
                  )}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="h-7 w-7 p-0 text-ink-500"
            >
              ›
            </Button>
          </div>
          <span className="text-xs text-ink-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
