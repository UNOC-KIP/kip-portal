import { Router } from "express";
import {
  User,
  Application,
  ApplicationSection,
  Document,
  Payment,
} from "@kip/db";
import {
  UserRole,
  ApplicationStatus,
  createApplicationSchema,
  updateSectionSchema,
  sectionSchemas,
} from "@kip/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { BadRequest, Forbidden, NotFound } from "../../errors.js";
import { submitApplication } from "./applications.service.js";

export const applicationsRouter: Router = Router();

applicationsRouter.use(requireAuth);

const STAFF_ROLES = new Set<string>([
  UserRole.ADMIN,
  UserRole.TC_MEMBER,
  UserRole.TC_CHAIR,
  UserRole.LAC_MEMBER,
  UserRole.EXCO_MEMBER,
]);

/** POST /applications — create a new draft. (Investors create their own.) */
applicationsRouter.post(
  "/",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const input = createApplicationSchema.parse(req.body);
      const user = req.user!;

      const userRow = await User.findByPk(user.id);
      if (!userRow?.investorOrgId) {
        throw BadRequest("User has no associated investor organisation");
      }

      // No reference yet — it is assigned atomically at the SUBMITTED transition
      // from the active window's sequence (see applications.service.ts).
      const app = await Application.create({
        lotReference: input.lotReference,
        status: ApplicationStatus.DRAFT_PAYMENT_PENDING,
        ownerUserId: user.id,
        investorOrgId: userRow.investorOrgId,
      });

      res.status(201).json(app);
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
        { model: Document, as: "documents" },
        { model: Payment, as: "payments" },
      ],
    });
    if (!app) throw NotFound("Application");

    const user = req.user!;
    if (app.ownerUserId !== user.id && !STAFF_ROLES.has(user.role)) {
      throw Forbidden("You can only view your own application");
    }

    res.json(app);
  } catch (e) {
    next(e);
  }
});

/** PUT /applications/:id/section — upsert one section. */
applicationsRouter.put(
  "/:id/section",
  requireRole(UserRole.INVESTOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) throw BadRequest("id required");

      const app = await Application.findByPk(id, { attributes: ["id", "ownerUserId"] });
      if (!app) throw NotFound("Application");
      const user = req.user!;
      if (app.ownerUserId !== user.id && user.role !== UserRole.ADMIN) {
        throw Forbidden("You can only edit your own application");
      }

      const input = updateSectionSchema.parse(req.body);
      const sectionSchema = sectionSchemas[input.section];
      const validatedPayload = sectionSchema.parse(input.payload);

      const existing = await ApplicationSection.findOne({
        where: { applicationId: id, section: input.section },
      });

      const section = existing
        ? await existing.update({
            payload: validatedPayload as object,
            completedAt: new Date(),
          })
        : await ApplicationSection.create({
            applicationId: id,
            section: input.section,
            payload: validatedPayload as object,
            completedAt: new Date(),
          });

      res.json(section);
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
