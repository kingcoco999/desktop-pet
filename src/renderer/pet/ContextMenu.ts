export interface ContextMenuItem {
  label: string;
  icon?: string;
  separator?: boolean;
  action?: () => void;
}

export class ContextMenu {
  private container: HTMLDivElement;
  private menuEl: HTMLDivElement | null = null;
  private hideTimer: number | null = null;
  private _isHovered: boolean = false;

  get isHovered(): boolean {
    return this._isHovered;
  }

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.setupContainer();
    this.setupGlobalClose();
  }

  private setupContainer(): void {
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 300;
    `;
  }

  private setupGlobalClose(): void {
    // Close on click outside the menu
    document.addEventListener('mousedown', (e: MouseEvent) => {
      if (this.menuEl && !this.menuEl.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  show(x: number, y: number, items: ContextMenuItem[]): void {
    this.hide();

    const menu = document.createElement('div');
    menu.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      padding: 4px 0;
      min-width: 160px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #333;
      pointer-events: auto;
      animation: ctxmenu-in 0.12s ease-out;
    `;

    // Add animation keyframes
    if (!document.getElementById('ctxmenu-styles')) {
      const style = document.createElement('style');
      style.id = 'ctxmenu-styles';
      style.textContent = `
        @keyframes ctxmenu-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height: 1px; background: #e0e0e0; margin: 4px 8px;';
        menu.appendChild(sep);
        continue;
      }

      const btn = document.createElement('div');
      btn.textContent = item.label;
      btn.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.1s;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#f0f0f0';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        item.action?.();
      });
      menu.appendChild(btn);
    }

    this.container.appendChild(menu);
    this.menuEl = menu;

    // Hover pauses auto-hide, leave resumes 5s timer
    menu.addEventListener('mouseenter', () => {
      this._isHovered = true;
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', false);
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
    });
    menu.addEventListener('mouseleave', () => {
      this._isHovered = false;
      const ipc = (window as any).__ipcRenderer;
      if (ipc) ipc.send('pet:set-ignore-mouse-events', true);
      this.startHideTimer();
    });
    this.startHideTimer();

    // Adjust if menu goes off-screen right
    requestAnimationFrame(() => {
      if (!this.menuEl) return;
      const rect = this.menuEl.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.menuEl.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this.menuEl.style.top = `${y - rect.height}px`;
      }
    });
  }

  hide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
  }

  private startHideTimer(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hide(), 5000);
  }
}
