/* ============================================================
   SoulGPT — API Client
   File: frontend/src/lib/api.js
   ============================================================ */

// In dev, use same-origin `/api` so Vite proxies to the backend (vite.config.js).
// Set VITE_API_URL when the API lives elsewhere (e.g. production).
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.upgrade = Boolean(data?.upgrade);
    this.code = data?.error || null;
    this.details = Array.isArray(data?.errors) ? data.errors : [];
  }
}

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('soulgpt_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('soulgpt_token', token);
    else localStorage.removeItem('soulgpt_token');
  }

  _headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  _errorMessage(body, status) {
    if (!body || typeof body !== 'object') return `HTTP ${status}`;

    const first =
      body.message ??
      body.error ??
      (Array.isArray(body.errors) && (body.errors[0]?.message || body.errors[0]?.msg)) ??
      (Array.isArray(body.details) && body.details[0]);

    if (typeof first === 'number') return String(first);
    if (typeof first === 'string') return first;
    if (first != null && typeof first === 'object' && typeof first.message === 'string') {
      return first.message;
    }

    return `HTTP ${status}`;
  }

  async _parseResponseBody(res) {
    const raw = await res.text();

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return { message: raw.trim() };
    }
  }

  async _throwIfNotOk(res) {
    const status = res.status;
    const body = await this._parseResponseBody(res);
    const message = this._errorMessage(body, status);

    throw new ApiError(message, status, body);
  }

  async _post(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) await this._throwIfNotOk(res);

    return this._parseResponseBody(res);
  }

  async _get(path) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: this._headers(),
    });

    if (!res.ok) await this._throwIfNotOk(res);

    return this._parseResponseBody(res);
  }

  // ── Auth ──────────────────────────────────────────────
  async signup(name, email, password) {
    const data = await this._post('/auth/signup', { name, email, password });
    if (data?.token) this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this._post('/auth/login', { email, password });
    if (data?.token) this.setToken(data.token);
    return data;
  }

  async logout() {
    this.setToken(null);
  }

  async getMe() {
    return this._get('/auth/me');
  }

  // ── Chat ──────────────────────────────────────────────
  /**
   * Send a message and receive AI response.
   * @param {string} message   - User's message
   * @param {string} tradition - Filter: 'all' | 'hindu' | 'islam' | ...
   * @param {string} language  - 'en' | 'hi' | 'gu'
   * @param {string|null} convId - Conversation ID (null = new conversation)
   */
  async sendMessage(message, tradition = 'all', language = 'en', convId = null) {
    return this._post('/chat/message', {
      message,
      tradition,
      language,
      conversationId: convId,
    });
  }

  // ── Conversations ─────────────────────────────────────
  async getConversations() {
    return this._get('/conversations');
  }

  async getConversation(id) {
    return this._get(`/conversations/${id}`);
  }

  async deleteConversation(id) {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
      headers: this._headers(),
    });

    if (!res.ok) await this._throwIfNotOk(res);

    return this._parseResponseBody(res);
  }

  // ── Prayers / Audio ───────────────────────────────────
  async getPrayers(tradition = null) {
    const q = tradition ? `?tradition=${tradition}` : '';
    return this._get(`/prayers${q}`);
  }

  async getPrayerStream(prayerKey) {
    return this._get(`/prayers/${prayerKey}/stream`);
  }

  // ── Subscription ──────────────────────────────────────
  async createCheckoutSession(plan) {
    return this._post('/subscription/checkout', { plan });
  }

  async getSubscription() {
    return this._get('/subscription');
  }
}

export { ApiError };
export const api = new ApiClient();