/* ============================================
   Tasktics - Recurrence & Date Utilities
   UMD: works as browser global (window.Recurrence)
        and as Node.js module (require/import for tests)
   ============================================ */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Recurrence = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDateShort(isoStr) {
    if (!isoStr) return '';
    const [, m, d] = isoStr.split('-');
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
  }

  function calcNextDailyDate(fromDateStr, skipWeekends) {
    const current = new Date(fromDateStr + 'T00:00:00');
    current.setDate(current.getDate() + 1);
    if (skipWeekends) {
      const day = current.getDay();
      if (day === 6) current.setDate(current.getDate() + 2);
      else if (day === 0) current.setDate(current.getDate() + 1);
    }
    return formatDateISO(current);
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
    if (recurrence.type === 'daily') {
      return calcNextDailyDate(fromDateStr, recurrence.skipWeekends);
    }
    if (recurrence.type === 'weekly') {
      return calcNextWeeklyDate(fromDateStr, recurrence.dayOfWeek);
    }
    if (recurrence.type === 'monthly') {
      return calcNextMonthlyDate(fromDateStr, recurrence.dayOfMonth);
    }
    return null;
  }

  function calcFirstScheduledDate(recurrence, todayStr) {
    const today = todayStr || formatDateISO(new Date());
    const todayDate = new Date(today + 'T00:00:00');

    if (recurrence.type === 'daily') {
      // 毎日タスクは今日からスタート
      return today;
    }
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

  // タスクを優先度・作成日時でソートする（KANBANとTIMELINEで共通）
  const PRIORITY_ORDER = { URG: 0, HI: 1, NRM: 2, LO: 3 };

  function sortTasksByPriority(tasks) {
    return [...tasks].sort((a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) ||
      a.createdAt - b.createdAt
    );
  }

  // columnTasks: ordered array of tasks in the column
  // draggedId:   id of the task being moved
  // targetId:    id of the task to insert relative to (null = append to end)
  // insertBefore: true = insert before target, false = insert after target
  function reorderTasksInColumn(columnTasks, draggedId, targetId, insertBefore) {
    const tasks = [...columnTasks];
    const draggedIdx = tasks.findIndex(t => t.id === draggedId);
    if (draggedIdx === -1) return tasks;
    if (draggedId === targetId) return tasks;
    const [dragged] = tasks.splice(draggedIdx, 1);

    if (targetId == null) {
      tasks.push(dragged);
      return tasks;
    }

    const targetIdx = tasks.findIndex(t => t.id === targetId);
    if (targetIdx === -1) {
      tasks.push(dragged);
      return tasks;
    }

    const insertIdx = insertBefore ? targetIdx : targetIdx + 1;
    tasks.splice(insertIdx, 0, dragged);
    return tasks;
  }

  return {
    formatDateISO,
    formatDateShort,
    calcNextDailyDate,
    calcNextWeeklyDate,
    calcNextMonthlyDate,
    getNextOccurrenceDate,
    calcFirstScheduledDate,
    sortTasksByPriority,
    PRIORITY_ORDER,
    reorderTasksInColumn,
  };
});
