// ============================================================
// CINEMANIA — API HELPER (with subscription session)
// ============================================================
const API_BASE = 'http://localhost:5000/api';

const api = {
  token: () => localStorage.getItem('cm_token'),
  user:  () => JSON.parse(localStorage.getItem('cm_user')  || 'null'),
  subscription: () => JSON.parse(localStorage.getItem('cm_sub') || 'null'),

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
    return h;
  },

  async request(method, endpoint, body = null) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  get:  (ep)       => api.request('GET',    ep),
  post: (ep, body) => api.request('POST',   ep, body),
  put:  (ep, body) => api.request('PUT',    ep, body),
  del:  (ep)       => api.request('DELETE', ep),

  isLoggedIn: () => !!localStorage.getItem('cm_token'),

  logout() {
    localStorage.removeItem('cm_token');
    localStorage.removeItem('cm_user');
    localStorage.removeItem('cm_sub');
    window.location.href = '/';
  },

  // Call this right after login/register — stores token, user, AND subscription
  async refreshSession(token, user) {
    localStorage.setItem('cm_token', token);
    localStorage.setItem('cm_user', JSON.stringify(user));
    await this.fetchAndStoreSubscription();
  },

  // Fetch active subscription and store in localStorage
  async fetchAndStoreSubscription() {
    try {
      const raw = await this.get('/subscriptions/my');
      // Backend may return array or object
      const list = Array.isArray(raw) ? raw : (raw.data || []);
      const active = list.find(s => s.status === 'active') || null;
      localStorage.setItem('cm_sub', JSON.stringify(active));
    } catch {
      localStorage.setItem('cm_sub', 'null');
    }
  }
};

window.api = api;