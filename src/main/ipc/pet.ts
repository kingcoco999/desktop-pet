import { ipcMain, BrowserWindow, dialog, screen, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import type { PetCatalogEntry, PetModel, Settings } from '../../shared/types';
import type { StorageService } from '../services/storage';

type RawPetConfig = Record<string, any>;

const DEFAULT_ALIASES: PetModel['aliases'] = {
  idle: 'idle',
  'walk-left': 'running-left',
  'walk-right': 'running-right',
  'walk-up': 'idle',
  'walk-down': 'idle',
  sit: 'waiting',
  sleep: 'failed',
  talk: 'waving',
  happy: 'waving',
  eat: 'review',
  drag: 'idle',
  fall: 'jumping',
  play: 'running',
  jump: 'jumping',
  scratch: 'review',
  rub: 'review',
};

const DEFAULT_CODEX_ANIMATIONS: PetModel['animations'] = {
  idle: { row: 0, frames: 6 },
  'running-right': { row: 1, frames: 8 },
  'running-left': { row: 2, frames: 8 },
  waving: { row: 3, frames: 4 },
  jumping: { row: 4, frames: 5 },
  failed: { row: 5, frames: 8 },
  waiting: { row: 6, frames: 6 },
  running: { row: 7, frames: 6 },
  review: { row: 8, frames: 6 },
};

interface ResolvedPetEntry extends PetCatalogEntry {
  dir: string;
  config: RawPetConfig;
}

const petHitboxes = new Map<number, { x: number; y: number; width: number; height: number }>();
const petIgnoreMouseState = new Map<number, boolean>();
let hoverActivationTimer: NodeJS.Timeout | null = null;

export function registerPetHandlers(getPetWindow: () => BrowserWindow | null, storage: StorageService): void {
  if (!hoverActivationTimer) {
    hoverActivationTimer = setInterval(() => {
      const win = getPetWindow();
      if (!win || win.isDestroyed()) return;

      const webContentsId = win.webContents.id;
      if (!petIgnoreMouseState.get(webContentsId)) return;

      const hitbox = petHitboxes.get(webContentsId);
      if (!hitbox) return;

      const cursor = screen.getCursorScreenPoint();
      const [winX, winY] = win.getPosition();
      const insidePetBounds =
        cursor.x >= winX + hitbox.x &&
        cursor.x <= winX + hitbox.x + hitbox.width &&
        cursor.y >= winY + hitbox.y &&
        cursor.y <= winY + hitbox.y + hitbox.height;

      if (insidePetBounds) {
        win.setIgnoreMouseEvents(false);
        petIgnoreMouseState.set(webContentsId, false);
      }
    }, 33);
  }

  ipcMain.on('pet:drag-start', (_event) => {
    // no-op, just signals drag started
  });

  ipcMain.on('pet:update-hitbox', (event, bounds: { x: number; y: number; width: number; height: number }) => {
    petHitboxes.set(event.sender.id, bounds);
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

  ipcMain.handle('pet:get-position', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const [x, y] = win.getPosition();
      return { x, y };
    }
    return { x: 0, y: 0 };
  });

  ipcMain.handle('pet:get-desktop-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const [x, y] = win.getPosition();
      const [width, height] = win.getSize();
      const display = screen.getDisplayMatching(win.getBounds());
      return {
        x,
        y,
        width,
        height,
        workArea: display.workArea,
      };
    }
    const workArea = screen.getPrimaryDisplay().workArea;
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      workArea,
    };
  });

  ipcMain.on('pet:set-ignore-mouse-events', (event, ignore: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, { forward: true });
      petIgnoreMouseState.set(event.sender.id, ignore);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PET_GET_LIST, () => {
    return getAvailablePets().map(({ id, name, builtin }) => ({ id, name, builtin }));
  });

  ipcMain.handle(IPC_CHANNELS.PET_GET_CURRENT, () => {
    return { id: storage.getAppSettings().pet.currentPet };
  });

  ipcMain.handle(IPC_CHANNELS.PET_GET_MODEL, (_event, petId?: string) => {
    const currentPetId = petId || storage.getAppSettings().pet.currentPet;
    const pet = getPetById(currentPetId) || getPetById('honey') || getAvailablePets()[0];
    if (!pet) {
      throw new Error('No pet models available.');
    }
    if (!petId && pet.id !== currentPetId) {
      const settings = storage.getAppSettings();
      storage.saveAppSettings({
        ...settings,
        pet: {
          ...settings.pet,
          currentPet: pet.id,
        },
      });
    }
    return normalizePetModel(pet);
  });

  ipcMain.handle(IPC_CHANNELS.PET_IMPORT, async () => {
    const win = getPetWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      title: '导入宠物',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const srcDir = result.filePaths[0];
    const petJsonPath = path.join(srcDir, 'pet.json');
    if (!fs.existsSync(petJsonPath)) {
      return { success: false, message: '找不到 pet.json 配置文件' };
    }

    try {
      const config = JSON.parse(fs.readFileSync(petJsonPath, 'utf-8')) as RawPetConfig;
      const petId = sanitizePetId(config.id || config.name || config.displayName || path.basename(srcDir));
      const destDir = path.join(getCustomPetsDir(), petId);

      fs.mkdirSync(destDir, { recursive: true });
      copyDirSync(srcDir, destDir);

      return {
        success: true,
        pet: {
          id: petId,
          name: config.displayName || config.name || petId,
          builtin: false,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PET_SWITCH, (_event, petId: string) => {
    const pet = getPetById(petId);
    if (!pet) {
      throw new Error(`Pet "${petId}" not found.`);
    }

    const settings = storage.getAppSettings();
    const nextSettings: Settings = {
      ...settings,
      pet: {
        ...settings.pet,
        currentPet: petId,
      },
    };
    storage.saveAppSettings(nextSettings);

    const petWin = getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('pet:switch', petId);
    }
    return true;
  });
}

function getBuiltinPetsDir(): string {
  return path.join(app.getAppPath(), 'src', 'assets', 'pets');
}

function getCustomPetsDir(): string {
  return path.join(app.getPath('userData'), 'pets');
}

function getPetSearchRoots(): Array<{ dir: string; builtin: boolean }> {
  return [
    { dir: getBuiltinPetsDir(), builtin: true },
    { dir: getCustomPetsDir(), builtin: false },
  ];
}

function getAvailablePets(): ResolvedPetEntry[] {
  const pets = new Map<string, ResolvedPetEntry>();

  for (const root of getPetSearchRoots()) {
    if (!fs.existsSync(root.dir)) continue;

    for (const dirName of fs.readdirSync(root.dir)) {
      const petDir = path.join(root.dir, dirName);
      const petJsonPath = path.join(petDir, 'pet.json');
      if (!fs.existsSync(petJsonPath)) continue;

      try {
        const config = JSON.parse(fs.readFileSync(petJsonPath, 'utf-8')) as RawPetConfig;
        const id = sanitizePetId(config.id || config.name || config.displayName || dirName);
        const candidate: ResolvedPetEntry = {
          id,
          name: config.displayName || config.name || id,
          builtin: root.builtin,
          dir: petDir,
          config,
        };
        if (root.builtin && id === 'pixel-cat') {
          continue;
        }
        normalizePetModel(candidate);
        pets.set(id, candidate);
      } catch {
        // Skip invalid or unsupported pets.
      }
    }
  }

  return Array.from(pets.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

function getPetById(petId: string): ResolvedPetEntry | undefined {
  return getAvailablePets().find((pet) => pet.id === petId);
}

function normalizePetModel(pet: ResolvedPetEntry): PetModel {
  const { config, dir, id, name } = pet;
  const spritesheetFile =
    config.spritesheetPath ||
    config.spritesheet ||
    config.image ||
    'spritesheet.webp';
  const spritesheetPath = path.join(dir, spritesheetFile);
  const spritesheetDataUrl = toDataUrl(spritesheetPath);
  const spritesheetUrl = spritesheetPath;

  if (Array.isArray(config.rows) && config.atlas) {
    const animations = Object.fromEntries(
      config.rows.map((row: any) => [row.state, { row: row.row, frames: row.frames }]),
    );

    return {
      id,
      name,
      description: config.description,
      spritesheetUrl,
      spritesheetDataUrl,
      frameWidth: config.atlas.cell_width,
      frameHeight: config.atlas.cell_height,
      columns: config.atlas.columns,
      rows: config.atlas.rows,
      animations,
      aliases: DEFAULT_ALIASES,
      mirrorStates: config.mirrorStates || {},
    };
  }

  if (config.spritesheetPath || config.displayName || config.id) {
    const animations = {
      ...DEFAULT_CODEX_ANIMATIONS,
      ...(config.animations || {}),
    };

    return {
      id,
      name,
      description: config.description,
      spritesheetUrl,
      spritesheetDataUrl,
      frameWidth: config.frameWidth || 192,
      frameHeight: config.frameHeight || 208,
      columns: config.columns || 8,
      rows: config.rows || 9,
      animations,
      aliases: {
        ...DEFAULT_ALIASES,
        ...(config.aliases || {}),
      },
      mirrorStates: config.mirrorStates || {},
    };
  }

  if (config.frameWidth && config.frameHeight && config.columns && config.rows && config.animations) {
    return {
      id,
      name,
      description: config.description,
      spritesheetUrl,
      spritesheetDataUrl,
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight,
      columns: config.columns,
      rows: config.rows,
      animations: config.animations,
      aliases: {
        ...DEFAULT_ALIASES,
        ...(config.aliases || {}),
      },
      mirrorStates: config.mirrorStates || {},
    };
  }

  throw new Error(`Pet "${id}" has an unsupported pet.json format.`);
}

function toDataUrl(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType =
    ext === '.webp' ? 'image/webp'
    : ext === '.png' ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : 'application/octet-stream';
  const bytes = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

function sanitizePetId(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pet';
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
