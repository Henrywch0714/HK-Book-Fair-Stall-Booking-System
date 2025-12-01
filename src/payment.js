// ../src/payment.js

let bookingData = null;
let isProcessing = false;

let paymentForm = null;
let submitPaymentBtn = null;
let loadingOverlay = null;
let successModal = null;

let eventNameEl = null;
let eventDateEl = null;
let eventLocationEl = null;

let companyNameEl = null;
let contactPersonEl = null;
let contactEmailEl = null;
let contactPhoneEl = null;

let boothsContainerEl = null;

let subtotalEl = null;
let serviceFeeEl = null;
let taxEl = null;
let totalAmountEl = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 Payment page loaded');

  paymentForm = document.getElementById('paymentForm');
  submitPaymentBtn = document.getElementById('submitPaymentBtn');
  loadingOverlay = document.getElementById('loadingOverlay');
  successModal = document.getElementById('successModal');

  eventNameEl = document.getElementById('eventName');
  eventDateEl = document.getElementById('eventDate');
  eventLocationEl = document.getElementById('eventLocation');

  companyNameEl = document.getElementById('companyName');
  contactPersonEl = document.getElementById('contactPerson');
  contactEmailEl = document.getElementById('contactEmail');
  contactPhoneEl = document.getElementById('contactPhone');

  boothsContainerEl = document.getElementById('boothsContainer');

  subtotalEl = document.getElementById('subtotal');
  serviceFeeEl = document.getElementById('serviceFee');
  taxEl = document.getElementById('tax');
  totalAmountEl = document.getElementById('totalAmount');

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'booth-booking.html';
    });
  }

  initPaymentPage();
});

function initPaymentPage() {
  console.log('🔧 Initializing payment page...');

  loadBookingDataFromSession();

  if (!bookingData) {
    alert('No booking data found. Please go back to booth selection.');
    window.location.href = 'booth-booking.html';
    return;
  }

  fillOrderSummaryUI();
  setupFormEvents();

  console.log('✅ Payment page initialized');
}


function loadBookingDataFromSession() {
  console.log('📋 Loading booking data from sessionStorage.pendingBooking...');
  const stored = sessionStorage.getItem('pendingBooking');

  if (!stored) {
    console.warn('❌ No pendingBooking found in sessionStorage');
    bookingData = null;
    return;
  }

  try {
    bookingData = JSON.parse(stored);
    console.log('✅ Booking data loaded:', bookingData);

    if (!bookingData.totalPrice) {
      if (typeof bookingData.total === 'number') {
        bookingData.totalPrice = bookingData.total;
      } else if (Array.isArray(bookingData.booths)) {
        const sum = bookingData.booths.reduce(
          (s, b) => s + (b.price || b.totalPrice || 0),
          0
        );
        bookingData.totalPrice = sum;
      }
    }

    if (!Array.isArray(bookingData.booths) || bookingData.booths.length === 0) {
      console.error('❌ bookingData.booths is empty or invalid');
      bookingData = null;
    }

  } catch (e) {
    console.error('❌ Failed to parse pendingBooking:', e);
    bookingData = null;
  }
}


function fillOrderSummaryUI() {
  if (!bookingData) return;

  if (eventNameEl) {
    eventNameEl.textContent = bookingData.eventName || 'Event TBD';
  }
  if (eventDateEl) {
    eventDateEl.textContent = bookingData.eventDate || 'Date TBD';
  }
  if (eventLocationEl) {
    eventLocationEl.textContent = bookingData.venue || bookingData.location || 'Venue TBD';
  }

  if (companyNameEl) {
    companyNameEl.textContent = bookingData.companyName || 'N/A';
  }
  if (contactPersonEl) {
    contactPersonEl.textContent = bookingData.contactPerson || 'N/A';
  }
  if (contactEmailEl) {
    contactEmailEl.textContent = bookingData.contactEmail || 'N/A';
  }
  if (contactPhoneEl) {
    contactPhoneEl.textContent = bookingData.contactPhone || 'N/A';
  }

  if (boothsContainerEl) {
    boothsContainerEl.innerHTML = '';

    bookingData.booths.forEach(booth => {
      const boothId = booth.id || booth.boothNumber || 'N/A';
      const sizeLabel = booth.sizeLabel || booth.size || 'Standard';
      const location = booth.location || bookingData.location || 'TBD';
      const price = booth.price || booth.totalPrice || 0;

      const item = document.createElement('div');
      item.className = 'booth-item';
      item.innerHTML = `
        <div class="booth-info">
          <div class="booth-name">${boothId}</div>
          <div class="booth-meta">${sizeLabel} • ${location}</div>
        </div>
        <div class="booth-price">$${price.toLocaleString()}</div>
      `;
      boothsContainerEl.appendChild(item);
    });
  }

  const subtotal = bookingData.booths.reduce(
    (s, b) => s + (b.price || b.totalPrice || 0),
    0
  );
  const serviceFee = subtotal * 0.02;  
  const tax = (subtotal + serviceFee) * 0.08; 
  const total = subtotal + serviceFee + tax;

  bookingData.calculated = { subtotal, serviceFee, tax, total };

  if (subtotalEl) {
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  }
  if (serviceFeeEl) {
    serviceFeeEl.textContent = `$${serviceFee.toFixed(2)}`;
  }
  if (taxEl) {
    taxEl.textContent = `$${tax.toFixed(2)}`;
  }
  if (totalAmountEl) {
    totalAmountEl.textContent = `$${total.toFixed(2)}`;
  }

  if (submitPaymentBtn) {
    submitPaymentBtn.textContent = `Complete Payment ($${total.toFixed(2)})`;
  }
}


