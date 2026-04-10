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
      <!-- Top Bar -->
      <div class="topbar">
        <div class="tb-title" id="tbTitle">Ask anything spiritual...</div>
        <div class="tb-right">
          <button class="lang active" data-lang="en">EN</button>
          <button class="lang" data-lang="hi">हिं</button>
          <button class="lang" data-lang="gu">ગુ</button>
          <button class="prem-btn" id="premBtn">✦ Go Premium</button>
        </div>
      </div>

      <!-- Messages -->
      <div class="messages" id="msgs">
        ${this._welcomeHTML()}
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-wrap">
          <textarea
            id="uinput"
            placeholder="Ask a question or say 'Play Hanuman Chalisa'..."
            rows="1"
          ></textarea>
          <button class="send" id="sendBtn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
        <div class="hint">
          SoulGPT cites verified scriptures — not AI hallucinations &nbsp;·&nbsp; Free: 5 questions/day
        </div>
      </div>
    `;

    this._bindEvents(el);
    return el;
  }

  _bindEvents(el) {
    const input   = el.querySelector('#uinput');
    const sendBtn = el.querySelector('#sendBtn');

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    });

    // Send on Enter (Shift+Enter for newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });

    sendBtn.addEventListener('click', () => this._handleSend());

    // Language switcher
    el.querySelectorAll('.lang').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.lang').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // TODO: dispatch language change event
      });
    });

    // Premium button
    el.querySelector('#premBtn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('openPremiumModal'));
    });

    // Suggestion cards
    el.addEventListener('click', (e) => {
      const sug = e.target.closest('.sug');
      if (sug) {
        const text = sug.querySelector('.sug-text').textContent;
        input.value = text;
        this._handleSend();
      }
    });
  }

  _handleSend() {
    const input = document.getElementById('uinput');
    const text  = input?.value.trim();
    if (!text || this.isLoading) return;

    input.value = '';
    input.style.height = 'auto';
    this.onSend?.(text);
  }

  setLoading(loading) {
    this.isLoading = loading;
    const btn = document.getElementById('sendBtn');
    if (btn) btn.disabled = loading;
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
        <div class="bubble">${this._escapeHTML(text)}</div>
      </div>
    `;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  appendTypingIndicator() {
    this._removeWelcome();
    const msgs = document.getElementById('msgs');
    if (!msgs) return;

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
    msgs.scrollTop = msgs.scrollHeight;
  }

  removeTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
  }

  appendBotMessage({ text, tradition, cite, plain = false }) {
    const msgs = document.getElementById('msgs');
    if (!msgs) return;

    const badge = TRADITION_BADGE_MAP[tradition?.toLowerCase()] || 't-a';
    const formattedText = plain
      ? this._escapeHTML(text).replace(/\n/g, '<br>')
      : formatMessage(text);

    const el = document.createElement('div');
    el.className = 'msg';
    el.innerHTML = `
      <div class="msg-av soul-av">✦</div>
      <div class="msg-body">
        <div class="msg-name">SoulGPT</div>
        <div class="bubble">
          ${tradition ? `<div class="trad-badge ${badge}">${tradition}</div><br>` : ''}
          ${formattedText}
          ${cite ? `<br><br><div class="cite">📖 ${this._escapeHTML(cite)}</div>` : ''}
        </div>
      </div>
    `;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  clearMessages() {
    const msgs = document.getElementById('msgs');
    if (msgs) msgs.innerHTML = this._welcomeHTML();
  }

  setTopbarTitle(title) {
    const el = document.getElementById('tbTitle');
    if (el) el.textContent = title;
  }

  _removeWelcome() {
    document.getElementById('welcome')?.remove();
  }

  _escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _welcomeHTML() {
    return `
      <div class="welcome" id="welcome">
        <div class="w-sym">✦</div>
        <div class="w-title">What wisdom are you seeking?</div>
        <div class="w-sub">
          Ask any life question and receive answers from the world's greatest spiritual traditions.
          Or say "Play Hanuman Chalisa."
        </div>
        <div class="suggestions">
          <div class="sug">
            <span class="sug-icon">🕉️</span>
            <div class="sug-text">What does the Bhagavad Gita say about finding purpose?</div>
          </div>
          <div class="sug">
            <span class="sug-icon">🎵</span>
            <div class="sug-text">Play Hanuman Chalisa for me</div>
          </div>
          <div class="sug">
            <span class="sug-icon">☪️</span>
            <div class="sug-text">What does Islam say about anxiety and worry?</div>
          </div>
          <div class="sug">
            <span class="sug-icon">✝️</span>
            <div class="sug-text">Give me a Bible verse for when I feel lost</div>
          </div>
        </div>
      </div>
    `;
  }
}
