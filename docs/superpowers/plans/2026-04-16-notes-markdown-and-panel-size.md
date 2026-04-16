# NOTES Markdown + Panel Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make task and milestone NOTES render as Markdown when viewing and editable as raw Markdown when clicked; widen the side panel to roughly half the viewport.

**Architecture:** Install `marked` + `DOMPurify` via npm, copy UMD builds to `public/js/lib/`, include via `<script>` tags. Replace each NOTES textarea with a pair of elements (rendered div + textarea, one hidden at a time) and add a shared `setNotesMode(prefix, mode)` helper in `modal.js`. Widen `.modal-content` to `max(640px, 50vw)` and style `.notes-rendered` for the Military HUD theme.

**Tech Stack:** Vanilla JS, HTML, CSS, `marked`, `DOMPurify`

**Spec:** `docs/superpowers/specs/2026-04-16-notes-markdown-and-panel-size-design.md`

---

### Task 1: Add `marked` + `DOMPurify` libraries

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `public/js/lib/marked.min.js`
- Create: `public/js/lib/purify.min.js`
- Modify: `public/index.html` (add `<script>` tags before existing scripts)

- [ ] **Step 1: Install the npm packages**

Run:
```bash
npm install marked dompurify
```

Expected: `package.json` now contains `marked` and `dompurify` under `dependencies`.

- [ ] **Step 2: Locate the UMD builds**

Run:
```bash
ls node_modules/marked/marked.min.js node_modules/dompurify/dist/purify.min.js
```

Expected: Both files exist. If `marked.min.js` is not at the top-level `marked/` directory, check `node_modules/marked/lib/marked.umd.js` or run `find node_modules/marked -name '*.min.js'` and pick the UMD build.

If the marked file path differs, adjust Step 3 accordingly.

- [ ] **Step 3: Copy the UMD builds into `public/js/lib/`**

Run:
```bash
mkdir -p public/js/lib
cp node_modules/marked/marked.min.js public/js/lib/marked.min.js
cp node_modules/dompurify/dist/purify.min.js public/js/lib/purify.min.js
```

Expected: Both files exist under `public/js/lib/`.

- [ ] **Step 4: Include the libraries in `public/index.html`**

Find the script loading section at the bottom of `public/index.html`:

```html
  <script src="js/recurrence.js"></script>
  <script src="js/state.js"></script>
  <script src="js/render.js"></script>
  <script src="js/modal.js"></script>
  <script src="js/dragdrop.js"></script>
  <script src="js/app.js"></script>
```

Replace with:

```html
  <script src="js/lib/marked.min.js"></script>
  <script src="js/lib/purify.min.js"></script>
  <script src="js/recurrence.js"></script>
  <script src="js/state.js"></script>
  <script src="js/render.js"></script>
  <script src="js/modal.js"></script>
  <script src="js/dragdrop.js"></script>
  <script src="js/app.js"></script>
```

- [ ] **Step 5: Verify libraries load**

Run: `npm start`
In the Electron window's DevTools console (View > Developer > Toggle Developer Tools), type:
```js
typeof marked, typeof DOMPurify
```
Expected: `'object' 'object'` (both defined).

