document.addEventListener("DOMContentLoaded", () => {
    if (typeof ApiService !== "undefined") {
        const ok = ApiService.requireAuth();
        if (!ok) return;
    }

    const mobileMenuToggle = document.getElementById("mobileMenuToggle");
    const sidebar = document.querySelector(".sidebar");
    const logoutButton = document.getElementById("logoutButton");
    const userNameEl = document.getElementById("userName");
    const welcomeTitle = document.getElementById("welcomeTitle");

    const activeBookingsCount = document.getElementById("activeBookingsCount");
    const confirmedBookingsCount = document.getElementById("confirmedBookingsCount");
    const pendingPaymentsCount = document.getElementById("pendingPaymentsCount");
    const totalInvestment = document.getElementById("totalInvestment");

    const loadingBookings = document.getElementById("loadingBookings");     
    const emptyBookings = document.getElementById("emptyBookings");         
    const bookingsTable = document.getElementById("bookingsTable");         
    const bookingsTableBody = document.getElementById("bookingsTableBody"); 

    const loadingEvents = document.getElementById("loadingEvents");
    const emptyEvents = document.getElementById("emptyEvents");
    const eventsGrid = document.getElementById("eventsGrid");

    let userData = {};
    let bookingsData = [];
    let eventsData = [];

    init();

    async function init() {
        loadUserData();
        setupEventListeners();
        await loadDashboardData();
    }

    function loadUserData() {
        const storedUserData = localStorage.getItem("user");
        if (storedUserData) {
            try {
                userData = JSON.parse(storedUserData);
            } catch (e) {
                console.error("Failed to parse user data:", e);
                userData = {};
            }
        }

        const fullName =
            (userData.firstName && userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : userData.username || userData.email) || "Exhibitor";

        if (userNameEl) userNameEl.textContent = fullName;
        if (welcomeTitle)
            welcomeTitle.textContent = `Welcome back, ${
                userData.firstName || fullName
            }! 👋`;
    }

    async function loadDashboardData() {
        try {
            await loadBookings();
            buildEventsFromBookings();
            renderEvents();
            updateStatistics();
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
            showGlobalError();
        }
    }

    async function loadBookings() {
        if (loadingBookings) loadingBookings.style.display = "block";
        if (emptyBookings) emptyBookings.style.display = "none";
        if (bookingsTable) bookingsTable.style.display = "none";

        try {
            const result = await apiService.getMyBookings();

            bookingsData = result.bookings || [];
            bookingsData.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            renderBookingsTable();
        } catch (error) {
            console.error("Error loading exhibitor bookings:", error);

            if (loadingBookings) loadingBookings.style.display = "none";
            if (emptyBookings) {
                emptyBookings.style.display = "block";
                emptyBookings.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">⚠️</span>
                        <h3>Failed to Load Bookings</h3>
                        <p>${
                            error.message ||
                            "Unable to load your bookings. Please try again later."
                        }</p>
                        <button class="btn-primary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    function buildEventsFromBookings() {
        const map = new Map();

        bookingsData.forEach((b) => {
            if (!b.eventName) return;

            const key = `${b.eventName}::${b.eventDate || ""}`;
            const existing =
                map.get(key) || {
                    eventName: b.eventName,
                    eventDate: b.eventDate,
                    venue: b.venue,
                    location: b.location,
                    totalBooths: 0,
                    totalInvestment: 0,
                    lastUpdated: b.createdAt,
                };

            existing.totalBooths += 1;
            if (typeof b.totalPrice === "number") {
                existing.totalInvestment += b.totalPrice;
            }
            if (new Date(b.createdAt) > new Date(existing.lastUpdated)) {
                existing.lastUpdated = b.createdAt;
            }

            map.set(key, existing);
        });

        eventsData = Array.from(map.values()).sort(
            (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
        );
    }

    function renderBookingsTable() {
        if (loadingBookings) loadingBookings.style.display = "none";
        if (!bookingsTable || !bookingsTableBody || !emptyBookings) return;

        if (!bookingsData.length) {
            emptyBookings.style.display = "block";
            bookingsTable.style.display = "none";
            return;
        }

        emptyBookings.style.display = "none";
        bookingsTable.style.display = "table";

        const rows = bookingsData.slice(0, 10).map((b) => {
            const status = (b.status || "pending").toLowerCase();
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            const price = typeof b.totalPrice === "number" ? b.totalPrice : 0;

            return `
                <tr>
                    <td>Booth ${b.boothNumber || "-"}</td>
                    <td>${b.eventName || "N/A"}</td>
                    <td>${b.eventDate || "-"}</td>
                    <td>${b.location || "-"}</td>
                    <td>$${price.toLocaleString()}</td>
                    <td>
                        <span class="status-badge status-${status}">
                            ${statusLabel}
                        </span>
                    </td>
                    <td>
                        <button 
                            class="btn-icon btn-sm"
                            onclick="viewBookingFromDashboard('${b._id}')">
                            👁️
                        </button>
                        ${
                            status === "pending"
                                ? `
                            <button 
                                class="btn-icon btn-sm btn-pay"
                                onclick="payBookingFromDashboard('${b._id}')">
                                💳
                            </button>`
                                : ""
                        }
                    </td>
                </tr>
            `;
        });

        bookingsTableBody.innerHTML = rows.join("");
    }

    function renderEvents() {
        if (loadingEvents) loadingEvents.style.display = "none";
        if (!eventsGrid || !emptyEvents) return;

        if (!eventsData.length) {
            emptyEvents.style.display = "block";
            eventsGrid.style.display = "none";
            return;
        }

        emptyEvents.style.display = "none";
        eventsGrid.style.display = "grid";

        eventsGrid.innerHTML = eventsData
            .slice(0, 6)
            .map(
                (e) => `
            <div class="event-card">
                <div class="event-card-header">
                    <h3>${e.eventName}</h3>
                    <p>${e.eventDate || "Date TBA"}</p>
                </div>
                <div class="event-card-body">
                    <div class="event-meta">
                        <span>📍 ${e.location || "Location TBA"}</span>
                        <span>🏢 ${e.venue || "Venue TBA"}</span>
                    </div>
                    <div class="event-stats">
                        <div>
                            <div class="label">Booths Booked</div>
                            <div class="value">${e.totalBooths}</div>
                        </div>
                        <div>
                            <div class="label">Total Investment</div>
                            <div class="value">$${e.totalInvestment.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div class="event-card-footer">
                    <span class="event-updated">
                        Last booking: ${new Date(
                            e.lastUpdated
                        ).toLocaleDateString()}
                    </span>
                    <button 
                        class="btn-link"
                        onclick="filterDashboardByEvent('${e.eventName.replace(
                            /'/g,
                            "\\'"
                        )}')">
                        View Bookings
                    </button>
                </div>
            </div>
        `
            )
            .join("");
    }

    function updateStatistics() {
        const total = bookingsData.length;

        const confirmed = bookingsData.filter(
            (b) => (b.status || "").toLowerCase() === "confirmed"
        ).length;

        const pending = bookingsData.filter(
            (b) => (b.status || "").toLowerCase() === "pending"
        ).length;

        const active = bookingsData.filter((b) => {
            const s = (b.status || "").toLowerCase();
            return !["cancelled", "canceled", "rejected"].includes(s);
        }).length;

        const totalAmount = bookingsData.reduce((sum, b) => {
            const p = typeof b.totalPrice === "number" ? b.totalPrice : 0;
            return sum + p;
        }, 0);

        if (activeBookingsCount) activeBookingsCount.textContent = active;
        if (confirmedBookingsCount) confirmedBookingsCount.textContent = confirmed;
        if (pendingPaymentsCount) pendingPaymentsCount.textContent = pending;
        if (totalInvestment)
            totalInvestment.textContent = `$${totalAmount.toLocaleString()}`;
    }

    function showGlobalError() {
        if (loadingBookings) loadingBookings.style.display = "none";
        if (loadingEvents) loadingEvents.style.display = "none";

        if (emptyBookings) {
            emptyBookings.style.display = "block";
            emptyBookings.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">⚠️</span>
                    <h3>Dashboard Error</h3>
                    <p>We couldn't load your dashboard data. Please refresh or try again later.</p>
                </div>
            `;
        }
        if (emptyEvents) {
            emptyEvents.style.display = "block";
            emptyEvents.innerHTML = `
                <div class="empty-state">
                    <h3>No Event Data</h3>
                    <p>Your event overview is currently unavailable.</p>
                </div>
            `;
        }
    }

    window.viewBookingFromDashboard = function (bookingId) {
        if (!bookingId) return;
        sessionStorage.setItem("viewBookingId", bookingId);
        window.location.href = "my-bookings.html";
    };

    window.payBookingFromDashboard = function (bookingId) {
        const booking = bookingsData.find((b) => b._id === bookingId);
        if (!booking) {
            console.error("Booking not found for payment:", bookingId);
            return;
        }

        sessionStorage.setItem(
            "pendingBooking",
            JSON.stringify({
                booths: [
                    {
                        ...booking,
                        price: booking.totalPrice,
                        id: booking.boothNumber,
                    },
                ],
                totalPrice: booking.totalPrice,
                eventName: booking.eventName,
                eventDate: booking.eventDate,
                companyName: booking.companyName,
                contactPerson: booking.contactPerson,
                contactEmail: booking.contactEmail,
                contactPhone: booking.contactPhone,
            })
        );

        window.location.href = "payment.html";
    };

    window.filterDashboardByEvent = function (eventName) {
        if (!eventName || !bookingsTableBody || !bookingsTable) return;

        const filtered = bookingsData.filter((b) => b.eventName === eventName);
        if (!filtered.length) {
            alert(`No bookings found for event: ${eventName}`);
            return;
        }

        bookingsTable.style.display = "table";
        if (emptyBookings) emptyBookings.style.display = "none";

        bookingsTableBody.innerHTML = filtered
            .map((b) => {
                const status = (b.status || "pending").toLowerCase();
                const statusLabel =
                    status.charAt(0).toUpperCase() + status.slice(1);
                const price =
                    typeof b.totalPrice === "number" ? b.totalPrice : 0;

                return `
                <tr>
                    <td>Booth ${b.boothNumber || "-"}</td>
                    <td>${b.eventName || "N/A"}</td>
                    <td>${b.eventDate || "-"}</td>
                    <td>${b.location || "-"}</td>
                    <td>$${price.toLocaleString()}</td>
                    <td>
                        <span class="status-badge status-${status}">
                            ${statusLabel}
                        </span>
                    </td>
                    <td>
                        <button 
                            class="btn-icon btn-sm"
                            onclick="viewBookingFromDashboard('${b._id}')">
                            👁️
                        </button>
                        ${
                            status === "pending"
                                ? `
                        <button 
                            class="btn-icon btn-sm btn-pay"
                            onclick="payBookingFromDashboard('${b._id}')">
                            💳
                        </button>`
                                : ""
                        }
                    </td>
                </tr>
            `;
            })
            .join("");
    };

    function setupEventListeners() {
        if (mobileMenuToggle && sidebar) {
            mobileMenuToggle.addEventListener("click", () => {
                sidebar.classList.toggle("sidebar-open");
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                if (confirm("Are you sure you want to logout?")) {
                    if (typeof ApiService !== "undefined") {
                        ApiService.logout();
                    } else {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = "../webContent/login.html";
                    }
                }
            });
        }
    }
});