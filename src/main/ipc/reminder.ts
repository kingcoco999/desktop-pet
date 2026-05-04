import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { StorageService } from '../services/storage';

export function registerReminderHandlers(storage: StorageService): void {
  ipcMain.handle(IPC_CHANNELS.REMINDER_GET_ALL, () => {
    return storage.getAllReminders();
  });

  ipcMain.handle(IPC_CHANNELS.REMINDER_CREATE, (_event, data) => {
    return storage.createReminder(data);
  });

  ipcMain.handle(IPC_CHANNELS.REMINDER_UPDATE, (_event, id: string, updates) => {
    return storage.updateReminder(id, updates);
  });

  ipcMain.handle(IPC_CHANNELS.REMINDER_DELETE, (_event, id: string) => {
    return storage.deleteReminder(id);
  });

  ipcMain.handle(IPC_CHANNELS.REMINDER_TOGGLE, (_event, id: string) => {
    return storage.toggleReminder(id);
  });
}
