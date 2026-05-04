import { PetRenderer } from './PetRenderer';
import { BubbleManager } from './BubbleManager';
import { InputBox } from './InputBox';
import { ContextMenu } from './ContextMenu';
import { BehaviorEngine } from './BehaviorEngine';
import { PetState } from './PetState';

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
const behaviorEngine = new BehaviorEngine(petState, renderer);

// Tell bubble manager where the pet is so bubble appears above it
const petBounds = renderer.getPetBounds();
bubbleManager.setPetPosition(petBounds.y);

// Make context menu globally accessible
(window as any).__contextMenu = contextMenu;

// Expose inputBox globally for PetRenderer double-click handler
(window as any).__inputBox = inputBox;

// Make renderer globally accessible for bubble positioning
(window as any).__petRenderer = renderer;
(window as any).__petState = petState;
(window as any).__bubbleManager = bubbleManager;

// Start rendering
renderer.start();

// Initialize behavior engine
behaviorEngine.start();

// Setup IPC listeners
const { ipcRenderer } = require('electron');

// Listen for reminder triggers
ipcRenderer.on('reminder:triggered', (_event: any, data: { id: string; content: string }) => {
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
  // Future: load different pet
  console.log('Switching to pet:', petId);
});

// Expose IPC for renderer modules
(window as any).__ipcRenderer = ipcRenderer;

console.log('Desktop Pet initialized! 🐾');
