/* ============================================
   Tasktics - Entry point & initialization
   Depends: window.State, window.Render, window.Modal, window.DragDrop
   ============================================ */

(function () {
  'use strict';

  // ---- VERSION ----
  async function loadVersion() {
    try {
      let version;
      if (window.taskticsBridge && window.taskticsBridge.getVersion) {
        version = await window.taskticsBridge.getVersion();
      } else {
        const res = await fetch('/api/version');
        version = (await res.json()).version;
      }
      document.getElementById('app-version').textContent = `v${version}`;
    } catch (_) { /* ignore — header version is cosmetic */ }
  }

  // ---- CLOCK ----
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = `${h}:${m}:${s}`;
  }

  // ---- VIEW TOGGLE ----
  let currentView = 'hybrid';

  function setView(view) {
    currentView = view;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-view="${view}"]`).classList.add('active');

    const timeline = document.getElementById('timeline-section');
    const kanban   = document.getElementById('kanban-section');

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
    Render.updateStats();
    Render.updateCategoryFilter();
    Render.renderKanban();
    Render.renderTimeline();
  }

  // ---- INIT ----
  async function init() {
    await State.loadData();
    State.processRecurringTasks();

    // Expose render for other modules (DragDrop, Render's week nav)
    window.App = { render };

    loadVersion();
    updateClock();
    setInterval(updateClock, 1000);

    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    // Filters
    document.getElementById('filter-priority').addEventListener('change', (e) => {
      State.filterPriority = e.target.value;
      render();
    });
    document.getElementById('filter-category').addEventListener('change', (e) => {
      State.filterCategory = e.target.value;
      render();
    });

    // Task buttons
    document.getElementById('btn-add-task').addEventListener('click', Modal.openCreateModal);

    // Task modal close
    document.getElementById('modal-close').addEventListener('click', Modal.closeModal);
    document.getElementById('panel-overlay').addEventListener('click', Modal.closeModal);

    // Milestone button
    document.getElementById('btn-add-milestone').addEventListener('click', () => Modal.openMilestoneModal('create', null));

    // Milestone modal close
    document.getElementById('milestone-modal-close').addEventListener('click', Modal.closeMilestoneModal);
    document.getElementById('milestone-panel-overlay').addEventListener('click', Modal.closeMilestoneModal);

    // Escape / Cmd+Enter
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Modal.closeModal();
        Modal.closeMilestoneModal();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const taskPanel = document.getElementById('task-modal');
        if (taskPanel && taskPanel.classList.contains('open')) {
          document.getElementById('task-form').requestSubmit();
        }
        const msPanel = document.getElementById('milestone-modal');
        if (msPanel && msPanel.classList.contains('open')) {
          document.getElementById('milestone-form').requestSubmit();
        }
      }
    });

    // Recurrence type toggle
    document.getElementById('task-recurrence-type').addEventListener('change', Modal.setRecurrenceFormVisibility);

    // Task form submit
    document.getElementById('task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('task-id').value;
      const recurrence = Modal.readRecurrenceForm();
      const dateVal = document.getElementById('task-date').value;
      const data = {
        title:         document.getElementById('task-title').value.trim(),
        category:      document.getElementById('task-category').value.trim(),
        priority:      document.getElementById('task-priority').value,
        status:        document.getElementById('task-status').value,
        notes:         document.getElementById('task-notes').value.trim(),
        recurrence,
        scheduledDate: dateVal || null,
      };
      if (!data.title) return;

      if (id) {
        if (recurrence && !data.scheduledDate) {
          data.scheduledDate = calcFirstScheduledDate(recurrence);
        }
        if (!recurrence) data.recurrenceGroupId = null;
        State.updateTask(id, data);
      } else {
        if (recurrence && !data.scheduledDate) {
          data.scheduledDate = calcFirstScheduledDate(recurrence);
        }
        if (!data.scheduledDate) data.scheduledDate = State.todayISO();
        const newTask = State.createTask(data);
        if (recurrence) State.updateTask(newTask.id, { recurrenceGroupId: newTask.id });
      }
      Modal.closeModal();
      render();
    });

    // Milestone form submit
    document.getElementById('milestone-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('milestone-id').value;
      const data = {
        title:   document.getElementById('milestone-title').value.trim(),
        dueDate: document.getElementById('milestone-date').value,
        notes:   document.getElementById('milestone-notes').value.trim(),
      };
      if (!data.title || !data.dueDate) return;
      if (id) {
        State.updateMilestone(id, data);
      } else {
        State.createMilestone(data);
      }
      Modal.closeMilestoneModal();
      Render.renderTimeline();
    });

    // Milestone delete
    document.getElementById('milestone-delete-btn').addEventListener('click', () => {
      const id = document.getElementById('milestone-id').value;
      if (!id) return;
      document.getElementById('delete-confirm').classList.remove('hidden');
      document.getElementById('delete-ok-btn').onclick = () => {
        document.getElementById('delete-confirm').classList.add('hidden');
        State.deleteMilestone(id);
        Modal.closeMilestoneModal();
        Render.renderTimeline();
      };
      document.getElementById('delete-cancel-btn').onclick = () => {
        document.getElementById('delete-confirm').classList.add('hidden');
      };
    });

    // Purge cleared
    document.getElementById('btn-purge-cleared').addEventListener('click', () => {
      const count = State.tasks.filter(t => t.status === 'cleared').length;
      if (count === 0) return;
      if (confirm(`PURGE ALL CLEARED?\n${count}件の完了タスクを削除します。`)) {
        State.purgeCleared();
        State.clearedExpanded = false;
        render();
      }
    });

    // Task delete
    document.getElementById('task-delete-btn').addEventListener('click', () => {
      const id = document.getElementById('task-id').value;
      if (!id) return;
      document.getElementById('delete-confirm').classList.remove('hidden');
      document.getElementById('delete-ok-btn').onclick = () => {
        document.getElementById('delete-confirm').classList.add('hidden');
        State.deleteTask(id);
        Modal.closeModal();
        render();
      };
      document.getElementById('delete-cancel-btn').onclick = () => {
        document.getElementById('delete-confirm').classList.add('hidden');
      };
    });

    render();
    DragDrop.setupDragDrop();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
