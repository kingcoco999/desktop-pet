import { BrowserWindow } from 'electron';
import { StorageService } from './storage';
import notifier from 'node-notifier';
import type { Settings, Todo } from '../../shared/types';

export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private storage: StorageService;
  private petWindow: BrowserWindow | null = null;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  setPetWindow(window: BrowserWindow): void {
    this.petWindow = window;
  }

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.checkDueTodos();
    }, 2000);

    console.log('[Scheduler] Started, checking every 2s');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[Scheduler] Stopped');
  }

  private checkDueTodos(): void {
    const dueTodos = this.storage.getDueTodos();

    if (dueTodos.length > 0) {
      console.log('[Scheduler] Found', dueTodos.length, 'due todos');
    }

    const settings = this.storage.getAppSettings();

    for (const todo of dueTodos) {
      console.log('[Scheduler] Triggering:', todo.title, 'due:', todo.due);
      this.triggerTodo(todo, settings.reminder);
    }
  }

  private triggerTodo(todo: Todo, reminderSettings: Settings['reminder']): void {
    // Send IPC to pet window for bubble animation
    if (this.petWindow && !this.petWindow.isDestroyed()) {
      console.log('[Scheduler] Sending IPC to pet window:', todo.title);
      this.petWindow.webContents.send('todo:triggered', {
        id: todo.id,
        content: todo.title,
      });
    } else {
      console.log('[Scheduler] Pet window not available!');
    }

    // System notification
    if (reminderSettings.notifyMode === 'system' || reminderSettings.notifyMode === 'both') {
      notifier.notify({
        title: '🐾 桌面宠物提醒',
        message: todo.title,
        sound: reminderSettings.soundEnabled,
        wait: false,
      });
    }

    // Update last triggered time
    this.storage.markTodoTriggered(todo.id);

    // Handle repeat
    if (todo.repeat && todo.repeat !== 'none' && todo.due) {
      const nextTime = this.calculateNextTriggerTime(new Date(todo.due), todo.repeat);
      this.storage.updateTodo(todo.id, {
        due: nextTime.toISOString(),
      });
    } else {
      // Disable one-time todo reminder
      this.storage.updateTodo(todo.id, { enabled: false });
    }
  }

  private calculateNextTriggerTime(current: Date, repeat: string | number): Date {
    const next = new Date(current);
    if (typeof repeat === 'number' && repeat > 0) {
      // Custom interval: every N days
      next.setDate(next.getDate() + repeat);
    } else {
      switch (repeat) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
      }
    }
    return next;
  }
}
