/* ============================================================
   SoulGPT — Auth Modal Component
   File: frontend/src/components/AuthModal.js
   ============================================================ */

   import { api } from '../lib/api.js';

   export class AuthModal {
     constructor({ onAuthSuccess } = {}) {
       this.onAuthSuccess = onAuthSuccess;
       this.mode = 'login';
       this.el = null;
     }
   
     render() {
       const overlay = document.createElement('div');
       overlay.className = 'auth-modal-overlay';
       overlay.id = 'authModalOverlay';
   
       overlay.innerHTML = `
         <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
           <button class="auth-close" id="authCloseBtn" type="button">&times;</button>
   
           <div class="auth-head">
             <h2 id="authTitle">Welcome to SoulGPT</h2>
             <p id="authSubtitle">Sign in to save chats and continue your spiritual journey.</p>
           </div>
   
           <div class="auth-tabs">
             <button class="auth-tab active" id="loginTab" type="button">Login</button>
             <button class="auth-tab" id="signupTab" type="button">Sign Up</button>
           </div>
   
           <form id="authForm" class="auth-form">
             <div id="nameField" style="display:none;">
               <label class="auth-label" for="authName">Name</label>
               <input class="auth-input" id="authName" type="text" placeholder="Your name" />
             </div>
   
             <label class="auth-label" for="authEmail">Email</label>
             <input class="auth-input" id="authEmail" type="email" placeholder="you@example.com" required />
   
             <label class="auth-label" for="authPassword">Password</label>
             <input class="auth-input" id="authPassword" type="password" placeholder="Enter password" required />
   
             <div class="auth-error" id="authError" style="display:none;"></div>
   
             <button class="auth-submit" id="authSubmitBtn" type="submit">Login</button>
           </form>
         </div>
       `;
   
       this.el = overlay;
       this._bindEvents();
       return overlay;
     }
   
     open(mode = 'login') {
       this.mode = mode;
       if (!this.el) {
         document.body.appendChild(this.render());
       }
       this._applyMode();
       this.el.style.display = 'flex';
     }
   
     close() {
       if (this.el) {
         this.el.style.display = 'none';
         this._clearError();
         const form = this.el.querySelector('#authForm');
         if (form) form.reset();
       }
     }
   
     _bindEvents() {
       const closeBtn = this.el.querySelector('#authCloseBtn');
       const loginTab = this.el.querySelector('#loginTab');
       const signupTab = this.el.querySelector('#signupTab');
       const form = this.el.querySelector('#authForm');
   
       closeBtn.addEventListener('click', () => this.close());
   
       this.el.addEventListener('click', (e) => {
         if (e.target === this.el) this.close();
       });
   
       loginTab.addEventListener('click', () => {
         this.mode = 'login';
         this._applyMode();
       });
   
       signupTab.addEventListener('click', () => {
         this.mode = 'signup';
         this._applyMode();
       });
   
       form.addEventListener('submit', async (e) => {
         e.preventDefault();
         await this._submit();
       });
     }
   
     _applyMode() {
       const loginTab = this.el.querySelector('#loginTab');
       const signupTab = this.el.querySelector('#signupTab');
       const title = this.el.querySelector('#authTitle');
       const subtitle = this.el.querySelector('#authSubtitle');
       const nameField = this.el.querySelector('#nameField');
       const submitBtn = this.el.querySelector('#authSubmitBtn');
   
       const isSignup = this.mode === 'signup';
   
       loginTab.classList.toggle('active', !isSignup);
       signupTab.classList.toggle('active', isSignup);
   
       title.textContent = isSignup ? 'Create your account' : 'Welcome back';
       subtitle.textContent = isSignup
         ? 'Sign up to save chats and access your conversations.'
         : 'Log in to continue your saved spiritual conversations.';
   
       nameField.style.display = isSignup ? 'block' : 'none';
       submitBtn.textContent = isSignup ? 'Create Account' : 'Login';
       this._clearError();
     }
   
     async _submit() {
       const name = this.el.querySelector('#authName').value.trim();
       const email = this.el.querySelector('#authEmail').value.trim();
       const password = this.el.querySelector('#authPassword').value;
   
       try {
         this._setLoading(true);
   
         if (this.mode === 'signup') {
           await api.signup(name, email, password);
         } else {
           await api.login(email, password);
         }
   
         const me = await api.getMe();
         this.close();
         this.onAuthSuccess?.(me);
       } catch (err) {
         this._showError(err.message || 'Authentication failed');
       } finally {
         this._setLoading(false);
       }
     }
   
     _setLoading(loading) {
       const btn = this.el.querySelector('#authSubmitBtn');
       if (!btn) return;
       btn.disabled = loading;
       btn.textContent = loading
         ? (this.mode === 'signup' ? 'Creating Account...' : 'Logging in...')
         : (this.mode === 'signup' ? 'Create Account' : 'Login');
     }
   
     _showError(message) {
       const errorEl = this.el.querySelector('#authError');
       errorEl.textContent = message;
       errorEl.style.display = 'block';
     }
   
     _clearError() {
       const errorEl = this.el?.querySelector('#authError');
       if (!errorEl) return;
       errorEl.textContent = '';
       errorEl.style.display = 'none';
     }
   }