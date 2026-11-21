import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Waitlist from '../models/Waitlist.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  sendBookingConfirmation,
  sendWaitlistPromotion
} from '../services/emailService.js';

const transactionOptions = {
  readPreference: 'primary',
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' }
};

function newTicketCode() {
  return randomBytes(24).toString('hex');
}

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
          `Only ${latestEvent.availableSeats} seat(s) are currently available. Join the waitlist if you need more seats.`,
          409
        );
      }

      const [registration] = await Registration.create([{
        userId: req.user._id,
        eventId,
        numberOfSeats,
        totalAmount: Number((event.registrationFee * numberOfSeats).toFixed(2)),
        registrationStatus: 'Confirmed',
        ticketCode: newTicketCode()
      }], { session });

      await Waitlist.updateOne(
        { userId: req.user._id, eventId, status: 'Waiting' },
        { $set: { status: 'Cancelled' } },
        { session }
      );

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
  const user = await User.findById(req.user._id).select('name email');

  // Email delivery is best-effort; a mail-provider outage must not undo a paid/confirmed booking.
  await sendBookingConfirmation({
    user,
    event: populated.eventId,
    registration: populated
  });

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

  res.status(200).json({
    success: true,
    results: registrations.length,
    registrations
  });
});

export const getRegistrationsForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId)
    .select('eventName eventDate venue');

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
  let promotedRegistrationIds = [];

  try {
    await session.withTransaction(async () => {
      promotedRegistrationIds = [];

      const existing = await Registration.findOne({
        _id: req.params.id,
        userId: req.user._id
      }).session(session);

      if (!existing) {
        throw new AppError('Registration not found for this user.', 404);
      }
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

      const restoredEvent = await Event.findOneAndUpdate(
        {
          _id: event._id,
          availableSeats: { $lte: event.totalSeats - existing.numberOfSeats }
        },
        { $inc: { availableSeats: existing.numberOfSeats } },
        { new: true, session }
      );

      if (!restoredEvent) {
        throw new AppError('Seat capacity is inconsistent. Cancellation was rolled back.', 409);
      }

      // Strict FIFO promotion: only the oldest waiting request can be promoted.
      // If its party size does not fit, later smaller parties do not jump the queue.
      let remainingSeats = restoredEvent.availableSeats;

      while (true) {
        const next = await Waitlist.findOne({
          eventId: event._id,
          status: 'Waiting'
        })
          .sort({ joinedAt: 1, _id: 1 })
          .session(session);

        if (!next || remainingSeats < next.numberOfSeats) break;

        const reservedEvent = await Event.findOneAndUpdate(
          {
            _id: event._id,
            availableSeats: { $gte: next.numberOfSeats }
          },
          { $inc: { availableSeats: -next.numberOfSeats } },
          { new: true, session }
        );

        if (!reservedEvent) break;

        const [promoted] = await Registration.create([{
          userId: next.userId,
          eventId: event._id,
          numberOfSeats: next.numberOfSeats,
          totalAmount: Number((event.registrationFee * next.numberOfSeats).toFixed(2)),
          registrationStatus: 'Confirmed',
          ticketCode: newTicketCode()
        }], { session });

        const waitlistUpdate = await Waitlist.updateOne(
          { _id: next._id, status: 'Waiting' },
          {
            $set: {
              status: 'Promoted',
              promotedAt: new Date(),
              promotedRegistrationId: promoted._id
            }
          },
          { session }
        );

        if (waitlistUpdate.modifiedCount !== 1) {
          throw new AppError('Waitlist entry changed during promotion. Please retry.', 409);
        }

        promotedRegistrationIds.push(promoted._id);
        remainingSeats = reservedEvent.availableSeats;
      }

      cancelledRegistration = cancelled;
    }, transactionOptions);
  } finally {
    await session.endSession();
  }

  const promotedRegistrations = await Registration.find({
    _id: { $in: promotedRegistrationIds }
  })
    .populate('eventId', 'eventName eventDate venue category registrationFee')
    .populate('userId', 'name email');

  for (const promoted of promotedRegistrations) {
    await sendWaitlistPromotion({
      user: promoted.userId,
      event: promoted.eventId,
      registration: promoted
    });
  }

  const updatedEvent = await Event.findById(cancelledRegistration.eventId)
    .select('availableSeats');

  res.status(200).json({
    success: true,
    message: 'Registration cancelled and seats restored successfully.',
    registration: cancelledRegistration,
    availableSeats: updatedEvent.availableSeats,
    promotedFromWaitlist: promotedRegistrations.map((item) => ({
      registrationId: item._id,
      userId: item.userId?._id,
      ticketCode: item.ticketCode
    }))
  });
});

