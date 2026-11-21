import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getOverviewAnalytics = asyncHandler(async (_req, res) => {
  const now = new Date();

  const [users, upcomingEvents, eventCount, registrationStats, topEvents, recentRegistrations] = await Promise.all([
    User.countDocuments(),
    Event.countDocuments({ eventDate: { $gt: now } }),
    Event.countDocuments(),
    Registration.aggregate([
      {
        $group: {
          _id: '$registrationStatus',
          registrations: { $sum: 1 },
          seats: { $sum: '$numberOfSeats' },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$registrationStatus', 'Confirmed'] }, '$totalAmount', 0]
            }
          }
        }
      }
    ]),
    Event.aggregate([
      {
        $lookup: {
          from: 'registrations',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$eventId', '$$eventId'] },
                registrationStatus: 'Confirmed'
              }
            },
            {
              $group: {
                _id: null,
                registrations: { $sum: 1 },
                seats: { $sum: '$numberOfSeats' },
                revenue: { $sum: '$totalAmount' }
              }
            }
          ],
          as: 'bookingStats'
        }
      },
      {
        $addFields: {
          bookingStats: {
            $ifNull: [
              { $arrayElemAt: ['$bookingStats', 0] },
              { registrations: 0, seats: 0, revenue: 0 }
            ]
          }
        }
      },
      { $sort: { 'bookingStats.registrations': -1, eventDate: 1 } },
      { $limit: 5 },
      {
        $project: {
          eventName: 1,
          category: 1,
          eventDate: 1,
          totalSeats: 1,
          availableSeats: 1,
          bookingStats: 1
        }
      }
    ]),
    Registration.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('userId', 'name email')
      .populate('eventId', 'eventName eventDate')
      .select('userId eventId numberOfSeats totalAmount registrationStatus createdAt checkedInAt')
  ]);

  const confirmed = registrationStats.find((item) => item._id === 'Confirmed') || {
    registrations: 0,
    seats: 0,
    revenue: 0
  };
  const cancelled = registrationStats.find((item) => item._id === 'Cancelled') || {
    registrations: 0,
    seats: 0,
    revenue: 0
  };

  res.status(200).json({
    success: true,
    generatedAt: now,
    metrics: {
      totalUsers: users,
      totalEvents: eventCount,
      upcomingEvents,
      confirmedRegistrations: confirmed.registrations,
      cancelledRegistrations: cancelled.registrations,
      confirmedSeats: confirmed.seats,
      grossConfirmedRevenue: Number(confirmed.revenue.toFixed(2))
    },
    topEvents,
    recentRegistrations
  });
});

export const getEventAnalytics = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .select('eventName category eventDate venue totalSeats availableSeats');

  if (!event) throw new AppError('Event not found.', 404);

  const [stats] = await Registration.aggregate([
    { $match: { eventId: event._id } },
    {
      $group: {
        _id: '$registrationStatus',
        registrations: { $sum: 1 },
        seats: { $sum: '$numberOfSeats' },
        revenue: {
          $sum: {
            $cond: [{ $eq: ['$registrationStatus', 'Confirmed'] }, '$totalAmount', 0]
          }
        },
        checkedIn: {
          $sum: {
            $cond: [{ $ne: ['$checkedInAt', null] }, 1, 0]
          }
        }
      }
    }
  ]).then((items) => [items.reduce((result, item) => {
    result[item._id.toLowerCase()] = item;
    return result;
  }, {})]);

  const confirmed = stats?.confirmed || { registrations: 0, seats: 0, revenue: 0, checkedIn: 0 };
  const cancelled = stats?.cancelled || { registrations: 0, seats: 0, revenue: 0, checkedIn: 0 };
  const bookedSeats = event.totalSeats - event.availableSeats;

  res.status(200).json({
    success: true,
    event,
    analytics: {
      registrations: confirmed.registrations,
      cancelledRegistrations: cancelled.registrations,
      confirmedSeats: confirmed.seats,
      availableSeats: event.availableSeats,
      totalSeats: event.totalSeats,
      occupancyRate: event.totalSeats
        ? Number(((bookedSeats / event.totalSeats) * 100).toFixed(1))
        : 0,
      checkIns: confirmed.checkedIn,
      grossConfirmedRevenue: Number(confirmed.revenue.toFixed(2))
    }
  });
});
