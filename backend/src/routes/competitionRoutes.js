const express = require('express');
const {
  getCompetitionDetails,
  listCompetitions,
  joinCompetition,
  leaveCompetition,
  getLeaderboard,
} = require('../controllers/competitionController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { joinLimiter } = require('../middleware/rateLimiter');
const {
  getCompetitionParamsSchema,
  listCompetitionsQuerySchema,
  leaderboardQuerySchema,
  validate,
} = require('../validators/competitionValidators');

const router = express.Router();

router.get('/', validate(listCompetitionsQuerySchema, 'query'), listCompetitions);

router.get(
  '/:id',
  validate(getCompetitionParamsSchema, 'params'),
  optionalAuth, // details are viewable by anyone; registration state only if logged in
  getCompetitionDetails
);

router.post(
  '/:id/join',
  validate(getCompetitionParamsSchema, 'params'),
  requireAuth,
  joinLimiter,
  joinCompetition
);

router.delete(
  '/:id/join',
  validate(getCompetitionParamsSchema, 'params'),
  requireAuth,
  leaveCompetition
);

router.get(
  '/:id/leaderboard',
  validate(getCompetitionParamsSchema, 'params'),
  validate(leaderboardQuerySchema, 'query'),
  getLeaderboard
);

module.exports = router;
