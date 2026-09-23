const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer token and attaches { id, email } to req.user.
 * Minimal by design — see README "assumptions" for why full auth is out
 * of scope for this assignment.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
}

/**
 * Like requireAuth but does not reject unauthenticated requests — used on
 * GET /competitions/:id so anonymous users can still view details, while
 * logged-in users additionally get their registration state.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
  } catch (err) {
    // Silently ignore a bad/expired token on optional routes.
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
