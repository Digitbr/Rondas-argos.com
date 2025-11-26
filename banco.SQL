-- Script SQL para criar o banco de dados (SQLite)
-- Rode no sqlite3: .read banco.SQL  (ou use o server.js para criar automaticamente)

CREATE TABLE IF NOT EXISTS rondas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  data_date TEXT,
  turno TEXT,
  auditor TEXT,
  local TEXT,
  obs TEXT,
  checklist TEXT,
  photos TEXT,
  checklistStyle TEXT
);
