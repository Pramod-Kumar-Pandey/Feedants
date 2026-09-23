const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * One document per (user, competition) registration.
 *
 * The unique compound index on {competitionId, userId} is the real
 * concurrency guard against double-registration: even if two requests from
 * the same user race past the application-level check simultaneously,
 * MongoDB will reject the second insert with an E11000 duplicate key error,
 * which the controller translates into a clean 409 response. This is
 * cheaper and more reliable than any amount of in-app locking.
 */
const ParticipationSchema = new Schema(
  {
    competitionId: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    status: {
      type: String,
      enum: ['REGISTERED', 'WITHDRAWN'],
      default: 'REGISTERED',
    },

    paymentStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'PAID', 'REFUNDED'],
      default: 'NOT_REQUIRED',
    },

    joinedAt: { type: Date, default: Date.now },
    withdrawnAt: { type: Date },

    // Denormalized snapshot fields for cheap leaderboard/history reads
    // without joining back to Competition every time.
    score: { type: Number, default: 0 },
    rank: { type: Number },
  },
  { timestamps: true }
);

// The critical constraint: one active registration record per user per
// competition. We keep WITHDRAWN rows (rather than deleting) for audit
// history, so uniqueness is scoped with a partial index that only applies
// to REGISTERED rows — this lets a user re-join after withdrawing.
ParticipationSchema.index(
  { competitionId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: 'REGISTERED' } }
);

ParticipationSchema.index({ competitionId: 1, score: -1 }); // leaderboard queries
ParticipationSchema.index({ userId: 1, createdAt: -1 }); // "my competitions"

module.exports = mongoose.model('Participation', ParticipationSchema);