export const joinWaitlist = asyncHandler(async (req, res) => {
  const { eventId, numberOfSeats } = req.body;
  const event = await Event.findById(eventId);

  if (!event) throw new AppError('Event not found.', 404);
  if (event.eventDate <= new Date()) {
    throw new AppError('You cannot join the waitlist for a past event.', 400);
  }
  if (event.availableSeats >= numberOfSeats) {
    throw new AppError('Enough seats are currently available. Register directly instead.', 409);
  }

  const registration = await Registration.findOne({
    userId: req.user._id,
    eventId
  });
  if (registration) {
    throw new AppError('A registration already exists for this event.', 409);
  }

  const existing = await Waitlist.findOne({
    userId: req.user._id,
    eventId
  });

  if (existing?.status === 'Waiting') {
    throw new AppError('You are already on this event waitlist.', 409);
  }
  if (existing) {
    throw new AppError('A waitlist request already exists for this event.', 409);
  }

  try {
    const waitlistEntry = await Waitlist.create({
      userId: req.user._id,
      eventId,
      numberOfSeats,
      status: 'Waiting'
    });

    res.status(201).json({
      success: true,
      message: 'You have joined the event waitlist.',
      waitlistEntry
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('You already have a waitlist entry for this event.', 409);
    }
    throw error;
  }
});

export const getMyWaitlist = asyncHandler(async (req, res) => {
  const entries = await Waitlist.find({ userId: req.user._id })
    .populate('eventId', 'eventName eventDate venue category')
    .populate('promotedRegistrationId', 'registrationStatus ticketCode')
    .sort({ joinedAt: -1 });

  res.status(200).json({
    success: true,
    results: entries.length,
    waitlist: entries
  });
});

export const getEventWaitlist = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId).select('eventName eventDate venue');
  if (!event) throw new AppError('Event not found.', 404);

  const entries = await Waitlist.find({
    eventId: event._id,
    status: 'Waiting'
  })
    .populate('userId', 'name email')
    .sort({ joinedAt: 1 });

  res.status(200).json({
    success: true,
    event,
    results: entries.length,
    waitlist: entries
  });
});

export const getRegistrationTicket = asyncHandler(async (req, res) => {
  let registration = await Registration.findById(req.params.id)
    .populate('eventId', 'eventName eventDate venue category')
    .populate('userId', 'name email');

  if (!registration) throw new AppError('Registration not found.', 404);

  const isOwner = String(registration.userId?._id) === String(req.user._id);
  if (!isOwner && req.user.role !== 'Admin') {
    throw new AppError('You are not allowed to view this ticket.', 403);
  }
  if (registration.registrationStatus !== 'Confirmed') {
    throw new AppError('Cancelled registrations do not have valid tickets.', 409);
  }

  // Backfill a ticket code for registrations created before ticketing was introduced.
  if (!registration.ticketCode) {
    await Registration.updateOne(
      { _id: registration._id, ticketCode: { $exists: false } },
      { $set: { ticketCode: newTicketCode() } }
    );
    registration = await Registration.findById(req.params.id)
      .populate('eventId', 'eventName eventDate venue category')
      .populate('userId', 'name email');
  }

  const qrPayload = `EVENTEASE:TICKET:${registration.ticketCode}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&format=svg&data=${encodeURIComponent(qrPayload)}`;

  res.status(200).json({
    success: true,
    ticket: {
      registrationId: registration._id,
      ticketCode: registration.ticketCode,
      qrPayload,
      qrImageUrl,
      checkedInAt: registration.checkedInAt,
      registrationStatus: registration.registrationStatus,
      numberOfSeats: registration.numberOfSeats,
      totalAmount: registration.totalAmount,
      event: registration.eventId,
      attendee: registration.userId
    }
  });
});

export const verifyTicket = asyncHandler(async (req, res) => {
  const ticketCode = req.body.ticketCode.trim();
  const registration = await Registration.findOne({ ticketCode });

  if (!registration) throw new AppError('Ticket code is invalid.', 404);
  if (registration.registrationStatus !== 'Confirmed') {
    throw new AppError('This ticket is no longer valid.', 409);
  }
  if (registration.checkedInAt) {
    throw new AppError('This ticket has already been checked in.', 409);
  }

  const checkedIn = await Registration.findOneAndUpdate(
    {
      _id: registration._id,
      registrationStatus: 'Confirmed',
      checkedInAt: null
    },
    {
      $set: {
        checkedInAt: new Date(),
        checkedInBy: req.user._id
      }
    },
    { new: true }
  )
    .populate('userId', 'name email')
    .populate('eventId', 'eventName eventDate venue');

  if (!checkedIn) {
    throw new AppError('Ticket was already checked in by another administrator.', 409);
  }

  res.status(200).json({
    success: true,
    message: 'Ticket verified. Attendee checked in successfully.',
    checkIn: {
      registrationId: checkedIn._id,
      ticketCode: checkedIn.ticketCode,
      attendee: checkedIn.userId,
      event: checkedIn.eventId,
      checkedInAt: checkedIn.checkedInAt,
      numberOfSeats: checkedIn.numberOfSeats
    }
  });
});
