"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export interface AdminDocument {
  id: string;
  kindLabel: string;
  filename: string;
  sizeLabel: string;
  uploadedAt: string;
  partnerName?: string | null;
}

/**
 * Renders the EOI attachments an investor uploaded and turns the admin's
 * "view / download" gestures into real presigned S3 links.
 *
 * Reads in the admin app go straight to the DB, but a download needs a
 * short-lived signed URL, and presigning lives only in the Express API. So the
 * document metadata is passed in from the server (see getAdminApplicationDetail)
 * and only the signed URL is fetched on demand from `GET /documents/:id/download`
 * — authenticated by the shared admin session cookie (credentials: "include"),
 * which the API scopes to any staff member.
 */
export function DocumentList({ documents }: { documents: AdminDocument[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchDownloadUrl(id: string): Promise<string> {
    const res = await fetch(`${API_BASE}/documents/${id}/download`, {
      credentials: "include",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(data?.error?.message ?? "Could not open this document");
    }
    const { url } = (await res.json()) as { url: string };
    return url;
  }

  async function view(id: string) {
    if (busyId || downloadingAll) return;
    setError(null);
    setBusyId(id);
    // Open the tab synchronously so the popup blocker keeps the user gesture,
    // then point it at the signed URL once it resolves.
    const tab = window.open("", "_blank");
    try {
      const url = await fetchDownloadUrl(id);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      if (tab) tab.close();
      setError(err instanceof Error ? err.message : "Could not open this document");
    } finally {
      setBusyId(null);
    }
  }

  async function downloadAll() {
    if (busyId || downloadingAll) return;
    setError(null);
    setDownloadingAll(true);
    try {
      for (const doc of documents) {
        const url = await fetchDownloadUrl(doc.id);
        try {
          // Fetch the object and save it under its real filename. Falls back to
          // opening the signed URL if the bucket's CORS blocks the fetch.
          const blob = await (await fetch(url)).blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = doc.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
        } catch {
          window.open(url, "_blank");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not download the documents",
      );
    } finally {
      setDownloadingAll(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-700">
          Documents{" "}
          <span className="font-normal text-ink-500">({documents.length})</span>
        </h2>
        {documents.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAll}
            disabled={downloadingAll || busyId != null}
          >
            {downloadingAll ? (
              <Loader2 size={13} className="mr-1.5 animate-spin" />
            ) : (
              <Download size={13} className="mr-1.5" />
            )}
            Download all
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-ink-500">
          No documents have been uploaded for this application yet.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <FileText size={16} className="shrink-0 text-ink-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {doc.kindLabel}
                  {doc.partnerName && (
                    <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                      {doc.partnerName}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-ink-500">
                  {doc.filename} · {doc.sizeLabel} · {doc.uploadedAt}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1 text-xs"
                onClick={() => view(doc.id)}
                disabled={downloadingAll || busyId != null}
              >
                {busyId === doc.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ExternalLink size={12} />
                )}
                View
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
