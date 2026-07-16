import type { RequestHandler } from "express";
import {
  bookingIdParamSchema,
  createBookingSchema,
  updateStatusBodySchema,
} from "./site-visits.schema.js";
import {
  createBooking,
  deleteBooking,
  listBookings,
  updateBooking,
  updateBookingStatus,
} from "./site-visits.service.js";

export const handleCreate: RequestHandler = async (req, res, next) => {
  try {
    const input = createBookingSchema.parse(req.body ?? {});
    const { id } = await createBooking(req.user!.id, input);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    next(e);
  }
};

export const handleList: RequestHandler = async (_req, res, next) => {
  try {
    const bookings = await listBookings();
    res.json({ bookings });
  } catch (e) {
    next(e);
  }
};

export const handleUpdate: RequestHandler = async (req, res, next) => {
  try {
    const { id } = bookingIdParamSchema.parse(req.params);
    const input = createBookingSchema.parse(req.body ?? {});
    await updateBooking(req.user!, id, input);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleDelete: RequestHandler = async (req, res, next) => {
  try {
    const { id } = bookingIdParamSchema.parse(req.params);
    await deleteBooking(req.user!, id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const handleUpdateStatus: RequestHandler = async (req, res, next) => {
  try {
    const { id } = bookingIdParamSchema.parse(req.params);
    const { status, scheduledAt } = updateStatusBodySchema.parse(req.body ?? {});
    await updateBookingStatus(id, status, scheduledAt, req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
