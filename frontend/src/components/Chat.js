/* ============================================================
   SoulGPT — Chat Component
   File: frontend/src/components/Chat.js
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
   
     appendBotMessage({ text, tradition, cite, plain = false, system = false }) {
       this._removeWelcome();
   
       const msgs = document.getElementById('msgs');
       if (!msgs) return;
   
       const cleanedText = this._cleanAssistantText(text);
       const normalizedTradition = typeof tradition === 'string' ? tradition.trim() : '';
       const badge = TRADITION_BADGE_MAP[normalizedTradition.toLowerCase()] || 't-a';
   
       const formattedText = plain
         ? this._escapeHTML(cleanedText).replace(/\n/g, '<br>')
         : formatMessage(cleanedText);
   
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
       if (el) el.textContent = title || 'Ask anything spiritual...';
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
   
       // If JSON-like text slips through, try extracting just the message field
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
         .replace(/>/g, '&gt;');
     }
   
     _welcomeHTML() {
      return `
        <div class="welcome" id="welcome">
          <div class="w-sym">✦</div>
          <div class="w-title">Ask spiritual questions. Receive wisdom grounded in real traditions.</div>
          <div class="w-sub">
            Explore peace, purpose, anxiety, prayer, scripture, and meaning across Hindu, Islamic,
            Christian, Buddhist, Sikh, and Jain teachings.
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