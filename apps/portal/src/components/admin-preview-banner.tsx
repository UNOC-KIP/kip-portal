import { FlaskConical } from "lucide-react";

/**
 * Shown on every investor-portal page while a preview role (ADMIN) is signed
 * in. Its job is to stop the admin mistaking preview output for real applicant
 * data: nothing here is sandboxed except the window gate, so the application,
 * the section payloads and the S3 objects are all real rows and real files.
 */
export function AdminPreviewBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-amber-900 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <FlaskConical size={16} className="mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          <span className="font-bold">Admin preview.</span> You are signed in as
          an administrator, so the application-window gate is lifted and you can
          walk the EOI journey between calls. Everything you create here is real
          — a real application under a{" "}
          <span className="font-semibold">[PREVIEW]</span> organisation, real
          uploads in the S3 bucket, and a real reference number consumed from the
          window sequence if you submit. Delete the application from the admin
          console when you&apos;re done.
        </p>
      </div>
    </div>
  );
}
