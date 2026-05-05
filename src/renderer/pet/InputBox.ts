export class InputBox {
  private container: HTMLDivElement;
  private input: HTMLInputElement;
  private isVisible: boolean = false;
  private _focused: boolean = false;
  private blurTimer: number | null = null;

  get focused(): boolean {
    return this._focused;
  }

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.input = container.querySelector('input') as HTMLInputElement;
    this.setupStyles();
    this.setupEvents();
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: absolute;
      top: 275px;
      left: 155px;
      transform: translateX(-50%);
      width: 200px;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      z-index: 200;
    `;

    this.input.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      border: 2px solid #FF9800;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
      background: white;
      color: #333;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 2px 12px rgba(0,0,0,0.18);
    `;
  }

  private setupEvents(): void {
    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && this.input.value.trim()) {
        this.submit();
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    this.input.addEventListener('focus', () => {
      this._focused = true;
      if (this.blurTimer) {
        clearTimeout(this.blurTimer);
        this.blurTimer = null;
      }
    });

    this.input.addEventListener('blur', () => {
      this._focused = false;
      this.blurTimer = window.setTimeout(() => {
        if (!this._focused && this.isVisible) {
          this.hide();
        }
      }, 5000);
    });

    // Prevent window from losing focus when typing
    this.input.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // Keep window interactive when mouse is over input
    this.input.addEventListener('mouseenter', () => {
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', false);
    });
    this.input.addEventListener('mouseleave', () => {
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', true);
    });
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    this.isVisible = true;
    this.container.style.opacity = '1';
    this.container.style.pointerEvents = 'auto';
    this.input.focus();
  }

  hide(): void {
    this.isVisible = false;
    this.container.style.opacity = '0';
    this.container.style.pointerEvents = 'none';
    this.input.value = '';
    this.input.blur();
  }

  private submit(): void {
    const message = this.input.value.trim();
    if (!message) return;

    // Send to main process
    const ipc = (window as any).__ipcRenderer;
    if (ipc) {
      // Show thinking animation
      const petState = (window as any).__petState;
      if (petState) {
        petState.setAnimation('talk');
      }

      ipc.invoke('ai:chat', message).then((response: any) => {
        // Show bubble with response
        const bubbleManager = (window as any).__bubbleManager;
        if (bubbleManager && response) {
          bubbleManager.show(response.reply);
        }

        // Update pet animation based on mood
        if (petState && response) {
          if (response.mood === 'happy' || response.mood === 'surprised') {
            petState.setAnimation('happy');
            setTimeout(() => petState.setAnimation('idle'), 2000);
          } else {
            setTimeout(() => petState.setAnimation('idle'), 2000);
          }
        }
      });
    }

    this.hide();
  }
}
