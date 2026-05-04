import { ipcMain, BrowserWindow, dialog, screen } from 'electron';
import { createConsoleWindow } from '../windows/consoleWindow';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export function registerPetHandlers(getPetWindow: () => BrowserWindow | null): void {
  // Window dragging
  ipcMain.on('pet:drag-start', (_event) => {
    // no-op, just signals drag started
  });

  ipcMain.on('pet:dragging', (event, data: { deltaX: number; deltaY: number }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const bounds = win.getBounds();
      const [w, h] = win.getSize();
      const workArea = screen.getPrimaryDisplay().workArea;
      const x = Math.max(workArea.x, Math.min(bounds.x + data.deltaX, workArea.x + workArea.width - w));
      const y = Math.max(workArea.y, Math.min(bounds.y + data.deltaY, workArea.y + workArea.height - h));
      win.setPosition(Math.round(x), Math.round(y));
    }
  });

  // Move pet window — clamped to screen bounds
  ipcMain.on('pet:move', (event, data: { x: number; y: number }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const [w, h] = win.getSize();
      const workArea = screen.getPrimaryDisplay().workArea;
      const x = Math.max(workArea.x, Math.min(data.x, workArea.x + workArea.width - w));
      const y = Math.max(workArea.y, Math.min(data.y, workArea.y + workArea.height - h));
      win.setPosition(Math.round(x), Math.round(y));
    }
  });

  // Get pet window position
  ipcMain.handle('pet:get-position', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const [x, y] = win.getPosition();
      return { x, y };
    }
    return { x: 0, y: 0 };
  });

  // Get available pets list
  ipcMain.handle(IPC_CHANNELS.PET_GET_LIST, () => {
    const petsDir = path.join(app.getPath('userData'), 'pets');
    const builtinPetsDir = path.join(__dirname, '../../assets/pets');
    const pets: { id: string; name: string; builtin: boolean }[] = [];

    // Builtin pets
    if (fs.existsSync(builtinPetsDir)) {
      for (const dir of fs.readdirSync(builtinPetsDir)) {
        const petJsonPath = path.join(builtinPetsDir, dir, 'pet.json');
        if (fs.existsSync(petJsonPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(petJsonPath, 'utf-8'));
            pets.push({ id: dir, name: config.name || dir, builtin: true });
          } catch { /* skip invalid */ }
        }
      }
    }

    // Custom pets
    if (fs.existsSync(petsDir)) {
      for (const dir of fs.readdirSync(petsDir)) {
        const petJsonPath = path.join(petsDir, dir, 'pet.json');
        if (fs.existsSync(petJsonPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(petJsonPath, 'utf-8'));
            pets.push({ id: dir, name: config.name || dir, builtin: false });
          } catch { /* skip invalid */ }
        }
      }
    }

    return pets;
  });

  // Get current pet info
  ipcMain.handle(IPC_CHANNELS.PET_GET_CURRENT, () => {
    const settings = require('../services/storage').getDatabase; // will be set up differently
    return { id: 'pixel-cat', name: '像素小猫' };
  });

  // Import custom pet
  ipcMain.handle(IPC_CHANNELS.PET_IMPORT, async () => {
    const win = getPetWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      title: '导入宠物',
      properties: ['openDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const srcDir = result.filePaths[0];
      const petJsonPath = path.join(srcDir, 'pet.json');

      if (!fs.existsSync(petJsonPath)) {
        return { success: false, message: '找不到 pet.json 配置文件' };
      }

      try {
        const config = JSON.parse(fs.readFileSync(petJsonPath, 'utf-8'));
        const destDir = path.join(app.getPath('userData'), 'pets', config.name || 'custom-pet');

        // Copy directory
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        copyDirSync(srcDir, destDir);

        return { success: true, id: config.name || 'custom-pet', name: config.name };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }
    return null;
  });

  // Switch pet
  ipcMain.handle(IPC_CHANNELS.PET_SWITCH, (_event, petId: string) => {
    const petWin = getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('pet:switch', petId);
    }
    return true;
  });
}

function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
