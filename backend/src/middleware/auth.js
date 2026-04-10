/* ============================================================
   SoulGPT — Auth Middleware
   File: backend/src/middleware/auth.js
   ============================================================ */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * requireAuth — blocks unauthenticated requests
 */
async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * optionalAuth — attaches user if token present, continues without if not
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    }
  } catch { /* no-op */ }
  next();
}

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

module.exports = { requireAuth, optionalAuth };
