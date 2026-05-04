import { BrowserWindow } from 'electron';
import { StorageService } from './storage';
import notifier from 'node-notifier';
import path from 'path';

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

    // Check every second for due reminders
    this.interval = setInterval(() => {
      this.checkReminders();
    }, 1000);

    console.log('[Scheduler] Started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[Scheduler] Stopped');
  }

  private checkReminders(): void {
    const dueReminders = this.storage.getDueReminders();
    const settings = this.storage.getAppSettings();

    for (const reminder of dueReminders) {
      this.triggerReminder(reminder, settings.reminder);
    }
  }

  private triggerReminder(reminder: { id: string; content: string; time: string; repeat: string }, reminderSettings: { soundEnabled: boolean; notifyMode: string }): void {
    // Send IPC to pet window for animation
    if (this.petWindow && !this.petWindow.isDestroyed()) {
      this.petWindow.webContents.send('reminder:triggered', {
        id: reminder.id,
        content: reminder.content,
      });
    }

    // System notification
    if (reminderSettings.notifyMode === 'system' || reminderSettings.notifyMode === 'both') {
      notifier.notify({
        title: '🐾 桌面宠物提醒',
        message: reminder.content,
        sound: reminderSettings.soundEnabled,
        wait: false,
      });
    }

    // Update reminder status
    this.storage.markReminderTriggered(reminder.id);

    // Handle repeat
    if (reminder.repeat !== 'none') {
      const nextTime = this.calculateNextTriggerTime(new Date(reminder.time), reminder.repeat);
      this.storage.updateReminder(reminder.id, {
        time: nextTime.toISOString(),
      });
    } else {
      // Disable one-time reminder
      this.storage.updateReminder(reminder.id, { enabled: false });
    }
  }

  private calculateNextTriggerTime(current: Date, repeat: string): Date {
    const next = new Date(current);
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
    return next;
  }
}
