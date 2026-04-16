# Daily Recurrence Skip-Weekends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "skip weekends" option to daily recurring tasks — when enabled, the next occurrence skips Saturday/Sunday and lands on the following Monday.

**Architecture:** Extend `recurrence.skipWeekends` as a boolean flag. Thread it through `calcNextDailyDate` and `calcFirstScheduledDate` so both next-instance spawning and initial scheduling respect it. Add a daily-only checkbox to the task modal. Tests are TDD-first using vitest.

**Tech Stack:** Vanilla JS (frontend), vitest (tests), HTML, CSS

**Spec:** `docs/superpowers/specs/2026-04-16-daily-recurrence-skip-weekends-design.md`

---

### Task 1: Extend `calcNextDailyDate` with `skipWeekends`

**Files:**
- Modify: `public/js/recurrence.js` (function `calcNextDailyDate`, lines 29-33)
- Test: `tests/recurrence.test.js` (`describe('calcNextDailyDate', ...)`, lines 186-202)

- [ ] **Step 1: Write failing tests**

Append these tests inside the existing `describe('calcNextDailyDate', ...)` block in `tests/recurrence.test.js` (just before the closing `});` on line 202):

```js
  test('skipWeekends=true: 金曜の翌日は土日をスキップして月曜', () => {
    // 2026-04-17 は金曜日
    expect(calcNextDailyDate('2026-04-17', true)).toBe('2026-04-20'); // 月曜
  });

  test('skipWeekends=true: 土曜の翌日は日曜をスキップして月曜', () => {
    // 2026-04-18 は土曜日
    expect(calcNextDailyDate('2026-04-18', true)).toBe('2026-04-20'); // 月曜
  });

  test('skipWeekends=true: 日曜の翌日は月曜のまま', () => {
    // 2026-04-19 は日曜日
    expect(calcNextDailyDate('2026-04-19', true)).toBe('2026-04-20'); // 月曜
  });

  test('skipWeekends=true: 平日（月〜木）は翌日', () => {
    // 2026-04-14 は火曜日
    expect(calcNextDailyDate('2026-04-14', true)).toBe('2026-04-15'); // 水曜
  });

  test('skipWeekends=false: 従来通り翌日（金曜→土曜）', () => {
    expect(calcNextDailyDate('2026-04-17', false)).toBe('2026-04-18');
  });

  test('skipWeekends 未指定: 従来通り翌日（後方互換）', () => {
    expect(calcNextDailyDate('2026-04-17')).toBe('2026-04-18');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- recurrence.test.js`
Expected: 6 new failing tests; the 4 existing `calcNextDailyDate` tests still pass.

- [ ] **Step 3: Implement `skipWeekends` in `calcNextDailyDate`**

In `public/js/recurrence.js`, replace lines 29-33:

```js
  function calcNextDailyDate(fromDateStr) {
    const current = new Date(fromDateStr + 'T00:00:00');
    current.setDate(current.getDate() + 1);
    return formatDateISO(current);
  }
```

with:

```js
  function calcNextDailyDate(fromDateStr, skipWeekends) {
    const current = new Date(fromDateStr + 'T00:00:00');
    current.setDate(current.getDate() + 1);
    if (skipWeekends) {
      const day = current.getDay();
      if (day === 6) current.setDate(current.getDate() + 2); // Sat -> Mon
      else if (day === 0) current.setDate(current.getDate() + 1); // Sun -> Mon
    }
    return formatDateISO(current);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- recurrence.test.js`
Expected: All `calcNextDailyDate` tests pass (4 existing + 6 new).

- [ ] **Step 5: Commit**

```bash
git add public/js/recurrence.js tests/recurrence.test.js
git commit -m "feat(recurrence): add skipWeekends option to calcNextDailyDate"
```

---

### Task 2: Propagate `skipWeekends` through `getNextOccurrenceDate`

