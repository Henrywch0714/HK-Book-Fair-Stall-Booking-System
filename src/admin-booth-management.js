// ================= Admin Booth API 封装 =================

// 从 localStorage 读取登录时保存的 JWT
function authHeaders() {
  const token = localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

const adminBoothApi = {
  async getBooths(filters = {}) {
    const params = new URLSearchParams();
    if (filters.event && filters.event !== 'all') params.append('event', filters.event);
    if (filters.hall && filters.hall !== 'all') params.append('hall', filters.hall);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);

    const res = await fetch(`/api/admin/booths?${params.toString()}`, {
      headers: {
        ...authHeaders()
      },
      credentials: 'include'
    });

    if (!res.ok) throw new Error('Failed to fetch booths');
    return res.json();
  },

  async createBooth(data) {
    const res = await fetch('/api/admin/booths', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create booth');
    return res.json();
  },

  async updateBooth(mongoId, data) {
    const res = await fetch(`/api/admin/booths/${mongoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update booth');
    return res.json();
  },

  async deleteBooth(mongoId) {
    const res = await fetch(`/api/admin/booths/${mongoId}`, {
      method: 'DELETE',
      headers: {
        ...authHeaders()
      },
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to delete booth');
    return res.json();
  }
};

// ================= 主表格 / Modal 管理模块 =================

const AdminBoothManagement = (() => {
  // 状态
  let allBooths = [];         // 从服务端加载的所有 booths
  let filteredBooths = [];    // 当前过滤结果
  let editingBooth = null;    // 当前正在编辑的 booth（对象）

  // DOM 元素
  const els = {};

  function cacheDom() {
    els.totalBooths = document.getElementById('totalBooths');
    els.bookedBooths = document.getElementById('bookedBooths');
    els.availableBooths = document.getElementById('availableBooths');
    els.maintenanceBooths = document.getElementById('maintenanceBooths');

    els.eventFilter = document.getElementById('eventFilter');
    els.hallFilter = document.getElementById('hallFilter');
    els.statusFilter = document.getElementById('statusFilter');
    els.applyFiltersBtn = document.getElementById('applyFiltersBtn');
    els.resetFiltersBtn = document.getElementById('resetFiltersBtn');

    els.tableBody = document.getElementById('boothTableBody');
    els.tableCountLabel = document.getElementById('tableCountLabel');
    els.emptyState = document.getElementById('emptyState');
    els.emptyStateAddBooth = document.getElementById('emptyStateAddBooth');

    els.openAddBoothBtn = document.getElementById('openAddBoothBtn');

    // Modal & Form
    els.modalBackdrop = document.getElementById('boothModalBackdrop');
    els.modalTitle = document.getElementById('boothModalTitle');
    els.modalCloseBtn = document.getElementById('modalCloseBtn');

    els.boothForm = document.getElementById('boothForm');
    els.boothId = document.getElementById('boothId');
    els.boothEvent = document.getElementById('boothEvent');
    els.boothHall = document.getElementById('boothHall');
    els.boothSize = document.getElementById('boothSize');
    els.boothPrice = document.getElementById('boothPrice');
    els.boothStatus = document.getElementById('boothStatus');
    els.boothDescription = document.getElementById('boothDescription');

    els.featureCheckboxes = Array.from(
      document.querySelectorAll('#boothForm input[name="features"]')
    );

    els.cancelBoothBtn = document.getElementById('cancelBoothBtn');
    els.saveBoothBtn = document.getElementById('saveBoothBtn');
  }

  function bindEvents() {
    if (els.applyFiltersBtn) {
      els.applyFiltersBtn.addEventListener('click', applyFilters);
    }

    if (els.resetFiltersBtn) {
      els.resetFiltersBtn.addEventListener('click', resetFilters);
    }

    if (els.openAddBoothBtn) {
      els.openAddBoothBtn.addEventListener('click', () => openModalForCreate());
    }

    if (els.emptyStateAddBooth) {
      els.emptyStateAddBooth.addEventListener('click', () => openModalForCreate());
    }

    if (els.modalCloseBtn) {
      els.modalCloseBtn.addEventListener('click', closeModal);
    }

    if (els.cancelBoothBtn) {
      els.cancelBoothBtn.addEventListener('click', closeModal);
    }

    if (els.saveBoothBtn) {
      els.saveBoothBtn.addEventListener('click', onSaveBooth);
    }

    // 点击遮罩关闭
    if (els.modalBackdrop) {
      els.modalBackdrop.addEventListener('click', e => {
        if (e.target === els.modalBackdrop) {
          closeModal();
        }
      });
    }
  }

  async function init() {
    cacheDom();
    if (!els.tableBody) return; // 不在这个页面就不初始化

    bindEvents();
    await loadBooths(); // 首次加载所有
  }

  // ================= 数据加载 & 过滤 =================

  async function loadBooths() {
    try {
      const { booths } = await adminBoothApi.getBooths({});
      allBooths = Array.isArray(booths) ? booths : [];
      applyFilters(); // 初始过滤（使用当前下拉值）

      // 通知 SVG 模块刷新
      BoothSvgManager.setData(allBooths);
    } catch (err) {
      console.error('Error loading booths:', err);
      allBooths = [];
      filteredBooths = [];
      renderTable();
      updateStats();
      BoothSvgManager.setData([]);
    }
  }

  function applyFilters() {
    const eventVal = els.eventFilter?.value || 'all';
    const hallVal = els.hallFilter?.value || 'all';
    const statusVal = els.statusFilter?.value || 'all';

    filteredBooths = allBooths.filter(b => {
      let ok = true;

      if (eventVal !== 'all') {
        ok = ok && (b.event === eventVal);
      }
      if (hallVal !== 'all') {
        ok = ok && (b.location === hallVal); // Hall 存在 location 字段
      }
      if (statusVal !== 'all') {
        ok = ok && (b.statusLabel === statusVal); // Available/Booked/Maintenance
      }
      return ok;
    });

    renderTable();
    updateStats();

    // SVG 也可以跟着过滤，如果你想的话，这里可以改成 BoothSvgManager.setData(filteredBooths)
    BoothSvgManager.setData(allBooths);
  }

  function resetFilters() {
    if (els.eventFilter) els.eventFilter.value = 'all';
    if (els.hallFilter) els.hallFilter.value = 'all';
    if (els.statusFilter) els.statusFilter.value = 'all';
    applyFilters();
  }

  // ================= 统计卡片 =================

  function updateStats() {
    const list = filteredBooths.length ? filteredBooths : allBooths;
    const total = list.length;

    let booked = 0;
    let available = 0;
    let maintenance = 0;

    list.forEach(b => {
      const statusLabel = (b.statusLabel || '').toLowerCase();
      if (statusLabel === 'booked') booked++;
      else if (statusLabel === 'maintenance') maintenance++;
      else available++;
    });

    if (els.totalBooths) els.totalBooths.textContent = String(total);
    if (els.bookedBooths) els.bookedBooths.textContent = String(booked);
    if (els.availableBooths) els.availableBooths.textContent = String(available);
    if (els.maintenanceBooths) els.maintenanceBooths.textContent = String(maintenance);
  }

  // ================= 表格渲染 =================

  function renderTable() {
    if (!els.tableBody) return;
    const rows = filteredBooths;

    els.tableBody.innerHTML = '';

    if (!rows.length) {
      if (els.emptyState) els.emptyState.hidden = false;
      if (els.tableCountLabel) els.tableCountLabel.textContent = '0 booths';
      return;
    }

    if (els.emptyState) els.emptyState.hidden = true;
    if (els.tableCountLabel) {
      els.tableCountLabel.textContent = `${rows.length} booth${rows.length > 1 ? 's' : ''}`;
    }

    rows.forEach(booth => {
      const tr = document.createElement('tr');

      const price = booth.price != null ? Number(booth.price).toFixed(0) : '0';

      tr.innerHTML = `
        <td>${escapeHtml(booth.id || '')}</td>
        <td>${escapeHtml(booth.event || '')}</td>
        <td>${escapeHtml(booth.location || '')}</td>
        <td>${escapeHtml(booth.size || '')}</td>
        <td>$${price}</td>
        <td>
          <span class="badge badge-${(booth.statusLabel || 'Available').toLowerCase()}">
            ${escapeHtml(booth.statusLabel || 'Available')}
          </span>
        </td>
        <td>${booth.exhibitor ? 'Assigned' : '-'}</td>
        <td>
          <button type="button" class="table-action-btn table-action-edit">Edit</button>
          <button type="button" class="table-action-btn table-action-delete">Delete</button>
        </td>
      `;

      // Edit
      tr.querySelector('.table-action-edit').addEventListener('click', () => {
        openModalForEdit(booth);
      });

      // Delete
      tr.querySelector('.table-action-delete').addEventListener('click', () => {
        onDeleteBooth(booth);
      });

      els.tableBody.appendChild(tr);
    });
  }

  // ================= Modal 控制 =================

  function openModalForCreate() {
    editingBooth = null;
    if (!els.modalBackdrop) return;

    els.modalTitle && (els.modalTitle.textContent = 'Add New Booth');
    els.boothForm && els.boothForm.reset();

    // 默认状态
    if (els.boothStatus) els.boothStatus.value = 'Available';

    // 特征复位
    els.featureCheckboxes.forEach(cb => {
      cb.checked = false;
    });

    // 如果当前 filter 选中了 Event/Hall，可以自动带入
    if (els.eventFilter && els.boothEvent && els.eventFilter.value !== 'all') {
      els.boothEvent.value = els.eventFilter.value;
    }
    if (els.hallFilter && els.boothHall && els.hallFilter.value !== 'all') {
      els.boothHall.value = els.hallFilter.value;
    }

    els.modalBackdrop.style.display = 'flex';
  }

  function openModalForEdit(booth) {
    editingBooth = booth;
    if (!els.modalBackdrop) return;

    els.modalTitle && (els.modalTitle.textContent = `Edit Booth - ${booth.id || ''}`);

    if (els.boothId) els.boothId.value = booth.id || '';
    if (els.boothEvent) els.boothEvent.value = booth.event || '';
    if (els.boothHall) els.boothHall.value = booth.location || '';
    if (els.boothSize) els.boothSize.value = booth.sizeLabel || booth.size || '';
    if (els.boothPrice) els.boothPrice.value = booth.price != null ? booth.price : '';
    if (els.boothStatus) els.boothStatus.value = booth.statusLabel || 'Available';
    if (els.boothDescription) els.boothDescription.value = booth.description || '';

    // 特征
    const features = Array.isArray(booth.features) ? booth.features : [];
    els.featureCheckboxes.forEach(cb => {
      cb.checked = features.includes(cb.value);
    });

    els.modalBackdrop.style.display = 'flex';
  }

  function closeModal() {
    if (els.modalBackdrop) {
      els.modalBackdrop.style.display = 'none';
    }
    editingBooth = null;
  }

  // ================= 保存 & 删除 =================

  function collectFormData() {
    const id = (els.boothId?.value || '').trim();
    const eventName = (els.boothEvent?.value || '').trim();
    const hall = (els.boothHall?.value || '').trim();
    const sizeLabel = (els.boothSize?.value || '').trim();
    const priceVal = els.boothPrice?.value || '';
    const statusLabel = els.boothStatus?.value || 'Available';
    const description = (els.boothDescription?.value || '').trim();

    const features = els.featureCheckboxes
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    // 尝试从 sizeLabel 中拆出 size（small/medium/large）
    let size = '';
    if (/small/i.test(sizeLabel)) size = 'small';
    else if (/medium/i.test(sizeLabel)) size = 'medium';
    else if (/large/i.test(sizeLabel)) size = 'large';

    let status = 'available';
    if (/booked/i.test(statusLabel)) status = 'booked';
    else if (/maintenance/i.test(statusLabel)) status = 'maintenance';

    const statusClass =
      status === 'booked'
        ? 'status-booked'
        : status === 'maintenance'
        ? 'status-maintenance'
        : 'status-available';

    return {
      id,
      event: eventName,
      eventId: null, // 以后可以写真正的 eventId
      date: '',
      location: hall,
      size,
      sizeLabel,
      price: Number(priceVal) || 0,
      note: '',
      status,
      statusLabel,
      statusClass,
      features,
      description
    };
  }

  async function onSaveBooth() {
    const payload = collectFormData();

    if (!payload.id) {
      alert('Booth ID is required');
      return;
    }
    if (!payload.event) {
      alert('Please select Event');
      return;
    }
    if (!payload.location) {
      alert('Please select Hall');
      return;
    }

    try {
      if (editingBooth && editingBooth._id) {
        // 更新
        const { booth } = await adminBoothApi.updateBooth(editingBooth._id, payload);
        // 更新本地
        const idx = allBooths.findIndex(b => b._id === editingBooth._id);
        if (idx !== -1) {
          allBooths[idx] = booth;
        }
      } else {
        // 新建
        const { booth } = await adminBoothApi.createBooth(payload);
        allBooths.push(booth);
      }

      closeModal();
      applyFilters(); // 重新过滤 & 渲染

      // 通知 SVG 刷新
      BoothSvgManager.setData(allBooths);

      alert('Booth saved successfully');
    } catch (err) {
      console.error('Error saving booth:', err);
      alert('Failed to save booth');
    }
  }

  async function onDeleteBooth(booth) {
    if (!booth || !booth._id) return;
    if (!confirm(`Delete booth "${booth.id}"? This cannot be undone.`)) return;

    try {
      await adminBoothApi.deleteBooth(booth._id);
      allBooths = allBooths.filter(b => b._id !== booth._id);
      applyFilters();
      BoothSvgManager.setData(allBooths);
      alert('Booth deleted');
    } catch (err) {
      console.error('Error deleting booth:', err);
      alert('Failed to delete booth');
    }
  }

  // ================= 工具 =================

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 导出
  return { init, loadBooths, getAllBooths: () => allBooths };
})();

// ================= SVG 管理模块 =================

const BoothSvgManager = (() => {
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 500;
  const BOOTH_W = 60;
  const BOOTH_H = 40;

  let svgEl, gridGroup, layerGroup;
  let btnReload, btnAddCenter;
  let booths = [];
  let selectedId = null;
  let draggingId = null;
  let dragOffset = { x: 0, y: 0 };

  function init() {
    svgEl = document.getElementById('boothSvg');
    gridGroup = document.getElementById('boothSvgGrid');
    layerGroup = document.getElementById('boothSvgLayer');
    btnReload = document.getElementById('svgReloadBtn');
    btnAddCenter = document.getElementById('svgAddCenterBtn');

    if (!svgEl || !gridGroup || !layerGroup) return;

    initGrid();
    bindEvents();
  }
  function autoLayoutIfNeeded(booths) {
  // 过滤出“没有坐标”的 booth
  const boothsToLayout = booths.filter(
    b => !b.coordinates || typeof b.coordinates.x !== 'number' || typeof b.coordinates.y !== 'number'
  );

  if (!boothsToLayout.length) return; // 全部都有坐标，直接返回

  // 先按 Hall、Event、Booth ID 排序，保证布局有序
  boothsToLayout.sort((a, b) => {
    const hallA = (a.location || '').toLowerCase();
    const hallB = (b.location || '').toLowerCase();
    if (hallA < hallB) return -1;
    if (hallA > hallB) return 1;

    const eventA = (a.event || '').toLowerCase();
    const eventB = (b.event || '').toLowerCase();
    if (eventA < eventB) return -1;
    if (eventA > eventB) return 1;

    const idA = (a.id || '').toString().toLowerCase();
    const idB = (b.id || '').toString().toLowerCase();
    if (idA < idB) return -1;
    if (idA > idB) return 1;

    return 0;
  });

  // 基本网格参数
  const paddingLeft = 40;
  const paddingTop = 40;
  const colGap = 30;
  const rowGap = 30;

  const maxCols = Math.floor(
    (SVG_WIDTH - paddingLeft * 2 + colGap) / (BOOTH_W + colGap)
  );
  const cols = Math.max(1, maxCols);

  // 每个 Hall 可以单独一块区域（简单做法：不同 Hall 在 Y 方向错开一大段）
  const hallOffsets = new Map();
  const hallList = [...new Set(boothsToLayout.map(b => b.location || 'Default Hall'))];

  hallList.forEach((hallName, index) => {
    hallOffsets.set(hallName || 'Default Hall', index * 150); // 每个 Hall Y 轴偏移 150
  });

  // 对每个需要布局的 booth 赋坐标，并发起更新
  boothsToLayout.forEach((booth, index) => {
    const hallName = booth.location || 'Default Hall';
    const hallOffsetY = hallOffsets.get(hallName) || 0;

    const localIndex = index; // 同一个数组的顺序已经按 Hall、Event、ID 排好了
    const col = localIndex % cols;
    const row = Math.floor(localIndex / cols);

    const x = paddingLeft + col * (BOOTH_W + colGap);
    const y = paddingTop + row * (BOOTH_H + rowGap) + hallOffsetY;

    booth.coordinates = { x, y };

    // 异步更新到后端（只在首次无坐标时做一次）
    if (booth._id) {
      adminBoothApi.updateBooth(booth._id, { coordinates: booth.coordinates })
        .catch(err => {
          console.error('Failed to save initial coordinates for booth', booth._id, err);
        });
    }
  });
}
  function setData(list) {
  booths = Array.isArray(list) ? list.slice() : [];

  // 一开始自动分配好位置（只对没有 coordinates 的 booth）
  autoLayoutIfNeeded(booths);

  render();
    }
  function initGrid() {
    gridGroup.innerHTML = '';
    const gap = 50;
    for (let x = gap; x < SVG_WIDTH; x += gap) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', SVG_HEIGHT);
      gridGroup.appendChild(line);
    }
    for (let y = gap; y < SVG_HEIGHT; y += gap) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', SVG_WIDTH);
      line.setAttribute('y2', y);
      gridGroup.appendChild(line);
    }
  }

  function bindEvents() {
    if (btnReload) {
      btnReload.addEventListener('click', () => {
        AdminBoothManagement.loadBooths();
      });
    }

    if (btnAddCenter) {
      btnAddCenter.addEventListener('click', async () => {
        const centerX = SVG_WIDTH / 2 - BOOTH_W / 2;
        const centerY = SVG_HEIGHT / 2 - BOOTH_H / 2;
        const payload = {
          id: `B-${Date.now()}`,
          event: '',
          location: '',
          size: '',
          sizeLabel: '',
          price: 0,
          note: '',
          status: 'available',
          statusLabel: 'Available',
          statusClass: 'status-available',
          features: [],
          description: '',
          coordinates: { x: centerX, y: centerY }
        };
        try {
          const { booth } = await adminBoothApi.createBooth(payload);
          const list = AdminBoothManagement.getAllBooths();
          list.push(booth);
          setData(list);
          selectedId = booth._id;
          render();
        } catch (e) {
          console.error('Add center booth failed:', e);
          alert('Failed to create booth at center');
        }
      });
    }

    layerGroup.addEventListener('mousedown', evt => {
      const g = evt.target.closest('g[data-id]');
      if (!g) return;
      const id = g.getAttribute('data-id');
      selectedId = id;
      render();

      const booth = booths.find(b => b._id === id);
      if (!booth) return;

      // 准备拖动
      draggingId = id;
      const p = svgPointFromEvent(evt);

      const x = booth.coordinates?.x ?? (SVG_WIDTH / 2 - BOOTH_W / 2);
      const y = booth.coordinates?.y ?? (SVG_HEIGHT / 2 - BOOTH_H / 2);

      dragOffset.x = p.x - x;
      dragOffset.y = p.y - y;

      evt.preventDefault();
    });

    window.addEventListener('mousemove', evt => {
      if (!draggingId) return;
      const booth = booths.find(b => b._id === draggingId);
      if (!booth) return;

      const p = svgPointFromEvent(evt);
      const newX = p.x - dragOffset.x;
      const newY = p.y - dragOffset.y;

      booth.coordinates = {
        x: Math.round(newX),
        y: Math.round(newY)
      };

      render();
    });

    window.addEventListener('mouseup', async evt => {
      if (!draggingId) return;
      const id = draggingId;
      draggingId = null;

      const booth = booths.find(b => b._id === id);
      if (!booth || !booth.coordinates) return;

      try {
        const res = await adminBoothApi.updateBooth(id, {
          coordinates: booth.coordinates
        });
        if (!res.success) {
          alert('Failed to update coordinates');
        }
      } catch (e) {
        console.error('update coord failed:', e);
      }
    });
  }

  function svgPointFromEvent(evt) {
    const pt = svgEl.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svgEl.getScreenCTM().inverse();
    return pt.matrixTransform(ctm);
  }

  function colorByStatusLabel(statusLabel) {
    const s = (statusLabel || '').toLowerCase();
    if (s === 'booked') return '#ef4444';
    if (s === 'maintenance') return '#f59e0b';
    return '#22c55e';
  }

  function render() {
    if (!layerGroup) return;
    layerGroup.innerHTML = '';

    booths.forEach(b => {
      const x = b.coordinates?.x ?? (SVG_WIDTH / 2 - BOOTH_W / 2);
      const y = b.coordinates?.y ?? (SVG_HEIGHT / 2 - BOOTH_H / 2);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-id', b._id);
      g.setAttribute('transform', `translate(${x},${y})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', BOOTH_W);
      rect.setAttribute('height', BOOTH_H);
      rect.setAttribute('rx', 4);
      rect.setAttribute('ry', 4);
      rect.setAttribute('fill', colorByStatusLabel(b.statusLabel));
      rect.setAttribute('stroke', selectedId === b._id ? '#f97316' : '#4b5563');
      rect.setAttribute('stroke-width', selectedId === b._id ? 3 : 1.5);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', BOOTH_W / 2);
      text.setAttribute('y', BOOTH_H / 2 + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#fff');
      text.textContent = b.id || 'Booth';

      g.appendChild(rect);
      g.appendChild(text);
      layerGroup.appendChild(g);
    });
  }

  return {
    init,
    setData
  };
})();

// ================= 初始化 =================

document.addEventListener('DOMContentLoaded', async () => {
  await AdminBoothManagement.init();
  BoothSvgManager.init();
});