<template>
  <div class="chat-panel">
    <div class="page-header">
      <h1>💬 AI 聊天</h1>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" @click="clearHistory">🗑️ 清空</button>
      </div>
    </div>

    <div class="chat-messages card" ref="messagesRef">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="emoji">💬</div>
        <div class="message">还没有聊天记录</div>
        <div class="hint">直接输入消息或使用下方快捷指令</div>
      </div>
      <div v-for="msg in messages" :key="msg.id" :class="['message-item', msg.role]">
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🐱' }}</div>
        <div class="bubble" :class="msg.role">
          <div class="content" v-html="renderMarkdown(msg.content)"></div>
          <div class="meta">
            <span class="time">{{ formatTime(msg.createdAt) }}</span>
            <span v-if="msg.intent" class="intent badge badge-info">{{ intentLabel(msg.intent) }}</span>
            <span v-if="msg.mood" class="mood">{{ moodEmoji(msg.mood) }}</span>
            <button class="copy-btn" @click="copyMessage(msg.content)" title="复制">📋</button>
          </div>
        </div>
      </div>
      <div v-if="sending" class="message-item assistant">
        <div class="avatar">🐱</div>
        <div class="bubble assistant thinking">
          <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <button v-for="action in quickActions" :key="action.label" class="quick-chip" @click="sendQuickAction(action.prompt)" :disabled="sending">
        {{ action.icon }} {{ action.label }}
      </button>
    </div>

    <div class="chat-input">
      <input
        v-model="inputText"
        class="input-field"
        placeholder="输入消息... 例如：帮我创建一个待办"
        @keydown.enter="sendMessage"
        :disabled="sending"
      />
      <button class="btn btn-primary" @click="sendMessage" :disabled="!inputText.trim() || sending">
        {{ sending ? '思考中...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, inject } from 'vue';

const { ipcRenderer } = require('electron');

const messages = ref<any[]>([]);
const inputText = ref('');
const sending = ref(false);
const messagesRef = ref<HTMLElement>();
const toast = inject<any>('toast');
const confirmDialog = inject<any>('confirm');

const quickActions = [
  { icon: '📋', label: '查看待办', prompt: '帮我看看现在有哪些待办事项' },
  { icon: '📝', label: '查看记事', prompt: '帮我看看有哪些记事' },
  { icon: '🔔', label: '查看提醒', prompt: '帮我看看有哪些提醒' },
  { icon: '✅', label: '新建待办', prompt: '帮我创建一个待办：' },
  { icon: '📒', label: '新建记事', prompt: '帮我创建一条记事：' },
  { icon: '⏰', label: '设置提醒', prompt: '提醒我' },
  { icon: '🗑️', label: '删除待办', prompt: '帮我删除待办：' },
  { icon: '🧹', label: '清空待办', prompt: '帮我清空所有待办' },
];

async function loadMessages() {
  try {
    messages.value = await ipcRenderer.invoke('chat:get-history', 200);
    await nextTick();
    scrollToBottom();
  } catch (e) {
    console.error('Failed to load messages:', e);
  }
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || sending.value) return;
  inputText.value = '';
  await doSend(text);
}

function sendQuickAction(prompt: string) {
  if (prompt.endsWith('：') || prompt.endsWith(':')) {
    inputText.value = prompt;
    return;
  }
  doSend(prompt);
}

async function doSend(text: string) {
  sending.value = true;

  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  });
  await nextTick();
  scrollToBottom();

  try {
    const response = await ipcRenderer.invoke('ai:chat', text);
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.reply,
      mood: response.mood,
      intent: response.intent,
      createdAt: new Date().toISOString(),
    });
    await nextTick();
    scrollToBottom();
  } catch (e: any) {
    toast?.show('发送失败: ' + e.message, 'error');
  } finally {
    sending.value = false;
  }
}

async function clearHistory() {
  const ok = await confirmDialog?.show('清空聊天记录？', '这会删除当前控制台中的全部聊天记录，且无法恢复。');
  if (!ok) return;
  await ipcRenderer.invoke('chat:clear');
  messages.value = [];
  toast?.show('聊天记录已清空', 'success');
}

function copyMessage(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast?.show('已复制到剪贴板', 'success');
  });
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function intentLabel(intent: string): string {
  const map: Record<string, string> = {
    chat: '聊天', create_todo: '创建待办', create_note: '创建记事',
    create_reminder: '创建提醒', query_todos: '查询待办', query_notes: '查询记事',
    query_reminders: '查询提醒', delete_todo: '删除待办', delete_note: '删除记事',
    delete_reminder: '删除提醒', update_todo: '更新待办', update_note: '更新记事',
    complete_todo: '完成待办', reopen_todo: '恢复待办',
  };
  return map[intent] || intent;
}

function moodEmoji(mood: string): string {
  return ({ happy: '😊', normal: '😐', surprised: '😮' } as Record<string, string>)[mood] || '';
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  return html;
}

onMounted(loadMessages);
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  min-height: calc(100vh - 72px);
  width: 100%;
  min-width: 0;
  gap: 12px;
  overflow: hidden;
}
.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.message-item {
  display: flex;
  gap: 12px;
}
.message-item.user {
  flex-direction: row-reverse;
}
.avatar {
  font-size: 20px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
}
.bubble {
  max-width: 70%;
  padding: 12px 15px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}
.bubble.user {
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(55, 65, 81, 0.88));
  border-bottom-right-radius: 6px;
}
.bubble.assistant {
  border-bottom-left-radius: 6px;
}
.bubble.thinking {
  padding: 14px 20px;
}
.content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
}
.content :deep(strong) {
  font-weight: 700;
}
.content :deep(code) {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(17, 24, 39, 0.06);
  font-size: 12px;
  font-family: 'SF Mono', Menlo, monospace;
}
.bubble.user .content,
.bubble.user .time,
.bubble.user .intent {
  color: #f9fafb;
}
.meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.time {
  font-size: 11px;
  color: var(--text-secondary);
}
.intent {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(29, 78, 216, 0.1);
  color: #1d4ed8;
  font-weight: 700;
}
.mood {
  font-size: 14px;
}
.copy-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.15s;
  padding: 2px 4px;
}
.message-item:hover .copy-btn {
  opacity: 0.6;
}
.copy-btn:hover {
  opacity: 1 !important;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}
.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  animation: typing-bounce 1.2s infinite ease-in-out;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.quick-actions {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0 4px;
}
.quick-chip {
  border: 1px solid rgba(17, 24, 39, 0.1);
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.quick-chip:hover {
  background: rgba(17, 24, 39, 0.06);
  border-color: rgba(17, 24, 39, 0.18);
}
.quick-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input {
  position: sticky;
  bottom: 0;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.chat-input .input-field {
  flex: 1;
  background: rgba(255, 255, 255, 0.86);
}

@media (max-width: 860px) {
  .chat-input {
    flex-direction: column;
  }

  .bubble {
    max-width: 100%;
  }

  .quick-actions {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }
}
</style>
