// Global State
let allBooths = [];
let selectedBooths = new Set();
let currentEvent = '';
let currentHall = 'Convention Center - Hall A';

// DOM Elements
const eventFilter = document.getElementById('eventFilter');
const hallFilter = document.getElementById('hallFilter');
const boothsGroup = document.getElementById('boothsGroup');
const selectedBoothsList = document.getElementById('selectedBoothsList');
const bookingForm = document.getElementById('bookingForm');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Stats Elements
const totalBoothsEl = document.getElementById('totalBooths');
const availableBoothsEl = document.getElementById('availableBooths');
const selectedBoothsEl = document.getElementById('selectedBooths');
const selectedCountEl = document.getElementById('selectedCount');

// Price Elements
const priceSummary = document.getElementById('priceSummary');
const subtotalPriceEl = document.getElementById('subtotalPrice');
const taxPriceEl = document.getElementById('taxPrice');
const totalPriceEl = document.getElementById('totalPrice');

// Form Elements
const companyNameEl = document.getElementById('companyName');
const contactPersonEl = document.getElementById('contactPerson');
const contactEmailEl = document.getElementById('contactEmail');
const contactPhoneEl = document.getElementById('contactPhone');
const specialRequestsEl = document.getElementById('specialRequests');

// Initialize
async function init() {
    console.log('🚀 Initializing Booth Booking System...');
    
    try {
        await loadEvents();
        await loadBooths();
        renderSVGBooths();
        setupEventListeners();
        autoFillUserInfo();
        
        console.log('✅ Initialization complete');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to initialize booking system: ' + error.message);
    }
}

// Load Events
async function loadEvents() {
    try {
        console.log('📥 Loading events...');

        const response = await apiService.getBooths();
        const booths = response.booths || response || [];
        
        console.log('✅ Received booths data:', booths);

        const events = [...new Set(booths.map(b => b.event))].filter(Boolean);
        
        eventFilter.innerHTML = '';
        
        if (events.length === 0) {
            eventFilter.innerHTML = '<option value="">No events available</option>';
            console.warn('⚠️ No events found');
            return;
        }
        
        events.forEach((event, index) => {
            const option = document.createElement('option');
            option.value = event;
            option.textContent = event;
            if (index === 0) {
                option.selected = true;
                currentEvent = event;
            }
            eventFilter.appendChild(option);
        });
        
        console.log('✅ Loaded', events.length, 'events');
    } catch (error) {
        console.error('❌ Failed to load events:', error);
        eventFilter.innerHTML = '<option value="">Error loading events</option>';
    }
}


async function loadBooths() {
    try {
        console.log('📥 Loading booths for:', currentEvent, currentHall);
        
        const filters = {};
        if (currentEvent) filters.event = currentEvent;
        if (currentHall) filters.location = currentHall;

        const response = await apiService.getBooths(filters);

        if (response.booths && Array.isArray(response.booths)) {
            allBooths = response.booths;
        } else if (Array.isArray(response)) {
            allBooths = response;
        } else {
            console.error('❌ Unexpected data format:', response);
            allBooths = [];
        }
        
        console.log('✅ Loaded', allBooths.length, 'booths');
        console.log('Booth data:', allBooths);
        
        updateStats();
    } catch (error) {
        console.error('❌ Failed to load booths:', error);
        allBooths = [];
        alert('Failed to load booths: ' + error.message);
    }
}

