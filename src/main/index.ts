import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { createPetWindow, getPetWindow } from './windows/petWindow';
import { createConsoleWindow, getConsoleWindow } from './windows/consoleWindow';
import { StorageService } from './services/storage';
import { AIService } from './services/aiService';
import { Scheduler } from './services/scheduler';
import { registerAIHandlers } from './ipc/ai';
import { registerTodoHandlers } from './ipc/todo';
import { registerNoteHandlers } from './ipc/note';
import { registerChatHandlers } from './ipc/chat';
import { registerSettingsHandlers } from './ipc/settings';
import { registerPetHandlers } from './ipc/pet';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import { closeDatabase } from './store/database';

let storage: StorageService;
let aiService: AIService;
let scheduler: Scheduler;

function createAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Console', click: () => createConsoleWindow() },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupIPC(): void {
  // Window control
  ipcMain.on(IPC_CHANNELS.WINDOW_OPEN_CONSOLE, () => {
    createConsoleWindow();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE_CONSOLE, () => {
    const win = getConsoleWindow();
    if (win) win.close();
  });

  // Quit app
  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.on('app:restart', () => {
    const relaunchPetWindow = (): void => {
      const petSettings = storage.getAppSettings().pet;
      const nextPetWindow = createPetWindow(petSettings.opacity);
      scheduler.setPetWindow(nextPetWindow);
    };

    const currentPetWindow = getPetWindow();
    if (currentPetWindow && !currentPetWindow.isDestroyed()) {
      currentPetWindow.once('closed', () => {
        relaunchPetWindow();
      });
      currentPetWindow.close();
      return;
    }

    relaunchPetWindow();
  });

  // Register all handlers
  registerAIHandlers(aiService, storage, getPetWindow);
  registerTodoHandlers(storage);
  registerNoteHandlers(storage);
  registerChatHandlers(storage);
  registerSettingsHandlers(storage, getConsoleWindow, getPetWindow);
  registerPetHandlers(getPetWindow, storage);
}

app.whenReady().then(() => {
  // Initialize services
  storage = new StorageService();
  aiService = new AIService(storage);
  scheduler = new Scheduler(storage);

  // Create windows
  const petSettings = storage.getAppSettings().pet;
  const petWin = createPetWindow(petSettings.opacity);
  scheduler.setPetWindow(petWin);

  // Setup
  createAppMenu();
  setupIPC();
  scheduler.start();

  // Open console window
  ipcMain.on('app:ready', () => {
    // Pet window is ready
  });
});

app.on('window-all-closed', () => {
  scheduler.stop();
  closeDatabase();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createPetWindow();
  }
});
