/**
 * Central error handler. Every controller uses asyncHandler() to funnel
 * thrown/rejected errors here, so error-shape stays consistent across the
 * whole API for the mobile app to rely on.
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Mongo duplicate key (used as a concurrency guard on double-join)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { message: 'You are already registered for this competition.' },
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', details: err.errors },
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: { message: `Invalid id: ${err.value}` } });
  }

  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      details: err.details,
    },
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
