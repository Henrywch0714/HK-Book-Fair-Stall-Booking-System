// ../src/admin-settings.js
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = 'http://localhost:3000/api';

  // ===== 工具函数 =====
  function getToken() {
    return localStorage.getItem('token') || null;
  }

  function getCurrentUser() {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function requireAdmin() {
    const token = getToken();
    const user = getCurrentUser();

    if (!token || !user) {
      window.location.href = '../webContent/login.html';
      return false;
    }

    if (user.role !== 'admin') {
      alert('This page is only accessible to admin users.');
      window.location.href = '../webContent/index.html';
      return false;
    }

    return true;
  }

  async function apiGet(path) {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GET ${path} failed: ${res.status} ${text}`);
    }

    return res.json();
  }

  function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return '$0';
    return (
      '$' +
      Number(amount).toLocaleString(undefined, {
        maximumFractionDigits: 0
      })
    );
  }

  // ===== 权限检查 =====
  if (!requireAdmin()) return;

  // ===== DOM 元素 =====
  const logoutButton = document.getElementById('logoutButton');
  const userNameEl = document.getElementById('userName');
  const userAvatarInitialsEl = document.getElementById('userAvatarInitials');

  const totalBoothsEl = document.getElementById('statTotalBooths');
  const bookedBoothsEl = document.getElementById('statBookedBooths');
  const availableBoothsEl = document.getElementById('statAvailableBooths');
  const activeExhibitorsEl = document.getElementById('statActiveExhibitors');
  const pendingBookingsEl = document.getElementById('statPendingBookings');
  const totalRevenueEl = document.getElementById('statTotalRevenue');

  const defaultBoothPriceInput = document.getElementById('defaultBoothPrice');
  const maxBoothsPerEventInput = document.getElementById('maxBoothsPerEvent');
  const registrationToggleSelect = document.getElementById('registrationToggle');
  const bookingAutoConfirmSelect = document.getElementById('bookingAutoConfirm');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  const btnRefreshStats = document.getElementById('btnRefreshStats');
  const btnViewRawStats = document.getElementById('btnViewRawStats');

  // ===== 顶部用户信息 =====
  (async function initAdminInfo() {
    try {
      const me = await apiGet('/auth/me');
      const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim();
      if (userNameEl) {
        userNameEl.textContent = fullName || me.email || 'Admin User';
      }
      if (userAvatarInitialsEl) {
        const initials =
          (me.firstName?.[0] || '') + (me.lastName?.[0] || me.email?.[0] || '');
        userAvatarInitialsEl.textContent =
          initials.toUpperCase() || 'AD';
      }
    } catch (err) {
      console.error('Failed to load admin profile:', err);
    }
  })();

  // ===== Stats 加载 =====
  async function loadStats() {
    try {
      const stats = await apiGet('/stats');
      console.log('[Admin Settings] /api/stats:', stats);

      const {
        totalBooths,
        availableBooths,
        bookedBooths,
        activeUsers,
        pendingBookings,
        totalRevenue
      } = stats;

      if (totalBoothsEl) totalBoothsEl.textContent = totalBooths ?? 0;
      if (bookedBoothsEl) bookedBoothsEl.textContent = bookedBooths ?? 0;
      if (availableBoothsEl)
        availableBoothsEl.textContent = availableBooths ?? 0;
      if (activeExhibitorsEl)
        activeExhibitorsEl.textContent = activeUsers ?? 0;
      if (pendingBookingsEl)
        pendingBookingsEl.textContent = pendingBookings ?? 0;
      if (totalRevenueEl)
        totalRevenueEl.textContent = formatCurrency(totalRevenue);
    } catch (err) {
      console.error('Failed to load stats:', err);
      alert('Failed to load stats. Please try again later.');
    }
  }

  loadStats();

  // ===== 设置表（本地存储 demo） =====
  const SETTINGS_KEY = 'adminSettings';

  function loadLocalSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (defaultBoothPriceInput && s.defaultBoothPrice != null)
        defaultBoothPriceInput.value = s.defaultBoothPrice;
      if (maxBoothsPerEventInput && s.maxBoothsPerEvent != null)
        maxBoothsPerEventInput.value = s.maxBoothsPerEvent;
      if (registrationToggleSelect && s.registrationToggle)
        registrationToggleSelect.value = s.registrationToggle;
      if (bookingAutoConfirmSelect && s.bookingAutoConfirm)
        bookingAutoConfirmSelect.value = s.bookingAutoConfirm;
    } catch (e) {
      console.warn('Failed to parse local admin settings:', e);
    }
  }

  function saveLocalSettings() {
    const settings = {
      defaultBoothPrice: Number(defaultBoothPriceInput?.value || 0),
      maxBoothsPerEvent: Number(maxBoothsPerEventInput?.value || 0),
      registrationToggle: registrationToggleSelect?.value || 'open',
      bookingAutoConfirm: bookingAutoConfirmSelect?.value || 'on'
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  }

  loadLocalSettings();

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const s = saveLocalSettings();
      console.log('[Admin Settings] Saved locally:', s);
      alert('Settings saved locally (demo). Later you can connect this to real backend APIs.');
    });
  }

  // ===== 工具按钮 =====
  if (btnRefreshStats) {
    btnRefreshStats.addEventListener('click', () => {
      loadStats();
    });
  }

  if (btnViewRawStats) {
    btnViewRawStats.addEventListener('click', async () => {
      try {
        const stats = await apiGet('/stats');
        console.log('[Admin Settings] Raw /api/stats:', stats);
        alert('Raw stats printed to console.');
      } catch (err) {
        console.error('Failed to get raw stats:', err);
        alert('Failed to load raw stats.');
      }
    });
  }

  // ===== Logout =====
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      if (!confirm('Are you sure you want to logout?')) return;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '../webContent/login.html';
    });
  }

  // ===== 移动端侧边栏（如果你在 event 页面里有类似逻辑，也可以拷贝过来） =====
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.querySelector('.sidebar');
  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-open');
    });
  }
});