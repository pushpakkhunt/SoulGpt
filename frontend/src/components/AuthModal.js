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
   
       this.resendCooldown = 0;
       this.resendTimer = null;
     }
   
     render() {
       const overlay = document.createElement('div');
       overlay.className = 'auth-modal-overlay';
       overlay.id = 'authModalOverlay';
   
       overlay.innerHTML = `
         <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
           <button class="auth-close" id="authCloseBtn" type="button" aria-label="Close">&times;</button>
   
           <div class="auth-head">
             <h2 id="authTitle">Continue your journey</h2>
             <p id="authSubtitle">Find peace, clarity, and wisdom with SoulGPT.</p>
           </div>
   
           <div class="auth-tabs" id="authTabs">
             <button class="auth-tab active" id="loginTab" type="button">Login</button>
             <button class="auth-tab" id="signupTab" type="button">Sign Up</button>
           </div>
   
           <div class="auth-google-wrap" id="googleWrap">
             <button class="auth-google-btn" id="googleAuthBtn" type="button">
               <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                 <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4A9.6 9.6 0 0 0 2.4 12 9.6 9.6 0 0 0 12 21.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/>
                 <path fill="#34A853" d="M3.5 7.4l3.2 2.3C7.5 8 9.6 6 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4c-3.7 0-6.9 2.1-8.5 5z"/>
                 <path fill="#FBBC05" d="M2.4 12c0 1.5.4 2.9 1.1 4.2l3.7-2.8c-.2-.5-.4-1-.4-1.4s.1-1 .4-1.4L3.5 7.4A9.5 9.5 0 0 0 2.4 12z"/>
                 <path fill="#4285F4" d="M12 21.6c2.6 0 4.9-.9 6.5-2.5l-3.2-2.5c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.3-4L3.1 16c1.6 3.3 5 5.6 8.9 5.6z"/>
               </svg>
               Continue with Google
             </button>
             <div class="auth-divider"><span>or</span></div>
           </div>
   
           <form id="authForm" class="auth-form">
             <div id="nameField" style="display:none;">
               <label class="auth-label" for="authName">Name</label>
               <input
                 class="auth-input"
                 id="authName"
                 type="text"
                 placeholder="Your name"
                 autocomplete="name"
               />
             </div>
   
             <div id="emailField">
               <label class="auth-label" for="authEmail">Email</label>
               <input
                 class="auth-input"
                 id="authEmail"
                 type="email"
                 placeholder="you@example.com"
                 autocomplete="email"
                 required
               />
             </div>
   
             <div id="passwordField">
               <label class="auth-label" for="authPassword">Password</label>
               <input
                 class="auth-input"
                 id="authPassword"
                 type="password"
                 placeholder="Enter password"
                 autocomplete="current-password"
                 required
               />
             </div>
   
             <div id="otpField" style="display:none;">
               <label class="auth-label">Verification code</label>
   
               <div class="auth-otp-wrap" id="authOtpWrap">
                 <input class="auth-otp-box" type="text" inputmode="numeric" maxlength="1" data-otp-index="0" />
                 <input class="auth-otp-box" type="text" inputmode="numeric" maxlength="1" data-otp-index="1" />
                 <input class="auth-otp-box" type="text" inputmode="numeric" maxlength="1" data-otp-index="2" />
                 <input class="auth-otp-box" type="text" inputmode="numeric" maxlength="1" data-otp-index="3" />
                 <input class="auth-otp-box" type="text" inputmode="numeric" maxlength="1" data-otp-index="4" />
                 <input class="auth-otp-box" type="text" inputmode="numeric" maxlength="1" data-otp-index="5" />
               </div>
   
               <input id="authOtp" type="hidden" />
   
               <div class="auth-help" id="otpHelpText">
                 We sent a verification code to your email.
               </div>
             </div>
   
             <div class="auth-error" id="authError" style="display:none;"></div>
             <div class="auth-success" id="authSuccess" style="display:none;"></div>
   
             <button class="auth-submit" id="authSubmitBtn" type="submit">Continue</button>
   
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
   
       if (this.mode === 'verify') {
         this._focusOtpSoon();
       }
     }
   
     close() {
       if (!this.el) return;
   
       this.el.style.display = 'none';
       this._clearError();
       this._clearSuccess();
       this._stopResendCooldown();
       this._clearOtpBoxes();
   
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
         this._stopResendCooldown();
         this._clearOtpBoxes();
         this._applyMode();
       });
   
       signupTab.addEventListener('click', () => {
         this.mode = 'signup';
         this._clearError();
         this._clearSuccess();
         this._stopResendCooldown();
         this._clearOtpBoxes();
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
         this._stopResendCooldown();
         this._clearOtpBoxes();
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
        const url = `${api.getBaseUrl()}/auth/google`;
        console.log('Google auth URL:', url);
        window.location.href = url;
      });
   
       this._bindOtpEvents();
     }
   
     _bindOtpEvents() {
       const otpBoxes = this._getOtpBoxes();
   
       otpBoxes.forEach((box, index) => {
         box.addEventListener('input', () => {
           const value = box.value.replace(/\D/g, '').slice(0, 1);
           box.value = value;
           this._syncOtpHidden();
           this._clearError();
   
           if (value && index < otpBoxes.length - 1) {
             otpBoxes[index + 1].focus();
             otpBoxes[index + 1].select();
           }
   
           if (this.mode === 'verify' && this._getOtpValue().length === 6) {
             this._submit();
           }
         });
   
         box.addEventListener('keydown', (e) => {
           if (e.key === 'Backspace') {
             if (box.value === '' && index > 0) {
               otpBoxes[index - 1].focus();
               otpBoxes[index - 1].value = '';
               this._syncOtpHidden();
             }
             return;
           }
   
           if (e.key === 'ArrowLeft' && index > 0) {
             e.preventDefault();
             otpBoxes[index - 1].focus();
             return;
           }
   
           if (e.key === 'ArrowRight' && index < otpBoxes.length - 1) {
             e.preventDefault();
             otpBoxes[index + 1].focus();
             return;
           }
   
           if (
             e.key.length === 1 &&
             !/^\d$/.test(e.key) &&
             !e.ctrlKey &&
             !e.metaKey
           ) {
             e.preventDefault();
           }
         });
   
         box.addEventListener('focus', () => {
           box.select();
         });
   
         box.addEventListener('paste', (e) => {
           e.preventDefault();
           const pasted = (e.clipboardData.getData('text') || '')
             .replace(/\D/g, '')
             .slice(0, 6);
   
           if (!pasted) return;
   
           otpBoxes.forEach((otpBox, i) => {
             otpBox.value = pasted[i] || '';
           });
   
           this._syncOtpHidden();
   
           const nextIndex = Math.min(pasted.length, 5);
           otpBoxes[nextIndex].focus();
   
           if (this.mode === 'verify' && this._getOtpValue().length === 6) {
             this._submit();
           }
         });
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
       const hiddenOtpInput = this.el.querySelector('#authOtp');
   
       const submitBtn = this.el.querySelector('#authSubmitBtn');
       const verifyActions = this.el.querySelector('#verifyActions');
       const otpHelpText = this.el.querySelector('#otpHelpText');
   
       const isSignup = this.mode === 'signup';
       const isVerify = this.mode === 'verify';
       const isLogin = this.mode === 'login';
   
       loginTab.classList.toggle('active', isLogin);
       signupTab.classList.toggle('active', isSignup);
   
       authTabs.style.display = isVerify ? 'none' : 'grid';
       googleWrap.style.display = isVerify ? 'none' : 'block';
   
       if (isLogin) {
         title.textContent = 'Continue your journey';
         subtitle.textContent = 'Log in to return to your saved reflections and conversations.';
   
         nameField.style.display = 'none';
         emailField.style.display = 'block';
         passwordField.style.display = 'block';
         otpField.style.display = 'none';
         verifyActions.style.display = 'none';
   
         emailInput.required = true;
         passwordInput.required = true;
         hiddenOtpInput.required = false;
   
         submitBtn.textContent = 'Login';
       } else if (isSignup) {
         title.textContent = 'Begin your journey';
         subtitle.textContent = 'Create your account to save chats, reflections, and your spiritual path.';
   
         nameField.style.display = 'block';
         emailField.style.display = 'block';
         passwordField.style.display = 'block';
         otpField.style.display = 'none';
         verifyActions.style.display = 'none';
   
         emailInput.required = true;
         passwordInput.required = true;
         hiddenOtpInput.required = false;
   
         submitBtn.textContent = 'Send Verification Code';
       } else if (isVerify) {
         title.textContent = 'Verify your email';
         subtitle.textContent = 'One gentle step left before your account is ready.';
   
         nameField.style.display = 'none';
         emailField.style.display = 'none';
         passwordField.style.display = 'none';
         otpField.style.display = 'block';
         verifyActions.style.display = 'flex';
   
         emailInput.required = false;
         passwordInput.required = false;
         hiddenOtpInput.required = true;
   
         otpHelpText.textContent = this.pendingEmail
           ? `We sent a 6-digit code to ${this.pendingEmail}.`
           : 'We sent a 6-digit code to your email.';
   
         submitBtn.textContent = 'Verify Account';
         this._focusOtpSoon();
       }
   
       this._clearError();
     }
   
     async _submit() {
       const name = this.el.querySelector('#authName').value.trim();
       const email = this.el.querySelector('#authEmail').value.trim();
       const password = this.el.querySelector('#authPassword').value;
       const otp = this._getOtpValue();
   
       try {
         this._setLoading(true);
         this._clearError();
         this._clearSuccess();
   
         if (this.mode === 'signup') {
           await api.startSignup(name, email, password);
   
           this.pendingEmail = email;
           this.pendingName = name;
           this.mode = 'verify';
           this._clearOtpBoxes();
           this._applyMode();
           this._showSuccess('Verification code sent. Please check your inbox.');
           this._startResendCooldown();
           return;
         }
   
         if (this.mode === 'verify') {
           if (otp.length !== 6) {
             throw new Error('Please enter the 6-digit verification code');
           }
   
           await api.verifySignup(this.pendingEmail, otp);
   
           this._showSuccess('Email verified successfully.');
   
           const me = await api.getMe();
   
           setTimeout(() => {
             this.close();
             this.onAuthSuccess?.(me);
           }, 500);
   
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
         this._clearOtpBoxes();
         this._showSuccess('A new verification code has been sent.');
         this._startResendCooldown();
         this._focusOtpSoon();
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
       const otpBoxes = this._getOtpBoxes();
   
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
   
       if (resendBtn) resendBtn.disabled = loading || this.resendCooldown > 0;
       if (backBtn) backBtn.disabled = loading;
       if (googleBtn) googleBtn.disabled = loading;
       otpBoxes.forEach((box) => {
         box.disabled = loading;
       });
     }
   
     _startResendCooldown(seconds = 30) {
       const resendBtn = this.el?.querySelector('#resendOtpBtn');
       if (!resendBtn) return;
   
       this._stopResendCooldown();
       this.resendCooldown = seconds;
   
       const tick = () => {
         if (!resendBtn) return;
   
         if (this.resendCooldown > 0) {
           resendBtn.disabled = true;
           resendBtn.textContent = `Resend in ${this.resendCooldown}s`;
           this.resendCooldown -= 1;
         } else {
           resendBtn.disabled = false;
           resendBtn.textContent = 'Resend code';
           this.resendTimer = null;
           return;
         }
   
         this.resendTimer = setTimeout(tick, 1000);
       };
   
       tick();
     }
   
     _stopResendCooldown() {
       if (this.resendTimer) {
         clearTimeout(this.resendTimer);
         this.resendTimer = null;
       }
   
       this.resendCooldown = 0;
   
       const resendBtn = this.el?.querySelector('#resendOtpBtn');
       if (resendBtn) {
         resendBtn.disabled = false;
         resendBtn.textContent = 'Resend code';
       }
     }
   
     _getOtpBoxes() {
       return Array.from(this.el?.querySelectorAll('.auth-otp-box') || []);
     }
   
     _getOtpValue() {
       return this._getOtpBoxes()
         .map((box) => box.value.trim())
         .join('');
     }
   
     _syncOtpHidden() {
       const hiddenInput = this.el?.querySelector('#authOtp');
       if (hiddenInput) {
         hiddenInput.value = this._getOtpValue();
       }
     }
   
     _clearOtpBoxes() {
       this._getOtpBoxes().forEach((box) => {
         box.value = '';
       });
       this._syncOtpHidden();
     }
   
     _focusOtpSoon() {
       setTimeout(() => {
         const firstOtp = this.el?.querySelector('.auth-otp-box');
         if (firstOtp && this.mode === 'verify') {
           firstOtp.focus();
         }
       }, 60);
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