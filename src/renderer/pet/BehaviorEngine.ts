import type { PetAnimationState } from '../../shared/types';
import { PetState } from './PetState';
import { PetRenderer } from './PetRenderer';

export class BehaviorEngine {
  private petState: PetState;
  private renderer: PetRenderer;
  private enabled: boolean = true;
  private walkEnabled: boolean = true;
  private idleTimer: number = 0;
  private walkTimer: number = 0;
  private isWalking: boolean = false;
  private walkDirection: 'left' | 'right' = 'left';
  private walkDistance: number = 0;
  private animFrameId: number = 0;
  private lastTime: number = 0;

  // Configurable probabilities
  private idleToSitChance: number = 0.3;
  private sitToSleepChance: number = 0.2;
  private walkInterval: [number, number] = [8000, 20000];
  private walkDuration: [number, number] = [2000, 5000];

  constructor(petState: PetState, renderer: PetRenderer) {
    this.petState = petState;
    this.renderer = renderer;
  }

  start(): void {
    if (!this.enabled) return;
    this.lastTime = performance.now();
    this.update();
  }

  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private update = (): void => {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (!this.enabled) {
      this.animFrameId = requestAnimationFrame(this.update);
      return;
    }

    const currentAnim = this.petState.currentAnimation;

    // Only run behavior when idle
    if (currentAnim === 'idle') {
      this.idleTimer += dt;

      // Check for walk trigger (skip if input is focused, menu or bubble hovered)
      const inputBox = (window as any).__inputBox;
      const contextMenu = (window as any).__contextMenu;
      const bubbleManager = (window as any).__bubbleManager;
      const uiHovered = (inputBox && inputBox.focused) ||
        (contextMenu && contextMenu.isHovered) ||
        (bubbleManager && bubbleManager.isHovered);
      if (this.walkEnabled && !this.isWalking && !uiHovered) {
        this.walkTimer += dt;
        const walkThreshold = this.walkInterval[0] + Math.random() * (this.walkInterval[1] - this.walkInterval[0]);

        if (this.walkTimer >= walkThreshold) {
          this.startWalking();
          this.walkTimer = 0;
        }
      }

      // Check for sit trigger
      if (this.idleTimer >= 5000 && !this.isWalking) {
        const sitThreshold = 5000 + Math.random() * 10000;
        if (this.idleTimer >= sitThreshold) {
          if (Math.random() < this.idleToSitChance) {
            this.petState.setAnimation('sit');
            this.idleTimer = 0;

            // Sit for a while, then maybe sleep
            setTimeout(() => {
              if (this.petState.currentAnimation === 'sit') {
                if (Math.random() < this.sitToSleepChance) {
                  this.petState.setAnimation('sleep');
                  // Wake up after some time
                  setTimeout(() => {
                    if (this.petState.currentAnimation === 'sleep') {
                      this.petState.setAnimation('idle');
                    }
                  }, 10000 + Math.random() * 20000);
                } else {
                  this.petState.setAnimation('idle');
                }
              }
            }, 5000 + Math.random() * 10000);
          }
          this.idleTimer = 0;
        }
      }
    }

    // Handle walking
    if (this.isWalking) {
      // Don't move window if input is focused, menu or bubble hovered
      const inputBox = (window as any).__inputBox;
      const contextMenu = (window as any).__contextMenu;
      const bubbleManager = (window as any).__bubbleManager;
      const uiHovered = (inputBox && inputBox.focused) ||
        (contextMenu && contextMenu.isHovered) ||
        (bubbleManager && bubbleManager.isHovered);
      if (uiHovered) {
        this.animFrameId = requestAnimationFrame(this.update);
        return;
      }

      const speed = 0.05; // pixels per ms
      const moveX = dt * speed * (this.walkDirection === 'left' ? -1 : 1);
      this.walkDistance += Math.abs(dt * speed);

      const maxWalk = 100 + Math.random() * 100;

      if (this.walkDistance >= maxWalk) {
        this.stopWalking();
      } else {
        // Actually move the window via IPC
        const ipc = (window as any).__ipcRenderer;
        if (ipc) {
          ipc.invoke('pet:get-position').then((pos: { x: number; y: number }) => {
            ipc.send('pet:move', { x: pos.x + moveX, y: pos.y });
          });
        }
      }

      // Edge detection
      this.checkEdge();
    }

    this.animFrameId = requestAnimationFrame(this.update);
  };

  private startWalking(): void {
    this.isWalking = true;
    this.walkDistance = 0;
    this.walkDirection = Math.random() > 0.5 ? 'left' : 'right';
    this.petState.setAnimation(this.walkDirection === 'left' ? 'walk-left' : 'walk-right');
    this.petState.setFacing(this.walkDirection);
  }

  private stopWalking(): void {
    this.isWalking = false;
    this.walkDistance = 0;
    this.petState.setAnimation('idle');
  }

  private checkEdge(): void {
    const canvasSize = this.renderer.getCanvasSize();
    const bounds = this.renderer.getPetBounds();
    const margin = 20;

    // Check if near edge
    if (this.walkDirection === 'left' && bounds.x <= margin) {
      this.walkDirection = 'right';
      this.petState.setAnimation('walk-right');
      this.petState.setFacing('right');
    } else if (this.walkDirection === 'right' && bounds.x + bounds.width >= canvasSize.width - margin) {
      this.walkDirection = 'left';
      this.petState.setAnimation('walk-left');
      this.petState.setFacing('left');
    }
  }
}
