const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks: [], idCounter: 0 }, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/tasks — Read all data
app.get('/api/tasks', (req, res) => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    console.error('Failed to read tasks:', err.message);
    res.json({ tasks: [], idCounter: 0 });
  }
});

// PUT /api/tasks — Write all data
app.put('/api/tasks', (req, res) => {
  try {
    const data = req.body;
    if (!data || !Array.isArray(data.tasks) || typeof data.idCounter !== 'number') {
      return res.status(400).json({ error: 'Invalid data format. Expected { tasks: [], idCounter: number }' });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to write tasks:', err.message);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ◆ TASKTICS server running at http://localhost:${PORT}\n`);
});
