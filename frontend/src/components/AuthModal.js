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
   
       this.pendingEmail = '';
       this.pendingName = '';
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
   
           <div class="auth-tabs" id="authTabs">
             <button class="auth-tab active" id="loginTab" type="button">Login</button>
             <button class="auth-tab" id="signupTab" type="button">Sign Up</button>
           </div>
   
           <div class="auth-google-wrap" id="googleWrap">
             <button class="auth-google-btn" id="googleAuthBtn" type="button">
               Continue with Google
             </button>
             <div class="auth-divider"><span>or</span></div>
           </div>
   
           <form id="authForm" class="auth-form">
             <div id="nameField" style="display:none;">
               <label class="auth-label" for="authName">Name</label>
               <input class="auth-input" id="authName" type="text" placeholder="Your name" />
             </div>
   
             <div id="emailField">
               <label class="auth-label" for="authEmail">Email</label>
               <input class="auth-input" id="authEmail" type="email" placeholder="you@example.com" required />
             </div>
   
             <div id="passwordField">
               <label class="auth-label" for="authPassword">Password</label>
               <input class="auth-input" id="authPassword" type="password" placeholder="Enter password" required />
             </div>
   
             <div id="otpField" style="display:none;">
               <label class="auth-label" for="authOtp">Verification code</label>
               <input
                 class="auth-input"
                 id="authOtp"
                 type="text"
                 inputmode="numeric"
                 maxlength="6"
                 placeholder="Enter 6-digit OTP"
               />
               <div class="auth-help" id="otpHelpText">
                 We sent a verification code to your email.
               </div>
             </div>
   
             <div class="auth-error" id="authError" style="display:none;"></div>
             <div class="auth-success" id="authSuccess" style="display:none;"></div>
   
             <button class="auth-submit" id="authSubmitBtn" type="submit">Login</button>
   
             <div class="auth-actions" id="verifyActions" style="display:none;">
               <button class="auth-secondary-btn" id="resendOtpBtn" type="button">
                 Resend code
               </button>
               <button class="auth-secondary-btn" id="backToSignupBtn" type="button">
                 Back
               </button>
             </div>
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
       if (!this.el) return;
   
       this.el.style.display = 'none';
       this._clearError();
       this._clearSuccess();
   
       const form = this.el.querySelector('#authForm');
       if (form) form.reset();
   
       this.mode = 'login';
       this.pendingEmail = '';
       this.pendingName = '';
       this._applyMode();
     }
   
     _bindEvents() {
       const closeBtn = this.el.querySelector('#authCloseBtn');
       const loginTab = this.el.querySelector('#loginTab');
       const signupTab = this.el.querySelector('#signupTab');
       const form = this.el.querySelector('#authForm');
       const resendOtpBtn = this.el.querySelector('#resendOtpBtn');
       const backToSignupBtn = this.el.querySelector('#backToSignupBtn');
       const googleAuthBtn = this.el.querySelector('#googleAuthBtn');
   
       closeBtn.addEventListener('click', () => this.close());
   
       this.el.addEventListener('click', (e) => {
         if (e.target === this.el) {
           this.close();
         }
       });
   
       loginTab.addEventListener('click', () => {
         this.mode = 'login';
         this._clearError();
         this._clearSuccess();
         this._applyMode();
       });
   
       signupTab.addEventListener('click', () => {
         this.mode = 'signup';
         this._clearError();
         this._clearSuccess();
         this._applyMode();
       });
   
       form.addEventListener('submit', async (e) => {
         e.preventDefault();
         await this._submit();
       });
   
       resendOtpBtn.addEventListener('click', async () => {
         await this._resendOtp();
       });
   
       backToSignupBtn.addEventListener('click', () => {
         this.mode = 'signup';
         this._clearError();
         this._clearSuccess();
         this._applyMode();
   
         const emailInput = this.el.querySelector('#authEmail');
         const nameInput = this.el.querySelector('#authName');
   
         if (emailInput && this.pendingEmail) {
           emailInput.value = this.pendingEmail;
         }
   
         if (nameInput && this.pendingName) {
           nameInput.value = this.pendingName;
         }
       });
   
       googleAuthBtn.addEventListener('click', () => {
         const baseUrl =
           import.meta.env.VITE_API_URL ||
           (import.meta.env.DEV ? '/api' : 'https://soulgpt-production.up.railway.app/api');
   
         window.location.href = `${baseUrl}/auth/google`;
       });
     }
   
     _applyMode() {
       const loginTab = this.el.querySelector('#loginTab');
       const signupTab = this.el.querySelector('#signupTab');
       const authTabs = this.el.querySelector('#authTabs');
       const googleWrap = this.el.querySelector('#googleWrap');
   
       const title = this.el.querySelector('#authTitle');
       const subtitle = this.el.querySelector('#authSubtitle');
   
       const nameField = this.el.querySelector('#nameField');
       const emailField = this.el.querySelector('#emailField');
       const passwordField = this.el.querySelector('#passwordField');
       const otpField = this.el.querySelector('#otpField');
   
       const emailInput = this.el.querySelector('#authEmail');
       const passwordInput = this.el.querySelector('#authPassword');
       const otpInput = this.el.querySelector('#authOtp');
   
       const submitBtn = this.el.querySelector('#authSubmitBtn');
       const verifyActions = this.el.querySelector('#verifyActions');
       const otpHelpText = this.el.querySelector('#otpHelpText');
   
       const isSignup = this.mode === 'signup';
       const isVerify = this.mode === 'verify';
       const isLogin = this.mode === 'login';
   
       loginTab.classList.toggle('active', isLogin);
       signupTab.classList.toggle('active', isSignup);
   
       authTabs.style.display = isVerify ? 'none' : 'flex';
       googleWrap.style.display = isVerify ? 'none' : 'block';
   
       if (isLogin) {
         title.textContent = 'Welcome back';
         subtitle.textContent = 'Log in to continue your saved spiritual conversations.';
   
         nameField.style.display = 'none';
         emailField.style.display = 'block';
         passwordField.style.display = 'block';
         otpField.style.display = 'none';
         verifyActions.style.display = 'none';
   
         emailInput.required = true;
         passwordInput.required = true;
         otpInput.required = false;
   
         submitBtn.textContent = 'Login';
       } else if (isSignup) {
         title.textContent = 'Create your account';
         subtitle.textContent = 'Sign up to save chats and access your conversations.';
   
         nameField.style.display = 'block';
         emailField.style.display = 'block';
         passwordField.style.display = 'block';
         otpField.style.display = 'none';
         verifyActions.style.display = 'none';
   
         emailInput.required = true;
         passwordInput.required = true;
         otpInput.required = false;
   
         submitBtn.textContent = 'Send Verification Code';
       } else if (isVerify) {
         title.textContent = 'Verify your email';
         subtitle.textContent = 'Enter the 6-digit code sent to your email to finish creating your account.';
   
         nameField.style.display = 'none';
         emailField.style.display = 'none';
         passwordField.style.display = 'none';
         otpField.style.display = 'block';
         verifyActions.style.display = 'flex';
   
         emailInput.required = false;
         passwordInput.required = false;
         otpInput.required = true;
   
         otpHelpText.textContent = this.pendingEmail
           ? `We sent a verification code to ${this.pendingEmail}.`
           : 'We sent a verification code to your email.';
   
         submitBtn.textContent = 'Verify Account';
       }
   
       this._clearError();
     }
   
     async _submit() {
       const name = this.el.querySelector('#authName').value.trim();
       const email = this.el.querySelector('#authEmail').value.trim();
       const password = this.el.querySelector('#authPassword').value;
       const otp = this.el.querySelector('#authOtp').value.trim();
   
       try {
         this._setLoading(true);
         this._clearError();
         this._clearSuccess();
   
         if (this.mode === 'signup') {
           await api.startSignup(name, email, password);
   
           this.pendingEmail = email;
           this.pendingName = name;
           this.mode = 'verify';
           this._applyMode();
           this._showSuccess('Verification code sent. Please check your email.');
           return;
         }
   
         if (this.mode === 'verify') {
           await api.verifySignup(this.pendingEmail, otp);
   
           const me = await api.getMe();
           this.close();
           this.onAuthSuccess?.(me);
           return;
         }
   
         await api.login(email, password);
   
         const me = await api.getMe();
         this.close();
         this.onAuthSuccess?.(me);
       } catch (err) {
         this._showError(err.message || 'Authentication failed');
       } finally {
         this._setLoading(false);
       }
     }
   
     async _resendOtp() {
       try {
         this._setLoading(true);
         this._clearError();
         this._clearSuccess();
   
         if (!this.pendingEmail) {
           throw new Error('Missing email for verification');
         }
   
         await api.resendSignupOtp(this.pendingEmail);
         this._showSuccess('A new verification code has been sent.');
       } catch (err) {
         this._showError(err.message || 'Could not resend verification code');
       } finally {
         this._setLoading(false);
       }
     }
   
     _setLoading(loading) {
       const submitBtn = this.el.querySelector('#authSubmitBtn');
       const resendBtn = this.el.querySelector('#resendOtpBtn');
       const backBtn = this.el.querySelector('#backToSignupBtn');
       const googleBtn = this.el.querySelector('#googleAuthBtn');
   
       if (submitBtn) {
         submitBtn.disabled = loading;
   
         if (loading) {
           if (this.mode === 'signup') {
             submitBtn.textContent = 'Sending Code...';
           } else if (this.mode === 'verify') {
             submitBtn.textContent = 'Verifying...';
           } else {
             submitBtn.textContent = 'Logging in...';
           }
         } else {
           if (this.mode === 'signup') {
             submitBtn.textContent = 'Send Verification Code';
           } else if (this.mode === 'verify') {
             submitBtn.textContent = 'Verify Account';
           } else {
             submitBtn.textContent = 'Login';
           }
         }
       }
   
       if (resendBtn) resendBtn.disabled = loading;
       if (backBtn) backBtn.disabled = loading;
       if (googleBtn) googleBtn.disabled = loading;
     }
   
     _showError(message) {
       const errorEl = this.el.querySelector('#authError');
       if (!errorEl) return;
   
       errorEl.textContent = message;
       errorEl.style.display = 'block';
     }
   
     _clearError() {
       const errorEl = this.el?.querySelector('#authError');
       if (!errorEl) return;
   
       errorEl.textContent = '';
       errorEl.style.display = 'none';
     }
   
     _showSuccess(message) {
       const successEl = this.el.querySelector('#authSuccess');
       if (!successEl) return;
   
       successEl.textContent = message;
       successEl.style.display = 'block';
     }
   
     _clearSuccess() {
       const successEl = this.el?.querySelector('#authSuccess');
       if (!successEl) return;
   
       successEl.textContent = '';
       successEl.style.display = 'none';
     }
   }