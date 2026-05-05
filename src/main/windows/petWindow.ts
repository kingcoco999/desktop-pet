import { BrowserWindow, screen } from 'electron';
import path from 'path';

let petWindow: BrowserWindow | null = null;

export function createPetWindow(opacity?: number): BrowserWindow {
  const workArea = screen.getPrimaryDisplay().workArea;

  petWindow = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    opacity: opacity ?? 0.9,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });

  // Make the window click-through on transparent areas, forward events for detection
  petWindow.setIgnoreMouseEvents(true, { forward: true });
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
