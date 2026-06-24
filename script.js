document.addEventListener('DOMContentLoaded', () => {

  // ============ СОСТОЯНИЕ ============
  let guests = [];
  let tables = [];
  let selectedShape = 'round';
  let draggedGuestId = null;
  let draggedSeatTableId = null;
  let draggedSeatIndex = null;
  let editingGuestId = null;
  let editingTableId = null;
  let guestIdCounter = 1;
  let tableIdCounter = 1;
  let activeTagFilter = null;
  let zoomLevel = 1;
  let selectedTableId = null;
  let tooltipTimeout = null;

  // ============ DOM ============
  const guestListContainer = document.getElementById('guestListContainer');
  const tagFilterContainer = document.getElementById('tagFilterContainer');
  const hallCanvas = document.getElementById('hallCanvas');
  const guestSearch = document.getElementById('guestSearch');
  const seatedCount = document.getElementById('seatedCount');
  const totalCount = document.getElementById('totalCount');
  const guestModal = document.getElementById('guestModal');
  const tableModal = document.getElementById('tableModal');
  const guestTooltip = document.getElementById('guestTooltip');
  const addGuestSidebarBtn = document.getElementById('addGuestSidebarBtn');
  const addTableBtn = document.getElementById('addTableBtn');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomLabel = document.getElementById('zoomLabel');
  const tableScaleInBtn = document.getElementById('tableScaleIn');
  const tableScaleOutBtn = document.getElementById('tableScaleOut');
  const tableScaleLabel = document.getElementById('tableScaleLabel');
  const deselectTableBtn = document.getElementById('deselectTableBtn');
  const tableScaleControls = document.getElementById('tableScaleControls');
  const shapeButtons = document.querySelectorAll('.btn-shape');

  // ============ ДЕМО-ДАННЫЕ ============
  function initDemoData() {
    guests = [
      { id: guestIdCounter++, name: 'Анна', tags: ['подруга'], description: 'Вегетарианка, аллергия на орехи', tableId: null, seatIndex: null },
      { id: guestIdCounter++, name: 'Максим', tags: ['друг'], description: 'Любит виски', tableId: null, seatIndex: null },
      { id: guestIdCounter++, name: 'Ольга', tags: ['родственник'], description: 'Мама невесты', tableId: null, seatIndex: null },
      { id: guestIdCounter++, name: 'Дмитрий', tags: ['коллега'], description: '', tableId: null, seatIndex: null },
      { id: guestIdCounter++, name: 'Екатерина', tags: ['подруга', 'свидетель'], description: 'Свидетельница, подготовила тост', tableId: null, seatIndex: null },
      { id: guestIdCounter++, name: 'Алексей', tags: ['друг', 'свидетель'], description: 'Свидетель, любит танцевать', tableId: null, seatIndex: null },
      { id: guestIdCounter++, name: 'Мария', tags: ['родственник'], description: 'Сестра жениха', tableId: null, seatIndex: null },
      { id: guestIdCounter++, name: 'Иван', tags: ['родственник'], description: 'Брат невесты', tableId: null, seatIndex: null },
    ];
    tables = [
      { id: tableIdCounter++, name: 'Молодожёны', type: 'round', capacity: 6, x: 60, y: 60, guestIds: new Array(6).fill(null), scale: 1 },
      { id: tableIdCounter++, name: 'Друзья', type: 'rect', capacity: 6, x: 340, y: 60, guestIds: new Array(6).fill(null), scale: 1 },
    ];
  }

  // ============ ПОМОЩНИКИ ============
  function getGuestById(id) { return guests.find(g => g.id === id); }
  function getTableById(id) { return tables.find(t => t.id === id); }

  function getTableSize(type, capacity, scale) {
    const s = scale || 1;
    if (type === 'round') {
      const base = 100;
      const extra = Math.max(0, capacity - 4) * 12;
      return { w: (base + extra) * s, h: (base + extra) * s };
    }
    if (type === 'rect') {
      const baseW = 160;
      const extraW = Math.max(0, capacity - 4) * 18;
      return { w: (baseW + extraW) * s, h: 70 * s };
    }
    if (type === 'square') {
      const base = 100;
      const extra = Math.max(0, capacity - 4) * 12;
      return { w: (base + extra) * s, h: (base + extra) * s };
    }
    if (type === 'ushape') {
      const baseW = 150;
      const extraW = Math.max(0, capacity - 4) * 14;
      return { w: (baseW + extraW) * s, h: 120 * s };
    }
    return { w: 140 * s, h: 140 * s };
  }

  // ============ РЕНДЕРИНГ ============
  function renderAll() {
    renderGuestList();
    renderTagFilters();
    renderCanvas();
    updateCounters();
  }

  function renderGuestList() {
    const search = guestSearch.value.toLowerCase();
    let filtered = guests.filter(g => g.name.toLowerCase().includes(search));
    if (activeTagFilter) filtered = filtered.filter(g => g.tags.includes(activeTagFilter));

    guestListContainer.innerHTML = '';
    filtered.forEach(guest => {
      const card = document.createElement('div');
      card.className = 'guest-card' + (guest.tableId ? ' seated' : '');
      card.draggable = !guest.tableId;
      card.dataset.guestId = guest.id;

      const tableName = guest.tableId ? getTableById(guest.tableId)?.name || '' : '';

      card.innerHTML = `
        <div class="guest-card-info">
          <div class="guest-card-name">${guest.name}</div>
          ${guest.tableId ? `<div class="guest-card-table">🪑 ${tableName}</div>` : ''}
          <div class="guest-card-tags">
            ${guest.tags.map(t => `<span class="guest-card-tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="guest-card-actions">
          <button class="guest-card-edit" title="Редактировать" data-guest-id="${guest.id}">✏️</button>
        </div>
      `;

      card.querySelector('.guest-card-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        openGuestModal(guest.id);
      });

      card.addEventListener('mouseenter', (e) => showTooltip(guest, e.clientX, e.clientY));
      card.addEventListener('mouseleave', hideTooltip);
      card.addEventListener('touchstart', (e) => {
        showTooltip(guest, e.touches[0].clientX, e.touches[0].clientY);
        setTimeout(hideTooltip, 2500);
      }, { passive: true });

      card.addEventListener('click', () => {
        if (guest.tableId) {
          const table = getTableById(guest.tableId);
          if (table) {
            const idx = table.guestIds.indexOf(guest.id);
            if (idx !== -1) table.guestIds[idx] = null;
          }
          guest.tableId = null;
          guest.seatIndex = null;
          renderAll();
        }
      });

      if (!guest.tableId) {
        card.addEventListener('dragstart', (e) => {
          draggedGuestId = guest.id;
          draggedSeatTableId = null;
          draggedSeatIndex = null;
          card.classList.add('dragging-card');
          e.dataTransfer.setData('text/plain', guest.id);
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging-card');
          draggedGuestId = null;
        });
      }

      guestListContainer.appendChild(card);
    });
  }

  function renderTagFilters() {
    const allTags = [...new Set(guests.flatMap(g => g.tags))];
    tagFilterContainer.innerHTML = '';
    
    const allChip = document.createElement('span');
    allChip.className = 'tag-filter-chip' + (activeTagFilter === null ? ' active' : '');
    allChip.textContent = 'Все';
    allChip.addEventListener('click', () => { activeTagFilter = null; renderAll(); });
    tagFilterContainer.appendChild(allChip);

    allTags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-filter-chip' + (activeTagFilter === tag ? ' active' : '');
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        activeTagFilter = activeTagFilter === tag ? null : tag;
        renderAll();
      });
      tagFilterContainer.appendChild(chip);
    });
  }

  function renderCanvas() {
    hallCanvas.innerHTML = '';
    tables.forEach(table => {
      const isSelected = selectedTableId === table.id;
      const size = getTableSize(table.type, table.capacity, table.scale);

      const obj = document.createElement('div');
      obj.className = 'table-object' + (isSelected ? ' selected' : '');
      obj.style.left = table.x + 'px';
      obj.style.top = table.y + 'px';
      obj.dataset.tableId = table.id;

      const visual = document.createElement('div');
      visual.className = 'table-visual';
      visual.style.width = size.w + 'px';
      visual.style.height = size.h + 'px';
      
      const inner = document.createElement('div');
      inner.className = `table-${table.type}`;
      inner.style.width = size.w + 'px';
      inner.style.height = size.h + 'px';
      inner.style.position = 'relative';

      if (table.type === 'ushape') {
        const innerU = document.createElement('div');
        innerU.className = 'table-ushape-inner';
        inner.appendChild(innerU);
      }

      visual.appendChild(inner);

      for (let i = 0; i < table.capacity; i++) {
        const guestId = table.guestIds[i] || null;
        const dot = createSeatDot(table, i, guestId, size);
        inner.appendChild(dot);
      }

      const label = document.createElement('div');
      label.className = 'table-label';
      const filled = table.guestIds.filter(Boolean).length;
      label.textContent = `${table.name} (${filled}/${table.capacity})`;
      
      const loadBar = document.createElement('div');
      loadBar.className = 'load-bar';
      const fill = document.createElement('div');
      fill.className = 'load-bar-fill';
      const percent = Math.round((filled / table.capacity) * 100);
      fill.style.width = percent + '%';
      fill.style.background = percent < 40 ? '#8CAA90' : (percent < 70 ? '#D4B896' : '#C06C54');
      loadBar.appendChild(fill);

      obj.appendChild(visual);
      obj.appendChild(label);
      obj.appendChild(loadBar);

      obj.addEventListener('click', (e) => {
        if (e.target.closest('.seat-dot')) return;
        selectTable(table.id);
      });

      obj.addEventListener('mousedown', (e) => startDragTable(e, table.id));
      obj.addEventListener('touchstart', (e) => startDragTable(e, table.id), { passive: false });

      obj.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openTableModal(table.id);
      });

      hallCanvas.appendChild(obj);
    });
  }

  function createSeatDot(table, seatIndex, guestId, size) {
    const dot = document.createElement('div');
    dot.className = 'seat-dot' + (guestId ? ' occupied' : '');
    dot.dataset.seatIndex = seatIndex;
    dot.dataset.tableId = table.id;

    if (guestId) {
      const guest = getGuestById(guestId);
      dot.textContent = guest ? guest.name : '';

      dot.addEventListener('mouseenter', (e) => {
        if (guest) showTooltip(guest, e.clientX, e.clientY);
      });
      dot.addEventListener('mouseleave', hideTooltip);
      dot.addEventListener('touchstart', (e) => {
        if (guest) {
          showTooltip(guest, e.touches[0].clientX, e.touches[0].clientY);
          setTimeout(hideTooltip, 2500);
        }
      }, { passive: true });

      dot.addEventListener('click', (e) => {
        if (draggedGuestId === null && draggedSeatIndex === null) {
          e.stopPropagation();
          const g = getGuestById(guestId);
          if (g) {
            g.tableId = null;
            g.seatIndex = null;
            table.guestIds[seatIndex] = null;
            renderAll();
          }
        }
      });

      dot.draggable = true;
      dot.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedGuestId = guestId;
        draggedSeatTableId = table.id;
        draggedSeatIndex = seatIndex;
        dot.classList.add('dragging-seat');
        e.dataTransfer.setData('text/plain', 'seat:' + guestId);
      });
      dot.addEventListener('dragend', () => {
        dot.classList.remove('dragging-seat');
      });

    } else {
      dot.textContent = '+';

      dot.addEventListener('dragover', (e) => { e.preventDefault(); dot.classList.add('highlight'); });
      dot.addEventListener('dragleave', () => dot.classList.remove('highlight'));
      dot.addEventListener('drop', (e) => {
        e.preventDefault();
        dot.classList.remove('highlight');
        handleSeatDrop(table.id, seatIndex);
        draggedGuestId = null;
        draggedSeatTableId = null;
        draggedSeatIndex = null;
        renderAll();
      });
    }

    const pos = getSeatPosition(table.type, table.capacity, seatIndex, size);
    dot.style.left = pos.x + 'px';
    dot.style.top = pos.y + 'px';
    return dot;
  }

  function handleSeatDrop(targetTableId, targetSeatIndex) {
    const targetTable = getTableById(targetTableId);
    if (!targetTable) return;

    if (draggedSeatTableId !== null && draggedSeatIndex !== null && draggedGuestId !== null) {
      const sourceTable = getTableById(draggedSeatTableId);
      
      if (draggedSeatTableId === targetTableId && draggedSeatIndex === targetSeatIndex) return;

      const displacedGuestId = targetTable.guestIds[targetSeatIndex];
      const draggedId = draggedGuestId;

      if (sourceTable) sourceTable.guestIds[draggedSeatIndex] = null;

      if (displacedGuestId) {
        const displacedGuest = getGuestById(displacedGuestId);
        if (sourceTable) {
          sourceTable.guestIds[draggedSeatIndex] = displacedGuestId;
          if (displacedGuest) {
            displacedGuest.tableId = sourceTable.id;
            displacedGuest.seatIndex = draggedSeatIndex;
          }
        } else {
          if (displacedGuest) {
            displacedGuest.tableId = null;
            displacedGuest.seatIndex = null;
          }
        }
      }

      targetTable.guestIds[targetSeatIndex] = draggedId;
      const draggedGuest = getGuestById(draggedId);
      if (draggedGuest) {
        draggedGuest.tableId = targetTableId;
        draggedGuest.seatIndex = targetSeatIndex;
      }
      return;
    }

    if (draggedGuestId !== null && draggedSeatTableId === null) {
      const guest = getGuestById(draggedGuestId);
      if (!guest) return;

      if (targetTable.guestIds[targetSeatIndex]) {
        const displacedGuest = getGuestById(targetTable.guestIds[targetSeatIndex]);
        if (displacedGuest) {
          displacedGuest.tableId = null;
          displacedGuest.seatIndex = null;
        }
      }

      if (guest.tableId) {
        const oldTable = getTableById(guest.tableId);
        if (oldTable) {
          const oldIndex = oldTable.guestIds.indexOf(guest.id);
          if (oldIndex !== -1) oldTable.guestIds[oldIndex] = null;
        }
      }

      guest.tableId = targetTableId;
      guest.seatIndex = targetSeatIndex;
      targetTable.guestIds[targetSeatIndex] = guest.id;
    }
  }

  function getSeatPosition(type, capacity, index, size) {
    const w = size.w;
    const h = size.h;

    if (type === 'round') {
      const r = w / 2 - 15;
      const cx = w / 2;
      const cy = h / 2;
      const angle = (index / capacity) * 2 * Math.PI - Math.PI / 2;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }
    if (type === 'rect') {
      const perTop = Math.ceil(capacity / 4);
      const perRight = Math.ceil(capacity / 4);
      const perBottom = Math.ceil(capacity / 4);
      const perLeft = capacity - perTop - perRight - perBottom;

      if (index < perTop) {
        const x = w / (perTop + 1) * (index + 1);
        return { x, y: -12 };
      }
      if (index < perTop + perRight) {
        const i = index - perTop;
        const y = h / (perRight + 1) * (i + 1);
        return { x: w + 12, y };
      }
      if (index < perTop + perRight + perBottom) {
        const i = index - perTop - perRight;
        const x = w / (perBottom + 1) * (i + 1);
        return { x, y: h + 12 };
      }
      const i = index - perTop - perRight - perBottom;
      const y = h / (perLeft + 1) * (i + 1);
      return { x: -12, y };
    }
    if (type === 'square') {
      const perSide = Math.ceil(capacity / 4);
      const side = index % 4;
      const offset = Math.floor(index / 4) * (w / (perSide + 1)) + w / (perSide + 1);
      const positions = [
        { x: offset, y: -12 },
        { x: w + 12, y: offset },
        { x: w - offset, y: h + 12 },
        { x: -12, y: h - offset }
      ];
      return positions[side] || { x: w/2, y: h/2 };
    }
    if (type === 'ushape') {
      // П-образный: места снаружи по трём сторонам, не внутри
      const legWidth = w * 0.25;    // ширина ножек буквы П
      const topY = -12;             // верхняя перекладина
      const bottomY = h * 0.35;     // нижний край ножек (где заканчиваются)
      const legLeftX = -12;         // левая ножка
      const legRightX = w + 12;     // правая ножка
      const topStartX = legWidth / 2;
      const topEndX = w - legWidth / 2;

      // Распределяем места: верх (3), левая ножка (2), правая ножка (2) — всего 7 базовых
      // Если мест больше — добавляем по верху
      const topCount = Math.min(capacity, 3 + Math.max(0, capacity - 7));
      const leftCount = Math.min(capacity - topCount, Math.ceil((capacity - topCount) / 2));
      const rightCount = capacity - topCount - leftCount;

      if (index < topCount) {
        const x = topStartX + (topEndX - topStartX) / (topCount + 1) * (index + 1);
        return { x, y: topY };
      }
      const afterTop = index - topCount;
      if (afterTop < leftCount) {
        const y = bottomY / (leftCount + 1) * (afterTop + 1);
        return { x: legLeftX, y };
      }
      const rightIdx = afterTop - leftCount;
      const y = bottomY / (rightCount + 1) * (rightIdx + 1);
      return { x: legRightX, y };
    }
    return { x: w/2, y: h/2 };
  }

  function updateCounters() {
    const seated = guests.filter(g => g.tableId !== null).length;
    seatedCount.textContent = seated;
    totalCount.textContent = guests.length;
  }

  // ============ TOOLTIP ============
  function showTooltip(guest, x, y) {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    const tableName = guest.tableId ? getTableById(guest.tableId)?.name || '' : '';

    guestTooltip.innerHTML = `
      <div class="tooltip-name">${guest.name}</div>
      ${guest.tags.length ? `<div class="tooltip-tags">${guest.tags.map(t => `<span class="tooltip-tag">${t}</span>`).join('')}</div>` : ''}
      ${guest.description ? `<div class="tooltip-desc">${guest.description}</div>` : ''}
      ${tableName ? `<div class="tooltip-table">🪑 ${tableName}</div>` : ''}
    `;
    guestTooltip.classList.remove('hidden');

    const tw = guestTooltip.offsetWidth;
    const th = guestTooltip.offsetHeight;
    let left = x + 15;
    let top = y - th / 2;
    if (left + tw > window.innerWidth - 10) left = x - tw - 15;
    if (top < 10) top = 10;
    if (top + th > window.innerHeight - 10) top = window.innerHeight - th - 10;
    guestTooltip.style.left = left + 'px';
    guestTooltip.style.top = top + 'px';
  }

  function hideTooltip() {
    tooltipTimeout = setTimeout(() => {
      guestTooltip.classList.add('hidden');
    }, 300);
  }

  // ============ SELECT TABLE ============
  function selectTable(tableId) {
    if (selectedTableId === tableId) {
      selectedTableId = null;
      tableScaleControls.style.display = 'none';
    } else {
      selectedTableId = tableId;
      const table = getTableById(tableId);
      tableScaleLabel.textContent = Math.round((table?.scale || 1) * 100) + '%';
      tableScaleControls.style.display = 'flex';
    }
    renderAll();
  }

  function updateTableScale(delta) {
    if (!selectedTableId) return;
    const table = getTableById(selectedTableId);
    if (!table) return;
    table.scale = Math.max(0.5, Math.min(3, (table.scale || 1) + delta));
    tableScaleLabel.textContent = Math.round(table.scale * 100) + '%';
    renderAll();
  }

  // ============ DRAG TABLE ============
  function startDragTable(e, tableId) {
    if (e.target.closest('.seat-dot')) return;
    e.preventDefault();
    const table = getTableById(tableId);
    if (!table) return;

    const startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const origX = table.x;
    const origY = table.y;

    const obj = hallCanvas.querySelector(`[data-table-id="${tableId}"]`);
    if (obj) obj.classList.add('dragging-table');

    function onMove(ev) {
      const mx = ev.type.includes('touch') ? ev.touches[0].clientX : ev.clientX;
      const my = ev.type.includes('touch') ? ev.touches[0].clientY : ev.clientY;
      table.x = origX + (mx - startX) / zoomLevel;
      table.y = origY + (my - startY) / zoomLevel;
      if (obj) { obj.style.left = table.x + 'px'; obj.style.top = table.y + 'px'; }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      if (obj) obj.classList.remove('dragging-table');
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  // ============ ZOOM ============
  function setZoom(level) {
    zoomLevel = Math.max(0.3, Math.min(2, level));
    hallCanvas.style.transform = `scale(${zoomLevel})`;
    zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
  }

  zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + 0.1));
  zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - 0.1));
  tableScaleInBtn.addEventListener('click', () => updateTableScale(0.1));
  tableScaleOutBtn.addEventListener('click', () => updateTableScale(-0.1));
  deselectTableBtn.addEventListener('click', () => selectTable(selectedTableId));

  document.getElementById('canvasWrapper').addEventListener('click', (e) => {
    if (e.target === e.currentTarget || (e.target.closest('.hall-canvas') && !e.target.closest('.table-object'))) {
      if (selectedTableId) {
        selectedTableId = null;
        tableScaleControls.style.display = 'none';
        renderAll();
      }
    }
  });

  // ============ МОДАЛЬНЫЕ ОКНА ============
  function openGuestModal(id = null) {
    editingGuestId = id;
    const guest = id ? getGuestById(id) : null;
    document.getElementById('modalTitle').textContent = guest ? 'Редактировать гостя' : 'Добавить гостя';
    document.getElementById('modalGuestName').value = guest ? guest.name : '';
    document.getElementById('modalGuestTags').value = guest ? guest.tags.join(', ') : '';
    document.getElementById('modalGuestDesc').value = guest ? guest.description : '';
    guestModal.classList.remove('hidden');
  }

  function closeGuestModal() {
    guestModal.classList.add('hidden');
    editingGuestId = null;
  }

  document.getElementById('modalSave').addEventListener('click', () => {
    const name = document.getElementById('modalGuestName').value.trim();
    if (!name) { alert('Введите имя'); return; }
    const tags = document.getElementById('modalGuestTags').value.split(',').map(t => t.trim()).filter(Boolean);
    const desc = document.getElementById('modalGuestDesc').value.trim();

    if (editingGuestId) {
      const g = getGuestById(editingGuestId);
      if (g) { g.name = name; g.tags = tags; g.description = desc; }
    } else {
      guests.push({ id: guestIdCounter++, name, tags, description: desc, tableId: null, seatIndex: null });
    }
    closeGuestModal();
    renderAll();
  });

  document.getElementById('modalCancel').addEventListener('click', closeGuestModal);
  guestModal.addEventListener('click', (e) => { if (e.target === guestModal) closeGuestModal(); });

  function openTableModal(id) {
    editingTableId = id;
    const table = getTableById(id);
    if (!table) return;
    document.getElementById('modalTableName').value = table.name;
    document.getElementById('modalTableCapacity').value = table.capacity;
    tableModal.classList.remove('hidden');
  }

  function closeTableModal() {
    tableModal.classList.add('hidden');
    editingTableId = null;
  }

  document.getElementById('tableModalSave').addEventListener('click', () => {
    const table = getTableById(editingTableId);
    if (!table) return;
    const newCapacity = parseInt(document.getElementById('modalTableCapacity').value);
    const filled = table.guestIds.filter(Boolean).length;
    if (filled > newCapacity) {
      alert(`Нельзя уменьшить вместимость: за столом ${filled} гостей`);
      return;
    }
    table.name = document.getElementById('modalTableName').value.trim() || table.name;
    table.capacity = newCapacity;
    if (table.guestIds.length > newCapacity) {
      table.guestIds = table.guestIds.slice(0, newCapacity);
    } else if (table.guestIds.length < newCapacity) {
      while (table.guestIds.length < newCapacity) table.guestIds.push(null);
    }
    closeTableModal();
    renderAll();
  });

  document.getElementById('tableModalDelete').addEventListener('click', () => {
    const table = getTableById(editingTableId);
    if (!table) return;
    table.guestIds.forEach(gid => {
      if (gid) {
        const g = getGuestById(gid);
        if (g) { g.tableId = null; g.seatIndex = null; }
      }
    });
    tables = tables.filter(t => t.id !== editingTableId);
    if (selectedTableId === editingTableId) {
      selectedTableId = null;
      tableScaleControls.style.display = 'none';
    }
    closeTableModal();
    renderAll();
  });

  document.getElementById('tableModalCancel').addEventListener('click', closeTableModal);
  tableModal.addEventListener('click', (e) => { if (e.target === tableModal) closeTableModal(); });

  // ============ КНОПКИ ============
  addGuestSidebarBtn.addEventListener('click', () => openGuestModal(null));
  
  addTableBtn.addEventListener('click', () => {
    const typeNames = { round: 'Круглый', rect: 'Прямоугольный', square: 'Квадратный', ushape: 'П-образный' };
    tables.push({
      id: tableIdCounter++,
      name: typeNames[selectedShape] + ' ' + (tables.length + 1),
      type: selectedShape,
      capacity: 6,
      x: 60 + tables.length * 30,
      y: 250 + tables.length * 20,
      guestIds: new Array(6).fill(null),
      scale: 1
    });
    renderAll();
  });

  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedShape = btn.dataset.shape;
    });
  });

  guestSearch.addEventListener('input', renderAll);

  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());

  // ============ СОХРАНЕНИЕ / ЗАГРУЗКА ============
  function exportData() {
    const data = {
      guests: guests.map(g => ({
        id: g.id,
        name: g.name,
        tags: g.tags,
        description: g.description,
        tableId: g.tableId,
        seatIndex: g.seatIndex
      })),
      tables: tables.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        capacity: t.capacity,
        x: t.x,
        y: t.y,
        guestIds: t.guestIds,
        scale: t.scale
      })),
      guestIdCounter: guestIdCounter,
      tableIdCounter: tableIdCounter
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-seating-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        guests = data.guests || [];
        tables = data.tables || [];
        guestIdCounter = data.guestIdCounter || guests.length + 1;
        tableIdCounter = data.tableIdCounter || tables.length + 1;
        selectedTableId = null;
        tableScaleControls.style.display = 'none';
        renderAll();
      } catch (err) {
        alert('Ошибка загрузки файла. Проверьте формат.');
      }
    };
    reader.readAsText(file);
  }

  // Добавляем кнопки в тулбар
  const toolbarRight = document.querySelector('.toolbar-right');
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-tool';
  saveBtn.textContent = '💾 Сохранить';
  saveBtn.addEventListener('click', exportData);
  
  const loadBtn = document.createElement('button');
  loadBtn.className = 'btn btn-tool';
  loadBtn.textContent = '📂 Загрузить';
  loadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
    });
    input.click();
  });

  toolbarRight.prepend(loadBtn);
  toolbarRight.prepend(saveBtn);

  // ============ ИНИЦИАЛИЗАЦИЯ ============
  initDemoData();
  renderAll();
});