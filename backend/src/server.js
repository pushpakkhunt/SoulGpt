/* ============================================================
   SoulGPT — Backend Server
   File: backend/src/server.js
   ============================================================ */

   require('dotenv').config();

   const express = require('express');
   const cors = require('cors');
   const helmet = require('helmet');
   const rateLimit = require('express-rate-limit');
   const session = require('express-session');
   const passport = require('./config/passport');
   
   const { connectDB } = require('./models');
   const authRoutes = require('./routes/auth');
   const chatRoutes = require('./routes/chat');
   const conversationRoutes = require('./routes/conversations');
   const prayerRoutes = require('./routes/prayers');
   const subscriptionRoutes = require('./routes/subscription');
   const { errorHandler } = require('./middleware/errorHandler');
   
   const app = express();
   const PORT = process.env.PORT || 3001;
   
   app.set('trust proxy', 1);
   
   /** Stable client key for rate limiting */
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
   
   // ── Security / CORS ─────────────────────────────────────────
   const envOrigins = (process.env.FRONTEND_URL || '')
     .split(',')
     .map((s) => s.trim())
     .filter(Boolean);
   
   const allowedOrigins = new Set([
     'http://localhost:5173',
     'http://127.0.0.1:5173',
     'https://soulgptai.com',
     'https://www.soulgptai.com',
     ...envOrigins,
   ]);
   
   console.log('Allowed CORS origins:', [...allowedOrigins]);
   
   app.use(helmet());
   
   const corsOptions = {
     origin(origin, callback) {
       if (!origin) {
         return callback(null, true);
       }
   
       if (allowedOrigins.has(origin)) {
         return callback(null, true);
       }
   
       console.log('Blocked CORS origin:', origin);
       return callback(null, false);
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization'],
     optionsSuccessStatus: 204,
   };
   
   app.use(cors(corsOptions));
   app.options(/.*/, cors(corsOptions));
   
   // ── Body Parsing ────────────────────────────────────────────
   app.use(express.json({ limit: '10kb' }));
   
   // ── Session / Passport ─────────────────────────────────────
   app.use(
     session({
       secret: process.env.SESSION_SECRET || 'soulgpt-secret',
       resave: false,
       saveUninitialized: false,
     })
   );
   
   app.use(passport.initialize());
   
   // ── Rate Limiting ───────────────────────────────────────────
   const globalLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 300,
     message: { error: 'Too many requests, please try again later.' },
     keyGenerator: (req) => clientKey(req),
   });
   
   const chatLimiter = rateLimit({
     windowMs: 60 * 60 * 1000,
     max: 100,
     keyGenerator: (req) => clientKey(req),
     skip: (req) => req.user?.plan === 'premium',
     message: {
       error: 'Hourly message limit reached. Upgrade to Premium for higher limits.',
     },
   });
   
   app.use(globalLimiter);
   
   // ── Routes ──────────────────────────────────────────────────
   app.get('/api/health', (req, res) => {
     res.json({ status: 'ok' });
   });
   
   app.use('/api/auth', authRoutes);
   app.use('/api/chat', chatLimiter, chatRoutes);
   app.use('/api/conversations', conversationRoutes);
   app.use('/api/prayers', prayerRoutes);
   app.use('/api/subscription', subscriptionRoutes);
   
   // ── 404 Handler ─────────────────────────────────────────────
   app.use((req, res) => {
     res.status(404).json({ error: 'Route not found' });
   });
   
   // ── Error Handler ───────────────────────────────────────────
   app.use(errorHandler);
   
   // ── Startup ────────────────────────────────────────────────
   async function start() {
     try {
       await connectDB();
       console.log('✦ MongoDB connected');
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
   
       if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
         console.warn(
           '⚠ Google OAuth env vars are missing. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET must be set for Google login.'
         );
       }
     });
   }
   
   start();
   
   module.exports = app;