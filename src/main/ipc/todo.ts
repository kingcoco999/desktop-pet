import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { StorageService } from '../services/storage';

export function registerTodoHandlers(storage: StorageService): void {
  ipcMain.handle(IPC_CHANNELS.TODO_GET_ALL, () => {
    return storage.getAllTodos();
  });

  ipcMain.handle(IPC_CHANNELS.TODO_CREATE, (_event, data) => {
    return storage.createTodo(data);
  });

  ipcMain.handle(IPC_CHANNELS.TODO_UPDATE, (_event, id: string, updates) => {
    return storage.updateTodo(id, updates);
  });

  ipcMain.handle(IPC_CHANNELS.TODO_DELETE, (_event, id: string) => {
    return storage.deleteTodo(id);
  });

  ipcMain.handle(IPC_CHANNELS.TODO_TOGGLE, (_event, id: string) => {
    return storage.toggleTodo(id);
  });
}
