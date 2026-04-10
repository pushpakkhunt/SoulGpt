const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const conversations = await Conversation
      .find({ userId: req.user.id })
      .select('_id title tradition updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json({ conversations });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid conversation id' });
    }

    const conv = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    res.json({
      id: String(conv._id),
      title: conv.title,
      tradition: conv.tradition,
      messages: conv.messages,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid conversation id' });
    }

    const result = await Conversation.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;