function setupFormEvents() {
  if (!paymentForm) return;

  const radios = paymentForm.querySelectorAll('input[name="paymentMethod"]');
  const creditCardFields = document.getElementById('creditCardFields');
  const paypalFields = document.getElementById('paypalFields');
  const bankTransferFields = document.getElementById('bankTransferFields');

  // 三类字段集合
  const creditInputs = creditCardFields
    ? creditCardFields.querySelectorAll('input')
    : [];
  const paypalInputs = paypalFields
    ? paypalFields.querySelectorAll('input')
    : [];
  const bankInputs = bankTransferFields
    ? bankTransferFields.querySelectorAll('input')
    : [];

  // 辅助函数：根据当前支付方式设置显示和 required
  function applyPaymentMethod(method) {
    // 显示/隐藏
    if (creditCardFields) {
      creditCardFields.style.display = method === 'credit-card' ? 'block' : 'none';
    }
    if (paypalFields) {
      paypalFields.style.display = method === 'paypal' ? 'block' : 'none';
    }
    if (bankTransferFields) {
      bankTransferFields.style.display = method === 'bank-transfer' ? 'block' : 'none';
    }

    // 先全部移除 required
    creditInputs.forEach(el => el.removeAttribute('required'));
    paypalInputs.forEach(el => el.removeAttribute('required'));
    bankInputs.forEach(el => el.removeAttribute('required'));

    // 然后只给当前方式的必要字段加上 required
    if (method === 'credit-card') {
      // 卡支付：卡片相关全部为必填
      creditInputs.forEach(el => el.setAttribute('required', 'required'));
    } else if (method === 'paypal') {
      // PayPal：只强制邮箱必填
      const paypalEmail = document.getElementById('paypalEmail');
      if (paypalEmail) paypalEmail.setAttribute('required', 'required');
    } else if (method === 'bank-transfer') {
      // 银行转账：目前不强制输入任何字段
      // 如果将来要必填某些字段，在这里加 required 即可
    }
  }

  // 绑定切换事件
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      applyPaymentMethod(radio.value);
    });
  });

  // 页面初始状态：根据默认选中的方式初始化
  const checked = Array.from(radios).find(r => r.checked);
  if (checked) {
    applyPaymentMethod(checked.value);
  }

  // 最后绑定提交事件
  paymentForm.addEventListener('submit', handleSubmitPayment);
}

async function handleSubmitPayment(e) {
  e.preventDefault();

  if (!bookingData || !bookingData.booths || bookingData.booths.length === 0) {
    alert('No booking data available.');
    return;
  }
  if (isProcessing) return;

  const termsCheckbox = document.getElementById('termsCheckbox');
  if (termsCheckbox && !termsCheckbox.checked) {
    alert('You must agree to the Terms and Conditions.');
    return;
  }

  isProcessing = true;
  showLoading(true);

  const total = bookingData.calculated?.total || bookingData.totalPrice || 0;

  try {
    console.log('💰 Processing payment, amount =', total);

    const paymentResult = await apiService.processPayment({
      amount: total,
      paymentMethod: 'card',
      cardDetails: {
        cardholderName: document.getElementById('cardName')?.value || '',
        last4: (document.getElementById('cardNumber')?.value || '').slice(-4)
      }
    });

    if (!paymentResult || !paymentResult.success) {
      throw new Error(paymentResult?.message || 'Payment failed on server.');
    }

    console.log('✅ Payment processed:', paymentResult);

    const bookingPromises = bookingData.booths.map((booth, index) => {
      const boothId = booth._id || booth.boothId;
      const price = booth.price || booth.totalPrice;

      if (!boothId || !price) {
        console.warn('⚠️ Missing boothId or price, skip booth:', booth);
        return null;
      }

      const payload = {
        boothId: boothId,
        companyName: bookingData.companyName,
        contactPerson: bookingData.contactPerson,
        contactEmail: bookingData.contactEmail,
        contactPhone: bookingData.contactPhone,
        specialRequests: bookingData.specialRequests || '',
        totalPrice: price,
        eventName: bookingData.eventName || booth.eventName || 'N/A',
        boothNumber: booth.id || booth.boothNumber || 'N/A',
        eventDate: bookingData.eventDate || booth.eventDate || 'Date TBD',
        venue: bookingData.venue || booth.venue || 'Venue TBD',
        location: booth.location || 'Location TBD'
      };

      console.log(`📤 Creating booking ${index + 1}/${bookingData.booths.length}`, payload);
      return apiService.createBooking(payload);
    });

    const bookingResults = (await Promise.all(bookingPromises)).filter(Boolean);
    console.log('✅ All bookings created:', bookingResults);

    sessionStorage.removeItem('pendingBooking');
    sessionStorage.setItem(
      'bookingConfirmation',
      JSON.stringify({
        bookings: bookingResults.map(r => r.booking || r),
        payment: paymentResult,
        totalAmount: total,
        bookingDate: new Date().toISOString()
      })
    );

    alert('Payment and booking successful!');
    window.location.href = 'booking-confirmation.html';

  } catch (err) {
  console.error('❌ Payment / booking error:', err);

  const msg = (err && err.message) ? err.message : '';

  if (msg.includes('already booked')) {
    alert(
      'One or more selected booths have just been booked by someone else.\n' +
      'Please go back to the booth selection page and choose available booths again.'
    );
    // 回到摊位选择页
    window.location.href = 'exhibitor-dashboard.html';
  } else {
    alert(msg || 'Payment failed, please try again.');
  }
} finally {
  isProcessing = false;
  showLoading(false);
}
}

function showLoading(show) {
  if (!loadingOverlay) return;
  loadingOverlay.style.display = show ? 'flex' : 'none';
}