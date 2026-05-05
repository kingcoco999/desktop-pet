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

      const localResponse = tryHandleLocalCommand(message, storage);
      if (localResponse) {
        storage.addMessage('assistant', localResponse.reply, localResponse.mood, localResponse.intent);
        return localResponse;
      }

      // Get AI response
      const response = await aiService.chat(message);
      console.log('[IPC ai:chat] Intent:', response.intent, 'Reply:', response.reply?.slice(0, 80));

      // Process intent and get final reply
      const finalResponse = await processIntent(response, storage, aiService, getPetWindow);
      finalResponse.reply = sanitizeReply(finalResponse.reply);
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

  ipcMain.handle(IPC_CHANNELS.AI_PET_CHATTER, async (_event, trigger: 'click' | 'idle') => {
    try {
      return await aiService.generatePetChatter(trigger);
    } catch (error: any) {
      return trigger === 'click' ? '喵，找我吗？' : '我在这儿陪你。';
    }
  });

  ipcMain.handle(IPC_CHANNELS.AI_USAGE_SUMMARY, () => {
    return storage.getAIUsageSummary();
  });
}

function tryHandleLocalCommand(message: string, storage: StorageService): { intent: string; reply: string; mood: string; data?: any } | null {
  const text = normalizeCommandText(message);
  if (!text) return null;

  if (/(删除|删掉|清空).*(全部|所有).*(待办|任务|todo)/.test(text) || /(全部|所有).*(待办|任务|todo).*(删除|删掉|清空)/.test(text)) {
    const todos = storage.getAllTodos();
    for (const todo of todos) storage.deleteTodo(todo.id);
    return { intent: 'delete_todo', reply: `已删除全部 ${todos.length} 条待办。`, mood: 'happy' };
  }

  if (/(删除|删掉|移除|取消).*(待办|任务|todo)/.test(text) || /(待办|任务|todo).*(删除|删掉|移除|取消)/.test(text)) {
    const keyword = extractKeyword(message, ['删除', '删掉', '移除', '取消', '待办', '任务', 'todo', '这个', '这条', '帮我', '把', '一下']);
    if (!keyword) return { intent: 'delete_todo', reply: '你想删除哪条待办？告诉我标题里的几个字就行。', mood: 'normal' };
    const todo = storage.findTodoByTitle(keyword);
    if (!todo) return { intent: 'delete_todo', reply: `没找到包含「${keyword}」的待办。`, mood: 'normal' };
    storage.deleteTodo(todo.id);
    return { intent: 'delete_todo', reply: `已删除待办「${todo.title}」。`, mood: 'happy', data: { todoTitle: todo.title } };
  }

  if (/(完成|做完|标记完成).*(待办|任务|todo)/.test(text) || /(待办|任务|todo).*(完成|做完|标记完成)/.test(text)) {
    const keyword = extractKeyword(message, ['完成', '做完', '标记完成', '待办', '任务', 'todo', '这个', '这条', '帮我', '把', '一下']);
    if (!keyword) return { intent: 'complete_todo', reply: '你想完成哪条待办？告诉我标题里的几个字就行。', mood: 'normal' };
    const todo = storage.findTodoByTitle(keyword);
    if (!todo) return { intent: 'complete_todo', reply: `没找到包含「${keyword}」的待办。`, mood: 'normal' };
    if (!todo.completed) storage.toggleTodo(todo.id);
    return { intent: 'complete_todo', reply: `已完成待办「${todo.title}」。`, mood: 'happy', data: { todoTitle: todo.title } };
  }

  return null;
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
  if (Array.isArray(response.data?.actions)) {
    const results = [];
    for (const action of response.data.actions) {
      results.push(await processIntent(action, storage, aiService, getPetWindow));
    }

    const replies = results.map(result => result.reply).filter(Boolean);
    const last = results[results.length - 1] || response;
    return {
      intent: last.intent || response.intent,
      reply: replies.join('\n') || response.reply,
      mood: last.mood || response.mood,
      data: response.data,
    };
  }

  const { intent, data } = response;

  switch (intent) {
    case 'create_todo':
      if (data?.title) {
        storage.createTodo({
          title: data.title,
          description: data.description,
          priority: data.priority || 'normal',
          due: data.due ? toUTCIso(data.due) : undefined,
          repeat: data.repeat || 'none',
          enabled: data.enabled !== false,
          source: 'ai',
        });
      }
      return response;

    case 'create_note':
      if (data?.content) {
        storage.createNote({
          title: data.title,
          content: data.content,
          tags: data.tags || [],
          source: 'ai',
        });
      }
      return response;

    case 'create_reminder':
      if (data?.content && data?.time) {
        storage.createTodo({
          title: data.content,
          due: toUTCIso(data.time),
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
        ? notes.map((n, i) => `${i + 1}. ${n.title}: ${n.content.slice(0, 50)}${n.content.length > 50 ? '...' : ''}`).join('\n')
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
      const allTodos = storage.getAllTodos();
      const reminders = allTodos.filter(t => t.due && !t.completed);
      const summary = reminders.length > 0
        ? reminders.map((t, i) => `${i + 1}. ${t.title} (${t.due}) ${t.repeat !== 'none' ? `[${t.repeat}]` : ''}`).join('\n')
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
      return deleteTodoByKeyword(response, storage, data?.todoTitle || data?.title || data?.keyword);

    case 'delete_note':
      if (data?.noteContent) {
        const notes = storage.findNoteByContent(data.noteContent);
        if (notes.length > 0) storage.deleteNote(notes[0].id);
      }
      return response;

    case 'delete_reminder':
      if (data?.reminderContent) {
        const found = storage.findTodoByTitle(data.reminderContent);
        if (found) storage.deleteTodo(found.id);
      }
      return response;

    case 'update_todo':
      if (data?.todoTitle && data?.updates) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo) {
          const updates = normalizeTodoUpdates(data.updates);
          storage.updateTodo(todo.id, updates);
        }
      }
      return response;

    case 'update_note':
      if ((data?.noteContent || data?.title) && data?.updates) {
        const notes = storage.findNoteByContent(data.noteContent || data.title);
        if (notes.length > 0) storage.updateNote(notes[0].id, data.updates);
      }
      return response;

    case 'complete_todo':
      if (data?.todoTitle) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo && !todo.completed) storage.toggleTodo(todo.id);
      }
      return response;

    case 'reopen_todo':
      if (data?.todoTitle) {
        const todo = storage.findTodoByTitle(data.todoTitle);
        if (todo && todo.completed) storage.toggleTodo(todo.id);
      }
      return response;

    default:
      return response;
  }
}

function deleteTodoByKeyword(
  response: { intent: string; reply: string; mood: string; data?: any },
  storage: StorageService,
  keyword?: string,
) {
  if (!keyword) {
    return { ...response, reply: '你想删除哪条待办？告诉我标题里的几个字就行。' };
  }

  const todo = storage.findTodoByTitle(keyword);
  if (!todo) {
    return { ...response, reply: `没找到包含「${keyword}」的待办。` };
  }

  storage.deleteTodo(todo.id);
  return { ...response, reply: `已删除待办「${todo.title}」。` };
}

function normalizeTodoUpdates(updates: any) {
  const next = { ...updates };
  if (next.due) next.due = toUTCIso(next.due);
  if (next.due === null || next.due === '') {
    next.due = null;
    next.enabled = false;
    next.repeat = 'none';
  }
  return next;
}
