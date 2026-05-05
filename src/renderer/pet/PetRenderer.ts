import type { PetAnimationState, PetModel } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { PetState } from './PetState';

interface ActiveAnimation {
  key: string;
  row: number;
  frames: number;
  durations: number[];
  loop: boolean;
  next?: PetAnimationState;
}

const DEFAULT_STATE_ALIASES: Record<PetAnimationState, string[]> = {
  idle: ['idle', 'waiting'],
  'walk-left': ['running-left', 'running', 'idle'],
  'walk-right': ['running-right', 'running', 'idle'],
  'walk-up': ['idle'],
  'walk-down': ['idle'],
  sit: ['waiting', 'idle'],
  sleep: ['failed', 'waiting', 'idle'],
  talk: ['waving', 'review', 'idle'],
  happy: ['waving', 'idle'],
  eat: ['review', 'waiting', 'idle'],
  drag: ['idle'],
  fall: ['jumping', 'failed', 'idle'],
  play: ['running', 'jumping', 'idle'],
  jump: ['jumping', 'running', 'idle'],
  scratch: ['review', 'waiting', 'idle'],
  rub: ['review', 'waving', 'idle'],
};

const DEFAULT_DURATIONS: Partial<Record<PetAnimationState, number[]>> = {
  idle: [280, 110, 110, 140, 140, 320],
  'walk-left': [84, 84, 84, 84, 84, 84, 84, 140],
  'walk-right': [84, 84, 84, 84, 84, 84, 84, 140],
  'walk-up': [92, 92, 92, 92, 92, 150],
  'walk-down': [92, 92, 92, 92, 92, 150],
  sit: [2000],
  sleep: [140, 140, 140, 140, 140, 140, 140, 240],
  talk: [140, 140, 140, 280],
  happy: [140, 140, 140, 280],
  eat: [150, 150, 150, 150, 150, 280],
  drag: [110, 110, 110, 110, 180],
  fall: [140, 140, 140, 140, 280],
  play: [96, 96, 96, 96, 96, 160],
  jump: [140, 140, 140, 140, 280],
  scratch: [120, 120, 120, 120, 120, 180],
  rub: [120, 120, 120, 120, 120, 180],
};

const LOOPING_STATES = new Set<PetAnimationState>([
  'idle',
  'walk-left',
  'walk-right',
  'walk-up',
  'walk-down',
  'drag',
]);

const HOLD_LAST_FRAME_STATES = new Set<PetAnimationState>([
  'sit',
  'sleep',
]);

const TRANSIENT_RETURN_STATES = new Set<PetAnimationState>([
  'talk',
  'happy',
  'eat',
  'play',
  'jump',
  'scratch',
  'rub',
]);

const NEXT_STATE_AFTER_ANIMATION: Partial<Record<PetAnimationState, PetAnimationState>> = {
  fall: 'idle',
};

const WALKING_STATES = new Set<PetAnimationState>([
  'walk-left',
  'walk-right',
  'walk-up',
  'walk-down',
]);

const FACING_SENSITIVE_STATES = new Set<PetAnimationState>([
  'walk-left',
  'walk-right',
  'drag',
  'fall',
  'play',
  'jump',
]);

