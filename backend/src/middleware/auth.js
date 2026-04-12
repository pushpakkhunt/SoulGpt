/* ============================================================
   SoulGPT — Auth Middleware
   File: backend/src/middleware/auth.js
   ============================================================ */

   const jwt = require('jsonwebtoken');
   const User = require('../models/User');
   
   function extractToken(req) {
     const auth = req.headers.authorization;
   
     if (!auth || typeof auth !== 'string') {
       return null;
     }
   
     if (!auth.startsWith('Bearer ')) {
       return null;
     }
   
     const token = auth.slice(7).trim();
     return token || null;
   }
   
   function verifyJwtToken(token) {
     const secret = process.env.JWT_SECRET;
   
     if (!secret) {
       throw new Error('JWT_SECRET is not configured');
     }
   
     const decoded = jwt.verify(token, secret);
   
     if (!decoded || typeof decoded !== 'object' || !decoded.id) {
       throw new Error('Invalid token payload');
     }
   
     return decoded;
   }
   
   /**
    * requireAuth — blocks unauthenticated requests
    */
   async function requireAuth(req, res, next) {
     try {
       const token = extractToken(req);
   
       if (!token) {
         return res.status(401).json({ error: 'Authentication required' });
       }
   
       const decoded = verifyJwtToken(token);
   
       const user = await User.findById(decoded.id).select('_id plan email');
       if (!user) {
         return res.status(401).json({ error: 'User no longer exists' });
       }
   
       req.user = {
         id: String(user._id),
         plan: user.plan,
         email: user.email,
       };
   
       next();
     } catch (err) {
       return res.status(401).json({ error: 'Invalid or expired token' });
     }
   }
   
   /**
    * optionalAuth — attaches user if token present, continues without if not
    */
   async function optionalAuth(req, res, next) {
     try {
       const token = extractToken(req);
   
       if (!token) {
         return next();
       }
   
       const decoded = verifyJwtToken(token);
       const user = await User.findById(decoded.id).select('_id plan email');
   
       if (user) {
         req.user = {
           id: String(user._id),
           plan: user.plan,
           email: user.email,
         };
       }
     } catch (err) {
       req.user = undefined;
     }
   
     next();
   }
   
   module.exports = { requireAuth, optionalAuth };