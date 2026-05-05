export class BubbleManager {
  private container: HTMLDivElement;
  private currentBubble: HTMLDivElement | null = null;
  private hideTimer: number | null = null;
  private autoHide: boolean = true;
  private hideDelay: number = 5000;
  private petTop: number = 180; // Y position of pet top edge
  private _isHovered: boolean = false;

  get isHovered(): boolean {
    return this._isHovered;
  }

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.setupStyles();
  }

  setPetPosition(petTop: number): void {
    this.petTop = petTop;
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
  }

  show(message: string, duration?: number): void {
    // Remove existing bubble
    this.hide();

    const bubble = document.createElement('div');
    bubble.className = 'pet-bubble';
    bubble.innerHTML = `
      <div class="bubble-content">
        ${this.escapeHtml(message)}
      </div>
      <div class="bubble-arrow"></div>
    `;

    // Style the bubble - fixed size, scrollable, hoverable
    bubble.style.cssText = `
      position: absolute;
      top: ${this.petTop + 140}px;
      left: 145px;
      transform: translate(-50%, -100%);
      width: 220px;
      height: 100px;
      padding: 10px 14px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      word-wrap: break-word;
      overflow-y: auto;
      scrollbar-width: none;
      pointer-events: auto;
      animation: bubble-in 0.2s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Hover pauses auto-hide, leave resumes it
    bubble.addEventListener('mouseenter', () => {
      this._isHovered = true;
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', false);
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
    });
    bubble.addEventListener('mouseleave', () => {
      this._isHovered = false;
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', true);
      if (this.autoHide && this.currentBubble) {
        this.hideTimer = window.setTimeout(() => this.hide(), this.hideDelay);
      }
    });

    // Arrow
    const arrow = bubble.querySelector('.bubble-arrow') as HTMLDivElement;
    arrow.style.cssText = `
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid white;
    `;

    // Add animation keyframes and scrollbar hide
    if (!document.getElementById('bubble-styles')) {
      const style = document.createElement('style');
      style.id = 'bubble-styles';
      style.textContent = `
        @keyframes bubble-in {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .pet-bubble::-webkit-scrollbar { display: none; }
      `;
      document.head.appendChild(style);
    }

    this.container.appendChild(bubble);
    this.currentBubble = bubble;

    // Auto hide
    if (this.autoHide) {
      const hideTime = duration || this.hideDelay;
      this.hideTimer = window.setTimeout(() => this.hide(), hideTime);
    }
  }

  hide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.currentBubble) {
      this.currentBubble.remove();
      this.currentBubble = null;
    }
  }

  isVisible(): boolean {
    return this.currentBubble !== null;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }
}