export class PetRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private petState: PetState;
  private currentFrame = 0;
  private frameTimer = 0;
  private lastTime = 0;
  private animFrameId = 0;
  private model: PetModel | null = null;
  private spriteImage: HTMLImageElement | null = null;
  private spriteLoaded = false;
  private displayScale = 1;
  private drawnWidth = 96;
  private drawnHeight = 104;
  private userSize = 80;

  constructor(canvas: HTMLCanvasElement, petState: PetState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.petState = petState;

    this.ctx.imageSmoothingEnabled = false;

    this.petState.onAnimationChange(() => {
      this.currentFrame = 0;
      this.frameTimer = 0;
    });

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.setupInteraction();
  }

  async loadModel(model: PetModel): Promise<void> {
    const image = new Image();
    image.src = model.spritesheetDataUrl || model.spritesheetUrl;
    try {
      await image.decode();
    } catch (error) {
      console.error('Failed to decode pet spritesheet:', model.id, model.spritesheetUrl, error);
      throw error;
    }

    this.model = model;
    this.spriteImage = image;
    this.spriteLoaded = true;
    this.applyScale();

    if (this.petState.x === 0 && this.petState.y === 0) {
      const defaultX = Math.max(24, this.canvas.width - this.drawnWidth - 72);
      const defaultY = Math.max(24, this.canvas.height - this.drawnHeight - 48);
      this.petState.setPosition(defaultX, defaultY);
    } else {
      this.petState.setPosition(
        this.clampX(this.petState.x),
        this.clampY(this.petState.y),
      );
    }

    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  applySettings(options: { size?: number }): void {
    if (typeof options.size === 'number' && Number.isFinite(options.size)) {
      this.userSize = Math.max(40, Math.min(160, options.size));
      this.applyScale();
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
    window.removeEventListener('resize', this.resizeCanvas);
  }

  getPetBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.petState.x,
      y: this.petState.y,
      width: this.drawnWidth,
      height: this.drawnHeight,
    };
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  setPetPosition(x: number, y: number): void {
    this.petState.setPosition(this.clampX(x), this.clampY(y));
  }

  private resolveAnimation(state: PetAnimationState): ActiveAnimation | null {
    if (!this.model) return null;

    const candidates = [
      ...(this.model.aliases?.[state] ? [this.model.aliases[state]!] : []),
      ...DEFAULT_STATE_ALIASES[state],
    ];

    const resolvedKey = candidates.find((key) => this.model!.animations[key]);
    if (!resolvedKey) return null;

    const atlasAnimation = this.model.animations[resolvedKey];
    const durations = DEFAULT_DURATIONS[state] || new Array(atlasAnimation.frames).fill(140);
    const normalizedDurations =
      durations.length >= atlasAnimation.frames
        ? durations.slice(0, atlasAnimation.frames)
        : [
            ...durations,
            ...new Array(atlasAnimation.frames - durations.length).fill(durations[durations.length - 1] || 140),
          ];
    const pacedDurations = WALKING_STATES.has(state)
      ? normalizedDurations.map((duration) => {
          const multiplier = this.petState.movementPace === 'fast' ? 0.66 : 1.18;
          return Math.max(48, Math.round(duration * multiplier));
        })
      : normalizedDurations;

    const shouldHoldLastFrame = HOLD_LAST_FRAME_STATES.has(state);
    const resumeState = this.petState.resumeAnimation;
    const nextState = shouldHoldLastFrame
      ? undefined
      : NEXT_STATE_AFTER_ANIMATION[state] || this.resolveNaturalReturnState(state, resumeState);

    return {
      key: resolvedKey,
      row: atlasAnimation.row,
      frames: atlasAnimation.frames,
      durations: pacedDurations,
      loop: LOOPING_STATES.has(state),
      next: TRANSIENT_RETURN_STATES.has(state) ? nextState : shouldHoldLastFrame ? undefined : NEXT_STATE_AFTER_ANIMATION[state],
    };
  }

  private resolveNaturalReturnState(
    transientState: PetAnimationState,
    resumeState: PetAnimationState,
  ): PetAnimationState {
    if (resumeState === 'sleep') {
      return transientState === 'talk' || transientState === 'happy' ? 'sit' : 'idle';
    }

    if (resumeState === 'sit') {
      if (transientState === 'play' || transientState === 'jump') {
        return 'idle';
      }
      return 'sit';
    }

    if (WALKING_STATES.has(resumeState)) {
      if (transientState === 'talk' || transientState === 'happy') {
        return 'idle';
      }
      if (transientState === 'play' || transientState === 'jump') {
        return resumeState;
      }
      return resumeState;
    }

    if (resumeState === 'drag') {
      return 'sit';
    }

    return 'idle';
  }

  private render = (): void => {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.spriteLoaded || !this.model || !this.spriteImage) {
      this.animFrameId = requestAnimationFrame(this.render);
      return;
    }

    const animation = this.resolveAnimation(this.petState.currentAnimation);
    if (!animation) {
      this.animFrameId = requestAnimationFrame(this.render);
      return;
    }

    this.frameTimer += dt;
    while (true) {
      const currentDuration = animation.durations[this.currentFrame] || 140;
      if (this.frameTimer < currentDuration) {
        break;
      }

      this.frameTimer -= currentDuration;
      this.currentFrame += 1;

      if (this.currentFrame >= animation.frames) {
        if (animation.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = animation.frames - 1;
          this.frameTimer = 0;
          if (animation.next) {
            this.petState.setAnimation(animation.next);
            this.currentFrame = 0;
          }
          break;
        }
      }
    }

    const sx = this.currentFrame * this.model.frameWidth;
    const sy = animation.row * this.model.frameHeight;
    const verticalState =
      this.petState.currentAnimation === 'walk-up' || this.petState.currentAnimation === 'walk-down';
    const shouldMirror =
      Boolean(this.model.mirrorStates?.[this.petState.currentAnimation]) ||
      (this.model.id === 'honey' &&
        this.petState.facing === 'right' &&
        FACING_SENSITIVE_STATES.has(this.petState.currentAnimation));
    const scaleX = this.model.id === 'honey' && verticalState ? 0.92 : 1;
    const scaleY = this.model.id === 'honey' && this.petState.currentAnimation === 'walk-up'
      ? 0.96
      : this.model.id === 'honey' && this.petState.currentAnimation === 'walk-down'
        ? 1.02
        : 1;
    const dragScale = this.petState.currentAnimation === 'drag' ? 1.18 : 1;
    const drawWidth = Math.round(this.drawnWidth * scaleX * dragScale);
    const drawHeight = Math.round(this.drawnHeight * scaleY * dragScale);
    const drawX = this.petState.x + Math.round((this.drawnWidth - drawWidth) / 2);
    const drawY = this.petState.currentAnimation === 'drag'
      ? this.petState.y - 10
      : this.petState.currentAnimation === 'walk-up'
      ? this.petState.y + 4
      : this.petState.currentAnimation === 'walk-down'
        ? this.petState.y - 2
        : this.petState.y;

    if (shouldMirror) {
      this.ctx.save();
      this.ctx.translate(drawX + drawWidth, drawY);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        this.spriteImage,
        sx,
        sy,
        this.model.frameWidth,
        this.model.frameHeight,
        0,
        0,
        drawWidth,
        drawHeight,
      );
      this.ctx.restore();
    } else {
      this.ctx.drawImage(
        this.spriteImage,
        sx,
        sy,
        this.model.frameWidth,
        this.model.frameHeight,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
    }

    this.animFrameId = requestAnimationFrame(this.render);
  };

  private setupInteraction(): void {
    let isDragging = false;
    let suppressClick = false;
    let isPressing = false;
    let pressTimer: number | null = null;
    let pressStartClientX = 0;
    let pressStartClientY = 0;
    const dragStartDistance = 6;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const beginDrag = (clientX: number, clientY: number): void => {
      isDragging = true;
      suppressClick = true;
      dragOffsetX = clientX - this.petState.x;
      dragOffsetY = clientY - this.petState.y;
      const behavior = (window as any).__behaviorEngine;
      const ipc = (window as any).__ipcRenderer;
      if (ipc) {
        ipc.send('pet:drag-start');
        ipc.send('pet:set-ignore-mouse-events', false);
      }
      if (behavior?.beginDrag) {
        behavior.beginDrag();
      } else {
        this.petState.setAnimation('drag');
      }
    };

    const clearPendingPress = (): void => {
      isPressing = false;
      if (pressTimer !== null) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const ipc = (window as any).__ipcRenderer;
      if (!ipc) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      const pixel = this.ctx.getImageData(x, y, 1, 1).data;
      const isOverPet = pixel[3] > 0;
      ipc.send('pet:set-ignore-mouse-events', !isOverPet);
    });

    this.canvas.addEventListener('mouseleave', () => {
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', true);
    });

    this.canvas.addEventListener('mouseenter', () => {
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', false);
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      const inputBox = (window as any).__inputBox;
      if (inputBox && inputBox.focused) return;

      if (e.button === 0) {
        e.preventDefault();
        clearPendingPress();
        isPressing = true;
        pressStartClientX = e.clientX;
        pressStartClientY = e.clientY;
        pressTimer = window.setTimeout(() => {
          pressTimer = null;
          if (!isPressing || isDragging) return;
          beginDrag(pressStartClientX, pressStartClientY);
        }, 1000);
      }
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging && isPressing) {
        const deltaX = e.clientX - pressStartClientX;
        const deltaY = e.clientY - pressStartClientY;
        const movedDistance = Math.hypot(deltaX, deltaY);
        if (movedDistance >= dragStartDistance) {
          if (pressTimer !== null) {
            window.clearTimeout(pressTimer);
            pressTimer = null;
          }
          beginDrag(e.clientX, e.clientY);
        }
      }

      if (!isDragging) return;
      if (this.petState.currentAnimation !== 'drag') {
        this.petState.setAnimation('drag');
      }
      this.setPetPosition(e.clientX - dragOffsetX, e.clientY - dragOffsetY);
    });

    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button !== 0) return;

      const wasDragging = isDragging;
      clearPendingPress();

      if (wasDragging) {
        isDragging = false;
        const behavior = (window as any).__behaviorEngine;
        if (behavior?.endDrag) {
          behavior.endDrag();
        } else {
          this.petState.setAnimation('sit');
        }
        window.setTimeout(() => {
          suppressClick = false;
        }, 0);
      } else {
        suppressClick = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      const menu = (window as any).__contextMenu;
      if (!menu) return;

      const rect = this.canvas.getBoundingClientRect();
      const bounds = this.getPetBounds();
      const petRight = rect.left + bounds.x + bounds.width + 28;
      const petTop = rect.top + bounds.y + Math.round(bounds.height * 0.5);
      const behavior = (window as any).__behaviorEngine;
      const ipcRenderer = (window as any).__ipcRenderer;
      const toggleLabel = (flag: boolean, text: string) => `${flag ? '✅' : '⬜'} ${text}`;
      const currentModelName = (window as any).__currentPetModel?.name || '未加载';

      const buildPetMenu = () => [
        { label: `🐾 当前模型：${currentModelName}` },
        { separator: true, label: '' },
        { label: '🔀 切换模型 ▸', action: () => {
          const subMenu = (window as any).__subContextMenu;
          if (!subMenu) return;
          ipcRenderer.invoke(IPC_CHANNELS.PET_GET_LIST).then((pets: Array<{ id: string; name: string; builtin: boolean }>) => {
            const items = [
              { label: '← 返回', action: () => {
                subMenu.hide();
                menu.show(petRight, petTop, buildPetMenu());
              } },
              { separator: true, label: '' },
              { label: '导入新模型…', action: async () => {
                const result = await ipcRenderer.invoke(IPC_CHANNELS.PET_IMPORT);
                if (result?.success && result.pet) {
                  subMenu.hide();
                  await ipcRenderer.invoke(IPC_CHANNELS.PET_SWITCH, result.pet.id);
                }
              } },
              { separator: true, label: '' },
              ...pets.map((pet) => ({
                label: `${(window as any).__currentPetModel?.id === pet.id ? '✅' : '⬜'} ${pet.name}${pet.builtin ? '（内置）' : ''}`,
                action: async () => {
                  await ipcRenderer.invoke(IPC_CHANNELS.PET_SWITCH, pet.id);
                  subMenu.hide();
                },
              })),
            ];
            subMenu.show(petRight, petTop, items);
          });
        }},
        { label: '💬 打开对话', action: () => {
          const inputBox = (window as any).__inputBox;
          if (inputBox) inputBox.show();
        }},
        { label: '📝 新建待办', action: () => {
          const panel = (window as any).__quickCreatePanel;
          if (panel) panel.showTodo(petRight, petTop);
        }},
        { label: '📒 新建记事', action: () => {
          const panel = (window as any).__quickCreatePanel;
          if (panel) panel.showNote(petRight, petTop);
        }},
        { separator: true, label: '' },
        { label: `🎮 互动设置 ▸`, action: () => {
          menu.hide();
          const subMenu = (window as any).__subContextMenu;
          if (!subMenu) return;
          const buildSubItems = () => [
            { label: '← 返回', action: () => {
              subMenu.hide();
              menu.show(petRight, petTop, buildPetMenu());
            }},
            { separator: true, label: '' },
            { label: toggleLabel(behavior?.walkEnabled ?? true, '自由行走'), action: () => {
              if (behavior) behavior.walkEnabled = !behavior.walkEnabled;
              subMenu.render(buildSubItems());
            }},
            { label: toggleLabel(behavior?.restEnabled ?? true, '自动休息'), action: () => {
              if (behavior) behavior.restEnabled = !behavior.restEnabled;
              subMenu.render(buildSubItems());
            }},
            { label: toggleLabel(behavior?.interactEnabled ?? true, '互动模式'), action: () => {
              if (behavior) behavior.interactEnabled = !behavior.interactEnabled;
              subMenu.render(buildSubItems());
            }},
            { label: toggleLabel(behavior?.collisionEnabled ?? true, '碰撞边界'), action: () => {
              if (behavior) behavior.collisionEnabled = !behavior.collisionEnabled;
              subMenu.render(buildSubItems());
            }},
            { label: toggleLabel(behavior?.bubbleEnabled ?? true, '气泡显示'), action: () => {
              if (behavior) behavior.bubbleEnabled = !behavior.bubbleEnabled;
              subMenu.render(buildSubItems());
            }},
          ];
          subMenu.show(petRight, petTop, buildSubItems());
        }},
        { separator: true, label: '' },
        { label: '🖥️ 打开控制台', action: () => {
          const ipc = (window as any).__ipcRenderer;
          if (ipc) ipc.send('window:open-console');
        }},
        { separator: true, label: '' },
        { label: '🔄 重启宠物', action: () => {
          const ipc = (window as any).__ipcRenderer;
          if (ipc) ipc.send('app:restart');
        }},
        { label: '🚪 退出', action: () => {
          const ipc = (window as any).__ipcRenderer;
          if (ipc) ipc.send('app:quit');
        }},
      ];

      menu.show(petRight, petTop, buildPetMenu());
    });

    this.canvas.addEventListener('dblclick', (e: MouseEvent) => {
      e.preventDefault();
      const inputBox = (window as any).__inputBox;
      if (inputBox) {
        inputBox.toggle();
      }
    });

    let clickTimer: number | null = null;
    this.canvas.addEventListener('click', () => {
      if (suppressClick) return;
      if (clickTimer) return;
      clickTimer = window.setTimeout(() => {
        clickTimer = null;
        if (this.petState.currentAnimation === 'drag' || this.petState.currentAnimation === 'fall') return;

        const petChatter = (window as any).__petChatter;
        if (petChatter?.onPetClick) {
          petChatter.onPetClick();
          return;
        }

        this.petState.setAnimation('happy');
        setTimeout(() => {
          if (this.petState.currentAnimation === 'happy') {
            this.petState.setAnimation('idle');
          }
        }, 1000);
      }, 250);
    });
  }

  private resizeCanvas = (): void => {
    this.canvas.width = Math.max(1, window.innerWidth);
    this.canvas.height = Math.max(1, window.innerHeight);
    this.ctx.imageSmoothingEnabled = false;
    if (this.spriteLoaded) {
      this.applyScale();
      this.petState.setPosition(this.clampX(this.petState.x), this.clampY(this.petState.y));
    }
  };

  private applyScale(): void {
    if (!this.model) return;
    this.displayScale = this.userSize / this.model.frameHeight;
    this.drawnWidth = Math.max(1, Math.round(this.model.frameWidth * this.displayScale));
    this.drawnHeight = Math.max(1, Math.round(this.model.frameHeight * this.displayScale));
  }

  private clampX(x: number): number {
    return Math.max(12, Math.min(x, this.canvas.width - this.drawnWidth - 12));
  }

  private clampY(y: number): number {
    return Math.max(12, Math.min(y, this.canvas.height - this.drawnHeight - 12));
  }
}
