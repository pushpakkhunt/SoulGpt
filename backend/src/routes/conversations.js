/* ============================================================
   SoulGPT — Conversations Routes
   File: backend/src/routes/conversations.js
   ============================================================ */

const express      = require('express');
const router       = express.Router();
const { requireAuth } = require('../middleware/auth');
const Conversation    = require('../models/Conversation');

/**
 * GET /api/conversations
 * Get all conversations for the logged-in user (titles only, no messages).
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const conversations = await Conversation
      .find({ userId: req.user.id })
      .select('_id title tradition updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ conversations });
  } catch (err) { next(err); }
});

/**
 * GET /api/conversations/:id
 * Get a single conversation with all messages.
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const conv = await Conversation.findOne({
      _id:    req.params.id,
      userId: req.user.id,
    });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    res.json({
      id:        conv._id,
      title:     conv.title,
      tradition: conv.tradition,
      messages:  conv.messages,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/conversations/:id
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await Conversation.deleteOne({
      _id:    req.params.id,
      userId: req.user.id,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
