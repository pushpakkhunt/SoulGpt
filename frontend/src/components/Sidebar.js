/* ============================================================
   SoulGPT — Sidebar Component
   File: frontend/src/components/Sidebar.js
   ============================================================ */

   export class Sidebar {
    constructor({ onTraditionChange, onNewChat, onHistoryClick, onDeleteHistory }) {
      this.onTraditionChange = onTraditionChange;
      this.onNewChat = onNewChat;
      this.onHistoryClick = onHistoryClick;
      this.onDeleteHistory = onDeleteHistory;
      this.activeTradition = 'all';
      this.currentUser = null;
    }
  
    render() {
      const el = document.createElement('aside');
      el.className = 'sidebar';
      el.innerHTML = `
        <div class="logo-area">
          <div class="logo">Soul<span>GPT</span></div>
          <div class="logo-sub">Wisdom from every tradition</div>
        </div>
  
        <button class="new-btn" id="newChatBtn" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New conversation
        </button>
  
        <div class="sec-label" style="margin-top:6px;">Tradition</div>
        <div class="religions" id="traditionList">
          ${this._traditionsHTML()}
        </div>
  
        <div style="height:12px;"></div>
        <div class="sec-label">Recent</div>
        <div class="history" id="historyList">
          <div class="h-item cur">What does the Gita say about purpose?</div>
          <div class="h-item">Play Hanuman Chalisa</div>
          <div class="h-item">How to deal with grief in Islam?</div>
          <div class="h-item">Bible verse for anxiety</div>
        </div>
  
        <div class="sb-bottom">
          <button class="user-row guest-clickable" id="userRow" type="button">
            <div class="avatar" id="userAvatar">?</div>
            <div class="u-info">
              <div class="u-name" id="userName">Guest</div>
              <div class="u-plan" id="userPlan">Sign in to save chats</div>
              <div class="signout-link" id="signOutBtn" style="display:none;">Sign out</div>
            </div>
          </button>
        </div>
      `;
  
      this._bindEvents(el);
      return el;
    }
  
    _bindEvents(el) {
      const newChatBtn = el.querySelector('#newChatBtn');
      newChatBtn?.addEventListener('click', () => this.onNewChat?.());
  
      el.querySelectorAll('.r-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.r-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeTradition = btn.dataset.tradition || 'all';
          this.onTraditionChange?.(this.activeTradition);
        });
      });
  
      el.querySelectorAll('.h-item').forEach((item) => {
        item.addEventListener('click', () => {
          const value = item.dataset.id || item.textContent?.trim();
          this.onHistoryClick?.(value);
        });
      });
  
      const userRow = el.querySelector('#userRow');
      userRow?.addEventListener('click', () => {
        if (!this.currentUser) {
          window.dispatchEvent(new CustomEvent('openAuthModal'));
        }
      });
  
      const signOutBtn = el.querySelector('#signOutBtn');
      signOutBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._signOut();
      });
    }
  
    _signOut() {
      localStorage.removeItem('soulgpt_token');
      localStorage.removeItem('soulgpt_user');
      sessionStorage.clear();
      this.updateUser(null);
      window.location.reload();
    }
  
    _traditionsHTML() {
      const traditions = [
        { id: 'all', icon: '🌍', label: 'All traditions' },
        { id: 'hindu', icon: '🕉️', label: 'Hindu' },
        { id: 'islam', icon: '☪️', label: 'Islam' },
        { id: 'christian', icon: '✝️', label: 'Christian' },
        { id: 'jain', icon: '🔷', label: 'Jain' },
        { id: 'sikh', icon: '☬', label: 'Sikh' },
        { id: 'buddhist', icon: '☸️', label: 'Buddhist' },
      ];
  
      return traditions
        .map(
          (t) => `
            <button class="r-btn ${t.id === 'all' ? 'active' : ''}" data-tradition="${t.id}" type="button">
              <div class="r-icon">${t.icon}</div>
              <span class="r-name">${t.label}</span>
              <div class="r-dot"></div>
            </button>
          `
        )
        .join('');
    }
  
    updateUser(user) {
      this.currentUser = user || null;
  
      const avatar = document.getElementById('userAvatar');
      const name = document.getElementById('userName');
      const plan = document.getElementById('userPlan');
      const userRow = document.getElementById('userRow');
      const signOutBtn = document.getElementById('signOutBtn');
  
      if (!avatar || !name || !plan || !userRow || !signOutBtn) return;
  
      if (user) {
        const baseName =
          user.name?.trim() ||
          (user.email ? user.email.split('@')[0] : 'User');
  
        const initials = baseName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
  
        avatar.textContent = initials;
        name.textContent = baseName;
        plan.textContent =
          user.plan === 'premium'
            ? '✦ Premium · Unlimited'
            : `Free · ${user.remainingToday ?? 5}/5 left today`;
  
        userRow.classList.remove('guest-clickable');
        userRow.disabled = true;
        userRow.style.cursor = 'default';
        signOutBtn.style.display = 'block';
      } else {
        avatar.textContent = '?';
        name.textContent = 'Guest';
        plan.textContent = 'Sign in to save chats';
  
        userRow.classList.add('guest-clickable');
        userRow.disabled = false;
        userRow.style.cursor = 'pointer';
        signOutBtn.style.display = 'none';
      }
    }
  
    loadHistory(conversations) {
      const list = document.getElementById('historyList');
      if (!list) return;
  
      if (!Array.isArray(conversations) || conversations.length === 0) {
        list.innerHTML = `<div class="h-item">No recent conversations</div>`;
        return;
      }
  
      list.innerHTML = conversations
        .map((c, i) => {
          const id = c._id || c.id || '';
          const title = c.title || 'Untitled conversation';
  
          return `
            <div class="h-row ${i === 0 ? 'cur' : ''}" data-id="${id}">
              <div class="h-item" data-id="${id}" title="${title}">
                ${title}
              </div>
              <button class="h-del" data-id="${id}" type="button" title="Delete chat">✕</button>
            </div>
          `;
        })
        .join('');
  
      list.querySelectorAll('.h-item').forEach((item) => {
        item.addEventListener('click', () => {
          list.querySelectorAll('.h-row').forEach((row) => row.classList.remove('cur'));
          item.closest('.h-row')?.classList.add('cur');
  
          const conversationId = item.dataset.id;
          if (conversationId) {
            this.onHistoryClick?.(conversationId);
          }
        });
      });
  
      list.querySelectorAll('.h-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const conversationId = btn.dataset.id;
          if (conversationId) {
            this.onDeleteHistory?.(conversationId);
          }
        });
      });
    }
  }