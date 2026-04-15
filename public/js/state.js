/* ============================================
   Tasktics - State management & CRUD
   Exposes: window.State
   ============================================ */

(function () {
  'use strict';

  // ---- STATE ----
  let tasks = [];
  let idCounter = 0;
  let milestones = [];
  let milestoneIdCounter = 0;
  let filterPriority = 'all';
  let filterCategory = 'all';
  let weekOffset = 0;
  let clearedExpanded = false;
  const CLEARED_PREVIEW_COUNT = 5;

  // ---- DATE UTIL ----
  function todayISO() {
    return window.Recurrence.formatDateISO(new Date());
  }

  // ---- PERSISTENCE ----
  async function loadData() {
    try {
      const [data, msData] = await Promise.all([
        window.taskticsBridge.loadData(),
        window.taskticsBridge.loadMilestones(),
      ]);
      tasks = data.tasks || [];
      idCounter = data.idCounter || 0;
      milestones = msData.milestones || [];
      milestoneIdCounter = msData.milestoneIdCounter || 0;
      return true;
    } catch (err) {
      console.error('Failed to load data:', err);
      tasks = [];
      idCounter = 0;
      milestones = [];
      milestoneIdCounter = 0;
      return false;
    }
  }

  // Save immediately on every change. ipcRenderer.invoke dispatches the message
  // synchronously to the main process, so even if the renderer is destroyed
  // (reload, window close, etc.) before the Promise resolves, better-sqlite3's
  // synchronous write on the main process side completes the persist.
  function saveData() {
    window.taskticsBridge.saveData({ tasks, idCounter })
      .catch(err => console.error('Failed to save data:', err));
  }

  function saveMilestoneData() {
    window.taskticsBridge.saveMilestones({ milestones, milestoneIdCounter })
      .catch(err => console.error('Failed to save milestones:', err));
  }

  // ---- TASK CRUD ----
  function generateId() {
    idCounter++;
    saveData();
    return 'FS' + String(idCounter).padStart(4, '0');
  }

  function nextSortOrder(status) {
    const col = tasks.filter(t => t.status === status);
    return col.length === 0 ? 0 : Math.max(...col.map(t => t.sortOrder ?? 0)) + 1;
  }

  function createTask(data) {
    const status = data.status || 'active';
    const task = {
      id: generateId(),
      title: data.title,
      category: data.category || '',
      priority: data.priority || 'NRM',
      status,
      notes: data.notes || '',
      createdAt: Date.now(),
      recurrence: data.recurrence || null,
      scheduledDate: data.scheduledDate || null,
      recurrenceGroupId: data.recurrenceGroupId || null,
      sortOrder: data.sortOrder ?? nextSortOrder(status),
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
    tasks = tasks.filter(t => t.id !== id);
    saveData();
  }

  function purgeCleared() {
    const toDelete = tasks.filter(t => {
      if (t.status !== 'cleared') return false;
      if (!t.recurrence) return true;
      const groupId = t.recurrenceGroupId || t.id;
      return tasks.some(other =>
        other.id !== t.id &&
        (other.recurrenceGroupId === groupId || other.id === groupId) &&
        other.status !== 'cleared'
      );
    });
    if (toDelete.length === 0) return 0;
    const ids = new Set(toDelete.map(t => t.id));
    tasks = tasks.filter(t => !ids.has(t.id));
    saveData();
    return toDelete.length;
  }

  function getFilteredTasks() {
    return tasks.filter(t => {
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      return true;
    });
  }

  // ---- MILESTONE CRUD ----
  function generateMilestoneId() {
    milestoneIdCounter++;
    return 'MS' + String(milestoneIdCounter).padStart(4, '0');
  }

  function createMilestone(data) {
    const ms = {
      id:        generateMilestoneId(),
      title:     data.title,
      dueDate:   data.dueDate,
      notes:     data.notes || '',
      createdAt: Date.now(),
    };
    milestones.push(ms);
    saveMilestoneData();
    return ms;
  }

  function updateMilestone(id, patch) {
    const ms = milestones.find(m => m.id === id);
    if (!ms) return;
    Object.assign(ms, patch);
    saveMilestoneData();
  }

  function deleteMilestone(id) {
    milestones = milestones.filter(m => m.id !== id);
    saveMilestoneData();
  }

  // ---- RECURRENCE ----
  function spawnNextRecurrence(task) {
    if (!task.recurrence) return;
    const { getNextOccurrenceDate } = window.Recurrence;
    const fromDate = task.scheduledDate || todayISO();
    let nextDate = getNextOccurrenceDate(task.recurrence, fromDate);

    const today = todayISO();
    while (nextDate && nextDate < today) {
      nextDate = getNextOccurrenceDate(task.recurrence, nextDate);
    }
    if (!nextDate) return;

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
      notes: task.notes,
      recurrence: { ...task.recurrence },
      scheduledDate: nextDate,
      recurrenceGroupId: groupId,
    });
  }

  function processRecurringTasks() {
    const clearedRecurring = tasks.filter(t =>
      t.recurrence && t.status === 'cleared' && t.scheduledDate
    );
    clearedRecurring.forEach(t => {
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

  // ---- EXPORT ----
  window.State = {
    get tasks()             { return tasks; },
    get milestones()        { return milestones; },
    get idCounter()         { return idCounter; },
    get filterPriority()    { return filterPriority; },
    set filterPriority(v)   { filterPriority = v; },
    get filterCategory()    { return filterCategory; },
    set filterCategory(v)   { filterCategory = v; },
    get weekOffset()        { return weekOffset; },
    set weekOffset(v)       { weekOffset = v; },
    get clearedExpanded()   { return clearedExpanded; },
    set clearedExpanded(v)  { clearedExpanded = v; },
    CLEARED_PREVIEW_COUNT,
    todayISO,
    loadData,
    saveData,
    saveMilestoneData,
    createTask,
    updateTask,
    deleteTask,
    purgeCleared,
    getFilteredTasks,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    spawnNextRecurrence,
    processRecurringTasks,
  };
})();
