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
        <div class="hint">双击桌面上的宠物开始聊天</div>
      </div>
      <div v-for="msg in messages" :key="msg.id" :class="['message-item', msg.role]">
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🐱' }}</div>
        <div class="bubble" :class="msg.role">
          <div class="content">{{ msg.content }}</div>
          <div class="meta">
            <span class="time">{{ formatTime(msg.createdAt) }}</span>
            <span v-if="msg.intent" class="intent badge badge-info">{{ msg.intent }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <input
        v-model="inputText"
        class="input-field"
        placeholder="输入消息..."
        @keydown.enter="sendMessage"
      />
      <button class="btn btn-primary" @click="sendMessage" :disabled="!inputText.trim()">
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, inject } from 'vue';

const { ipcRenderer } = require('electron');

const messages = ref<any[]>([]);
const inputText = ref('');
const messagesRef = ref<HTMLElement>();
const toast = inject<any>('toast');
const confirmDialog = inject<any>('confirm');

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
  if (!text) return;

  inputText.value = '';

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
  }
}

async function clearHistory() {
  const ok = await confirmDialog?.show('清空聊天记录？', '这会删除当前控制台中的全部聊天记录，且无法恢复。');
  if (!ok) return;
  await ipcRenderer.invoke('chat:clear');
  messages.value = [];
  toast?.show('聊天记录已清空', 'success');
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
  gap: 14px;
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
.content {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--text);
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
}
</style>
