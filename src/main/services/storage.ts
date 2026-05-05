import { getDatabase } from '../store/database';
import { v4 as uuidv4 } from 'uuid';
import type { Todo, Note, ChatMessage, Settings, AIUsageSummary } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export class StorageService {
  private db = getDatabase();

  // ==================== Todo ====================
  getAllTodos(): Todo[] {
    const rows = this.db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all() as any[];
    return rows.map(this.mapTodo);
  }

  createTodo(data: { title: string; description?: string; priority?: string; due?: string; repeat?: string | number; enabled?: boolean; source?: string }): Todo {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO todos (id, title, description, priority, due, repeat, enabled, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.title, data.description || null, data.priority || 'normal', data.due || null, data.repeat ?? 'none', data.enabled !== false ? 1 : 0, data.source || 'manual', now, now);
    return this.getTodoById(id)!;
  }

  getTodoById(id: string): Todo | null {
    const row = this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as any;
    return row ? this.mapTodo(row) : null;
  }

  updateTodo(id: string, updates: Partial<{ title: string; description: string; completed: boolean; priority: string; due: string; repeat: string | number; enabled: boolean; lastTriggered: string }>): Todo | null {
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
    if (updates.repeat !== undefined) { sets.push('repeat = ?'); values.push(updates.repeat); }
    if (updates.enabled !== undefined) { sets.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    if (updates.lastTriggered !== undefined) { sets.push('last_triggered = ?'); values.push(updates.lastTriggered); }
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
    const keyword = String(title || '').trim();
    if (!keyword) return null;
    const rows = this.db.prepare('SELECT * FROM todos ORDER BY completed ASC, updated_at DESC').all() as any[];
    const normalizedKeyword = this.normalizeSearchText(keyword);
    const found = rows.find(row => this.normalizeSearchText(row.title) === normalizedKeyword)
      || rows.find(row => this.normalizeSearchText(row.title).includes(normalizedKeyword))
      || rows.find(row => normalizedKeyword.includes(this.normalizeSearchText(row.title)));
    return found ? this.mapTodo(found) : null;
  }

  getDueTodos(): Todo[] {
    const now = new Date().toISOString();
    const all = this.db.prepare('SELECT * FROM todos WHERE enabled = 1 AND due IS NOT NULL AND completed = 0').all() as any[];
    return all.filter(row => {
      const dueTime = new Date(row.due).toISOString();
      return dueTime <= now;
    }).map(this.mapTodo);
  }

  markTodoTriggered(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE todos SET last_triggered = ? WHERE id = ?').run(now, id);
  }

  // ==================== Note ====================
  getAllNotes(): Note[] {
    const rows = this.db.prepare('SELECT * FROM notes ORDER BY pinned DESC, created_at DESC').all() as any[];
    return rows.map(this.mapNote);
  }

  createNote(data: { title?: string; content: string; tags?: string[]; source?: string }): Note {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO notes (id, title, content, tags, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.title?.trim() || this.makeNoteTitle(data.content), data.content, JSON.stringify(data.tags || []), data.source || 'manual', now, now);
    return this.getNoteById(id)!;
  }

  getNoteById(id: string): Note | null {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    return row ? this.mapNote(row) : null;
  }

  updateNote(id: string, updates: Partial<{ title: string; content: string; tags: string[]; pinned: boolean }>): Note | null {
    const existing = this.getNoteById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title.trim() || this.makeNoteTitle(existing.content)); }
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
    const q = String(keyword || '').trim();
    const rows = this.db.prepare('SELECT * FROM notes ORDER BY pinned DESC, created_at DESC').all() as any[];
    const normalizedKeyword = this.normalizeSearchText(q);
    return rows
      .filter(row =>
        this.normalizeSearchText(row.title || '').includes(normalizedKeyword) ||
        this.normalizeSearchText(row.content || '').includes(normalizedKeyword),
      )
      .map(this.mapNote);
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

  // ==================== AI Usage ====================
  recordAIUsage(data: {
    kind: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }): void {
    const id = uuidv4();
    const now = new Date().toISOString();
    const promptTokens = Math.max(0, Math.round(data.promptTokens || 0));
    const completionTokens = Math.max(0, Math.round(data.completionTokens || 0));
    const totalTokens = Math.max(0, Math.round(data.totalTokens || promptTokens + completionTokens));

    this.db.prepare(
      'INSERT INTO ai_usage (id, kind, model, prompt_tokens, completion_tokens, total_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.kind, data.model || null, promptTokens, completionTokens, totalTokens, now);
  }

  getAIUsageSummary(): AIUsageSummary {
    const now = new Date();
    const todayKey = this.toDateKey(now);
    const monthKey = todayKey.slice(0, 7);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const rangeStartKey = this.toDateKey(sevenDaysAgo);

    const total = this.db.prepare(
      'SELECT COALESCE(SUM(total_tokens), 0) as tokens, COUNT(*) as requests, MAX(created_at) as lastUsedAt FROM ai_usage'
    ).get() as any;
    const today = this.db.prepare(
      "SELECT COALESCE(SUM(total_tokens), 0) as tokens, COUNT(*) as requests FROM ai_usage WHERE substr(created_at, 1, 10) = ?"
    ).get(todayKey) as any;
    const month = this.db.prepare(
      "SELECT COALESCE(SUM(total_tokens), 0) as tokens FROM ai_usage WHERE substr(created_at, 1, 7) = ?"
    ).get(monthKey) as any;
    const byKind = this.db.prepare(
      'SELECT kind, COALESCE(SUM(total_tokens), 0) as tokens, COUNT(*) as requests FROM ai_usage GROUP BY kind ORDER BY tokens DESC'
    ).all() as any[];
    const dailyRows = this.db.prepare(
      "SELECT substr(created_at, 1, 10) as date, COALESCE(SUM(total_tokens), 0) as tokens, COUNT(*) as requests FROM ai_usage WHERE substr(created_at, 1, 10) >= ? GROUP BY substr(created_at, 1, 10) ORDER BY date ASC"
    ).all(rangeStartKey) as any[];

    if (Number(total.tokens || 0) === 0) {
      return this.getEstimatedAIUsageSummary(todayKey, monthKey, sevenDaysAgo);
    }

    const dailyMap = new Map(dailyRows.map(row => [row.date, row]));
    const daily = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + index);
      const date = d.toISOString().slice(0, 10);
      const row = dailyMap.get(date) as any;
      return {
        date,
        tokens: row ? Number(row.tokens) : 0,
        requests: row ? Number(row.requests) : 0,
      };
    });

    return {
      totalTokens: Number(total.tokens || 0),
      todayTokens: Number(today.tokens || 0),
      monthTokens: Number(month.tokens || 0),
      totalRequests: Number(total.requests || 0),
      todayRequests: Number(today.requests || 0),
      lastUsedAt: total.lastUsedAt || undefined,
      byKind: byKind.map(row => ({
        kind: row.kind,
        tokens: Number(row.tokens || 0),
        requests: Number(row.requests || 0),
      })),
      daily,
    };
  }

  private getEstimatedAIUsageSummary(todayKey: string, monthKey: string, sevenDaysAgo: Date): AIUsageSummary {
    const messages = this.db.prepare('SELECT content, role, created_at FROM messages ORDER BY created_at ASC').all() as any[];
    const assistantMessages = messages.filter(message => message.role === 'assistant');
    const totalTokens = messages.reduce((sum, message) => sum + this.estimateTokens(message.content), 0);
    const todayTokens = messages
      .filter(message => String(message.created_at || '').slice(0, 10) === todayKey)
      .reduce((sum, message) => sum + this.estimateTokens(message.content), 0);
    const monthTokens = messages
      .filter(message => String(message.created_at || '').slice(0, 7) === monthKey)
      .reduce((sum, message) => sum + this.estimateTokens(message.content), 0);

    const daily = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + index);
      const date = d.toISOString().slice(0, 10);
      const dayMessages = messages.filter(message => String(message.created_at || '').slice(0, 10) === date);
      return {
        date,
        tokens: dayMessages.reduce((sum, message) => sum + this.estimateTokens(message.content), 0),
        requests: dayMessages.filter(message => message.role === 'assistant').length,
      };
    });

    return {
      totalTokens,
      todayTokens,
      monthTokens,
      totalRequests: assistantMessages.length,
      todayRequests: assistantMessages.filter(message => String(message.created_at || '').slice(0, 10) === todayKey).length,
      lastUsedAt: messages[messages.length - 1]?.created_at,
      byKind: totalTokens > 0 ? [{ kind: 'chat-estimated', tokens: totalTokens, requests: assistantMessages.length }] : [],
      daily,
    };
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
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          ai: { ...DEFAULT_SETTINGS.ai, ...(parsed.ai || {}) },
          pet: { ...DEFAULT_SETTINGS.pet, ...(parsed.pet || {}) },
          petChatter: { ...DEFAULT_SETTINGS.petChatter, ...(parsed.petChatter || {}) },
          behavior: { ...DEFAULT_SETTINGS.behavior, ...(parsed.behavior || {}) },
          reminder: { ...DEFAULT_SETTINGS.reminder, ...(parsed.reminder || {}) },
          app: { ...DEFAULT_SETTINGS.app, ...(parsed.app || {}) },
        };
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
  getDataCounts(): { messages: number; todos: number; notes: number } {
    return {
      messages: (this.db.prepare('SELECT COUNT(*) as c FROM messages').get() as any).c,
      todos: (this.db.prepare('SELECT COUNT(*) as c FROM todos').get() as any).c,
      notes: (this.db.prepare('SELECT COUNT(*) as c FROM notes').get() as any).c,
    };
  }

  // ==================== Export/Import ====================
  exportAllData(): { messages: ChatMessage[]; todos: Todo[]; notes: Note[]; settings: Record<string, string> } {
    return {
      messages: this.getChatHistory(10000),
      todos: this.getAllTodos(),
      notes: this.getAllNotes(),
      settings: this.getAllSettings(),
    };
  }

  importData(data: { messages?: ChatMessage[]; todos?: Todo[]; notes?: Note[]; settings?: Record<string, string> }): void {
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
          this.db.prepare('INSERT INTO todos (id, title, description, completed, priority, due, repeat, enabled, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(t.id, t.title, t.description || null, t.completed ? 1 : 0, t.priority, t.due || null, t.repeat || 'none', t.enabled !== false ? 1 : 0, t.source, t.createdAt, t.updatedAt);
        }
      }
      if (data.notes) {
        this.db.prepare('DELETE FROM notes').run();
        for (const n of data.notes) {
          this.db.prepare('INSERT INTO notes (id, title, content, tags, pinned, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(n.id, n.title || this.makeNoteTitle(n.content), n.content, JSON.stringify(n.tags), n.pinned ? 1 : 0, n.source, n.createdAt, n.updatedAt);
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
      repeat: row.repeat || 'none',
      enabled: row.enabled === 1,
      lastTriggered: row.last_triggered || undefined,
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
      title: row.title || this.makeNoteTitle(row.content),
      content: row.content,
      tags,
      pinned: row.pinned === 1,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

  private makeNoteTitle(content: string): string {
    const firstLine = String(content || '').split(/\r?\n/).find(Boolean) || '未命名记事';
    return firstLine.slice(0, 24);
  }

  private estimateTokens(text: string): number {
    const normalized = String(text || '').trim();
    if (!normalized) return 0;
    return Math.max(1, Math.ceil(normalized.length / 2));
  }

  private normalizeSearchText(text: string): string {
    return String(text || '').toLowerCase().replace(/\s+/g, '').replace(/[，。！？、,.!?;；:："'“”‘’【】\[\]()（）]/g, '');
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
