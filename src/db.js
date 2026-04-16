/* ============================================
   Tasktics - SQLite layer & IPC handlers
   ============================================ */

import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'tasktics.db');
  db = new Database(dbPath);
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

  // Add sort_order column to existing databases that pre-date this field
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  } catch (_) { /* column already exists */ }

  // One-time migration: initialize sort_order from created_at
  const sortMigrated = db.prepare("SELECT value FROM meta WHERE key = 'sortOrderMigrated'").get();
  if (!sortMigrated) {
    db.prepare('UPDATE tasks SET sort_order = created_at').run();
    db.prepare("INSERT INTO meta VALUES ('sortOrderMigrated', '1')").run();
  }

  const row = db.prepare("SELECT value FROM meta WHERE key = 'idCounter'").get();
  if (!row) db.prepare("INSERT INTO meta VALUES ('idCounter', '0')").run();

  const msRow = db.prepare("SELECT value FROM meta WHERE key = 'milestoneIdCounter'").get();
  if (!msRow) db.prepare("INSERT INTO meta VALUES ('milestoneIdCounter', '0')").run();
}

export function migrateFromJson() {
  const jsonPath = path.join(__dirname, '..', 'data', 'tasks.json');
  if (!fs.existsSync(jsonPath)) return;

  const count = db.prepare('SELECT COUNT(*) as c FROM tasks').get();
  if (count.c > 0) return;

  let jsonData;
  try {
    jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (e) {
    console.error('Migration: failed to parse tasks.json', e);
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO tasks
      (id, title, category, priority, status, notes,
       created_at, scheduled_date, recurrence, recurrence_group_id)
    VALUES
      (@id, @title, @category, @priority, @status, @notes,
       @created_at, @scheduled_date, @recurrence, @recurrence_group_id)
  `);

  db.transaction((tasks, idCounter) => {
    for (const t of tasks) {
      insert.run({
        id:                   t.id,
        title:                t.title,
        category:             t.category || '',
        priority:             t.priority || 'NRM',
        status:               t.status || 'active',
        notes:                t.notes || '',
        created_at:           t.createdAt,
        scheduled_date:       t.scheduledDate || null,
        recurrence:           t.recurrence ? JSON.stringify(t.recurrence) : null,
        recurrence_group_id:  t.recurrenceGroupId || null,
      });
    }
    db.prepare("INSERT OR REPLACE INTO meta VALUES ('idCounter', ?)").run(String(idCounter || 0));
  })(jsonData.tasks || [], jsonData.idCounter || 0);

  console.log(`Migration: ${(jsonData.tasks || []).length} tasks imported from tasks.json`);
}

export function registerIpcHandlers() {
  // app:version
  ipcMain.handle('app:version', () => app.getVersion());

  // tasks:load
  ipcMain.handle('tasks:load', () => {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC').all();
    const idCounterRow = db.prepare("SELECT value FROM meta WHERE key = 'idCounter'").get();
    return {
      tasks: rows.map(r => ({
        id:               r.id,
        title:            r.title,
        category:         r.category,
        priority:         r.priority,
        status:           r.status,
        notes:            r.notes,
        createdAt:        r.created_at,
        scheduledDate:    r.scheduled_date || null,
        recurrence:       r.recurrence ? JSON.parse(r.recurrence) : null,
        recurrenceGroupId: r.recurrence_group_id || null,
        sortOrder:        r.sort_order,
      })),
      idCounter: parseInt(idCounterRow.value, 10),
    };
  });

  // tasks:save
  ipcMain.handle('tasks:save', (_event, { tasks, idCounter }) => {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO tasks
        (id, title, category, priority, status, notes,
         created_at, scheduled_date, recurrence, recurrence_group_id, sort_order)
      VALUES
        (@id, @title, @category, @priority, @status, @notes,
         @created_at, @scheduled_date, @recurrence, @recurrence_group_id, @sort_order)
    `);

    db.transaction((tasks, idCounter) => {
      db.prepare('DELETE FROM tasks').run();
      for (const t of tasks) {
        upsert.run({
          id:                   t.id,
          title:                t.title,
          category:             t.category || '',
          priority:             t.priority || 'NRM',
          status:               t.status || 'active',
          notes:                t.notes || '',
          created_at:           t.createdAt,
          scheduled_date:       t.scheduledDate || null,
          recurrence:           t.recurrence ? JSON.stringify(t.recurrence) : null,
          recurrence_group_id:  t.recurrenceGroupId || null,
          sort_order:           t.sortOrder ?? t.createdAt ?? 0,
        });
      }
      db.prepare("INSERT OR REPLACE INTO meta VALUES ('idCounter', ?)").run(String(idCounter));
    })(tasks, idCounter);

    return { ok: true };
  });

  // milestones:load
  ipcMain.handle('milestones:load', () => {
    const rows = db.prepare('SELECT * FROM milestones ORDER BY due_date ASC').all();
    const counterRow = db.prepare("SELECT value FROM meta WHERE key = 'milestoneIdCounter'").get();
    return {
      milestones: rows.map(r => ({
        id:        r.id,
        title:     r.title,
        dueDate:   r.due_date,
        notes:     r.notes,
        createdAt: r.created_at,
      })),
      milestoneIdCounter: parseInt(counterRow?.value ?? '0', 10),
    };
  });

  // milestones:save
  ipcMain.handle('milestones:save', (_event, { milestones, milestoneIdCounter }) => {
    const upsert = db.prepare(
      'INSERT OR REPLACE INTO milestones (id, title, due_date, notes, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    db.transaction((ms, counter) => {
      db.prepare('DELETE FROM milestones').run();
      for (const m of ms) {
        upsert.run(m.id, m.title, m.dueDate, m.notes, m.createdAt);
      }
      db.prepare("INSERT OR REPLACE INTO meta VALUES ('milestoneIdCounter', ?)").run(String(counter));
    })(milestones, milestoneIdCounter);
    return { ok: true };
  });

}

export function closeDatabase() {
  if (db) db.close();
}
