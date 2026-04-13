/* ============================================
   TASKTICS - Application Logic
   ============================================ */

(function () {
  'use strict';

  // ---- DATA ----
  const API_URL = '/api/tasks';

  let tasks = [];
  let idCounter = 0;
  let currentView = 'hybrid';
  let filterPriority = 'all';
  let filterCategory = 'all';
  let _saveTimer = null;
  let weekOffset = 0; // 0 = current week, -1 = last week, +1 = next week

  async function loadData() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      tasks = data.tasks || [];
      idCounter = data.idCounter || 0;
    } catch (err) {
      console.error('Failed to load data:', err);
      tasks = [];
      idCounter = 0;
    }
  }

  function saveData() {
    // Debounced write — batch rapid changes into a single request
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, idCounter }),
      }).catch(err => console.error('Failed to save data:', err));
    }, 300);
  }

  function generateId() {
    idCounter++;
    saveData();
    return 'FS' + String(idCounter).padStart(4, '0');
  }

  function createTask(data) {
    const task = {
      id: generateId(),
      title: data.title,
      category: data.category || '',
      priority: data.priority || 'NRM',
      status: data.status || 'active',
      time: data.time || '09:00',
      notes: data.notes || '',
      createdAt: Date.now(),
      recurrence: data.recurrence || null,
      scheduledDate: data.scheduledDate || null,
      recurrenceGroupId: data.recurrenceGroupId || null,
    };
    tasks.push(task);
    saveData();
    return task;
  }

  function updateTask(id, data) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    Object.assign(task, data);
    saveData();
  }

  function deleteTask(id) {
    stopTimerInterval(id);
    tasks = tasks.filter(t => t.id !== id);
    saveData();
  }

  function getFilteredTasks() {
    return tasks.filter(t => {
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      return true;
    });
  }

  // ---- RECURRENCE ----
  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function todayISO() {
    return formatDateISO(new Date());
  }

  function formatDateShort(isoStr) {
    if (!isoStr) return '';
    const [, m, d] = isoStr.split('-');
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
  }

  function calcNextWeeklyDate(fromDateStr, dayOfWeek) {
    const current = new Date(fromDateStr + 'T00:00:00');
    const diff = (dayOfWeek - current.getDay() + 7) % 7 || 7;
    const next = new Date(current);
    next.setDate(next.getDate() + diff);
    return formatDateISO(next);
  }

  function calcNextMonthlyDate(fromDateStr, dayOfMonth) {
    const current = new Date(fromDateStr + 'T00:00:00');
    let nextMonth = current.getMonth() + 1;
    let nextYear = current.getFullYear();
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }

    if (dayOfMonth === -1) {
      return formatDateISO(new Date(nextYear, nextMonth + 1, 0));
    }
    const daysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const actualDay = Math.min(dayOfMonth, daysInMonth);
    return formatDateISO(new Date(nextYear, nextMonth, actualDay));
  }

  function getNextOccurrenceDate(recurrence, fromDateStr) {
    if (!recurrence) return null;
    if (recurrence.type === 'weekly') {
      return calcNextWeeklyDate(fromDateStr, recurrence.dayOfWeek);
    }
    if (recurrence.type === 'monthly') {
      return calcNextMonthlyDate(fromDateStr, recurrence.dayOfMonth);
    }
    return null;
  }

  function calcFirstScheduledDate(recurrence) {
    const today = todayISO();
    const todayDate = new Date(today + 'T00:00:00');

    if (recurrence.type === 'weekly') {
      const diff = (recurrence.dayOfWeek - todayDate.getDay() + 7) % 7;
      if (diff === 0) return today;
      const next = new Date(todayDate);
      next.setDate(next.getDate() + diff);
      return formatDateISO(next);
    }
    if (recurrence.type === 'monthly') {
      if (recurrence.dayOfMonth === -1) {
        const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
        if (todayDate.getDate() <= endOfMonth.getDate()) {
          return formatDateISO(endOfMonth);
        }
        return calcNextMonthlyDate(today, -1);
      }
      const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(recurrence.dayOfMonth, daysInMonth);
      if (todayDate.getDate() <= targetDay) {
        return formatDateISO(new Date(todayDate.getFullYear(), todayDate.getMonth(), targetDay));
      }
      return calcNextMonthlyDate(today, recurrence.dayOfMonth);
    }
    return today;
  }

  function spawnNextRecurrence(task) {
    if (!task.recurrence) return;
    const fromDate = task.scheduledDate || todayISO();
    let nextDate = getNextOccurrenceDate(task.recurrence, fromDate);

    // Ensure next date is in the future
    const today = todayISO();
    while (nextDate && nextDate < today) {
      nextDate = getNextOccurrenceDate(task.recurrence, nextDate);
    }

    if (!nextDate) return;

    // Check if this next occurrence already exists
    const groupId = task.recurrenceGroupId || task.id;
    const alreadyExists = tasks.some(t =>
      t.recurrenceGroupId === groupId &&
      t.scheduledDate === nextDate &&
      t.status !== 'cleared'
    );
    if (alreadyExists) return;

    createTask({
      title: task.title,
      category: task.category,
      priority: task.priority,
      status: 'next',
      time: task.time,
      notes: task.notes,
      recurrence: { ...task.recurrence },
      scheduledDate: nextDate,
      recurrenceGroupId: groupId,
    });
  }

  function processRecurringTasks() {
    const today = todayISO();
    const clearedRecurring = tasks.filter(t =>
      t.recurrence && t.status === 'cleared' && t.scheduledDate
    );
    clearedRecurring.forEach(t => {
      // Check if there's already a non-cleared instance in this group
      const groupId = t.recurrenceGroupId || t.id;
      const hasActiveInstance = tasks.some(other =>
        other.id !== t.id &&
        other.recurrenceGroupId === groupId &&
        other.status !== 'cleared'
      );
      if (!hasActiveInstance) {
        spawnNextRecurrence(t);
      }
    });
  }

  // ---- CLOCK ----
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = `${h}:${m}:${s}`;
  }

  // ---- STATS ----
  function updateStats() {
    const all = tasks;
    document.getElementById('stat-act').textContent = all.filter(t => t.status === 'active').length;
    document.getElementById('stat-nxt').textContent = all.filter(t => t.status === 'next').length;
    document.getElementById('stat-hld').textContent = all.filter(t => t.status === 'holding').length;
    document.getElementById('stat-clr').textContent = all.filter(t => t.status === 'cleared').length;
    document.getElementById('stat-urg').textContent = all.filter(t => t.priority === 'URG' && t.status !== 'cleared').length;

    // Column counts
    const filtered = getFilteredTasks();
    ['active', 'next', 'holding', 'cleared'].forEach(status => {
      const el = document.getElementById('col-count-' + status);
      if (el) el.textContent = filtered.filter(t => t.status === status).length;
    });
  }

  // ---- CATEGORIES ----
  function getCategories() {
    const cats = new Set();
    tasks.forEach(t => { if (t.category) cats.add(t.category); });
    return Array.from(cats).sort();
  }

  function updateCategoryFilter() {
    const sel = document.getElementById('filter-category');
    const current = sel.value;
    const cats = getCategories();
    sel.innerHTML = '<option value="all">ALL CAT</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
    sel.value = current;

    // Update datalist
    const dl = document.getElementById('category-list');
    dl.innerHTML = '';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      dl.appendChild(opt);
    });
  }

  // ---- RENDER CARDS ----
  function createStripCard(task) {
    const card = document.createElement('div');
    card.className = `strip-card priority-${task.priority} status-${task.status}`;
    card.dataset.id = task.id;
    card.draggable = true;

    const isCleared = task.status === 'cleared';

    const hasRecurrence = !!task.recurrence;
    const dateLabel = task.scheduledDate ? formatDateShort(task.scheduledDate) : '';

    card.innerHTML = `
      <div class="strip-top">
        <span class="strip-id">${task.id}</span>
        <span class="strip-time">${task.time}</span>
        ${dateLabel ? `<span class="strip-date">${dateLabel}</span>` : ''}
        <span class="strip-priority ${task.priority}">${task.priority}</span>
      </div>
      <div class="strip-title">${hasRecurrence ? '<span class="strip-recurrence" title="繰り返しタスク">↻</span>' : ''}${escapeHtml(task.title)}</div>
      <div class="strip-bottom">
        <span class="strip-category">${escapeHtml(task.category)}</span>
        <button class="strip-done ${isCleared ? '' : 'not-done'}" data-id="${task.id}" title="${isCleared ? '未完了に戻す' : '完了にする'}">
          ${isCleared ? '✓' : '○'}
        </button>
      </div>
    `;

    // Drag
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    // Click to edit
    card.addEventListener('click', (e) => {
      if (e.target.closest('.strip-done')) return;
      openEditModal(task.id);
    });

    // Done toggle
    card.querySelector('.strip-done').addEventListener('click', (e) => {
      e.stopPropagation();
      if (task.status === 'cleared') {
        updateTask(task.id, { status: 'active', clearedAt: null });
      } else {
        updateTask(task.id, { status: 'cleared' });
        spawnNextRecurrence(task);
      }
      render();
    });

    return card;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---- RENDER KANBAN ----
  function renderKanban() {
    const filtered = getFilteredTasks();

    ['active', 'next', 'holding', 'cleared'].forEach(status => {
      const col = document.querySelector(`.column-body[data-status="${status}"]`);
      col.innerHTML = '';
      let items = filtered
        .filter(t => t.status === status)
        .sort((a, b) => {
          if (status === 'cleared') {
            return (b.clearedAt || b.createdAt) - (a.clearedAt || a.createdAt);
          }
          const priOrder = { URG: 0, HI: 1, NRM: 2, LO: 3 };
          return (priOrder[a.priority] ?? 2) - (priOrder[b.priority] ?? 2) || a.createdAt - b.createdAt;
        });

      const totalCount = items.length;

      if (status === 'cleared' && !clearedExpanded && totalCount > CLEARED_PREVIEW_COUNT) {
        items = items.slice(0, CLEARED_PREVIEW_COUNT);
      }

      items.forEach(t => col.appendChild(createStripCard(t)));

      if (status === 'cleared' && totalCount > CLEARED_PREVIEW_COUNT) {
        const toggle = document.createElement('div');
        toggle.className = 'cleared-toggle-bar';
        if (clearedExpanded) {
          toggle.innerHTML = '<span class="toggle-icon">▲</span> COLLAPSE';
        } else {
          toggle.innerHTML = `<span class="toggle-icon">▼</span> SHOW ALL <span class="toggle-count">${totalCount}</span>`;
        }
        toggle.addEventListener('click', () => {
          clearedExpanded = !clearedExpanded;
          render();
        });
        col.appendChild(toggle);
      }
    });
  }

  // ---- RENDER TIMELINE (WEEKLY) ----
  const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];
  const DAY_NAMES_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  let weekOffset = 0;
  let clearedExpanded = false;
  const CLEARED_PREVIEW_COUNT = 5;

  function getWeekRange() {
    // Get Monday-Sunday of the week offset by weekOffset
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function updateWeekTodayBtn() {
    const btn = document.getElementById('week-today');
    if (weekOffset === 0) {
      btn.classList.add('is-current');
    } else {
      btn.classList.remove('is-current');
    }
  }

  function getTaskDateKey(task) {
    if (task.scheduledDate) return task.scheduledDate;
    return todayISO();
  }

  function renderWeekNav() {
    const container = document.getElementById('timeline-container');
    let nav = document.getElementById('week-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'week-nav';
      container.insertBefore(nav, container.firstChild);
    }

    nav.innerHTML = `
      <button class="week-nav-btn" id="week-prev">◁ PREV</button>
      <button class="week-nav-btn week-nav-today${weekOffset === 0 ? ' current' : ''}" id="week-today">● TODAY</button>
      <button class="week-nav-btn" id="week-next">NEXT ▷</button>
    `;

    document.getElementById('week-prev').addEventListener('click', () => { weekOffset--; render(); });
    document.getElementById('week-next').addEventListener('click', () => { weekOffset++; render(); });
    document.getElementById('week-today').addEventListener('click', () => { if (weekOffset !== 0) { weekOffset = 0; render(); } });
  }

  function renderTimeline() {
    const grid = document.getElementById('timeline-week-grid');
    grid.innerHTML = '';

    renderWeekNav();

    const weekDays = getWeekRange();
    const todayStr = todayISO();
    const filtered = getFilteredTasks().filter(t => t.status !== 'cleared');

    // Group tasks by date key
    const tasksByDate = {};
    filtered.forEach(task => {
      const dateKey = getTaskDateKey(task);
      if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
      tasksByDate[dateKey].push(task);
    });

    weekDays.forEach(dayDate => {
      const dateStr = formatDateISO(dayDate);
      const dayIdx = dayDate.getDay();
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;

      const col = document.createElement('div');
      col.className = 'week-day-col' + (isToday ? ' is-today' : '') + (isPast && !isToday ? ' is-past' : '');

      // Header
      const header = document.createElement('div');
      header.className = 'week-day-header';
      header.innerHTML = `
        <span class="day-name">${DAY_NAMES_EN[dayIdx]} ${DAY_NAMES[dayIdx]}</span>
        <span class="day-date">${dayDate.getMonth() + 1}/${dayDate.getDate()}</span>
      `;
      col.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.className = 'week-day-body';

      const dayTasks = (tasksByDate[dateStr] || [])
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

      if (dayTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'week-day-empty';
        empty.textContent = '—';
        body.appendChild(empty);
      } else {
        dayTasks.forEach(task => {
          const item = document.createElement('div');
          item.className = `week-task-item priority-${task.priority}`;
          item.title = task.title;

          const hasRec = !!task.recurrence;
          item.innerHTML = `
            <div class="week-task-time">${task.time || ''}</div>
            <div class="week-task-title">${hasRec ? '<span class="week-task-recurrence">↻</span>' : ''}${escapeHtml(task.title)}</div>
            <div class="week-task-meta">
              ${task.category ? `<span class="week-task-cat">${escapeHtml(task.category)}</span>` : ''}
              <span class="week-task-pri ${task.priority}">${task.priority}</span>
            </div>
          `;

          item.addEventListener('click', () => openEditModal(task.id));
          body.appendChild(item);
        });
      }

      col.appendChild(body);
      grid.appendChild(col);
    });
  }

  // ---- DRAG & DROP ----
  function setupDragDrop() {
    document.querySelectorAll('.column-body').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
          updateTask(taskId, { status: newStatus });
          if (newStatus === 'cleared') {
            spawnNextRecurrence(task);
          }
          render();
        }
      });
    });
  }

  // ---- MODAL ----
  function setRecurrenceFormVisibility() {
    const type = document.getElementById('task-recurrence-type').value;
    document.getElementById('recurrence-weekly-options').classList.toggle('hidden', type !== 'weekly');
    document.getElementById('recurrence-monthly-options').classList.toggle('hidden', type !== 'monthly');
  }

  function resetRecurrenceForm() {
    document.getElementById('task-recurrence-type').value = 'none';
    document.getElementById('task-recurrence-dow').value = '5'; // Friday default
    document.getElementById('task-recurrence-dom').value = '-1'; // End of month default
    setRecurrenceFormVisibility();
  }

  function populateRecurrenceForm(recurrence) {
    if (!recurrence) {
      resetRecurrenceForm();
      return;
    }
    document.getElementById('task-recurrence-type').value = recurrence.type;
    if (recurrence.type === 'weekly' && recurrence.dayOfWeek != null) {
      document.getElementById('task-recurrence-dow').value = String(recurrence.dayOfWeek);
    }
    if (recurrence.type === 'monthly' && recurrence.dayOfMonth != null) {
      document.getElementById('task-recurrence-dom').value = String(recurrence.dayOfMonth);
    }
    setRecurrenceFormVisibility();
  }

  function readRecurrenceForm() {
    const type = document.getElementById('task-recurrence-type').value;
    if (type === 'none') return null;
    if (type === 'weekly') {
      return {
        type: 'weekly',
        dayOfWeek: parseInt(document.getElementById('task-recurrence-dow').value, 10),
        dayOfMonth: null,
      };
    }
    if (type === 'monthly') {
      return {
        type: 'monthly',
        dayOfWeek: null,
        dayOfMonth: parseInt(document.getElementById('task-recurrence-dom').value, 10),
      };
    }
    return null;
  }

  function openPanel() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('hidden');
    // Force reflow so the transition triggers
    modal.offsetHeight;
    modal.classList.add('open');
    setTimeout(() => document.getElementById('task-title').focus(), 50);
  }

  function openCreateModal() {
    document.getElementById('task-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-category').value = '';
    document.getElementById('task-priority').value = 'NRM';
    document.getElementById('task-status').value = 'active';
    document.getElementById('task-date').value = todayISO();
    document.getElementById('task-time').value = '09:00';
    document.getElementById('task-notes').value = '';
    resetRecurrenceForm();
    document.getElementById('task-delete-btn').classList.add('hidden');
    document.querySelector('.modal-title').textContent = 'NEW TASK';
    openPanel();
  }

  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-date').value = task.scheduledDate || '';
    document.getElementById('task-time').value = task.time;
    document.getElementById('task-notes').value = task.notes || '';
    populateRecurrenceForm(task.recurrence);
    document.getElementById('task-delete-btn').classList.remove('hidden');
    document.querySelector('.modal-title').textContent = 'EDIT — ' + task.id;
    openPanel();
  }

  function closeModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }

  // ---- VIEW TOGGLE ----
  function setView(view) {
    currentView = view;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-view="${view}"]`).classList.add('active');

    const timeline = document.getElementById('timeline-section');
    const kanban = document.getElementById('kanban-section');

    if (view === 'hybrid') {
      timeline.classList.remove('hidden');
      kanban.style.display = '';
    } else if (view === 'kanban') {
      timeline.classList.add('hidden');
      kanban.style.display = '';
    } else if (view === 'timeline') {
      timeline.classList.remove('hidden');
      kanban.style.display = 'none';
    }
    render();
  }

  // ---- MAIN RENDER ----
  function render() {
    updateStats();
    updateCategoryFilter();
    renderKanban();
    renderTimeline();
    setupDragDrop();
  }

  // ---- INIT ----
  async function init() {
    await loadData();
    processRecurringTasks();

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Week navigation
    document.getElementById('week-prev').addEventListener('click', () => {
      weekOffset--;
      updateWeekTodayBtn();
      renderTimeline();
    });
    document.getElementById('week-next').addEventListener('click', () => {
      weekOffset++;
      updateWeekTodayBtn();
      renderTimeline();
    });
    document.getElementById('week-today').addEventListener('click', () => {
      weekOffset = 0;
      updateWeekTodayBtn();
      renderTimeline();
    });

    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    // Filters
    document.getElementById('filter-priority').addEventListener('change', (e) => {
      filterPriority = e.target.value;
      render();
    });

    document.getElementById('filter-category').addEventListener('change', (e) => {
      filterCategory = e.target.value;
      render();
    });

    // Add task button
    document.getElementById('btn-add-task').addEventListener('click', openCreateModal);

    // Panel close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('panel-overlay').addEventListener('click', closeModal);

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Recurrence type toggle
    document.getElementById('task-recurrence-type').addEventListener('change', setRecurrenceFormVisibility);

    // Form submit
    document.getElementById('task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('task-id').value;
      const recurrence = readRecurrenceForm();
      const dateVal = document.getElementById('task-date').value;
      const data = {
        title: document.getElementById('task-title').value.trim(),
        category: document.getElementById('task-category').value.trim(),
        priority: document.getElementById('task-priority').value,
        status: document.getElementById('task-status').value,
        time: document.getElementById('task-time').value,
        notes: document.getElementById('task-notes').value.trim(),
        recurrence: recurrence,
        scheduledDate: dateVal || null,
      };
      if (!data.title) return;

      if (id) {
        // Editing existing task
        if (recurrence && !data.scheduledDate) {
          data.scheduledDate = calcFirstScheduledDate(recurrence);
        }
        if (!recurrence) {
          data.recurrenceGroupId = null;
        }
        const existing = tasks.find(t => t.id === id);
        if (data.status === 'cleared' && existing && existing.status !== 'cleared') {
          data.clearedAt = Date.now();
        } else if (data.status !== 'cleared' && existing && existing.status === 'cleared') {
          data.clearedAt = null;
        }
        updateTask(id, data);
      } else {
        // Creating new task
        if (recurrence && !data.scheduledDate) {
          data.scheduledDate = calcFirstScheduledDate(recurrence);
        }
        if (!data.scheduledDate) {
          data.scheduledDate = todayISO();
        }
        const newTask = createTask(data);
        if (recurrence) {
          updateTask(newTask.id, { recurrenceGroupId: newTask.id });
        }
      }
      closeModal();
      render();
    });

    // Delete
    document.getElementById('task-delete-btn').addEventListener('click', () => {
      const id = document.getElementById('task-id').value;
      if (id && confirm('このタスクを削除しますか？')) {
        deleteTask(id);
        closeModal();
        render();
      }
    });

    // Add sample tasks if empty
    if (tasks.length === 0) {
      const week = getWeekRange();
      const mon = formatDateISO(week[0]);
      const tue = formatDateISO(week[1]);
      const wed = formatDateISO(week[2]);
      const thu = formatDateISO(week[3]);
      const fri = formatDateISO(week[4]);

      createTask({ title: 'プロジェクト企画書を作成', category: '仕事', priority: 'URG', status: 'active', time: '09:00', scheduledDate: mon });
      createTask({ title: 'メールの返信', category: '仕事', priority: 'NRM', status: 'active', time: '10:00', scheduledDate: mon });
      createTask({ title: 'ミーティング資料準備', category: '仕事', priority: 'HI', status: 'next', time: '11:00', scheduledDate: tue });
      createTask({ title: 'コードレビュー', category: '開発', priority: 'NRM', status: 'next', time: '13:00', scheduledDate: wed });
      createTask({ title: 'デザイン確認待ち', category: '仕事', priority: 'NRM', status: 'holding', time: '14:00', scheduledDate: thu });
      createTask({ title: 'テスト環境の構築', category: '開発', priority: 'LO', status: 'holding', time: '15:00', scheduledDate: thu });

      // Recurring sample: weekly Friday
      const friRec = { type: 'weekly', dayOfWeek: 5, dayOfMonth: null };
      const t = createTask({ title: '週次レポート提出', category: '仕事', priority: 'NRM', status: 'next', time: '17:00', recurrence: friRec, scheduledDate: fri });
      updateTask(t.id, { recurrenceGroupId: t.id });

      // Recurring sample: monthly end
      const monthEndRec = { type: 'monthly', dayOfWeek: null, dayOfMonth: -1 };
      const endDate = calcFirstScheduledDate(monthEndRec);
      const t2 = createTask({ title: '請求書確認', category: '経理', priority: 'HI', status: 'next', time: '10:00', recurrence: monthEndRec, scheduledDate: endDate });
      updateTask(t2.id, { recurrenceGroupId: t2.id });
    }

    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
