/* ============================================
   Tasktics - Electron main process
   Window creation & app lifecycle only
   ============================================ */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, migrateFromJson, registerIpcHandlers, closeDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix userData path: ensure both dev and production use the same directory.
// Without this, dev (name: "tasktics") and built app (productName: "Tasktics")
// resolve to different OS paths, causing data loss on reinstall.
app.setPath('userData', path.join(app.getPath('appData'), 'Tasktics'));

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Tasktics',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'public', 'index.html'));
}

app.whenReady().then(() => {
  initDatabase();
  migrateFromJson();
  registerIpcHandlers();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Force-flush any pending debounced saves before quitting.
// executeJavaScript awaits the Promise, so both IPC saves complete
// before app.quit() is called a second time.
let isForceSaving = false;
app.on('before-quit', (e) => {
  if (isForceSaving) return;
  e.preventDefault();
  isForceSaving = true;

  const wins = BrowserWindow.getAllWindows();
  const savePromise = wins.length > 0
    ? wins[0].webContents.executeJavaScript(`
        typeof State !== 'undefined' && typeof window.taskticsBridge !== 'undefined'
          ? Promise.all([
              window.taskticsBridge.saveData({ tasks: State.tasks, idCounter: State.idCounter }),
              window.taskticsBridge.saveMilestones({ milestones: State.milestones, milestoneIdCounter: State.milestoneIdCounter })
            ])
          : Promise.resolve()
      `).catch(() => {})
    : Promise.resolve();

  savePromise.finally(() => app.quit());
});

app.on('quit', () => {
  closeDatabase();
});
