import { Router } from "express";
import {
  User,
  Application,
  ApplicationSection,
  Document,
  Payment,
} from "@kip/db";
import {
  ApplicationStatus,
  createApplicationSchema,
  updateSectionSchema,
  sectionSchemas,
} from "@kip/shared";
import { requireAuth } from "../../middleware/auth.js";
import { BadRequest, NotFound } from "../../errors.js";

export const applicationsRouter: Router = Router();

applicationsRouter.use(requireAuth);

/** POST /applications — create a new draft. */
applicationsRouter.post("/", async (req, res, next) => {
  try {
    const input = createApplicationSchema.parse(req.body);
    const user = req.user!;

    const userRow = await User.findByPk(user.id);
    if (!userRow?.investorOrgId) {
      throw BadRequest("User has no associated investor organisation");
    }

    const year = new Date().getFullYear();
    const count = await Application.count();
    const reference = `KIP-${year}-${String(count + 1).padStart(4, "0")}`;

    const app = await Application.create({
      reference,
      lotReference: input.lotReference,
      status: ApplicationStatus.DRAFT_PAYMENT_PENDING,
      ownerUserId: user.id,
      investorOrgId: userRow.investorOrgId,
    });

    res.status(201).json(app);
  } catch (e) {
    next(e);
  }
});

/** GET /applications/:id */
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

    res.json(app);
  } catch (e) {
    next(e);
  }
});

/** PUT /applications/:id/section — upsert one section. */
applicationsRouter.put("/:id/section", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw BadRequest("id required");

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
});
