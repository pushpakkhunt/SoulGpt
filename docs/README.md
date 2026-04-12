# ✦ SoulGPT — Complete Build Guide

> Spiritual AI powered by Claude. Wisdom from every tradition.

---

## 📁 Project Structure

```
soulgpt/
├── frontend/
│   ├── src/
│   │   ├── index.html                  ← Entry HTML
│   │   ├── main.js                     ← App entry, wires all components
│   │   ├── components/
│   │   │   ├── Sidebar.js              ← Tradition filter + chat history
│   │   │   ├── Chat.js                 ← Message UI + input
│   │   │   └── AudioPlayer.js          ← Prayer audio player
│   │   ├── lib/
│   │   │   ├── api.js                  ← All backend API calls
│   │   │   └── utils.js                ← detectIntent, formatMessage, etc.
│   │   └── styles/
│   │       └── main.css                ← All CSS variables & base styles
│   ├── .env.example                    ← Copy to .env
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── server.js                   ← Express app, routes, rate limiting
│   │   ├── routes/
│   │   │   ├── auth.js                 ← signup, login, /me
│   │   │   ├── chat.js                 ← POST /message (main AI endpoint)
│   │   │   ├── conversations.js        ← CRUD for chat history
│   │   │   ├── prayers.js              ← Audio catalog + signed S3 URLs
│   │   │   └── subscription.js         ← Stripe checkout + webhooks
│   │   ├── services/
│   │   │   └── aiService.js            ← Claude API integration (THE BRAIN)
│   │   ├── models/
│   │   │   ├── index.js                ← All Mongoose schemas
│   │   │   ├── User.js
│   │   │   └── Conversation.js
│   │   └── middleware/
│   │       ├── auth.js                 ← JWT requireAuth / optionalAuth
│   │       └── errorHandler.js         ← Global error handler
│   ├── .env.example                    ← Copy to .env
│   └── package.json
│
└── docs/
    └── README.md                       ← This file
```

---

## 🚀 Getting Started in 5 Steps

### Step 1 — Clone & Install

```bash
# Backend
cd soulgpt/backend
npm install
cp .env.example .env   # Fill in your keys

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### Step 2 — Get your API Keys

| Service | Free Tier | Link |
|---------|-----------|------|
| **Anthropic (Claude)** | $5 free credit | https://console.anthropic.com |
| **MongoDB Atlas** | 512MB free forever | https://cloud.mongodb.com |
| **Stripe** | Test mode free | https://dashboard.stripe.com |
| **AWS S3** | 5GB free 12 months | https://aws.amazon.com/s3 |

### Step 3 — Configure .env

In `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...     ← Most important
MONGODB_URI=mongodb+srv://...           ← Your Atlas connection string
JWT_SECRET=<64 random chars>            ← Run: openssl rand -hex 64
STRIPE_SECRET_KEY=sk_test_...          ← From Stripe dashboard
```

### Step 4 — Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev
# → API running on http://localhost:3001

# Terminal 2 — Frontend
cd frontend && npm run dev
# → UI running on http://localhost:5173
```

### Step 5 — Test it

Open http://localhost:5173 and type:
- *"What does the Gita say about purpose?"* → AI response with scripture
- *"Play Hanuman Chalisa"* → Audio player opens
- *"I'm feeling anxious"* → Multi-tradition wisdom response

---

## 🧠 How the AI Works

The magic is in `backend/src/services/aiService.js`.

It sends your user's message to Claude with a carefully crafted **system prompt** that:

1. **Instructs Claude** to be a spiritual guide versed in all traditions
2. **Requires scripture citations** with chapter/verse (prevents hallucination)
3. **Filters by tradition** if the user has selected one (Hindu, Islam, etc.)
4. **Returns structured JSON** so we can extract `tradition`, `citation`, `intent`
5. **Maintains conversation history** for context-aware follow-up questions

**The system prompt is your most important asset.** Refine it to improve response quality.

### Example AI Response (JSON from Claude)

```json
{
  "message": "The Bhagavad Gita speaks beautifully to feelings of anxiety...",
  "tradition": "Hindu",
  "citation": "Bhagavad Gita 2:56 · Quran 94:5-6 · Philippians 4:6",
  "intent": "anxiety"
}
```

---

## 🗄️ Database Schema

