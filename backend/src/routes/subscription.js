/* ============================================================
   SoulGPT — Subscription Routes (Stripe)
   File: backend/src/routes/subscription.js
   ============================================================ */

const express  = require('express');
const router   = express.Router();
const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

/**
 * POST /api/subscription/checkout
 * Create a Stripe Checkout session → redirect user to Stripe payment page.
 */
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/premium-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL}`,
      metadata:    { userId: user._id.toString() },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) { next(err); }
});

/**
 * POST /api/subscription/webhook
 * Stripe webhook — upgrades user to premium on successful payment.
 * Register this URL in your Stripe dashboard.
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // raw body required for Stripe signature verification
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.metadata?.userId;
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            plan:                 'premium',
            stripeSubscriptionId: session.subscription,
          });
          console.log(`✦ User ${userId} upgraded to Premium`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object;
        const user   = await User.findOne({ stripeSubscriptionId: sub.id });
        if (user) {
          user.plan                 = 'free';
          user.stripeSubscriptionId = null;
          user.subscriptionEndsAt   = null;
          await user.save();
          console.log(`✦ User ${user._id} downgraded to Free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Optional: send email warning user their payment failed
        console.warn('Payment failed for subscription:', event.data.object.subscription);
        break;
      }
    }

    res.json({ received: true });
  }
);

/**
 * GET /api/subscription
 * Get current user's subscription status.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('plan stripeSubscriptionId subscriptionEndsAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      plan:               user.plan,
      subscriptionActive: user.plan === 'premium',
      subscriptionEndsAt: user.subscriptionEndsAt,
    });
  } catch (err) { next(err); }
});

module.exports = router;
