/* ============================================================
   SoulGPT — App Entry Point
   File: frontend/src/main.js
   ============================================================ */

   import { Sidebar }      from './components/Sidebar.js';
   import { Chat }         from './components/Chat.js';
   import { AudioPlayer }  from './components/AudioPlayer.js';
   import { AuthModal }    from './components/AuthModal.js';
   import { api }          from './lib/api.js';
   import { detectIntent } from './lib/utils.js';
   
   // ── Known prayers data (mirrors backend) ─────────────────
   const PRAYERS = {
     'hanuman chalisa': { title: 'Hanuman Chalisa', tradition: 'Hindu', durationSecs: 503 },
     'gayatri mantra': { title: 'Gayatri Mantra', tradition: 'Hindu', durationSecs: 255 },
     'om namah shivaya': { title: 'Om Namah Shivaya', tradition: 'Hindu', durationSecs: 360 },
     'ganesh aarti': { title: 'Ganesh Aarti', tradition: 'Hindu', durationSecs: 190 },
     'surah al fatiha': { title: 'Surah Al-Fatiha', tradition: 'Islam', durationSecs: 72 },
     'ayatul kursi': { title: 'Ayatul Kursi', tradition: 'Islam', durationSecs: 150 },
     "lord's prayer": { title: "Lord's Prayer", tradition: 'Christian', durationSecs: 105 },
     'navkar mantra': { title: 'Navkar Mantra', tradition: 'Jain', durationSecs: 120 },
     'waheguru': { title: 'Waheguru Simran', tradition: 'Sikh', durationSecs: 300 },
     'japji sahib': { title: 'Japji Sahib', tradition: 'Sikh', durationSecs: 720 },
   };
   
   // ── State ────────────────────────────────────────────────
   let currentConversationId = null;
   let currentTradition = 'all';
   let currentUser = null;
   
   // ── Components ───────────────────────────────────────────
   const sidebar = new Sidebar({
     onTraditionChange: (t) => { currentTradition = t; },
     onNewChat: () => {
       currentConversationId = null;
       chat.clearMessages();
     },
     onHistoryClick: loadConversation,
   });
   
   const chat = new Chat({
     onSend: handleSend,
   });
   
   const player = new AudioPlayer();
   
   const authModal = new AuthModal({
     onAuthSuccess: async (user) => {
       currentUser = user;
       sidebar.updateUser(currentUser);
   
       try {
         const convs = await api.getConversations();
         sidebar.loadHistory(convs.conversations || []);
       } catch (err) {
         console.error('Failed to load conversations after login:', err);
       }
     },
   });
   
   // ── Mount ────────────────────────────────────────────────
   const app = document.getElementById('app');
   app.appendChild(sidebar.render());
   app.appendChild(chat.render());
   document.body.appendChild(player.render());
   document.body.appendChild(authModal.render());
   
   window.addEventListener('openAuthModal', () => {
     authModal.open('login');
   });
   
   // ── Auth (try to restore session) ───────────────────────
   (async () => {
     try {
       const data = await api.getMe();
       currentUser = data.user;
       sidebar.updateUser(currentUser);
   
       const convs = await api.getConversations();
       sidebar.loadHistory(convs.conversations || []);
     } catch {
       // Guest mode — that's fine
     }
   })();
   
   // ── Handle Send ──────────────────────────────────────────
   async function handleSend(text) {
     chat.setLoading(true);
     chat.appendUserMessage(text);
     chat.appendTypingIndicator();
   
     try {
       // Optimistic prayer detection for instant feedback
       const intent = detectIntent(text);
   
       if (intent.type === 'prayer') {
         const key = intent.key;
         const prayer = PRAYERS[key] || PRAYERS['hanuman chalisa'];
   
         chat.removeTypingIndicator();
         chat.appendBotMessage({
           text: `I'll play *${prayer.title}* for you now. 🙏\n\nThis sacred ${prayer.tradition} prayer has been chanted for centuries. Duration: ${formatDur(prayer.durationSecs)}.\n\nBreath deeply and simply receive.`,
           tradition: prayer.tradition,
           cite: null,
         });
   
         setTimeout(() => {
           player.open({ ...prayer, audioUrl: null });
         }, 400);
       } else {
         const res = await api.sendMessage(text, currentTradition, 'en', currentConversationId);
         currentConversationId = res.conversationId;
   
         chat.removeTypingIndicator();
         chat.appendBotMessage({
           text: res.message,
           tradition: res.tradition,
           cite: res.citation,
         });
       }
     } catch (err) {
       chat.removeTypingIndicator();
   
       const msg = String(err?.message || '');
   
       if (msg.includes('[401]')) {
         window.dispatchEvent(new CustomEvent('openAuthModal'));
         chat.appendBotMessage({
           text: 'Please sign in to save chats and continue using SoulGPT.',
           tradition: null,
           cite: null,
           plain: true,
         });
         chat.setLoading(false);
         return;
       }
   
       const network =
         err?.name === 'TypeError' ||
         msg.toLowerCase().includes('fetch');
   
       const tip = network
         ? '\n\n*Tip:* Start the API from the `backend` folder: `npm run dev` (port 3001). You also need a `.env` there with `MONGODB_URI`, `JWT_SECRET`, and `ANTHROPIC_API_KEY`.'
         : '';
   
       chat.appendBotMessage({
         text: `I encountered an error reaching the wisdom servers. Please try again.${tip}\n\nError: ${err.message || 'Unknown error'}`,
         tradition: null,
         cite: null,
         plain: true,
       });
     }
   
     chat.setLoading(false);
   }
   
   async function loadConversation(idOrText) {
     if (!idOrText) return;
   
     try {
       const data = await api.getConversation(idOrText);
       if (!data?.messages) return;
   
       chat.clearMessages();
   
       for (const msg of data.messages) {
         if (msg.role === 'user') {
           chat.appendUserMessage(msg.content);
         } else {
           chat.appendBotMessage({
             text: msg.content,
             tradition: msg.tradition,
             cite: msg.citation,
           });
         }
       }
   
       currentConversationId = idOrText;
     } catch {
       // silent
     }
   }
   
   function formatDur(secs) {
     return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
   }