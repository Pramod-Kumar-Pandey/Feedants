const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter. The join endpoint gets a tighter, separate
 * limiter below since it's the one endpoint most worth protecting from
 * abuse/bot double-clicking under a "thousands of concurrent users" load.
 */
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please slow down.' } },
});

const joinLimiter = rateLimit({
  windowMs: 60_000,
  max: 10, // a genuine user never needs to hit "join" 10x/min
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, error: { message: 'Too many join attempts, please wait a moment.' } },
});

module.exports = { apiLimiter, joinLimiter };
