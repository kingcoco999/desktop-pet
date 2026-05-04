import notifier from 'node-notifier';

export function sendNotification(title: string, message: string, sound: boolean = true): void {
  notifier.notify({
    title,
    message,
    sound,
    wait: false,
  });
}