**Files:**
- Modify: `public/js/recurrence.js` (function `getNextOccurrenceDate`, lines 57-69)
- Test: `tests/recurrence.test.js` (`describe('getNextOccurrenceDate', ...)`, lines 107-129)

- [ ] **Step 1: Write failing tests**

Append these tests inside the existing `describe('getNextOccurrenceDate', ...)` block in `tests/recurrence.test.js` (just before the closing `});` on line 129):

```js
  test('daily + skipWeekends=true: 金曜から月曜を返す', () => {
    // 2026-04-17 は金曜日
    const recurrence = { type: 'daily', skipWeekends: true };
    expect(getNextOccurrenceDate(recurrence, '2026-04-17')).toBe('2026-04-20');
  });

  test('daily + skipWeekends=false: 金曜から土曜を返す', () => {
    const recurrence = { type: 'daily', skipWeekends: false };
    expect(getNextOccurrenceDate(recurrence, '2026-04-17')).toBe('2026-04-18');
  });

  test('daily + skipWeekends 未指定: 従来通り翌日', () => {
    const recurrence = { type: 'daily' };
    expect(getNextOccurrenceDate(recurrence, '2026-04-17')).toBe('2026-04-18');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- recurrence.test.js`
Expected: 3 new failing tests (they return the non-skipping result because `getNextOccurrenceDate` is not yet passing the flag through).

Note: test 3 ("skipWeekends 未指定") may pass by coincidence today because the current `calcNextDailyDate` ignores the second arg. That's OK — it exists to lock in the behavior.

- [ ] **Step 3: Pass `skipWeekends` through `getNextOccurrenceDate`**

In `public/js/recurrence.js`, replace the `daily` branch in `getNextOccurrenceDate` (line 59-61):

```js
    if (recurrence.type === 'daily') {
      return calcNextDailyDate(fromDateStr);
    }
```

with:

```js
    if (recurrence.type === 'daily') {
      return calcNextDailyDate(fromDateStr, recurrence.skipWeekends);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- recurrence.test.js`
