/* ============================================
   Tasktics - Modal & form control
   Exposes: window.Modal
   Depends: window.State, window.Recurrence (runtime)
   ============================================ */

(function () {
  'use strict';

  // ---- RECURRENCE FORM ----
  function setRecurrenceFormVisibility() {
    const type = document.getElementById('task-recurrence-type').value;
    document.getElementById('recurrence-daily-options').classList.toggle('hidden', type !== 'daily');
    document.getElementById('recurrence-weekly-options').classList.toggle('hidden', type !== 'weekly');
    document.getElementById('recurrence-monthly-options').classList.toggle('hidden', type !== 'monthly');
  }

  function resetRecurrenceForm() {
    document.getElementById('task-recurrence-type').value = 'none';
    document.getElementById('task-recurrence-dow').value = '5';
    document.getElementById('task-recurrence-dom').value = '-1';
    document.getElementById('task-recurrence-skip-weekends').value = 'false';
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
    document.getElementById('task-recurrence-skip-weekends').value =
      recurrence.type === 'daily' && recurrence.skipWeekends ? 'true' : 'false';
    setRecurrenceFormVisibility();
  }

  function readRecurrenceForm() {
    const type = document.getElementById('task-recurrence-type').value;
    if (type === 'none') return null;
    if (type === 'daily') {
      return {
        type: 'daily',
        dayOfWeek: null,
        dayOfMonth: null,
        skipWeekends: document.getElementById('task-recurrence-skip-weekends').value === 'true',
      };
    }
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

  // ---- TASK MODAL ----
  function openPanel() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('hidden');
    modal.offsetHeight; // force reflow
    modal.classList.add('open');
    setTimeout(() => document.getElementById('task-title').focus(), 50);
  }

  function openCreateModal() {
    document.getElementById('task-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-category').value = '';
    document.getElementById('task-priority').value = 'NRM';
    document.getElementById('task-status').value = 'active';
    document.getElementById('task-date').value = State.todayISO();
    document.getElementById('task-notes').value = '';
    resetRecurrenceForm();
    document.getElementById('task-delete-btn').classList.add('hidden');
    document.querySelector('.modal-title').textContent = 'NEW TASK';
    openPanel();
  }

  function openEditModal(id) {
    const task = State.tasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-date').value = task.scheduledDate || '';
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

  // ---- MILESTONE MODAL ----
  function openMilestoneModal(mode, ms, presetDate) {
    const modal = document.getElementById('milestone-modal');
    document.getElementById('milestone-modal-title').textContent =
      mode === 'edit' ? 'EDIT — ' + ms.id : 'NEW MILESTONE';
    document.getElementById('milestone-id').value    = ms ? ms.id : '';
    document.getElementById('milestone-title').value = ms ? ms.title : '';
    document.getElementById('milestone-date').value  = ms ? ms.dueDate : (presetDate || State.todayISO());
    document.getElementById('milestone-notes').value = ms ? (ms.notes || '') : '';
    const deleteBtn = document.getElementById('milestone-delete-btn');
    deleteBtn.classList.toggle('hidden', mode !== 'edit');
    modal.classList.remove('hidden');
    modal.offsetHeight; // force reflow
    modal.classList.add('open');
    setTimeout(() => document.getElementById('milestone-title').focus(), 50);
  }

  function closeMilestoneModal() {
    const modal = document.getElementById('milestone-modal');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }

  // ---- EXPORT ----
  window.Modal = {
    setRecurrenceFormVisibility,
    readRecurrenceForm,
    openCreateModal,
    openEditModal,
    closeModal,
    openMilestoneModal,
    closeMilestoneModal,
  };
})();
