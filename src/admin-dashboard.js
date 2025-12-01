/**
 * Admin Dashboard - Event Booth System
 * Connects admin-dashboard.html to MongoDB-backed APIs.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ===== Auth Check =====
  if (typeof ApiService !== 'undefined') {
    const ok = ApiService.requireAuth(); 
  }

  // ===== DOM References =====
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.querySelector('.sidebar');
  const logoutButton = document.getElementById('logoutButton');


  const kpiTotalBooths = document.getElementById('kpiTotalBooths');
  const kpiBookedBooths = document.getElementById('kpiBookedBooths');
  const kpiPendingApprovals = document.getElementById('kpiPendingApprovals');
  const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');


  const quickActionButtons = document.querySelectorAll('.qa-card');


  const activityList = document.querySelector('.activity-list');

  // Revenue Chart
  const revenueChartCanvas = document.getElementById('revenueChart');

  const bookingsTableBody = document.querySelector('.bookings-table tbody');

  // ===== State =====
  let adminStats = null;
  let revenueTrends = [];
  let recentBookings = [];
  let recentActivity = [];

  // ===== Init =====
  init();

  async function init() {
    setupEventListeners();

    await Promise.all([
      loadStats(),
      loadRevenueTrends(),
      loadRecentBookings(),
      loadRecentActivity()
    ]);
  }

  // ========== Stats & KPI ==========

  async function loadStats() {
    try {
      if (apiService.getAdminStats) {
        const stats = await apiService.getAdminStats();
        adminStats = stats;
        renderStats();
      } else {
        // 没有专门 /api/admin/stats 时，走 fallback
        await buildStatsFallback();
      }
    } catch (err) {
      console.warn('⚠️ getAdminStats() failed, using fallback stats.', err);
      await buildStatsFallback();
    }
  }

  async function buildStatsFallback() {
    try {
      const [boothStatsRes, bookingsRes] = await Promise.allSettled([
        apiService.getBoothStats?.(),
        apiService.getAdminBookings
          ? apiService.getAdminBookings({ limit: 500 })
          : apiService.getBookings?.({ limit: 500 }) 
      ]);

      const boothStats =
        boothStatsRes.status === 'fulfilled' ? boothStatsRes.value : null;
      const bookings =
        bookingsRes.status === 'fulfilled'
          ? bookingsRes.value.bookings || bookingsRes.value || []
          : [];

      const totalRevenue = bookings.reduce((sum, b) => {
        const p = typeof b.totalPrice === 'number' ? b.totalPrice : 0;
        return sum + p;
      }, 0);

      const pendingCount = bookings.filter(
        (b) => (b.status || '').toLowerCase() === 'pending'
      ).length;

      adminStats = {
        totalBooths: boothStats?.totalBooths ?? 0,
        bookedBooths: boothStats?.bookedBooths ?? 0,
        availableBooths: boothStats?.availableBooths ?? 0,
        maintenanceBooths: boothStats?.maintenanceBooths ?? 0,
        pendingApprovals: pendingCount,
        totalRevenue
      };

      renderStats();
    } catch (err) {
      console.error('❌ Failed to build fallback admin stats:', err);
    }
  }

  function renderStats() {
    if (!adminStats) return;
    const s = adminStats;

    if (kpiTotalBooths) {
      kpiTotalBooths.textContent = s.totalBooths ?? 0;
    }

    if (kpiBookedBooths) {
      kpiBookedBooths.textContent = s.bookedBooths ?? 0;
    }

    if (kpiPendingApprovals) {
      const pending =
        s.pendingApprovals ??
        s.pendingBookings ??
        s.pendingBoothApprovals ??
        0;
      kpiPendingApprovals.textContent = pending;
    }

    if (kpiTotalRevenue) {
      const v = typeof s.totalRevenue === 'number' ? s.totalRevenue : 0;
      kpiTotalRevenue.textContent = `$${v.toLocaleString()}`;
    }
  }

  // ========== Revenue Analytics ==========

  async function loadRevenueTrends() {
    try {
      if (apiService.getAdminRevenueTrends) {
        const res = await apiService.getAdminRevenueTrends({ months: 6 });
        revenueTrends = res.trends || res || [];
      } else if (adminStats && Array.isArray(adminStats.monthlyRevenue)) {
        revenueTrends = adminStats.monthlyRevenue;
      } else {
        revenueTrends = [];
      }
    } catch (err) {
      console.warn('⚠️ Failed to load revenue trends, fallback to stats.monthlyRevenue', err);
      if (adminStats && Array.isArray(adminStats.monthlyRevenue)) {
        revenueTrends = adminStats.monthlyRevenue;
      } else {
        revenueTrends = [];
      }
    }

    renderRevenueChart();
  }

  function renderRevenueChart() {
    if (!revenueChartCanvas) return;
    const ctx = revenueChartCanvas.getContext('2d');

    ctx.clearRect(0, 0, revenueChartCanvas.width, revenueChartCanvas.height);

    if (!revenueTrends || !revenueTrends.length) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('No revenue data available.', 20, revenueChartCanvas.height / 2);
      return;
    }

    const padding = 30;
    const width = revenueChartCanvas.width;
    const height = revenueChartCanvas.height;
    const barWidth = 30;
    const gap = 25;

    const amounts = revenueTrends.map((r) => r.amount || 0);
    const maxAmount = Math.max(...amounts, 1);

    const chartWidth = revenueTrends.length * (barWidth + gap);
    const startX = (width - chartWidth) / 2 + gap / 2;
    const baseY = height - padding;

    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, baseY);
    ctx.lineTo(width - padding, baseY);
    ctx.stroke();

    revenueTrends.forEach((r, idx) => {
      const amount = r.amount || 0;
      const barHeight = (amount / maxAmount) * (height - padding * 2);
      const x = startX + idx * (barWidth + gap);
      const y = baseY - barHeight;

      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = '#e5e7eb';
      ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`$${amount.toLocaleString()}`, x - 4, y - 4);

      const label = r.month || r.label || '';
      ctx.fillStyle = '#9ca3af';
      ctx.save();
      ctx.translate(x + barWidth / 2, baseY + 14);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
  }

  // ========== Recent Bookings ==========

  async function loadRecentBookings() {
    if (!bookingsTableBody) return;

    bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 1rem; color: #9ca3af;">
          Loading recent bookings...
        </td>
      </tr>
    `;

    try {
      let res;
      if (apiService.getAdminBookings) {
        res = await apiService.getAdminBookings({ limit: 5, sort: 'createdAt:desc' });
      } else if (apiService.getBookings) {
        res = await apiService.getBookings({ limit: 5, sort: 'createdAt:desc' });
      } else {
        res = { bookings: [] };
      }

      recentBookings = res.bookings || res || [];
      renderRecentBookings();
    } catch (err) {
      console.error('❌ Failed to load recent bookings:', err);
      bookingsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 1rem; color: #f97373;">
            Failed to load recent bookings.
          </td>
        </tr>
      `;
    }
  }

  function renderRecentBookings() {
    if (!bookingsTableBody) return;

    if (!recentBookings.length) {
      bookingsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 1rem; color: #9ca3af;">
            No recent bookings.
          </td>
        </tr>
      `;
      return;
    }

    bookingsTableBody.innerHTML = recentBookings
      .map((b, idx) => {
        const status = (b.status || 'pending').toLowerCase();
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const price = typeof b.totalPrice === 'number' ? b.totalPrice : 0;

        const bookingId =
          b.bookingId ||
          (b._id ? `BK${b._id.slice(-6).toUpperCase()}` : `#${idx + 1}`);

        const dateLabel = b.eventDate
          ? formatDateShort(b.eventDate)
          : (b.createdAt ? formatDateShort(b.createdAt) : '-');

        let statusClass = 'status-pending';
        if (status === 'confirmed') statusClass = 'status-confirmed';
        else if (['cancelled', 'canceled', 'rejected'].includes(status))
          statusClass = 'status-cancelled';

        return `
          <tr>
            <td>${bookingId}</td>
            <td>${b.companyName || b.exhibitorName || '-'}</td>
            <td>${b.boothNumber || '-'}</td>
            <td>${b.eventName || 'N/A'}</td>
            <td>${dateLabel}</td>
            <td>
              <span class="status-pill ${statusClass}">
                ${statusLabel}
              </span>
            </td>
            <td class="td-right">$${price.toLocaleString()}</td>
          </tr>
        `;
      })
      .join('');
  }

  function formatDateShort(input) {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  // ========== Recent Activity ==========

  async function loadRecentActivity() {
    if (!activityList) return;

    activityList.innerHTML = `
      <li class="activity-item">
        <div class="activity-content">
          <div class="activity-title" style="color:#9ca3af;">
            Loading recent activity...
          </div>
        </div>
      </li>
    `;

    try {
      if (apiService.getAdminActivity) {
        const res = await apiService.getAdminActivity({ limit: 5 });
        recentActivity = res.activities || res || [];
      } else {
        buildActivityFromFallback();
      }
    } catch (err) {
      console.warn('⚠️ Failed to load admin activity, using fallback:', err);
      buildActivityFromFallback();
    }

    renderActivityList();
  }

  function buildActivityFromFallback() {
    const items = [];

    recentBookings.slice(0, 3).forEach((b) => {
      const status = (b.status || '').toLowerCase();
      let icon = '📝';
      let title = 'Booking Update';
      if (status === 'pending') {
        title = 'New Booking Request';
        icon = '📝';
      } else if (status === 'confirmed') {
        title = 'Booking Approved';
        icon = '✅';
      } else if (['cancelled', 'canceled', 'rejected'].includes(status)) {
        title = 'Booking Cancelled';
        icon = '❌';
      }

      items.push({
        icon,
        title,
        description: `${b.companyName || 'An exhibitor'} - Booth ${
          b.boothNumber || '-'
        } - ${b.eventName || 'Event'}`,
        timeAgo: timeAgoFromNow(b.createdAt)
      });
    });

    if (adminStats && typeof adminStats.totalRevenue === 'number') {
      items.push({
        icon: '💳',
        title: 'Revenue Updated',
        description: `Total revenue reached $${adminStats.totalRevenue.toLocaleString()}`,
        timeAgo: 'Today'
      });
    }

    recentActivity = items;
  }

  function renderActivityList() {
    if (!activityList) return;

    if (!recentActivity.length) {
      activityList.innerHTML = `
        <li class="activity-item">
          <div class="activity-content">
            <div class="activity-title" style="color:#9ca3af;">
              No recent activity.
            </div>
          </div>
        </li>
      `;
      return;
    }

    activityList.innerHTML = recentActivity
      .map((item) => {
        return `
          <li class="activity-item">
            <div class="activity-icon">${item.icon || '📝'}</div>
            <div class="activity-content">
              <div class="activity-title">${item.title || ''}</div>
              <div class="activity-desc">${item.description || ''}</div>
            </div>
            <div class="activity-meta">${item.timeAgo || ''}</div>
          </li>
        `;
      })
      .join('');
  }

  function timeAgoFromNow(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} h ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD} day${diffD > 1 ? 's' : ''} ago`;
  }

  // ========== Event Listeners / Navigation ==========

  function setupEventListeners() {
    if (mobileMenuToggle && sidebar) {
      mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          if (typeof ApiService !== 'undefined') {
            ApiService.logout();
          } else {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/webContent/login.html'; 
          }
        }
      });
    }

    quickActionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        switch (action) {
          case 'addBooth':
            window.location.href = '../webContent/admin-booth-management.html';
            break;
          case 'approveBookings':
            window.location.href = '../webContent/admin-bookings.html';
            break;
          case 'scheduleEvent':
            window.location.href = '../webContent/admin-event-management.html';
            break;
          case 'manageExhibitors':
            window.location.href = '../webContent/admin-exhibitor-management.html';
            break;
          default:
            break;
        }
      });
    });
  }
});