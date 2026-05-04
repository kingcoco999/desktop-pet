import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { StorageService } from '../services/storage';

export function registerNoteHandlers(storage: StorageService): void {
  ipcMain.handle(IPC_CHANNELS.NOTE_GET_ALL, () => {
    return storage.getAllNotes();
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_CREATE, (_event, data) => {
    return storage.createNote(data);
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_UPDATE, (_event, id: string, updates) => {
    return storage.updateNote(id, updates);
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, (_event, id: string) => {
    return storage.deleteNote(id);
  });
}
