import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createRegistration = asyncHandler(async (req, res) => {
  const { eventId, numberOfSeats } = req.body;
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Event not found.', 404);
  if (event.eventDate <= new Date()) throw new AppError('You cannot register for a past event.', 400);

  const existing = await Registration.findOne({ userId: req.user._id, eventId });
  if (existing) throw new AppError('You have already registered for this event.', 409);

  // Create the unique registration first, then atomically reserve seats.
  // If seat reservation fails, remove the just-created registration as compensation.
  let registration;
  try {
    registration = await Registration.create({
      userId: req.user._id,
      eventId,
      numberOfSeats,
      totalAmount: Number((event.registrationFee * numberOfSeats).toFixed(2)),
      registrationStatus: 'Confirmed'
    });

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: eventId, eventDate: { $gt: new Date() }, availableSeats: { $gte: numberOfSeats } },
      { $inc: { availableSeats: -numberOfSeats } },
      { new: true }
    );

    if (!updatedEvent) {
      await Registration.deleteOne({ _id: registration._id });
      const latestEvent = await Event.findById(eventId);
      if (!latestEvent) throw new AppError('Event no longer exists.', 404);
      if (latestEvent.eventDate <= new Date()) throw new AppError('You cannot register for a past event.', 400);
      throw new AppError(`Only ${latestEvent.availableSeats} seat(s) are currently available.`, 409);
    }
  } catch (error) {
    if (registration?._id) {
      await Registration.deleteOne({ _id: registration._id }).catch(() => {});
    }
    if (error.code === 11000) {
      throw new AppError('You have already registered for this event.', 409);
    }
    throw error;
  }

  const populated = await Registration.findById(registration._id)
    .populate('eventId', 'eventName eventDate venue category registrationFee');
  res.status(201).json({ success: true, message: 'Event registration confirmed.', registration: populated });
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
  const existing = await Registration.findOne({ _id: req.params.id, userId: req.user._id });
  if (!existing) throw new AppError('Registration not found for this user.', 404);
  if (existing.registrationStatus === 'Cancelled') {
    throw new AppError('This registration has already been cancelled.', 409);
  }

  const cancelled = await Registration.findOneAndUpdate(
    { _id: existing._id, userId: req.user._id, registrationStatus: 'Confirmed' },
    { $set: { registrationStatus: 'Cancelled' } },
    { new: true }
  );
  if (!cancelled) throw new AppError('Registration was already changed. Refresh and try again.', 409);

  const restoredEvent = await Event.findOneAndUpdate(
    { _id: existing.eventId },
    { $inc: { availableSeats: existing.numberOfSeats } },
    { new: true }
  );

  if (!restoredEvent) {
    // Compensation: avoid reporting a cancellation if the seats could not be restored.
    await Registration.updateOne(
      { _id: existing._id, registrationStatus: 'Cancelled' },
      { $set: { registrationStatus: 'Confirmed' } }
    );
    throw new AppError('The event could not be found, so the cancellation was not completed.', 409);
  }

  res.status(200).json({
    success: true,
    message: 'Registration cancelled and seats restored successfully.',
    registration: cancelled,
    availableSeats: restoredEvent.availableSeats
  });
});
