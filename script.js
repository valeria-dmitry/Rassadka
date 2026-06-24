document.addEventListener('DOMContentLoaded', () => {

  // ============ СОСТОЯНИЕ ============
  let guests = [];
  let tables = [];
  let selectedShape = 'round';
  let draggedGuestId = null;
  let draggedTableId = null;
  let editingGuestId = null;
  let editingTableId = null;
  let guestIdCounter = 1;
  let tableIdCounter = 1;
  let activeTagFilter = null;

  // ============ DOM ============
  const guestListContainer = document.getElementById('guestListContainer');
  const tagFilterContainer = document.getElementById('tagFilterContainer');
  const hallCanvas = document.getElementById('hallCanvas');
  const guestSearch = document.getElementById('guestSearch');
  const seatedCount = document.getElementById('seatedCount');
  const totalCount = document.getElementById('totalCount');
  const guestModal = document.getElementById('guestModal');
  const tableModal = document.getElementById('tableModal');
  const addGuestSidebarBtn = document.getElementById('addGuestSidebarBtn');
  const addTableBtn = document.getElementById('addTableBtn');
  const shapeButtons = document.querySelectorAll('.btn-shape');

  // ============ ДЕМО-ДАННЫЕ ============
  function initDemoData() {
    guests = [
      { id: guestIdCounter++, name: 'Анна', tags: ['подруга'], description: '', tableId: null },
      { id: guestIdCounter++, name: 'Максим', tags: ['друг'], description: '', tableId: null },
      { id: guestIdCounter++, name: 'Ольга', tags: ['родственник'], description: '', tableId: null },
      { id: guestIdCounter++, name: 'Дмитрий', tags: ['коллега'], description: '', tableId: null },
      { id: guestIdCounter++, name: 'Екатерина', tags: ['подруга', 'свидетель'], description: '', tableId: null },
      { id: guestIdCounter++, name: 'Алексей', tags: ['друг', 'свидетель'], description: '', tableId: null },
      { id: guestIdCounter++, name: 'Мария', tags: ['родственник'], description: '', tableId: null },
      { id: guestIdCounter++, name: 'Иван', tags: ['родственник'], description: '', tableId: null },
    ];
    tables = [
      { id: tableIdCounter++, name: 'Стол 1', type: 'round', capacity: 6, x: 60, y: 60, guestIds: [] },
      { id: tableIdCounter++, name: 'Стол 2', type: 'rect', capacity: 6, x: 320, y: 60, guestIds: [] },
    ];
  }

  // ============ СЕРИАЛИЗАЦИЯ ============
  function getGuestById(id) { return guests.find(g => g.id === id); }
  function getTableById(id) { return tables.find(t => t.id === id); }

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
    if (activeTagFilter) {
      filtered = filtered.filter(g => g.tags.includes(activeTagFilter));
    }

    guestListContainer.innerHTML = '';
    filtered.forEach(guest => {
      const card = document.createElement('div');
      card.className = 'guest-card' + (guest.tableId ? ' seated' : '');
      card.draggable = !guest.tableId;
      card.dataset.guestId = guest.id;

      const tableName = guest.tableId ? getTableById(guest.tableId)?.name || '' : '';

      card.innerHTML = `
        <span class="guest-card-name">${guest.name}</span>
        ${guest.tableId ? `<span class="guest-card-table">🪑 ${tableName}</span>` : ''}
        <span class="guest-card-tags">
          ${guest.tags.map(t => `<span class="guest-card-tag">${t}</span>`).join('')}
        </span>
      `;

      card.addEventListener('click', (e) => {
        if (guest.tableId) {
          // Возврат гостя из-за стола
          const table = getTableById(guest.tableId);
          if (table) table.guestIds = table.guestIds.filter(gid => gid !== guest.id);
          guest.tableId = null;
          renderAll();
        }
      });

      if (!guest.tableId) {
        card.addEventListener('dragstart', (e) => {
          draggedGuestId = guest.id;
          card.classList.add('dragging-card');
          e.dataTransfer.setData('text/plain', guest.id);
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging-card');
          draggedGuestId = null;
        });
      }

      // Двойной клик для редактирования
      card.addEventListener('dblclick', () => openGuestModal(guest.id));

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
      const obj = document.createElement('div');
      obj.className = 'table-object';
      obj.style.left = table.x + 'px';
      obj.style.top = table.y + 'px';
      obj.dataset.tableId = table.id;

      // Визуал стола
      const visual = document.createElement('div');
      visual.className = 'table-visual';
      
      const inner = document.createElement('div');
      inner.className = `table-${table.type}`;
      inner.style.position = 'relative';
      visual.appendChild(inner);

      // Места
      table.guestIds.forEach((gid, index) => {
        const dot = document.createElement('div');
        dot.className = 'seat-dot occupied';
        const guest = getGuestById(gid);
        dot.textContent = guest ? guest.name.charAt(0) : '';
        dot.title = guest ? guest.name : '';
        
        const pos = getSeatPosition(table.type, table.capacity, index);
        dot.style.left = pos.x + 'px';
        dot.style.top = pos.y + 'px';

        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const g = getGuestById(gid);
          if (g) {
            g.tableId = null;
            table.guestIds = table.guestIds.filter(id => id !== gid);
            renderAll();
          }
        });

        inner.appendChild(dot);
      });

      // Пустые места
      for (let i = table.guestIds.length; i < table.capacity; i++) {
        const dot = document.createElement('div');
        dot.className = 'seat-dot';
        dot.textContent = '+';
        const pos = getSeatPosition(table.type, table.capacity, i);
        dot.style.left = pos.x + 'px';
        dot.style.top = pos.y + 'px';

        dot.addEventListener('dragover', (e) => { e.preventDefault(); dot.classList.add('highlight'); });
        dot.addEventListener('dragleave', () => { dot.classList.remove('highlight'); });
        dot.addEventListener('drop', (e) => {
          e.preventDefault();
          dot.classList.remove('highlight');
          if (draggedGuestId !== null) {
            const guest = getGuestById(draggedGuestId);
            if (guest && guest.tableId) {
              const oldTable = getTableById(guest.tableId);
              if (oldTable) oldTable.guestIds = oldTable.guestIds.filter(id => id !== guest.id);
            }
            guest.tableId = table.id;
            table.guestIds.push(guest.id);
            draggedGuestId = null;
            renderAll();
          }
        });

        inner.appendChild(dot);
      }

      // Метка стола
      const label = document.createElement('div');
      label.className = 'table-label';
      const filled = table.guestIds.length;
      label.textContent = `${table.name} (${filled}/${table.capacity})`;
      
      // Полоска загруженности
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

      // Drag & Drop стола
      obj.addEventListener('mousedown', (e) => startDragTable(e, table.id));
      obj.addEventListener('touchstart', (e) => startDragTable(e, table.id), { passive: false });

      // Двойной клик для настроек стола
      obj.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openTableModal(table.id);
      });

      hallCanvas.appendChild(obj);
    });
  }

  function getSeatPosition(type, capacity, index) {
    if (type === 'round') {
      const r = 55;
      const angle = (index / capacity) * 2 * Math.PI - Math.PI / 2;
      return { x: 70 + r * Math.cos(angle), y: 70 + r * Math.sin(angle) };
    }
    if (type === 'rect') {
      const w = 200, h = 80;
      if (capacity <= 4) {
        const positions = [
          { x: w/2, y: -15 }, { x: w + 15, y: h/2 }, { x: w/2, y: h + 15 }, { x: -15, y: h/2 }
        ];
        return positions[index] || { x: w/2, y: h/2 };
      }
      // 6 мест
      const positions = [
        { x: w * 0.25, y: -15 }, { x: w * 0.75, y: -15 },
        { x: w + 15, y: h/2 },
        { x: w * 0.75, y: h + 15 }, { x: w * 0.25, y: h + 15 },
        { x: -15, y: h/2 }
      ];
      return positions[index] || { x: w/2, y: h/2 };
    }
    if (type === 'square') {
      const s = 130;
      const perSide = Math.ceil(capacity / 4);
      const side = index % 4;
      const offset = Math.floor(index / 4) * (s / (perSide + 1)) + s / (perSide + 1);
      const positions = [
        { x: offset, y: -15 },
        { x: s + 15, y: offset },
        { x: s - offset, y: s + 15 },
        { x: -15, y: s - offset }
      ];
      return positions[side] || { x: s/2, y: s/2 };
    }
    if (type === 'ushape') {
      const w = 200, h = 150;
      const positions = [
        { x: -15, y: 20 }, { x: -15, y: h - 20 },
        { x: w/4, y: -15 }, { x: w * 3/4, y: -15 },
        { x: w + 15, y: 20 }, { x: w + 15, y: h - 20 },
        { x: w/4, y: h + 15 }, { x: w * 3/4, y: h + 15 }
      ];
      return positions[index] || { x: w/2, y: h/2 };
    }
    return { x: 70, y: 70 };
  }

  function updateCounters() {
    const seated = guests.filter(g => g.tableId !== null).length;
    seatedCount.textContent = seated;
    totalCount.textContent = guests.length;
  }

  // ============ DRAG TABLE ============
  function startDragTable(e, tableId) {
    if (e.target.closest('.seat-dot')) return;
    e.preventDefault();
    const table = getTableById(tableId);
    if (!table) return;
    draggedTableId = tableId;

    const startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const origX = table.x;
    const origY = table.y;

    const obj = hallCanvas.querySelector(`[data-table-id="${tableId}"]`);
    if (obj) obj.classList.add('dragging-table');

    function onMove(ev) {
      const mx = ev.type.includes('touch') ? ev.touches[0].clientX : ev.clientX;
      const my = ev.type.includes('touch') ? ev.touches[0].clientY : ev.clientY;
      table.x = origX + mx - startX;
      table.y = origY + my - startY;
      if (obj) { obj.style.left = table.x + 'px'; obj.style.top = table.y + 'px'; }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      if (obj) obj.classList.remove('dragging-table');
      draggedTableId = null;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

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
      guests.push({ id: guestIdCounter++, name, tags, description: desc, tableId: null });
    }
    closeGuestModal();
    renderAll();
  });

  document.getElementById('modalCancel').addEventListener('click', closeGuestModal);
  guestModal.addEventListener('click', (e) => { if (e.target === guestModal) closeGuestModal(); });

  // Table modal
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
    if (table.guestIds.length > newCapacity) {
      alert('Нельзя уменьшить вместимость: за столом больше гостей');
      return;
    }
    table.name = document.getElementById('modalTableName').value.trim() || table.name;
    table.capacity = newCapacity;
    closeTableModal();
    renderAll();
  });

  document.getElementById('tableModalDelete').addEventListener('click', () => {
    const table = getTableById(editingTableId);
    if (!table) return;
    table.guestIds.forEach(gid => {
      const g = getGuestById(gid);
      if (g) g.tableId = null;
    });
    tables = tables.filter(t => t.id !== editingTableId);
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
      name: typeNames[selectedShape] + ' ' + tables.length,
      type: selectedShape,
      capacity: 6,
      x: 60 + tables.length * 30,
      y: 250 + tables.length * 20,
      guestIds: []
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

  // ============ GLOBAL DRAG & DROP ============
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());

  // ============ ИНИЦИАЛИЗАЦИЯ ============
  initDemoData();
  renderAll();
});