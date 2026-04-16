# Tasktics

A Military HUD–themed task management desktop app. Electron + SQLite + vanilla JS.

## Setup

```bash
npm install   # postinstall rebuilds better-sqlite3 for Electron
npm start
```

`npm start` launches the Electron app. For browser-only development, you can also run `node server.js` to start an Express entry point that serves the same frontend.

## Packaging

```bash
npm run dist
```

DMGs are emitted to `dist/`.

| File | Target |
|---|---|
| `Tasktics-x.x.x-arm64.dmg` | Apple Silicon (M1/M2/M3) |
| `Tasktics-x.x.x.dmg` | Intel Mac |

> Without code signing, right-click → Open on first launch.

## Tests

```bash
npm test        # run once with vitest
npm run test:watch
```

## Architecture

### Electron main process (`src/main.js`)

- Creates and manages the app window.
- Delegates database concerns to `src/db.js`.

### Database layer (`src/db.js`)

- SQLite via `better-sqlite3`.
- Initialization, schema migrations, and CRUD.
- Registers IPC handlers consumed by the renderer:
  - `tasks:load` — returns all tasks and the ID counter.
  - `tasks:save` — persists the tasks array and counter atomically.
- Auto-migrates from a legacy `data/tasks.json` on first run if present.

### IPC bridge (`src/preload.cjs`)

- Uses `contextBridge` to expose `window.taskticsBridge` to the renderer:
  - `loadData()` — calls `tasks:load`.
  - `saveData(payload)` — calls `tasks:save`.

### Frontend (`public/`)

| File | Responsibility |
|---|---|
| `index.html` | App shell — loads fonts and scripts |
| `js/state.js` | In-memory state, filters, ID counter |
| `js/render.js` | Rendering (Hybrid / Kanban / Timeline) |
| `js/modal.js` | Task and milestone modals |
| `js/dragdrop.js` | Drag-and-drop status transitions |
| `js/recurrence.js` | Recurrence logic and date helpers |
| `js/app.js` | Bootstrap and event wiring |
| `style.css` | Military HUD theme — dark navy with ice-blue accent |

### Data flow

- All state lives in memory on the renderer.
- Changes are debounced (300 ms) and flushed via `taskticsBridge.saveData()`.
- Task IDs follow `FS0001`, `FS0002`, ...

### Storage location

- macOS: `~/Library/Application Support/Tasktics/tasktics.db`

## Task model

```js
{
  id,                // "FS0001"
  title,
  category,
  priority,          // "URG" | "HI" | "NRM" | "LO"
  status,            // "active" | "next" | "holding" | "cleared"
  time,              // "HH:MM"
  notes,
  createdAt,         // Unix timestamp (ms)
  scheduledDate,     // ISO date ("YYYY-MM-DD") | null
  recurrence,        // null | { type: "daily"|"weekly"|"monthly", dayOfWeek?: 0-6, dayOfMonth?: 1-31|-1 }
  recurrenceGroupId  // recurrence group identifier | null
}
```

## Views

### HYBRID (default)
Weekly timeline and Kanban board displayed together.

### KANBAN
Four-column status board:
- **ACTIVE** — in progress
- **NEXT ACTION** — next up
- **HOLDING** — on hold
- **CLEARED** — done (newest five shown, remainder behind a "SHOW MORE" affordance)

Cards can be moved between columns via drag and drop.

### TIMELINE
Weekly calendar (Sunday → Saturday). Cleared tasks are hidden. Navigate with ◁ PREV / ● TODAY / NEXT ▷.

## Key interactions

| Action | How |
|---|---|
| Add a task | `+ TASK` in the header |
| Edit a task | Click a card to open the side panel |
| Save | `SAVE` button or `Cmd+Enter` |
| Toggle complete | `✓` button on a card (CLEARED ↔ ACTIVE) |
| Change status | Drag and drop |
| Purge cleared tasks | `PURGE` in the CLEARED column header |
| Close the panel | `Esc` |

## Filters

The header dropdowns filter by priority and category.

## Recurrence

- Daily, weekly (by day of week), or monthly (by day of month, including end-of-month).
- Clearing a recurring task auto-generates the next instance.
- Related instances are linked through `recurrenceGroupId`.

## Milestones

- Separate from tasks; identified by a due date.
- Rendered as a highlighted bar on the corresponding day in the timeline.

## Project layout

```
Tasktics/
├── src/
│   ├── main.js           # Electron main process
│   ├── preload.cjs       # contextBridge IPC
│   └── db.js             # SQLite + IPC handlers
├── server.js             # Optional Express entry point (browser-only dev)
├── public/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── state.js
│       ├── render.js
│       ├── modal.js
│       ├── dragdrop.js
│       ├── recurrence.js
│       └── app.js
├── tests/
│   └── recurrence.test.js
├── docs/                 # Design specs and implementation plans
├── dist/                 # Build artifacts (git-ignored)
└── data/                 # Legacy JSON migration source (git-ignored)
```
