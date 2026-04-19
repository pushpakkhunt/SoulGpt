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
       serverSelectionTimeoutMS: 12000,
     });
   
     console.log('✦ MongoDB connected');
   }
   
   // ═══════════════════════════════════════════════════════════
   //  USER MODEL
   // ═══════════════════════════════════════════════════════════
   const userSchema = new mongoose.Schema(
     {
       name: {
         type: String,
         required: true,
         trim: true,
         minlength: 2,
         maxlength: 50,
       },
       email: {
         type: String,
         required: true,
         unique: true,
         index: true,
         lowercase: true,
         trim: true,
         maxlength: 254,
         match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
       },
       passwordHash: {
         type: String,
         required: true,
         select: false,
       },
   
       plan: {
         type: String,
         enum: ['free', 'premium'],
         default: 'free',
       },
   
       // Stripe subscription
       stripeCustomerId: {
         type: String,
         default: null,
       },
       stripeSubscriptionId: {
         type: String,
         default: null,
       },
       subscriptionEndsAt: {
         type: Date,
         default: null,
       },
   
       // Preferences
       preferredTradition: {
         type: String,
         enum: ['all', 'hindu', 'islam', 'christian', 'jain', 'sikh', 'buddhist'],
         default: 'all',
       },
       preferredLanguage: {
         type: String,
         enum: ['en', 'hi', 'gu'],
         default: 'en',
       },
   
       lastLoginAt: {
         type: Date,
         default: null,
       },
     },
     {
       timestamps: true,
     }
   );
   
   userSchema.index({ email: 1 }, { unique: true });
   
   const User = mongoose.model('User', userSchema);
   
   // ═══════════════════════════════════════════════════════════
   //  CONVERSATION MODEL
   // ═══════════════════════════════════════════════════════════
   const messageSchema = new mongoose.Schema(
     {
       role: {
         type: String,
         enum: ['user', 'assistant'],
         required: true,
       },
       content: {
         type: String,
         required: true,
         maxlength: 5000,
       },
       tradition: {
         type: String,
         default: null,
         maxlength: 40,
       },
       citation: {
         type: String,
         default: null,
         maxlength: 300,
       },
       intent: {
         type: String,
         default: null,
         maxlength: 50,
       },
       teaching: {
         type: String,
         default: null,
         maxlength: 240,
       },
       practice: {
         type: String,
         default: null,
         maxlength: 300,
       },
       reflection: {
         type: String,
         default: null,
         maxlength: 300,
       },
       next_step: {
         type: String,
         default: null,
         maxlength: 300,
       },
       follow_up_options: {
         type: [String],
         default: [],
         validate: {
           validator: function (arr) {
             return Array.isArray(arr) && arr.length <= 3;
           },
           message: 'follow_up_options can contain at most 3 items',
         },
       },
       return_prompt: {
         type: String,
         default: null,
         maxlength: 300,
       },
       timestamp: {
         type: Date,
         default: Date.now,
       },
     },
     { _id: false }
   );
   
   const conversationSchema = new mongoose.Schema(
     {
       userId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
         index: true,
       },
       title: {
         type: String,
         default: 'Spiritual Conversation',
         maxlength: 100,
       },
       tradition: {
         type: String,
         default: 'all',
         maxlength: 40,
       },
       messages: [messageSchema],
     },
     {
       timestamps: true,
     }
   );
   
   conversationSchema.index({ userId: 1, updatedAt: -1 });
   
   /**
    * Count how many user messages were sent today.
    */
   conversationSchema.statics.countTodaysMessages = async function (userId, startOfDay) {
     const conversations = await this.find({
       userId,
       updatedAt: { $gte: startOfDay },
     });
   
     return conversations.reduce((count, conv) => {
       return (
         count +
         conv.messages.filter(
           (m) => m.role === 'user' && m.timestamp >= startOfDay
         ).length
       );
     }, 0);
   };
   
   const Conversation = mongoose.model('Conversation', conversationSchema);
   
   // ═══════════════════════════════════════════════════════════
   //  PRAYER PLAY LOG (for analytics)
   // ═══════════════════════════════════════════════════════════
   const prayerLogSchema = new mongoose.Schema(
     {
       userId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: null,
       },
       prayerKey: {
         type: String,
         required: true,
         maxlength: 120,
       },
       tradition: {
         type: String,
         required: true,
         maxlength: 40,
       },
       ip: {
         type: String,
         default: null,
         maxlength: 100,
       },
       playedAt: {
         type: Date,
         default: Date.now,
       },
     },
     {
       timestamps: false,
     }
   );
   
   prayerLogSchema.index({ prayerKey: 1, playedAt: -1 });
   
   const PrayerLog = mongoose.model('PrayerLog', prayerLogSchema);
   
   module.exports = { connectDB, User, Conversation, PrayerLog };