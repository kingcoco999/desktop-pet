<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h1>💬 聊天</h1>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" @click="searchMessages">🔍 搜索</button>
        <button class="btn btn-danger btn-sm" @click="clearHistory">🗑️ 清空</button>
      </div>
    </div>

    <div class="chat-messages" ref="messagesRef">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="emoji">💬</div>
        <div class="message">还没有聊天记录</div>
        <div class="hint">双击桌面上的宠物开始聊天</div>
      </div>
      <div v-for="msg in filteredMessages" :key="msg.id" :class="['message-item', msg.role]">
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🐱' }}</div>
        <div class="bubble">
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
import { ref, computed, onMounted, nextTick, inject } from 'vue';

const { ipcRenderer } = require('electron');

const messages = ref<any[]>([]);
const inputText = ref('');
const searchQuery = ref('');
const messagesRef = ref<HTMLElement>();
const toast = inject<any>('toast');

const filteredMessages = computed(() => {
  if (!searchQuery.value) return messages.value;
  const q = searchQuery.value.toLowerCase();
  return messages.value.filter(m => m.content.toLowerCase().includes(q));
});

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

  // Add user message immediately
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

function searchMessages() {
  const q = prompt('搜索聊天记录:');
  if (q !== null) {
    searchQuery.value = q;
  }
}

async function clearHistory() {
  if (confirm('确定清空所有聊天记录？')) {
    await ipcRenderer.invoke('chat:clear');
    messages.value = [];
    toast?.show('聊天记录已清空', 'success');
  }
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
  height: 100%;
}
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.chat-header h1 {
  font-size: 24px;
}
.actions {
  display: flex;
  gap: 8px;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow);
  margin-bottom: 16px;
}
.message-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.message-item.user {
  flex-direction: row-reverse;
}
.avatar {
  font-size: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 50%;
  flex-shrink: 0;
}
.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  background: #F0F0F0;
}
.message-item.user .bubble {
  background: var(--primary-light);
}
.content {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
}
.time {
  font-size: 11px;
  color: var(--text-secondary);
}
.chat-input {
  display: flex;
  gap: 8px;
}
.chat-input .input-field {
  flex: 1;
}
</style>
