/* ============================================================
   SoulGPT — Auth Routes
   File: backend/src/routes/auth.js
   ============================================================ */

   const express = require('express');
   const router = express.Router();
   const bcrypt = require('bcryptjs');
   const jwt = require('jsonwebtoken');
   const { body, validationResult } = require('express-validator');
   const passport = require('../config/passport');
   
   const { requireAuth } = require('../middleware/auth');
   const User = require('../models/User');
   const Conversation = require('../models/Conversation');
   
   const FREE_DAILY_LIMIT = 5;
   
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
   
   /**
    * POST /api/auth/signup
    */
   router.post(
     '/signup',
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
   
         const existing = await User.findOne({ email }).select('_id');
         if (existing) {
           return res.status(409).json({ error: 'Email already registered' });
         }
   
         const passwordHash = await bcrypt.hash(password, 12);
   
         const user = await User.create({
           name,
           email,
           passwordHash,
           plan: 'free',
         });
   
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
         },
       });
     } catch (err) {
       return next(err);
     }
   });
   
   /**
    * GET /api/auth/google
    * Start Google login
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
    * Google login callback
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
         await req.user.save();
   
         const token = signToken(req.user._id);
         const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
   
         res.redirect(`${frontendUrl}/auth-success?token=${token}`);
       } catch (err) {
         res.status(500).send('Authentication failed');
       }
     }
   );
   
   module.exports = router;