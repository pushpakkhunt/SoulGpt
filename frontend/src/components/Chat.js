/* ============================================================
   SoulGPT — Chat Component
   File: frontend/src/components/Chat.js
   Guided + Daily Reflection Version
   ============================================================ */

   import { TRADITION_BADGE_MAP, formatMessage } from '../lib/utils.js';

   export class Chat {
     constructor({ onSend, onPrayerRequest }) {
       this.onSend = onSend;
       this.onPrayerRequest = onPrayerRequest;
       this.isLoading = false;
     }
   
     render() {
       const el = document.createElement('div');
       el.className = 'main';
       el.innerHTML = `
         <div class="topbar">
           <div class="tb-title" id="tbTitle">Ask spiritual questions. Get wisdom from real scriptures.</div>
           <div class="tb-right">
             <button class="lang active" data-lang="en">EN</button>
             <button class="lang" data-lang="hi">हिं</button>
             <button class="lang" data-lang="gu">ગુ</button>
             <button class="prem-btn" id="premBtn">✦ Go Premium</button>
           </div>
         </div>
   
         <div class="messages" id="msgs">
           ${this._welcomeHTML()}
         </div>
   
         <div class="input-area">
           <div class="input-wrap">
             <textarea
               id="uinput"
               placeholder="Ask about faith, anxiety, purpose, prayer... or say 'Play Hanuman Chalisa'"
               rows="1"
             ></textarea>
             <button class="send" id="sendBtn" aria-label="Send message">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                 <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
               </svg>
             </button>
           </div>
           <div class="hint">
             Grounded in real spiritual traditions &nbsp;·&nbsp; Free: 5 questions/day
           </div>
         </div>
       `;
   
       this._bindEvents(el);
       return el;
     }
   
     _bindEvents(el) {
       const input = el.querySelector('#uinput');
       const sendBtn = el.querySelector('#sendBtn');
   
       input.addEventListener('input', () => {
         input.style.height = 'auto';
         input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
       });
   
       input.addEventListener('keydown', (e) => {
         if (e.key === 'Enter' && !e.shiftKey) {
           e.preventDefault();
           this._handleSend();
         }
       });
   
       sendBtn.addEventListener('click', () => this._handleSend());
   
       el.querySelectorAll('.lang').forEach((btn) => {
         btn.addEventListener('click', () => {
           el.querySelectorAll('.lang').forEach((b) => b.classList.remove('active'));
           btn.classList.add('active');
   
           window.dispatchEvent(
             new CustomEvent('languageChanged', {
               detail: { language: btn.dataset.lang },
             })
           );
         });
       });
   
       el.querySelector('#premBtn').addEventListener('click', () => {
         window.dispatchEvent(new CustomEvent('openPremiumModal'));
       });
   
       el.addEventListener('click', (e) => {
         const sug = e.target.closest('.sug');
         if (sug) {
           const text = sug.querySelector('.sug-text')?.textContent?.trim();
           if (!text) return;
   
           input.value = text;
           input.style.height = 'auto';
           input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
           this._handleSend();
           return;
         }
   
         const reflection = e.target.closest('.reflection-action');
         if (reflection) {
           const text = reflection.dataset.prompt?.trim();
           if (!text) return;
   
           input.value = text;
           input.style.height = 'auto';
           input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
           this._handleSend();
           return;
         }
   
         const follow = e.target.closest('.follow-btn');
         if (follow) {
           const text = follow.dataset.follow?.trim();
           if (!text) return;
   
           if (text.toLowerCase() === 'calming audio') {
             this.onPrayerRequest?.('hanuman_chalisa');
             return;
           }
   
           input.value = text;
           input.style.height = 'auto';
           input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
           this._handleSend();
         }
       });
     }
   
     _handleSend() {
       const input = document.getElementById('uinput');
       const text = input?.value.trim();
   
       if (!text || this.isLoading) return;
   
       input.value = '';
       input.style.height = 'auto';
       this.onSend?.(text);
     }
   
     setLoading(loading) {
       this.isLoading = Boolean(loading);
   
       const btn = document.getElementById('sendBtn');
       const input = document.getElementById('uinput');
   
       if (btn) btn.disabled = this.isLoading;
       if (input) input.disabled = this.isLoading;
     }
   
     appendUserMessage(text) {
       this._removeWelcome();
   
       const msgs = document.getElementById('msgs');
       if (!msgs) return;
   
       const el = document.createElement('div');
       el.className = 'msg user';
       el.innerHTML = `
         <div class="msg-av u-av" id="userChatAvatar">PU</div>
         <div class="msg-body">
           <div class="msg-name">You</div>
           <div class="bubble">${this._escapeHTML(String(text || ''))}</div>
         </div>
       `;
   
       msgs.appendChild(el);
       this._scrollToBottom(msgs);
     }
   
     appendTypingIndicator() {
       this._removeWelcome();
   
       const msgs = document.getElementById('msgs');
       if (!msgs || document.getElementById('typingIndicator')) return;
   
       const el = document.createElement('div');
       el.className = 'msg';
       el.id = 'typingIndicator';
       el.innerHTML = `
         <div class="msg-av soul-av">✦</div>
         <div class="msg-body">
           <div class="msg-name">SoulGPT</div>
           <div class="bubble">
             <div class="typing">
               <span></span><span></span><span></span>
             </div>
           </div>
         </div>
       `;
   
       msgs.appendChild(el);
       this._scrollToBottom(msgs);
     }
   
     removeTypingIndicator() {
       document.getElementById('typingIndicator')?.remove();
     }
   
     appendBotMessage({
       text,
       tradition,
       cite,
       next_step,
       follow_up_options = [],
       return_prompt,
       plain = false,
       system = false,
     }) {
       this._removeWelcome();
   
       const msgs = document.getElementById('msgs');
       if (!msgs) return;
   
       const cleanedText = this._cleanAssistantText(text);
       const normalizedTradition = typeof tradition === 'string' ? tradition.trim() : '';
       const badge = TRADITION_BADGE_MAP[normalizedTradition.toLowerCase()] || 't-a';
   
       const formattedText = plain
         ? this._escapeHTML(cleanedText).replace(/\n/g, '<br>')
         : formatMessage(cleanedText);
   
       const safeOptions = Array.isArray(follow_up_options)
         ? follow_up_options.filter(Boolean).slice(0, 3)
         : [];
   
       const el = document.createElement('div');
       el.className = `msg ${system ? 'msg-system' : ''}`;
       el.innerHTML = `
         <div class="msg-av soul-av">${system ? '⚠' : '✦'}</div>
         <div class="msg-body">
           <div class="msg-name">${system ? 'SoulGPT Notice' : 'SoulGPT'}</div>
           <div class="bubble">
             ${
               normalizedTradition && !system
                 ? `<div class="trad-badge ${badge}">${this._escapeHTML(normalizedTradition)}</div><br>`
                 : ''
             }
   
             ${formattedText}
   
             ${cite ? `<br><br><div class="cite">📖 ${this._escapeHTML(cite)}</div>` : ''}
   
             ${
               next_step
                 ? `<div class="next-step">✨ ${this._escapeHTML(next_step)}</div>`
                 : ''
             }
   
             ${
               safeOptions.length
                 ? `<div class="follow-ups">
                     ${safeOptions
                       .map(
                         (opt) =>
                           `<button class="follow-btn" data-follow="${this._escapeHTML(opt)}">${this._escapeHTML(opt)}</button>`
                       )
                       .join('')}
                   </div>`
                 : ''
             }
   
             ${
               return_prompt
                 ? `<div class="return-prompt">${this._escapeHTML(return_prompt)}</div>`
                 : ''
             }
           </div>
         </div>
       `;
   
       msgs.appendChild(el);
       this._scrollToBottom(msgs);
     }
   
     appendLimitMessage(message) {
       this.appendBotMessage({
         text: message || 'You have reached your free daily limit. Upgrade to continue.',
         plain: true,
         system: true,
       });
     }
   
     appendErrorMessage(message) {
       this.appendBotMessage({
         text:
           message ||
           'I encountered an issue reaching the wisdom servers. Please try again.',
         plain: true,
         system: true,
       });
     }
   
     clearMessages() {
       const msgs = document.getElementById('msgs');
       if (msgs) msgs.innerHTML = this._welcomeHTML();
     }
   
     setTopbarTitle(title) {
       const el = document.getElementById('tbTitle');
       if (el) el.textContent = title || 'Ask spiritual questions. Get wisdom from real scriptures.';
     }
   
     _removeWelcome() {
       document.getElementById('welcome')?.remove();
     }
   
     _scrollToBottom(container) {
       container.scrollTop = container.scrollHeight;
     }
   
     _cleanAssistantText(text) {
       const raw = String(text || '').trim();
       if (!raw) return '';
   
       if (raw.startsWith('{') && raw.includes('"message"')) {
         try {
           const parsed = JSON.parse(raw);
           if (typeof parsed?.message === 'string' && parsed.message.trim()) {
             return parsed.message.trim();
           }
         } catch {
           const match = raw.match(/"message"\s*:\s*"([\s\S]*?)"\s*(,|\})/);
           if (match?.[1]) {
             return match[1]
               .replace(/\\n/g, '\n')
               .replace(/\\"/g, '"')
               .replace(/\\\\/g, '\\')
               .trim();
           }
         }
       }
   
       return raw;
     }
   
     _escapeHTML(str) {
       return String(str || '')
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;');
     }
   
     _todayReflection() {
       const reflections = [
         {
           theme: 'Letting go of control',
           line: 'Peace often begins when you stop gripping tomorrow so tightly.',
           prompt: 'How do I spiritually let go of control?',
         },
         {
           theme: 'Patience in uncertainty',
           line: 'The soul grows quietly in seasons where answers do not come quickly.',
           prompt: 'What do spiritual traditions say about patience in uncertainty?',
         },
         {
           theme: 'Calm in anxiety',
           line: 'An anxious mind looks ahead; a steady heart returns to the present.',
           prompt: 'Give me spiritual guidance for anxiety right now',
         },
         {
           theme: 'Purpose and direction',
           line: 'Clarity often comes after faithfulness to the next small step.',
           prompt: 'How do I find spiritual clarity about my purpose?',
         },
       ];
   
       const today = new Date();
       const index = today.getDate() % reflections.length;
       return reflections[index];
     }
   
     _welcomeHTML() {
       const reflection = this._todayReflection();
   
       return `
         <div class="welcome" id="welcome">
           <div class="w-sym">✦</div>
           <div class="w-title">Ask spiritual questions. Receive wisdom grounded in real traditions.</div>
           <div class="w-sub">
             Explore peace, purpose, anxiety, prayer, scripture, and meaning across Hindu, Islamic,
             Christian, Buddhist, Sikh, and Jain teachings.
           </div>
   
           <div class="daily-reflection">
             <div class="daily-kicker">Today’s Reflection</div>
             <div class="daily-theme">${this._escapeHTML(reflection.theme)}</div>
             <div class="daily-line">${this._escapeHTML(reflection.line)}</div>
             <button class="reflection-action" data-prompt="${this._escapeHTML(reflection.prompt)}">
               Explore this today
             </button>
           </div>
   
           <div class="suggestions">
             <div class="sug">
               <span class="sug-icon">🕉️</span>
               <div class="sug-text">What does the Bhagavad Gita say about anxiety?</div>
             </div>
             <div class="sug">
               <span class="sug-icon">☪️</span>
               <div class="sug-text">What does Islam teach about patience?</div>
             </div>
             <div class="sug">
               <span class="sug-icon">✝️</span>
               <div class="sug-text">Give me a Bible verse for when I feel lost</div>
             </div>
             <div class="sug">
               <span class="sug-icon">🎵</span>
               <div class="sug-text">Play Hanuman Chalisa for me</div>
             </div>
           </div>
         </div>
       `;
     }
   }