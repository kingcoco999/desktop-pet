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
  static activeMenu: ContextMenu | null = null;

  get isHovered(): boolean {
    return this._isHovered;
  }

  contains(target: Node): boolean {
    return this.menuEl?.contains(target) ?? false;
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
      const target = e.target as Node;
      // Check if click is inside any menu or quick-create panel
      const parentMenu = (window as any).__contextMenu;
      const subMenu = (window as any).__subContextMenu;
      const quickCreate = (window as any).__quickCreatePanel;
      const insideParent = parentMenu?.contains(target);
      const insideSub = subMenu?.contains(target);
      const insideQuickCreate = quickCreate?.contains(target);
      if (!insideParent && !insideSub && !insideQuickCreate) {
        this.hideAll();
      }
    });
  }

  show(x: number, y: number, items: ContextMenuItem[]): void {
    // Hide any existing submenus first
    const existingSubMenus = document.querySelectorAll('[data-submenu]');
    existingSubMenus.forEach(el => el.remove());

    // Determine if this is a submenu before setting activeMenu
    const isSubMenu = ContextMenu.activeMenu !== null && ContextMenu.activeMenu !== this;

    // If this is a submenu, don't hide the parent menu
    // Also skip hide if menuEl is already null (avoiding double-hide)
    if (!isSubMenu && this.menuEl) {
      this.hide();
    }
    ContextMenu.activeMenu = this;

    const menu = document.createElement('div');
    // Mark as submenu if this is not the active (parent) menu
    if (isSubMenu) {
      menu.setAttribute('data-submenu', 'true');
    }
    menu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      transform: none;
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
      z-index: 9999;
      visibility: hidden;
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
        padding: 4px 16px;
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
        // Don't hide if this is a submenu instance or submenu trigger
        const isSubMenuTrigger = item.label.includes('▸');
        const isSubmenuInstance = (window as any).__subContextMenu === this;
        if (!isSubMenuTrigger && !isSubmenuInstance) {
          this.hide();
        }
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

    // Measure first, then place once to avoid visible jump.
    requestAnimationFrame(() => {
      if (!this.menuEl) return;
      const rect = this.menuEl.getBoundingClientRect();

      const gap = 8;
      let finalLeft = x;
      let finalTop = y;

      if (finalLeft + rect.width > window.innerWidth - gap) {
        finalLeft = window.innerWidth - rect.width - gap;
      }
      if (finalLeft < gap) {
        finalLeft = gap;
      }

      if (finalTop + rect.height > window.innerHeight - gap) {
        finalTop = y - rect.height;
      }
      if (finalTop < gap) {
        finalTop = gap;
      }
      if (finalTop + rect.height > window.innerHeight - gap) {
        finalTop = window.innerHeight - rect.height - gap;
      }

      this.menuEl.style.left = `${finalLeft}px`;
      this.menuEl.style.top = `${finalTop}px`;
      this.menuEl.style.visibility = 'visible';
    });
  }

  render(items: ContextMenuItem[]): void {
    if (!this.menuEl) return;
    // Clear existing content
    this.menuEl.innerHTML = '';
    // Rebuild items
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height: 1px; background: #e0e0e0; margin: 4px 8px;';
        this.menuEl.appendChild(sep);
        continue;
      }
      const btn = document.createElement('div');
      btn.textContent = item.label;
      btn.style.cssText = `
        padding: 4px 16px;
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
        const isSubMenuTrigger = item.label.includes('▸');
        const isSubmenuInstance = (window as any).__subContextMenu === this;
        if (!isSubMenuTrigger && !isSubmenuInstance) {
          this.hide();
        }
        item.action?.();
      });
      this.menuEl.appendChild(btn);
    }
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
    if (ContextMenu.activeMenu === this) {
      ContextMenu.activeMenu = null;
    }
  }

  hideAll(): void {
    this.hide();
    const subMenu = (window as any).__subContextMenu;
    if (subMenu) subMenu.hide();
    const parentMenu = (window as any).__contextMenu;
    if (parentMenu) parentMenu.hide();
  }

  private startHideTimer(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hide(), 5000);
  }
}
