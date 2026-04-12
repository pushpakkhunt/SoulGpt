/* ============================================================
   SoulGPT — Chat Routes
   File: backend/src/routes/chat.js
   ============================================================ */

   const express = require('express');
   const router = express.Router();
   const { body, validationResult } = require('express-validator');
   const { requireAuth, optionalAuth } = require('../middleware/auth');
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
         // Validate input
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
           return res.status(400).json({ errors: errors.array() });
         }
   
         const message = req.body.message.trim();
         const tradition = req.body.tradition || 'all';
         const language = req.body.language || 'en';
         const conversationId = req.body.conversationId;
         const userId = req.user?.id;
   
         // Require a valid authenticated user
const user = userId ? await User.findById(userId) : null;
   
// Free-tier usage limit
if (user && user.plan === 'free') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const messageCount = await Conversation.countTodaysMessages(userId, today);
  if (messageCount >= 5) {
    return res.status(429).json({
      error: 'Daily limit reached',
      message: 'You have used your 5 free messages for today. Upgrade to Premium for unlimited access.',
      upgrade: true,
    });
  }
}
   
         // Load existing conversation if it belongs to the user
         let conversation = null;
         let history = [];
   
         if (conversationId) {
           conversation = await Conversation.findOne({
             _id: conversationId,
             userId,
           });
   
           if (conversation) {
             history = conversation.messages.map((m) => ({
               role: m.role,
               content: m.content,
             }));
           }
         }
   
         // Generate AI response
         const aiResponse = await generateWisdomResponse(
           message,
           tradition,
           language,
           history
         );
   
         // Create conversation if needed
         if (!conversation) {
           const title = await generateConversationTitle(message);
           conversation = new Conversation({
             userId,
             title,
             tradition,
             messages: [],
           });
         }
   
         // Save messages
         conversation.messages.push(
           {
             role: 'user',
             content: message,
             timestamp: new Date(),
           },
           {
             role: 'assistant',
             content: aiResponse.message,
             timestamp: new Date(),
             tradition: aiResponse.tradition,
             citation: aiResponse.citation,
           }
         );
   
         conversation.updatedAt = new Date();
         await conversation.save();
   
         return res.json({
           message: aiResponse.message,
           tradition: aiResponse.tradition,
           citation: aiResponse.citation,
           intent: aiResponse.intent,
           conversationId: conversation._id,
         });
       } catch (err) {
         next(err);
       }
     }
   );
   
   module.exports = router;