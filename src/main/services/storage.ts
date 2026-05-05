import { getDatabase } from '../store/database';
import { v4 as uuidv4 } from 'uuid';
import type { Todo, Note, Reminder, ChatMessage, Settings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export class StorageService {
  private db = getDatabase();

  // ==================== Todo ====================
  getAllTodos(): Todo[] {
    const rows = this.db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all() as any[];
    return rows.map(this.mapTodo);
  }

  createTodo(data: { title: string; description?: string; priority?: string; due?: string; source?: string }): Todo {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO todos (id, title, description, priority, due, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.title, data.description || null, data.priority || 'normal', data.due || null, data.source || 'manual', now, now);
    return this.getTodoById(id)!;
  }

  getTodoById(id: string): Todo | null {
    const row = this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as any;
    return row ? this.mapTodo(row) : null;
  }

  updateTodo(id: string, updates: Partial<{ title: string; description: string; completed: boolean; priority: string; due: string }>): Todo | null {
    const existing = this.getTodoById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
    if (updates.completed !== undefined) { sets.push('completed = ?'); values.push(updates.completed ? 1 : 0); }
    if (updates.priority !== undefined) { sets.push('priority = ?'); values.push(updates.priority); }
    if (updates.due !== undefined) { sets.push('due = ?'); values.push(updates.due); }
    sets.push('updated_at = ?');
    values.push(now);
    values.push(id);

    this.db.prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getTodoById(id);
  }

  deleteTodo(id: string): boolean {
    const result = this.db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return result.changes > 0;
  }

  toggleTodo(id: string): Todo | null {
    const existing = this.getTodoById(id);
    if (!existing) return null;
    return this.updateTodo(id, { completed: !existing.completed });
  }

  findTodoByTitle(title: string): Todo | null {
    const row = this.db.prepare("SELECT * FROM todos WHERE title LIKE ? LIMIT 1").get(`%${title}%`) as any;
    return row ? this.mapTodo(row) : null;
  }

  // ==================== Note ====================
  getAllNotes(): Note[] {
    const rows = this.db.prepare('SELECT * FROM notes ORDER BY pinned DESC, created_at DESC').all() as any[];
    return rows.map(this.mapNote);
  }

  createNote(data: { content: string; tags?: string[]; source?: string }): Note {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO notes (id, content, tags, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.content, JSON.stringify(data.tags || []), data.source || 'manual', now, now);
    return this.getNoteById(id)!;
  }

  getNoteById(id: string): Note | null {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    return row ? this.mapNote(row) : null;
  }

  updateNote(id: string, updates: Partial<{ content: string; tags: string[]; pinned: boolean }>): Note | null {
    const existing = this.getNoteById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) { sets.push('content = ?'); values.push(updates.content); }
    if (updates.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
    if (updates.pinned !== undefined) { sets.push('pinned = ?'); values.push(updates.pinned ? 1 : 0); }
    sets.push('updated_at = ?');
    values.push(now);
    values.push(id);

    this.db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getNoteById(id);
  }

  deleteNote(id: string): boolean {
    const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  findNoteByContent(keyword: string): Note[] {
    const rows = this.db.prepare("SELECT * FROM notes WHERE content LIKE ? ORDER BY created_at DESC").all(`%${keyword}%`) as any[];
    return rows.map(this.mapNote);
  }

  // ==================== Reminder ====================
  getAllReminders(): Reminder[] {
    const rows = this.db.prepare('SELECT * FROM reminders ORDER BY time ASC').all() as any[];
    return rows.map(this.mapReminder);
  }

  createReminder(data: { content: string; time: string; repeat?: string; source?: string }): Reminder {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO reminders (id, content, time, repeat, source, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.content, data.time, data.repeat || 'none', data.source || 'manual', now);
    return this.getReminderById(id)!;
  }

  getReminderById(id: string): Reminder | null {
    const row = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any;
    return row ? this.mapReminder(row) : null;
  }

  updateReminder(id: string, updates: Partial<{ content: string; time: string; repeat: string; enabled: boolean }>): Reminder | null {
    const existing = this.getReminderById(id);
    if (!existing) return null;

    const sets: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) { sets.push('content = ?'); values.push(updates.content); }
    if (updates.time !== undefined) { sets.push('time = ?'); values.push(updates.time); }
    if (updates.repeat !== undefined) { sets.push('repeat = ?'); values.push(updates.repeat); }
    if (updates.enabled !== undefined) { sets.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    values.push(id);

    if (sets.length > 0) {
      this.db.prepare(`UPDATE reminders SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.getReminderById(id);
  }

  deleteReminder(id: string): boolean {
    const result = this.db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    return result.changes > 0;
  }

  toggleReminder(id: string): Reminder | null {
    const existing = this.getReminderById(id);
    if (!existing) return null;
    return this.updateReminder(id, { enabled: !existing.enabled });
  }

  getDueReminders(): Reminder[] {
    const now = new Date().toISOString();
    const all = this.db.prepare('SELECT * FROM reminders WHERE enabled = 1').all() as any[];
    // Filter in JS to handle mixed time formats (UTC with Z, local without Z)
    return all.filter(row => {
      const reminderTime = new Date(row.time).toISOString();
      return reminderTime <= now;
    }).map(this.mapReminder);
  }

  markReminderTriggered(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE reminders SET last_triggered = ? WHERE id = ?').run(now, id);
  }

  // ==================== Chat Messages ====================
  getChatHistory(limit: number = 50): ChatMessage[] {
    const rows = this.db.prepare(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as any[];
    return rows.map(this.mapMessage).reverse();
  }

  addMessage(role: 'user' | 'assistant', content: string, mood?: string, intent?: string): ChatMessage {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO messages (id, role, content, mood, intent, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, role, content, mood || null, intent || null, now);
    return { id, role, content, mood, intent, createdAt: now };
  }

  clearChatHistory(): void {
    this.db.prepare('DELETE FROM messages').run();
  }

  getRecentMessages(count: number): ChatMessage[] {
    const rows = this.db.prepare(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?'
    ).all(count) as any[];
    return rows.map(this.mapMessage).reverse();
  }

  getChatMessageCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
    return row.count;
  }

  // ==================== Settings ====================
  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row ? row.value : null;
  }

  setSetting(key: string, value: string): void {
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    ).run(key, value, now);
  }

  getAllSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as any[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  getAppSettings(): Settings {
    const stored = this.getSetting('app_settings');
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  }

  saveAppSettings(settings: Settings): void {
    this.setSetting('app_settings', JSON.stringify(settings));
  }

  // ==================== Data counts ====================
  getDataCounts(): { messages: number; todos: number; notes: number; reminders: number } {
    return {
      messages: (this.db.prepare('SELECT COUNT(*) as c FROM messages').get() as any).c,
      todos: (this.db.prepare('SELECT COUNT(*) as c FROM todos').get() as any).c,
      notes: (this.db.prepare('SELECT COUNT(*) as c FROM notes').get() as any).c,
      reminders: (this.db.prepare('SELECT COUNT(*) as c FROM reminders').get() as any).c,
    };
  }

  // ==================== Export/Import ====================
  exportAllData(): { messages: ChatMessage[]; todos: Todo[]; notes: Note[]; reminders: Reminder[]; settings: Record<string, string> } {
    return {
      messages: this.getChatHistory(10000),
      todos: this.getAllTodos(),
      notes: this.getAllNotes(),
      reminders: this.getAllReminders(),
      settings: this.getAllSettings(),
    };
  }

  importData(data: { messages?: ChatMessage[]; todos?: Todo[]; notes?: Note[]; reminders?: Reminder[]; settings?: Record<string, string> }): void {
    const transaction = this.db.transaction(() => {
      if (data.messages) {
        this.db.prepare('DELETE FROM messages').run();
        for (const m of data.messages) {
          this.db.prepare('INSERT INTO messages (id, role, content, mood, intent, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(m.id, m.role, m.content, m.mood || null, m.intent || null, m.createdAt);
        }
      }
      if (data.todos) {
        this.db.prepare('DELETE FROM todos').run();
        for (const t of data.todos) {
          this.db.prepare('INSERT INTO todos (id, title, description, completed, priority, due, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(t.id, t.title, t.description || null, t.completed ? 1 : 0, t.priority, t.due || null, t.source, t.createdAt, t.updatedAt);
        }
      }
      if (data.notes) {
        this.db.prepare('DELETE FROM notes').run();
        for (const n of data.notes) {
          this.db.prepare('INSERT INTO notes (id, content, tags, pinned, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(n.id, n.content, JSON.stringify(n.tags), n.pinned ? 1 : 0, n.source, n.createdAt, n.updatedAt);
        }
      }
      if (data.reminders) {
        this.db.prepare('DELETE FROM reminders').run();
        for (const r of data.reminders) {
          this.db.prepare('INSERT INTO reminders (id, content, time, repeat, enabled, source, last_triggered, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(r.id, r.content, r.time, r.repeat, r.enabled ? 1 : 0, r.source, r.lastTriggered || null, r.createdAt);
        }
      }
      if (data.settings) {
        for (const [key, value] of Object.entries(data.settings)) {
          this.setSetting(key, value);
        }
      }
    });
    transaction();
  }

  clearAllData(): void {
    this.db.prepare('DELETE FROM messages').run();
    this.db.prepare('DELETE FROM todos').run();
    this.db.prepare('DELETE FROM notes').run();
    this.db.prepare('DELETE FROM reminders').run();
    this.db.prepare('DELETE FROM settings').run();
  }

  // ==================== Mappers ====================
  private mapTodo(row: any): Todo {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      completed: row.completed === 1,
      priority: row.priority,
      due: row.due || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      source: row.source,
    };
  }

  private mapNote(row: any): Note {
    let tags: string[] = [];
    try { tags = JSON.parse(row.tags); } catch { tags = []; }
    return {
      id: row.id,
      content: row.content,
      tags,
      pinned: row.pinned === 1,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapReminder(row: any): Reminder {
    return {
      id: row.id,
      content: row.content,
      time: row.time,
      repeat: row.repeat,
      enabled: row.enabled === 1,
      source: row.source,
      lastTriggered: row.last_triggered || undefined,
      createdAt: row.created_at,
    };
  }

  private mapMessage(row: any): ChatMessage {
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      mood: row.mood || undefined,
      intent: row.intent || undefined,
      createdAt: row.created_at,
    };
  }
}
