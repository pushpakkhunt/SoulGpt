/* ============================================================
   SoulGPT — Auth Routes
   File: backend/src/routes/auth.js
   ============================================================ */

   const express = require('express');
   const router = express.Router();
   const bcrypt = require('bcryptjs');
   const jwt = require('jsonwebtoken');
   const crypto = require('crypto');
   const { body, validationResult } = require('express-validator');
   const passport = require('../config/passport');
   
   const { requireAuth } = require('../middleware/auth');
   const {
     User,
     PendingUserVerification,
     Conversation,
   } = require('../models');
   const { sendVerificationOtp } = require('../services/emailService');
   
   const FREE_DAILY_LIMIT = 5;
   const OTP_TTL_MINUTES = 10;
   const MAX_OTP_ATTEMPTS = 5;
   const MAX_RESEND_COUNT = 3;
   
   function signToken(userId) {
     if (!process.env.JWT_SECRET) {
       const err = new Error('JWT_SECRET is not configured');
       err.statusCode = 500;
       throw err;
     }
   
     return jwt.sign(
       { id: String(userId) },
       process.env.JWT_SECRET,
       { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
     );
   }
   
   function formatValidationErrors(result) {
     return result.array().map((e) => ({
       field: e.path,
       message: e.msg,
     }));
   }
   
   function generateOtp() {
     return String(crypto.randomInt(100000, 1000000));
   }
   
   function getOtpExpiryDate() {
     const expiresAt = new Date();
     expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);
     return expiresAt;
   }
   
   /**
    * POST /api/auth/signup/start
    */
   router.post(
     '/signup/start',
     [
       body('name')
         .trim()
         .isLength({ min: 2, max: 50 })
         .withMessage('Name must be 2-50 characters'),
   
       body('email')
         .trim()
         .isEmail()
         .withMessage('Invalid email')
         .normalizeEmail(),
   
       body('password')
         .isLength({ min: 8, max: 128 })
         .withMessage('Password must be 8-128 characters')
         .matches(/[a-z]/)
         .withMessage('Password must include a lowercase letter')
         .matches(/[A-Z]/)
         .withMessage('Password must include an uppercase letter')
         .matches(/[0-9]/)
         .withMessage('Password must include a number'),
     ],
     async (req, res, next) => {
       try {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
           return res.status(400).json({ errors: formatValidationErrors(errors) });
         }
   
         const name = req.body.name.trim();
         const email = req.body.email.trim().toLowerCase();
         const password = req.body.password;
   
         console.log('Signup start hit for:', email);
   
         const existingUser = await User.findOne({ email }).select('_id');
         if (existingUser) {
           return res.status(409).json({ error: 'Email already registered' });
         }
   
         const otp = generateOtp();
         console.log('OTP generated');
   
         const passwordHash = await bcrypt.hash(password, 12);
         const otpHash = await bcrypt.hash(otp, 10);
         const otpExpiresAt = getOtpExpiryDate();
   
         console.log('Before saving pending verification');
   
         await PendingUserVerification.findOneAndUpdate(
           { email },
           {
             name,
             email,
             passwordHash,
             otpHash,
             otpExpiresAt,
             attempts: 0,
             resendCount: 0,
           },
           {
             upsert: true,
             new: true,
             setDefaultsOnInsert: true,
           }
         );
   
         console.log('Before sending verification email');
   
         await sendVerificationOtp(email, otp, name);
   
         console.log('After sending verification email');
   
         return res.status(200).json({
           message: 'Verification code sent to your email',
           email,
         });
       } catch (err) {
         console.error('Signup start error:', err);
         return next(err);
       }
     }
   );
   
   /**
    * POST /api/auth/signup/verify
    */
   router.post(
     '/signup/verify',
     [
       body('email')
         .trim()
         .isEmail()
         .withMessage('Invalid email')
         .normalizeEmail(),
   
       body('otp')
         .trim()
         .isLength({ min: 6, max: 6 })
         .withMessage('OTP must be 6 digits')
         .isNumeric()
         .withMessage('OTP must be numeric'),
     ],
     async (req, res, next) => {
       try {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
           return res.status(400).json({ errors: formatValidationErrors(errors) });
         }
   
         const email = req.body.email.trim().toLowerCase();
         const otp = req.body.otp.trim();
   
         const pending = await PendingUserVerification.findOne({ email })
           .select('+passwordHash +otpHash');
   
         if (!pending) {
           return res.status(400).json({ error: 'No pending verification found' });
         }
   
         if (pending.otpExpiresAt < new Date()) {
           await PendingUserVerification.deleteOne({ _id: pending._id });
           return res.status(400).json({ error: 'OTP expired. Please sign up again.' });
         }
   
         if (pending.attempts >= MAX_OTP_ATTEMPTS) {
           await PendingUserVerification.deleteOne({ _id: pending._id });
           return res.status(429).json({
             error: 'Too many invalid attempts. Please sign up again.',
           });
         }
   
         const validOtp = await bcrypt.compare(otp, pending.otpHash);
         if (!validOtp) {
           pending.attempts += 1;
           await pending.save();
           return res.status(401).json({ error: 'Invalid verification code' });
         }
   
         const existingUser = await User.findOne({ email }).select('_id');
         if (existingUser) {
           await PendingUserVerification.deleteOne({ _id: pending._id });
           return res.status(409).json({ error: 'Email already registered' });
         }
   
         const user = await User.create({
           name: pending.name,
           email: pending.email,
           passwordHash: pending.passwordHash,
           authProvider: 'local',
           emailVerified: true,
           plan: 'free',
           lastLoginAt: new Date(),
         });
   
         await PendingUserVerification.deleteOne({ _id: pending._id });
   
         const token = signToken(user._id);
   
         return res.status(201).json({
           token,
           user: {
             id: String(user._id),
             name: user.name,
             email: user.email,
             plan: user.plan,
             remainingToday: FREE_DAILY_LIMIT,
           },
         });
       } catch (err) {
         return next(err);
       }
     }
   );
   
   /**
    * POST /api/auth/signup/resend-otp
    */
   router.post(
     '/signup/resend-otp',
     [
       body('email')
         .trim()
         .isEmail()
         .withMessage('Invalid email')
         .normalizeEmail(),
     ],
     async (req, res, next) => {
       try {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
           return res.status(400).json({ errors: formatValidationErrors(errors) });
         }
   
         const email = req.body.email.trim().toLowerCase();
   
         const pending = await PendingUserVerification.findOne({ email });
         if (!pending) {
           return res.status(404).json({ error: 'No pending verification found' });
         }
   
         if (pending.resendCount >= MAX_RESEND_COUNT) {
           return res.status(429).json({ error: 'Too many resend requests' });
         }
   
         const otp = generateOtp();
   
         pending.otpHash = await bcrypt.hash(otp, 10);
         pending.otpExpiresAt = getOtpExpiryDate();
         pending.attempts = 0;
         pending.resendCount += 1;
   
         await pending.save();
         await sendVerificationOtp(email, otp, pending.name);
   
         return res.json({
           message: 'A new verification code has been sent',
         });
       } catch (err) {
         return next(err);
       }
     }
   );
   
   /**
    * POST /api/auth/login
    */
   router.post(
     '/login',
     [
       body('email')
         .trim()
         .isEmail()
         .withMessage('Invalid email')
         .normalizeEmail(),
   
       body('password')
         .notEmpty()
         .withMessage('Password is required'),
     ],
     async (req, res, next) => {
       try {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
           return res.status(400).json({ errors: formatValidationErrors(errors) });
         }
   
         const email = req.body.email.trim().toLowerCase();
         const password = req.body.password;
   
         const user = await User.findOne({ email }).select('+passwordHash');
         if (!user || !user.passwordHash) {
           return res.status(401).json({ error: 'Invalid credentials' });
         }
   
         if (user.authProvider === 'local' && user.emailVerified !== true) {
           return res.status(403).json({
             error: 'Please verify your email before logging in',
           });
         }
   
         const valid = await bcrypt.compare(password, user.passwordHash);
         if (!valid) {
           return res.status(401).json({ error: 'Invalid credentials' });
         }
   
         user.lastLoginAt = new Date();
         await user.save();
   
         const token = signToken(user._id);
   
         const today = new Date();
         today.setHours(0, 0, 0, 0);
   
         const usedToday =
           user.plan === 'free'
             ? await Conversation.countTodaysMessages(user._id, today)
             : 0;
   
         return res.json({
           token,
           user: {
             id: String(user._id),
             name: user.name,
             email: user.email,
             plan: user.plan,
             remainingToday: Math.max(0, FREE_DAILY_LIMIT - usedToday),
           },
         });
       } catch (err) {
         return next(err);
       }
     }
   );
   
   /**
    * GET /api/auth/me
    */
   router.get('/me', requireAuth, async (req, res, next) => {
     try {
       const user = await User.findById(req.user.id);
       if (!user) {
         return res.status(404).json({ error: 'User not found' });
       }
   
       const today = new Date();
       today.setHours(0, 0, 0, 0);
   
       const usedToday =
         user.plan === 'free'
           ? await Conversation.countTodaysMessages(user._id, today)
           : 0;
   
       return res.json({
         user: {
           id: String(user._id),
           name: user.name,
           email: user.email,
           plan: user.plan,
           remainingToday: Math.max(0, FREE_DAILY_LIMIT - usedToday),
           createdAt: user.createdAt,
           preferredTradition: user.preferredTradition,
           preferredLanguage: user.preferredLanguage,
           emailVerified: user.emailVerified,
           authProvider: user.authProvider,
         },
       });
     } catch (err) {
       return next(err);
     }
   });
   
   /**
    * GET /api/auth/google
    */
   router.get(
     '/google',
     passport.authenticate('google', {
       scope: ['profile', 'email'],
       session: false,
     })
   );
   
   /**
    * GET /api/auth/google/callback
    */
   router.get(
     '/google/callback',
     passport.authenticate('google', {
       session: false,
       failureRedirect: '/login',
     }),
     async (req, res) => {
       try {
         req.user.lastLoginAt = new Date();
         req.user.emailVerified = true;
   
         if (!req.user.authProvider) {
           req.user.authProvider = 'google';
         }
   
         await req.user.save();
   
         const token = signToken(req.user._id);
         const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
         const redirectUrl = new URL('/auth-success', frontendUrl);
         redirectUrl.searchParams.set('token', token);
   
         return res.redirect(redirectUrl.toString());
       } catch (err) {
         console.error('Google auth callback error:', err);
         return res.status(500).send('Authentication failed');
       }
     }
   );
   
   module.exports = router;