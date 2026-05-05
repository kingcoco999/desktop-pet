import type { PetAnimationState } from '../../shared/types';

const RESUMABLE_BASE_STATES = new Set<PetAnimationState>([
  'idle',
  'walk-left',
  'walk-right',
  'walk-up',
  'walk-down',
  'sit',
  'sleep',
]);

const TRANSIENT_STATES = new Set<PetAnimationState>([
  'talk',
  'happy',
  'eat',
  'fall',
  'play',
  'jump',
  'scratch',
  'rub',
]);

export class PetState {
  private _currentAnimation: PetAnimationState = 'idle';
  private _resumeAnimation: PetAnimationState = 'idle';
  private _movementPace: 'slow' | 'fast' = 'slow';
  private _x: number = 0;
  private _y: number = 0;
  private _facing: 'left' | 'right' = 'right';
  private _listeners: Set<() => void> = new Set();
  private _animationListeners: Set<() => void> = new Set();

  get currentAnimation(): PetAnimationState {
    return this._currentAnimation;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get facing(): 'left' | 'right' {
    return this._facing;
  }

  get resumeAnimation(): PetAnimationState {
    return this._resumeAnimation;
  }

  get movementPace(): 'slow' | 'fast' {
    return this._movementPace;
  }

  setAnimation(state: PetAnimationState): void {
    if (this._currentAnimation !== state) {
      if (RESUMABLE_BASE_STATES.has(this._currentAnimation) && TRANSIENT_STATES.has(state)) {
        this._resumeAnimation = this._currentAnimation;
      } else if (RESUMABLE_BASE_STATES.has(state)) {
        this._resumeAnimation = state;
      }
      this._currentAnimation = state;
      this.notifyAnimation();
      this.notify();
    }
  }

  setPosition(x: number, y: number): void {
    if (this._x !== x || this._y !== y) {
      this._x = x;
      this._y = y;
      this.notify();
    }
  }

  setFacing(direction: 'left' | 'right'): void {
    this._facing = direction;
    this.notify();
  }

  setMovementPace(pace: 'slow' | 'fast'): void {
    if (this._movementPace !== pace) {
      this._movementPace = pace;
      this.notify();
    }
  }

  onUpdate(callback: () => void): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  onAnimationChange(callback: () => void): () => void {
    this._animationListeners.add(callback);
    return () => this._animationListeners.delete(callback);
  }

  private notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }

  private notifyAnimation(): void {
    for (const listener of this._animationListeners) {
      listener();
    }
  }
}
