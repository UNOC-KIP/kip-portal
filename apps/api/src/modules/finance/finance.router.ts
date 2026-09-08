import { Router } from "express";
import { UserRole } from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { BadRequest } from "../../errors.js";
import {
  listFinanceApplications,
  presignInvoiceUpload,
  sendInvoice,
} from "./finance.service.js";
import { verifyPayment } from "../payments/payments.service.js";

export const financeRouter: Router = Router();

financeRouter.use(requireAuth);
financeRouter.use(requireRole(UserRole.FINANCE_OFFICER, UserRole.ADMIN));

/** GET /finance/applications — the finance queue. */
financeRouter.get("/applications", async (req, res, next) => {
  try {
    res.json(await listFinanceApplications(req.user!));
  } catch (e) {
    next(e);
  }
});

/** POST /finance/payments/:id/invoice/presign — get a PUT URL for the invoice. */
financeRouter.post("/payments/:id/invoice/presign", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { filename, contentType } = (req.body ?? {}) as {
      filename?: string;
      contentType?: string;
    };
    if (!id) throw BadRequest("id required");
    if (!filename || !contentType) throw BadRequest("filename and contentType required");
    res.json(await presignInvoiceUpload(id, req.user!, { filename, contentType }));
  } catch (e) {
    next(e);
  }
});

/** POST /finance/payments/:id/invoice/send — email the invoice, or mark sent. */
financeRouter.post("/payments/:id/invoice/send", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw BadRequest("id required");
    const body = (req.body ?? {}) as Record<string, unknown>;
    await sendInvoice(id, req.user!, {
      markOnly: body.markOnly === true,
      documentId: typeof body.documentId === "string" ? body.documentId : undefined,
      storageKey: typeof body.storageKey === "string" ? body.storageKey : undefined,
      filename: typeof body.filename === "string" ? body.filename : undefined,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** POST /finance/payments/:id/verify — flag the payment PAID or FAILED. */
financeRouter.post("/payments/:id/verify", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw BadRequest("id required");
    const result = (req.body ?? {}).result;
    if (result !== "CONFIRMED" && result !== "FAILED") {
      throw BadRequest("result must be CONFIRMED or FAILED");
    }
    await verifyPayment(id, req.user!, result);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
