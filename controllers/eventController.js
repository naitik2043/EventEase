import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Waitlist from '../models/Waitlist.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const createEvent = asyncHandler(async (req, res) => {
  const { eventName, description, category, eventDate, venue, totalSeats, registrationFee } = req.body;
  const parsedDate = new Date(eventDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError('Event date must be a valid date.', 400);
  }

  const event = await Event.create({
    eventName,
    description,
    category,
    eventDate: parsedDate,
    venue,
    totalSeats,
    availableSeats: totalSeats,
    registrationFee,
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, message: 'Event created successfully.', event });
});

export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = { eventDate: { $gt: new Date() } };

  if (req.query.category) {
    filter.category = new RegExp(`^${escapeRegex(req.query.category.trim())}$`, 'i');
  }
  if (req.query.search) {
    const search = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ eventName: search }, { description: search }];
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('createdBy', 'name')
      .sort({ eventDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    results: events.length,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    events
  });
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('createdBy', 'name');
  if (!event) throw new AppError('Event not found.', 404);
  res.status(200).json({ success: true, event });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const allowedFields = ['eventName', 'description', 'category', 'eventDate', 'venue', 'totalSeats', 'registrationFee'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    throw new AppError('Provide at least one field to update.', 400);
  }

  if (updates.eventDate !== undefined) {
    const parsedDate = new Date(updates.eventDate);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new AppError('Event date must be a valid date.', 400);
    }
    updates.eventDate = parsedDate;
  }

  const current = await Event.findById(req.params.id);
  if (!current) throw new AppError('Event not found.', 404);

  if (updates.totalSeats !== undefined) {
    const bookedSeats = current.totalSeats - current.availableSeats;
    if (updates.totalSeats < bookedSeats) {
      throw new AppError(`totalSeats cannot be less than ${bookedSeats} already-booked seats.`, 400);
    }

    const updated = await Event.findOneAndUpdate(
      {
        _id: current._id,
        totalSeats: current.totalSeats,
        availableSeats: current.availableSeats
      },
      { $set: { ...updates, availableSeats: updates.totalSeats - bookedSeats } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new AppError('Event changed while you were editing it. Please retry.', 409);
    }
    return res.status(200).json({ success: true, message: 'Event updated successfully.', event: updated });
  }

  const updated = await Event.findByIdAndUpdate(
    current._id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  res.status(200).json({ success: true, message: 'Event updated successfully.', event: updated });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);
      if (!event) throw new AppError('Event not found.', 404);

      const activeRegistrations = await Registration.countDocuments({
        eventId: event._id,
        registrationStatus: 'Confirmed'
      }).session(session);

      if (activeRegistrations > 0) {
        throw new AppError(
          'This event has confirmed registrations. Cancel them before deleting the event.',
          409
        );
      }

      await Registration.deleteMany({ eventId: event._id }, { session });
      await Waitlist.deleteMany({ eventId: event._id }, { session });
      await Event.deleteOne({ _id: event._id }, { session });
    });

    res.status(200).json({ success: true, message: 'Event deleted successfully.' });
  } finally {
    await session.endSession();
  }
});
