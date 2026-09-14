import { randomUUID } from "node:crypto";
import { Application, ApplicationPartner, Document } from "@kip/db";
import {
  DocumentKind,
  UserRole,
  EOI_DOCUMENT_REQUIREMENTS,
} from "@kip/shared";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../errors.js";
import { presignUpload, presignDownload } from "../../storage/index.js";
import { assertApplicationEditable } from "../applications/application-edit.js";
import type {
  PresignDocumentInput,
  RegisterDocumentInput,
} from "./documents.schema.js";

type Actor = { id: string; role: string };

/** S3 layout, unchanged from the payment-proof path. */
function storageKeyFor(
  applicationId: string,
  documentId: string,
  filename: string,
): string {
  return `applications/${applicationId}/documents/${documentId}/${filename}`;
}

async function loadApplicationFor(
  applicationId: string,
  actor: Actor,
): Promise<Application> {
  const app = await Application.findByPk(applicationId, {
    attributes: ["id", "ownerUserId", "status"],
  });
  if (!app) throw NotFound("Application");
  if (app.ownerUserId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw Forbidden("You can only manage documents on your own application");
  }
  return app;
}

/** A partnerId, when given, must name a partner of this same application. */
async function assertPartnerBelongs(
  applicationId: string,
  partnerId: string | undefined,
): Promise<void> {
  if (!partnerId) return;
  const partner = await ApplicationPartner.findByPk(partnerId, {
    attributes: ["id", "applicationId"],
  });
  if (!partner || partner.applicationId !== applicationId) {
    throw BadRequest("Unknown venture partner for this application");
  }
}

/**
 * Attachments follow the application: whenever the investor may still edit a
 * section they may still change the files that section refers to, and once the
 * application locks so do its documents. That is the shared gate in
 * @kip/shared, read here through the same API helper the application service
 * uses — re-deriving the rule from a status list is what let the two drift.
 *
 * In practice this means an attachment can be replaced after submission while
 * the application window is still open, which is the point: a wrong or
 * unreadable certificate is exactly the kind of thing an applicant notices the
 * day after submitting.
 */
async function assertMutable(app: Application, actor: Actor): Promise<void> {
  await assertApplicationEditable(app, actor);
}

/** Kinds the checklist says may hold only one file (spec §1–§6). */
const SINGLE_FILE_KINDS = new Set<string>(
  EOI_DOCUMENT_REQUIREMENTS.filter((r) => !r.multiple).map((r) => r.kind),
);

/**
 * Hands out a short-lived PUT URL. No DB row yet — see `registerDocument`.
 * The returned `documentId` is the one the caller must echo back, so the key
 * the browser writes to and the key we later record cannot diverge.
 */
export async function presignDocument(
  input: PresignDocumentInput,
  actor: Actor,
): Promise<{ documentId: string; uploadUrl: string; storageKey: string }> {
  const app = await loadApplicationFor(input.applicationId, actor);
  await assertMutable(app, actor);
  await assertPartnerBelongs(input.applicationId, input.partnerId);

  if (input.kind === DocumentKind.PAYMENT_PROOF) {
    // Payment proof is owned by the payments module, which also moves the
    // payment's status. Uploading one through here would leave the payment in
    // PENDING with a proof sitting next to it.
    throw BadRequest("Upload proof of payment from the payment page");
  }

  const documentId = randomUUID();
  const storageKey = storageKeyFor(input.applicationId, documentId, input.filename);

  const { url: uploadUrl } = await presignUpload({
    key: storageKey,
    contentType: input.contentType,
    expiresInSeconds: 600,
  });

  return { documentId, uploadUrl, storageKey };
}

/** Records a document once the browser has finished the PUT. */
export async function registerDocument(
  input: RegisterDocumentInput,
  actor: Actor,
): Promise<Document> {
  const app = await loadApplicationFor(input.applicationId, actor);
  await assertMutable(app, actor);
  await assertPartnerBelongs(input.applicationId, input.partnerId);

  if (input.kind === DocumentKind.PAYMENT_PROOF) {
    throw BadRequest("Upload proof of payment from the payment page");
  }

  // The key is rebuilt rather than trusted, so a caller cannot register a row
  // that points at another application's prefix.
  const expectedKey = storageKeyFor(
    input.applicationId,
    input.documentId,
    input.filename,
  );
  if (input.storageKey !== expectedKey) {
    throw BadRequest("Storage key does not match this upload");
  }

  const existingId = await Document.findByPk(input.documentId);
  if (existingId) throw Conflict("That document has already been registered");

  // Single-file slots replace rather than accumulate: the investor re-uploading
  // their organogram means the new one, not two organograms for the committee
  // to choose between.
  if (SINGLE_FILE_KINDS.has(input.kind)) {
    await Document.destroy({
      where: {
        applicationId: input.applicationId,
        kind: input.kind,
        partnerId: input.partnerId ?? null,
      },
    });
  }

  return Document.create({
    id: input.documentId,
    applicationId: input.applicationId,
    partnerId: input.partnerId ?? null,
    kind: input.kind,
    filename: input.filename,
    storageKey: input.storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
}

export async function listDocuments(
  applicationId: string,
  actor: Actor,
): Promise<Document[]> {
  const app = await Application.findByPk(applicationId, {
    attributes: ["id", "ownerUserId"],
  });
  if (!app) throw NotFound("Application");

  // Staff read every application; an investor reads only their own.
  const isStaff = actor.role !== UserRole.INVESTOR;
  if (app.ownerUserId !== actor.id && !isStaff) {
    throw Forbidden("You can only view your own documents");
  }

  return Document.findAll({
    where: { applicationId },
    order: [["uploadedAt", "ASC"]],
  });
}

/** Short-lived GET URL — owner or any staff member. */
export async function getDownloadUrl(
  documentId: string,
  actor: Actor,
): Promise<{ url: string; filename: string }> {
  const doc = await Document.findByPk(documentId);
  if (!doc) throw NotFound("Document");

  const app = await Application.findByPk(doc.applicationId, {
    attributes: ["ownerUserId"],
  });
  if (!app) throw NotFound("Application");

  const isStaff = actor.role !== UserRole.INVESTOR;
  if (app.ownerUserId !== actor.id && !isStaff) {
    throw Forbidden("You can only download your own documents");
  }

  const url = await presignDownload({ key: doc.storageKey, expiresInSeconds: 300 });
  return { url, filename: doc.filename };
}

/**
 * Hard delete of the row. The S3 object is deliberately left in place: the
 * bucket is the audit trail, and orphaned objects under a key prefix nobody
 * references are cheaper than a delete path that could remove the wrong object.
 */
export async function deleteDocument(
  documentId: string,
  actor: Actor,
): Promise<void> {
  const doc = await Document.findByPk(documentId);
  if (!doc) throw NotFound("Document");

  const app = await loadApplicationFor(doc.applicationId, actor);
  await assertMutable(app, actor);

  if (doc.kind === DocumentKind.PAYMENT_PROOF && actor.role !== UserRole.ADMIN) {
    throw Forbidden("Proof of payment cannot be removed once uploaded");
  }

  await doc.destroy();
}
