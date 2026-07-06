const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'second-brain.db');
const db = new Database(dbPath);

// Initialize Schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      agentId TEXT,
      agentName TEXT,
      type TEXT,
      status TEXT,
      timestamp TEXT,
      content TEXT,
      filePath TEXT
    );

    CREATE TABLE IF NOT EXISTS roadmap (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT
    );
  `);
}

function upsertLog(log) {
  const stmt = db.prepare(`
    INSERT INTO logs (id, agentId, agentName, type, status, timestamp, content, filePath)
    VALUES (@id, @agentId, @agentName, @type, @status, @timestamp, @content, @filePath)
    ON CONFLICT(id) DO UPDATE SET
      agentId=excluded.agentId,
      agentName=excluded.agentName,
      type=excluded.type,
      status=excluded.status,
      timestamp=excluded.timestamp,
      content=excluded.content,
      filePath=excluded.filePath
  `);
  stmt.run(log);
}

function updateRoadmap(steps) {
    // Clear previous roadmap steps to keep it fresh
    db.prepare('DELETE FROM roadmap').run();

    const stmt = db.prepare(`INSERT INTO roadmap (step, created_at) VALUES (?, ?)`);
    const now = new Date().toISOString();
    for (const step of steps) {
        stmt.run(step, now);
    }
}

module.exports = {
  initDb,
  upsertLog,
  updateRoadmap,
  db
};
