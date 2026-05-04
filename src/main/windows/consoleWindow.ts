import { BrowserWindow } from 'electron';
import path from 'path';

let consoleWindow: BrowserWindow | null = null;

export function createConsoleWindow(): BrowserWindow {
  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.focus();
    return consoleWindow;
  }

  consoleWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Desktop Pet Console',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load console UI
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    consoleWindow.loadURL('http://localhost:5173');
  } else {
    consoleWindow.loadFile(path.join(__dirname, '../../renderer/console/index.html'));
  }

  consoleWindow.on('closed', () => {
    consoleWindow = null;
  });

  return consoleWindow;
}

export function getConsoleWindow(): BrowserWindow | null {
  return consoleWindow;
}
