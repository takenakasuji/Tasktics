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

  // ---- NOTES MARKDOWN ----
  // External links in rendered notes should open in a new window, not replace the app.
  window.DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  function renderNotesHTML(markdown) {
    if (!markdown || !markdown.trim()) return '';
    const html = window.marked.parse(markdown);
    return window.DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
  }

  function setNotesMode(prefix, mode) {
    const rendered = document.getElementById(prefix + '-notes-rendered');
    const textarea = document.getElementById(prefix + '-notes');
    if (mode === 'edit') {
      rendered.classList.add('hidden');
      textarea.classList.remove('hidden');
      setTimeout(() => textarea.focus(), 50);
    } else {
      const html = renderNotesHTML(textarea.value);
      rendered.innerHTML = html || '<span class="notes-empty">— クリックして編集 —</span>';
      rendered.classList.remove('hidden');
      textarea.classList.add('hidden');
    }
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
    setNotesMode('task', 'edit');
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
    setNotesMode('task', 'render');
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
    setNotesMode('milestone', mode === 'edit' ? 'render' : 'edit');
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

  // Click-to-edit on rendered notes
  document.getElementById('task-notes-rendered')
    .addEventListener('click', () => setNotesMode('task', 'edit'));
  document.getElementById('milestone-notes-rendered')
    .addEventListener('click', () => setNotesMode('milestone', 'edit'));

  // ---- NOTES TEXTAREA KEY HANDLERS (Tab / Enter for markdown lists) ----
  function handleNotesTab(textarea, isShift) {
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    const firstLineStart = value.lastIndexOf('\n', start - 1) + 1;
    const selectedText = value.slice(firstLineStart, end);
    const lines = selectedText.split('\n');
    let firstDelta = 0;
    let totalDelta = 0;

    const newLines = lines.map((line, i) => {
      if (isShift) {
        const spaces = line.match(/^ */)[0].length;
        const remove = Math.min(2, spaces);
        if (i === 0) firstDelta = -remove;
        totalDelta -= remove;
        return line.slice(remove);
      }
      if (i === 0) firstDelta = 2;
      totalDelta += 2;
      return '  ' + line;
    });

    const newBlock = newLines.join('\n');
    textarea.value = value.slice(0, firstLineStart) + newBlock + value.slice(end);
    textarea.selectionStart = Math.max(firstLineStart, start + firstDelta);
    textarea.selectionEnd = end + totalDelta;
  }

  // Returns true if the Enter was handled (caller should preventDefault).
  function handleNotesEnter(textarea) {
    if (textarea.selectionStart !== textarea.selectionEnd) return false;
    const pos = textarea.selectionStart;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const lineToCursor = value.slice(lineStart, pos);

    // Checkbox: `- [ ] ` or `- [x] `
    let match = lineToCursor.match(/^(\s*)([-*+]) \[[ xX]\] (.*)$/);
    if (match) {
      const [, indent, marker, rest] = match;
      if (rest.length === 0) {
        textarea.value = value.slice(0, lineStart) + value.slice(pos);
        textarea.selectionStart = textarea.selectionEnd = lineStart;
        return true;
      }
      const insert = '\n' + indent + marker + ' [ ] ';
      textarea.value = value.slice(0, pos) + insert + value.slice(pos);
      textarea.selectionStart = textarea.selectionEnd = pos + insert.length;
      return true;
    }

    // Unordered: `- `, `* `, `+ `
    match = lineToCursor.match(/^(\s*)([-*+]) (.*)$/);
    if (match) {
      const [, indent, marker, rest] = match;
      if (rest.length === 0) {
        textarea.value = value.slice(0, lineStart) + value.slice(pos);
        textarea.selectionStart = textarea.selectionEnd = lineStart;
        return true;
      }
      const insert = '\n' + indent + marker + ' ';
      textarea.value = value.slice(0, pos) + insert + value.slice(pos);
      textarea.selectionStart = textarea.selectionEnd = pos + insert.length;
      return true;
    }

    // Ordered: `1. `, `2. ` ...
    match = lineToCursor.match(/^(\s*)(\d+)\. (.*)$/);
    if (match) {
      const [, indent, num, rest] = match;
      if (rest.length === 0) {
        textarea.value = value.slice(0, lineStart) + value.slice(pos);
        textarea.selectionStart = textarea.selectionEnd = lineStart;
        return true;
      }
      const insert = '\n' + indent + (parseInt(num, 10) + 1) + '. ';
      textarea.value = value.slice(0, pos) + insert + value.slice(pos);
      textarea.selectionStart = textarea.selectionEnd = pos + insert.length;
      return true;
    }

    return false;
  }

  function attachNotesKeyHandlers(textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        handleNotesTab(textarea, e.shiftKey);
        return;
      }
      // Cmd/Ctrl+Enter is reserved for form submit (app.js handles it).
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        if (handleNotesEnter(textarea)) e.preventDefault();
      }
    });
  }

  attachNotesKeyHandlers(document.getElementById('task-notes'));
  attachNotesKeyHandlers(document.getElementById('milestone-notes'));

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
