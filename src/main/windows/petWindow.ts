import { BrowserWindow, screen } from 'electron';
import path from 'path';

let petWindow: BrowserWindow | null = null;

export function createPetWindow(opacity?: number): BrowserWindow {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  petWindow = new BrowserWindow({
    width: 360,
    height: 320,
    x: screenWidth - 280,
    y: screenHeight - 380,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    opacity: opacity ?? 0.9,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });

  // Make the window click-through on transparent areas
  petWindow.setIgnoreMouseEvents(false);

  // Load pet renderer
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    petWindow.loadURL('http://localhost:5174');
  } else {
    petWindow.loadFile(path.join(__dirname, '../../renderer/pet/index.html'));
  }

  petWindow.on('closed', () => {
    petWindow = null;
  });

  return petWindow;
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow;
}
