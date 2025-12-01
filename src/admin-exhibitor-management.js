document.addEventListener("DOMContentLoaded", function () {
    const industryFilterEl = document.getElementById("industryFilter");
    const statusFilterEl = document.getElementById("statusFilter");
    const sortFilterEl = document.getElementById("sortFilter");
    const applyFiltersBtn = document.getElementById("applyFiltersBtn");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    const listEl = document.getElementById("exhibitorList");
    const listCountLabelEl = document.getElementById("listCountLabel");
    const emptyStateEl = document.getElementById("emptyState");
    const detailsPanelEl = document.getElementById("detailsPanel");
    const detailsCloseBtn = document.getElementById("detailsCloseBtn");
    const closeDetailsBtn = document.getElementById("closeDetailsBtn");
    const editDetailsBtn = document.getElementById("editDetailsBtn");
    const suspendAccountBtn = document.getElementById("suspendAccountBtn");
    const detailFullNameEl = document.getElementById("detailFullName");
    const detailEmailEl = document.getElementById("detailEmail");
    const detailPhoneEl = document.getElementById("detailPhone");
    const detailRegDateEl = document.getElementById("detailRegDate");
    const detailCompanyNameEl = document.getElementById("detailCompanyName");
    const detailIndustryEl = document.getElementById("detailIndustry");
    const detailCompanySizeEl = document.getElementById("detailCompanySize");
    const detailWebsiteEl = document.getElementById("detailWebsite");
    const detailTotalBookingsEl = document.getElementById("detailTotalBookings");
    const detailActiveBookingsEl = document.getElementById("detailActiveBookings");
    const detailTotalSpentEl = document.getElementById("detailTotalSpent");
    const detailRecentBookingsEl = document.getElementById("detailRecentBookings");
    const detailTimelineEl = document.getElementById("detailTimeline");
    const logoutButton = document.getElementById("logoutButton");
    const exportBtn = document.getElementById("exportBtn");
    

    const totalExhibitorsEl = document.getElementById("totalExhibitors");
    const activeExhibitorsEl = document.getElementById("activeExhibitors");
    const newThisMonthEl = document.getElementById("newThisMonth");
    const totalRevenueEl = document.getElementById("totalRevenue");

    let selectedExhibitorId = null;
    let allExhibitors = [];


    async function init() {
        try {
            await loadStats();
            await applyFilters();
        } catch (error) {
            console.error(':', error);
            alert('');
        }
    }


    async function loadStats() {
        try {
            const stats = await apiService.getExhibitorStats();
            totalExhibitorsEl.textContent = stats.totalExhibitors;
            activeExhibitorsEl.textContent = stats.activeExhibitors;
            newThisMonthEl.textContent = stats.newThisMonth;
            totalRevenueEl.textContent = `$${stats.totalRevenue}K`;
        } catch (error) {
            console.error(':', error);
        }
    }


    async function applyFilters() {
        const industryVal = industryFilterEl.value;
        const statusVal = statusFilterEl.value;
        const sortVal = sortFilterEl.value;

        try {
            const filters = {};
            if (industryVal !== "all") filters.industry = industryVal;
            if (statusVal !== "all") filters.status = statusVal;
            if (sortVal !== "nameAsc") filters.sort = sortVal;

            const result = await apiService.getExhibitors(filters);
            allExhibitors = result.exhibitors || [];
            renderList(allExhibitors);
        } catch (error) {
            console.error(':', error);
            alert('');
        }
    }


    function resetFilters() {
        industryFilterEl.value = "all";
        statusFilterEl.value = "all";
        sortFilterEl.value = "nameAsc";
        applyFilters();
    }


    function renderList(data) {
        listEl.innerHTML = "";
        selectedExhibitorId = null;
        clearDetails();

        if (data.length === 0) {
            emptyStateEl.hidden = false;
            listCountLabelEl.textContent = "0 exhibitors";
            return;
        }

        emptyStateEl.hidden = true;
        listCountLabelEl.textContent = data.length === 1 ? "1 exhibitor" : `${data.length} exhibitors`;

        data.forEach(exhibitor => {
            const item = document.createElement("article");
            item.className = "list-item";
            item.dataset.id = String(exhibitor._id);

            const primary = document.createElement("div");
            primary.className = "list-primary";
            const name = document.createElement("div");
            name.className = "list-name";
            name.textContent = exhibitor.fullName;
            const email = document.createElement("div");
            email.className = "list-email";
            email.textContent = exhibitor.email;
            primary.appendChild(name);
            primary.appendChild(email);

            const companyCol = document.createElement("div");
            const company = document.createElement("div");
            company.className = "list-company";
            company.textContent = exhibitor.companyName;
            const industry = document.createElement("div");
            industry.className = "list-industry";
            industry.textContent = exhibitor.industry;
            companyCol.appendChild(company);
            companyCol.appendChild(industry);

            const statsCol = document.createElement("div");
            statsCol.className = "list-stats";
            const bookings = document.createElement("div");
            bookings.className = "list-bookings";
            bookings.textContent = `${exhibitor.totalBookings || 0} bookings`;
            const revenue = document.createElement("div");
            revenue.className = "list-revenue";
            revenue.textContent = formatCurrency(exhibitor.totalSpent || 0);

            const statusPill = document.createElement("span");
            statusPill.className = "list-status-pill " + 
                (exhibitor.status === "active" ? "list-status-active" : "list-status-inactive");
            statusPill.textContent = exhibitor.status === "active" ? "Active" : "Inactive";

            statsCol.appendChild(bookings);
            statsCol.appendChild(revenue);
            statsCol.appendChild(statusPill);

            item.appendChild(primary);
            item.appendChild(companyCol);
            item.appendChild(statsCol);

            item.addEventListener("click", function () {
                selectExhibitor(exhibitor._id);
            });

            listEl.appendChild(item);
        });
    }


    async function selectExhibitor(id) {
        selectedExhibitorId = id;
        
        try {
            const exhibitor = await apiService.getExhibitorDetails(id);
            if (!exhibitor) return;

            listEl.querySelectorAll(".list-item").forEach(el => {
                el.classList.toggle("selected", el.dataset.id === String(id));
            });

            populateDetails(exhibitor);
        } catch (error) {
            console.error(':', error);
            alert('');
        }
    }

    function populateDetails(exhibitor) {
        detailFullNameEl.textContent = exhibitor.fullName;
        detailEmailEl.textContent = exhibitor.email;
        detailPhoneEl.textContent = exhibitor.phone || "-";
        detailRegDateEl.textContent = formatDate(exhibitor.registrationDate);

        detailCompanyNameEl.textContent = exhibitor.companyName;
        detailIndustryEl.textContent = exhibitor.industry;
        detailCompanySizeEl.textContent = exhibitor.companySize || "-";
        detailWebsiteEl.textContent = exhibitor.website || "-";

        detailTotalBookingsEl.textContent = String(exhibitor.totalBookings || 0);
        detailActiveBookingsEl.textContent = String(exhibitor.activeBookings || 0);
        detailTotalSpentEl.textContent = formatCurrency(exhibitor.totalSpent || 0);

        detailRecentBookingsEl.innerHTML = "";
        if (exhibitor.recentBookings && exhibitor.recentBookings.length > 0) {
            exhibitor.recentBookings.forEach(b => {
                const li = document.createElement("li");
                li.className = "detail-list-item";

                const main = document.createElement("div");
                main.className = "detail-list-item-main";

                const title = document.createElement("div");
                title.className = "detail-list-title";
                title.textContent = `${b.eventName} • ${b.boothId}`;

                const amount = document.createElement("div");
                amount.className = "detail-list-amount";
                amount.textContent = formatCurrency(b.amount);

                main.appendChild(title);
                main.appendChild(amount);

                const sub = document.createElement("div");
                sub.className = "detail-list-sub";
                sub.textContent = b.dateRange;

                li.appendChild(main);
                li.appendChild(sub);
                detailRecentBookingsEl.appendChild(li);
            });
        } else {
            const li = document.createElement("li");
            li.className = "detail-list-item";
            li.textContent = "No recent bookings.";
            detailRecentBookingsEl.appendChild(li);
        }


        detailTimelineEl.innerHTML = "";
        if (exhibitor.timeline && exhibitor.timeline.length > 0) {
            exhibitor.timeline.forEach(item => {
                const li = document.createElement("li");
                li.className = "timeline-item";

                const dot = document.createElement("span");
                dot.className = "timeline-dot";

                const text = document.createElement("div");
                text.className = "timeline-text";
                text.textContent = item.text;

                const meta = document.createElement("div");
                meta.className = "timeline-meta";
                meta.textContent = `${item.date} • ${item.meta}`;

                li.appendChild(dot);
                li.appendChild(text);
                li.appendChild(meta);
                detailTimelineEl.appendChild(li);
            });
        } else {
            const li = document.createElement("li");
            li.className = "timeline-item";
            const text = document.createElement("div");
            text.className = "timeline-text";
            text.textContent = "No recent activity.";
            li.appendChild(text);
            detailTimelineEl.appendChild(li);
        }
    }


    function formatDate(dateStr) {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatCurrency(amount) {
        return "$" + amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    function clearDetails() {
        detailFullNameEl.textContent = "-";
        detailEmailEl.textContent = "-";
        detailPhoneEl.textContent = "-";
        detailRegDateEl.textContent = "-";
        detailCompanyNameEl.textContent = "-";
        detailIndustryEl.textContent = "-";
        detailCompanySizeEl.textContent = "-";
        detailWebsiteEl.textContent = "-";
        detailTotalBookingsEl.textContent = "0";
        detailActiveBookingsEl.textContent = "0";
        detailTotalSpentEl.textContent = "$0";
        detailRecentBookingsEl.innerHTML = "";
        detailTimelineEl.innerHTML = "";
    }

    function closeDetails() {
        selectedExhibitorId = null;
        listEl.querySelectorAll(".list-item").forEach(el => {
            el.classList.remove("selected");
        });
        clearDetails();
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener("click", applyFilters);
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", resetFilters);
    }

    industryFilterEl.addEventListener("change", applyFilters);
    statusFilterEl.addEventListener("change", applyFilters);
    sortFilterEl.addEventListener("change", applyFilters);

    if (detailsCloseBtn) {
        detailsCloseBtn.addEventListener("click", closeDetails);
    }
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener("click", closeDetails);
    }

    if (editDetailsBtn) {
        editDetailsBtn.addEventListener("click", function () {
            if (!selectedExhibitorId) {
                alert("Please select an exhibitor to edit.");
                return;
            }

            window.location.href = `../webContent/edit-exhibitor.html?id=${selectedExhibitorId}`;
        });
    }

    if (suspendAccountBtn) {
        suspendAccountBtn.addEventListener("click", async function () {
            if (!selectedExhibitorId) {
                alert("Please select an exhibitor to suspend.");
                return;
            }

            const confirmed = confirm(
                `Suspend account for this exhibitor?`
            );
            if (!confirmed) return;

            try {
                await apiService.updateExhibitorStatus(selectedExhibitorId, "inactive");
                await applyFilters(); 
                await loadStats(); 
                alert("Exhibitor account has been suspended.");
            } catch (error) {
                console.error(':', error);
                alert('');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            if (confirm("Are you sure you want to logout?")) {

                localStorage.removeItem('authToken');
                window.location.href = "../webContent/Login.html";
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", async function () {
            try {
                const result = await apiService.exportExhibitors();

                const blob = new Blob([JSON.stringify(result, null, 2)], { 
                    type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'exhibitors-export.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                alert('Export completed successfully!');
            } catch (error) {
                console.error('导出失败:', error);
                alert('Export failed. Please try again.');
            }
        });
    }

    init();
});