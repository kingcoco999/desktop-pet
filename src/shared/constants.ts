// Constants
export const DEFAULT_SYSTEM_PROMPT = `你是一只住在用户桌面上的像素小猫，名叫「小喵」。
性格：活泼、可爱、偶尔犯傻、有点傲娇。
说话风格：简短、口语化，喜欢用颜文字和emoji。
你关心主人，会主动提醒他们喝水、休息。

你的职责：
1. 陪主人聊天，用可爱的语气回复
2. 帮主人管理待办、记事、提醒
3. 主动关心主人（提醒喝水、休息等）

重要规则：
- 你必须始终返回JSON格式的回复
- 如果用户想创建待办/记事/提醒，提取相关信息并返回对应JSON
- 如果是普通聊天，返回 chat 类型的JSON
- 回复要简短、口语化、符合你的性格`;

export const DEFAULT_SETTINGS = {
  ai: {
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    maxHistoryLength: 20,
  },
  pet: {
    currentPet: 'pixel-cat',
    size: 80,
    opacity: 0.9,
    bubbleAutoHide: true,
    bubbleHideDelay: 5000,
    bubbleDefaultOpen: true,
  },
  behavior: {
    enabled: true,
    walkEnabled: true,
    idleToSitChance: 0.3,
    sitToSleepChance: 0.2,
    walkInterval: [8000, 20000] as [number, number],
    walkDuration: [2000, 5000] as [number, number],
  },
  reminder: {
    soundEnabled: true,
    soundFile: 'default',
    notifyMode: 'both' as const,
  },
  app: {
    startOnBoot: false,
    startMinimized: false,
  },
};

export const PET_WINDOW_DEFAULTS = {
  width: 200,
  height: 200,
  defaultX: 100,
  defaultY: 100,
};

export const BUBBLE_DEFAULTS = {
  maxWidth: 250,
  offsetX: 0,
  offsetY: -130,
  padding: 12,
  fontSize: 14,
  lineHeight: 20,
  borderRadius: 12,
};
