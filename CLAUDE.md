# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Start the Express server at http://localhost:3000
node server.js   # Equivalent to npm start
```

No build, lint, or test tooling is configured. There is no compilation step — the app runs directly from source.

## Architecture

Full-stack web app with a Node.js/Express backend and a vanilla JS frontend. No frameworks, no bundler.

**Backend (`server.js`)**
- Express serves static files from `./public` and exposes two API endpoints
- `GET /api/tasks` — returns `{ tasks: [...], idCounter: number }`
- `PUT /api/tasks` — persists `{ tasks: [...], idCounter: number }` to `./data/tasks.json`
- Data directory and file are auto-created on first run; `./data/` is git-ignored

**Frontend (`public/`)**
- `index.html` — shell; loads fonts and scripts
- `app.js` — all application logic (~27 KB); no modules, single global scope
- `style.css` — ATC-themed dark UI with neon green accents

**Data flow**
- All state lives in memory in `app.js`; changes are debounced (300 ms) then flushed via `PUT /api/tasks`
- Task IDs follow the pattern `FS0001`, `FS0002`, etc.

**Task model**
```js
{
  id, title, category, priority,   // priority: "URG"|"HI"|"NRM"|"LO"
  status,                           // "active"|"next"|"holding"|"cleared"
  time,                             // "HH:MM"
  notes, createdAt,
  scheduledDate,                    // ISO date string
  recurrence,                       // null | { type: "weekly"|"monthly", ... }
  recurrenceGroupId
}
```

**Views**
- HYBRID (default), KANBAN (4 status columns), TIMELINE (weekly calendar)