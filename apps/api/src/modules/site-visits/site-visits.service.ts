import { SiteVisitBooking, User, InvestorOrg } from "@kip/db";
import { KIP_ZONE_LABELS, SiteVisitStatus, type KipZone } from "@kip/shared";
import { Conflict, NotFound } from "../../errors.js";
import { fireWebhook } from "../../webhooks.js";
import {
  sendMail,
  siteVisitConfirmationEmail,
  siteVisitNotificationEmail,
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
}
