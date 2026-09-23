const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Participation = require('../models/Participation');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/errorHandler');
const {
  buildCompetitionView,
  computeStatus,
  STATUS,
} = require('../services/competitionStatus');

/**
 * GET /api/competitions/:id
 *
 * Read path is optimized for the "thousands of concurrent users" case:
 * two simple indexed reads (Competition by _id, Participation by compound
 * index), no aggregation pipeline, no locking. currentParticipantsCount is
 * read directly off the Competition doc rather than counted live.
 */
const getCompetitionDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const competition = await Competition.findById(id).lean();
  if (!competition || competition.adminStatus === 'DRAFT') {
    // Treat DRAFT as not-found for anyone who isn't the owner/admin —
    // avoids leaking unpublished competitions via a guessed id.
    if (!(req.user && String(competition?.createdBy) === req.user.id)) {
      throw new ApiError(404, 'Competition not found');
    }
  }

  let participation = null;
  if (req.user) {
    participation = await Participation.findOne({
      competitionId: id,
      userId: req.user.id,
      status: 'REGISTERED',
    }).lean();
  }

  const view = buildCompetitionView(competition, participation, new Date());
  return ok(res, view);
});

/**
 * GET /api/competitions
 * Lightweight list endpoint (not the focus of the assignment, included so
 * the details screen has something realistic to navigate from).
 */
const listCompetitions = asyncHandler(async (req, res) => {
  const { category, page, limit } = req.query;

  const filter = { adminStatus: 'PUBLISHED' };
  if (category) filter.category = category;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Competition.find(filter).sort({ startDate: 1 }).skip(skip).limit(limit).lean(),
    Competition.countDocuments(filter),
  ]);

  const now = new Date();
  const data = items.map((c) => ({
    id: c._id,
    title: c.title,
    thumbnailImageUrl: c.thumbnailImageUrl,
    prizePool: c.prizePool,
    startDate: c.startDate,
    status: computeStatus(c, now),
  }));

  return ok(res, { items: data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

/**
 * POST /api/competitions/:id/join
 *
 * This is the concurrency-critical path. Requirements:
 *   1. A user can never end up registered twice for the same competition.
 *   2. A competition can never accept more registrations than
 *      maxParticipants, even with many simultaneous requests for the last
 *      remaining spot.
 *   3. The participant counter and the participation record must never
 *      drift apart (no "phantom" registrations, no undercounted spots).
 *
 * Approach: a MongoDB session transaction wrapping
 *   (a) a conditional atomic increment on Competition
 *       (`$inc` guarded by `$expr: currentParticipantsCount < maxParticipants`)
 *   (b) an insert into Participation, protected by the partial unique index
 *       on {competitionId, userId, status: REGISTERED}.
 *
 * Both operations either both commit or both roll back. The atomic $inc
 * with a matching filter means the "read remaining spots, then decide to
 * increment" check-then-act race is impossible — MongoDB evaluates the
 * condition and the increment as a single atomic operation per document.
 * The unique index is what catches the "double click / double request"
 * race for the same user, independent of the transaction.
 */
const joinCompetition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const competition = await Competition.findById(id).lean();
  if (!competition || competition.adminStatus !== 'PUBLISHED') {
    throw new ApiError(404, 'Competition not found');
  }

  const status = computeStatus(competition, new Date());
  if (status !== STATUS.REGISTRATION_OPEN) {
    throw new ApiError(409, `Registration is not open (current status: ${status})`);
  }

  const session = await mongoose.startSession();
  try {
    let joinedParticipation;

    await session.withTransaction(async () => {
      // Step 1: atomically reserve a spot, if there is one.
      // maxParticipants === null means unlimited, so we skip the guard.
      const filter = { _id: id };
      if (competition.maxParticipants != null) {
        filter.$expr = { $lt: ['$currentParticipantsCount', competition.maxParticipants] };
      }

      const updated = await Competition.findOneAndUpdate(
        filter,
        { $inc: { currentParticipantsCount: 1 } },
        { new: true, session }
      );

      if (!updated) {
        // Either the competition vanished, or (far more likely) someone
        // else took the last spot between our read above and now.
        throw new ApiError(409, 'This competition is now full.');
      }

      // Step 2: create the participation record. If this user already has
      // a REGISTERED row, the partial unique index throws E11000, which
      // rolls back the whole transaction — including the increment above.
      const [participation] = await Participation.create(
        [
          {
            competitionId: id,
            userId,
            status: 'REGISTERED',
            paymentStatus: competition.entryFee > 0 ? 'PENDING' : 'NOT_REQUIRED',
          },
        ],
        { session }
      );

      joinedParticipation = participation;
    });

    return ok(
      res,
      {
        joined: true,
        participation: {
          joinedAt: joinedParticipation.joinedAt,
          status: joinedParticipation.status,
          paymentStatus: joinedParticipation.paymentStatus,
        },
      },
      201
    );
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'You are already registered for this competition.');
    }
    throw err;
  } finally {
    session.endSession();
  }
});

/**
 * DELETE /api/competitions/:id/join  (withdraw / leave)
 *
 * Symmetric transaction: flip the participation to WITHDRAWN and
 * decrement the counter atomically. Business rule: withdrawal is only
 * allowed while registration is still open — once the competition has
 * started, seats aren't "given back" (matches how most live competitions
 * behave, and avoids a spot being re-opened mid-event only to be
 * immediately unusable).
 */
const leaveCompetition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const competition = await Competition.findById(id).lean();
  if (!competition) throw new ApiError(404, 'Competition not found');

  const status = computeStatus(competition, new Date());
  if (status !== STATUS.REGISTRATION_OPEN) {
    throw new ApiError(409, `You can no longer leave this competition (status: ${status})`);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const participation = await Participation.findOneAndUpdate(
        { competitionId: id, userId, status: 'REGISTERED' },
        { $set: { status: 'WITHDRAWN', withdrawnAt: new Date() } },
        { session }
      );

      if (!participation) {
        throw new ApiError(404, 'You are not registered for this competition.');
      }

      await Competition.updateOne(
        { _id: id, currentParticipantsCount: { $gt: 0 } },
        { $inc: { currentParticipantsCount: -1 } },
        { session }
      );
    });

    return ok(res, { joined: false });
  } finally {
    session.endSession();
  }
});

/**
 * GET /api/competitions/:id/leaderboard
 * Paginated, indexed on {competitionId, score: -1}. Kept simple since
 * scoring mechanics are outside this assignment's scope.
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Participation.find({ competitionId: id, status: 'REGISTERED' })
      .sort({ score: -1, joinedAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name avatarUrl')
      .lean(),
    Participation.countDocuments({ competitionId: id, status: 'REGISTERED' }),
  ]);

  const data = items.map((p, idx) => ({
    rank: skip + idx + 1,
    userId: p.userId?._id,
    name: p.userId?.name,
    avatarUrl: p.userId?.avatarUrl,
    score: p.score,
  }));

  return ok(res, { items: data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = {
  getCompetitionDetails,
  listCompetitions,
  joinCompetition,
  leaveCompetition,
  getLeaderboard,
};
