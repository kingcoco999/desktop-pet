export class QuickCreatePanel {
  private container: HTMLDivElement;
  private panel: HTMLDivElement | null = null;
  private isVisible = false;

  constructor(container: HTMLDivElement) {
    this.container = container;
  }

  contains(target: Node): boolean {
    return this.panel?.contains(target) ?? false;
  }

  showTodo(x: number, y: number): void {
    this.hide();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      width: 260px; background: rgba(255,255,255,0.88);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.6); border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12); padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 9999; animation: qc-in 0.15s ease;
      pointer-events: auto;
    `;

    panel.innerHTML = `
      <style>
        @keyframes qc-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .qc-title { font-size: 14px; font-weight: 700; color: #1D1D1F; margin-bottom: 12px; }
        .qc-input { width: 100%; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; font-size: 13px; outline: none; background: rgba(255,255,255,0.6); margin-bottom: 10px; font-family: inherit; pointer-events: auto; }
        .qc-input:focus { border-color: #FF6B8A; box-shadow: 0 0 0 2px rgba(255,107,138,0.15); }
        .qc-label { font-size: 11px; color: #86868B; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .qc-dates { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
        .qc-date-btn { padding: 5px 10px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; font-size: 12px; cursor: pointer; background: rgba(255,255,255,0.5); color: #333; transition: all 0.15s; pointer-events: auto; }
        .qc-date-btn:hover { background: rgba(255,107,138,0.08); border-color: #FF6B8A; }
        .qc-date-btn.active { background: #FF6B8A; color: white; border-color: #FF6B8A; }
        .qc-row { display: flex; gap: 8px; margin-bottom: 10px; }
        .qc-row .qc-input { margin-bottom: 0; }
        .qc-select { padding: 8px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; font-size: 12px; outline: none; background: rgba(255,255,255,0.6); font-family: inherit; cursor: pointer; pointer-events: auto; }
        .qc-actions { display: flex; gap: 8px; margin-top: 12px; }
        .qc-btn { flex: 1; padding: 8px; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; pointer-events: auto; }
        .qc-btn-cancel { background: rgba(0,0,0,0.05); color: #666; }
        .qc-btn-cancel:hover { background: rgba(0,0,0,0.1); }
        .qc-btn-submit { background: #FF6B8A; color: white; }
        .qc-btn-submit:hover { background: #E8456B; }
      </style>
      <div class="qc-title">📝 新建待办</div>
      <input class="qc-input" id="qc-todo-title" placeholder="待办标题..." autofocus />
      <div class="qc-label">快捷日期</div>
      <div class="qc-dates" id="qc-dates">
        <button class="qc-date-btn active" data-date="${formatDate(now)}">今天</button>
        <button class="qc-date-btn" data-date="${formatDate(tomorrow)}">明天</button>
        <button class="qc-date-btn" data-date="${formatDate(nextWeek)}">下周</button>
        <button class="qc-date-btn" data-date="">不限</button>
      </div>
      <div class="qc-row">
        <input class="qc-input" id="qc-todo-time" type="time" style="flex:1" />
        <select class="qc-select" id="qc-todo-priority" style="width:80px">
          <option value="normal">普通</option>
          <option value="high">高</option>
          <option value="low">低</option>
        </select>
      </div>
      <div class="qc-row" id="qc-remind-row">
        <label class="qc-label" style="margin:0;display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0">
          <input type="checkbox" id="qc-todo-enabled" checked style="pointer-events:auto" /> 开启提醒
        </label>
        <select class="qc-select" id="qc-todo-repeat" style="flex:1">
          <option value="none">不重复</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </div>
      <div class="qc-actions">
        <button class="qc-btn qc-btn-cancel" id="qc-cancel">取消</button>
        <button class="qc-btn qc-btn-submit" id="qc-submit">创建</button>
      </div>
    `;

    this.container.appendChild(panel);
    this.panel = panel;
    this.isVisible = true;

    // Enable mouse events on the window so the panel can receive clicks
    const ipc = (window as any).__ipcRenderer;
    if (ipc) ipc.send('pet:set-ignore-mouse-events', false);

    // Date button selection
    let selectedDate = formatDate(now);
    const dateBtns = panel.querySelectorAll('.qc-date-btn');
    dateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dateBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDate = (btn as HTMLElement).dataset.date || '';
      });
    });

    // Focus title input
    const titleInput = panel.querySelector('#qc-todo-title') as HTMLInputElement;
    setTimeout(() => titleInput?.focus(), 50);

    // Enter to submit
    titleInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') this.submitTodo(panel);
      if (e.key === 'Escape') this.hideAndReturn();
    });

    // Cancel button
    panel.querySelector('#qc-cancel')?.addEventListener('click', () => this.hideAndReturn());

    // Submit button
    panel.querySelector('#qc-submit')?.addEventListener('click', () => this.submitTodo(panel));

    // Click outside to close
    const closeHandler = (e: MouseEvent) => {
      if (this.panel && !this.panel.contains(e.target as Node)) {
        this.hide();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeHandler), 100);

    // Adjust if off-screen
    requestAnimationFrame(() => {
      if (!this.panel) return;
      const rect = this.panel.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.panel.style.left = `${window.innerWidth - rect.width - 12}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this.panel.style.top = `${window.innerHeight - rect.height - 12}px`;
      }
    });
  }

  showNote(x: number, y: number): void {
    this.hide();

    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      width: 260px; background: rgba(255,255,255,0.88);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.6); border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12); padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 9999; animation: qc-in 0.15s ease;
      pointer-events: auto;
    `;

    panel.innerHTML = `
      <style>
        @keyframes qc-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .qc-title { font-size: 14px; font-weight: 700; color: #1D1D1F; margin-bottom: 12px; }
        .qc-input, .qc-textarea { width: 100%; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; font-size: 13px; outline: none; background: rgba(255,255,255,0.6); font-family: inherit; pointer-events: auto; }
        .qc-input:focus, .qc-textarea:focus { border-color: #FF6B8A; box-shadow: 0 0 0 2px rgba(255,107,138,0.15); }
        .qc-textarea { resize: vertical; min-height: 80px; margin-bottom: 10px; pointer-events: auto; }
        .qc-label { font-size: 11px; color: #86868B; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .qc-actions { display: flex; gap: 8px; margin-top: 12px; }
        .qc-btn { flex: 1; padding: 8px; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; pointer-events: auto; }
        .qc-btn-cancel { background: rgba(0,0,0,0.05); color: #666; }
        .qc-btn-cancel:hover { background: rgba(0,0,0,0.1); }
        .qc-btn-submit { background: #FF6B8A; color: white; }
        .qc-btn-submit:hover { background: #E8456B; }
      </style>
      <div class="qc-title">📒 新建记事</div>
      <textarea class="qc-textarea" id="qc-note-content" placeholder="记事内容..." autofocus></textarea>
      <div class="qc-label">标签（逗号分隔）</div>
      <input class="qc-input" id="qc-note-tags" placeholder="标签1, 标签2" />
      <div class="qc-actions">
        <button class="qc-btn qc-btn-cancel" id="qc-cancel">取消</button>
        <button class="qc-btn qc-btn-submit" id="qc-submit">创建</button>
      </div>
    `;

    this.container.appendChild(panel);
    this.panel = panel;
    this.isVisible = true;

    // Enable mouse events on the window so the panel can receive clicks
    const ipc = (window as any).__ipcRenderer;
    if (ipc) ipc.send('pet:set-ignore-mouse-events', false);

    const contentInput = panel.querySelector('#qc-note-content') as HTMLTextAreaElement;
    setTimeout(() => contentInput?.focus(), 50);

    contentInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.hideAndReturn();
    });

    panel.querySelector('#qc-cancel')?.addEventListener('click', () => this.hideAndReturn());
    panel.querySelector('#qc-submit')?.addEventListener('click', () => this.submitNote(panel));

    const closeHandler = (e: MouseEvent) => {
      if (this.panel && !this.panel.contains(e.target as Node)) {
        this.hide();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeHandler), 100);

    requestAnimationFrame(() => {
      if (!this.panel) return;
      const rect = this.panel.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.panel.style.left = `${window.innerWidth - rect.width - 12}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this.panel.style.top = `${window.innerHeight - rect.height - 12}px`;
      }
    });
  }

  private submitTodo(panel: HTMLDivElement): void {
    const title = (panel.querySelector('#qc-todo-title') as HTMLInputElement)?.value?.trim();
    if (!title) return;

    const activeDate = panel.querySelector('.qc-date-btn.active') as HTMLElement;
    const dateStr = activeDate?.dataset?.date || '';
    const time = (panel.querySelector('#qc-todo-time') as HTMLInputElement)?.value || '';
    const priority = (panel.querySelector('#qc-todo-priority') as HTMLSelectElement)?.value || 'normal';
    const enabled = (panel.querySelector('#qc-todo-enabled') as HTMLInputElement)?.checked ?? true;
    const repeat = (panel.querySelector('#qc-todo-repeat') as HTMLSelectElement)?.value || 'none';

    let due: string | null = null;
    if (dateStr) {
      due = time ? `${dateStr}T${time}:00.000Z` : `${dateStr}T00:00:00.000Z`;
      // Convert local date to UTC
      if (time) {
        const localDate = new Date(`${dateStr}T${time}`);
        due = localDate.toISOString();
      } else {
        const localDate = new Date(`${dateStr}T00:00:00`);
        due = localDate.toISOString();
      }
    }

    const ipc = (window as any).__ipcRenderer;
    if (ipc) {
      ipc.invoke('todo:create', { title, due, priority, repeat: due ? repeat : 'none', enabled: due ? enabled : false, source: 'manual' }).then(() => {
        const bubble = (window as any).__bubbleManager;
        if (bubble) bubble.show(`✅ 已创建待办：${title}`);
        const petState = (window as any).__petState;
        if (petState) {
          petState.setAnimation('happy');
          setTimeout(() => petState.setAnimation('idle'), 1500);
        }
      });
    }

    this.hide();
  }

  private submitNote(panel: HTMLDivElement): void {
    const content = (panel.querySelector('#qc-note-content') as HTMLTextAreaElement)?.value?.trim();
    if (!content) return;

    const tagsStr = (panel.querySelector('#qc-note-tags') as HTMLInputElement)?.value || '';
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

    const ipc = (window as any).__ipcRenderer;
    if (ipc) {
      ipc.invoke('note:create', { content, tags, source: 'manual' }).then(() => {
        const bubble = (window as any).__bubbleManager;
        if (bubble) bubble.show(`📒 已创建记事`);
        const petState = (window as any).__petState;
        if (petState) {
          petState.setAnimation('happy');
          setTimeout(() => petState.setAnimation('idle'), 1500);
        }
      });
    }

    this.hide();
  }

  hideAndReturn(): void {
    this.hide();
    // Re-show parent context menu
    const parentMenu = (window as any).__contextMenu;
    const pos = (window as any).__subMenuPos;
    const items = (window as any).__parentMenuItems;
    if (parentMenu && pos && items) {
      parentMenu.show(pos.x, pos.y, items);
    }
  }

  hide(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    this.isVisible = false;
    // Restore click-through on transparent areas
    const ipc = (window as any).__ipcRenderer;
    if (ipc) ipc.send('pet:set-ignore-mouse-events', true);
  }
}
