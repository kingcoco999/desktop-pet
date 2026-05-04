import type { PetAnimationState } from '../../shared/types';

export class PetState {
  private _currentAnimation: PetAnimationState = 'idle';
  private _x: number = 0;
  private _y: number = 0;
  private _facing: 'left' | 'right' = 'right';
  private _listeners: Set<() => void> = new Set();

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

  setAnimation(state: PetAnimationState): void {
    if (this._currentAnimation !== state) {
      this._currentAnimation = state;
      this.notify();
    }
  }

  setPosition(x: number, y: number): void {
    this._x = x;
    this._y = y;
    this.notify();
  }

  setFacing(direction: 'left' | 'right'): void {
    this._facing = direction;
    this.notify();
  }

  onUpdate(callback: () => void): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  private notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }
}
