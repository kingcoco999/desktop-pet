import type { AIResponse, ConnectionTestResult, ModelInfo, Settings } from '../../shared/types';
import { StorageService } from './storage';

export class AIService {
  private storage: StorageService;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  private getSettings(): Settings['ai'] {
    return this.storage.getAppSettings().ai;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const { apiUrl, apiKey } = this.getSettings();
    if (!apiUrl || !apiKey) {
      return { success: false, message: '请先配置 API 地址和 API Key' };
    }

    try {
      const response = await fetch(`${apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { success: false, message: `连接失败: HTTP ${response.status}` };
      }

      const models = await this.getModels();
      return { success: true, message: '连接成功！', models };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    const { apiUrl, apiKey } = this.getSettings();
    if (!apiUrl || !apiKey) return [];

    try {
      const response = await fetch(`${apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return [];

      const data = await response.json() as any;
      const models: ModelInfo[] = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
      }));
      return models;
    } catch {
      return [];
    }
  }

  async chat(userMessage: string, recentMessages?: { role: string; content: string }[]): Promise<AIResponse> {
    const aiSettings = this.getSettings();
    const { apiUrl, apiKey, model, systemPrompt, maxHistoryLength } = aiSettings;

    if (!apiKey) {
      return {
        intent: 'chat',
        reply: '还没有配置 API Key 哦～请在设置中配置后再试喵～',
        mood: 'normal',
      };
    }

    const now = new Date();
    const dateTimeStr = `${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN')}`;

    const systemContent = `${systemPrompt}\n\n今天的日期是 ${dateTimeStr}\n\nJSON格式如下：\n{"intent":"chat","reply":"你的回复","mood":"happy|normal|surprised"}\n{"intent":"create_todo","reply":"回复","mood":"happy","data":{"title":"标题","due":"ISO时间或null","priority":"low|normal|high"}}\n{"intent":"create_note","reply":"回复","mood":"happy","data":{"content":"内容","tags":["标签"]}}\n{"intent":"create_reminder","reply":"回复","mood":"happy","data":{"content":"内容","time":"ISO时间","repeat":"none|daily|weekly|monthly"}}\n{"intent":"query_todos","reply":"回复","mood":"normal"}\n{"intent":"query_notes","reply":"回复","mood":"normal"}\n{"intent":"query_reminders","reply":"回复","mood":"normal"}\n{"intent":"delete_todo","reply":"回复","mood":"normal","data":{"todoTitle":"标题"}}\n{"intent":"delete_note","reply":"回复","mood":"normal","data":{"noteContent":"关键词"}}\n{"intent":"delete_reminder","reply":"回复","mood":"normal","data":{"reminderContent":"关键词"}}\n{"intent":"update_todo","reply":"回复","mood":"happy","data":{"todoTitle":"原标题","updates":{}}}\n{"intent":"complete_todo","reply":"回复","mood":"happy","data":{"todoTitle":"标题"}}`;

    const history = recentMessages || this.storage.getRecentMessages(maxHistoryLength).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const messages = [
      { role: 'system', content: systemContent },
      ...history,
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          intent: 'chat',
          reply: `AI 请求失败了喵 (HTTP ${response.status}): ${errorText.slice(0, 100)}`,
          mood: 'normal',
        };
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(content) as AIResponse;
        return {
          intent: parsed.intent || 'chat',
          reply: parsed.reply || content,
          mood: parsed.mood || 'normal',
          data: parsed.data,
        };
      } catch {
        // If JSON parsing fails, treat as plain text chat
        return {
          intent: 'chat',
          reply: content || '喵？我没听懂...',
          mood: 'normal',
        };
      }
    } catch (error: any) {
      return {
        intent: 'chat',
        reply: `网络出问题了喵: ${error.message}`,
        mood: 'normal',
      };
    }
  }

  async chatWithContext(userMessage: string, contextInfo: string): Promise<AIResponse> {
    const aiSettings = this.getSettings();
    const { apiUrl, apiKey, model } = aiSettings;

    if (!apiKey) {
      return { intent: 'chat', reply: 'API Key 未配置', mood: 'normal' };
    }

    const messages = [
      { role: 'system', content: `你是一只可爱的桌面宠物猫。请用你的风格回复以下查询结果。\n\n${contextInfo}` },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return { intent: 'chat', reply: contextInfo, mood: 'normal' };
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(content) as AIResponse;
        return {
          intent: parsed.intent || 'chat',
          reply: parsed.reply || content,
          mood: parsed.mood || 'normal',
        };
      } catch {
        return { intent: 'chat', reply: content || contextInfo, mood: 'normal' };
      }
    } catch {
      return { intent: 'chat', reply: contextInfo, mood: 'normal' };
    }
  }
}
