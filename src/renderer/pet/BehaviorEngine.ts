import type { PetAnimationState, Settings } from '../../shared/types';
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
  private walkVectorX: number = -1;
  private walkVectorY: number = 0;
  private walkDistance: number = 0;
  private walkSpeed: number = 0.05;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private edgeMargin: number = 24;
  private dragLocked: boolean = false;

  // Configurable probabilities
  private idleToSitChance: number = 0.3;
  private sitToSleepChance: number = 0.2;
  private walkInterval: [number, number] = [8000, 20000];
  private walkDuration: [number, number] = [2000, 5000];
  private currentWalkBudget: number = 0;
  private moveDistance: [number, number] = [90, 240];
  private slowWalkSpeed: number = 42;
  private fastRunSpeed: number = 86;
  private fastRunChance: number = 0.35;
  private movementArea: Settings['behavior']['movementArea'] = {
    enabled: false,
    leftPercent: 10,
    topPercent: 12,
    widthPercent: 80,
    heightPercent: 76,
  };

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

  applySettings(settings: Settings): void {
    this.enabled = settings.behavior.enabled;
    this.walkEnabled = settings.behavior.walkEnabled;
    this.idleToSitChance = settings.behavior.idleToSitChance;
    this.sitToSleepChance = settings.behavior.sitToSleepChance;
    this.walkInterval = settings.behavior.walkInterval;
    this.walkDuration = settings.behavior.walkDuration;
    this.moveDistance = settings.behavior.moveDistance;
    this.slowWalkSpeed = settings.behavior.slowWalkSpeed;
    this.fastRunSpeed = settings.behavior.fastRunSpeed;
    this.fastRunChance = settings.behavior.fastRunChance;
    this.movementArea = { ...settings.behavior.movementArea };
  }

  private update = (): void => {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (!this.enabled) {
      this.animFrameId = requestAnimationFrame(this.update);
      return;
    }

    if (this.dragLocked) {
      if (this.petState.currentAnimation !== 'drag') {
        this.petState.setAnimation('drag');
      }
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

      const moveX = dt * this.walkSpeed * this.walkVectorX;
      const moveY = dt * this.walkSpeed * this.walkVectorY;
      this.walkDistance += Math.sqrt(moveX * moveX + moveY * moveY);

      const maxWalk = this.currentWalkBudget > 0 ? this.currentWalkBudget : 100 + Math.random() * 100;

      if (this.walkDistance >= maxWalk) {
        this.stopWalking();
      } else {
        const bounds = this.renderer.getPetBounds();
        const viewport = this.renderer.getCanvasSize();
        const movementBounds = this.getMovementBounds(viewport, bounds);
        let nextX = this.petState.x + moveX;
        let nextY = this.petState.y + moveY;
        const minX = movementBounds.minX;
        const minY = movementBounds.minY;
        const maxX = movementBounds.maxX;
        const maxY = movementBounds.maxY;

        if (this.collisionEnabled && nextX <= minX) {
          this.walkVectorX = Math.abs(this.walkVectorX);
          nextX = minX;
        } else if (this.collisionEnabled && nextX >= maxX) {
          this.walkVectorX = -Math.abs(this.walkVectorX);
          nextX = maxX;
        }

        if (this.collisionEnabled && nextY <= minY) {
          this.walkVectorY = Math.abs(this.walkVectorY);
          nextY = minY;
        } else if (this.collisionEnabled && nextY >= maxY) {
          this.walkVectorY = -Math.abs(this.walkVectorY);
          nextY = maxY;
        }

        this.applyWalkAnimation(this.walkVectorX, this.walkVectorY);
        this.renderer.setPetPosition(nextX, nextY);
      }
    }

    this.animFrameId = requestAnimationFrame(this.update);
  };

  private startWalking(): void {
    this.isWalking = true;
    this.walkDistance = 0;
    const angle = Math.random() * Math.PI * 2;
    this.walkVectorX = Math.cos(angle);
    this.walkVectorY = Math.sin(angle);
    const pace = Math.random() < this.fastRunChance ? 'fast' : 'slow';
    this.petState.setMovementPace(pace);
    const speedPxPerSecond = pace === 'fast' ? this.fastRunSpeed : this.slowWalkSpeed;
    this.walkSpeed = Math.max(18, speedPxPerSecond) / 1000;
    const [minDuration, maxDuration] = this.walkDuration;
    const safeMin = Math.max(400, minDuration);
    const safeMax = Math.max(safeMin, maxDuration);
    const duration = safeMin + Math.random() * (safeMax - safeMin);
    const [minDistance, maxDistance] = this.moveDistance;
    const safeMinDistance = Math.max(24, minDistance);
    const safeMaxDistance = Math.max(safeMinDistance, maxDistance);
    const distanceBudget = safeMinDistance + Math.random() * (safeMaxDistance - safeMinDistance);
    const durationBudget = duration * this.walkSpeed;
    this.currentWalkBudget = Math.max(distanceBudget, durationBudget * 0.65);
    this.applyWalkAnimation(this.walkVectorX, this.walkVectorY);
  }

  private stopWalking(): void {
    this.isWalking = false;
    this.walkDistance = 0;
    this.currentWalkBudget = 0;
    this.petState.setMovementPace('slow');
    this.walkSpeed = Math.max(18, this.slowWalkSpeed) / 1000;
    this.petState.setAnimation('idle');
  }

  beginDrag(): void {
    this.dragLocked = true;
    this.isWalking = false;
    this.walkDistance = 0;
    this.walkTimer = 0;
    this.idleTimer = 0;
    this.petState.setAnimation('drag');
  }

  endDrag(): void {
    this.dragLocked = false;
    this.walkTimer = 0;
    this.idleTimer = 0;
    this.petState.setAnimation('sit');
  }

  private applyWalkAnimation(dx: number, dy: number): void {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const verticalAngle = Math.atan2(absX, absY) * (180 / Math.PI);

    // Use vertical walk cycles when movement is within 15 degrees of vertical.
    if (absY > 0 && verticalAngle <= 15) {
      this.petState.setAnimation(dy < 0 ? 'walk-up' : 'walk-down');
      return;
    }

    if (dx >= 0) {
      this.petState.setFacing('right');
      this.petState.setAnimation('walk-right');
    } else {
      this.petState.setFacing('left');
      this.petState.setAnimation('walk-left');
    }
  }

  private getMovementBounds(
    viewport: { width: number; height: number },
    bounds: { width: number; height: number },
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!this.movementArea.enabled) {
      return {
        minX: this.edgeMargin,
        minY: this.edgeMargin,
        maxX: Math.max(this.edgeMargin, viewport.width - bounds.width - this.edgeMargin),
        maxY: Math.max(this.edgeMargin, viewport.height - bounds.height - this.edgeMargin),
      };
    }

    const left = Math.round((viewport.width * this.movementArea.leftPercent) / 100);
    const top = Math.round((viewport.height * this.movementArea.topPercent) / 100);
    const width = Math.round((viewport.width * this.movementArea.widthPercent) / 100);
    const height = Math.round((viewport.height * this.movementArea.heightPercent) / 100);
    const areaMinX = Math.max(this.edgeMargin, left);
    const areaMinY = Math.max(this.edgeMargin, top);
    const areaMaxX = Math.max(areaMinX, Math.min(viewport.width - bounds.width - this.edgeMargin, left + width - bounds.width));
    const areaMaxY = Math.max(areaMinY, Math.min(viewport.height - bounds.height - this.edgeMargin, top + height - bounds.height));

    return {
      minX: areaMinX,
      minY: areaMinY,
      maxX: areaMaxX,
      maxY: areaMaxY,
    };
  }
}