// Render SVG Booths
function renderSVGBooths() {
    console.log('🎨 Rendering SVG booths...');
    
    boothsGroup.innerHTML = '';
    
    if (!Array.isArray(allBooths) || allBooths.length === 0) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '450');
        text.setAttribute('y', '300');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '20');
        text.setAttribute('fill', '#999');
        text.textContent = 'No booths available for this event/hall';
        boothsGroup.appendChild(text);
        return;
    }
    
    const boothWidth = 120;
    const boothHeight = 80;
    const gap = 20;
    const startX = 50;
    const startY = 50;
    const boothsPerRow = 6;
    
    allBooths.forEach((booth, index) => {
        const row = Math.floor(index / boothsPerRow);
        const col = index % boothsPerRow;
        
        const x = startX + col * (boothWidth + gap);
        const y = startY + row * (boothHeight + gap);
        
        const isSelected = selectedBooths.has(booth._id);
        
        // Create booth group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `booth-svg ${booth.status.toLowerCase()} ${isSelected ? 'selected' : ''}`);
        g.setAttribute('data-booth-id', booth._id);
        
        // Booth rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', boothWidth);
        rect.setAttribute('height', boothHeight);
        rect.setAttribute('rx', '8');
        
        g.appendChild(rect);
        
        // Booth ID
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'booth-text');
        text.setAttribute('x', x + boothWidth / 2);
        text.setAttribute('y', y + boothHeight / 2 - 10);
        text.setAttribute('text-anchor', 'middle');
        text.textContent = booth.id;
        g.appendChild(text);
        
        // Price
        const priceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        priceText.setAttribute('class', 'booth-price');
        priceText.setAttribute('x', x + boothWidth / 2);
        priceText.setAttribute('y', y + boothHeight / 2 + 10);
        priceText.setAttribute('text-anchor', 'middle');
        priceText.textContent = `$${booth.price.toLocaleString()}`;
        g.appendChild(priceText);
        
        // Status
        const statusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        statusText.setAttribute('class', 'booth-price');
        statusText.setAttribute('x', x + boothWidth / 2);
        statusText.setAttribute('y', y + boothHeight / 2 + 25);
        statusText.setAttribute('text-anchor', 'middle');
        statusText.setAttribute('font-size', '10');
        statusText.textContent = booth.status;
        g.appendChild(statusText);
        
        // Click handler
        if (booth.status === 'available') {
            g.addEventListener('click', () => toggleBoothSelection(booth._id));
        }
        
        boothsGroup.appendChild(g);
    });
    
    console.log('✅ Rendered', allBooths.length, 'booths');
}

// Toggle Booth Selection
function toggleBoothSelection(boothId) {
    console.log('🖱️ Toggle booth:', boothId);
    
    if (selectedBooths.has(boothId)) {
        selectedBooths.delete(boothId);
        console.log('❌ Deselected:', boothId);
    } else {
        selectedBooths.add(boothId);
        console.log('✅ Selected:', boothId);
    }
    
    console.log('Current selection:', Array.from(selectedBooths));
    
    renderSVGBooths();
    updateSelectedBoothsList();
    updateStats();
    updateSubmitButton();
}

