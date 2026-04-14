/* ============================================================
   SoulGPT — AI Chat Service (Safer Structured Version)
   File: backend/src/services/aiService.js
   ============================================================ */

   const Anthropic = require('@anthropic-ai/sdk');

   const client = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY,
   });
   
   const CHAT_MODEL =
     process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
   
   const TITLE_MODEL =
     process.env.ANTHROPIC_TITLE_MODEL || 'claude-haiku-4-5-20251001';
   
   const SUPPORTED_INTENTS = [
     'purpose',
     'anxiety',
     'grief',
     'loss',
     'relationships',
     'meaning',
     'death',
     'forgiveness',
     'prayer',
     'gratitude',
     'anger',
     'fear',
     'hope',
     'stress',
     'guidance',
     'scripture',
     'comparison',
     'general',
   ];
   
   const BASE_SYSTEM_PROMPT = `You are SoulGPT, a compassionate multi-faith spiritual wisdom guide.
   
   Follow these rules:
   1. Give warm, practical, respectful spiritual guidance.
   2. Cite specific scriptures or teachings when possible.
   3. Use *italics* for short direct scripture quotes only.
   4. Be humble, calm, and never preachy.
   5. Keep responses focused and clear.
   6. Default to about 120-220 words unless the user clearly asks for more depth.
   7. If the user asks for a long response, essay, paragraph set, or 2-page explanation, you MUST write the full response immediately.
   8. Do NOT ask follow-up questions if a reasonable topic can be inferred from the conversation.
   9. If the user previously asked about a topic, assume that topic continues unless explicitly changed.
   10. Only ask a clarifying question if there is absolutely no clear topic from the conversation.
   11. Never insult, mock, or degrade any religion or tradition.
   12. Never invent fake citations. If unsure, give a general teaching without a false reference.
   13. Return valid JSON only.
   
   You must return ONLY valid JSON.
   Do not wrap JSON in markdown.
   Do not add any text before or after the JSON.
   
   JSON format:
   {
     "message": "response text",
     "tradition": "Hindu|Islam|Christian|Sikh|Jain|Buddhist|All",
     "citation": "brief scripture refs",
     "intent": "purpose|anxiety|grief|loss|relationships|meaning|death|forgiveness|prayer|gratitude|anger|fear|hope|stress|guidance|scripture|comparison|general",
     "teaching": "one short key principle",
     "practice": "one short practical step",
     "reflection": "one short reflective takeaway"
   }`.trim();
   
   const TRADITION_PROMPTS = {
     hindu:
       'Focus mainly on Hindu wisdom: Bhagavad Gita, Upanishads, Vedas, Ramayana, Mahabharata, and devotional teachings.',
     islam:
       'Focus mainly on Islamic wisdom: Quran, Hadith, Sunnah, and respected Sufi teachings.',
     christian:
       'Focus mainly on Christian wisdom: Bible, teachings of Jesus, Church Fathers, and Christian mystics.',
     jain:
       'Focus mainly on Jain wisdom: Agamas, Tattvartha Sutra, and Tirthankara teachings.',
     sikh:
       'Focus mainly on Sikh wisdom: Guru Granth Sahib and teachings of the Gurus.',
     buddhist:
       'Focus mainly on Buddhist wisdom: Dhammapada, Pali Canon, Zen, Mahayana, and Tibetan teachings.',
   };
   
   function buildSystemPrompt(tradition = 'all', language = 'en') {
     let systemPrompt = BASE_SYSTEM_PROMPT;
   
     if (tradition !== 'all' && TRADITION_PROMPTS[tradition]) {
       systemPrompt += `\n\nTradition focus: ${TRADITION_PROMPTS[tradition]}`;
     } else {
       systemPrompt +=
         '\n\nIf no single tradition is selected, you may draw respectfully from multiple traditions when helpful.';
     }
   
     if (language === 'hi') {
       systemPrompt += '\n\nRespond in Hindi.';
     } else if (language === 'gu') {
       systemPrompt += '\n\nRespond in Gujarati.';
     } else {
       systemPrompt += '\n\nRespond in English.';
     }
   
     return systemPrompt;
   }
   
   function normalizeTradition(value, fallback = 'All') {
     if (!value || typeof value !== 'string') return fallback;
   
     const cleaned = value.trim().toLowerCase();
   
     const map = {
       hindu: 'Hindu',
       islam: 'Islam',
       christian: 'Christian',
       sikh: 'Sikh',
       jain: 'Jain',
       buddhist: 'Buddhist',
       all: 'All',
     };
   
     return map[cleaned] || fallback;
   }
   
   function normalizeIntent(value, userMessage = '') {
     if (typeof value === 'string') {
       const cleaned = value.trim().toLowerCase();
       if (SUPPORTED_INTENTS.includes(cleaned)) return cleaned;
     }
   
     const msg = String(userMessage || '').toLowerCase();
   
     if (
       msg.includes('anxious') ||
       msg.includes('anxiety') ||
       msg.includes('panic') ||
       msg.includes('worried')
     ) {
       return 'anxiety';
     }
   
     if (
       msg.includes('grief') ||
       msg.includes('mourning') ||
       msg.includes('lost someone')
     ) {
       return 'grief';
     }
   
     if (msg.includes('forgive') || msg.includes('forgiveness')) {
       return 'forgiveness';
     }
   
     if (
       msg.includes('purpose') ||
       msg.includes('calling') ||
       msg.includes('why am i here')
     ) {
       return 'purpose';
     }
   
     if (
       msg.includes('pray') ||
       msg.includes('prayer') ||
       msg.includes('dua') ||
       msg.includes('mantra')
     ) {
       return 'prayer';
     }
   
     if (
       msg.includes('relationship') ||
       msg.includes('marriage') ||
       msg.includes('partner') ||
       msg.includes('family')
     ) {
       return 'relationships';
     }
   
     if (
       msg.includes('compare') ||
       msg.includes('difference between') ||
       msg.includes('which religion')
     ) {
       return 'comparison';
     }
   
     if (
       msg.includes('verse') ||
       msg.includes('scripture') ||
       msg.includes('gita') ||
       msg.includes('quran') ||
       msg.includes('bible')
     ) {
       return 'scripture';
     }
   
     return 'general';
   }
   
   function sanitizeText(value, fallback = '') {
     if (typeof value !== 'string') return fallback;
     return value.trim();
   }
   
   function extractMessageFromJsonLikeText(rawText) {
     if (!rawText || typeof rawText !== 'string') return '';
   
     const match = rawText.match(/"message"\s*:\s*"([\s\S]*?)"\s*(,|\})/);
     if (!match) return '';
   
     return match[1]
       .replace(/\\n/g, '\n')
       .replace(/\\"/g, '"')
       .replace(/\\\\/g, '\\')
       .trim();
   }

   function cleanMessageOutput(text) {
    if (!text) return '';
  
    const str = String(text).trim();
  
    if (str.startsWith('{') && str.includes('"message"')) {
      try {
        const parsed = JSON.parse(str);
        if (parsed.message) return String(parsed.message).trim();
      } catch {}
  
      const match = str.match(/"message"\s*:\s*"([\s\S]*?)"/);
      if (match?.[1]) {
        return match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .trim();
      }
    }
  
    return str;
  }
   
   function safeParseJSON(rawText) {
     if (!rawText || typeof rawText !== 'string') return null;
   
     try {
       return JSON.parse(rawText);
     } catch {
       // continue
     }
   
     try {
       const start = rawText.indexOf('{');
       const end = rawText.lastIndexOf('}');
       if (start !== -1 && end !== -1 && end > start) {
         const jsonString = rawText.slice(start, end + 1);
         return JSON.parse(jsonString);
       }
     } catch {
       // continue
     }
   
     try {
       const extractedMessage = extractMessageFromJsonLikeText(rawText);
       if (extractedMessage) {
         return {
           message: extractedMessage,
         };
       }
     } catch {
       // continue
     }
   
     return null;
   }
   
   function buildFallbackResponse(rawText, tradition, userMessage) {
     const extractedMessage = extractMessageFromJsonLikeText(rawText);
     const cleanedRaw = sanitizeText(extractedMessage || rawText);
   
     return {
       message:
         cleanedRaw ||
         'I am here with you. Please share a little more, and I will offer a thoughtful spiritual response.',
       tradition: normalizeTradition(tradition === 'all' ? 'All' : tradition, 'All'),
       citation: '',
       intent: normalizeIntent('', userMessage),
       teaching: '',
       practice: '',
       reflection: '',
     };
   }
   
   function normalizeAiResponse(parsed, rawText, requestedTradition, userMessage) {
     if (!parsed || typeof parsed !== 'object') {
       return buildFallbackResponse(rawText, requestedTradition, userMessage);
     }
   
     const extractedMessage = extractMessageFromJsonLikeText(rawText);
   
     const message =
      cleanMessageOutput(parsed.message) ||
      cleanMessageOutput(extractedMessage) ||
      cleanMessageOutput(rawText) ||
      'I am here with you. Please share a little more, and I will offer a thoughtful spiritual response.';
   
     return {
       message,
       tradition: normalizeTradition(
         parsed.tradition,
         normalizeTradition(requestedTradition === 'all' ? 'All' : requestedTradition, 'All')
       ),
       citation: sanitizeText(parsed.citation),
       intent: normalizeIntent(parsed.intent, userMessage),
       teaching: sanitizeText(parsed.teaching),
       practice: sanitizeText(parsed.practice),
       reflection: sanitizeText(parsed.reflection),
     };
   }
   
   function mapHistoryForAnthropic(history = []) {
     return history.slice(-6).map((m) => ({
       role: m.role === 'assistant' ? 'assistant' : 'user',
       content: String(m.content || ''),
     }));
   }
   
   function expandContextualPrompt(userMessage, history = []) {
     const text = String(userMessage || '').trim();
     const lower = text.toLowerCase();
   
     const wantsExpansion =
       lower.includes('essay') ||
       lower.includes('two page') ||
       lower.includes('2 page') ||
       lower.includes('write more') ||
       lower.includes('explain more') ||
       lower.includes('go deeper') ||
       lower.includes('expand this') ||
       lower === 'expand' ||
       lower === 'explain' ||
       lower === 'write it';
   
     if (!wantsExpansion || !Array.isArray(history) || history.length === 0) {
       return text;
     }
   
     const lastUser = [...history].reverse().find((m) => m.role === 'user' && m.content);
     const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant' && m.content);
   
     if (lastUser?.content) {
       return [
         'Use the immediately previous conversation topic as context when responding.',
         `Current user request: ${text}`,
         `Previous user topic: ${lastUser.content}`,
       ].join('\n\n');
     }
   
     if (lastAssistant?.content) {
       return [
         'Use the immediately previous conversation topic as context when responding.',
         `Current user request: ${text}`,
         `Previous assistant response: ${lastAssistant.content}`,
       ].join('\n\n');
     }
   
     return text;
   }
   
   async function generateWisdomResponse(
     userMessage,
     tradition = 'all',
     language = 'en',
     history = []
   ) {
     const systemPrompt = buildSystemPrompt(tradition, language);
     const finalUserMessage = expandContextualPrompt(userMessage, history);
   
     const messages = [
       ...mapHistoryForAnthropic(history),
       { role: 'user', content: String(finalUserMessage || '') },
     ];
   
     try {
       const response = await client.messages.create({
         model: CHAT_MODEL,
         max_tokens: 600,
         temperature: 0.4,
         system: systemPrompt,
         messages,
       });
   
       const rawText = response.content?.[0]?.text || '';
       const parsed = safeParseJSON(rawText);
   
       return normalizeAiResponse(parsed, rawText, tradition, userMessage);
     } catch (err) {
       console.error('AI Service error:', err);
   
       const detail =
         err?.message ||
         err?.error?.message ||
         String(err);
   
       const out = new Error(
         detail.includes('api_key') || detail.includes('401')
           ? 'Anthropic API rejected the request — check ANTHROPIC_API_KEY in backend/.env'
           : detail.includes('not_found') || detail.toLowerCase().includes('model')
             ? `Claude model not available — set ANTHROPIC_MODEL in backend/.env. ${detail}`
             : `AI request failed: ${detail}`
       );
   
       out.statusCode = 502;
       throw out;
     }
   }
   
   async function generateConversationTitle(firstMessage) {
     try {
       const response = await client.messages.create({
         model: TITLE_MODEL,
         max_tokens: 16,
         temperature: 0.3,
         messages: [
           {
             role: 'user',
             content: `Create a very short title for: "${firstMessage}". Only return the title. Maximum 5 words.`,
           },
         ],
       });
   
       const title = response.content?.[0]?.text?.trim();
   
       return title ? title.replace(/^["'\s]+|["'\s]+$/g, '') : 'Spiritual Conversation';
     } catch {
       return 'Spiritual Conversation';
     }
   }
   
   module.exports = {
     generateWisdomResponse,
     generateConversationTitle,
   };