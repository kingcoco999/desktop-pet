// IPC Channel names - centralized definition

export const IPC_CHANNELS = {
  // AI
  AI_TEST_CONNECTION: 'ai:test-connection',
  AI_GET_MODELS: 'ai:get-models',
  AI_CHAT: 'ai:chat',

  // Todo
  TODO_GET_ALL: 'todo:get-all',
  TODO_CREATE: 'todo:create',
  TODO_UPDATE: 'todo:update',
  TODO_DELETE: 'todo:delete',
  TODO_TOGGLE: 'todo:toggle',

  // Note
  NOTE_GET_ALL: 'note:get-all',
  NOTE_CREATE: 'note:create',
  NOTE_UPDATE: 'note:update',
  NOTE_DELETE: 'note:delete',

  // Reminder
  REMINDER_GET_ALL: 'reminder:get-all',
  REMINDER_CREATE: 'reminder:create',
  REMINDER_UPDATE: 'reminder:update',
  REMINDER_DELETE: 'reminder:delete',
  REMINDER_TOGGLE: 'reminder:toggle',
  REMINDER_TRIGGERED: 'reminder:triggered',

  // Chat
  CHAT_GET_HISTORY: 'chat:get-history',
  CHAT_CLEAR: 'chat:clear',

  // Pet
  PET_GET_LIST: 'pet:get-list',
  PET_SWITCH: 'pet:switch',
  PET_IMPORT: 'pet:import',
  PET_GET_CURRENT: 'pet:get-current',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:get-all',

  // Window
  WINDOW_OPEN_CONSOLE: 'window:open-console',
  WINDOW_CLOSE_CONSOLE: 'window:close-console',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
