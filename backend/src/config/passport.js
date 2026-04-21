/* ============================================================
   SoulGPT — Passport Config
   File: backend/src/config/passport.js
   ============================================================ */

   const passport = require('passport');
   const GoogleStrategy = require('passport-google-oauth20').Strategy;
   const { User } = require('../models');
   
   passport.use(
     new GoogleStrategy(
       {
         clientID: process.env.GOOGLE_CLIENT_ID,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
         callbackURL: '/api/auth/google/callback',
       },
       async (accessToken, refreshToken, profile, done) => {
         try {
           const email = profile.emails?.[0]?.value?.toLowerCase()?.trim();
   
           if (!email) {
             return done(new Error('Google account did not provide an email'), null);
           }
   
           let user = await User.findOne({ email });
   
           if (!user) {
             user = await User.create({
               name: profile.displayName?.trim() || 'Google User',
               email,
               plan: 'free',
               authProvider: 'google',
               googleId: profile.id,
               emailVerified: true,
               lastLoginAt: new Date(),
             });
   
             return done(null, user);
           }
   
           let changed = false;
   
           if (user.authProvider !== 'google') {
             user.authProvider = 'google';
             changed = true;
           }
   
           if (!user.googleId) {
             user.googleId = profile.id;
             changed = true;
           }
   
           if (user.emailVerified !== true) {
             user.emailVerified = true;
             changed = true;
           }
   
           user.lastLoginAt = new Date();
           changed = true;
   
           if (changed) {
             await user.save();
           }
   
           return done(null, user);
         } catch (err) {
           return done(err, null);
         }
       }
     )
   );
   
   module.exports = passport;