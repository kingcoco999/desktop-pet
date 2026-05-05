// Shared type definitions for Desktop Pet

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'normal' | 'high';
  due?: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | number;
  enabled: boolean;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
  source: 'ai' | 'manual';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: 'ai' | 'manual';
  pinned: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mood?: string;
  intent?: string;
  createdAt: string;
}

export interface Settings {
  ai: {
    apiUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    maxHistoryLength: number;
  };
  pet: {
    currentPet: string;
    size: number;
    opacity: number;
    bubbleAutoHide: boolean;
    bubbleHideDelay: number;
    bubbleDefaultOpen: boolean;
  };
  petChatter: {
    clickEnabled: boolean;
    idleEnabled: boolean;
    idleIntervalMinMs: number;
    idleIntervalMaxMs: number;
    prompt: string;
  };
  behavior: {
    enabled: boolean;
    walkEnabled: boolean;
    idleToSitChance: number;
    sitToSleepChance: number;
    walkInterval: [number, number];
    walkDuration: [number, number];
    moveDistance: [number, number];
    slowWalkSpeed: number;
    fastRunSpeed: number;
    fastRunChance: number;
    movementArea: {
      enabled: boolean;
      leftPercent: number;
      topPercent: number;
      widthPercent: number;
      heightPercent: number;
    };
  };
  reminder: {
    soundEnabled: boolean;
    soundFile: string;
    notifyMode: 'bubble' | 'system' | 'both';
  };
  app: {
    startOnBoot: boolean;
    startMinimized: boolean;
  };
}

export type PetAnimationState =
  | 'idle'
  | 'walk-left'
  | 'walk-right'
  | 'walk-up'
  | 'walk-down'
  | 'sit'
  | 'sleep'
  | 'talk'
  | 'happy'
  | 'eat'
  | 'drag'
  | 'fall'
  | 'play'
  | 'jump'
  | 'scratch'
  | 'rub';

export type Intent =
  | 'chat'
  | 'create_todo'
  | 'create_note'
  | 'create_reminder'
  | 'query_todos'
  | 'query_notes'
  | 'query_reminders'
  | 'delete_todo'
  | 'delete_note'
  | 'delete_reminder'
  | 'update_todo'
  | 'update_note'
  | 'complete_todo'
  | 'reopen_todo';

export interface AIResponse {
  intent: Intent;
  reply: string;
  mood: 'happy' | 'normal' | 'surprised';
  data?: Record<string, unknown>;
}

export interface PetConfig {
  name: string;
  author: string;
  version: string;
  format: 'gif' | 'frames';
  size: { width: number; height: number };
  animations: Record<string, {
    file?: string;
    loop: boolean;
    next?: string;
  }>;
  behaviors?: {
    idleToSitChance?: number;
    walkInterval?: [number, number];
  };
  bubble?: {
    offsetX?: number;
    offsetY?: number;
    maxWidth?: number;
  };
}

export interface PetCatalogEntry {
  id: string;
  name: string;
  builtin: boolean;
}

export interface PetAtlasAnimation {
  row: number;
  frames: number;
}

export interface PetModel {
  id: string;
  name: string;
  description?: string;
  spritesheetUrl: string;
  spritesheetDataUrl?: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  animations: Record<string, PetAtlasAnimation>;
  aliases?: Partial<Record<PetAnimationState, string>>;
  mirrorStates?: Partial<Record<PetAnimationState, boolean>>;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  models?: ModelInfo[];
}

export interface AIUsageSummary {
  totalTokens: number;
  todayTokens: number;
  monthTokens: number;
  totalRequests: number;
  todayRequests: number;
  lastUsedAt?: string;
  byKind: Array<{
    kind: string;
    tokens: number;
    requests: number;
  }>;
  daily: Array<{
    date: string;
    tokens: number;
    requests: number;
  }>;
}