// Update Selected Booths List
function updateSelectedBoothsList() {
    if (!Array.isArray(allBooths)) {
        console.error('❌ allBooths is not an array');
        return;
    }
    
    const selectedBoothsArray = Array.from(selectedBooths)
        .map(id => allBooths.find(b => b._id === id))
        .filter(Boolean);
    
    if (selectedBoothsArray.length === 0) {
        selectedBoothsList.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 3em;">📍</span>
                <p>No booths selected yet</p>
                <p style="font-size: 0.9em; margin-top: 5px;">Click on available booths to select</p>
            </div>
        `;
        priceSummary.style.display = 'none';
        return;
    }
    
    selectedBoothsList.innerHTML = '';
    let subtotal = 0;
    
    selectedBoothsArray.forEach(booth => {
        subtotal += booth.price;
        
        const item = document.createElement('div');
        item.className = 'selected-booth-item';
        item.innerHTML = `
            <div class="booth-item-info">
                <h5>${booth.id}</h5>
                <p>${booth.location || 'N/A'}</p>
                <p class="booth-item-price">$${booth.price.toLocaleString()}</p>
            </div>
            <button type="button" class="remove-booth-btn" data-booth-id="${booth._id}">✕</button>
        `;
        
        const removeBtn = item.querySelector('.remove-booth-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBoothSelection(booth._id);
        });
        
        selectedBoothsList.appendChild(item);
    });
    
    // Update prices
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    subtotalPriceEl.textContent = `$${subtotal.toLocaleString()}`;
    taxPriceEl.textContent = `$${tax.toLocaleString()}`;
    totalPriceEl.textContent = `$${total.toLocaleString()}`;
    
    priceSummary.style.display = 'block';
    selectedCountEl.textContent = selectedBoothsArray.length;
}

// Update Statistics
function updateStats() {
    if (!Array.isArray(allBooths)) {
        console.error('❌ allBooths is not an array:', allBooths);
        totalBoothsEl.textContent = '0';
        availableBoothsEl.textContent = '0';
        selectedBoothsEl.textContent = '0';
        return;
    }
    
    const total = allBooths.length;
    const available = allBooths.filter(b => b.status === 'Available').length;
    const selected = selectedBooths.size;
    
    totalBoothsEl.textContent = total;
    availableBoothsEl.textContent = available - selected;
    selectedBoothsEl.textContent = selected;
}

// Update Submit Button
function updateSubmitButton() {
    submitBtn.disabled = selectedBooths.size === 0;
}

// Auto-fill User Info
function autoFillUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    if (userData.companyName) companyNameEl.value = userData.companyName;
    if (userData.firstName && userData.lastName) {
        contactPersonEl.value = `${userData.firstName} ${userData.lastName}`;
    }
    if (userData.email) contactEmailEl.value = userData.email;
    if (userData.phone) contactPhoneEl.value = userData.phone;
}

// Setup Event Listeners
function setupEventListeners() {
    // Event filter
    eventFilter.addEventListener('change', async (e) => {
        currentEvent = e.target.value;
        selectedBooths.clear();
        await loadBooths();
        renderSVGBooths();
        updateSelectedBoothsList();
    });
    
    // Hall filter
    hallFilter.addEventListener('change', async (e) => {
        currentHall = e.target.value;
        selectedBooths.clear();
        await loadBooths();
        renderSVGBooths();
        updateSelectedBoothsList();
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        if (selectedBooths.size > 0) {
            if (confirm('Clear all selections?')) {
                selectedBooths.clear();
                renderSVGBooths();
                updateSelectedBoothsList();
                updateStats();
                updateSubmitButton();
            }
        }
    });
    
    // Form submission
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (selectedBooths.size === 0) {
            alert('Please select at least one booth');
            return;
        }
        
        console.log('📤 Submitting booking...');
        
        try {
            const selectedBoothsArray = Array.from(selectedBooths)
                .map(id => allBooths.find(b => b._id === id))
                .filter(Boolean);
            
            const bookingPromises = selectedBoothsArray.map(booth => {
                return apiService.createBooking({
                    boothId: booth._id,
                    companyName: companyNameEl.value,
                    contactPerson: contactPersonEl.value,
                    contactEmail: contactEmailEl.value,
                    contactPhone: contactPhoneEl.value,
                    specialRequests: specialRequestsEl.value,
                    totalPrice: booth.price,
                    eventName: booth.event,
                    boothNumber: booth.id,
                    eventDate: booth.date,
                    location: booth.location
                });
            });
            
            const results = await Promise.all(bookingPromises);
            
            console.log('✅ Booking successful:', results);
            
            // Store for payment
            const subtotal = selectedBoothsArray.reduce((sum, b) => sum + b.price, 0);
            const tax = subtotal * 0.1;
            const total = subtotal + tax;
            
            sessionStorage.setItem('pendingBooking', JSON.stringify({
                booths: selectedBoothsArray,
                companyName: companyNameEl.value,
                contactPerson: contactPersonEl.value,
                contactEmail: contactEmailEl.value,
                contactPhone: contactPhoneEl.value,
                specialRequests: specialRequestsEl.value,
                subtotal: subtotal,
                tax: tax,
                total: total,
                eventName: currentEvent
            }));
            
            alert(`Successfully booked ${results.length} booth(s)! Redirecting to payment...`);
            
            window.location.href = '../webContent/payment.html';
            
        } catch (error) {
            console.error('❌ Booking failed:', error);
            alert('Booking failed: ' + error.message);
        }
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);