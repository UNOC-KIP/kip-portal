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
  savePartnersSchema,
  setApplicationPlotsSchema,
} from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { BadRequest, Forbidden, NotFound } from "../../errors.js";
import {
  submitApplication,
  deleteApplication,
  createApplication,
  saveSection,
  submissionBlockers,
  overrideApplicationStatus,
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

/** DELETE /applications/:id — admin soft delete (application + its payments). */
applicationsRouter.delete(
  "/:id",
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");
      await deleteApplication(id);
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