Expected: All `getNextOccurrenceDate` tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/recurrence.js tests/recurrence.test.js
git commit -m "feat(recurrence): thread skipWeekends through getNextOccurrenceDate"
```

---

### Task 3: Apply `skipWeekends` to `calcFirstScheduledDate` for daily

**Files:**
- Modify: `public/js/recurrence.js` (function `calcFirstScheduledDate`, lines 71-102, specifically the `daily` branch on lines 75-78)
- Test: `tests/recurrence.test.js` (`describe('calcFirstScheduledDate', ...)`, lines 133-182)

- [ ] **Step 1: Write failing tests**

Append these tests inside the existing `describe('calcFirstScheduledDate', ...)` block in `tests/recurrence.test.js` (just before the closing `});` on line 182):

```js
  test('daily + skipWeekends=true: 今日が土曜なら月曜を返す', () => {
    // 2026-04-18 は土曜日
    const result = calcFirstScheduledDate({ type: 'daily', skipWeekends: true }, '2026-04-18');
    expect(result).toBe('2026-04-20');
  });

  test('daily + skipWeekends=true: 今日が日曜なら月曜を返す', () => {
    // 2026-04-19 は日曜日
    const result = calcFirstScheduledDate({ type: 'daily', skipWeekends: true }, '2026-04-19');
    expect(result).toBe('2026-04-20');
  });

  test('daily + skipWeekends=true: 今日が平日なら今日を返す', () => {
    // 2026-04-14 は火曜日
    const result = calcFirstScheduledDate({ type: 'daily', skipWeekends: true }, '2026-04-14');
    expect(result).toBe('2026-04-14');
  });

  test('daily + skipWeekends=false: 今日が土曜でも今日を返す（従来通り）', () => {
    const result = calcFirstScheduledDate({ type: 'daily', skipWeekends: false }, '2026-04-18');
    expect(result).toBe('2026-04-18');
  });

  test('daily + skipWeekends 未指定: 今日が土曜でも今日を返す（後方互換）', () => {
    const result = calcFirstScheduledDate({ type: 'daily' }, '2026-04-18');
    expect(result).toBe('2026-04-18');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- recurrence.test.js`
Expected: Two failing tests (the `skipWeekends=true` Sat and Sun cases). The other three pass because they match existing behavior.

- [ ] **Step 3: Update the `daily` branch of `calcFirstScheduledDate`**

In `public/js/recurrence.js`, replace the daily branch (lines 75-78):

```js
    if (recurrence.type === 'daily') {
      // 毎日タスクは今日からスタート
      return today;
    }
```

with:

```js
    if (recurrence.type === 'daily') {
      if (!recurrence.skipWeekends) return today;
      const day = todayDate.getDay();
      if (day === 6) {
        const mon = new Date(todayDate);
        mon.setDate(mon.getDate() + 2);
        return formatDateISO(mon);
      }
      if (day === 0) {
        const mon = new Date(todayDate);
        mon.setDate(mon.getDate() + 1);
        return formatDateISO(mon);
      }
      return today;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- recurrence.test.js`
Expected: All `calcFirstScheduledDate` tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/recurrence.js tests/recurrence.test.js
git commit -m "feat(recurrence): apply skipWeekends to calcFirstScheduledDate for daily"
```

---

### Task 4: Add SKIP WEEKENDS checkbox to HTML modal

**Files:**
- Modify: `public/index.html` (around line 154, after the `RECURRENCE` select row)

- [ ] **Step 1: Add the daily-options form row**

In `public/index.html`, find:

```html
        <div class="form-row">
          <label>RECURRENCE</label>
          <select id="task-recurrence-type">
            <option value="none">なし (None)</option>
            <option value="daily">毎日 (Daily)</option>
            <option value="weekly">毎週 (Weekly)</option>
            <option value="monthly">毎月 (Monthly)</option>
          </select>
        </div>
        <div class="form-row hidden" id="recurrence-weekly-options">
```

Insert a new form row BETWEEN the `RECURRENCE` select row and the `recurrence-weekly-options` row:

```html
        <div class="form-row">
          <label>RECURRENCE</label>
          <select id="task-recurrence-type">
            <option value="none">なし (None)</option>
            <option value="daily">毎日 (Daily)</option>
            <option value="weekly">毎週 (Weekly)</option>
            <option value="monthly">毎月 (Monthly)</option>
          </select>
        </div>
        <div class="form-row hidden" id="recurrence-daily-options">
          <label>SKIP WEEKENDS</label>
          <label class="checkbox-label">
            <input type="checkbox" id="task-recurrence-skip-weekends">
            <span>土日除外</span>
          </label>
        </div>
        <div class="form-row hidden" id="recurrence-weekly-options">
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat(ui): add skip-weekends checkbox to task modal"
```

---

### Task 5: Wire up the checkbox in `modal.js`

**Files:**
- Modify: `public/js/modal.js` (functions `setRecurrenceFormVisibility`, `resetRecurrenceForm`, `populateRecurrenceForm`, `readRecurrenceForm`)

- [ ] **Step 1: Update `setRecurrenceFormVisibility` to toggle the daily-options row**

In `public/js/modal.js`, replace (lines 11-15):

```js
  function setRecurrenceFormVisibility() {
    const type = document.getElementById('task-recurrence-type').value;
    document.getElementById('recurrence-weekly-options').classList.toggle('hidden', type !== 'weekly');
    document.getElementById('recurrence-monthly-options').classList.toggle('hidden', type !== 'monthly');
  }
```

with:

```js
  function setRecurrenceFormVisibility() {
    const type = document.getElementById('task-recurrence-type').value;
    document.getElementById('recurrence-daily-options').classList.toggle('hidden', type !== 'daily');
    document.getElementById('recurrence-weekly-options').classList.toggle('hidden', type !== 'weekly');
    document.getElementById('recurrence-monthly-options').classList.toggle('hidden', type !== 'monthly');
  }
```

- [ ] **Step 2: Reset the checkbox in `resetRecurrenceForm`**

Replace (lines 17-22):

```js
  function resetRecurrenceForm() {
    document.getElementById('task-recurrence-type').value = 'none';
    document.getElementById('task-recurrence-dow').value = '5';
    document.getElementById('task-recurrence-dom').value = '-1';
    setRecurrenceFormVisibility();
  }
```

with:

```js
  function resetRecurrenceForm() {
    document.getElementById('task-recurrence-type').value = 'none';
    document.getElementById('task-recurrence-dow').value = '5';
    document.getElementById('task-recurrence-dom').value = '-1';
    document.getElementById('task-recurrence-skip-weekends').checked = false;
    setRecurrenceFormVisibility();
  }
```

- [ ] **Step 3: Populate the checkbox in `populateRecurrenceForm`**

Replace (lines 24-37):

```js
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
```

with:

```js
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
    document.getElementById('task-recurrence-skip-weekends').checked =
      recurrence.type === 'daily' && !!recurrence.skipWeekends;
    setRecurrenceFormVisibility();
  }
```

- [ ] **Step 4: Read the checkbox in `readRecurrenceForm`**

Replace (lines 39-58):

```js
  function readRecurrenceForm() {
    const type = document.getElementById('task-recurrence-type').value;
    if (type === 'none') return null;
    if (type === 'daily') return { type: 'daily', dayOfWeek: null, dayOfMonth: null };
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
```

with:

```js
  function readRecurrenceForm() {
    const type = document.getElementById('task-recurrence-type').value;
    if (type === 'none') return null;
    if (type === 'daily') {
      return {
        type: 'daily',
        dayOfWeek: null,
        dayOfMonth: null,
        skipWeekends: document.getElementById('task-recurrence-skip-weekends').checked,
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
```

- [ ] **Step 5: Commit**

```bash
git add public/js/modal.js
git commit -m "feat(modal): wire up skip-weekends checkbox for daily recurrence"
```

---

### Task 6: Add CSS for the checkbox-label class

**Files:**
- Modify: `public/style.css` (append at the end, or near other `.form-row` / form styles)

- [ ] **Step 1: Search for existing checkbox styles**

Run: `grep -n "checkbox-label\|type=\"checkbox\"" public/style.css || echo "no existing checkbox styles"`
Expected: "no existing checkbox styles" (confirming we need to add them).

- [ ] **Step 2: Append the checkbox-label style**

Append to the end of `public/style.css`:

```css
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  accent-color: var(--accent);
  cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add public/style.css
git commit -m "feat(style): add checkbox-label styling for recurrence form"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Start the app**

Run: `npm start`
Expected: Electron opens.

- [ ] **Step 3: Verify checkbox visibility**

Open `+ TASK`. Change RECURRENCE:
- "なし (None)" → daily-options row is hidden
- "毎日 (Daily)" → daily-options row is visible with `SKIP WEEKENDS` checkbox
- "毎週 (Weekly)" → daily-options row is hidden, weekly row visible
- "毎月 (Monthly)" → daily-options row is hidden, monthly row visible

- [ ] **Step 4: Verify save/load round-trip**

Create a daily task with `SKIP WEEKENDS` checked, save, close the modal, reopen the task. Confirm the checkbox is still checked.

- [ ] **Step 5: Verify next-occurrence behavior**

Set system date (or rely on a Friday in the current week). Create a daily task with `SKIP WEEKENDS` checked, schedule it for Friday, mark it as CLEARED. Verify a new instance appears on Monday (not Saturday) in the TIMELINE.

- [ ] **Step 6: Regression — existing recurring tasks unaffected**

Open any pre-existing daily recurring task (with no `skipWeekends` field). Confirm:
- Modal opens without error
- Checkbox is unchecked
- Clearing still spawns next on the next calendar day (Friday → Saturday)
