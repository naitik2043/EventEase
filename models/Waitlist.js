import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    numberOfSeats: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger
    },
    status: {
      type: String,
      enum: ['Waiting', 'Promoted', 'Cancelled'],
      default: 'Waiting',
      index: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    promotedAt: {
      type: Date,
      default: null
    },
    promotedRegistrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      default: null
    }
  },
  { timestamps: true }
);

// Only one active queue position is allowed per attendee and event.
waitlistSchema.index(
  { userId: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { status: 'Waiting' } }
);
waitlistSchema.index({ eventId: 1, status: 1, joinedAt: 1 });

const Waitlist = mongoose.model('Waitlist', waitlistSchema);
export default Waitlist;
