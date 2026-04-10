/* ============================================================
   SoulGPT — Sidebar Component
   File: frontend/src/components/Sidebar.js
   ============================================================ */

export class Sidebar {
  constructor({ onTraditionChange, onNewChat, onHistoryClick }) {
    this.onTraditionChange = onTraditionChange;
    this.onNewChat = onNewChat;
    this.onHistoryClick = onHistoryClick;
    this.activeTradition = 'all';
  }

  render() {
    const el = document.createElement('aside');
    el.className = 'sidebar';
    el.innerHTML = `
      <div class="logo-area">
        <div class="logo">Soul<span>GPT</span></div>
        <div class="logo-sub">Wisdom from every tradition</div>
      </div>

      <button class="new-btn" id="newChatBtn">
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
        <!-- Loaded dynamically from API -->
        <div class="h-item cur">What does the Gita say about purpose?</div>
        <div class="h-item">Play Hanuman Chalisa</div>
        <div class="h-item">How to deal with grief in Islam?</div>
        <div class="h-item">Bible verse for anxiety</div>
      </div>

      <div class="sb-bottom">
        <div class="user-row" id="userRow">
          <div class="avatar" id="userAvatar">?</div>
          <div>
            <div class="u-name" id="userName">Guest</div>
            <div class="u-plan" id="userPlan">Sign in to save chats</div>
          </div>
        </div>
      </div>
    `;

    // Bind events
    el.querySelector('#newChatBtn').addEventListener('click', () => this.onNewChat?.());

    el.querySelectorAll('.r-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.r-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTradition = btn.dataset.tradition;
        this.onTraditionChange?.(this.activeTradition);
      });
    });

    el.querySelectorAll('.h-item').forEach(item => {
      item.addEventListener('click', () => this.onHistoryClick?.(item.textContent));
    });

    return el;
  }

  _traditionsHTML() {
    const traditions = [
      { id: 'all',       icon: '🌍', label: 'All traditions' },
      { id: 'hindu',     icon: '🕉️', label: 'Hindu'          },
      { id: 'islam',     icon: '☪️', label: 'Islam'          },
      { id: 'christian', icon: '✝️', label: 'Christian'      },
      { id: 'jain',      icon: '🔷', label: 'Jain'           },
      { id: 'sikh',      icon: '☬',  label: 'Sikh'           },
      { id: 'buddhist',  icon: '☸️', label: 'Buddhist'       },
    ];

    return traditions.map(t => `
      <button class="r-btn ${t.id === 'all' ? 'active' : ''}" data-tradition="${t.id}">
        <div class="r-icon">${t.icon}</div>
        <span class="r-name">${t.label}</span>
        <div class="r-dot"></div>
      </button>
    `).join('');
  }

  updateUser(user) {
    const avatar = document.getElementById('userAvatar');
    const name   = document.getElementById('userName');
    const plan   = document.getElementById('userPlan');
    if (!avatar || !name || !plan) return;

    if (user) {
      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      avatar.textContent = initials;
      name.textContent   = user.name;
      plan.textContent   = user.plan === 'premium'
        ? '✦ Premium · Unlimited'
        : `Free · ${user.remainingToday}/5 left today`;
    } else {
      avatar.textContent = '?';
      name.textContent   = 'Guest';
      plan.textContent   = 'Sign in to save chats';
    }
  }

  loadHistory(conversations) {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = conversations
      .map((c, i) => `
        <div class="h-item ${i === 0 ? 'cur' : ''}" data-id="${c.id}">
          ${c.title}
        </div>
      `).join('');

    list.querySelectorAll('.h-item').forEach(item => {
      item.addEventListener('click', () => this.onHistoryClick?.(item.dataset.id));
    });
  }
}
