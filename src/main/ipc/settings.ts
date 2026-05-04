import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { StorageService } from '../services/storage';
import fs from 'fs';
import path from 'path';

export function registerSettingsHandlers(storage: StorageService, getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event, key: string) => {
    return storage.getSetting(key);
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, key: string, value: string) => {
    storage.setSetting(key, value);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => {
    return storage.getAppSettings();
  });

  // Export data
  ipcMain.handle('data:export', async () => {
    const win = getMainWindow();
    if (!win) return null;

    const result = await dialog.showSaveDialog(win, {
      title: '导出数据',
      defaultPath: 'desktop-pet-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!result.canceled && result.filePath) {
      const data = storage.exportAllData();
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    }
    return false;
  });

  // Import data
  ipcMain.handle('data:import', async () => {
    const win = getMainWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      title: '导入数据',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const content = fs.readFileSync(result.filePaths[0], 'utf-8');
        const data = JSON.parse(content);
        storage.importData(data);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  });

  // Clear all data
  ipcMain.handle('data:clear', () => {
    storage.clearAllData();
    return true;
  });

  // Data counts
  ipcMain.handle('data:counts', () => {
    return storage.getDataCounts();
  });
}
