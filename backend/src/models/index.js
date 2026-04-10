/* ============================================================
   SoulGPT — Database Models
   File: backend/src/models/index.js
   ============================================================ */

const mongoose = require('mongoose');

// ── Connect ───────────────────────────────────────────────
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/soulgpt';
  if (!process.env.MONGODB_URI) {
    console.warn(
      '⚠ MONGODB_URI not set — using local mongodb://127.0.0.1:27017/soulgpt (start MongoDB or set MONGODB_URI in .env)'
    );
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 12_000,
  });
  console.log('✦ MongoDB connected');
}

// ═══════════════════════════════════════════════════════════
//  USER MODEL
// ═══════════════════════════════════════════════════════════
const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true, maxlength: 50 },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },

  plan:         { type: String, enum: ['free', 'premium'], default: 'free' },

  // Stripe subscription
  stripeCustomerId:     { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  subscriptionEndsAt:   { type: Date,   default: null },

  // Preferences
  preferredTradition: { type: String, default: 'all' },
  preferredLanguage:  { type: String, default: 'en' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const User = mongoose.model('User', userSchema);

// ═══════════════════════════════════════════════════════════
//  CONVERSATION MODEL
// ═══════════════════════════════════════════════════════════
const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true, maxlength: 5000 },
  tradition: { type: String, default: null },
  citation:  { type: String, default: null },
  intent:    { type: String, default: null },
  timestamp: { type: Date,   default: Date.now },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:      { type: String, default: 'Spiritual Conversation', maxlength: 100 },
  tradition:  { type: String, default: 'all' },
  messages:   [messageSchema],
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});

conversationSchema.index({ userId: 1, updatedAt: -1 });

/**
 * Count how many messages a user has sent today (for rate limiting).
 */
conversationSchema.statics.countTodaysMessages = async function(userId, startOfDay) {
  const conversations = await this.find({
    userId,
    updatedAt: { $gte: startOfDay },
  });
  return conversations.reduce((count, conv) => {
    return count + conv.messages.filter(
      m => m.role === 'user' && m.timestamp >= startOfDay
    ).length;
  }, 0);
};

conversationSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

const Conversation = mongoose.model('Conversation', conversationSchema);

// ═══════════════════════════════════════════════════════════
//  PRAYER PLAY LOG (for analytics)
// ═══════════════════════════════════════════════════════════
const prayerLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  prayerKey: { type: String, required: true },
  tradition: { type: String, required: true },
  ip:        { type: String, default: null },
  playedAt:  { type: Date, default: Date.now },
});

prayerLogSchema.index({ prayerKey: 1, playedAt: -1 });

const PrayerLog = mongoose.model('PrayerLog', prayerLogSchema);

module.exports = { connectDB, User, Conversation, PrayerLog };
