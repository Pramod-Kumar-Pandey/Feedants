const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Minimal login for the assignment demo — issues a JWT the mobile app
 * attaches as `Authorization: Bearer <token>`. Not meant to represent a
 * production auth system (see README).
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, 'Invalid credentials');

  const token = jwt.sign({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  return ok(res, {
    token,
    user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
  });
});

module.exports = { login };
