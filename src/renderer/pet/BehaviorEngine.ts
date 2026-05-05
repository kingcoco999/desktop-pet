import type { PetAnimationState } from '../../shared/types';
import { PetState } from './PetState';
import { PetRenderer } from './PetRenderer';

export class BehaviorEngine {
  public petState: PetState;
  public renderer: PetRenderer;
  public enabled: boolean = true;
  public walkEnabled: boolean = true;
  public restEnabled: boolean = true;
  public interactEnabled: boolean = true;
  public bubbleEnabled: boolean = true;
  public collisionEnabled: boolean = true;

  private idleTimer: number = 0;
  private walkTimer: number = 0;
  private isWalking: boolean = false;
  private walkDirection: 'left' | 'right' | 'up' | 'down' = 'left';
  private walkDistance: number = 0;
  private walkSpeed: number = 0.05;
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

      // Random actions while idle
      if (!this.isWalking && this.interactEnabled) {
        // Random jump
        if (this.idleTimer > 15000 && Math.random() < 0.002) {
          this.petState.setAnimation('jump');
          this.idleTimer = 0;
          setTimeout(() => {
            if (this.petState.currentAnimation === 'jump') {
              this.petState.setAnimation('idle');
            }
          }, 1500);
        }
        // Random play
        else if (this.idleTimer > 10000 && Math.random() < 0.001) {
          this.petState.setAnimation('play');
          this.idleTimer = 0;
          setTimeout(() => {
            if (this.petState.currentAnimation === 'play') {
              this.petState.setAnimation('idle');
            }
          }, 2000);
        }
        // Random scratch
        else if (this.idleTimer > 8000 && Math.random() < 0.003) {
          this.petState.setAnimation('scratch');
          this.idleTimer = 0;
          setTimeout(() => {
            if (this.petState.currentAnimation === 'scratch') {
              this.petState.setAnimation('idle');
            }
          }, 2000);
        }
        // Random rub
        else if (this.idleTimer > 12000 && Math.random() < 0.001) {
          this.petState.setAnimation('rub');
          this.idleTimer = 0;
          setTimeout(() => {
            if (this.petState.currentAnimation === 'rub') {
              this.petState.setAnimation('idle');
            }
          }, 2000);
        }
      }

      // Check for sit trigger
      if (this.restEnabled && this.idleTimer >= 5000 && !this.isWalking) {
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

      const moveX = dt * this.walkSpeed * (this.walkDirection === 'left' ? -1 : this.walkDirection === 'right' ? 1 : 0);
      const moveY = dt * this.walkSpeed * (this.walkDirection === 'up' ? -1 : this.walkDirection === 'down' ? 1 : 0);
      this.walkDistance += Math.sqrt(moveX * moveX + moveY * moveY);

      const maxWalk = 100 + Math.random() * 100;

      if (this.walkDistance >= maxWalk) {
        this.stopWalking();
      } else {
        // Actually move the window via IPC
        const ipc = (window as any).__ipcRenderer;
        if (ipc) {
          ipc.invoke('pet:get-position').then((pos: { x: number; y: number }) => {
            ipc.send('pet:move', { x: pos.x + moveX, y: pos.y + moveY });
          });
        }
      }

      // Edge detection
      if (this.collisionEnabled) {
        this.checkEdge();
      }
    }

    this.animFrameId = requestAnimationFrame(this.update);
  };

  private startWalking(): void {
    this.isWalking = true;
    this.walkDistance = 0;
    // Random direction including up and down
    const directions: ('left' | 'right' | 'up' | 'down')[] = ['left', 'right', 'up', 'down'];
    this.walkDirection = directions[Math.floor(Math.random() * directions.length)];
    const animMap: Record<string, PetAnimationState> = {
      'left': 'walk-left',
      'right': 'walk-right',
      'up': 'walk-up',
      'down': 'walk-down',
    };
    this.petState.setAnimation(animMap[this.walkDirection]);
  }

  private stopWalking(): void {
    this.isWalking = false;
    this.walkDistance = 0;
    this.petState.setAnimation('idle');
  }

  private checkEdge(): void {
    const bounds = this.renderer.getPetBounds();
    const margin = 20;

    // Check canvas edges
    if (this.walkDirection === 'left' && bounds.x <= margin) {
      this.walkDirection = 'right';
      this.petState.setAnimation('walk-right');
    } else if (this.walkDirection === 'right' && bounds.x + bounds.width >= this.renderer.getCanvasSize().width - margin) {
      this.walkDirection = 'left';
      this.petState.setAnimation('walk-left');
    } else if (this.walkDirection === 'up' && bounds.y <= margin) {
      this.walkDirection = 'down';
      this.petState.setAnimation('walk-down');
    } else if (this.walkDirection === 'down' && bounds.y + bounds.height >= this.renderer.getCanvasSize().height - margin) {
      this.walkDirection = 'up';
      this.petState.setAnimation('walk-up');
    }
  }
}
