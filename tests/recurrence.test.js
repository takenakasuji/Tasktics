import { describe, test, expect } from 'vitest';
import {
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
} from '../public/js/recurrence.js';

// ---- formatDateISO ----

describe('formatDateISO', () => {
  test('Date を YYYY-MM-DD 形式に変換する', () => {
    expect(formatDateISO(new Date(2026, 3, 14))).toBe('2026-04-14'); // 月は0始まり
  });

  test('1桁の月・日はゼロパディングされる', () => {
    expect(formatDateISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

// ---- formatDateShort ----

describe('formatDateShort', () => {
  test('YYYY-MM-DD を M/D に変換する', () => {
    expect(formatDateShort('2026-04-13')).toBe('4/13');
  });

  test('先頭ゼロを除去する', () => {
    expect(formatDateShort('2026-01-05')).toBe('1/5');
  });

  test('null を渡すと空文字を返す', () => {
    expect(formatDateShort(null)).toBe('');
  });

  test('空文字を渡すと空文字を返す', () => {
    expect(formatDateShort('')).toBe('');
  });
});

// ---- calcNextWeeklyDate ----

describe('calcNextWeeklyDate', () => {
  // 2026-04-14 は火曜日（dayOfWeek = 2）

  test('同じ曜日を指定すると7日後を返す', () => {
    expect(calcNextWeeklyDate('2026-04-14', 2)).toBe('2026-04-21'); // 火→次火
  });

  test('後の曜日を指定すると今週のその曜日を返す', () => {
    expect(calcNextWeeklyDate('2026-04-14', 4)).toBe('2026-04-16'); // 火→木（2日後）
  });

  test('前の曜日を指定すると翌週のその曜日を返す', () => {
    expect(calcNextWeeklyDate('2026-04-14', 1)).toBe('2026-04-20'); // 火→次月曜（6日後）
  });

  test('日曜から月曜は1日後', () => {
    expect(calcNextWeeklyDate('2026-04-12', 1)).toBe('2026-04-13'); // 日→月
  });

  test('月曜から日曜は6日後', () => {
    expect(calcNextWeeklyDate('2026-04-13', 0)).toBe('2026-04-19'); // 月→日
  });

  test('月をまたぐ場合も正しく計算する', () => {
    expect(calcNextWeeklyDate('2026-04-28', 2)).toBe('2026-05-05'); // 火→次火
  });
});

// ---- calcNextMonthlyDate ----

describe('calcNextMonthlyDate', () => {
  test('翌月の指定日を返す', () => {
    expect(calcNextMonthlyDate('2026-04-14', 15)).toBe('2026-05-15');
  });

  test('月末指定（-1）は翌月末を返す', () => {
    expect(calcNextMonthlyDate('2026-04-14', -1)).toBe('2026-05-31');
  });

  test('2月に31日指定すると28日（短縮）になる', () => {
    expect(calcNextMonthlyDate('2026-01-31', 31)).toBe('2026-02-28');
  });

  test('12月から翌年1月に繰り越す', () => {
    expect(calcNextMonthlyDate('2026-12-15', 10)).toBe('2027-01-10');
  });

  test('閏年の2月末指定', () => {
    expect(calcNextMonthlyDate('2024-01-31', -1)).toBe('2024-02-29'); // 2024年は閏年
  });

  test('4月（30日まで）に31日指定すると30日になる', () => {
    expect(calcNextMonthlyDate('2026-03-15', 31)).toBe('2026-04-30');
  });
});

// ---- getNextOccurrenceDate ----

describe('getNextOccurrenceDate', () => {
  test('weekly タイプは calcNextWeeklyDate に委譲する', () => {
    const recurrence = { type: 'weekly', dayOfWeek: 5 }; // 金曜
    expect(getNextOccurrenceDate(recurrence, '2026-04-14')).toBe('2026-04-17'); // 火→金
  });

  test('monthly タイプは calcNextMonthlyDate に委譲する', () => {
    const recurrence = { type: 'monthly', dayOfMonth: 20 };
    expect(getNextOccurrenceDate(recurrence, '2026-04-14')).toBe('2026-05-20');
  });

  test('recurrence が null のとき null を返す', () => {
    expect(getNextOccurrenceDate(null, '2026-04-14')).toBeNull();
  });

  test('daily タイプは翌日を返す', () => {
    expect(getNextOccurrenceDate({ type: 'daily' }, '2026-04-14')).toBe('2026-04-15');
  });

  test('不明な type のとき null を返す', () => {
    expect(getNextOccurrenceDate({ type: 'unknown' }, '2026-04-14')).toBeNull();
  });
});

// ---- calcFirstScheduledDate ----

describe('calcFirstScheduledDate', () => {
  // todayStr を渡すことで現在日時に依存しないテストが可能

  // 2026-04-14 は火曜日（dayOfWeek = 2）

  test('weekly: 今日が対象曜日なら今日を返す', () => {
    const result = calcFirstScheduledDate({ type: 'weekly', dayOfWeek: 2 }, '2026-04-14');
    expect(result).toBe('2026-04-14');
  });

  test('weekly: 今日より後の曜日なら今週のその曜日を返す', () => {
    const result = calcFirstScheduledDate({ type: 'weekly', dayOfWeek: 5 }, '2026-04-14'); // 金曜
    expect(result).toBe('2026-04-17');
  });

  test('weekly: 今日より前の曜日なら翌週のその曜日を返す', () => {
    const result = calcFirstScheduledDate({ type: 'weekly', dayOfWeek: 1 }, '2026-04-14'); // 月曜
    expect(result).toBe('2026-04-20');
  });

  test('monthly: 今月の対象日がまだ来ていない場合は今月を返す', () => {
    const result = calcFirstScheduledDate({ type: 'monthly', dayOfMonth: 20 }, '2026-04-14');
    expect(result).toBe('2026-04-20');
  });

  test('monthly: 今日が対象日の場合は今日を返す', () => {
    const result = calcFirstScheduledDate({ type: 'monthly', dayOfMonth: 14 }, '2026-04-14');
    expect(result).toBe('2026-04-14');
  });

  test('monthly: 今月の対象日が過ぎている場合は来月を返す', () => {
    const result = calcFirstScheduledDate({ type: 'monthly', dayOfMonth: 10 }, '2026-04-14');
    expect(result).toBe('2026-05-10');
  });

  test('monthly: 月末指定（-1）で今月末がまだなら今月末を返す', () => {
    const result = calcFirstScheduledDate({ type: 'monthly', dayOfMonth: -1 }, '2026-04-14');
    expect(result).toBe('2026-04-30');
  });

  test('monthly: 31日指定で今月が30日までなら30日を返す', () => {
    const result = calcFirstScheduledDate({ type: 'monthly', dayOfMonth: 31 }, '2026-04-14');
    expect(result).toBe('2026-04-30');
  });

  test('daily: 今日の日付を返す', () => {
    const result = calcFirstScheduledDate({ type: 'daily' }, '2026-04-14');
    expect(result).toBe('2026-04-14');
  });
});

// ---- calcNextDailyDate ----

describe('calcNextDailyDate', () => {
  test('翌日を返す', () => {
    expect(calcNextDailyDate('2026-04-14')).toBe('2026-04-15');
  });

  test('月末から翌月1日に繰り越す', () => {
    expect(calcNextDailyDate('2026-04-30')).toBe('2026-05-01');
  });

  test('年末から翌年1月1日に繰り越す', () => {
    expect(calcNextDailyDate('2026-12-31')).toBe('2027-01-01');
  });

  test('閏年の2月28日から29日', () => {
    expect(calcNextDailyDate('2024-02-28')).toBe('2024-02-29');
  });
});

// ---- sortTasksByPriority ----

describe('sortTasksByPriority', () => {
  const makeTask = (id, priority, createdAt) => ({ id, priority, createdAt });

  test('URG > HI > NRM > LO の順にソートされる', () => {
    const tasks = [
      makeTask('a', 'LO', 1),
      makeTask('b', 'URG', 2),
      makeTask('c', 'NRM', 3),
      makeTask('d', 'HI', 4),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.priority)).toEqual(['URG', 'HI', 'NRM', 'LO']);
  });

  test('同じ優先度は createdAt の昇順になる', () => {
    const tasks = [
      makeTask('b', 'NRM', 200),
      makeTask('a', 'NRM', 100),
      makeTask('c', 'NRM', 300),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  test('元の配列を変更しない', () => {
    const tasks = [makeTask('a', 'LO', 1), makeTask('b', 'URG', 2)];
    const original = [...tasks];
    sortTasksByPriority(tasks);
    expect(tasks).toEqual(original);
  });

  test('PRIORITY_ORDER の値が正しい', () => {
    expect(PRIORITY_ORDER).toEqual({ URG: 0, HI: 1, NRM: 2, LO: 3 });
  });
});

// ---- reorderTasksInColumn ----

describe('reorderTasksInColumn', () => {
  const T = (id) => ({ id });
  const ids = (tasks) => tasks.map(t => t.id);

  // baseline: [A, B, C, D]
  const base = () => [T('A'), T('B'), T('C'), T('D')];

  test('先頭に移動 — insertBefore=true, target=A', () => {
    expect(ids(reorderTasksInColumn(base(), 'C', 'A', true))).toEqual(['C', 'A', 'B', 'D']);
  });

  test('前のカードの後ろに移動 — insertBefore=false, target=B', () => {
    expect(ids(reorderTasksInColumn(base(), 'D', 'B', false))).toEqual(['A', 'B', 'D', 'C']);
  });

  test('次のカードの前に移動 — insertBefore=true, target=D', () => {
    expect(ids(reorderTasksInColumn(base(), 'B', 'D', true))).toEqual(['A', 'C', 'B', 'D']);
  });

  test('末尾に移動 — targetId=null', () => {
    expect(ids(reorderTasksInColumn(base(), 'A', null, false))).toEqual(['B', 'C', 'D', 'A']);
  });

  test('同じ位置 — 自分自身が target のとき順序は変わらない', () => {
    // dragged=B, insertBefore target=B → B is spliced out first, then re-inserted at its old position
    expect(ids(reorderTasksInColumn(base(), 'B', 'B', true))).toEqual(['A', 'B', 'C', 'D']);
  });

  test('存在しない draggedId は変更なし', () => {
    expect(ids(reorderTasksInColumn(base(), 'X', 'A', true))).toEqual(['A', 'B', 'C', 'D']);
  });

  test('存在しない targetId は末尾に追加', () => {
    expect(ids(reorderTasksInColumn(base(), 'A', 'Z', false))).toEqual(['B', 'C', 'D', 'A']);
  });

  test('要素が1つのとき操作しても変わらない', () => {
    expect(ids(reorderTasksInColumn([T('A')], 'A', null, false))).toEqual(['A']);
  });

  test('元の配列を変更しない', () => {
    const col = base();
    reorderTasksInColumn(col, 'C', 'A', true);
    expect(ids(col)).toEqual(['A', 'B', 'C', 'D']);
  });
});
