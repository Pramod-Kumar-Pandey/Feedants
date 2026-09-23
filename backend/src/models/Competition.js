const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * A single prize tier, e.g. { rank: 1, amount: 5000, label: '1st Place' }
 */
const PrizeTierSchema = new Schema(
  {
    rank: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    label: { type: String, trim: true },
  },
  { _id: false }
);

/**
 * Competition is the source of truth for competition metadata and the
 * *denormalized* participant counter (currentParticipantsCount).
 *
 * Design decision: we store currentParticipantsCount directly on the
 * document instead of always doing Participation.countDocuments(), because
 * this field is read on every single "view details" request (thousands of
 * concurrent users). A denormalized counter kept in sync via atomic
 * $inc/$dec inside a transaction gives us O(1) reads at the cost of extra
 * write-path complexity, which is the right trade-off for a read-heavy
 * details screen.
 *
 * lifecycleStatus (admin-controlled) vs computed status:
 * - `adminStatus` covers states that cannot be derived from dates alone:
 *   DRAFT (not visible to users yet) and CANCELLED (manually pulled).
 * - Everything else (UPCOMING / REGISTRATION_OPEN / REGISTRATION_CLOSED /
 *   ONGOING / ENDED) is derived at read-time from the current time and the
 *   competition's date fields (see services/competitionStatus.js). This
 *   avoids relying on a cron job to "flip" status fields, which would
 *   otherwise create a window where stale state is served.
 */
const CompetitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, index: true },
    shortDescription: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    rules: [{ type: String, trim: true }],

    category: { type: String, trim: true, index: true },
    bannerImageUrl: { type: String, trim: true },
    thumbnailImageUrl: { type: String, trim: true },

    entryFee: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },

    prizePool: { type: Number, required: true, default: 0, min: 0 },
    prizeTiers: [PrizeTierSchema],

    // null/undefined => unlimited participants
    maxParticipants: { type: Number, default: null, min: 1 },
    currentParticipantsCount: { type: Number, default: 0, min: 0 },

    registrationOpensAt: { type: Date, required: true },
    registrationClosesAt: { type: Date, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Manually controlled states that cannot be derived from dates.
    adminStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'CANCELLED'],
      default: 'PUBLISHED',
    },

    organizer: {
      name: { type: String, trim: true },
      logoUrl: { type: String, trim: true },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Optimistic-concurrency safety net in addition to the atomic
    // conditional update used for join/leave (see controller). Mongoose
    // bumps this automatically when `optimisticConcurrency` is enabled.
  },
  { timestamps: true, optimisticConcurrency: true }
);

CompetitionSchema.index({ startDate: 1 });
CompetitionSchema.index({ registrationClosesAt: 1 });
CompetitionSchema.index({ adminStatus: 1, startDate: 1 });

// Validate date ordering at the schema level so bad data can never be saved.
CompetitionSchema.pre('validate', function validateDateOrder(next) {
  if (this.registrationOpensAt && this.registrationClosesAt) {
    if (this.registrationOpensAt > this.registrationClosesAt) {
      return next(new Error('registrationOpensAt must be before registrationClosesAt'));
    }
  }
  if (this.registrationClosesAt && this.startDate) {
    if (this.registrationClosesAt > this.startDate) {
      return next(new Error('registrationClosesAt must be before or equal to startDate'));
    }
  }
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('startDate must be before endDate'));
  }
  next();
});

module.exports = mongoose.model('Competition', CompetitionSchema);
