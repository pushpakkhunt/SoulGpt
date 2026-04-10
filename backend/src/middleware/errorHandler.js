/* ============================================================
   SoulGPT — Error Handler Middleware
   File: backend/src/middleware/errorHandler.js
   ============================================================ */

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[SoulGPT Error] ${err.message}`, err.stack);

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id', message: err.message });
  }

  // Mongoose document validation (has .errors); not express-rate-limit ValidationError
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      error: 'Validation error',
      details: Object.values(err.errors).map(e => e.message),
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired — please log in again' });
  }

  // Default — surface message for non-500 or when status was set (e.g. AI upstream 502)
  const statusCode = err.statusCode || 500;
  const hideDetails = statusCode === 500 && process.env.NODE_ENV === 'production';
  const message = hideDetails ? 'Internal server error' : err.message;

  res.status(statusCode).json({ error: message });
}

module.exports = { errorHandler };
