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

    const systemContent = `${systemPrompt}\n\n今天的日期是 ${dateTimeStr}\n\n重要：所有时间字段（time、due）必须使用UTC时间的ISO 8601格式，例如 "2026-05-05T06:30:00.000Z"。不要使用本地时间。\n\n提醒功能已合并到待办中。设置提醒就是创建一个带 due 时间和 repeat 的待办。repeat 可选：none|daily|weekly|monthly。\n\n你可以管理：聊天、创建/查询/删除/更新/完成/恢复待办，创建/查询/删除/更新记事，查询/删除提醒。删除或更新时尽量提取用户提到的标题关键词。\n\n输出规则：只输出 JSON，不要代码块，不要解释。单个操作输出一个 JSON 对象；多个操作输出 JSON 数组，不要连续输出多个独立 JSON 对象。\n\nJSON格式如下：\n{"intent":"chat","reply":"你的回复","mood":"happy|normal|surprised"}\n{"intent":"create_todo","reply":"回复","mood":"happy","data":{"title":"标题","description":"描述","due":"UTC ISO时间或null","priority":"low|normal|high","repeat":"none|daily|weekly|monthly","enabled":true}}\n{"intent":"create_note","reply":"回复","mood":"happy","data":{"title":"标题","content":"内容","tags":["标签"]}}\n{"intent":"query_todos","reply":"回复","mood":"normal"}\n{"intent":"query_notes","reply":"回复","mood":"normal"}\n{"intent":"query_reminders","reply":"回复","mood":"normal"}\n{"intent":"delete_todo","reply":"回复","mood":"normal","data":{"todoTitle":"标题关键词"}}\n{"intent":"delete_note","reply":"回复","mood":"normal","data":{"noteContent":"标题或内容关键词"}}\n{"intent":"delete_reminder","reply":"回复","mood":"normal","data":{"reminderContent":"提醒标题关键词"}}\n{"intent":"update_todo","reply":"回复","mood":"happy","data":{"todoTitle":"原标题关键词","updates":{"title":"新标题","description":"新描述","due":"UTC ISO时间或null","priority":"low|normal|high","repeat":"none|daily|weekly|monthly","enabled":true}}}\n{"intent":"update_note","reply":"回复","mood":"happy","data":{"noteContent":"标题或内容关键词","updates":{"title":"新标题","content":"新内容","tags":["标签"]}}}\n{"intent":"complete_todo","reply":"回复","mood":"happy","data":{"todoTitle":"标题关键词"}}\n{"intent":"reopen_todo","reply":"回复","mood":"happy","data":{"todoTitle":"标题关键词"}}`;

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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

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
        signal: controller.signal,
      });

      clearTimeout(timeout);

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
      this.recordUsage('chat', model, data.usage, messages, content);

      const parsedResponses = this.parseAIResponses(content);
      if (parsedResponses.length > 0) {
        const [first] = parsedResponses;
        console.log('[chat] Parsed intent:', first.intent, 'actions:', parsedResponses.length);
        const cleanReply = parsedResponses.map(item => this.stripCodeBlock(item.reply || '')).filter(Boolean).join('\n');
        return {
          intent: first.intent || 'chat',
          reply: cleanReply || content,
          mood: first.mood || 'normal',
          data: parsedResponses.length > 1 ? { actions: parsedResponses } : first.data,
        };
      } else {
        console.log('[chat] JSON parse failed, raw content:', content?.slice(0, 200));
        return {
          intent: 'chat',
          reply: content || '喵？我没听懂...',
          mood: 'normal',
        };
      }
    } catch (error: any) {
      console.error('[chat] Error:', error.message || error);
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
      { role: 'system', content: `你是一只可爱的桌面宠物猫。请用你的风格回复以下查询结果。直接用中文回复，不要使用JSON格式。\n\n${contextInfo}` },
      { role: 'user', content: userMessage },
    ];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[chatWithContext] API error:', response.status, errText.slice(0, 200));
        return { intent: 'chat', reply: `查询到了喵～\n${contextInfo}`, mood: 'normal' };
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';
      this.recordUsage('context', model, data.usage, messages, content);

      if (!content) {
        console.error('[chatWithContext] Empty response from API, raw:', JSON.stringify(data).slice(0, 300));
      }

      return { intent: 'chat', reply: content || `查询到了喵～\n${contextInfo}`, mood: 'normal' };
    } catch (err: any) {
      console.error('[chatWithContext] Error:', err.message || err);
      return { intent: 'chat', reply: `查询到了喵～\n${contextInfo}`, mood: 'normal' };
    }
  }

  async generatePetChatter(trigger: 'click' | 'idle'): Promise<string> {
    const settings = this.storage.getAppSettings();
    const { apiUrl, apiKey, model } = settings.ai;
    const { prompt } = settings.petChatter;

    if (!apiKey) {
      return trigger === 'click' ? '喵，我在呢。' : '我在旁边陪你。';
    }

    const triggerHint =
      trigger === 'click'
        ? '当前触发原因：主人刚刚点击了桌宠，请像在回应主人。'
        : '当前触发原因：桌宠空闲了一会儿，请像在自言自语或温柔提醒。';

    const messages = [
      {
        role: 'system',
        content: `${prompt}\n${triggerHint}\n只输出一句最终中文短句，不要JSON，不要解释。`,
      },
      {
        role: 'user',
        content: '请生成一句桌宠气泡文案。',
      },
    ];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.9,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return trigger === 'click' ? '喵，怎么啦？' : '今天也一起加油。';
      }

      const data = await response.json() as any;
      const content = String(data.choices?.[0]?.message?.content || '').trim();
      this.recordUsage('bubble', model, data.usage, messages, content);
      const sanitized = content.replace(/^["'“”]+|["'“”]+$/g, '').split('\n')[0].trim();
      return sanitized || (trigger === 'click' ? '喵，我在呢。' : '我在这里陪你。');
    } catch {
      return trigger === 'click' ? '喵，叫我呀？' : '别太累啦。';
    }
  }

  private recordUsage(kind: string, model: string, usage: any, messages: Array<{ content: string }>, output: string): void {
    const fallbackPromptTokens = this.estimateTokens(messages.map(message => message.content).join('\n'));
    const fallbackCompletionTokens = this.estimateTokens(output);
    this.storage.recordAIUsage({
      kind,
      model,
      promptTokens: usage?.prompt_tokens ?? fallbackPromptTokens,
      completionTokens: usage?.completion_tokens ?? fallbackCompletionTokens,
      totalTokens: usage?.total_tokens ?? fallbackPromptTokens + fallbackCompletionTokens,
    });
  }

  private estimateTokens(text: string): number {
    const normalized = String(text || '').trim();
    if (!normalized) return 0;
    return Math.max(1, Math.ceil(normalized.length / 2));
  }

  private parseAIResponses(content: string): AIResponse[] {
    const text = String(content || '').trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.map(item => this.normalizeAIResponse(item)).filter(Boolean) as AIResponse[];
    } catch {
      const objects = this.extractJsonObjects(text);
      return objects
        .map(item => {
          try {
            return this.normalizeAIResponse(JSON.parse(item));
          } catch {
            return null;
          }
        })
        .filter(Boolean) as AIResponse[];
    }
  }

  private normalizeAIResponse(value: any): AIResponse | null {
    if (!value || typeof value !== 'object') return null;
    return {
      intent: value.intent || 'chat',
      reply: value.reply || '',
      mood: value.mood || 'normal',
      data: value.data,
    } as AIResponse;
  }

  private stripCodeBlock(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/^```(?:json|JSON)?\s*\n?/g, '')
      .replace(/\n?```\s*$/g, '')
      .trim();
  }

  private extractJsonObjects(text: string): string[] {
    const results: string[] = [];
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        if (depth === 0) start = i;
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          results.push(text.slice(start, i + 1));
          start = -1;
        }
      }
    }

    return results;
  }
}
