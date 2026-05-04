// Shared type definitions for Desktop Pet

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'normal' | 'high';
  due?: string;
  createdAt: string;
  updatedAt: string;
  source: 'ai' | 'manual';
}

export interface Note {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: 'ai' | 'manual';
  pinned: boolean;
}

export interface Reminder {
  id: string;
  content: string;
  time: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  createdAt: string;
  source: 'ai' | 'manual';
  lastTriggered?: string;
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
  behavior: {
    enabled: boolean;
    walkEnabled: boolean;
    idleToSitChance: number;
    sitToSleepChance: number;
    walkInterval: [number, number];
    walkDuration: [number, number];
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
  | 'sit'
  | 'sleep'
  | 'talk'
  | 'happy'
  | 'eat'
  | 'drag'
  | 'fall';

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
  | 'update_reminder'
  | 'complete_todo';

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

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  models?: ModelInfo[];
}
