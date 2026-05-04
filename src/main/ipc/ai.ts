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

      // Save assistant message
      storage.addMessage('assistant', response.reply, response.mood, response.intent);

      // Process intent
      await processIntent(response, storage, aiService, getPetWindow);

      return response;
    } catch (error: any) {
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

async function processIntent(
  response: { intent: string; reply: string; mood: string; data?: any },
  storage: StorageService,
  aiService: AIService,
  getPetWindow: () => BrowserWindow | null
): Promise<void> {
  const { intent, data } = response;

  switch (intent) {
    case 'create_todo':
      if (data?.title) {
        storage.createTodo({
          title: data.title,
          description: data.description,
          priority: data.priority || 'normal',
          due: data.due || undefined,
          source: 'ai',
        });
      }
      break;

    case 'create_note':
      if (data?.content) {
        storage.createNote({
          content: data.content,
          tags: data.tags || [],
          source: 'ai',
        });
      }
      break;

    case 'create_reminder':
      if (data?.content && data?.time) {
        storage.createReminder({
          content: data.content,
          time: data.time,
          repeat: data.repeat || 'none',
          source: 'ai',
        });
      }
      break;

    case 'query_todos': {
      const todos = storage.getAllTodos();
      const summary = todos.length > 0
        ? todos.map((t, i) => `${i + 1}. ${t.completed ? '✅' : '⬜'} ${t.title}${t.due ? ` (截止: ${t.due})` : ''}`).join('\n')
        : '没有待办事项';
      const contextResponse = await aiService.chatWithContext(
        response.reply,
        `查询结果：\n${summary}\n\n请用你的风格回复用户。`
      );
      // Update the last assistant message with the contextual reply
      const petWin = getPetWindow();
      if (petWin && !petWin.isDestroyed()) {
        petWin.webContents.send('bubble:show', contextResponse.reply);
      }
      break;
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
      const petWin = getPetWindow();
      if (petWin && !petWin.isDestroyed()) {
        petWin.webContents.send('bubble:show', contextResponse.reply);
      }
      break;
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
      const petWin = getPetWindow();
      if (petWin && !petWin.isDestroyed()) {
        petWin.webContents.send('bubble:show', contextResponse.reply);
      }
      break;
    }

    case 'delete_todo':
      if (data?.todoTitle) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo) storage.deleteTodo(todo.id);
      }
      break;

    case 'delete_note':
      if (data?.noteContent) {
        const notes = storage.findNoteByContent(data.noteContent);
        if (notes.length > 0) storage.deleteNote(notes[0].id);
      }
      break;

    case 'delete_reminder':
      if (data?.reminderContent) {
        const reminders = storage.getAllReminders();
        const found = reminders.find(r => r.content.includes(data.reminderContent));
        if (found) storage.deleteReminder(found.id);
      }
      break;

    case 'update_todo':
      if (data?.todoTitle && data?.updates) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo) storage.updateTodo(todo.id, data.updates);
      }
      break;

    case 'complete_todo':
      if (data?.todoTitle) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo) storage.toggleTodo(todo.id);
      }
      break;
  }
}
