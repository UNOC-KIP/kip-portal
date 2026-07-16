import { SiteVisitBooking, User, InvestorOrg } from "@kip/db";
import { KIP_ZONE_LABELS, SiteVisitStatus, UserRole, type KipZone } from "@kip/shared";
import { Conflict, Forbidden, NotFound } from "../../errors.js";
import { fireWebhook } from "../../webhooks.js";
import {
  sendMail,
  siteVisitConfirmationEmail,
  siteVisitNotificationEmail,
  siteVisitScheduledEmail,
} from "../../mailer.js";
import type { CreateBookingInput } from "./site-visits.schema.js";

const SECRETARIAT_EMAIL = "kipinvestorrelations@unoc.com";

/**
 * Record an investor's request to visit the site. The secretariat follows up
 * out of band with dates and a formal invitation.
 */
export async function createBooking(
  userId: string,
  input: CreateBookingInput,
): Promise<{ id: string }> {
  const user = await User.findByPk(userId, {
    include: [{ model: InvestorOrg, as: "investorOrg" }],
  });
  if (!user) throw NotFound("User");

  // One active request per investor — block a second booking while an existing
  // one is still open (NEW or SCHEDULED). A COMPLETED/CANCELLED visit may be
  // re-booked. The portal already hides the form once a booking exists; this is
  // the server-side enforcement.
  const active = await SiteVisitBooking.findOne({
    where: {
      userId: user.id,
      status: [SiteVisitStatus.NEW, SiteVisitStatus.SCHEDULED],
    },
  });
  if (active) {
    throw Conflict("You already have an active site visit request.");
  }

  const org = (user as User & { investorOrg?: InvestorOrg }).investorOrg;
  const companyName = org?.legalName ?? user.name ?? user.email;
  const zoneLabel = KIP_ZONE_LABELS[input.zone as KipZone];

  const booking = await SiteVisitBooking.create({
    userId: user.id,
    investorOrgId: user.investorOrgId ?? null,
    zone: input.zone,
    landUse: input.landUse,
    description: input.description,
    acres: input.acres,
    status: SiteVisitStatus.NEW,
  });

  // Both emails are best-effort — the booking is already persisted and the
  // admin console surfaces it regardless of mail delivery.
  try {
    await sendMail({
      to: user.email,
      subject: "Your KIP site visit request",
      html: siteVisitConfirmationEmail({
        companyName,
        zoneLabel,
        landUse: input.landUse,
        acres: input.acres,
        description: input.description,
      }),
    });
  } catch {
    // Logged inside sendMail.
  }

  try {
    await sendMail({
      to: SECRETARIAT_EMAIL,
      subject: `New KIP site visit request — ${companyName}`,
      html: siteVisitNotificationEmail({
        companyName,
        contactName: user.name ?? "—",
        contactEmail: user.email,
        zoneLabel,
        landUse: input.landUse,
        acres: input.acres,
        description: input.description,
      }),
    });
  } catch {
    // Logged inside sendMail.
  }

  await fireWebhook("site-visit-requested", {
    bookingId: booking.id,
    userId: user.id,
    email: user.email,
    companyName,
    zone: input.zone,
    zoneLabel,
    landUse: input.landUse,
    acres: input.acres,
    description: input.description,
    requestedAt: new Date().toISOString(),
  });

  return { id: booking.id };
}

export interface BookingListRow {
  id: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string;
  zone: string;
  landUse: string;
  description: string;
  acres: number;
  status: string;
  scheduledAt: Date | null;
  createdAt: Date;
}

