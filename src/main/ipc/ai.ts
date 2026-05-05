import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { AIService } from '../services/aiService';
import { StorageService } from '../services/storage';

export function registerAIHandlers(aiService: AIService, storage: StorageService, getPetWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async () => {
    try {
      return await aiService.testConnection();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AI_GET_MODELS, async () => {
    try {
      return await aiService.getModels();
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_event, message: string) => {
    try {
      // Save user message
      storage.addMessage('user', message);

      // Get AI response
      const response = await aiService.chat(message);
      console.log('[IPC ai:chat] Intent:', response.intent, 'Reply:', response.reply?.slice(0, 80));

      // Process intent and get final reply
      const finalResponse = await processIntent(response, storage, aiService, getPetWindow);
      console.log('[IPC ai:chat] Final reply:', finalResponse.reply?.slice(0, 120));

      // Save assistant message with final reply
      storage.addMessage('assistant', finalResponse.reply, finalResponse.mood, finalResponse.intent);

      return finalResponse;
    } catch (error: any) {
      console.error('[IPC ai:chat] Error:', error.message);
      const errorResponse = {
        intent: 'chat' as const,
        reply: `出了点问题喵: ${error.message}`,
        mood: 'normal' as const,
      };
      storage.addMessage('assistant', errorResponse.reply, errorResponse.mood, errorResponse.intent);
      return errorResponse;
    }
  });
}

function toUTCIso(timeStr: string): string {
  if (!timeStr) return timeStr;
  // Already UTC
  if (timeStr.endsWith('Z') || timeStr.includes('+')) return timeStr;
  // Local time without timezone - parse as local and convert to UTC
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return timeStr;
  return d.toISOString();
}

async function processIntent(
  response: { intent: string; reply: string; mood: string; data?: any },
  storage: StorageService,
  aiService: AIService,
  getPetWindow: () => BrowserWindow | null
): Promise<{ intent: string; reply: string; mood: string; data?: any }> {
  const { intent, data } = response;

  switch (intent) {
    case 'create_todo':
      if (data?.title) {
        storage.createTodo({
          title: data.title,
          description: data.description,
          priority: data.priority || 'normal',
          due: data.due ? toUTCIso(data.due) : undefined,
          source: 'ai',
        });
      }
      return response;

    case 'create_note':
      if (data?.content) {
        storage.createNote({
          content: data.content,
          tags: data.tags || [],
          source: 'ai',
        });
      }
      return response;

    case 'create_reminder':
      if (data?.content && data?.time) {
        storage.createReminder({
          content: data.content,
          time: toUTCIso(data.time),
          repeat: data.repeat || 'none',
          source: 'ai',
        });
      }
      return response;

    case 'query_todos': {
      const todos = storage.getAllTodos();
      const summary = todos.length > 0
        ? todos.map((t, i) => `${i + 1}. ${t.completed ? '✅' : '⬜'} ${t.title}${t.due ? ` (截止: ${t.due})` : ''}`).join('\n')
        : '没有待办事项';
      const contextResponse = await aiService.chatWithContext(
        response.reply,
        `查询结果：\n${summary}\n\n请用你的风格回复用户。`
      );
      return {
        intent: contextResponse.intent || response.intent,
        reply: contextResponse.reply || response.reply,
        mood: contextResponse.mood || response.mood,
        data: contextResponse.data || response.data,
      };
    }

    case 'query_notes': {
      const notes = storage.getAllNotes();
      const summary = notes.length > 0
        ? notes.map((n, i) => `${i + 1}. ${n.content.slice(0, 50)}${n.content.length > 50 ? '...' : ''}`).join('\n')
        : '没有记事';
      const contextResponse = await aiService.chatWithContext(
        response.reply,
        `查询结果：\n${summary}\n\n请用你的风格回复用户。`
      );
      return {
        intent: contextResponse.intent || response.intent,
        reply: contextResponse.reply || response.reply,
        mood: contextResponse.mood || response.mood,
        data: contextResponse.data || response.data,
      };
    }

    case 'query_reminders': {
      const reminders = storage.getAllReminders();
      const summary = reminders.length > 0
        ? reminders.map((r, i) => `${i + 1}. ${r.content} (${r.time}) ${r.repeat !== 'none' ? `[${r.repeat}]` : ''}`).join('\n')
        : '没有提醒';
      const contextResponse = await aiService.chatWithContext(
        response.reply,
        `查询结果：\n${summary}\n\n请用你的风格回复用户。`
      );
      return {
        intent: contextResponse.intent || response.intent,
        reply: contextResponse.reply || response.reply,
        mood: contextResponse.mood || response.mood,
        data: contextResponse.data || response.data,
      };
    }

    case 'delete_todo':
      if (data?.todoTitle) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo) storage.deleteTodo(todo.id);
      }
      return response;

    case 'delete_note':
      if (data?.noteContent) {
        const notes = storage.findNoteByContent(data.noteContent);
        if (notes.length > 0) storage.deleteNote(notes[0].id);
      }
      return response;

    case 'delete_reminder':
      if (data?.reminderContent) {
        const reminders = storage.getAllReminders();
        const found = reminders.find(r => r.content.includes(data.reminderContent));
        if (found) storage.deleteReminder(found.id);
      }
      return response;

    case 'update_todo':
      if (data?.todoTitle && data?.updates) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo) storage.updateTodo(todo.id, data.updates);
      }
      return response;

    case 'complete_todo':
      if (data?.todoTitle) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo) storage.toggleTodo(todo.id);
      }
      return response;

    default:
      return response;
  }
}
