import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      minlength: 3,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: 60
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required']
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
      maxlength: 200
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats are required'],
      min: 1,
      validate: Number.isInteger
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger
    },
    waitlistRequests: {
      type: Number,
      min: 0,
      default: 0,
      validate: Number.isInteger
    },
    registrationFee: {
      type: Number,
      required: true,
      min: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

eventSchema.index({ eventDate: 1 });
eventSchema.index({ category: 1, eventDate: 1 });
eventSchema.index({ eventName: 'text', description: 'text' });

const Event = mongoose.model('Event', eventSchema);
export default Event;
