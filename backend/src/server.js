/* ============================================================
   SoulGPT — Backend Server
   File: backend/src/server.js
   ============================================================ */

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB }      = require('./models');
const authRoutes         = require('./routes/auth');
const chatRoutes         = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const prayerRoutes       = require('./routes/prayers');
const subscriptionRoutes = require('./routes/subscription');
const { errorHandler }   = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

/** Stable client key for rate limiting (express-rate-limit v7 rejects undefined IPs / keys). */
function clientKey(req) {
  const forwardedFor =
    typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : null;

  return String(
    req.user?.id
      ? `user:${req.user.id}`
      : req.ip || forwardedFor || req.socket?.remoteAddress || 'unknown'
  );
}

// ── Security ──────────────────────────────────────────────
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : [];

app.use(helmet());

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost =
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      if (isLocalhost) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('Blocked CORS origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Rate Limiting ─────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      300,
  message:  { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => clientKey(req),
});

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      5,               // Free tier: 5 messages per hour
  keyGenerator: (req) => clientKey(req),
  skip:     (req) => req.user?.plan === 'premium', // Premium users skip limit
  message: { error: 'Hourly message limit reached. Upgrade to Premium for higher limits.' },
});

app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/chat',         chatLimiter, chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/prayers',      prayerRoutes);
app.use('/api/subscription', subscriptionRoutes);

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Error Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('\n✖ MongoDB connection failed:', err.message);
    const authFailed =
      /auth|authentication/i.test(String(err.message)) ||
      String(err.message).includes('bad auth');
    console.error(
      '  → Set MONGODB_URI in backend/.env (see backend/.env.example).\n' +
        (authFailed
          ? '  → "Bad auth" / authentication failed: use the Database User name + password from Atlas → Database Access\n' +
            '    (not your Atlas login email). Reset the DB user password if unsure, then paste the new password into the URI.\n' +
            '    URL-encode special characters in the password (@ → %40, # → %23, : → %3A, / → %2F, etc.).\n'
          : '') +
        '  → Atlas: Network Access must allow your IP (0.0.0.0/0 for dev).\n' +
        '  → Local MongoDB: mongodb://127.0.0.1:27017/soulgpt\n'
    );
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✦ SoulGPT API running on port ${PORT}`);
    const key = process.env.ANTHROPIC_API_KEY || '';
    if (!key || key.includes('...') || key.length < 20) {
      console.warn(
        '⚠ ANTHROPIC_API_KEY missing or looks like a placeholder — set a real key in backend/.env or chat will fail.'
      );
    }
  });
}

start();

module.exports = app;
