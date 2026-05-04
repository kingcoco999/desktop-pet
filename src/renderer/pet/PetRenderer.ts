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
