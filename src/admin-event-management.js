document.addEventListener("DOMContentLoaded", () => {
  if (
    typeof ApiService !== "undefined" &&
    ApiService.requireAuth &&
    !ApiService.requireAuth()
  ) {
    return;
  }

  const api = new ApiService();

  const logoutButton = document.getElementById("logoutButton");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebarEl = document.querySelector(".sidebar");

  // Stats
  const totalEventsEl = document.getElementById("totalEvents");
  const activeEventsEl = document.getElementById("activeEvents");
  const totalBoothsStatEl = document.getElementById("totalBoothsStat");
  const totalRevenueEl = document.getElementById("totalRevenue");

  // Filters
  const searchEventsInput = document.getElementById("searchEvents");
  const statusFilterEl = document.getElementById("statusFilter");
  const dateFilterEl = document.getElementById("dateFilter");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");
  const exportEventsBtn = document.getElementById("exportEventsBtn");

  const tableCountEl = document.getElementById("tableCount");
  const eventsGridEl = document.getElementById("eventsGrid");
  const eventsListContainer = document.getElementById("eventsList");
  const eventsTableBodyEl = document.getElementById("eventsTableBody");
  const emptyStateEl = document.getElementById("emptyState");

  const viewToggleButtons = document.querySelectorAll(
    ".view-toggle .view-btn"
  );

  // Event modal
  const eventModal = document.getElementById("eventModal");
  const modalTitleEl = document.getElementById("modalTitle");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const eventForm = document.getElementById("eventForm");
  const cancelEventBtn = document.getElementById("cancelEventBtn");
  const saveEventBtn = document.getElementById("saveEventBtn");
  const addEventBtn = document.getElementById("addEventBtn");

  const eventTitleInput = document.getElementById("eventTitle");
  const eventCategorySelect = document.getElementById("eventCategory");
  const eventDateInput = document.getElementById("eventDate");
  const eventTimeInput = document.getElementById("eventTime");
  const eventDescriptionInput = document.getElementById("eventDescription");

  const eventVenueInput = document.getElementById("eventVenue");
  const eventAddressInput = document.getElementById("eventAddress");
  const eventCityInput = document.getElementById("eventCity");
  const eventCapacityInput = document.getElementById("eventCapacity");

  const totalBoothsInput = document.getElementById("totalBooths");
  const boothPriceInput = document.getElementById("boothPrice");
  const boothSizesSelect = document.getElementById("boothSizes");
  const priceTiersSelect = document.getElementById("priceTiers");

  // Image
  const uploadImageBtn = document.getElementById("uploadImageBtn");
  const removeImageBtn = document.getElementById("removeImageBtn");
  const imageInput = document.getElementById("imageInput");
  const previewImage = document.getElementById("previewImage");

  const eventStatusSelect = document.getElementById("eventStatus");
  const registrationOpenCheckbox = document.getElementById("registrationOpen");

  // Transactions modal
  const transactionsModal = document.getElementById("transactionsModal");
  const transactionsCloseBtn = document.getElementById(
    "transactionsCloseBtn"
  );
  const transactionEventTitleEl = document.getElementById(
    "transactionEventTitle"
  );
  const transactionTotalRevenueEl = document.getElementById(
    "transactionTotalRevenue"
  );
  const transactionTotalBookingsEl = document.getElementById(
    "transactionTotalBookings"
  );
  const transactionAvgPriceEl = document.getElementById("transactionAvgPrice");
  const transactionsTableBodyEl = document.getElementById(
    "transactionsTableBody"
  );
  const exportTransactionsBtn = document.getElementById(
    "exportTransactionsBtn"
  );

  // Empty state
  const emptyAddBtn = document.getElementById("emptyAddEventBtn");

  let allEvents = [];
  let filteredEvents = [];
  let editingEventId = null;
  let currentView = "grid";
  let currentImageUrl = null;

  // Event -> stats and bookings, keyed by eventName
  let eventStatsByName = {};
  let eventBookingsByName = {};

  function formatCurrency(amount) {
    const n = Number(amount || 0);
    return (
      "$" +
      n.toLocaleString(undefined, {
        maximumFractionDigits: 0
      })
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function formatDateShort(input) {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  }

  function formatTime(timeStr) {
    return timeStr || "-";
  }

  function computeEventStatus(event) {
    return event.status || "draft";
  }

  function getStatusBadgeClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "upcoming") return "status-badge status-upcoming";
    if (s === "active" || s === "ongoing") return "status-badge status-active";
    if (s === "completed") return "status-badge status-completed";
    if (s === "draft" || s === "cancelled") return "status-badge status-draft";
    return "status-badge";
  }

  function setEmptyState(visible) {
    if (!emptyStateEl) return;
    emptyStateEl.style.display = visible ? "block" : "none";
  }

  function setView(view) {
    currentView = view;
    if (view === "grid") {
      if (eventsGridEl) eventsGridEl.style.display = "grid";
      if (eventsListContainer) eventsListContainer.style.display = "none";
    } else {
      if (eventsGridEl) eventsGridEl.style.display = "none";
      if (eventsListContainer) eventsListContainer.style.display = "block";
    }
    viewToggleButtons.forEach((btn) => {
      const v = btn.dataset.view;
      btn.classList.toggle("active", v === view);
    });
  }

  function applyModalBackgroundFromCurrentImage() {
    if (!eventModal) return;
    if (currentImageUrl) {
      eventModal.style.backgroundImage = `url("${currentImageUrl}")`;
      eventModal.classList.add("with-bg");
    } else {
      eventModal.style.backgroundImage = "none";
      eventModal.classList.remove("with-bg");
    }
  }

  function resetEventForm() {
    editingEventId = null;
    if (eventForm) eventForm.reset();
    if (modalTitleEl) modalTitleEl.textContent = "Add New Event";

    if (eventStatusSelect) eventStatusSelect.value = "draft";
    if (registrationOpenCheckbox) registrationOpenCheckbox.checked = true;

    currentImageUrl = null;
    applyModalBackgroundFromCurrentImage();

    if (previewImage) {
      previewImage.src = "";
      previewImage.style.display = "none";
    }
    if (removeImageBtn) removeImageBtn.style.display = "none";
    if (imageInput) imageInput.value = "";
  }

  function fillEventForm(event) {
    editingEventId = event._id;
    if (modalTitleEl) modalTitleEl.textContent = "Edit Event";

    if (eventTitleInput)
      eventTitleInput.value = event.title || event.name || "";
    if (eventCategorySelect)
      eventCategorySelect.value = event.category || "technology";
    if (eventDateInput) {
      if (event.date) {
        eventDateInput.value = String(event.date).slice(0, 10);
      } else if (event.startDate) {
        eventDateInput.value = String(event.startDate).slice(0, 10);
      } else {
        eventDateInput.value = "";
      }
    }
    if (eventTimeInput)
      eventTimeInput.value = event.time || event.startTime || "";
    if (eventDescriptionInput)
      eventDescriptionInput.value = event.description || "";

    if (eventVenueInput)
      eventVenueInput.value = event.venue || event.locationName || "";
    if (eventAddressInput) eventAddressInput.value = event.address || "";
    if (eventCityInput)
      eventCityInput.value = event.city || event.location || "";
    if (eventCapacityInput)
      eventCapacityInput.value = event.capacity || "";

    if (totalBoothsInput)
      totalBoothsInput.value = event.totalBooths ?? event.maxBooths ?? "";
    if (boothPriceInput) boothPriceInput.value = event.boothPrice || "";
    if (priceTiersSelect) priceTiersSelect.value = event.priceTiers || "single";

    if (boothSizesSelect) {
      const values = event.boothSizes || [];
      Array.from(boothSizesSelect.options).forEach((opt) => {
        opt.selected = values.includes(opt.value);
      });
    }

    if (eventStatusSelect) eventStatusSelect.value = event.status || "draft";
    if (registrationOpenCheckbox)
      registrationOpenCheckbox.checked = !!event.registrationOpen;

    currentImageUrl = event.imageUrl || null;
    if (currentImageUrl && previewImage) {
      previewImage.src = currentImageUrl;
      previewImage.style.display = "block";
      if (removeImageBtn) removeImageBtn.style.display = "inline-flex";
    } else {
      if (previewImage) {
        previewImage.src = "";
        previewImage.style.display = "none";
      }
      if (removeImageBtn) removeImageBtn.style.display = "none";
    }
    if (imageInput) imageInput.value = "";

    applyModalBackgroundFromCurrentImage();
  }

  function openEventModal(mode, event = null) {
    if (!eventModal) return;

    if (mode === "add") {
      resetEventForm();
    } else if (mode === "edit" && event) {
      fillEventForm(event);
    }

    eventModal.style.display = "flex";
  }

  function closeEventModal() {
    if (!eventModal) return;
    eventModal.style.display = "none";
  }

  function openTransactionsModalForEvent(event) {
    if (!transactionsModal) return;

    const eventName = event.name || event.title || event.eventName || "";

    if (transactionEventTitleEl) {
      transactionEventTitleEl.textContent = eventName || "Event";
    }

    const stats = eventStatsByName[eventName] || {
      totalRevenue: 0,
      totalBookings: 0
    };

    const totalRevenue = stats.totalRevenue || 0;
    const totalBookings = stats.totalBookings || 0;
    const avgPrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    if (transactionTotalRevenueEl) {
      transactionTotalRevenueEl.textContent = formatCurrency(totalRevenue);
    }
    if (transactionTotalBookingsEl) {
      transactionTotalBookingsEl.textContent = String(totalBookings);
    }
    if (transactionAvgPriceEl) {
      transactionAvgPriceEl.textContent = formatCurrency(avgPrice);
    }

    const bookings = eventBookingsByName[eventName] || [];

    if (transactionsTableBodyEl) {
      if (!bookings.length) {
        transactionsTableBodyEl.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; color:#9ca3af; font-size:13px;">
              No transactions found for this event.
            </td>
          </tr>
        `;
      } else {
        transactionsTableBodyEl.innerHTML = bookings
          .map((b, idx) => {
            const bookingId =
              b.bookingId ||
              (b._id ? `BK${String(b._id).slice(-6).toUpperCase()}` : `#${idx + 1}`);
            const status = (b.status || "pending").toLowerCase();
            const price = typeof b.totalPrice === "number" ? b.totalPrice : 0;
            const dateLabel = b.bookingDate
              ? formatDateShort(b.bookingDate)
              : b.createdAt
              ? formatDateShort(b.createdAt)
              : "-";

            return `
              <tr>
                <td>${bookingId}</td>
                <td>${b.companyName || b.userId?.companyName || "-"}</td>
                <td>${b.boothNumber || b.boothId?.id || "-"}</td>
                <td>${dateLabel}</td>
                <td>${status.charAt(0).toUpperCase() + status.slice(1)}</td>
                <td class="td-right">${formatCurrency(price)}</td>
              </tr>
            `;
          })
          .join("");
      }
    }

    transactionsModal.style.display = "flex";
  }

  function closeTransactionsModal() {
    if (!transactionsModal) return;
    transactionsModal.style.display = "none";
  }
  function updateStats(events) {
    const list = Array.isArray(events) ? events : [];
    const total = list.length;

    const active = list.filter(
      (e) => (e.status || "").toLowerCase() === "active"
    ).length;

    const totalBoothsSum = list.reduce(
      (sum, e) => sum + Number(e.totalBooths ?? e.maxBooths ?? 0),
      0
    );

    const totalRevenueSum = list.reduce(
      (sum, e) => sum + Number(e.totalRevenue || 0),
      0
    );

    if (totalEventsEl) totalEventsEl.textContent = String(total);
    if (activeEventsEl) activeEventsEl.textContent = String(active);
    if (totalBoothsStatEl)
      totalBoothsStatEl.textContent = String(totalBoothsSum);
    if (totalRevenueEl)
      totalRevenueEl.textContent = formatCurrency(totalRevenueSum);
  }

  function renderGrid(events) {
    if (!eventsGridEl) return;
    eventsGridEl.innerHTML = "";

    if (!events || events.length === 0) {
      return;
    }

    events.forEach((evt) => {
      const card = document.createElement("article");
      card.className = "event-card";

      const title = evt.title || evt.name || "(Untitled Event)";
      const status = computeEventStatus(evt);
      const dateStr = formatDate(evt.startDate || evt.date);
      const timeStr = formatTime(evt.time || evt.startTime);
      const venue = evt.venue || evt.locationName || evt.location || "-";

      const booths = evt.totalBooths ?? evt.maxBooths ?? 0;
      const booked = evt.bookedBooths || 0;
      const revenue = evt.totalRevenue || 0;

      card.innerHTML = `
        <div class="event-card-header">
          <div>
            <div class="event-title">${title}</div>
            <div class="event-subtitle">${venue}</div>
          </div>
          <span class="${getStatusBadgeClass(status)}">${status}</span>
        </div>

        <div class="event-meta">
          <span class="event-meta-item">
            <span>📅</span>
            <span>${dateStr}</span>
          </span>
          <span class="event-meta-item">
            <span>⏰</span>
            <span>${timeStr}</span>
          </span>
        </div>

        <div class="event-metrics">
          <span>🎪 Booths: ${booths}</span>
          <span>📋 Booked: ${booked}</span>
          <span>💰 ${formatCurrency(revenue)}</span>
        </div>

        <div class="event-card-footer">
          <div class="event-actions">
            <button type="button" class="table-action-btn edit-btn">Edit</button>
            <button type="button" class="table-action-btn view-tx-btn">Transactions</button>
            <button type="button" class="table-action-btn delete-btn">Delete</button>
          </div>
          <span class="tag-chip">${evt.category || "General"}</span>
        </div>
      `;

      const editBtn = card.querySelector(".edit-btn");
      const deleteBtn = card.querySelector(".delete-btn");
      const txBtn = card.querySelector(".view-tx-btn");

      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openEventModal("edit", evt);
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleDeleteEvent(evt);
        });
      }

      if (txBtn) {
        txBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openTransactionsModalForEvent(evt);
        });
      }

      card.addEventListener("click", () => {
        openEventModal("edit", evt);
      });

      eventsGridEl.appendChild(card);
    });
  }

  function renderList(events) {
    if (!eventsTableBodyEl) return;
    eventsTableBodyEl.innerHTML = "";

    if (!events || events.length === 0) {
      return;
    }

    events.forEach((evt) => {
      const tr = document.createElement("tr");

      const title = evt.title || evt.name || "(Untitled Event)";
      const status = computeEventStatus(evt);
      const dateStr = formatDate(evt.startDate || evt.date);
      const venue = evt.venue || evt.locationName || evt.location || "-";

      const booths = evt.totalBooths ?? evt.maxBooths ?? 0;
      const booked = evt.bookedBooths || 0;
      const revenue = evt.totalRevenue || 0;

      tr.innerHTML = `
        <td>
          <div style="font-weight:500;">${title}</div>
          <div style="font-size:11px; color: #9ca3af;">${evt.category || "General"}</div>
        </td>
        <td>${dateStr}</td>
        <td>${venue}</td>
        <td>${booths}</td>
        <td>${booked}</td>
        <td>${formatCurrency(revenue)}</td>
        <td>
          <span class="${getStatusBadgeClass(status)}">${status}</span>
        </td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-action-btn edit-btn">Edit</button>
            <button type="button" class="table-action-btn tx-btn">Tx</button>
            <button type="button" class="table-action-btn delete-btn">Delete</button>
          </div>
        </td>
      `;

      const editBtn = tr.querySelector(".edit-btn");
      const deleteBtn = tr.querySelector(".delete-btn");
      const txBtn = tr.querySelector(".tx-btn");

      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openEventModal("edit", evt);
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleDeleteEvent(evt);
        });
      }

      if (txBtn) {
        txBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openTransactionsModalForEvent(evt);
        });
      }

      eventsTableBodyEl.appendChild(tr);
    });
  }

  function renderEvents(events) {
    filteredEvents = Array.isArray(events) ? events : [];

    if (tableCountEl) {
      const n = filteredEvents.length;
      tableCountEl.textContent = n === 1 ? "1 event" : `${n} events`;
    }

    updateStats(filteredEvents);

    if (filteredEvents.length === 0) {
      setEmptyState(true);
      if (eventsGridEl) eventsGridEl.innerHTML = "";
      if (eventsTableBodyEl) eventsTableBodyEl.innerHTML = "";
      return;
    }
    setEmptyState(false);

    renderGrid(filteredEvents);
    renderList(filteredEvents);
  }

  function applyFilters() {
    let list = [...allEvents];

    const query = (searchEventsInput?.value || "").trim().toLowerCase();
    const status = statusFilterEl?.value || "all";
    const dateFilter = dateFilterEl?.value || "all";

    if (query) {
      list = list.filter((e) => {
        const title = (e.title || e.name || "").toLowerCase();
        const venue = (
          e.venue ||
          e.locationName ||
          e.location ||
          ""
        ).toLowerCase();
        return title.includes(query) || venue.includes(query);
      });
    }

    if (status && status !== "all") {
      list = list.filter((e) => {
        const s = (e.status || "").toLowerCase();
        return s === status.toLowerCase();
      });
    }

    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      list = list.filter((e) => {
        const src = e.startDate || e.date;
        if (!src) return false;
        const d = new Date(src);
        if (Number.isNaN(d.getTime())) return false;

        if (dateFilter === "today") {
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        }
        if (dateFilter === "week") {
          const weekFromNow = new Date(now);
          weekFromNow.setDate(now.getDate() + 7);
          return d >= now && d <= weekFromNow;
        }
        if (dateFilter === "month") {
          const monthFromNow = new Date(now);
          monthFromNow.setMonth(now.getMonth() + 1);
          return d >= now && d <= monthFromNow;
        }

        return true;
      });
    }

    renderEvents(list);
  }

  async function loadEventStats() {
    eventStatsByName = {};
    eventBookingsByName = {};

    try {
      if (!api.getAdminBookings) {
        console.warn("getAdminBookings is not available on ApiService.");
        return;
      }

      const res = await api.getAdminBookings({ sort: "bookingDate:desc" });
      const bookings = res.bookings || res || [];

      bookings.forEach((b) => {
        const eventName = b.eventName || "N/A";
        const price = typeof b.totalPrice === "number" ? b.totalPrice : 0;

        if (!eventStatsByName[eventName]) {
          eventStatsByName[eventName] = {
            totalBookings: 0,
            confirmedBookings: 0,
            totalRevenue: 0
          };
        }

        const s = eventStatsByName[eventName];
        s.totalBookings += 1;
        if ((b.status || "").toLowerCase() === "confirmed") {
          s.confirmedBookings += 1;
          s.totalRevenue += price;
        }

        if (!eventBookingsByName[eventName]) {
          eventBookingsByName[eventName] = [];
        }
        eventBookingsByName[eventName].push(b);
      });

      allEvents = allEvents.map((evt) => {
        const name = evt.name || evt.title || evt.eventName || "N/A";
        const baseMax = Number(evt.maxBooths ?? evt.totalBooths ?? 0);
        const stats =
          eventStatsByName[name] || {
            totalBookings: 0,
            confirmedBookings: 0,
            totalRevenue: 0
          };

        const bookedCount = stats.totalBookings;
        const totalBooths = baseMax || bookedCount;
        const available = Math.max(totalBooths - bookedCount, 0);

        return {
          ...evt,
          totalBooths,
          bookedBooths: bookedCount,
          availableBooths: available,
          totalRevenue: stats.totalRevenue
        };
      });
    } catch (err) {
      console.error("Failed to load event stats from admin bookings:", err);
    }
  }

  async function loadEvents() {
    try {
      const res = await api.getEvents();
      allEvents = Array.isArray(res) ? res : res.events || [];

      await loadEventStats();
      applyFilters();
    } catch (err) {
      console.error("Failed to load events:", err);
      alert(err.message || "Failed to load events.");
    }
  }

  async function handleSaveEvent(e) {
    e.preventDefault();

    if (
      !eventTitleInput ||
      !eventDateInput ||
      !eventVenueInput ||
      !totalBoothsInput ||
      !boothPriceInput
    ) {
      alert("Form elements missing in HTML.");
      return;
    }

    const title = eventTitleInput.value.trim();
    const category = eventCategorySelect
      ? eventCategorySelect.value
      : "technology";
    const date = eventDateInput.value;
    const time = eventTimeInput ? eventTimeInput.value : "";
    const description = (eventDescriptionInput?.value || "").trim();

    const venue = eventVenueInput.value.trim();
    const address = (eventAddressInput?.value || "").trim();
    const city = (eventCityInput?.value || "").trim();
    const capacityStr = eventCapacityInput?.value || "";
    const capacity = capacityStr === "" ? 0 : Number(capacityStr);

    const totalBoothsStr = totalBoothsInput.value;
    const boothPriceStr = boothPriceInput.value;

    const totalBoothsVal = totalBoothsStr === "" ? 0 : Number(totalBoothsStr);
    const boothPriceVal = boothPriceStr === "" ? 0 : Number(boothPriceStr);

    const boothSizes = boothSizesSelect
      ? Array.from(boothSizesSelect.selectedOptions).map((opt) => opt.value)
      : [];
    const priceTiers = priceTiersSelect ? priceTiersSelect.value : "single";

    const status = eventStatusSelect ? eventStatusSelect.value : "draft";
    const registrationOpen = registrationOpenCheckbox
      ? registrationOpenCheckbox.checked
      : true;

    if (!title) {
      alert("Please fill in: Event Title *");
      return;
    }
    if (!date) {
      alert("Please fill in: Event Date *");
      return;
    }
    if (!venue) {
      alert("Please fill in: Venue Name *");
      return;
    }
    if (!totalBoothsStr) {
      alert("Please fill in: Total Booths *");
      return;
    }
    if (Number.isNaN(totalBoothsVal) || totalBoothsVal <= 0) {
      alert("Total Booths must be a number greater than 0.");
      return;
    }
    if (!boothPriceStr) {
      alert("Please fill in: Base Booth Price *");
      return;
    }
    if (Number.isNaN(boothPriceVal) || boothPriceVal <= 0) {
      alert("Base Booth Price must be a number greater than 0.");
      return;
    }

    const payload = {
      title,
      category,
      date,
      time,
      description,
      venue,
      address,
      city,
      capacity,
      totalBooths: totalBoothsVal,
      boothPrice: boothPriceVal,
      boothSizes,
      priceTiers,
      status,
      registrationOpen,
      imageUrl: currentImageUrl || null
    };

    try {
      if (editingEventId) {
        await api.updateEvent(editingEventId, payload);
        alert("Event updated successfully.");
      } else {
        await api.createEvent(payload);
        alert("Event created successfully.");
      }
      closeEventModal();
      await loadEvents();
    } catch (err) {
      console.error("Failed to save event:", err);
      alert(err.message || "Failed to save event.");
    }
  }

  async function handleDeleteEvent(event) {
    if (!event || !event._id) {
      alert("Cannot delete this event: missing ID.");
      return;
    }

    const label = event.title || event.name || event._id;
    const ok = confirm(`Are you sure you want to delete event "${label}"?`);
    if (!ok) return;

    try {
      await api.deleteEvent(event._id);
      alert("Event deleted.");
      await loadEvents();
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert(err.message || "Failed to delete event.");
    }
  }

  async function handleExportEvents() {
    try {
      const data = allEvents;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      a.download = `events-export-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("Events exported as JSON.");
    } catch (err) {
      console.error("Failed to export events:", err);
      alert("Failed to export events.");
    }
  }

  function handleImageFileChange() {
    const file = imageInput?.files?.[0];
    if (!file || !previewImage || !removeImageBtn) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      currentImageUrl = dataUrl;

      previewImage.src = dataUrl;
      previewImage.style.display = "block";
      removeImageBtn.style.display = "inline-flex";

      applyModalBackgroundFromCurrentImage();
    };
    reader.readAsDataURL(file);
  }

  function clearImagePreview() {
    currentImageUrl = null;
    applyModalBackgroundFromCurrentImage();

    if (previewImage) {
      previewImage.src = "";
      previewImage.style.display = "none";
    }
    if (removeImageBtn) removeImageBtn.style.display = "none";
    if (imageInput) imageInput.value = "";
  }

  // Event bindings

  if (mobileMenuToggle && sidebarEl) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebarEl.classList.toggle("open");
    });
  }

  if (logoutButton && ApiService.logout) {
    logoutButton.addEventListener("click", () => {
      if (confirm("Are you sure you want to logout?")) {
        ApiService.logout();
      }
    });
  }

  viewToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      setView(view);
    });
  });

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", applyFilters);
  }
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      if (searchEventsInput) searchEventsInput.value = "";
      if (statusFilterEl) statusFilterEl.value = "all";
      if (dateFilterEl) dateFilterEl.value = "all";
      applyFilters();
    });
  }
  if (searchEventsInput) {
    searchEventsInput.addEventListener("input", () => {
      applyFilters();
    });
  }
  if (statusFilterEl) {
    statusFilterEl.addEventListener("change", applyFilters);
  }
  if (dateFilterEl) {
    dateFilterEl.addEventListener("change", applyFilters);
  }

  if (addEventBtn) {
    addEventBtn.addEventListener("click", () => openEventModal("add"));
  }
  if (emptyAddBtn) {
    emptyAddBtn.addEventListener("click", () => openEventModal("add"));
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeEventModal);
  }
  if (cancelEventBtn) {
    cancelEventBtn.addEventListener("click", closeEventModal);
  }

  if (eventForm) {
    eventForm.addEventListener("submit", handleSaveEvent);
  }
  if (saveEventBtn) {
    saveEventBtn.addEventListener("click", (e) => {
      if (eventForm) eventForm.requestSubmit();
    });
  }

  if (eventModal) {
    eventModal.addEventListener("click", (e) => {
      if (e.target === eventModal) {
        closeEventModal();
      }
    });
  }
  if (transactionsModal) {
    transactionsModal.addEventListener("click", (e) => {
      if (e.target === transactionsModal) {
        closeTransactionsModal();
      }
    });
  }

  if (transactionsCloseBtn) {
    transactionsCloseBtn.addEventListener("click", closeTransactionsModal);
  }

  if (exportEventsBtn) {
    exportEventsBtn.addEventListener("click", handleExportEvents);
  }

  if (uploadImageBtn && imageInput) {
    uploadImageBtn.addEventListener("click", () => {
      imageInput.click();
    });
  }
  if (imageInput) {
    imageInput.addEventListener("change", handleImageFileChange);
  }
  if (removeImageBtn) {
    removeImageBtn.addEventListener("click", clearImagePreview);
  }

  if (exportTransactionsBtn) {
    exportTransactionsBtn.addEventListener("click", () => {
      const data = {
        title: transactionEventTitleEl?.textContent || "",
        totalRevenue: transactionTotalRevenueEl?.textContent || "",
        totalBookings: transactionTotalBookingsEl?.textContent || "",
        avgPrice: transactionAvgPriceEl?.textContent || ""
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert("Transaction summary exported as JSON (demo).");
    });
  }

  (async function init() {
    try {
      setView("grid");
      await loadEvents();
    } catch (err) {
      console.error("Failed to initialize event management page:", err);
      alert("Failed to initialize event management page.");
    }
  })();
});