Close the app.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json public/js/lib/marked.min.js public/js/lib/purify.min.js public/index.html
git commit -m "feat(notes): add marked and DOMPurify libraries"
```

---

### Task 2: Expand the side panel width

**Files:**
- Modify: `public/style.css` (rule `.modal-content`, around lines 766-782)

- [ ] **Step 1: Update the `.modal-content` width**

In `public/style.css`, find:

```css
.modal-content {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  max-width: 90vw;
```

Replace the `width: 400px;` line with:

```css
  width: max(640px, 50vw);
```

The rest of the rule stays the same.

- [ ] **Step 2: Commit**

```bash
git add public/style.css
git commit -m "feat(modal): widen side panel to max(640px, 50vw)"
```

---

### Task 3: Replace task NOTES with dual-mode HTML elements

**Files:**
- Modify: `public/index.html` (task modal NOTES row, around line 211-214)

- [ ] **Step 1: Replace the task NOTES form row**

Find in `public/index.html`:

```html
        <div class="form-row">
          <label>NOTES</label>
          <textarea id="task-notes" rows="2" placeholder="メモ"></textarea>
        </div>
```

Replace with:

```html
        <div class="form-row">
          <label>NOTES</label>
          <div id="task-notes-rendered" class="notes-rendered"></div>
          <textarea id="task-notes" class="notes-textarea hidden" rows="8" placeholder="メモ (Markdown対応)"></textarea>
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat(task-modal): add dual-mode notes rendered div + textarea"
```

---

### Task 4: Replace milestone NOTES with dual-mode HTML elements

**Files:**
- Modify: `public/index.html` (milestone modal NOTES row, around line 241-244)

- [ ] **Step 1: Replace the milestone NOTES form row**

Find in `public/index.html`:

```html
        <div class="form-row">
          <label>NOTES</label>
          <textarea id="milestone-notes" rows="3" placeholder="メモ"></textarea>
        </div>
```

Replace with:

```html
        <div class="form-row">
          <label>NOTES</label>
          <div id="milestone-notes-rendered" class="notes-rendered"></div>
          <textarea id="milestone-notes" class="notes-textarea hidden" rows="8" placeholder="メモ (Markdown対応)"></textarea>
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat(milestone-modal): add dual-mode notes rendered div + textarea"
```

---

### Task 5: Add mode-switching logic in `modal.js`

**Files:**
- Modify: `public/js/modal.js`

- [ ] **Step 1: Add `renderNotesHTML` and `setNotesMode` helpers**

In `public/js/modal.js`, find the end of the RECURRENCE FORM section, just before the `// ---- TASK MODAL ----` comment (around line 70). Add these helpers before `// ---- TASK MODAL ----`:

```js
  // ---- NOTES MARKDOWN ----
  function renderNotesHTML(markdown) {
    if (!markdown || !markdown.trim()) return '';
    const html = window.marked.parse(markdown);
    return window.DOMPurify.sanitize(html);
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
```

- [ ] **Step 2: Attach click handlers on the rendered divs (at IIFE top level)**

In `public/js/modal.js`, just before the closing `})();` at the end of the file (line 149), add:

```js
  // Click-to-edit on rendered notes
  document.getElementById('task-notes-rendered')
    .addEventListener('click', () => setNotesMode('task', 'edit'));
  document.getElementById('milestone-notes-rendered')
    .addEventListener('click', () => setNotesMode('milestone', 'edit'));
```

- [ ] **Step 3: Call `setNotesMode` in `openCreateModal`**

Find in `public/js/modal.js`:

```js
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
```

Replace with:

```js
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
```

- [ ] **Step 4: Call `setNotesMode` in `openEditModal`**

Find in `public/js/modal.js`:

```js
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
```

Replace with:

```js
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
```

- [ ] **Step 5: Call `setNotesMode` in `openMilestoneModal`**

Find in `public/js/modal.js`:

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

Replace with:

```js
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
```

- [ ] **Step 6: Commit**

```bash
git add public/js/modal.js
git commit -m "feat(modal): render notes as markdown and toggle edit on click"
```

---

### Task 6: Style the rendered notes area

**Files:**
- Modify: `public/style.css` (append a new section near the end, before `.hidden`)

- [ ] **Step 1: Append `.notes-rendered` / `.notes-textarea` styles**

Open `public/style.css`. Find the `.hidden` rule:

```css
.hidden {
  display: none !important;
}
```

Insert the following CSS block **before** `.hidden`:

```css
/* ---- Notes (markdown) ---- */
.notes-rendered {
  min-height: 180px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  cursor: text;
  transition: border-color 0.15s;
  overflow-wrap: break-word;
}

.notes-rendered:hover {
  border-color: var(--border-bright);
}

.notes-empty {
  color: var(--text-dim);
  font-style: italic;
}

.notes-rendered h1,
.notes-rendered h2,
.notes-rendered h3 {
  font-family: var(--font-display);
  color: var(--accent);
  letter-spacing: 1px;
  margin: 10px 0 6px;
}

.notes-rendered h1 { font-size: 16px; }
.notes-rendered h2 { font-size: 14px; }
.notes-rendered h3 { font-size: 13px; }

.notes-rendered p {
  margin: 6px 0;
}

.notes-rendered ul,
.notes-rendered ol {
  margin: 6px 0 6px 20px;
}

.notes-rendered li {
  margin: 2px 0;
}

.notes-rendered a {
  color: var(--accent);
  text-decoration: none;
}

.notes-rendered a:hover {
  text-decoration: underline;
}

.notes-rendered code {
  background: var(--bg-card-hover);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}

.notes-rendered pre {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  overflow-x: auto;
  margin: 8px 0;
}

.notes-rendered pre code {
  background: transparent;
  padding: 0;
  font-size: 12px;
}

.notes-rendered blockquote {
  border-left: 3px solid var(--accent-dim);
  margin: 6px 0;
  padding: 2px 10px;
  color: var(--text-secondary);
}

.notes-rendered hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 10px 0;
}

.notes-rendered table {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}

.notes-rendered th,
.notes-rendered td {
  border: 1px solid var(--border);
  padding: 4px 8px;
  text-align: left;
}

.notes-rendered th {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.notes-rendered input[type="checkbox"] {
  accent-color: var(--accent);
  margin-right: 4px;
}

.notes-textarea {
  min-height: 180px;
  resize: vertical;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/style.css
git commit -m "feat(style): add notes-rendered markdown theme styling"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Launch the app**

Run: `npm start`
Expected: Electron window opens.

- [ ] **Step 2: Verify panel size**

Click `+ TASK` in the header.
Expected: The side panel occupies roughly half of the viewport (at least 640px wide).

- [ ] **Step 3: Verify new-task starts in edit mode**

In the opened `NEW TASK` panel:
- NOTES area shows a textarea (not a rendered div)
- Placeholder reads "メモ (Markdown対応)"

- [ ] **Step 4: Verify round-trip with markdown content**

Enter TITLE "Markdown test" and in NOTES paste:

```
# Heading 1
## Heading 2

- [x] done item
- [ ] todo item

**bold** and *italic* text, `inline code`.

[link to anthropic](https://anthropic.com)

| Col A | Col B |
|-------|-------|
| 1     | 2     |
```

Click SAVE. Confirm the task appears on the board. Click the task to re-open the edit modal.

Expected:
- NOTES area shows rendered HTML (headings in accent color, checkboxes rendered, table visible, link in accent color)

- [ ] **Step 5: Verify click-to-edit**

With the edit modal still open, click anywhere on the rendered NOTES area.
Expected: The rendered view hides; the textarea appears with the raw markdown; cursor is focused in the textarea.

Close the modal without saving (Esc).

- [ ] **Step 6: Verify empty-notes placeholder**

Create a new task, save without entering NOTES. Re-open the task.
Expected: NOTES area shows `— クリックして編集 —` in a dim italic color.

- [ ] **Step 7: Verify XSS sanitization**

Create a task with NOTES content `<script>window.XSS_TRIGGERED=true</script>hello`. Save and re-open the task.

Open the DevTools console and run:
```js
window.XSS_TRIGGERED
```
Expected: `undefined` (the script tag was stripped by DOMPurify; only `hello` renders).

- [ ] **Step 8: Verify milestone NOTES work the same**

Click `+ MS` in the header or click a day header in TIMELINE to open the NEW MILESTONE panel.
Confirm:
- Panel is wide (50vw)
- NOTES opens in edit mode for NEW MILESTONE
- Save with markdown content, re-open an existing milestone → NOTES shows rendered
- Click rendered → switches to textarea

- [ ] **Step 9: Verify existing plain-text notes still render**

Open any pre-existing task whose NOTES was plain text (e.g., `メモテスト` without any markdown).
Expected: Plain text renders as a paragraph (no errors, no formatting surprises).
