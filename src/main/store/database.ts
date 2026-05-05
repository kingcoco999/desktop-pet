import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'desktop-pet.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeTables(db);
  migrateTables(db);
  return db;
}

function initializeTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      mood TEXT,
      intent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high')),
      due TEXT,
      repeat TEXT NOT NULL DEFAULT 'none',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_triggered TEXT,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('ai', 'manual')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '未命名记事',
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      pinned INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('ai', 'manual')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      model TEXT,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function migrateTables(db: Database.Database): void {
  // Add repeat/enabled/last_triggered columns to todos if missing (v1.2 migration)
  const cols = db.prepare("PRAGMA table_info(todos)").all() as any[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('repeat')) {
    db.exec("ALTER TABLE todos ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none'");
  }
  if (!colNames.includes('enabled')) {
    db.exec("ALTER TABLE todos ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1");
  }
  if (!colNames.includes('last_triggered')) {
    db.exec("ALTER TABLE todos ADD COLUMN last_triggered TEXT");
  }

  const noteCols = db.prepare("PRAGMA table_info(notes)").all() as any[];
  const noteColNames = noteCols.map(c => c.name);
  if (!noteColNames.includes('title')) {
    db.exec("ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT '未命名记事'");
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
