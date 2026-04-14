/* ============================================================
   SoulGPT — AI Chat Service (Faster Version)
   File: backend/src/services/aiService.js
   ============================================================ */

   const Anthropic = require('@anthropic-ai/sdk');

   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
   
   const CHAT_MODEL =
     process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
   
   const TITLE_MODEL =
     process.env.ANTHROPIC_TITLE_MODEL || 'claude-haiku-4-5-20251001';
   
   // Shorter prompt = faster requests
   const BASE_SYSTEM_PROMPT = `You are SoulGPT, a compassionate spiritual wisdom guide.
   
   Follow these rules:
   1. Give warm, practical spiritual guidance.
   2. Cite specific scriptures when possible.
   3. Use *italics* for direct scripture quotes.
   4. Be humble, never preachy.
   5. Keep responses focused and clear.
   6. Default to about 120-220 words unless more depth is needed.
   7. Return valid JSON only.
   
   JSON format:
   {
     "message": "response text",
     "tradition": "Hindu|Islam|Christian|Sikh|Jain|Buddhist|All",
     "citation": "brief scripture refs",
     "intent": "purpose|anxiety|grief|loss|relationships|meaning|death|forgiveness|prayer|general"
   }`;
   
   const TRADITION_PROMPTS = {
     hindu:
       'Focus mainly on Hindu wisdom: Bhagavad Gita, Upanishads, Vedas, Ramayana, Mahabharata.',
     islam:
       'Focus mainly on Islamic wisdom: Quran, Hadith, Sunnah, and respected Sufi teachings.',
     christian:
       'Focus mainly on Christian wisdom: Bible, Church Fathers, and Christian mystics.',
     jain:
       'Focus mainly on Jain wisdom: Agamas, Tattvartha Sutra, and Tirthankara teachings.',
     sikh:
       'Focus mainly on Sikh wisdom: Guru Granth Sahib and teachings of the Gurus.',
     buddhist:
       'Focus mainly on Buddhist wisdom: Dhammapada, Pali Canon, Zen, and Tibetan teachings.',
   };
   
   async function generateWisdomResponse(
     userMessage,
     tradition = 'all',
     language = 'en',
     history = []
   ) {
     let systemPrompt = BASE_SYSTEM_PROMPT;
   
     if (tradition !== 'all' && TRADITION_PROMPTS[tradition]) {
       systemPrompt += `\n\nTradition focus: ${TRADITION_PROMPTS[tradition]}`;
     }
   
     if (language === 'hi') {
       systemPrompt += '\n\nRespond in Hindi.';
     } else if (language === 'gu') {
       systemPrompt += '\n\nRespond in Gujarati.';
     }
   
     // Less history = faster
     const recentHistory = history.slice(-4).map((m) => ({
       role: m.role === 'assistant' ? 'assistant' : 'user',
       content: m.content,
     }));
   
     const messages = [
       ...recentHistory,
       { role: 'user', content: userMessage },
     ];
   
     try {
       const response = await client.messages.create({
         model: CHAT_MODEL,
         max_tokens: 450,
         temperature: 0.5,
         system: systemPrompt,
         messages,
       });
   
       const rawText = response.content?.[0]?.text || '';
   
       const jsonMatch = rawText.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         try {
           const parsed = JSON.parse(jsonMatch[0]);
           return {
             message: parsed.message || rawText,
             tradition: parsed.tradition || 'All',
             citation: parsed.citation || '',
             intent: parsed.intent || 'general',
           };
         } catch {
           // fallback below
         }
       }
   
       return {
         message: rawText,
         tradition: 'All',
         citation: '',
         intent: 'general',
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
             ? `Claude model not available — set ANTHROPIC_MODEL in backend/.env. ${detail}`
             : `AI request failed: ${detail}`
       );
   
       out.statusCode = 502;
       throw out;
     }
   }
   
   // Keep title generation simple and fast
   async function generateConversationTitle(firstMessage) {
     try {
       const response = await client.messages.create({
         model: TITLE_MODEL,
         max_tokens: 12,
         messages: [
           {
             role: 'user',
             content: `Create a very short title for: "${firstMessage}". Only return the title.`,
           },
         ],
       });
   
       return response.content?.[0]?.text?.trim() || 'Spiritual Conversation';
     } catch {
       return 'Spiritual Conversation';
     }
   }
   
   module.exports = { generateWisdomResponse, generateConversationTitle };