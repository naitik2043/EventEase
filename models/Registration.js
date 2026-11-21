import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

const registrationSchema = new mongoose.Schema(
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
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    ticketCode: {
      type: String,
      required: true,
      immutable: true,
      default: () => randomBytes(24).toString('hex')
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    registrationStatus: {
      type: String,
      enum: ['Confirmed', 'Cancelled'],
      default: 'Confirmed'
    }
  },
  { timestamps: true }
);

// A user may create only one registration record for a particular event.
// This remains unique even after cancellation, matching the assessment rule.
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
registrationSchema.index({ eventId: 1, registrationStatus: 1 });
// Partial index keeps legacy documents without ticketCode valid during migration.
registrationSchema.index(
  { ticketCode: 1 },
  { unique: true, partialFilterExpression: { ticketCode: { $type: 'string' } } }
);

const Registration = mongoose.model('Registration', registrationSchema);
export default Registration;
