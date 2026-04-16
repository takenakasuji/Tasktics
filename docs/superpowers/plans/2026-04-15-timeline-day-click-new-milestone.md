# Timeline Day-Click New Milestone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a day header in the TIMELINE view opens the "new milestone" panel with that date pre-filled in `DUE DATE`.

**Architecture:** Extend `openMilestoneModal` to accept an optional `presetDate` that is used only in create mode. Attach a click handler to each day's header element in `renderTimeline`. Add hover affordance via CSS so the header visually reads as clickable.

**Tech Stack:** Vanilla JS, CSS (existing frontend in `public/`)

**Spec:** `docs/superpowers/specs/2026-04-15-timeline-day-click-new-milestone-design.md`

---

### Task 1: Extend `openMilestoneModal` to accept a preset date

**Files:**
- Modify: `public/js/modal.js` (function `openMilestoneModal` around lines 106-120)

- [ ] **Step 1: Change the function signature and the date field assignment**

In `public/js/modal.js`, find the current implementation:

```js
  function openMilestoneModal(mode, ms) {
    const modal = document.getElementById('milestone-modal');
    document.getElementById('milestone-modal-title').textContent =
      mode === 'edit' ? 'EDIT — ' + ms.id : 'NEW MILESTONE';
    document.getElementById('milestone-id').value    = ms ? ms.id : '';
    document.getElementById('milestone-title').value = ms ? ms.title : '';
    document.getElementById('milestone-date').value  = ms ? ms.dueDate : State.todayISO();
    document.getElementById('milestone-notes').value = ms ? (ms.notes || '') : '';
    const deleteBtn = document.getElementById('milestone-delete-btn');
    deleteBtn.classList.toggle('hidden', mode !== 'edit');
    modal.classList.remove('hidden');
    modal.offsetHeight; // force reflow
    modal.classList.add('open');
    setTimeout(() => document.getElementById('milestone-title').focus(), 50);
  }
```

Replace it with:

```js
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
```

The only change is the function signature (adds `presetDate`) and the `milestone-date` line which now uses `presetDate || State.todayISO()` when creating.

- [ ] **Step 2: Verify existing callers still work**

Search the codebase to confirm no caller is broken:

Run: `grep -rn "openMilestoneModal" public/ src/`

Expected matches:
- `public/js/render.js` — `window.Modal.openMilestoneModal('edit', ms)` (still passes 2 args; `presetDate` will be `undefined`, which is falsy, so edit mode is unaffected)
- `public/js/app.js` — `Modal.openMilestoneModal('create', null)` (still passes 2 args; falls back to `State.todayISO()` as before)

No existing call site needs to change.

- [ ] **Step 3: Commit**

```bash
git add public/js/modal.js
git commit -m "feat(milestone): accept presetDate in openMilestoneModal"
```

---

### Task 2: Attach click handler to day header in `renderTimeline`

**Files:**
- Modify: `public/js/render.js` (function `renderTimeline` around lines 223-230)

- [ ] **Step 1: Add a click handler on the day header**

In `public/js/render.js`, locate the block:

```js
      const header = document.createElement('div');
      header.className = 'week-day-header';
      header.innerHTML = `
        <span class="day-name">${DAY_NAMES_EN[dayIdx]} ${DAY_NAMES[dayIdx]}</span>
        <span class="day-date">${dayDate.getMonth() + 1}/${dayDate.getDate()}</span>
      `;
      col.appendChild(header);
```

Replace it with:

```js
      const header = document.createElement('div');
      header.className = 'week-day-header';
      header.innerHTML = `
        <span class="day-name">${DAY_NAMES_EN[dayIdx]} ${DAY_NAMES[dayIdx]}</span>
        <span class="day-date">${dayDate.getMonth() + 1}/${dayDate.getDate()}</span>
      `;
      header.addEventListener('click', () => {
        window.Modal.openMilestoneModal('create', null, dateStr);
      });
      col.appendChild(header);
```

`dateStr` is already defined earlier in the loop (`const dateStr = formatDateISO(dayDate);`), so no additional variable setup is needed.

- [ ] **Step 2: Commit**

```bash
git add public/js/render.js
git commit -m "feat(timeline): open new milestone panel when a day header is clicked"
```

---

### Task 3: Add hover affordance to the day header

**Files:**
- Modify: `public/style.css` (rule `.week-day-header` around lines 299-307)

- [ ] **Step 1: Update `.week-day-header` and add a hover rule**

In `public/style.css`, find:

```css
.week-day-header {
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--border);
  text-align: center;
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 1px;
  flex-shrink: 0;
}
```

Replace it with:

```css
.week-day-header {
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--border);
  text-align: center;
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 1px;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s;
}

.week-day-header:hover {
  background: var(--accent-glow);
}
```

Only adds `cursor: pointer;`, `transition`, and a new `:hover` rule. All existing styling is preserved.

- [ ] **Step 2: Commit**

```bash
git add public/style.css
git commit -m "feat(timeline): add hover affordance to clickable day header"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `npm start`
Expected: Electron app opens at the TIMELINE/HYBRID view.

- [ ] **Step 2: Click today's day header**

Confirm:
- The NEW MILESTONE panel opens.
- `DUE DATE` shows today's date.
- `TITLE` is empty and focused.

Close the panel (`Esc`) without saving.

- [ ] **Step 3: Click a past day header**

Example: If today is Wednesday, click Monday.

Confirm:
- The NEW MILESTONE panel opens.
- `DUE DATE` shows the past day's date.

Close without saving.

- [ ] **Step 4: Click a future day header**

Example: Click Friday if today is Wednesday.

Confirm:
- The NEW MILESTONE panel opens.
- `DUE DATE` shows the future day's date.

Close without saving.

- [ ] **Step 5: Regression — existing task click still edits the task**

Add a task with a `scheduledDate` in the current week (if none exists), then click the task chip inside the timeline day body.

Confirm:
- The TASK EDIT panel opens (not the milestone panel).

Close without saving.

- [ ] **Step 6: Regression — existing milestone click still edits the milestone**

Add a milestone via `+ MS` (or via the new click) on any day in the visible week, save it, then click the milestone marker in the timeline.

Confirm:
- The MILESTONE EDIT panel opens with the existing milestone's data (not the NEW MILESTONE panel).

Close without saving.

- [ ] **Step 7: Hover affordance**

Move the mouse over any day header.

Confirm:
- Cursor becomes a pointer.
- Background changes subtly (ice-blue tint from `--accent-glow`).
