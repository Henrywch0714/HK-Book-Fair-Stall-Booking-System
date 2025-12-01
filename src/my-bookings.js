/**
 * My Bookings Page - Dynamic Data (MongoDB-backed)
 */

document.addEventListener("DOMContentLoaded", function () {

    if (typeof ApiService !== 'undefined') {
        const ok = ApiService.requireAuth();
        if (!ok) {

            return;
        }
    }

    // DOM Elements
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const logoutButton = document.getElementById('logoutButton');
    const userNameEl = document.getElementById('userName');
    
    // Summary elements
    const totalBookingsEl = document.getElementById('totalBookings');
    const confirmedBookingsEl = document.getElementById('confirmedBookings');
    const pendingBookingsEl = document.getElementById('pendingBookings');
    const totalAmountEl = document.getElementById('totalAmount');
    
    // Filter elements
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const eventFilter = document.getElementById('eventFilter');
    const resetFilters = document.getElementById('resetFilters');
    
    // Bookings list elements
    const loadingBookings = document.getElementById('loadingBookings');
    const emptyBookings = document.getElementById('emptyBookings');
    const bookingsList = document.getElementById('bookingsList');
    
    // Modal elements
    const bookingModal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');
    const modalActionBtn = document.getElementById('modalActionBtn');

    // State
    let allBookings = [];
    let filteredBookings = [];
    let userData = {};

    // Initialize
    async function init() {
        loadUserData();
        await loadBookings();
        setupEventListeners();

        handleDeepLinkView();
    }

    function loadUserData() {
        const storedUserData = localStorage.getItem('user');
        if (storedUserData) {
            try {
                userData = JSON.parse(storedUserData);
                const fullName = userData.firstName && userData.lastName 
                    ? `${userData.firstName} ${userData.lastName}`
                    : userData.username || userData.email || 'User';
                if (userNameEl) userNameEl.textContent = fullName;
                
                console.log('✅ User data loaded from localStorage:', userData);
            } catch (e) {
                console.error('❌ Failed to parse user data:', e);
            }
        } else {
            console.warn('⚠️ No user data found in localStorage');
        }
    }

    async function loadBookings() {
        try {
            console.log('📥 Loading bookings from API (/api/bookings)...');
            
            if (loadingBookings) loadingBookings.style.display = 'block';
            if (emptyBookings) emptyBookings.style.display = 'none';
            if (bookingsList) bookingsList.style.display = 'none';
            
            const result = await apiService.getMyBookings();
            
            console.log('✅ API Response:', result);
            
            allBookings = result.bookings || [];
            console.log(`✅ Loaded ${allBookings.length} bookings`);

            if (allBookings.length > 0) {
                const firstBooking = allBookings[0];
                console.log('First booking sample:', firstBooking);
                if (!firstBooking.totalPrice && firstBooking.totalPrice !== 0) {
                    console.error('❌ totalPrice field is missing on booking!');
                }
            }
            
            filteredBookings = [...allBookings];
            populateEventFilter();
            renderBookings();
            updateSummary();
            
        } catch (error) {
            console.error('❌ Failed to load bookings:', error);
            
            if (loadingBookings) loadingBookings.style.display = 'none';
            if (emptyBookings) {
                emptyBookings.style.display = 'block';
                emptyBookings.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">❌</span>
                        <h3>Failed to Load Bookings</h3>
                        <p>${error.message || 'Please try again later.'}</p>
                        <button class="btn-primary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    function handleDeepLinkView() {
        const viewId = sessionStorage.getItem('viewBookingId');
        if (!viewId) return;

        sessionStorage.removeItem('viewBookingId');

        const target = allBookings.find(b => b._id === viewId);
        if (!target) {
            console.warn('ViewBookingId not found in current bookings:', viewId);
            return;
        }

        console.log('🔗 Deep link: opening booking from dashboard:', viewId);

        setTimeout(() => {
            showBookingDetails(viewId);
        }, 100);
    }

    function populateEventFilter() {
        const events = [...new Set(allBookings.map(b => b.eventName))].filter(Boolean);
        if (!eventFilter) return;

        eventFilter.innerHTML = '<option value="">All Events</option>';
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event;
            option.textContent = event;
            eventFilter.appendChild(option);
        });
    }

    function updateSummary() {
        if (totalBookingsEl) totalBookingsEl.textContent = allBookings.length;
        
        const confirmed = allBookings.filter(b => 
            b.status === 'confirmed' || b.status === 'Confirmed'
        ).length;
        if (confirmedBookingsEl) confirmedBookingsEl.textContent = confirmed;
        
        const pending = allBookings.filter(b => 
            b.status === 'pending' || b.status === 'Pending'
        ).length;
        if (pendingBookingsEl) pendingBookingsEl.textContent = pending;
        
        const total = allBookings.reduce((sum, b) => {
            const price = b.totalPrice;
            if (typeof price !== 'number') {
                console.warn('Invalid price for booking:', b._id, price);
                return sum;
            }
            return sum + price;
        }, 0);
        
        if (totalAmountEl) totalAmountEl.textContent = `$${total.toLocaleString()}`;
    }

    function renderBookings() {
        if (loadingBookings) loadingBookings.style.display = 'none';
        
        if (!bookingsList || !emptyBookings) return;

        if (filteredBookings.length === 0) {
            emptyBookings.style.display = 'block';
            bookingsList.style.display = 'none';
            return;
        }
        
        emptyBookings.style.display = 'none';
        bookingsList.style.display = 'flex';
        
        bookingsList.innerHTML = filteredBookings.map(booking => {
            if (typeof booking.totalPrice !== 'number') {
                console.error('❌ Invalid totalPrice for booking:', booking._id, booking);
                return '';
            }
            
            const status = booking.status || 'pending';
            const statusClass = status.toLowerCase();
            
            return `
            <div class="booking-card" onclick="showBookingDetails('${booking._id}')">
                <div class="booking-card-header">
                    <div class="booking-main-info">
                        <div class="booking-booth">🎯 Booth ${booking.boothNumber}</div>
                        <div class="booking-event">${booking.eventName}</div>
                        <div class="booking-date">📅 ${booking.eventDate}</div>
                    </div>
                    <div class="booking-status">
                        <span class="status-badge status-${statusClass}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>
                </div>
                <div class="booking-card-body">
                    <div class="booking-detail">
                        <span class="booking-detail-icon">📍</span>
                        <span>${booking.location}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="booking-detail-icon">🏢</span>
                        <span>${booking.venue}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="booking-detail-icon">🏷️</span>
                        <span>ID: ${booking.boothId}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="booking-detail-icon">📅</span>
                        <span>Booked: ${new Date(booking.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="booking-card-footer">
                    <div class="booking-price">$${booking.totalPrice.toLocaleString()}</div>
                    <div class="booking-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); viewBooking('${booking._id}')">
                            👁️ View
                        </button>
                        ${status.toLowerCase() === 'pending' ? `
                            <button class="btn-icon btn-pay" onclick="event.stopPropagation(); payNow('${booking._id}')">
                                💳 Pay Now
                            </button>
                        ` : ''}
                        <button class="btn-icon" onclick="event.stopPropagation(); downloadInvoice('${booking._id}')">
                            📄 Invoice
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).filter(Boolean).join('');
    }

    function filterBookings() {
        const searchTerm = (searchInput?.value || '').toLowerCase();
        const statusValue = statusFilter?.value || '';
        const eventValue = eventFilter?.value || '';
        
        filteredBookings = allBookings.filter(booking => {
            const matchSearch = !searchTerm || 
                (booking.boothNumber && booking.boothNumber.toLowerCase().includes(searchTerm)) ||
                (booking.eventName && booking.eventName.toLowerCase().includes(searchTerm)) ||
                (booking.location && booking.location.toLowerCase().includes(searchTerm));
            
            const matchStatus = !statusValue || booking.status === statusValue;
            const matchEvent = !eventValue || booking.eventName === eventValue;
            
            return matchSearch && matchStatus && matchEvent;
        });
        
        renderBookings();
    }

    window.showBookingDetails = function(bookingId) {
        const booking = allBookings.find(b => b._id === bookingId);
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return;
        }
        
        const price = typeof booking.totalPrice === 'number' ? booking.totalPrice : 0;
        
        modalBody.innerHTML = `
            <div style="display: grid; gap: 1.5rem;">
                <div>
                    <h3 style="color: #4f46e5; font-size: 1.5rem; margin-bottom: 0.5rem;">
                        ${booking.boothNumber}
                    </h3>
                    <p style="color: #94a3b8; font-size: 0.875rem;">Booking ID: ${booking._id}</p>
                </div>
                
                <div style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; border: 1px solid #334155;">
                    <h4 style="color: #e2e8f0; margin-bottom: 0.75rem;">Event Information</h4>
                    <div style="display: grid; gap: 0.5rem; color: #94a3b8; font-size: 0.875rem;">
                        <div>📋 <strong>Event:</strong> ${booking.eventName}</div>
                        <div>📅 <strong>Date:</strong> ${booking.eventDate}</div>
                        <div>🏢 <strong>Venue:</strong> ${booking.venue}</div>
                        <div>📍 <strong>Location:</strong> ${booking.location}</div>
                    </div>
                </div>
                
                <div style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; border: 1px solid #334155;">
                    <h4 style="color: #e2e8f0; margin-bottom: 0.75rem;">Company Information</h4>
                    <div style="display: grid; gap: 0.5rem; color: #94a3b8; font-size: 0.875rem;">
                        <div>🏢 <strong>Company:</strong> ${booking.companyName}</div>
                        <div>👤 <strong>Contact:</strong> ${booking.contactPerson}</div>
                        <div>📧 <strong>Email:</strong> ${booking.contactEmail}</div>
                        <div>📱 <strong>Phone:</strong> ${booking.contactPhone}</div>
                    </div>
                </div>
                
                <div style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; border: 1px solid #334155;">
                    <h4 style="color: #e2e8f0; margin-bottom: 0.75rem;">Payment Details</h4>
                    <div style="display: grid; gap: 0.5rem; color: #94a3b8; font-size: 0.875rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>💰 <strong>Price:</strong></span>
                            <span style="color: #10b981; font-weight: bold; font-size: 1.25rem;">
                                $${price.toLocaleString()}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>📊 <strong>Status:</strong></span>
                            <span class="status-badge status-${booking.status.toLowerCase()}">
                                ${booking.status}
                            </span>
                        </div>
                        <div>📅 <strong>Booked On:</strong> ${new Date(booking.createdAt).toLocaleString()}</div>
                        ${booking.confirmedAt ? `
                            <div>✅ <strong>Confirmed On:</strong> ${new Date(booking.confirmedAt).toLocaleString()}</div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        if (booking.status === 'pending' || booking.status === 'Pending') {
            modalActionBtn.style.display = 'block';
            modalActionBtn.textContent = '💳 Pay Now';
            modalActionBtn.onclick = () => {
                closeModal();
                payNow(bookingId);
            };
        } else {
            modalActionBtn.style.display = 'none';
        }
        
        bookingModal.style.display = 'flex';
    };

    window.closeModal = function() {
        bookingModal.style.display = 'none';
    };

    window.viewBooking = function(bookingId) {
        showBookingDetails(bookingId);
    };

    window.payNow = function(bookingId) {
        const booking = allBookings.find(b => b._id === bookingId);
        if (booking) {
            sessionStorage.setItem('pendingBooking', JSON.stringify({
                booths: [{
                    ...booking,
                    price: booking.totalPrice,
                    id: booking.boothNumber
                }],
                totalPrice: booking.totalPrice,
                eventName: booking.eventName,
                eventDate: booking.eventDate,
                companyName: booking.companyName,
                contactPerson: booking.contactPerson,
                contactEmail: booking.contactEmail,
                contactPhone: booking.contactPhone
            }));
            window.location.href = 'payment.html';
        }
    };


    window.downloadInvoice = function(bookingId) {
        const booking = allBookings.find(b => b._id === bookingId);
        if (booking) {
            alert(`📄 Downloading invoice for Booth ${booking.boothNumber}\nEvent: ${booking.eventName}\nAmount: $${booking.totalPrice.toLocaleString()}`);
        }
    };

    function setupEventListeners() {

        if (mobileMenuToggle) {
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
                        window.location.href = '../webContent/Login.html';
                    }
                }
            });
        }
        
        // Filters
        if (searchInput) searchInput.addEventListener('input', filterBookings);
        if (statusFilter) statusFilter.addEventListener('change', filterBookings);
        if (eventFilter) eventFilter.addEventListener('change', filterBookings);
        
        if (resetFilters) {
            resetFilters.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (statusFilter) statusFilter.value = '';
                if (eventFilter) eventFilter.value = '';
                filterBookings();
            });
        }
    }

    // Initialize
    init();
});