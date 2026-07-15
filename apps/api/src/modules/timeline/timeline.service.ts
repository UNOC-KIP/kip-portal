import type { Transaction } from "sequelize";
import { sequelize, TimelineMilestone } from "@kip/db";
import { Conflict, NotFound } from "../../errors.js";
import type { CreateMilestoneInput, UpdateMilestoneInput } from "./timeline.schema.js";

/**
 * Admin CRUD for the public application timeline. Both portals read the
 * `TimelineMilestone` table directly (with a shared fallback list when it is
 * empty), so every change here is live everywhere on the next render — the
 * home/about timelines, the investor dashboard stage tracker, the EOI
 * countdown, and the site-visit booking gate.
 */

async function assertPositionFree(
  position: number,
  excludeId: string | null,
  t: Transaction,
): Promise<void> {
  const existing = await TimelineMilestone.findOne({ where: { position }, transaction: t });
  if (existing && existing.id !== excludeId) {
    throw Conflict(`Position ${position} is already taken by "${existing.title}"`);
  }
}

export async function createMilestone(input: CreateMilestoneInput): Promise<{ id: string }> {
  return sequelize.transaction(async (t) => {
    await assertPositionFree(input.position, null, t);
    const row = await TimelineMilestone.create(
      {
        position: input.position,
        kind: input.kind,
        status: input.status,
        title: input.title,
        dateLabel: input.dateLabel,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
      },
      { transaction: t },
    );
    return { id: row.id };
  });
}

export async function updateMilestone(id: string, input: UpdateMilestoneInput): Promise<void> {
  await sequelize.transaction(async (t) => {
    const row = await TimelineMilestone.findByPk(id, { lock: true, transaction: t });
    if (!row) throw NotFound("Timeline milestone");
    if (input.position !== undefined && input.position !== row.position) {
      await assertPositionFree(input.position, id, t);
    }
    const effectiveStart = input.startsAt ?? row.startsAt;
    const effectiveEnd = input.endsAt !== undefined ? input.endsAt : row.endsAt;
    if (effectiveEnd && effectiveEnd.getTime() <= new Date(effectiveStart).getTime()) {
      throw Conflict("End date must be after the start date");
    }
    await row.update(
      {
        ...(input.position !== undefined && { position: input.position }),
        ...(input.kind !== undefined && { kind: input.kind }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.dateLabel !== undefined && { dateLabel: input.dateLabel }),
        ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
        ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
      },
      { transaction: t },
    );
  });
}

export async function deleteMilestone(id: string): Promise<void> {
  const row = await TimelineMilestone.findByPk(id);
  if (!row) throw NotFound("Timeline milestone");
  await row.destroy();
}
