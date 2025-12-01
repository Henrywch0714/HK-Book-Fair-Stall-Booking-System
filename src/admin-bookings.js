/**
 * Admin Booking Management - Event Booth System
 * Connects admin-bookings.html to MongoDB-backed APIs.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ===== Auth Check =====
  if (typeof ApiService !== 'undefined') {
    const ok = ApiService.requireAuth(); // 如需角色可改为 requireAuth({ role: 'admin' })
    if (!ok) return;
  }

  // ===== DOM References =====
  const logoutButton = document.getElementById('logoutButton');

  // Stats
  const totalBookingsEl = document.getElementById('totalBookings');
  const confirmedBookingsEl = document.getElementById('confirmedBookings');
  const pendingBookingsEl = document.getElementById('pendingBookings');
  const cancelledBookingsEl = document.getElementById('cancelledBookings');

  // Filters
  const statusFilter = document.getElementById('statusFilter');
  const eventFilter = document.getElementById('eventFilter');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  // Table
  const bookingsTableBody = document.getElementById('bookingsTableBody');
  const tableCountLabel = document.getElementById('tableCountLabel');
  const emptyState = document.getElementById('emptyState');

  // ===== State =====
  let allBookings = [];
  let filteredBookings = [];
  let uniqueEvents = [];

  // ===== Init =====
  init();

  async function init() {
    setupEventListeners();
    await loadBookings();
  }



  async function loadBookings() {
    if (!bookingsTableBody) return;

    bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 1rem; color: #9ca3af;">
          Loading bookings...
        </td>
      </tr>
    `;
    if (emptyState) emptyState.hidden = true;

    try {
      let result;
      if (apiService.getAdminBookings) {
        result = await apiService.getAdminBookings({

          sort: 'createdAt:desc'
        });
      } else if (apiService.getBookings) {

        result = await apiService.getBookings({ sort: 'createdAt:desc' });
      } else {
        result = { bookings: [] };
      }

      allBookings = result.bookings || result || [];

      allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      filteredBookings = [...allBookings];

      buildEventFilterOptions();
      updateStats();
      renderTable();
    } catch (err) {
      console.error('❌ Failed to load bookings:', err);
      bookingsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding: 1rem; color: #f97373;">
            Failed to load bookings. ${err.message || ''}
          </td>
        </tr>
      `;
    }
  }

  // ========== Event Filter Options ==========

  function buildEventFilterOptions() {
    if (!eventFilter) return;

    uniqueEvents = [
      ...new Set(allBookings.map((b) => b.eventName).filter(Boolean))
    ];

    const currentValue = eventFilter.value;

    eventFilter.innerHTML = '<option value="all">All Events</option>';
    uniqueEvents.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      eventFilter.appendChild(opt);
    });

    if (
      currentValue &&
      (currentValue === 'all' || uniqueEvents.includes(currentValue))
    ) {
      eventFilter.value = currentValue;
    }
  }

  // ========== Stats ==========

  function updateStats() {
    const total = allBookings.length;
    const confirmed = allBookings.filter(
      (b) => (b.status || '').toLowerCase() === 'confirmed'
    ).length;
    const pending = allBookings.filter(
      (b) => (b.status || '').toLowerCase() === 'pending'
    ).length;
    const cancelled = allBookings.filter((b) =>
      ['cancelled', 'canceled', 'rejected'].includes(
        (b.status || '').toLowerCase()
      )
    ).length;

    if (totalBookingsEl) totalBookingsEl.textContent = total;
    if (confirmedBookingsEl) confirmedBookingsEl.textContent = confirmed;
    if (pendingBookingsEl) pendingBookingsEl.textContent = pending;
    if (cancelledBookingsEl) cancelledBookingsEl.textContent = cancelled;
  }

  // ========== Filters ==========

  function applyFilters() {
    const statusVal = (statusFilter?.value || 'all').toLowerCase();
    const eventVal = eventFilter?.value || 'all';

    filteredBookings = allBookings.filter((b) => {
      const status = (b.status || '').toLowerCase();
      const eventName = b.eventName || '';

      let statusMatch = true;
      if (statusVal !== 'all') {
        if (statusVal === 'cancelled') {
          statusMatch = ['cancelled', 'canceled', 'rejected'].includes(status);
        } else {
          statusMatch = status === statusVal;
        }
      }

      let eventMatch = true;
      if (eventVal !== 'all') {
        eventMatch = eventName === eventVal;
      }

      return statusMatch && eventMatch;
    });

    renderTable();
  }

  function resetFilters() {
    if (statusFilter) statusFilter.value = 'all';
    if (eventFilter) eventFilter.value = 'all';
    filteredBookings = [...allBookings];
    renderTable();
  }

  // ========== Table Rendering ==========

  function renderTable() {
    if (!bookingsTableBody || !tableCountLabel || !emptyState) return;

    const count = filteredBookings.length;
    tableCountLabel.textContent = `${count} booking${count === 1 ? '' : 's'}`;

    if (!count) {
      bookingsTableBody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    bookingsTableBody.innerHTML = filteredBookings
      .map((b, idx) => {
        const status = (b.status || 'pending').toLowerCase();
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const price = typeof b.totalPrice === 'number' ? b.totalPrice : 0;

        const bookingId =
          b.bookingId ||
          (b._id ? `BK${b._id.slice(-6).toUpperCase()}` : `#${idx + 1}`);

        const bookingDate = b.createdAt || b.bookingDate;
        const bookingDateLabel = bookingDate
          ? formatDateShort(bookingDate)
          : '-';

        let statusClass = 'status-pill status-pending';
        if (status === 'confirmed')
          statusClass = 'status-pill status-confirmed';
        else if (
          ['cancelled', 'canceled', 'rejected'].includes(status)
        )
          statusClass = 'status-pill status-cancelled';


        const canApprove = status === 'pending';
        const canCancel = status === 'pending' || status === 'confirmed';

        return `
          <tr>
            <td>${bookingId}</td>
            <td>${b.companyName || b.exhibitorName || '-'}</td>
            <td>${b.boothNumber || '-'}</td>
            <td>${b.eventName || 'N/A'}</td>
            <td>${bookingDateLabel}</td>
            <td>
              <span class="${statusClass}">
                ${statusLabel}
              </span>
            </td>
            <td>$${price.toLocaleString()}</td>
            <td>
              <button 
                class="table-btn view-btn" 
                type="button"
                data-action="view"
                data-id="${b._id}">
                View
              </button>
              ${
                canApprove
                  ? `<button 
                        class="table-btn approve-btn" 
                        type="button"
                        data-action="approve"
                        data-id="${b._id}">
                        Approve
                      </button>`
                  : ''
              }
              ${
                canCancel
                  ? `<button 
                        class="table-btn cancel-btn" 
                        type="button"
                        data-action="cancel"
                        data-id="${b._id}">
                        Cancel
                      </button>`
                  : ''
              }
            </td>
          </tr>
        `;
      })
      .join('');

    bookingsTableBody.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', onTableActionClick);
    });
  }

  function onTableActionClick(e) {
    const btn = e.currentTarget;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (!id) return;

    if (action === 'view') {

      alert(`View details for booking: ${id}`);
    } else if (action === 'approve') {
      handleStatusChange(id, 'confirmed');
    } else if (action === 'cancel') {
      handleStatusChange(id, 'cancelled');
    }
  }

  // ========== Status Change (Approve / Cancel) ==========

  async function handleStatusChange(bookingId, newStatus) {
    const booking = allBookings.find((b) => b._id === bookingId);
    if (!booking) {
      alert('Booking not found.');
      return;
    }

    const actionLabel =
      newStatus === 'confirmed'
        ? 'approve this booking'
        : 'cancel this booking';

    if (
      !confirm(
        `Are you sure you want to ${actionLabel}?\n\n` +
          `Booking: ${booking.boothNumber || '-'} - ${booking.eventName || ''} - ` +
          `${booking.companyName || booking.exhibitorName || ''}`
      )
    ) {
      return;
    }

    try {
      let updated;
      if (apiService.updateBookingStatus) {
        updated = await apiService.updateBookingStatus(bookingId, newStatus);
      } else {

        if (!apiService.updateBooking) {
          alert('Update API not implemented yet.');
          return;
        }
        updated = await apiService.updateBooking(bookingId, {
          status: newStatus
        });
      }

      const idx = allBookings.findIndex((b) => b._id === bookingId);
      if (idx > -1) {
        allBookings[idx] = { ...allBookings[idx], ...updated };
      }

      applyFilters(); 
      updateStats();
    } catch (err) {
      console.error('❌ Failed to update booking status:', err);
      alert(err.message || 'Failed to update booking status.');
    }
  }

  // ========== Utils ==========

  function formatDateShort(input) {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }



  function setupEventListeners() {
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

    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', applyFilters);
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', resetFilters);
    }
  }
});