/* ============================================================
   SoulGPT — AI Chat Service (Core Intelligence)
   File: backend/src/services/aiService.js

   This is the brain of SoulGPT.
   It calls the Anthropic Claude API with a carefully crafted
   system prompt that makes it a world-class spiritual guide.
   ============================================================ */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Default: stable Sonnet 3.5 snapshot. Override ANTHROPIC_MODEL for Sonnet 4 / Opus (see Anthropic docs).
const CHAT_MODEL =
  process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
const TITLE_MODEL =
  process.env.ANTHROPIC_TITLE_MODEL || 'claude-haiku-4-5-20251001';

// ── System Prompt ─────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are SoulGPT, a profound and compassionate spiritual wisdom guide.

IDENTITY:
You are deeply versed in the world's great spiritual traditions: Hinduism, Islam, Christianity, Judaism, Sikhism, Jainism, Buddhism, Taoism, Sufism, and more. You speak with warmth, depth, and humility.

CORE PRINCIPLES:
1. Always cite specific scriptures with book/chapter/verse (e.g., "Bhagavad Gita 2:47", "Quran 94:5-6", "John 3:16")
2. Present multiple traditions unless the user specifically asks for one
3. Use *italics* (asterisks) for direct scripture quotes
4. Never be preachy — offer wisdom as a humble guide, not a preacher
5. Ground abstract wisdom in practical, actionable insight
6. Acknowledge emotional pain before offering wisdom — feel first, teach second
7. Keep responses focused: 200-350 words unless depth is truly needed
8. End with an open invitation for deeper exploration, not a conclusion

RESPONSE FORMAT:
- Begin with the most emotionally relevant tradition
- Weave 2-4 traditions naturally (not as a list)
- Include at least 1-2 direct scripture quotes in *italics*
- End with a "cite" field in your JSON response

JSON RESPONSE FORMAT (always respond in this exact JSON):
{
  "message": "Your beautifully written response here",
  "tradition": "Primary tradition (e.g., Hindu, Islam, Christian, Sikh, Jain, Buddhist, All)",
  "citation": "Scripture · Scripture · Scripture (brief refs only)",
  "intent": "purpose|anxiety|grief|loss|relationships|meaning|death|forgiveness|prayer|general"
}`;

const TRADITION_PROMPTS = {
  hindu:     'Focus primarily on Hindu scriptures: Bhagavad Gita, Upanishads, Vedas, Ramayana, Mahabharata, Puranas.',
  islam:     'Focus primarily on Islamic wisdom: Quran, Hadith, Sunnah, Sufi teachings (Rumi, Ibn Arabi).',
  christian: 'Focus primarily on Christian scriptures: Bible (Old and New Testament), Church Fathers, mystics like Meister Eckhart.',
  jain:      'Focus primarily on Jain philosophy: Agamas, Tattvartha Sutra, teachings of the Tirthankaras.',
  sikh:      'Focus primarily on Sikh wisdom: Guru Granth Sahib, teachings of the 10 Gurus.',
  buddhist:  'Focus primarily on Buddhist teachings: Dhammapada, Pali Canon, Zen koans, Tibetan Buddhism.',
};

/**
 * Send a message to the AI and get a structured response.
 *
 * @param {string}   userMessage   - The user's question
 * @param {string}   tradition     - Tradition filter ('all' | 'hindu' | ...)
 * @param {string}   language      - Response language ('en' | 'hi' | 'gu')
 * @param {Array}    history       - Previous messages [{role, content}]
 * @returns {Object} { message, tradition, citation, intent }
 */
async function generateWisdomResponse(userMessage, tradition = 'all', language = 'en', history = []) {
  // Build system prompt
  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (tradition !== 'all' && TRADITION_PROMPTS[tradition]) {
    systemPrompt += `\n\nTRADITION FOCUS: ${TRADITION_PROMPTS[tradition]}`;
  }
  if (language === 'hi') {
    systemPrompt += '\n\nLANGUAGE: Respond primarily in Hindi (Devanagari script). Use Sanskrit scripture quotes in original script with transliteration.';
  } else if (language === 'gu') {
    systemPrompt += '\n\nLANGUAGE: Respond primarily in Gujarati. Use Sanskrit/Gujarati scripture quotes appropriately.';
  }

  // Build messages array (last 10 for context window efficiency)
  const recentHistory = history.slice(-10).map(m => ({
    role:    m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const messages = [
    ...recentHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await client.messages.create({
      model:      CHAT_MODEL,
      max_tokens: 1024,
      system:     systemPrompt,
      messages,
    });

    const rawText = response.content[0]?.text || '';

    // Parse JSON response (model may wrap JSON in prose; parse can fail on bad output)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          message:   parsed.message   || rawText,
          tradition: parsed.tradition || 'All',
          citation:  parsed.citation  || '',
          intent:    parsed.intent    || 'general',
        };
      } catch {
        // Malformed JSON — use full text as the reply
      }
    }

    return {
      message:   rawText,
      tradition: 'All traditions',
      citation:  '',
      intent:    'general',
    };
  } catch (err) {
    console.error('AI Service error:', err);
    const detail =
      err?.message ||
      err?.error?.message ||
      String(err);
    const out = new Error(
      detail.includes('api_key') || detail.includes('401')
        ? 'Anthropic API rejected the request — check ANTHROPIC_API_KEY in backend/.env'
        : detail.includes('not_found') || detail.includes('model')
          ? `Claude model not available — set ANTHROPIC_MODEL in backend/.env (e.g. claude-3-5-sonnet-20241022). ${detail}`
          : `AI request failed: ${detail}`
    );
    out.statusCode = 502;
    throw out;
  }
}

/**
 * Generate a conversation title from the first message.
 */
async function generateConversationTitle(firstMessage) {
  try {
    const response = await client.messages.create({
      model:      TITLE_MODEL,
      max_tokens: 20,
      messages: [{
        role:    'user',
        content: `Create a very short (4-6 word) title for a spiritual conversation that starts with: "${firstMessage}". Just the title, no quotes.`,
      }],
    });
    return response.content[0]?.text?.trim() || 'Spiritual Conversation';
  } catch {
    return 'Spiritual Conversation';
  }
}

module.exports = { generateWisdomResponse, generateConversationTitle };
