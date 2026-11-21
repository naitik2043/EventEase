import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const transactionOptions = {
  readPreference: 'primary',
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' }
};

export const createRegistration = asyncHandler(async (req, res) => {
  const { eventId, numberOfSeats } = req.body;
  const session = await mongoose.startSession();
  let registrationId;

  try {
    await session.withTransaction(async () => {
      const event = await Event.findById(eventId).session(session);
      if (!event) throw new AppError('Event not found.', 404);
      if (event.eventDate <= new Date()) {
        throw new AppError('You cannot register for a past event.', 400);
      }

      const existing = await Registration.findOne({
        userId: req.user._id,
        eventId
      }).session(session);
      if (existing) {
        throw new AppError('You have already registered for this event.', 409);
      }

      // The conditional write is the concurrency-safe seat availability check.
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          eventDate: { $gt: new Date() },
          availableSeats: { $gte: numberOfSeats }
        },
        { $inc: { availableSeats: -numberOfSeats } },
        { new: true, session }
      );

      if (!updatedEvent) {
        const latestEvent = await Event.findById(eventId).session(session);
        if (!latestEvent) throw new AppError('Event no longer exists.', 404);
        if (latestEvent.eventDate <= new Date()) {
          throw new AppError('You cannot register for a past event.', 400);
        }
        throw new AppError(
          `Only ${latestEvent.availableSeats} seat(s) are currently available.`,
          409
        );
      }

      const [registration] = await Registration.create([{
        userId: req.user._id,
        eventId,
        numberOfSeats,
        totalAmount: Number((event.registrationFee * numberOfSeats).toFixed(2)),
        registrationStatus: 'Confirmed'
      }], { session });

      registrationId = registration._id;
    }, transactionOptions);
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('You have already registered for this event.', 409);
    }
    throw error;
  } finally {
    await session.endSession();
  }

  const populated = await Registration.findById(registrationId)
    .populate('eventId', 'eventName eventDate venue category registrationFee');

  res.status(201).json({
    success: true,
    message: 'Event registration confirmed.',
    registration: populated
  });
});

export const getMyRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ userId: req.user._id })
    .populate('eventId', 'eventName description category eventDate venue registrationFee')
    .sort({ registrationDate: -1 });
  res.status(200).json({ success: true, results: registrations.length, registrations });
});

// This endpoint is restricted to Admin users in registrationRoutes.js.
export const getRegistrationsForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId).select('eventName eventDate venue');
  if (!event) throw new AppError('Event not found.', 404);

  const registrations = await Registration.find({ eventId: event._id })
    .populate('userId', 'name email')
    .sort({ registrationDate: -1 });

  res.status(200).json({
    success: true,
    event,
    results: registrations.length,
    registrations
  });
});

export const cancelRegistration = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let cancelledRegistration;

  try {
    await session.withTransaction(async () => {
      const existing = await Registration.findOne({
        _id: req.params.id,
        userId: req.user._id
      }).session(session);

      if (!existing) throw new AppError('Registration not found for this user.', 404);
      if (existing.registrationStatus === 'Cancelled') {
        throw new AppError('This registration has already been cancelled.', 409);
      }

      const cancelled = await Registration.findOneAndUpdate(
        {
          _id: existing._id,
          userId: req.user._id,
          registrationStatus: 'Confirmed'
        },
        { $set: { registrationStatus: 'Cancelled' } },
        { new: true, session }
      );

      if (!cancelled) {
        throw new AppError('Registration was already changed. Refresh and try again.', 409);
      }

      const event = await Event.findById(existing.eventId).session(session);
      if (!event) {
        throw new AppError(
          'The event could not be found, so the cancellation was not completed.',
          409
        );
      }

      if (event.availableSeats + existing.numberOfSeats > event.totalSeats) {
        throw new AppError('Seat capacity is inconsistent. Cancellation was rolled back.', 409);
      }

      await Event.updateOne(
        { _id: event._id },
        { $inc: { availableSeats: existing.numberOfSeats } },
        { session }
      );
      cancelledRegistration = cancelled;
    }, transactionOptions);
  } finally {
    await session.endSession();
  }

  const updatedEvent = await Event.findById(cancelledRegistration.eventId)
    .select('availableSeats');

  res.status(200).json({
    success: true,
    message: 'Registration cancelled and seats restored successfully.',
    registration: cancelledRegistration,
    availableSeats: updatedEvent.availableSeats
  });
});