### Users Collection
```
{
  name, email, passwordHash,
  plan: "free" | "premium",
  stripeCustomerId, stripeSubscriptionId,
  preferredTradition, preferredLanguage
}
```

### Conversations Collection
```
{
  userId,
  title,          ← AI-generated from first message
  tradition,      ← Filter active when conversation started
  messages: [
    { role: "user" | "assistant", content, tradition, citation, timestamp }
  ]
}
```

---

## 💰 Monetization (Premium)

**Free tier:** 5 messages/day, no conversation history saved
**Premium:** Unlimited messages, full history, multi-language (₹299/month or $4.99/month)

### Setup Stripe

1. Create a product in Stripe Dashboard
2. Set price (e.g., ₹299/month recurring)
3. Copy the `price_xxx` ID to `STRIPE_PREMIUM_PRICE_ID` in .env
4. Register webhook URL: `https://yourdomain.com/api/subscription/webhook`
5. Select events: `checkout.session.completed`, `customer.subscription.deleted`

---

## 🎵 Audio (Prayers)

### Development
Audio player runs in **simulation mode** — progress bar moves but no real audio plays. This is intentional so you can build/test without audio files.

### Production
1. Upload MP3 files to AWS S3 bucket (structure: `prayers/hindu/hanuman-chalisa.mp3`)
2. Set `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` in .env
3. The `/api/prayers/:key/stream` endpoint will generate 15-minute signed URLs

**Where to get audio files:**
- Record original renditions (best for copyright safety)
- License from sites like Musicbed or Artlist
- Use Creative Commons recordings from archive.org

---

## 🚢 Deployment

### Backend → Railway or Render (free tier available)
```bash
# railway.app
npm install -g @railway/cli
railway login && railway up
```

### Frontend → Vercel (free)
```bash
npm install -g vercel
cd frontend && vercel
```

### Database → MongoDB Atlas
- Already cloud-hosted, just use the connection string

---

## 🛣️ Roadmap (What to Build Next)

### Phase 1 — Launch (Week 1-2)
- [x] Chat interface
- [x] Claude AI integration
- [x] Audio player (simulation)
- [x] User auth
- [x] Premium payments

### Phase 2 — Growth (Month 1-2)
- [ ] Real audio files in S3
- [ ] Email notifications (daily verse)
- [ ] Mobile app (React Native)
- [ ] Hindi/Gujarati full translation
- [ ] More prayers (100+ catalog)

### Phase 3 — Scale (Month 3+)
- [ ] Personalized daily wisdom (based on past questions)
- [ ] Community features (share insights)
- [ ] Astrology integration
- [ ] Meditation timer
- [ ] WhatsApp bot

---

## 🔑 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | None | Create account |
| POST | `/api/auth/login` | None | Login |
| GET  | `/api/auth/me` | JWT | Get current user |
| POST | `/api/chat/message` | Optional | Send message, get wisdom |
| GET  | `/api/conversations` | JWT | List chat history |
| GET  | `/api/conversations/:id` | JWT | Get full conversation |
| DELETE | `/api/conversations/:id` | JWT | Delete conversation |
| GET  | `/api/prayers` | None | Get prayer catalog |
| GET  | `/api/prayers/:key/stream` | None | Get audio URL |
| POST | `/api/subscription/checkout` | JWT | Start Stripe checkout |
| POST | `/api/subscription/webhook` | Stripe | Payment webhook |

---

## ❓ Common Questions

**Q: Will Claude make up scripture quotes?**
The system prompt explicitly requires chapter/verse citations and instructs Claude not to hallucinate. Claude is very reliable at this when prompted correctly. You can add a verification layer by cross-referencing a scripture database API.

**Q: How much will the AI cost per user?**
Claude Haiku is ~$0.001 per message. At 5 free messages/day per user, 1000 daily active users = ~$5/day = ~$150/month. Premium users generate revenue that covers this many times over.

**Q: Can I add more traditions?**
Yes — add entries to `TRADITION_PROMPTS` in `aiService.js` and add buttons to the sidebar in `Sidebar.js`. The AI already knows all major traditions.

**Q: How do I add more prayers to the catalog?**
Add entries to the `PRAYER_CATALOG` array in `backend/src/routes/prayers.js`, upload the MP3 to S3 with the matching `s3Key`, and it automatically becomes available.
