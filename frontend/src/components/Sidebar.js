/* ============================================================
   SoulGPT — Sidebar Component (UPGRADED UI)
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
          ✦ New conversation
        </button>
  
        <div class="sidebar-scroll">
          <div class="sec-label">Explore</div>
  
          <div class="religions">
            ${this._traditionsHTML()}
          </div>
  
          <div class="tradition-focus">
            ${this._traditionFocusHTML(this.activeTradition)}
          </div>
  
          <div class="sec-label sec-label-recent">Recent</div>
  
          <div class="history" id="historyList"></div>
        </div>
  
        <div class="sb-bottom">
          <button class="user-row guest-clickable" id="userRow">
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
  
      // ✨ Smooth animation
      requestAnimationFrame(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-12px)';
        setTimeout(() => {
          el.style.transition = 'all 0.4s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
        }, 50);
      });
  
      return el;
    }
  
    _bindEvents(el) {
      el.querySelector('#newChatBtn')?.addEventListener('click', () => this.onNewChat?.());
  
      el.querySelectorAll('.r-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.r-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
  
          this.activeTradition = btn.dataset.tradition;
  
          el.querySelector('.tradition-focus').innerHTML =
            this._traditionFocusHTML(this.activeTradition);
  
          this.onTraditionChange?.(this.activeTradition);
        });
      });
    }
  
    _traditionsHTML() {
      const t = [
        ['all','🌍','All traditions'],
        ['hindu','🕉️','Hindu'],
        ['islam','☪️','Islam'],
        ['christian','✝️','Christian'],
        ['jain','🔷','Jain'],
        ['sikh','☬','Sikh'],
        ['buddhist','☸️','Buddhist'],
      ];
  
      return t.map(([id,icon,label])=>`
        <button class="r-btn ${id===this.activeTradition?'active':''}" data-tradition="${id}">
          <div class="r-icon">${icon}</div>
          <span class="r-name">${label}</span>
          <div class="r-dot"></div>
        </button>
      `).join('');
    }
  
    _traditionFocusHTML(t) {
      const map = {
        all:{title:'Open exploration',desc:'Ask across traditions freely.',chips:['Purpose','Anxiety','Prayer']},
        hindu:{title:'Hindu wisdom',desc:'Gita, dharma, sacred chants.',chips:['Gita','Dharma','Chalisa']},
        islam:{title:'Islamic guidance',desc:'Patience, dua, surrender.',chips:['Dua','Sabr','Peace']},
        christian:{title:'Christian reflection',desc:'Bible, prayer, hope.',chips:['Verses','Prayer','Hope']},
        buddhist:{title:'Buddhist insight',desc:'Mindfulness & peace.',chips:['Mindfulness','Calm']},
        sikh:{title:'Sikh wisdom',desc:'Seva & humility.',chips:['Seva','Naam']},
        jain:{title:'Jain wisdom',desc:'Ahimsa & discipline.',chips:['Ahimsa','Purity']}
      };
  
      const item = map[t] || map.all;
  
      return `
        <div class="focus-card">
          <div class="focus-title">${item.title}</div>
          <div class="focus-desc">${item.desc}</div>
          <div class="focus-chips">
            ${item.chips.map(c=>`<span class="focus-chip">${c}</span>`).join('')}
          </div>
        </div>
      `;
    }
  }