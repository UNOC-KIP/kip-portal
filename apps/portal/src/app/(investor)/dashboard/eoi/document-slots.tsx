"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EoiDocument } from "@/lib/eoi-data";
import {
  EOI_ACCEPT_ATTRIBUTE,
  validateEoiFile,
  documentRequirementsFor,
  type ApplicantCategory,
  type EoiDocumentRequirement,
  type EoiSection,
} from "@kip/shared";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { useEoiForm } from "./eoi-fields";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return body?.error?.message ?? fallback;
}

/**
 * Uploads one attachment: presign → PUT to S3 → register.
 *
 * The row is only created on the third step, so a failed transfer leaves no
 * record claiming the document is attached (see documents.schema.ts).
 */
async function uploadDocument(args: {
  applicationId: string;
  kind: string;
  file: File;
}): Promise<EoiDocument> {
  const presignRes = await fetch(`${API_BASE}/documents/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      applicationId: args.applicationId,
      kind: args.kind,
      filename: args.file.name,
      contentType: args.file.type,
      sizeBytes: args.file.size,
    }),
  });
  if (!presignRes.ok) {
    throw new Error(await readError(presignRes, "Could not prepare the upload."));
  }
  const { documentId, uploadUrl, storageKey } = (await presignRes.json()) as {
    documentId: string;
    uploadUrl: string;
    storageKey: string;
  };

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": args.file.type },
    body: args.file,
  });
  if (!putRes.ok) throw new Error("Upload to storage failed. Please try again.");

  const registerRes = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      applicationId: args.applicationId,
      documentId,
      kind: args.kind,
      filename: args.file.name,
      storageKey,
      mimeType: args.file.type,
      sizeBytes: args.file.size,
    }),
  });
  if (!registerRes.ok) {
    throw new Error(await readError(registerRes, "Could not record the upload."));
  }

  const doc = (await registerRes.json()) as {
    id: string;
    kind: string;
    filename: string;
    sizeBytes: number;
    uploadedAt: string;
  };
  return {
    id: doc.id,
    kind: doc.kind,
    filename: doc.filename,
    sizeBytes: doc.sizeBytes,
    uploadedAt: doc.uploadedAt,
  };
}

function DocumentSlot({
  requirement,
  applicationId,
  documents,
  onChange,
  disabled,
}: {
  requirement: EoiDocumentRequirement;
  applicationId: string;
  documents: EoiDocument[];
  onChange: (next: EoiDocument[]) => void;
  disabled: boolean;
}) {
  const { naNotes, setNa } = useEoiForm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filed = documents.filter((d) => d.kind === requirement.kind);
  const note = naNotes[requirement.kind];
  const isNa = typeof note === "string";
  const canAddMore = requirement.multiple || filed.length === 0;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const chosen = requirement.multiple ? Array.from(files) : [files[0] as File];
    for (const file of chosen) {
      const rejection = validateEoiFile({
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (rejection) {
        setError(`${file.name}: ${rejection}`);
        return;
      }
    }

    setBusy(true);
    try {
      let next = documents;
      for (const file of chosen) {
        const uploaded = await uploadDocument({
          applicationId,
          kind: requirement.kind,
          file,
        });
        // Single-file slots replace server-side; mirror that locally so the UI
        // does not briefly show two files for a slot that holds one.
        next = requirement.multiple
          ? [...next, uploaded]
          : [...next.filter((d) => d.kind !== requirement.kind), uploaded];
        onChange(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(documentId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readError(res, "Could not remove the file."));
      onChange(documents.filter((d) => d.id !== documentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        filed.length > 0
          ? "border-green-300 bg-green-50/60"
          : isNa
            ? "border-amber-300 bg-amber-50"
            : "border-ink-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">
            {requirement.label}
            {requirement.required && <span className="ml-0.5 text-red-600">*</span>}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            {requirement.description}
          </p>
        </div>
        {requirement.allowNotApplicable && !disabled && filed.length === 0 && (
          <button
            type="button"
            onClick={() => setNa(requirement.kind, isNa ? null : "")}
            className="shrink-0 text-xs font-semibold text-brand-600 underline-offset-2 hover:underline"
          >
            {isNa ? "This does apply" : "Not applicable"}
          </button>
        )}
      </div>

      {isNa && filed.length === 0 ? (
        <textarea
          rows={2}
          value={note}
          disabled={disabled}
          onChange={(e) => setNa(requirement.kind, e.target.value)}
          placeholder="Explain briefly why this document does not apply to your company."
          className="mt-3 w-full resize-y rounded-md border border-amber-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
        />
      ) : (
        <>
          {filed.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {filed.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-2"
                >
                  <FileText size={15} className="shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-800">
                    {doc.filename}
                  </span>
                  <span className="shrink-0 text-xs text-ink-400">
                    {formatSize(doc.sizeBytes)}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      disabled={busy}
                      aria-label={`Remove ${doc.filename}`}
                      className="shrink-0 text-ink-400 transition hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!disabled && canAddMore && (
            <label
              className={cn(
                "mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-300 px-4 py-3 text-xs font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-600",
                busy && "pointer-events-none opacity-60",
              )}
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {busy
                ? "Uploading…"
                : filed.length > 0
                  ? "Add another file"
                  : "Upload PDF — max 5 MB"}
              <input
                type="file"
                accept={EOI_ACCEPT_ATTRIBUTE}
                multiple={requirement.multiple}
                className="sr-only"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Every attachment slot that applies to this section. */
export function DocumentSlots({
  section,
  applicantCategory,
  applicationId,
  documents,
  onChange,
  disabled,
}: {
  section: EoiSection;
  applicantCategory: ApplicantCategory | undefined;
  applicationId: string;
  documents: EoiDocument[];
  onChange: (next: EoiDocument[]) => void;
  disabled: boolean;
}) {
  const requirements = documentRequirementsFor(section, applicantCategory);
  if (requirements.length === 0) return null;

  return (
    <section className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
      <h3 className="text-sm font-bold text-ink-900">Required attachments</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
        Clear, legible PDF copies, 5 MB maximum per file. Documents not in English
        must be accompanied by a certified English translation.
      </p>
      <div className="mt-4 space-y-3">
        {requirements.map((requirement) => (
          <DocumentSlot
            key={requirement.kind}
            requirement={requirement}
            applicationId={applicationId}
            documents={documents}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}
