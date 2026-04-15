/* ============================================
   Tasktics - DOM rendering
   Exposes: window.Render
   Depends: window.State, window.Recurrence, window.Modal (runtime), window.DragDrop (runtime)
   ============================================ */

(function () {
  'use strict';

  const DAY_NAMES    = ['日', '月', '火', '水', '木', '金', '土'];
  const DAY_NAMES_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---- STRIP CARD ----
  function createStripCard(task) {
    const card = document.createElement('div');
    card.className = `strip-card priority-${task.priority} status-${task.status}`;
    card.dataset.id = task.id;

    const isCleared = task.status === 'cleared';
    const hasRecurrence = !!task.recurrence;
    const { formatDateShort } = window.Recurrence;
    const dateLabel = task.scheduledDate ? formatDateShort(task.scheduledDate) : '';

    card.innerHTML = `
      <div class="strip-top">
        <span class="strip-id">${task.id}</span>
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

    // ドラッグ開始の保留
    card.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.strip-done')) return;
      const rect = card.getBoundingClientRect();
      window.DragDrop.setPending({
        taskId: task.id,
        card,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      });
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('.strip-done')) return;
      window.Modal.openEditModal(task.id);
    });

    card.querySelector('.strip-done').addEventListener('click', (e) => {
      e.stopPropagation();
      if (task.status === 'cleared') {
        State.updateTask(task.id, { status: 'active' });
      } else {
        State.updateTask(task.id, { status: 'cleared' });
        State.spawnNextRecurrence(task);
      }
      window.App.render();
    });

    return card;
  }

  // ---- STATS ----
  function updateStats() {
    const all = State.tasks;
    document.getElementById('stat-act').textContent = all.filter(t => t.status === 'active').length;
    document.getElementById('stat-nxt').textContent = all.filter(t => t.status === 'next').length;
    document.getElementById('stat-hld').textContent = all.filter(t => t.status === 'holding').length;
    document.getElementById('stat-clr').textContent = all.filter(t => t.status === 'cleared').length;
    document.getElementById('stat-urg').textContent = all.filter(t => t.priority === 'URG' && t.status !== 'cleared').length;

    const filtered = State.getFilteredTasks();
    ['active', 'next', 'holding', 'cleared'].forEach(status => {
      const el = document.getElementById('col-count-' + status);
      if (el) el.textContent = filtered.filter(t => t.status === status).length;
    });
  }

  // ---- CATEGORIES ----
  function getCategories() {
    const cats = new Set();
    State.tasks.forEach(t => { if (t.category) cats.add(t.category); });
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

    const dl = document.getElementById('category-list');
    dl.innerHTML = '';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      dl.appendChild(opt);
    });
  }

  // ---- KANBAN ----
  function renderKanban() {
    const filtered = State.getFilteredTasks();
    const CLEARED_PREVIEW_COUNT = State.CLEARED_PREVIEW_COUNT;

    ['active', 'next', 'holding', 'cleared'].forEach(status => {
      const col = document.querySelector(`.column-body[data-status="${status}"]`);
      col.innerHTML = '';
      const items = filtered
        .filter(t => t.status === status)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      if (status === 'cleared' && !State.clearedExpanded && items.length > CLEARED_PREVIEW_COUNT) {
        items.slice(0, CLEARED_PREVIEW_COUNT).forEach(t => col.appendChild(createStripCard(t)));
        const moreBtn = document.createElement('button');
        moreBtn.className = 'cleared-show-more';
        moreBtn.textContent = `▼ SHOW MORE (${items.length - CLEARED_PREVIEW_COUNT})`;
        moreBtn.addEventListener('click', () => {
          State.clearedExpanded = true;
          renderKanban();
        });
        col.appendChild(moreBtn);
      } else {
        items.forEach(t => col.appendChild(createStripCard(t)));
      }
    });
  }

  // ---- TIMELINE ----
  function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon + State.weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function getTaskDateKey(task) {
    if (task.scheduledDate) return task.scheduledDate;
    return State.todayISO();
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
      <button class="week-nav-btn week-nav-today${State.weekOffset === 0 ? ' current' : ''}" id="week-today">● TODAY</button>
      <button class="week-nav-btn" id="week-next">NEXT ▷</button>
    `;

    document.getElementById('week-prev').addEventListener('click', () => { State.weekOffset--; window.App.render(); });
    document.getElementById('week-next').addEventListener('click', () => { State.weekOffset++; window.App.render(); });
    document.getElementById('week-today').addEventListener('click', () => {
      if (State.weekOffset !== 0) { State.weekOffset = 0; window.App.render(); }
    });
  }

  function renderTimeline() {
    const { formatDateISO } = window.Recurrence;
    const grid = document.getElementById('timeline-week-grid');
    grid.innerHTML = '';

    renderWeekNav();

    const weekDays = getWeekRange();
    const todayStr = State.todayISO();
    const filtered = State.getFilteredTasks().filter(t => t.status !== 'cleared');

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

      const header = document.createElement('div');
      header.className = 'week-day-header';
      header.innerHTML = `
        <span class="day-name">${DAY_NAMES_EN[dayIdx]} ${DAY_NAMES[dayIdx]}</span>
        <span class="day-date">${dayDate.getMonth() + 1}/${dayDate.getDate()}</span>
      `;
      col.appendChild(header);

      const body = document.createElement('div');
      body.className = 'week-day-body';

      // Milestones for this day
      const dayMilestones = State.milestones.filter(m => m.dueDate === dateStr);
      dayMilestones.forEach(ms => {
        const el = document.createElement('div');
        el.className = 'milestone-marker';
        el.dataset.id = ms.id;
        el.innerHTML = `<span class="ms-diamond">◆</span><span class="ms-title">${escapeHtml(ms.title)}</span>`;
        el.addEventListener('click', () => window.Modal.openMilestoneModal('edit', ms));
        body.appendChild(el);
      });

      const dayTasks = (tasksByDate[dateStr] || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      if (dayTasks.length === 0 && dayMilestones.length === 0) {
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
            <div class="week-task-title">${hasRec ? '<span class="week-task-recurrence">↻</span>' : ''}${escapeHtml(task.title)}</div>
            <div class="week-task-meta">
              ${task.category ? `<span class="week-task-cat">${escapeHtml(task.category)}</span>` : ''}
              <span class="week-task-pri ${task.priority}">${task.priority}</span>
            </div>
          `;

          item.addEventListener('click', () => window.Modal.openEditModal(task.id));
          body.appendChild(item);
        });
      }

      col.appendChild(body);
      grid.appendChild(col);
    });
  }

  // ---- EXPORT ----
  window.Render = {
    escapeHtml,
    createStripCard,
    updateStats,
    updateCategoryFilter,
    renderKanban,
    renderTimeline,
    getWeekRange,
  };
})();
