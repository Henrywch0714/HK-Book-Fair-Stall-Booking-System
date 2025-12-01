let currentUser = null;
let currentUserId = null;
let booths = [];

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('backToBookingBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'exhibitor-dashboard.html';
    });
  }

  initBoothLayoutPage();
});

async function initBoothLayoutPage() {
  try {
    // 1. 获取当前用户信息
    const me = await apiService.getMyProfile();
    currentUser = me;
    currentUserId = me._id;

    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
      userNameDisplay.textContent =
        `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.email;
    }

    // 2. 取得当前要看的 event（可以从 URL ?event=xxx 或 sessionStorage）
    const eventName = getCurrentEventName();
    const eventTitle = document.getElementById('eventTitle');
    if (eventTitle) {
      eventTitle.textContent = eventName ? `Event: ${eventName}` : '';
    }

    // 3. 拉取 booth 列表（按 event 过滤）
    const res = await apiService.getBooths({ event: eventName });
    booths = res.booths || [];

    renderBoothGrid();
  } catch (err) {
    console.error('Error init booth layout:', err);
    alert('Failed to load booth layout. Please login again.');
  }
}

function getCurrentEventName() {
  // 策略顺序：
  // 1) URL ?event=xxx
  // 2) sessionStorage.currentEventName
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('event');
  if (fromQuery) return fromQuery;

  const fromSession = sessionStorage.getItem('currentEventName');
  if (fromSession) return fromSession;

  // 没有就空
  return '';
}

function renderBoothGrid() {
  const grid = document.getElementById('boothGrid');
  if (!grid) return;

  grid.innerHTML = '';

  booths.forEach(booth => {
    const div = document.createElement('div');
    div.classList.add('booth');

    // 状态 class
    const status = (booth.status || '').toLowerCase();
    if (status === 'available') {
      div.classList.add('available');
    } else if (status === 'booked') {
      div.classList.add('booked');
    } else {
      // 其他状态暂时也当作 booked 灰色
      div.classList.add('booked');
    }

    // 如果 exhibitor 等于当前用户，则为“我的 booth”
    const exhibitor = booth.exhibitor;

// 先默认 null
    let exhibitorId = null;

// 1) exhibitor 是 ObjectId 字符串时，例如 "663c..."
    if (typeof exhibitor === 'string') {
        exhibitorId = exhibitor;
}

// 2) exhibitor 是完整对象时，例如 { _id: "...", firstName: "...", ... }
    else if (exhibitor && typeof exhibitor === 'object' && exhibitor._id) {
        exhibitorId = exhibitor._id;
}

// 3) null / undefined 不处理，保持 exhibitorId = null

    const isMyBooth =
        exhibitorId && currentUserId && exhibitorId.toString() === currentUserId.toString();

    if (isMyBooth) {
      div.classList.add('my-booth');
      // 如果想让“我的 booth”不被覆盖成灰色，可保持 status class + my-booth
    }

    // 文本内容
    const number = booth.id || booth.boothNumber || 'N/A';
    const sizeLabel = booth.sizeLabel || booth.size || '';

    div.innerHTML = `
      <div class="booth-number">${number}</div>
      <div class="booth-size">${sizeLabel}</div>
    `;

    // 自己的 booth 点击可看详情
    if (isMyBooth) {
      div.style.cursor = 'pointer';
      div.addEventListener('click', () => {
        alert(
          `My Booth: ${number}\n` +
          `Size: ${sizeLabel || 'N/A'}\n` +
          `Location: ${booth.location || 'N/A'}\n` +
          `Price: $${booth.price || 0}`
        );
      });
    }

    grid.appendChild(div);
  });
}