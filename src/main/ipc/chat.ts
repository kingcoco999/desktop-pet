import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { StorageService } from '../services/storage';

export function registerChatHandlers(storage: StorageService): void {
  ipcMain.handle(IPC_CHANNELS.CHAT_GET_HISTORY, (_event, limit?: number) => {
    return storage.getChatHistory(limit || 50);
  });

  ipcMain.handle(IPC_CHANNELS.CHAT_CLEAR, () => {
    storage.clearChatHistory();
    return true;
  });
}
