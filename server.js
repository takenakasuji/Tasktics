/* ============================================
   Tasktics - Express server (non-Electron entry point)
   Data: ./data/tasktics.db (SQLite)
   ============================================ */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'tasktics.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    category            TEXT NOT NULL DEFAULT '',
    priority            TEXT NOT NULL DEFAULT 'NRM',
    status              TEXT NOT NULL DEFAULT 'active',
    notes               TEXT NOT NULL DEFAULT '',
    created_at          INTEGER NOT NULL,
    scheduled_date      TEXT,
    recurrence          TEXT,
    recurrence_group_id TEXT,
    sort_order          INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS milestones (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    due_date   TEXT NOT NULL,
    notes      TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);
const idRow = db.prepare("SELECT value FROM meta WHERE key = 'idCounter'").get();
if (!idRow) db.prepare("INSERT INTO meta VALUES ('idCounter', '0')").run();
const msRow = db.prepare("SELECT value FROM meta WHERE key = 'milestoneIdCounter'").get();
if (!msRow) db.prepare("INSERT INTO meta VALUES ('milestoneIdCounter', '0')").run();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Tasks ----
app.get('/api/tasks', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC').all();
    const counter = db.prepare("SELECT value FROM meta WHERE key = 'idCounter'").get();
    res.json({
      tasks: rows.map(r => ({
        id: r.id, title: r.title, category: r.category,
        priority: r.priority, status: r.status, notes: r.notes,
        createdAt: r.created_at, scheduledDate: r.scheduled_date || null,
        recurrence: r.recurrence ? JSON.parse(r.recurrence) : null,
        recurrenceGroupId: r.recurrence_group_id || null,
        sortOrder: r.sort_order,
      })),
      idCounter: parseInt(counter.value, 10),
    });
  } catch (err) {
    console.error('GET /api/tasks failed:', err.message);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

app.put('/api/tasks', (req, res) => {
  const { tasks, idCounter } = req.body;
  if (!Array.isArray(tasks) || typeof idCounter !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO tasks
        (id, title, category, priority, status, notes,
         created_at, scheduled_date, recurrence, recurrence_group_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    db.transaction((tasks, idCounter) => {
      db.prepare('DELETE FROM tasks').run();
      for (const t of tasks) {
        upsert.run(
          t.id, t.title, t.category || '', t.priority || 'NRM', t.status || 'active',
          t.notes || '', t.createdAt, t.scheduledDate || null,
          t.recurrence ? JSON.stringify(t.recurrence) : null,
          t.recurrenceGroupId || null, t.sortOrder ?? t.createdAt ?? 0
        );
      }
      db.prepare("INSERT OR REPLACE INTO meta VALUES ('idCounter', ?)").run(String(idCounter));
    })(tasks, idCounter);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/tasks failed:', err.message);
    res.status(500).json({ error: 'Failed to save tasks' });
  }
});

// ---- Milestones ----
app.get('/api/milestones', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM milestones ORDER BY due_date ASC').all();
    const counter = db.prepare("SELECT value FROM meta WHERE key = 'milestoneIdCounter'").get();
    res.json({
      milestones: rows.map(r => ({
        id: r.id, title: r.title, dueDate: r.due_date,
        notes: r.notes, createdAt: r.created_at,
      })),
      milestoneIdCounter: parseInt(counter?.value ?? '0', 10),
    });
  } catch (err) {
    console.error('GET /api/milestones failed:', err.message);
    res.status(500).json({ error: 'Failed to load milestones' });
  }
});

app.put('/api/milestones', (req, res) => {
  const { milestones, milestoneIdCounter } = req.body;
  if (!Array.isArray(milestones) || typeof milestoneIdCounter !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    const upsert = db.prepare(
      'INSERT OR REPLACE INTO milestones (id, title, due_date, notes, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    db.transaction((ms, counter) => {
      db.prepare('DELETE FROM milestones').run();
      for (const m of ms) {
        upsert.run(m.id, m.title, m.dueDate, m.notes || '', m.createdAt);
      }
      db.prepare("INSERT OR REPLACE INTO meta VALUES ('milestoneIdCounter', ?)").run(String(counter));
    })(milestones, milestoneIdCounter);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/milestones failed:', err.message);
    res.status(500).json({ error: 'Failed to save milestones' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ◆ TASKTICS server running at http://localhost:${PORT}\n`);
});
