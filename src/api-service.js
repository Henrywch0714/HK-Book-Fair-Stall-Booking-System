class ApiService {
  constructor() {
    // 对应后端 app.use('/api', ...) 默认前缀
    this.baseURL = 'http://localhost:3000/api';
  }

  /* ========== 静态认证工具 ========== */
    static requireAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/webContent/login.html';
      return false;
    }
    return true;
  }

  static requireAdmin() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user'); // 假定登录时存了 { ...user } 到这里

    if (!token || !userStr) {
      window.location.href = '/webContent/login.html';
      return false;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      alert('Admin access only.');
      window.location.href = '/webContent/index.html';
      return false;
    }

    return true;
  }
  static isAuthenticated() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const user = localStorage.getItem('user');
    return !!(token && userId && user);
  }

  static getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Failed to parse user data:', e);
      return null;
    }
  }

  static clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    sessionStorage.clear();
  }

  static requireAuth() {
    if (!this.isAuthenticated()) {
      console.error('❌ Authentication required but not found');
      this.clearAuth();

      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);

      alert('请先登录');
      window.location.href = '/webContent/login.html';
      return false;
    }
    console.log('✅ Authentication verified');
    return true;
  }

  static logout() {
    console.log('Logging out...');
    this.clearAuth();

    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    const depth = pathParts.filter((p) => p && p !== '.').length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';

    window.location.href = `${prefix}webContent/login.html`;
    // 或者你原来固定写死：
    // window.location.href = 'http://127.0.0.1:5500/webContent/login.html';
  }

  /* ========== Token & Header ========== */

  getToken() {
    return localStorage.getItem('token');
  }

  setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  /* ========== 通用请求封装 ========== */

  async handleResponse(response) {
    if (response.status === 204) return null;

    const contentType = response.headers.get('Content-Type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text || null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        alert('登录已失效，请重新登录');
        ApiService.logout();
        throw new Error('Unauthorized');
      }
      if (response.status === 403) {
        alert('您没有权限执行此操作');
        throw new Error('Forbidden');
      }

      const msg =
        (data && data.error) ||
        (data && data.message) ||
        (typeof data === 'string' ? data : '') ||
        `Request failed with status ${response.status}`;

      throw new Error(msg);
    }

    return data;
  }

  async request(endpoint, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: this.getHeaders(),
      ...options
    };

    const res = await fetch(`${this.baseURL}${endpoint}`, config);
    return this.handleResponse(res);
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /* ========== Auth 相关 ========== */

  login(credentials) {
    // POST /api/auth/login
    return this.post('/auth/login', credentials);
  }

  register(userData) {
    // POST /api/auth/register
    return this.post('/auth/register', userData);
  }

  getCurrentUserFromAPI() {
    // GET /api/auth/me
    return this.get('/auth/me');
  }

  getMyProfile() {
    return this.get('/auth/me');
  }

  updateMyProfile(data) {
    return this.put('/auth/me', data);
  }

  changePassword(data) {
    return this.put('/auth/change-password', data);
  }

  /* ========== Events ========== */

  getEvents(params = {}) {
    return this.getAllEvents(params);
  }

  getAllEvents(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/events?${query}` : '/events';
    return this.get(url);
  }

  getEventById(id) {
    return this.get(`/events/${id}`);
  }

  createEvent(data) {
    return this.post('/events', data);
  }

  updateEvent(id, data) {
    return this.put(`/events/${id}`, data);
  }

  deleteEvent(id) {
    return this.delete(`/events/${id}`);
  }

  /* ========== Booths ========== */

  getBooths(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/booths?${query}` : '/booths';
    return this.get(url);
  }

  getBoothById(id) {
    return this.get(`/booths/${id}`);
  }

  createBooth(data) {
    return this.post('/booths', data);
  }

  updateBooth(id, data) {
    return this.put(`/booths/${id}`, data);
  }

  deleteBooth(id) {
    return this.delete(`/booths/${id}`);
  }

  getBoothStats() {
    return this.get('/booths/stats');
  }

  async getAdminBooths(params = {}) {
    const query = new URLSearchParams(params);
    const res = await fetch(`/api/admin/booths?${query.toString()}`, {
      headers: this._authHeaders(),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch admin booths');
    return res.json();
  }

  async createAdminBooth(data) {
    const res = await fetch('/api/admin/booths', {
      method: 'POST',
      headers: this._authHeaders(),
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create booth');
    return res.json();
  }

  async updateAdminBooth(id, data) {
    const res = await fetch(`/api/admin/booths/${id}`, {
      method: 'PUT',
      headers: this._authHeaders(),
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update booth');
    return res.json();
  }

  async deleteAdminBooth(id) {
    const res = await fetch(`/api/admin/booths/${id}`, {
      method: 'DELETE',
      headers: this._authHeaders(),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to delete booth');
    return res.json();
  }

  /* ========== Exhibitors ========== */

  getExhibitors(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/exhibitors?${query}` : '/exhibitors';
    return this.get(url);
  }

  getExhibitorById(id) {
    return this.get(`/exhibitors/${id}`);
  }

  getExhibitorDetails(id) {
    return this.getExhibitorById(id);
  }

  exportExhibitors() {
    return this.get('/exhibitors/export');
  }

  createExhibitor(data) {
    return this.post('/exhibitors', data);
  }

  updateExhibitor(id, data) {
    return this.put(`/exhibitors/${id}`, data);
  }

  deleteExhibitor(id) {
    return this.delete(`/exhibitors/${id}`);
  }

  getExhibitorStats() {
    return this.get('/exhibitors/stats');
  }

  updateExhibitorStatus(id, status) {
    return this.patch(`/exhibitors/${id}/status`, { status });
  }

  /* ========== Bookings ========== */

  getMyBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/bookings?${query}` : '/bookings';
    return this.get(url);
  }

  createBooking(data) {
    return this.post('/bookings', data);
  }

  getBookingById(id) {
    return this.get(`/bookings/${id}`);
  }

  updateBooking(id, data) {
    return this.put(`/bookings/${id}`, data);
  }

  cancelBooking(id) {
    // PATCH /api/bookings/:id/cancel
    return this.patch(`/bookings/${id}/cancel`, {});
  }

  getAdminBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/admin/bookings?${query}` : '/admin/bookings';
    return this.get(url);
  }

  updateBookingStatus(id, status) {
    return this.patch(`/admin/bookings/${id}/status`, { status });
  }

  deleteAdminBooking(id) {
    return this.delete(`/admin/bookings/${id}`);
  }

  /* ========== Stats ========== */

  getGlobalStats() {
    return this.get('/stats');
  }

  /* ========== Payments ========== */

  processPayment(data) {
    return this.post('/payments/process', data);
  }

  createPaymentRecord(data) {
    return this.post('/payments', data);
  }
}

/* 全局实例，方便各页面使用 */
const apiService = new ApiService();
window.apiService = apiService;
window.ApiService = ApiService;