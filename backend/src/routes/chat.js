/* ============================================================
   SoulGPT — Chat Routes
   File: backend/src/routes/chat.js
   Safe upgraded version
   ============================================================ */

   const express = require('express');
   const router = express.Router();
   const { body, validationResult } = require('express-validator');
   const { optionalAuth } = require('../middleware/auth');
   const {
     generateWisdomResponse,
     generateConversationTitle,
   } = require('../services/aiService');
   const Conversation = require('../models/Conversation');
   const User = require('../models/User');
   
   /**
    * POST /api/chat/message
    * Send a message and receive AI wisdom response.
    */
   router.post(
     '/message',
     optionalAuth,
     [
       body('message')
         .isString()
         .trim()
         .isLength({ min: 1, max: 1000 })
         .withMessage('Message must be 1–1000 characters'),
   
       body('tradition')
         .optional()
         .isIn(['all', 'hindu', 'islam', 'christian', 'jain', 'sikh', 'buddhist'])
         .withMessage('Invalid tradition'),
   
       body('language')
         .optional()
         .isIn(['en', 'hi', 'gu'])
         .withMessage('Invalid language'),
   
       body('conversationId')
         .optional({ nullable: true, checkFalsy: true })
         .isMongoId()
         .withMessage('Invalid conversation ID'),
     ],
     async (req, res, next) => {
       try {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
           return res.status(400).json({ errors: errors.array() });
         }
   
         const message = req.body.message.trim();
         const tradition = req.body.tradition || 'all';
         const language = req.body.language || 'en';
         const conversationId = req.body.conversationId;
         const userId = req.user?.id || null;
   
         // Load authenticated user if present
         const user = userId ? await User.findById(userId) : null;
   
         // Free-tier usage limit
         if (user && user.plan === 'free') {
           const today = new Date();
           today.setHours(0, 0, 0, 0);
   
           const messageCount = await Conversation.countTodaysMessages(userId, today);
           if (messageCount >= 5) {
             return res.status(429).json({
               error: 'Daily limit reached',
               message:
                 'You have used your 5 free messages for today. Upgrade to Premium for unlimited access.',
               upgrade: true,
             });
           }
         }
   
         // Load existing conversation only if user is authenticated
         let conversation = null;
         let history = [];
   
         if (conversationId && userId) {
           conversation = await Conversation.findOne({
             _id: conversationId,
             userId,
           });
   
           if (!conversation) {
             return res.status(404).json({
               error: 'Conversation not found',
               message: 'The requested conversation could not be found.',
             });
           }
   
           history = conversation.messages.map((m) => ({
             role: m.role,
             content: m.content,
           }));
         }
   
         // Generate AI response
         const aiResponse = await generateWisdomResponse(
           message,
           tradition,
           language,
           history
         );
   
         // Final safety fallback
         const safeMessage =
           typeof aiResponse?.message === 'string' && aiResponse.message.trim()
             ? aiResponse.message.trim()
             : 'I am here with you. Please share a little more, and I will offer a thoughtful spiritual response.';
   
         const safeTradition =
           typeof aiResponse?.tradition === 'string' && aiResponse.tradition.trim()
             ? aiResponse.tradition.trim()
             : 'All';
   
         const safeCitation =
           typeof aiResponse?.citation === 'string' ? aiResponse.citation.trim() : '';
   
         const safeIntent =
           typeof aiResponse?.intent === 'string' && aiResponse.intent.trim()
             ? aiResponse.intent.trim()
             : 'general';
   
         const safeTeaching =
           typeof aiResponse?.teaching === 'string' ? aiResponse.teaching.trim() : '';
   
         const safePractice =
           typeof aiResponse?.practice === 'string' ? aiResponse.practice.trim() : '';
   
         const safeReflection =
           typeof aiResponse?.reflection === 'string' ? aiResponse.reflection.trim() : '';
   
         // Only create/save conversations for authenticated users
         if (userId) {
           if (!conversation) {
             const title = await generateConversationTitle(message);
   
             conversation = new Conversation({
               userId,
               title,
               tradition,
               messages: [],
             });
           }
   
           conversation.messages.push(
             {
               role: 'user',
               content: message,
               timestamp: new Date(),
             },
             {
               role: 'assistant',
               content: safeMessage,
               timestamp: new Date(),
               tradition: safeTradition,
               citation: safeCitation,
             }
           );
   
           conversation.updatedAt = new Date();
           await conversation.save();
         }
   
         return res.json({
           message: safeMessage,
           tradition: safeTradition,
           citation: safeCitation,
           intent: safeIntent,
           teaching: safeTeaching,
           practice: safePractice,
           reflection: safeReflection,
           conversationId: conversation?._id || null,
         });
       } catch (err) {
         next(err);
       }
     }
   );
   
   module.exports = router;