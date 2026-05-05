import type { PetAnimationState } from '../../shared/types';
import { PetState } from './PetState';

interface AnimationFrame {
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void;
  duration: number; // ms
}

interface Animation {
  frames: AnimationFrame[];
  loop: boolean;
  next?: PetAnimationState;
}

export class PetRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private petState: PetState;
  private size: number = 80;
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private lastTime: number = 0;
  private animations: Map<PetAnimationState, Animation> = new Map();
  private animFrameId: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement, petState: PetState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.petState = petState;

    // Setup canvas
    this.canvas.width = 210;
    this.canvas.height = 150;
    this.ctx.imageSmoothingEnabled = false;

    // Position pet in canvas
    this.offsetX = 85;
    this.offsetY = 30;


    // Initialize all animations
    this.initAnimations();

    // Setup drag interaction
    this.setupInteraction();

    // Listen for animation state changes
    this.petState.onUpdate(() => {
      this.currentFrame = 0;
      this.frameTimer = 0;
    });
  }

  private initAnimations(): void {
    const s = this.size;
    const catColor = '#FF9800'; // Orange cat
    const darkCatColor = '#E65100';
    const eyeColor = '#333';
    const noseColor = '#FF5252';
    const whiteColor = '#FFF';
    const grayColor = '#9E9E9E';
    const pinkColor = '#FFB6C1';

    // Helper to draw pixel block
    const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    // IDLE animation - breathing cat
    this.animations.set('idle', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatBase(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0);
          },
          duration: 500,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatBase(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1);
          },
          duration: 500,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatBase(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 2);
          },
          duration: 500,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatBase(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1);
          },
          duration: 500,
        },
      ],
      loop: true,
    });

    // WALK-LEFT animation
    this.animations.set('walk-left', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatWalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0, 'left');
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1, 'left');
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 2, 'left');
          },
          duration: 200,
        },
      ],
      loop: true,
    });

    // WALK-RIGHT animation
    this.animations.set('walk-right', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatWalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0, 'right');
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1, 'right');
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 2, 'right');
          },
          duration: 200,
        },
      ],
      loop: true,
    });

    // TALK animation
    this.animations.set('talk', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatTalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 0);
          },
          duration: 300,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatTalk(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 1);
          },
          duration: 300,
        },
      ],
      loop: true,
    });

    // HAPPY animation
    this.animations.set('happy', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatHappy(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 0);
          },
          duration: 400,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatHappy(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 1);
          },
          duration: 400,
        },
      ],
      loop: false,
      next: 'idle',
    });

    // SIT animation
    this.animations.set('sit', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatSit(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor);
          },
          duration: 1000,
        },
      ],
      loop: false,
      next: 'sleep',
    });

    // SLEEP animation
    this.animations.set('sleep', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatSleep(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, grayColor, 0);
          },
          duration: 1000,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatSleep(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, grayColor, 1);
          },
          duration: 1000,
        },
      ],
      loop: true,
    });

    // DRAG animation
    this.animations.set('drag', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatDrag(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor);
          },
          duration: 500,
        },
      ],
      loop: true,
    });

    // FALL animation
    this.animations.set('fall', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatFall(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0);
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatFall(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1);
          },
          duration: 200,
        },
      ],
      loop: false,
      next: 'idle',
    });

    // EAT animation
    this.animations.set('eat', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatEat(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 0);
          },
          duration: 300,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatEat(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 1);
          },
          duration: 300,
        },
      ],
      loop: false,
      next: 'happy',
    });

    // WALK-UP animation (front-facing cat walking toward viewer)
    this.animations.set('walk-up', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatWalkUp(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0);
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalkUp(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1);
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalkUp(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 2);
          },
          duration: 200,
        },
      ],
      loop: true,
    });

    // WALK-DOWN animation (back-facing cat walking away)
    this.animations.set('walk-down', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatWalkDown(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0);
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalkDown(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1);
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatWalkDown(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 2);
          },
          duration: 200,
        },
      ],
      loop: true,
    });

    // PLAY animation (cat playing/rolling)
    this.animations.set('play', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatPlay(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 0);
          },
          duration: 300,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatPlay(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 1);
          },
          duration: 300,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatPlay(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 2);
          },
          duration: 300,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatPlay(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 3);
          },
          duration: 300,
        },
      ],
      loop: false,
      next: 'idle',
    });

    // JUMP animation
    this.animations.set('jump', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatJump(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0);
          },
          duration: 150,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatJump(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1);
          },
          duration: 200,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatJump(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 2);
          },
          duration: 150,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatJump(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 3);
          },
          duration: 200,
        },
      ],
      loop: false,
      next: 'idle',
    });

    // SCRATCH animation (cat scratching with hind leg)
    this.animations.set('scratch', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatScratch(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 0);
          },
          duration: 150,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatScratch(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 1);
          },
          duration: 150,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatScratch(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, 2);
          },
          duration: 150,
        },
      ],
      loop: true,
    });

    // RUB animation (cat rubbing against something)
    this.animations.set('rub', {
      frames: [
        {
          draw: (ctx, x, y) => {
            this.drawCatRub(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 0);
          },
          duration: 400,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatRub(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 1);
          },
          duration: 400,
        },
        {
          draw: (ctx, x, y) => {
            this.drawCatRub(ctx, x, y, s, catColor, darkCatColor, eyeColor, noseColor, whiteColor, pinkColor, 2);
          },
          duration: 400,
        },
      ],
      loop: false,
      next: 'idle',
    });
  }

  // Draw base cat with breathing variation
  private drawCatBase(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, breath: number): void {
    const p = s / 16; // pixel size
    const offsetY = breath * p;

    // Ears
    px(ctx, x + 2*p, y + 1*p - offsetY, p, p, cat);
    px(ctx, x + 3*p, y + 0*p - offsetY, p, p, cat);
    px(ctx, x + 4*p, y + 1*p - offsetY, p, p, cat);
    px(ctx, x + 11*p, y + 1*p - offsetY, p, p, cat);
    px(ctx, x + 12*p, y + 0*p - offsetY, p, p, cat);
    px(ctx, x + 13*p, y + 1*p - offsetY, p, p, cat);

    // Inner ears
    px(ctx, x + 3*p, y + 1*p - offsetY, p, p, '#FFB6C1');
    px(ctx, x + 12*p, y + 1*p - offsetY, p, p, '#FFB6C1');

    // Head
    px(ctx, x + 2*p, y + 2*p - offsetY, 12*p, p, cat);
    px(ctx, x + 1*p, y + 3*p - offsetY, 14*p, p, cat);
    px(ctx, x + 1*p, y + 4*p - offsetY, 14*p, p, cat);
    px(ctx, x + 1*p, y + 5*p - offsetY, 14*p, p, cat);
    px(ctx, x + 2*p, y + 6*p - offsetY, 12*p, p, cat);

    // Eyes
    px(ctx, x + 4*p, y + 4*p - offsetY, 2*p, p, white);
    px(ctx, x + 5*p, y + 4*p - offsetY, p, p, eye);
    px(ctx, x + 10*p, y + 4*p - offsetY, 2*p, p, white);
    px(ctx, x + 10*p, y + 4*p - offsetY, p, p, eye);

    // Nose
    px(ctx, x + 7*p, y + 5*p - offsetY, 2*p, p, nose);

    // Mouth
    px(ctx, x + 6*p, y + 6*p - offsetY, p, p, dark);
    px(ctx, x + 7*p, y + 6*p - offsetY, 2*p, p, white);
    px(ctx, x + 9*p, y + 6*p - offsetY, p, p, dark);

    // Body
    px(ctx, x + 3*p, y + 7*p - offsetY, 10*p, p, cat);
    px(ctx, x + 2*p, y + 8*p - offsetY, 12*p, p, cat);
    px(ctx, x + 2*p, y + 9*p - offsetY, 12*p, p, cat);
    px(ctx, x + 2*p, y + 10*p - offsetY, 12*p, p, cat);
    px(ctx, x + 3*p, y + 11*p - offsetY, 10*p, p, cat);

    // Legs
    px(ctx, x + 3*p, y + 12*p - offsetY, 2*p, 2*p, cat);
    px(ctx, x + 11*p, y + 12*p - offsetY, 2*p, 2*p, cat);

    // Tail
    px(ctx, x + 13*p, y + 9*p - offsetY, 2*p, p, dark);
    px(ctx, x + 14*p, y + 8*p - offsetY, 2*p, p, dark);
    px(ctx, x + 15*p, y + 7*p - offsetY, p, p, dark);
  }

  // Walk animation
  private drawCatWalk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, frame: number, dir: 'left' | 'right'): void {
    this.drawCatBase(ctx, x, y, s, cat, dark, eye, nose, white, 1);
    // Leg animation offset
    const p = s / 16;
    const legOffset = frame % 2 === 0 ? p : -p;
    // Override legs for walk
    ctx.fillStyle = 'transparent';
    ctx.clearRect(x + 3*p, y + 12*p, 2*p, 3*p);
    ctx.clearRect(x + 11*p, y + 12*p, 2*p, 3*p);
    ctx.fillStyle = cat;
    ctx.fillRect(x + 3*p, y + 12*p + legOffset, 2*p, 2*p);
    ctx.fillRect(x + 11*p, y + 12*p - legOffset, 2*p, 2*p);
  }

  // Talk animation
  private drawCatTalk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, pink: string, frame: number): void {
    this.drawCatBase(ctx, x, y, s, cat, dark, eye, nose, white, 1);
    const p = s / 16;
    // Open mouth
    if (frame === 1) {
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 6*p, y + 6*p, 4*p, p);
      ctx.fillStyle = pink;
      ctx.fillRect(x + 7*p, y + 7*p, 2*p, p);
    }
  }

  // Happy animation
  private drawCatHappy(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, pink: string, frame: number): void {
    const bounce = frame === 0 ? -2 : 0;
    this.drawCatBase(ctx, x, y + bounce, s, cat, dark, eye, nose, white, 1);
    const p = s / 16;
    // Happy eyes (closed, ^_^)
    ctx.fillStyle = cat;
    ctx.fillRect(x + 4*p, y + 4*p + bounce, 2*p, p);
    ctx.fillRect(x + 10*p, y + 4*p + bounce, 2*p, p);
    // Blush
    ctx.fillStyle = pink;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x + 3*p, y + 5*p + bounce, 2*p, p);
    ctx.fillRect(x + 11*p, y + 5*p + bounce, 2*p, p);
    ctx.globalAlpha = 1;
    // Hearts above
    if (frame === 1) {
      ctx.fillStyle = '#FF4081';
      ctx.fillRect(x + 6*p, y - 2*p, p, p);
      ctx.fillRect(x + 8*p, y - 3*p, p, p);
      ctx.fillRect(x + 10*p, y - 2*p, p, p);
    }
  }

  // Sit animation
  private drawCatSit(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string): void {
    this.drawCatBase(ctx, x, y + 2, s, cat, dark, eye, nose, white, 0);
    const p = s / 16;
    // Tucked legs
    ctx.fillStyle = cat;
    ctx.fillRect(x + 2*p, y + 12*p, 12*p, 2*p);
  }

  // Sleep animation
  private drawCatSleep(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, gray: string, frame: number): void {
    const p = s / 16;
    // Lying down cat
    ctx.fillStyle = cat;
    ctx.fillRect(x + 1*p, y + 8*p, 14*p, 4*p);
    ctx.fillRect(x + 2*p, y + 7*p, 12*p, p);
    // Head
    ctx.fillRect(x + 1*p, y + 5*p, 6*p, 3*p);
    // Ears
    ctx.fillRect(x + 1*p, y + 4*p, 2*p, p);
    ctx.fillRect(x + 4*p, y + 4*p, 2*p, p);
    // Closed eyes
    ctx.fillStyle = dark;
    ctx.fillRect(x + 2*p, y + 6*p, 2*p, p);
    // ZZZ
    ctx.fillStyle = gray;
    ctx.font = `${p * 2}px monospace`;
    const zOffset = frame * p;
    ctx.fillText('Z', x + 8*p, y + 5*p - zOffset);
    ctx.font = `${p * 1.5}px monospace`;
    ctx.fillText('z', x + 10*p, y + 3*p - zOffset);
  }

  // Drag animation
  private drawCatDrag(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string): void {
    this.drawCatBase(ctx, x, y, s, cat, dark, eye, nose, white, 0);
    const p = s / 16;
    // Struggling legs
    ctx.fillStyle = cat;
    ctx.fillRect(x + 2*p, y + 12*p, 2*p, 3*p);
    ctx.fillRect(x + 12*p, y + 12*p, 2*p, 3*p);
    ctx.fillRect(x + 4*p, y + 11*p, 2*p, 2*p);
    ctx.fillRect(x + 10*p, y + 11*p, 2*p, 2*p);
  }

  // Fall animation
  private drawCatFall(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, frame: number): void {
    const squish = frame === 0 ? -2 : 1;
    this.drawCatBase(ctx, x, y + squish, s, cat, dark, eye, nose, white, 0);
    const p = s / 16;
    if (frame === 0) {
      // Squished
      ctx.fillStyle = cat;
      ctx.fillRect(x + 1*p, y + 13*p, 14*p, p);
    }
  }

  // Eat animation
  private drawCatEat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, pink: string, frame: number): void {
    this.drawCatBase(ctx, x, y, s, cat, dark, eye, nose, white, 1);
    const p = s / 16;
    // Food
    ctx.fillStyle = '#8BC34A';
    ctx.fillRect(x + 7*p, y + 7*p + (frame * p), 2*p, p);
    // Chewing mouth
    if (frame === 1) {
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 6*p, y + 6*p, 4*p, p);
    }
  }

  // Walk-up animation (front-facing, walking toward viewer)
  private drawCatWalkUp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, frame: number): void {
    const p = s / 16;
    const legOffset = frame % 2 === 0 ? p : -p;
    const bounce = frame === 1 ? -1 : 0;

    // Ears (front view - both visible)
    px(ctx, x + 2*p, y + 1*p + bounce, p, p, cat);
    px(ctx, x + 3*p, y + 0*p + bounce, p, p, cat);
    px(ctx, x + 4*p, y + 1*p + bounce, p, p, cat);
    px(ctx, x + 11*p, y + 1*p + bounce, p, p, cat);
    px(ctx, x + 12*p, y + 0*p + bounce, p, p, cat);
    px(ctx, x + 13*p, y + 1*p + bounce, p, p, cat);

    // Inner ears
    px(ctx, x + 3*p, y + 1*p + bounce, p, p, '#FFB6C1');
    px(ctx, x + 12*p, y + 1*p + bounce, p, p, '#FFB6C1');

    // Head (front view)
    px(ctx, x + 2*p, y + 2*p + bounce, 12*p, p, cat);
    px(ctx, x + 1*p, y + 3*p + bounce, 14*p, p, cat);
    px(ctx, x + 1*p, y + 4*p + bounce, 14*p, p, cat);
    px(ctx, x + 1*p, y + 5*p + bounce, 14*p, p, cat);
    px(ctx, x + 2*p, y + 6*p + bounce, 12*p, p, cat);

    // Eyes (front view - both visible)
    px(ctx, x + 4*p, y + 4*p + bounce, 2*p, p, white);
    px(ctx, x + 5*p, y + 4*p + bounce, p, p, eye);
    px(ctx, x + 10*p, y + 4*p + bounce, 2*p, p, white);
    px(ctx, x + 10*p, y + 4*p + bounce, p, p, eye);

    // Nose
    px(ctx, x + 7*p, y + 5*p + bounce, 2*p, p, nose);

    // Mouth
    px(ctx, x + 6*p, y + 6*p + bounce, p, p, dark);
    px(ctx, x + 7*p, y + 6*p + bounce, 2*p, p, white);
    px(ctx, x + 9*p, y + 6*p + bounce, p, p, dark);

    // Body
    px(ctx, x + 3*p, y + 7*p + bounce, 10*p, p, cat);
    px(ctx, x + 2*p, y + 8*p + bounce, 12*p, p, cat);
    px(ctx, x + 2*p, y + 9*p + bounce, 12*p, p, cat);
    px(ctx, x + 2*p, y + 10*p + bounce, 12*p, p, cat);
    px(ctx, x + 3*p, y + 11*p + bounce, 10*p, p, cat);

    // Front legs (alternating)
    ctx.clearRect(x + 3*p, y + 12*p + bounce, 2*p, 3*p);
    ctx.clearRect(x + 11*p, y + 12*p + bounce, 2*p, 3*p);
    px(ctx, x + 3*p, y + 12*p + bounce + legOffset, 2*p, 2*p, cat);
    px(ctx, x + 11*p, y + 12*p + bounce - legOffset, 2*p, 2*p, cat);

    // Tail (hidden behind body in front view)
  }

  // Walk-down animation (back-facing, walking away)
  private drawCatWalkDown(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, frame: number): void {
    const p = s / 16;
    const legOffset = frame % 2 === 0 ? p : -p;
    const bounce = frame === 1 ? -1 : 0;

    // Ears (back view - tips visible)
    px(ctx, x + 3*p, y + 0*p + bounce, p, p, cat);
    px(ctx, x + 12*p, y + 0*p + bounce, p, p, cat);

    // Head (back view - no face)
    px(ctx, x + 2*p, y + 2*p + bounce, 12*p, p, cat);
    px(ctx, x + 1*p, y + 3*p + bounce, 14*p, p, cat);
    px(ctx, x + 1*p, y + 4*p + bounce, 14*p, p, cat);
    px(ctx, x + 1*p, y + 5*p + bounce, 14*p, p, cat);
    px(ctx, x + 2*p, y + 6*p + bounce, 12*p, p, cat);

    // Body
    px(ctx, x + 3*p, y + 7*p + bounce, 10*p, p, cat);
    px(ctx, x + 2*p, y + 8*p + bounce, 12*p, p, cat);
    px(ctx, x + 2*p, y + 9*p + bounce, 12*p, p, cat);
    px(ctx, x + 2*p, y + 10*p + bounce, 12*p, p, cat);
    px(ctx, x + 3*p, y + 11*p + bounce, 10*p, p, cat);

    // Back legs (alternating)
    ctx.clearRect(x + 3*p, y + 12*p + bounce, 2*p, 3*p);
    ctx.clearRect(x + 11*p, y + 12*p + bounce, 2*p, 3*p);
    px(ctx, x + 3*p, y + 12*p + bounce + legOffset, 2*p, 2*p, cat);
    px(ctx, x + 11*p, y + 12*p + bounce - legOffset, 2*p, 2*p, cat);

    // Tail (visible, wagging)
    const tailWag = frame === 0 ? 0 : (frame === 1 ? p : -p);
    px(ctx, x + 13*p, y + 9*p + bounce, 2*p, p, dark);
    px(ctx, x + 14*p + tailWag, y + 8*p + bounce, 2*p, p, dark);
    px(ctx, x + 15*p + tailWag, y + 7*p + bounce, p, p, dark);
  }

  // Play animation (cat playing/rolling)
  private drawCatPlay(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, pink: string, frame: number): void {
    const p = s / 16;

    if (frame === 0) {
      // Crouch before pounce
      this.drawCatBase(ctx, x, y + 2, s, cat, dark, eye, nose, white, 0);
      px(ctx, x + 2*p, y + 12*p, 12*p, 2*p, cat);
    } else if (frame === 1) {
      // Mid pounce - body stretched
      px(ctx, x + 2*p, y + 2*p, 12*p, p, cat);
      px(ctx, x + 1*p, y + 3*p, 14*p, p, cat);
      px(ctx, x + 1*p, y + 4*p, 14*p, p, cat);
      px(ctx, x + 1*p, y + 5*p, 14*p, p, cat);
      px(ctx, x + 2*p, y + 6*p, 12*p, p, cat);
      // Eyes wide open
      px(ctx, x + 4*p, y + 4*p, 2*p, p, white);
      px(ctx, x + 5*p, y + 4*p, p, p, eye);
      px(ctx, x + 10*p, y + 4*p, 2*p, p, white);
      px(ctx, x + 10*p, y + 4*p, p, p, eye);
      px(ctx, x + 7*p, y + 5*p, 2*p, p, nose);
      // Body stretched
      px(ctx, x + 3*p, y + 7*p, 10*p, p, cat);
      px(ctx, x + 2*p, y + 8*p, 12*p, p, cat);
      px(ctx, x + 2*p, y + 9*p, 12*p, p, cat);
      // Front paws extended
      px(ctx, x + 1*p, y + 10*p, 2*p, 2*p, cat);
      px(ctx, x + 13*p, y + 10*p, 2*p, 2*p, cat);
      // Back legs
      px(ctx, x + 3*p, y + 11*p, 2*p, 2*p, cat);
      px(ctx, x + 11*p, y + 11*p, 2*p, 2*p, cat);
    } else if (frame === 2) {
      // Rolling on back - belly up
      px(ctx, x + 2*p, y + 4*p, 12*p, p, cat);
      px(ctx, x + 1*p, y + 5*p, 14*p, p, cat);
      px(ctx, x + 1*p, y + 6*p, 14*p, p, cat);
      px(ctx, x + 1*p, y + 7*p, 14*p, p, white); // belly
      px(ctx, x + 2*p, y + 8*p, 12*p, p, cat);
      // Head tilted
      px(ctx, x + 3*p, y + 3*p, 6*p, p, cat);
      px(ctx, x + 2*p, y + 2*p, 8*p, p, cat);
      // Happy closed eyes
      px(ctx, x + 3*p, y + 3*p, 2*p, p, cat);
      px(ctx, x + 7*p, y + 3*p, 2*p, p, cat);
      // Paws in air
      px(ctx, x + 2*p, y + 9*p, 2*p, 2*p, cat);
      px(ctx, x + 12*p, y + 9*p, 2*p, 2*p, cat);
      // Tail
      px(ctx, x + 13*p, y + 5*p, 2*p, p, dark);
      px(ctx, x + 15*p, y + 4*p, p, p, dark);
    } else {
      // Settling back - blush
      this.drawCatBase(ctx, x, y, s, cat, dark, eye, nose, white, 1);
      // Blush
      ctx.fillStyle = pink;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + 3*p, y + 5*p, 2*p, p);
      ctx.fillRect(x + 11*p, y + 5*p, 2*p, p);
      ctx.globalAlpha = 1;
    }
  }

  // Jump animation
  private drawCatJump(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, frame: number): void {
    const p = s / 16;

    if (frame === 0) {
      // Crouch before jump
      this.drawCatBase(ctx, x, y + 3, s, cat, dark, eye, nose, white, 0);
      px(ctx, x + 2*p, y + 13*p, 12*p, 2*p, cat);
    } else if (frame === 1) {
      // Jumping up - body stretched, legs extended
      const jumpY = -4;
      px(ctx, x + 2*p, y + 1*p + jumpY, 12*p, p, cat);
      px(ctx, x + 1*p, y + 2*p + jumpY, 14*p, p, cat);
      px(ctx, x + 1*p, y + 3*p + jumpY, 14*p, p, cat);
      px(ctx, x + 1*p, y + 4*p + jumpY, 14*p, p, cat);
      px(ctx, x + 2*p, y + 5*p + jumpY, 12*p, p, cat);
      // Eyes
      px(ctx, x + 4*p, y + 3*p + jumpY, 2*p, p, white);
      px(ctx, x + 5*p, y + 3*p + jumpY, p, p, eye);
      px(ctx, x + 10*p, y + 3*p + jumpY, 2*p, p, white);
      px(ctx, x + 10*p, y + 3*p + jumpY, p, p, eye);
      px(ctx, x + 7*p, y + 4*p + jumpY, 2*p, p, nose);
      // Body stretched
      px(ctx, x + 3*p, y + 6*p + jumpY, 10*p, p, cat);
      px(ctx, x + 2*p, y + 7*p + jumpY, 12*p, p, cat);
      px(ctx, x + 2*p, y + 8*p + jumpY, 12*p, p, cat);
      // Legs extended down
      px(ctx, x + 3*p, y + 9*p + jumpY, 2*p, 3*p, cat);
      px(ctx, x + 11*p, y + 9*p + jumpY, 2*p, 3*p, cat);
      // Ears
      px(ctx, x + 2*p, y + 0*p + jumpY, p, p, cat);
      px(ctx, x + 3*p, y - 1*p + jumpY, p, p, cat);
      px(ctx, x + 4*p, y + 0*p + jumpY, p, p, cat);
      px(ctx, x + 11*p, y + 0*p + jumpY, p, p, cat);
      px(ctx, x + 12*p, y - 1*p + jumpY, p, p, cat);
      px(ctx, x + 13*p, y + 0*p + jumpY, p, p, cat);
    } else if (frame === 2) {
      // At peak - slight pause
      this.drawCatJump(ctx, x, y, s, cat, dark, eye, nose, white, 1);
    } else {
      // Landing - squished
      px(ctx, x + 1*p, y + 3*p, 14*p, p, cat);
      px(ctx, x + 0*p, y + 4*p, 16*p, p, cat);
      px(ctx, x + 0*p, y + 5*p, 16*p, p, cat);
      px(ctx, x + 0*p, y + 6*p, 16*p, p, cat);
      px(ctx, x + 1*p, y + 7*p, 14*p, p, cat);
      // Eyes half-closed
      px(ctx, x + 4*p, y + 5*p, 2*p, p, white);
      px(ctx, x + 5*p, y + 5*p, p, p, eye);
      px(ctx, x + 10*p, y + 5*p, 2*p, p, white);
      px(ctx, x + 10*p, y + 5*p, p, p, eye);
      px(ctx, x + 7*p, y + 6*p, 2*p, p, nose);
      // Body squished wide
      px(ctx, x + 2*p, y + 8*p, 12*p, p, cat);
      px(ctx, x + 1*p, y + 9*p, 14*p, p, cat);
      px(ctx, x + 1*p, y + 10*p, 14*p, p, cat);
      // Legs spread
      px(ctx, x + 1*p, y + 11*p, 3*p, 2*p, cat);
      px(ctx, x + 12*p, y + 11*p, 3*p, 2*p, cat);
    }
  }

  // Scratch animation (hind leg scratching)
  private drawCatScratch(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, frame: number): void {
    const p = s / 16;
    // Base sitting cat
    this.drawCatBase(ctx, x, y + 2, s, cat, dark, eye, nose, white, 0);
    // Tucked front legs
    px(ctx, x + 2*p, y + 12*p, 12*p, 2*p, cat);
    // Scratching hind leg
    const scratchOffset = frame === 0 ? 0 : (frame === 1 ? -2*p : 2*p);
    ctx.clearRect(x + 11*p, y + 12*p, 2*p, 3*p);
    px(ctx, x + 11*p, y + 11*p + scratchOffset, 2*p, 3*p, cat);
    // Ear twitch
    if (frame === 1) {
      px(ctx, x + 12*p, y + 0*p, p, p, cat);
    }
  }

  // Rub animation (cat rubbing against something)
  private drawCatRub(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, cat: string, dark: string, eye: string, nose: string, white: string, pink: string, frame: number): void {
    const p = s / 16;
    const tiltX = frame === 0 ? 0 : (frame === 1 ? 2 : -1);

    // Head tilted
    px(ctx, x + (2+tiltX)*p, y + 2*p, 12*p, p, cat);
    px(ctx, x + (1+tiltX)*p, y + 3*p, 14*p, p, cat);
    px(ctx, x + (1+tiltX)*p, y + 4*p, 14*p, p, cat);
    px(ctx, x + (1+tiltX)*p, y + 5*p, 14*p, p, cat);
    px(ctx, x + (2+tiltX)*p, y + 6*p, 12*p, p, cat);

    // Eyes (happy, half-closed)
    px(ctx, x + (4+tiltX)*p, y + 4*p, 2*p, p, cat);
    px(ctx, x + (10+tiltX)*p, y + 4*p, 2*p, p, cat);

    // Nose
    px(ctx, x + (7+tiltX)*p, y + 5*p, 2*p, p, nose);

    // Ears
    px(ctx, x + (2+tiltX)*p, y + 1*p, p, p, cat);
    px(ctx, x + (3+tiltX)*p, y + 0*p, p, p, cat);
    px(ctx, x + (4+tiltX)*p, y + 1*p, p, p, cat);
    px(ctx, x + (11+tiltX)*p, y + 1*p, p, p, cat);
    px(ctx, x + (12+tiltX)*p, y + 0*p, p, p, cat);
    px(ctx, x + (13+tiltX)*p, y + 1*p, p, p, cat);

    // Inner ears
    px(ctx, x + (3+tiltX)*p, y + 1*p, p, p, '#FFB6C1');
    px(ctx, x + (12+tiltX)*p, y + 1*p, p, p, '#FFB6C1');

    // Body
    px(ctx, x + 3*p, y + 7*p, 10*p, p, cat);
    px(ctx, x + 2*p, y + 8*p, 12*p, p, cat);
    px(ctx, x + 2*p, y + 9*p, 12*p, p, cat);
    px(ctx, x + 2*p, y + 10*p, 12*p, p, cat);
    px(ctx, x + 3*p, y + 11*p, 10*p, p, cat);

    // Legs
    px(ctx, x + 3*p, y + 12*p, 2*p, 2*p, cat);
    px(ctx, x + 11*p, y + 12*p, 2*p, 2*p, cat);

    // Tail
    px(ctx, x + 13*p, y + 9*p, 2*p, p, dark);
    px(ctx, x + 14*p, y + 8*p, 2*p, p, dark);
    px(ctx, x + 15*p, y + 7*p, p, p, dark);

    // Blush when rubbing
    ctx.fillStyle = pink;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x + (3+tiltX)*p, y + 5*p, 2*p, p);
    ctx.fillRect(x + (11+tiltX)*p, y + 5*p, 2*p, p);
    ctx.globalAlpha = 1;
  }

  start(): void {
    this.lastTime = performance.now();
    this.render();
  }

  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private render = (): void => {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Get current animation
    const anim = this.animations.get(this.petState.currentAnimation);
    if (!anim) {
      this.animFrameId = requestAnimationFrame(this.render);
      return;
    }

    // Update frame timer
    this.frameTimer += dt;
    const currentFrameData = anim.frames[this.currentFrame];

    if (this.frameTimer >= currentFrameData.duration) {
      this.frameTimer = 0;
      this.currentFrame++;

      if (this.currentFrame >= anim.frames.length) {
        if (anim.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = anim.frames.length - 1;
          if (anim.next) {
            this.petState.setAnimation(anim.next);
            this.currentFrame = 0;
          }
        }
      }
    }

    // Draw current frame
    const frame = anim.frames[this.currentFrame];
    frame.draw(this.ctx, this.offsetX, this.offsetY, this.size);

    this.animFrameId = requestAnimationFrame(this.render);
  };

  // Get pet bounds for hit testing
  getPetBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.offsetX,
      y: this.offsetY,
      width: this.size,
      height: this.size,
    };
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  // Setup mouse interaction
  private setupInteraction(): void {
    let isDragging = false;
    let lastScreenX = 0;
    let lastScreenY = 0;

    // Track mouse position to toggle click-through on transparent areas
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const ipc = (window as any).__ipcRenderer;
      if (!ipc) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      const pixel = this.ctx.getImageData(x, y, 1, 1).data;
      const isOverPet = pixel[3] > 0; // alpha > 0 means non-transparent
      ipc.send('pet:set-ignore-mouse-events', !isOverPet);
    });

    // When mouse leaves canvas, make window click-through again
    this.canvas.addEventListener('mouseleave', () => {
      const ipc = (window as any).__ipcRenderer;
      if (ipc) {
        ipc.send('pet:set-ignore-mouse-events', true);
      }
    });

    // When mouse enters canvas, temporarily make window interactive
    // (mousemove will refine based on pixel transparency)
    this.canvas.addEventListener('mouseenter', () => {
      const ipc = (window as any).__ipcRenderer;
      if (ipc) {
        ipc.send('pet:set-ignore-mouse-events', false);
      }
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      // Don't start drag if input is focused
      const inputBox = (window as any).__inputBox;
      if (inputBox && inputBox.focused) return;

      if (e.button === 0) { // Left click
        isDragging = true;
        lastScreenX = e.screenX;
        lastScreenY = e.screenY;
        const ipc = (window as any).__ipcRenderer;
        if (ipc) {
          ipc.send('pet:drag-start');
        }
        this.petState.setAnimation('drag');
      }
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (isDragging) {
        const ipc = (window as any).__ipcRenderer;
        if (ipc) {
          const deltaX = e.screenX - lastScreenX;
          const deltaY = e.screenY - lastScreenY;
          lastScreenX = e.screenX;
          lastScreenY = e.screenY;
          ipc.send('pet:dragging', { deltaX, deltaY });
        }
      }
    });

    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (isDragging && e.button === 0) {
        isDragging = false;
        this.petState.setAnimation('fall');
        setTimeout(() => {
          if (this.petState.currentAnimation === 'fall') {
            this.petState.setAnimation('idle');
          }
        }, 500);
      }
    });

    // Right click menu — positioned relative to pet using CSS (same as input box)
    this.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      const menu = (window as any).__contextMenu;
      if (menu) {
        // Position menu to the right of the pet
        const petRight = this.offsetX + this.size + 20;
        const petTop = this.offsetY - 20;
        const behavior = (window as any).__behaviorEngine;
        const toggleLabel = (flag: boolean, text: string) => `${flag ? '✅' : '⬜'} ${text}`;
        menu.show(petRight, petTop, [
          { label: '💬 打开对话', action: () => {
            const inputBox = (window as any).__inputBox;
            if (inputBox) inputBox.show();
          }},
          { label: '📝 新建待办', action: () => {
            const ipc = (window as any).__ipcRenderer;
            if (ipc) ipc.send('window:open-console');
          }},
          { label: '📒 新建记事', action: () => {
            const ipc = (window as any).__ipcRenderer;
            if (ipc) ipc.send('window:open-console');
          }},
          { label: '⏰ 设置提醒', action: () => {
            const ipc = (window as any).__ipcRenderer;
            if (ipc) ipc.send('window:open-console');
          }},
          { separator: true, label: '' },
          { label: toggleLabel(behavior?.walkEnabled ?? true, '自由行走'), action: () => {
            if (behavior) behavior.walkEnabled = !behavior.walkEnabled;
          }},
          { label: toggleLabel(behavior?.restEnabled ?? true, '自动休息'), action: () => {
            if (behavior) behavior.restEnabled = !behavior.restEnabled;
          }},
          { label: toggleLabel(behavior?.interactEnabled ?? true, '互动模式'), action: () => {
            if (behavior) behavior.interactEnabled = !behavior.interactEnabled;
          }},
          { label: toggleLabel(behavior?.collisionEnabled ?? true, '碰撞边界'), action: () => {
            if (behavior) behavior.collisionEnabled = !behavior.collisionEnabled;
          }},
          { label: toggleLabel(behavior?.bubbleEnabled ?? true, '气泡显示'), action: () => {
            if (behavior) behavior.bubbleEnabled = !behavior.bubbleEnabled;
          }},
          { separator: true, label: '' },
          { label: '🖥️ 打开控制台', action: () => {
            const ipc = (window as any).__ipcRenderer;
            if (ipc) ipc.send('window:open-console');
          }},
          { separator: true, label: '' },
          { label: '🔄 重新加载', action: () => { location.reload(); }},
          { label: '🚪 退出', action: () => {
            const ipc = (window as any).__ipcRenderer;
            if (ipc) ipc.send('app:quit');
          }},
        ]);
      }
    });

    // Double click for chat
    this.canvas.addEventListener('dblclick', (e: MouseEvent) => {
      e.preventDefault();
      const inputBox = (window as any).__inputBox;
      if (inputBox) {
        inputBox.toggle();
      }
    });

    // Single click for happy
    let clickTimer: number | null = null;
    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (clickTimer) return;
      clickTimer = window.setTimeout(() => {
        clickTimer = null;
        if (this.petState.currentAnimation !== 'drag' && this.petState.currentAnimation !== 'fall') {
          this.petState.setAnimation('happy');
          setTimeout(() => {
            if (this.petState.currentAnimation === 'happy') {
              this.petState.setAnimation('idle');
            }
          }, 1000);
        }
      }, 250); // Wait to distinguish from dblclick
    });
  }
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
