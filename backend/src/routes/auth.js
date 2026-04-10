/* ============================================================
   SoulGPT — Auth Routes
   File: backend/src/routes/auth.js
   ============================================================ */

const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '30d';

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * POST /api/auth/signup
 */
router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 chars'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password } = req.body;

      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash, plan: 'free' });
      const token = signToken(user._id);

      res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, plan: user.plan, remainingToday: 5 },
      });
    } catch (err) { next(err); }
  }
);

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = signToken(user._id);

      // Calculate remaining messages today
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const usedToday = user.plan === 'free'
        ? await require('../models/Conversation').countTodaysMessages(user._id, today)
        : 0;

      res.json({
        token,
        user: {
          id:             user._id,
          name:           user.name,
          email:          user.email,
          plan:           user.plan,
          remainingToday: Math.max(0, 5 - usedToday),
        },
      });
    } catch (err) { next(err); }
  }
);

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const usedToday = user.plan === 'free'
      ? await require('../models/Conversation').countTodaysMessages(user._id, today)
      : 0;

    res.json({
      user: {
        id:             user._id,
        name:           user.name,
        email:          user.email,
        plan:           user.plan,
        remainingToday: Math.max(0, 5 - usedToday),
        createdAt:      user.createdAt,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
