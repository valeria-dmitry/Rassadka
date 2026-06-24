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

  // Режим перемещения места
  let moveMode = null; // { tableId, seatIndex, guestId }

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
  const moveModeToast = document.getElementById('moveModeToast');
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
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const shapeButtons = document.querySelectorAll('.btn-shape');
  const sidebarHandle = document.getElementById('sidebarHandle');
  const guestSidebar = document.getElementById('guestSidebar');

  // ============ SIDEBAR DRAWER ============
  sidebarHandle.addEventListener('click', () => {
    guestSidebar.classList.toggle('open');
  });

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
      { id: tableIdCounter++, name: 'Молодожёны', type: 'round', capacity: 6, x: 60, y: 60, guestIds: new Array(6).fill(null), scale: 1, customSeatOffsets: {} },
      { id: tableIdCounter++, name: 'Друзья', type: 'rect', capacity: 6, x: 340, y: 60, guestIds: new Array(6).fill(null), scale: 1, customSeatOffsets: {} },
    ];
  }

  // ============ ПОМОЩНИКИ ============
  function getGuestById(id) { return guests.find(g => g.id === id); }
  function getTableById(id) { return tables.find(t => t.id === id); }

  function getTableSize(type, capacity, scale) {
    const s = scale || 1;
    if (type === 'round') { const b = 100 + Math.max(0, capacity-4)*12; return { w: b*s, h: b*s }; }
    if (type === 'rect') { const b = 160 + Math.max(0, capacity-4)*18; return { w: b*s, h: 70*s }; }
    if (type === 'square') { const b = 100 + Math.max(0, capacity-4)*12; return { w: b*s, h: b*s }; }
    if (type === 'ushape') { const b = 150 + Math.max(0, capacity-4)*14; return { w: b*s, h: 120*s }; }
    return { w: 140*s, h: 140*s };
  }

  // ============ РЕНДЕРИНГ ============
  function renderAll() {
    renderGuestList();
    renderTagFilters();
    renderCanvas();
    updateCounters();
    updateMoveModeUI();
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
          <div class="guest-card-tags">${guest.tags.map(t => `<span class="guest-card-tag">${t}</span>`).join('')}</div>
        </div>
        <div class="guest-card-actions">
          <button class="guest-card-edit" title="Редактировать">✏️</button>
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
        if (moveMode) { cancelMoveMode(); return; }
        if (guest.tableId) {
          const table = getTableById(guest.tableId);
          if (table) { const idx = table.guestIds.indexOf(guest.id); if (idx !== -1) table.guestIds[idx] = null; }
          guest.tableId = null; guest.seatIndex = null;
          renderAll();
        }
      });

      if (!guest.tableId) {
        card.addEventListener('dragstart', (e) => {
          if (moveMode) { e.preventDefault(); return; }
          draggedGuestId = guest.id; draggedSeatTableId = null; draggedSeatIndex = null;
          card.classList.add('dragging-card');
          e.dataTransfer.setData('text/plain', guest.id);
        });
        card.addEventListener('dragend', () => { card.classList.remove('dragging-card'); draggedGuestId = null; });
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
      chip.addEventListener('click', () => { activeTagFilter = activeTagFilter === tag ? null : tag; renderAll(); });
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
      obj.style.left = table.x + 'px'; obj.style.top = table.y + 'px';
      obj.dataset.tableId = table.id;

      const visual = document.createElement('div');
      visual.className = 'table-visual';
      visual.style.width = size.w + 'px'; visual.style.height = size.h + 'px';
      
      const inner = document.createElement('div');
      inner.className = `table-${table.type}`;
      inner.style.width = size.w + 'px'; inner.style.height = size.h + 'px';
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
        if (moveMode) { cancelMoveMode(); return; }
        selectTable(table.id);
      });

      obj.addEventListener('mousedown', (e) => { if (!moveMode) startDragTable(e, table.id); });
      obj.addEventListener('touchstart', (e) => { if (!moveMode) startDragTable(e, table.id); }, { passive: false });

      obj.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (moveMode) return;
        openTableModal(table.id);
      });
      // Долгий тап для телефона — открыть настройки стола
      let tableTapTimer;
      obj.addEventListener('touchstart', (e) => {
        if (e.target.closest('.seat-dot')) return;
        tableTapTimer = setTimeout(() => {
          if (moveMode) return;
          openTableModal(table.id);
        }, 600);
      }, { passive: true });
      obj.addEventListener('touchend', () => clearTimeout(tableTapTimer));
      obj.addEventListener('touchmove', () => clearTimeout(tableTapTimer));

      hallCanvas.appendChild(obj);
    });
  }

  function createSeatDot(table, seatIndex, guestId, size) {
    const dot = document.createElement('div');
    dot.className = 'seat-dot' + (guestId ? ' occupied' : '');
    dot.dataset.seatIndex = seatIndex;
    dot.dataset.tableId = table.id;

    // Подсветка в режиме перемещения
    if (moveMode && moveMode.tableId === table.id) {
      if (moveMode.seatIndex === seatIndex) dot.classList.add('move-source');
      else if (!guestId || seatIndex !== moveMode.seatIndex) dot.classList.add('move-target');
    }

    if (guestId) {
      const guest = getGuestById(guestId);
      dot.textContent = guest ? guest.name : '';

      dot.addEventListener('mouseenter', (e) => { if (guest && !moveMode) showTooltip(guest, e.clientX, e.clientY); });
      dot.addEventListener('mouseleave', () => { if (!moveMode) hideTooltip(); });
      dot.addEventListener('touchstart', (e) => {
        if (guest && !moveMode) { showTooltip(guest, e.touches[0].clientX, e.touches[0].clientY); setTimeout(hideTooltip, 2500); }
      }, { passive: true });

      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (draggedGuestId !== null || draggedSeatIndex !== null) return;

        // Режим перемещения места
        if (moveMode) {
          if (moveMode.tableId === table.id && moveMode.seatIndex === seatIndex) {
            // Повторный тап — отмена
            cancelMoveMode();
          } else if (moveMode.tableId === table.id) {
            // Перемещаем гостя на это место
            executeSeatMove(moveMode.tableId, moveMode.seatIndex, seatIndex);
            cancelMoveMode();
          } else {
            cancelMoveMode();
          }
          return;
        }

        // Обычный клик — удалить гостя с места
        if (guest) {
          const g = getGuestById(guest.id || guestId);
          if (g) { g.tableId = null; g.seatIndex = null; }
          table.guestIds[seatIndex] = null;
          renderAll();
        }
      });

      // Двойной тап / долгий тап — вход в режим перемещения
      dot.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (moveMode) { cancelMoveMode(); return; }
        enterMoveMode(table.id, seatIndex, guestId);
      });

      // Долгий тап для телефона
      let longTapTimer;
      dot.addEventListener('touchstart', (e) => {
        longTapTimer = setTimeout(() => {
          if (moveMode) return;
          enterMoveMode(table.id, seatIndex, guestId);
        }, 500);
      }, { passive: true });
      dot.addEventListener('touchend', () => clearTimeout(longTapTimer));
      dot.addEventListener('touchmove', () => clearTimeout(longTapTimer));

      // Drag гостя (обмен)
      dot.draggable = !moveMode;
      dot.addEventListener('dragstart', (e) => {
        if (moveMode) { e.preventDefault(); return; }
        e.stopPropagation();
        draggedGuestId = guestId; draggedSeatTableId = table.id; draggedSeatIndex = seatIndex;
        dot.classList.add('dragging-seat');
        e.dataTransfer.setData('text/plain', 'seat:' + guestId);
      });
      dot.addEventListener('dragend', () => { dot.classList.remove('dragging-seat'); });

    } else {
      dot.textContent = '+';

      dot.addEventListener('dragover', (e) => { e.preventDefault(); dot.classList.add('highlight'); });
      dot.addEventListener('dragleave', () => dot.classList.remove('highlight'));
      dot.addEventListener('drop', (e) => {
        e.preventDefault(); dot.classList.remove('highlight');
        handleSeatDrop(table.id, seatIndex);
        draggedGuestId = null; draggedSeatTableId = null; draggedSeatIndex = null;
        renderAll();
      });

      // В режиме перемещения — пустое место тоже цель
      dot.addEventListener('click', (e) => {
        if (!moveMode) return;
        e.stopPropagation();
        if (moveMode.tableId === table.id && moveMode.seatIndex !== seatIndex) {
          executeSeatMove(moveMode.tableId, moveMode.seatIndex, seatIndex);
          cancelMoveMode();
        }
      });
    }

    const pos = getSeatPosition(table, seatIndex, size);
    dot.style.left = pos.x + 'px';
    dot.style.top = pos.y + 'px';
    return dot;
  }

  function enterMoveMode(tableId, seatIndex, guestId) {
    moveMode = { tableId, seatIndex, guestId };
    updateMoveModeUI();
    renderAll();
  }

  function cancelMoveMode() {
    moveMode = null;
    updateMoveModeUI();
    renderAll();
  }

  function executeSeatMove(tableId, fromIndex, toIndex) {
    const table = getTableById(tableId);
    if (!table) return;
    if (fromIndex === toIndex) return;

    const guestId = table.guestIds[fromIndex];
    const displacedId = table.guestIds[toIndex];

    // Меняем местами
    table.guestIds[fromIndex] = displacedId;
    table.guestIds[toIndex] = guestId;

    if (displacedId) {
      const g = getGuestById(displacedId);
      if (g) g.seatIndex = fromIndex;
    }
    if (guestId) {
      const g = getGuestById(guestId);
      if (g) g.seatIndex = toIndex;
    }
  }

  function updateMoveModeUI() {
    if (moveMode) {
      moveModeToast.classList.remove('hidden');
    } else {
      moveModeToast.classList.add('hidden');
    }
  }

  function getSeatPosition(table, seatIndex, size) {
    const base = getBaseSeatPosition(table.type, table.capacity, seatIndex, size);
    if (table.customSeatOffsets && table.customSeatOffsets[seatIndex]) {
      const offset = table.customSeatOffsets[seatIndex];
      return { x: base.x + offset.x, y: base.y + offset.y };
    }
    return base;
  }

  function getBaseSeatPosition(type, capacity, index, size) {
    const w = size.w, h = size.h;
    if (type === 'round') {
      const r = w/2 - 15, cx = w/2, cy = h/2;
      const angle = (index/capacity)*2*Math.PI - Math.PI/2;
      return { x: cx + r*Math.cos(angle), y: cy + r*Math.sin(angle) };
    }
        if (type === 'rect') {
      // Особый случай: 2 гостя — сидят сверху рядом
      if (capacity === 2) {
        const positions = [
          { x: w * 0.33, y: -12 },
          { x: w * 0.67, y: -12 }
        ];
        return positions[index] || { x: w/2, y: -12 };
      }
      
      // 3+ гостей: распределение по длинным сторонам (слева и справа)
      const leftCount = Math.ceil(capacity / 2);
      const rightCount = capacity - leftCount;

      if (index < leftCount) {
        const y = h / (leftCount + 1) * (index + 1);
        return { x: -12, y };
      } else {
        const i = index - leftCount;
        const y = h / (rightCount + 1) * (i + 1);
        return { x: w + 12, y };
      }
    }
    if (type === 'square') {
      const perSide = Math.ceil(capacity/4), side = index%4;
      const offset = Math.floor(index/4)*(w/(perSide+1)) + w/(perSide+1);
      const pos = [{ x: offset, y: -12 }, { x: w+12, y: offset }, { x: w-offset, y: h+12 }, { x: -12, y: h-offset }];
      return pos[side] || { x: w/2, y: h/2 };
    }
    if (type === 'ushape') {
      const lw = w*0.25, topY = -12, botY = h*0.35, lX = -12, rX = w+12;
      const tS = lw/2, tE = w - lw/2;
      const topCount = Math.min(capacity, 3+Math.max(0,capacity-7));
      const leftCount = Math.min(capacity-topCount, Math.ceil((capacity-topCount)/2));
      const rightCount = capacity - topCount - leftCount;
      if (index < topCount) { const x = tS + (tE-tS)/(topCount+1)*(index+1); return { x, y: topY }; }
      const after = index - topCount;
      if (after < leftCount) { const y = botY/(leftCount+1)*(after+1); return { x: lX, y }; }
      const ri = after - leftCount;
      const y = botY/(rightCount+1)*(ri+1);
      return { x: rX, y };
    }
    return { x: w/2, y: h/2 };
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
        const dg = getGuestById(displacedGuestId);
        if (sourceTable) { sourceTable.guestIds[draggedSeatIndex] = displacedGuestId; if (dg) { dg.tableId = sourceTable.id; dg.seatIndex = draggedSeatIndex; } }
        else { if (dg) { dg.tableId = null; dg.seatIndex = null; } }
      }
      targetTable.guestIds[targetSeatIndex] = draggedId;
      const dg2 = getGuestById(draggedId);
      if (dg2) { dg2.tableId = targetTableId; dg2.seatIndex = targetSeatIndex; }
      return;
    }

    if (draggedGuestId !== null && draggedSeatTableId === null) {
      const guest = getGuestById(draggedGuestId);
      if (!guest) return;
      if (targetTable.guestIds[targetSeatIndex]) {
        const dg = getGuestById(targetTable.guestIds[targetSeatIndex]);
        if (dg) { dg.tableId = null; dg.seatIndex = null; }
      }
      if (guest.tableId) {
        const ot = getTableById(guest.tableId);
        if (ot) { const oi = ot.guestIds.indexOf(guest.id); if (oi !== -1) ot.guestIds[oi] = null; }
      }
      guest.tableId = targetTableId; guest.seatIndex = targetSeatIndex;
      targetTable.guestIds[targetSeatIndex] = guest.id;
    }
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
    const tw = guestTooltip.offsetWidth, th = guestTooltip.offsetHeight;
    let left = x + 15, top = y - th/2;
    if (left + tw > window.innerWidth - 10) left = x - tw - 15;
    if (top < 10) top = 10;
    if (top + th > window.innerHeight - 10) top = window.innerHeight - th - 10;
    guestTooltip.style.left = left + 'px';
    guestTooltip.style.top = top + 'px';
  }

  function hideTooltip() {
    tooltipTimeout = setTimeout(() => { guestTooltip.classList.add('hidden'); }, 300);
  }

  // ============ SELECT TABLE ============
  function selectTable(tableId) {
    if (selectedTableId === tableId) {
      selectedTableId = null; tableScaleControls.style.display = 'none';
    } else {
      selectedTableId = tableId;
      const table = getTableById(tableId);
      tableScaleLabel.textContent = Math.round((table?.scale || 1)*100) + '%';
      tableScaleControls.style.display = 'flex';
    }
    renderAll();
  }

  function updateTableScale(delta) {
    if (!selectedTableId) return;
    const table = getTableById(selectedTableId);
    if (!table) return;
    table.scale = Math.max(0.5, Math.min(3, (table.scale || 1) + delta));
    tableScaleLabel.textContent = Math.round(table.scale*100) + '%';
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
    const origX = table.x, origY = table.y;
    const obj = hallCanvas.querySelector(`[data-table-id="${tableId}"]`);
    if (obj) obj.classList.add('dragging-table');

    function onMove(ev) {
      const mx = ev.type.includes('touch') ? ev.touches[0].clientX : ev.clientX;
      const my = ev.type.includes('touch') ? ev.touches[0].clientY : ev.clientY;
      table.x = origX + (mx - startX)/zoomLevel;
      table.y = origY + (my - startY)/zoomLevel;
      if (obj) { obj.style.left = table.x+'px'; obj.style.top = table.y+'px'; }
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
    zoomLabel.textContent = Math.round(zoomLevel*100) + '%';
  }
  zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + 0.1));
  zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - 0.1));
  tableScaleInBtn.addEventListener('click', () => updateTableScale(0.1));
  tableScaleOutBtn.addEventListener('click', () => updateTableScale(-0.1));
  deselectTableBtn.addEventListener('click', () => selectTable(selectedTableId));

  document.getElementById('canvasWrapper').addEventListener('click', (e) => {
    if (moveMode) { cancelMoveMode(); return; }
    if (e.target === e.currentTarget || (e.target.closest('.hall-canvas') && !e.target.closest('.table-object'))) {
      if (selectedTableId) { selectedTableId = null; tableScaleControls.style.display = 'none'; renderAll(); }
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
  function closeGuestModal() { guestModal.classList.add('hidden'); editingGuestId = null; }
  document.getElementById('modalSave').addEventListener('click', () => {
    const name = document.getElementById('modalGuestName').value.trim();
    if (!name) { alert('Введите имя'); return; }
    const tags = document.getElementById('modalGuestTags').value.split(',').map(t => t.trim()).filter(Boolean);
    const desc = document.getElementById('modalGuestDesc').value.trim();
    if (editingGuestId) { const g = getGuestById(editingGuestId); if (g) { g.name = name; g.tags = tags; g.description = desc; } }
    else { guests.push({ id: guestIdCounter++, name, tags, description: desc, tableId: null, seatIndex: null }); }
    closeGuestModal(); renderAll();
  });
  document.getElementById('modalCancel').addEventListener('click', closeGuestModal);
  guestModal.addEventListener('click', (e) => { if (e.target === guestModal) closeGuestModal(); });

  function openTableModal(id) {
    editingTableId = id; const table = getTableById(id);
    if (!table) return;
    document.getElementById('modalTableName').value = table.name;
    document.getElementById('modalTableCapacity').value = table.capacity;
    tableModal.classList.remove('hidden');
  }
  function closeTableModal() { tableModal.classList.add('hidden'); editingTableId = null; }
  document.getElementById('tableModalSave').addEventListener('click', () => {
    const table = getTableById(editingTableId); if (!table) return;
    const nc = parseInt(document.getElementById('modalTableCapacity').value);
    if (table.guestIds.filter(Boolean).length > nc) { alert('Нельзя уменьшить: за столом больше гостей'); return; }
    table.name = document.getElementById('modalTableName').value.trim() || table.name;
    table.capacity = nc;
    if (table.guestIds.length > nc) table.guestIds = table.guestIds.slice(0, nc);
    else while (table.guestIds.length < nc) table.guestIds.push(null);
    closeTableModal(); renderAll();
  });
  document.getElementById('tableModalDelete').addEventListener('click', () => {
    const table = getTableById(editingTableId); if (!table) return;
    table.guestIds.forEach(gid => { if (gid) { const g = getGuestById(gid); if (g) { g.tableId = null; g.seatIndex = null; } } });
    tables = tables.filter(t => t.id !== editingTableId);
    if (selectedTableId === editingTableId) { selectedTableId = null; tableScaleControls.style.display = 'none'; }
    closeTableModal(); renderAll();
  });
  document.getElementById('tableModalCancel').addEventListener('click', closeTableModal);
  tableModal.addEventListener('click', (e) => { if (e.target === tableModal) closeTableModal(); });

  // ============ КНОПКИ ============
  addGuestSidebarBtn.addEventListener('click', () => openGuestModal(null));
  addTableBtn.addEventListener('click', () => {
    const tn = { round:'Круглый', rect:'Прямоугольный', square:'Квадратный', ushape:'П-образный' };
    tables.push({ id: tableIdCounter++, name: tn[selectedShape]+' '+(tables.length+1), type: selectedShape, capacity: 6, x: 60+tables.length*30, y: 250+tables.length*20, guestIds: new Array(6).fill(null), scale: 1, customSeatOffsets: {} });
    renderAll();
  });
  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => { shapeButtons.forEach(b => b.classList.remove('active')); btn.classList.add('active'); selectedShape = btn.dataset.shape; });
  });
  guestSearch.addEventListener('input', renderAll);
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());

  // ============ СОХРАНЕНИЕ / ЗАГРУЗКА ============
  function exportData() {
    const data = {
      guests: guests.map(g => ({ id:g.id, name:g.name, tags:g.tags, description:g.description, tableId:g.tableId, seatIndex:g.seatIndex })),
      tables: tables.map(t => ({ id:t.id, name:t.name, type:t.type, capacity:t.capacity, x:t.x, y:t.y, guestIds:t.guestIds, scale:t.scale, customSeatOffsets:t.customSeatOffsets||{} })),
      guestIdCounter, tableIdCounter
    };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'seating-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = function(e) {
      try {
        const d = JSON.parse(e.target.result);
        guests = d.guests||[]; tables = d.tables||[];
        guestIdCounter = d.guestIdCounter||guests.length+1; tableIdCounter = d.tableIdCounter||tables.length+1;
        selectedTableId = null; tableScaleControls.style.display = 'none'; moveMode = null;
        renderAll();
      } catch(err) { alert('Ошибка файла'); }
    };
    r.readAsText(file);
  }
  saveBtn.addEventListener('click', exportData);
  loadBtn.addEventListener('click', () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='.json'; inp.addEventListener('change', e => { if(e.target.files[0]) importData(e.target.files[0]); }); inp.click(); });

  // ============ ИНИЦИАЛИЗАЦИЯ ============
  initDemoData();
  renderAll();
});