export async function listBookings(): Promise<BookingListRow[]> {
  const rows = await SiteVisitBooking.findAll({
    include: [
      { model: User, as: "user", attributes: ["name", "email"] },
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
    ],
    order: [["createdAt", "DESC"]],
  });

  return rows.map((b) => {
    const r = b as SiteVisitBooking & {
      user?: User;
      investorOrg?: InvestorOrg;
    };
    return {
      id: r.id,
      companyName: r.investorOrg?.legalName ?? "—",
      contactName: r.user?.name ?? null,
      contactEmail: r.user?.email ?? "—",
      zone: r.zone,
      landUse: r.landUse,
      description: r.description,
      acres: r.acres,
      status: r.status,
      scheduledAt: r.scheduledAt ?? null,
      createdAt: r.createdAt,
    };
  });
}

/**
 * Edit an existing booking. Only the owner (or an admin) may edit, and only
 * while the request is still NEW — once the secretariat has scheduled it, the
 * details are locked and changes go through them out of band.
 */
export async function updateBooking(
  actor: { id: string; role: UserRole },
  bookingId: string,
  input: CreateBookingInput,
): Promise<void> {
  const booking = await SiteVisitBooking.findByPk(bookingId);
  if (!booking) throw NotFound("Site visit booking");

  const isAdmin = actor.role === UserRole.ADMIN;
  if (!isAdmin && booking.userId !== actor.id) {
    throw Forbidden("You can only edit your own site visit request.");
  }
  if (booking.status !== SiteVisitStatus.NEW) {
    throw Conflict("This request can no longer be edited — it has already been scheduled.");
  }

  await booking.update({
    zone: input.zone,
    landUse: input.landUse,
    description: input.description,
    acres: input.acres,
  });
}

/**
 * Delete a booking. Same guard as edit — owner (or admin), NEW only. A hard
 * delete (the table is not paranoid) so the investor can immediately submit a
 * fresh request without tripping the one-active-request rule.
 */
export async function deleteBooking(
  actor: { id: string; role: UserRole },
  bookingId: string,
): Promise<void> {
  const booking = await SiteVisitBooking.findByPk(bookingId);
  if (!booking) throw NotFound("Site visit booking");

  const isAdmin = actor.role === UserRole.ADMIN;
  if (!isAdmin && booking.userId !== actor.id) {
    throw Forbidden("You can only delete your own site visit request.");
  }
  if (booking.status !== SiteVisitStatus.NEW) {
    throw Conflict("This request can no longer be deleted — it has already been scheduled.");
  }

  await booking.destroy();
}

/**
 * Move a booking between follow-up states. SCHEDULED / COMPLETED / CANCELLED
 * stamp the acting admin + time; reverting to NEW clears them.
 */
export async function updateBookingStatus(
  bookingId: string,
  status: SiteVisitStatus,
  scheduledAt: string | undefined,
  actorUserId: string,
): Promise<void> {
  const booking = await SiteVisitBooking.findByPk(bookingId);
  if (!booking) throw NotFound("Site visit booking");

  if (status === SiteVisitStatus.NEW) {
    await booking.update({
      status,
      handledById: null,
      handledAt: null,
      scheduledAt: null,
    });
    return;
  }

  await booking.update({
    status,
    handledById: actorUserId,
    handledAt: new Date(),
    ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
  });

  // On confirmation (SCHEDULED with a date), email the investor the details.
  // Best-effort — the status change is already committed and the portal shows
  // it regardless of mail delivery.
  if (status === SiteVisitStatus.SCHEDULED && booking.scheduledAt) {
    const user = await User.findByPk(booking.userId, {
      include: [{ model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] }],
    });
    if (user) {
      const org = (user as User & { investorOrg?: InvestorOrg }).investorOrg;
      const companyName = org?.legalName ?? user.name ?? user.email;
      try {
        await sendMail({
          to: user.email,
          subject: "Your KIP site visit is confirmed",
          html: siteVisitScheduledEmail({
            companyName,
            zoneLabel: KIP_ZONE_LABELS[booking.zone as KipZone] ?? booking.zone,
            landUse: booking.landUse,
            acres: booking.acres,
            scheduledAt: booking.scheduledAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Africa/Kampala",
            }),
          }),
        });
      } catch {
        // Logged inside sendMail.
      }
    }
  }
}
