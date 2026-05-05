import { PetRenderer } from './PetRenderer';
import { BubbleManager } from './BubbleManager';
import { InputBox } from './InputBox';
import { ContextMenu } from './ContextMenu';
import { BehaviorEngine } from './BehaviorEngine';
import { PetState } from './PetState';
import { QuickCreatePanel } from './QuickCreatePanel';
import { PetChatter } from './PetChatter';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import type { PetModel, Settings } from '../../shared/types';

// Initialize pet system
const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
const bubbleContainer = document.getElementById('bubble-container') as HTMLDivElement;
const inputContainer = document.getElementById('input-container') as HTMLDivElement;
const contextMenuContainer = document.getElementById('context-menu-container') as HTMLDivElement;

const petState = new PetState();
const renderer = new PetRenderer(canvas, petState);
const bubbleManager = new BubbleManager(bubbleContainer);
const inputBox = new InputBox(inputContainer);
const contextMenu = new ContextMenu(contextMenuContainer);
const subContextMenu = new ContextMenu(contextMenuContainer);
const quickCreatePanel = new QuickCreatePanel(contextMenuContainer);
const behaviorEngine = new BehaviorEngine(petState, renderer);
const petChatter = new PetChatter(petState, bubbleManager);
const { ipcRenderer } = require('electron');

const syncPetAnchors = (): void => {
  const petBounds = renderer.getPetBounds();
  bubbleManager.setPetPosition(petBounds);
  inputBox.setPetPosition(petBounds);
  ipcRenderer.send('pet:update-hitbox', petBounds);
};

const applySettings = async (settings: Settings): Promise<void> => {
  if ((window as any).__currentPetModel?.id !== settings.pet.currentPet) {
    await loadPetModel(settings.pet.currentPet);
  }
  renderer.applySettings({
    size: settings.pet.size,
  });
  bubbleManager.configure({
    autoHide: settings.pet.bubbleAutoHide,
    hideDelay: settings.pet.bubbleHideDelay,
  });
  behaviorEngine.applySettings(settings);
  petChatter.applySettings(settings);
  document.documentElement.style.opacity = String(settings.pet.opacity);
  document.body.style.opacity = String(settings.pet.opacity);
  syncPetAnchors();
};

// Make context menu globally accessible
(window as any).__contextMenu = contextMenu;
(window as any).__subContextMenu = subContextMenu;
(window as any).__quickCreatePanel = quickCreatePanel;

// Expose inputBox globally for PetRenderer double-click handler
(window as any).__inputBox = inputBox;

// Make renderer globally accessible for bubble positioning
(window as any).__petRenderer = renderer;
(window as any).__petState = petState;
(window as any).__bubbleManager = bubbleManager;
(window as any).__behaviorEngine = behaviorEngine;
(window as any).__petChatter = petChatter;

petState.onUpdate(() => {
  syncPetAnchors();
});

// Start rendering
renderer.start();

// Initialize behavior engine
behaviorEngine.start();

async function loadPetModel(petId?: string): Promise<void> {
  const model = await ipcRenderer.invoke(IPC_CHANNELS.PET_GET_MODEL, petId) as PetModel;
  await renderer.loadModel(model);
  syncPetAnchors();
  (window as any).__currentPetModel = model;
  console.log('Loaded pet model:', model.id, model.name);
}

window.__loadPetModel = loadPetModel;

Promise.all([
  loadPetModel(),
  ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL).then(async (settings: Settings) => {
    if (settings) {
      await applySettings(settings);
    }
  }),
]).catch((error: unknown) => {
  console.error('Failed to initialize pet window:', error);
});

// Listen for todo reminder triggers
ipcRenderer.on('todo:triggered', (_event: any, data: { id: string; content: string }) => {
  petState.setAnimation('happy');
  bubbleManager.show(`⏰ ${data.content}`);
  setTimeout(() => petState.setAnimation('idle'), 3000);
});

// Listen for bubble show commands
ipcRenderer.on('bubble:show', (_event: any, message: string) => {
  bubbleManager.show(message);
});

// Listen for pet switch commands
ipcRenderer.on('pet:switch', (_event: any, petId: string) => {
  loadPetModel(petId).catch((error: unknown) => {
    console.error('Failed to switch pet:', error);
  });
});

ipcRenderer.on('settings:updated', (_event: any, settings: Settings) => {
  applySettings(settings).catch((error: unknown) => {
    console.error('Failed to apply updated settings:', error);
  });
});

// Expose IPC for renderer modules
(window as any).__ipcRenderer = ipcRenderer;

console.log('Desktop Pet initialized! 🐾');
