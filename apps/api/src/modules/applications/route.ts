import { Router } from "express";
import {
  Application,
  ApplicationPartner,
  ApplicationSection,
  Document,
  Payment,
} from "@kip/db";
import {
  UserRole,
  createApplicationSchema,
  updateSectionSchema,
  adminOverrideStatusSchema,
  submissionExtensionSchema,
  savePartnersSchema,
  setApplicationPlotsSchema,
} from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { requestInvoice } from "../payments/payments.service.js";
import { getInvoiceDownloadUrl, getProofDownloadUrl } from "../finance/finance.service.js";
import { BadRequest, Forbidden, NotFound } from "../../errors.js";
import {
  submitApplication,
  deleteApplication,
  deleteOwnApplication,
  createApplication,
  saveSection,
  submissionBlockers,
  overrideApplicationStatus,
  setSubmissionExtension,
  savePartners,
  setApplicationPlots,
} from "./applications.service.js";

export const applicationsRouter: Router = Router();

applicationsRouter.use(requireAuth);

function isStaff(role: string): boolean {
  return role !== UserRole.INVESTOR;
}

/**
 * POST /applications — start an EOI. (Investors create their own.)
 *
 * 201 for a new draft, 200 when the investor already had one — the portal
 * treats both the same and routes into the wizard.
 */
applicationsRouter.post(
  "/",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const input = createApplicationSchema.parse(req.body ?? {});
      const { application, created } = await createApplication(req.user!, input);
      res.status(created ? 201 : 200).json(application);
    } catch (e) {
      next(e);
    }
  },
);

/** GET /applications/:id — owner or any staff member. */
applicationsRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw BadRequest("id required");

    const app = await Application.findByPk(id, {
      include: [
        { model: ApplicationSection, as: "sections" },
        { model: ApplicationPartner, as: "partners" },
        { model: Document, as: "documents" },
        { model: Payment, as: "payments" },
      ],
    });
    if (!app) throw NotFound("Application");

    const user = req.user!;
    if (app.ownerUserId !== user.id && !isStaff(user.role)) {
      throw Forbidden("You can only view your own application");
    }

    res.json(app);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /applications/:id/section — upsert one section.
 *
 * `complete: false` (the default) saves a draft without validating, so an
 * investor can leave mid-section and come back. `complete: true` runs the full
 * section schema and is what the submit guard counts.
 */
applicationsRouter.put(
  "/:id/section",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");

      const input = updateSectionSchema.parse(req.body);
      const section = await saveSection(id, req.user!, input);
      res.json(section);
    } catch (e) {
      next(e);
    }
  },
);

/**
 * PUT /applications/:id/partners — replace the joint-venture partner list.
 * Owner or ADMIN; only while the application is still editable.
 */
applicationsRouter.put(
  "/:id/partners",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const input = savePartnersSchema.parse(req.body);
      const partners = await savePartners(id, req.user!, input);
      res.json({ partners });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * PUT /applications/:id/plots — set the full set of plots the application is for.
 * Owner or ADMIN; only while the application is still editable.
 */
applicationsRouter.put(
  "/:id/plots",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const input = setApplicationPlotsSchema.parse(req.body);
      const app = await setApplicationPlots(id, req.user!, input);
      res.json(app);
    } catch (e) {
      next(e);
    }
  },
);

/**
 * POST /applications/:id/request-invoice — investor generates (or refreshes)
 * the fee invoice for the plots chosen so far, so they can pay early. Owner or
 * ADMIN. Returns the payment (amount + VAT breakdown + status).
 */
applicationsRouter.post(
  "/:id/request-invoice",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const payment = await requestInvoice(id, req.user!);
      res.json({
        id: payment.id,
        status: payment.status,
        invoiceStatus: payment.invoiceStatus,
        currency: payment.currency,
        amount: String(payment.amount),
        subtotalAmount: payment.subtotalAmount != null ? String(payment.subtotalAmount) : null,
        vatAmount: payment.vatAmount != null ? String(payment.vatAmount) : null,
      });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * GET /applications/:id/invoice — presigned download URL for this application's
 * fee invoice. Owner, finance, or admin. 404 if no invoice has been attached.
 */
applicationsRouter.get(
  "/:id/invoice",
  requireRole(UserRole.INVESTOR, UserRole.FINANCE_OFFICER, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const url = await getInvoiceDownloadUrl(id, req.user!);
      res.json({ url });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * GET /applications/:id/proof — presigned download URL for the payment proof
 * (receipt) uploaded against this application. Finance or admin only. 404 if no
 * proof has been uploaded yet.
 */
applicationsRouter.get(
  "/:id/proof",
  requireRole(UserRole.FINANCE_OFFICER, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const result = await getProofDownloadUrl(id, req.user!);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

/**
 * GET /applications/:id/blockers — dry run of the submit guard.
 *
 * Lets the wizard's review step show exactly what submit would reject, instead
 * of the investor discovering it by pressing the button.
 */
applicationsRouter.get("/:id/blockers", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw BadRequest("id required");

    const app = await Application.findByPk(id, {
      attributes: ["id", "ownerUserId"],
    });
    if (!app) throw NotFound("Application");
    const user = req.user!;
    if (app.ownerUserId !== user.id && !isStaff(user.role)) {
      throw Forbidden("You can only view your own application");
    }

    res.json({ blockers: await submissionBlockers(id) });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /applications/:id/status — admin stage override (ADMIN only).
 *
 * Moves an application to a chosen stage outside the committee flow. Refuses to
 * move one that already holds a final outcome; records a ReviewAction for audit.
 */
applicationsRouter.patch(
  "/:id/status",
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const input = adminOverrideStatusSchema.parse(req.body);
      const app = await overrideApplicationStatus(id, req.user!, input);
      res.json(app);
    } catch (e) {
      next(e);
    }
  },
);

/**
 * PUT /applications/:id/submission-extension — per-application deadline (ADMIN only).
 *
 * Body `{ until: ISO datetime | null, notes? }`. Lets one applicant submit or
 * amend after the window has closed; `null` removes the extension.
 */
applicationsRouter.put(
  "/:id/submission-extension",
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const input = submissionExtensionSchema.parse(req.body);
      const app = await setSubmissionExtension(id, req.user!, input);
      res.json({ id: app.id, submissionExtendedUntil: app.submissionExtendedUntil });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * DELETE /applications/:id — soft delete (application + its payments).
 *
 * An admin may delete any application; an investor may delete only their OWN
 * application, and only while it is still a draft (enforced in
 * deleteOwnApplication).
 */
applicationsRouter.delete(
  "/:id",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      if (req.user!.role === UserRole.ADMIN) {
        await deleteApplication(id);
      } else {
        await deleteOwnApplication(id, req.user!);
      }
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);

/** POST /applications/:id/submit — DRAFT → SUBMITTED, assigns the reference. */
applicationsRouter.post(
  "/:id/submit",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      const app = await submitApplication(id, req.user!);
      res.json(app);
    } catch (e) {
      next(e);
    }
  },
);
