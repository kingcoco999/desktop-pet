import { IPC_CHANNELS } from '../../shared/ipcChannels';
import type { Settings } from '../../shared/types';
import { PetState } from './PetState';
import { BubbleManager } from './BubbleManager';

type ChatterTrigger = 'click' | 'idle';

export class PetChatter {
  private petState: PetState;
  private bubbleManager: BubbleManager;
  private config: Settings['petChatter'] = {
    clickEnabled: true,
    idleEnabled: true,
    idleIntervalMinMs: 18000,
    idleIntervalMaxMs: 38000,
    prompt: '',
  };
  private lastSpokenAt = 0;
  private idleTimer = 0;
  private intervalId = 0;
  private isGenerating = false;
  private readonly clickCooldown = 2500;
  private nextIdleSpeakAt = 22000;

  constructor(petState: PetState, bubbleManager: BubbleManager) {
    this.petState = petState;
    this.bubbleManager = bubbleManager;
    this.scheduleNextIdleSpeak();
    this.start();
  }

  applySettings(settings: Settings): void {
    this.config = {
      ...this.config,
      ...(settings.petChatter || {}),
    };
    this.idleTimer = 0;
    this.scheduleNextIdleSpeak();
  }

  async onPetClick(): Promise<void> {
    if (!this.config.clickEnabled || !this.canSpeak(this.clickCooldown) || this.isGenerating) return;
    await this.speak('click');
  }

  private start(): void {
    this.intervalId = window.setInterval(() => {
      void this.tick(1000);
    }, 1000);
  }

  private async tick(dt: number): Promise<void> {
    const inputBox = (window as any).__inputBox;
    const contextMenu = (window as any).__contextMenu;
    const bubbleManager = (window as any).__bubbleManager;
    const behavior = (window as any).__behaviorEngine;

    const blocked =
      !this.config.idleEnabled ||
      !behavior?.bubbleEnabled ||
      this.isGenerating ||
      this.petState.currentAnimation === 'drag' ||
      this.bubbleManager.isVisible() ||
      bubbleManager?.isHovered ||
      inputBox?.focused ||
      contextMenu?.isHovered;

    if (blocked) {
      this.idleTimer = 0;
      return;
    }

    this.idleTimer += dt;
    if (this.idleTimer < this.nextIdleSpeakAt) return;

    const currentAnim = this.petState.currentAnimation;
    if (currentAnim !== 'idle' && currentAnim !== 'sit') {
      return;
    }

    await this.speak('idle');
    this.idleTimer = 0;
    this.scheduleNextIdleSpeak();
  }

  private async speak(trigger: ChatterTrigger): Promise<void> {
    this.isGenerating = true;
    try {
      const ipc = (window as any).__ipcRenderer;
      const message = ipc
        ? await ipc.invoke(IPC_CHANNELS.AI_PET_CHATTER, trigger)
        : this.getFallback(trigger);
      const finalMessage = String(message || '').trim() || this.getFallback(trigger);

      this.lastSpokenAt = Date.now();
      const animation = trigger === 'click' ? 'talk' : Math.random() < 0.5 ? 'talk' : 'happy';
      this.bubbleManager.show(finalMessage, 4200);
      this.petState.setAnimation(animation);
      window.setTimeout(() => {
        if (this.petState.currentAnimation === animation) {
          this.petState.setAnimation('idle');
        }
      }, 1600);
    } finally {
      this.isGenerating = false;
    }
  }

  private canSpeak(cooldown: number): boolean {
    return Date.now() - this.lastSpokenAt >= cooldown;
  }

  private scheduleNextIdleSpeak(): void {
    const min = Math.max(5000, this.config.idleIntervalMinMs || 18000);
    const max = Math.max(min, this.config.idleIntervalMaxMs || 38000);
    this.nextIdleSpeakAt = min + Math.random() * (max - min);
  }

  private getFallback(trigger: ChatterTrigger): string {
    return trigger === 'click' ? '喵，我在呢。' : '我在旁边陪你。';
  }
}
