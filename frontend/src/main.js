/* ============================================================
   SoulGPT — App Entry Point
   File: frontend/src/main.js
   Guided + Return-Oriented Version
   ============================================================ */

   import { Sidebar } from './components/Sidebar.js';
   import { Chat } from './components/Chat.js';
   import { AudioPlayer } from './components/AudioPlayer.js';
   import { AuthModal } from './components/AuthModal.js';
   import { api, ApiError } from './lib/api.js';
   import { detectIntent } from './lib/utils.js';
   
   // ── Known prayers data (fallback only) ──────────────────────
   const PRAYERS = {
     'hanuman chalisa': { key: 'hanuman-chalisa', title: 'Hanuman Chalisa', tradition: 'Hindu', durationSecs: 503 },
     'gayatri mantra': { key: 'gayatri-mantra', title: 'Gayatri Mantra', tradition: 'Hindu', durationSecs: 255 },
     'om namah shivaya': { key: 'om-namah-shivaya', title: 'Om Namah Shivaya', tradition: 'Hindu', durationSecs: 360 },
     'ganesh aarti': { key: 'ganesh-aarti', title: 'Ganesh Aarti', tradition: 'Hindu', durationSecs: 190 },
     'surah al fatiha': { key: 'surah-al-fatiha', title: 'Surah Al-Fatiha', tradition: 'Islam', durationSecs: 72 },
     'al fatiha': { key: 'surah-al-fatiha', title: 'Surah Al-Fatiha', tradition: 'Islam', durationSecs: 72 },
     'ayatul kursi': { key: 'ayatul-kursi', title: 'Ayatul Kursi', tradition: 'Islam', durationSecs: 150 },
     "lord's prayer": { key: 'lords-prayer', title: "Lord's Prayer", tradition: 'Christian', durationSecs: 105 },
     'lords prayer': { key: 'lords-prayer', title: "Lord's Prayer", tradition: 'Christian', durationSecs: 105 },
     'navkar mantra': { key: 'navkar-mantra', title: 'Navkar Mantra', tradition: 'Jain', durationSecs: 120 },
     'waheguru': { key: 'waheguru-simran', title: 'Waheguru Simran', tradition: 'Sikh', durationSecs: 300 },
     'waheguru simran': { key: 'waheguru-simran', title: 'Waheguru Simran', tradition: 'Sikh', durationSecs: 300 },
     'japji sahib': { key: 'japji-sahib', title: 'Japji Sahib', tradition: 'Sikh', durationSecs: 720 },
   };
   
   // ── State ───────────────────────────────────────────────────
   let currentConversationId = null;
   let currentTradition = 'all';
   let currentLanguage = 'en';
   let currentUser = null;
   let guestMessageCount = parseInt(localStorage.getItem('guest_msg_count') || '0', 10);
   
   // ── Components ──────────────────────────────────────────────
   const sidebar = new Sidebar({
     onTraditionChange: (t) => {
       currentTradition = t;
     },
     onNewChat: () => {
       currentConversationId = null;
       chat.clearMessages();
       chat.setTopbarTitle('Ask spiritual questions. Get wisdom from real scriptures.');
     },
     onHistoryClick: loadConversation,
     onDeleteHistory: deleteConversation,
   });
   
   const chat = new Chat({
     onSend: handleSend,
     onPrayerRequest: async (fallbackKey) => {
       const prayer = PRAYERS['hanuman chalisa'] || { key: fallbackKey || 'hanuman-chalisa', title: 'Hanuman Chalisa', tradition: 'Hindu', durationSecs: 503 };
   
       try {
         const streamData = await api.getPrayerStream(prayer.key);
         player.open({
           title: streamData.title,
           tradition: streamData.tradition,
           audioUrl: streamData.audioUrl,
         });
       } catch (err) {
         console.error('Failed to fetch prayer stream from follow-up action:', err);
         player.open({
           title: prayer.title,
           tradition: prayer.tradition,
           durationSecs: prayer.durationSecs,
           audioUrl: null,
         });
       }
     },
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
   
   // ── Mount ───────────────────────────────────────────────────
   const app = document.getElementById('app');
   app.appendChild(sidebar.render());
   app.appendChild(chat.render());
   document.body.appendChild(player.render());
   document.body.appendChild(authModal.render());
   
   window.addEventListener('openAuthModal', () => {
     authModal.open('login');
   });
   
   window.addEventListener('languageChanged', (e) => {
     currentLanguage = e?.detail?.language || 'en';
   });
   
   // ── Restore session if logged in ────────────────────────────
   (async () => {
     try {
       const data = await api.getMe();
       currentUser = data.user;
       sidebar.updateUser(currentUser);
   
       if (currentUser?.preferredLanguage) {
         currentLanguage = currentUser.preferredLanguage;
       }
   
       const convs = await api.getConversations();
       sidebar.loadHistory(convs.conversations || []);
     } catch {
       // Guest mode
     }
   })();
   
   // ── Helpers ────────────────────────────────────────────────
   function isNetworkError(err) {
     const msg = String(err?.message || '').toLowerCase();
     return err?.name === 'TypeError' || msg.includes('fetch') || msg.includes('network');
   }
   
   async function refreshHistoryIfLoggedIn() {
     if (!currentUser) return;
   
     try {
       const convs = await api.getConversations();
       sidebar.loadHistory(convs.conversations || []);
     } catch (err) {
       console.error('Failed to refresh history:', err);
     }
   }
   
   function appendAssistantResponse(res) {
     chat.appendBotMessage({
       text: res?.message || 'I am here with you.',
       tradition: res?.tradition || null,
       cite: res?.citation || null,
       next_step: res?.next_step || '',
       follow_up_options: res?.follow_up_options || [],
       return_prompt: res?.return_prompt || '',
     });
   }
   
   // ── Handle Send ─────────────────────────────────────────────
   async function handleSend(text) {
     chat.setLoading(true);
     chat.appendUserMessage(text);
     chat.appendTypingIndicator();
   
     try {
       const intent = detectIntent(text);
       console.log('Intent:', intent);
   
       if (intent.type === 'prayer') {
         const key = intent.key;
         const prayer = PRAYERS[key] || PRAYERS['hanuman chalisa'];
   
         chat.removeTypingIndicator();
         chat.appendBotMessage({
           text: `I'll play *${prayer.title}* for you now. 🙏\n\nThis sacred ${prayer.tradition} prayer has been chanted for centuries.\n\nBreathe deeply and simply receive.`,
           tradition: prayer.tradition,
           cite: null,
           next_step: 'Take a slow breath and let the words settle before trying to understand them.',
           follow_up_options: ['Deeper guidance'],
           return_prompt: 'Come back whenever you want another moment of stillness.',
         });
   
         setTimeout(async () => {
           try {
             const streamData = await api.getPrayerStream(prayer.key);
             console.log('Prayer stream data:', streamData);
   
             player.open({
               title: streamData.title,
               tradition: streamData.tradition,
               audioUrl: streamData.audioUrl,
             });
           } catch (err) {
             console.error('Failed to fetch prayer stream:', err);
   
             // Fallback: simulate only if backend stream fetch fails
             player.open({
               title: prayer.title,
               tradition: prayer.tradition,
               durationSecs: prayer.durationSecs,
               audioUrl: null,
             });
           }
         }, 400);
   
         return;
       }
   
       if (!currentUser) {
         guestMessageCount += 1;
         localStorage.setItem('guest_msg_count', guestMessageCount);
   
         if (guestMessageCount > 5) {
           chat.removeTypingIndicator();
           window.dispatchEvent(new CustomEvent('openAuthModal'));
           chat.appendLimitMessage(
             'You have used your 5 free guest questions. Please sign in to continue your spiritual journey.'
           );
           return;
         }
       }
   
       const safeTradition = String(currentTradition || 'all').toLowerCase();
       const safeLanguage = String(currentLanguage || 'en').toLowerCase();
   
       console.log('Sending tradition:', safeTradition);
       console.log('Sending language:', safeLanguage);
   
       const res = await api.sendMessage(
         text,
         safeTradition,
         safeLanguage,
         currentConversationId
       );
   
       currentConversationId = res?.conversationId || currentConversationId;
   
       chat.removeTypingIndicator();
       appendAssistantResponse(res);
   
       await refreshHistoryIfLoggedIn();
     } catch (err) {
       chat.removeTypingIndicator();
   
       if (err instanceof ApiError) {
         if (err.status === 401) {
           window.dispatchEvent(new CustomEvent('openAuthModal'));
           chat.appendErrorMessage(
             'Please sign in to save chats and continue using SoulGPT.'
           );
           return;
         }
   
         if (err.status === 429) {
           chat.appendLimitMessage(
             err.message || 'You have reached your free daily limit. Upgrade to continue.'
           );
   
           if (err.upgrade) {
             setTimeout(() => {
               window.dispatchEvent(new CustomEvent('openPremiumModal'));
             }, 250);
           }
           return;
         }
   
         if (err.status === 404) {
           chat.appendErrorMessage(
             err.message || 'That conversation could not be found.'
           );
           return;
         }
   
         if (err.status === 400) {
           chat.appendErrorMessage(
             err.message || 'Please check your message and try again.'
           );
           return;
         }
   
         chat.appendErrorMessage(
           err.message || 'I encountered an issue reaching the wisdom servers. Please try again.'
         );
         return;
       }
   
       const tip = isNetworkError(err)
         ? '\n\nTip: Start the API from the backend folder with `npm run dev` on port 3001.'
         : '';
   
       chat.appendErrorMessage(
         `I encountered an issue reaching the wisdom servers. Please try again.${tip}`
       );
     } finally {
       chat.setLoading(false);
     }
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
             next_step: msg.next_step,
             follow_up_options: msg.follow_up_options || [],
             return_prompt: msg.return_prompt,
           });
         }
       }
   
       currentConversationId = idOrText;
       chat.setTopbarTitle(data?.title || 'Spiritual Conversation');
     } catch (err) {
       console.error('Failed to load conversation:', err);
   
       if (err instanceof ApiError) {
         chat.appendErrorMessage(err.message || 'Could not load that conversation.');
         return;
       }
   
       chat.appendErrorMessage('Could not load that conversation.');
     }
   }
   
   async function deleteConversation(conversationId) {
     if (!conversationId) return;
   
     const confirmed = window.confirm('Delete this conversation?');
     if (!confirmed) return;
   
     try {
       await api.deleteConversation(conversationId);
   
       if (currentConversationId === conversationId) {
         currentConversationId = null;
         chat.clearMessages();
         chat.setTopbarTitle('Ask spiritual questions. Get wisdom from real scriptures.');
       }
   
       const convs = await api.getConversations();
       sidebar.loadHistory(convs.conversations || []);
     } catch (err) {
       console.error('Failed to delete conversation:', err);
   
       if (err instanceof ApiError) {
         alert(err.message || 'Could not delete conversation. Please try again.');
         return;
       }
   
       alert('Could not delete conversation. Please try again.');
     }
   }