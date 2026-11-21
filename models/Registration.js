import mongoose from 'mongoose';

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

const Registration = mongoose.model('Registration', registrationSchema);
export default Registration;
