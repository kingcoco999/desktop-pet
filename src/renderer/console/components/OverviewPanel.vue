<template>
  <div class="overview-panel">
    <header class="topbar">
      <div>
        <span>{{ greeting }}</span>
        <h1>中控台</h1>
      </div>
      <div class="top-actions">
        <button class="refresh-btn" :disabled="loading" @click="loadData">
          {{ loading ? '刷新中' : '刷新' }}
        </button>
        <div class="ai-state" :class="{ ok: aiConfigured }">
          <i></i>{{ aiConfigured ? 'AI 已配置' : 'AI 未配置' }}
        </div>
      </div>
    </header>

    <section class="dashboard">
      <article class="home-card token-card">
        <span>Token 消耗</span>
        <strong>{{ formatNumber(usage.totalTokens) }}</strong>
        <small>今日 {{ formatNumber(usage.todayTokens) }} / 本月 {{ formatNumber(usage.monthTokens) }}</small>
      </article>

      <article class="home-card mini-card">
        <span>AI 请求</span>
        <strong>{{ usage.totalRequests }}</strong>
        <small>今日 {{ usage.todayRequests }} 次</small>
      </article>

      <article class="home-card mini-card">
        <span>进行中</span>
        <strong>{{ activeTodos.length }}</strong>
        <small>{{ reminderCount }} 个提醒</small>
      </article>

      <article class="home-card mini-card">
        <span>记事</span>
        <strong>{{ counts.notes }}</strong>
        <small>{{ counts.messages }} 条聊天</small>
      </article>
    </section>

    <section v-if="usage.byKind.length > 0 || usage.daily.some(d => d.tokens > 0)" class="usage-detail-row">
      <article class="home-card usage-breakdown">
        <h3>请求分类</h3>
        <div class="kind-list">
          <div v-for="item in usage.byKind" :key="item.kind" class="kind-item">
            <span class="kind-label">{{ kindLabel(item.kind) }}</span>
            <div class="kind-bar-wrap">
              <div class="kind-bar" :style="{ width: kindBarWidth(item.tokens) }"></div>
            </div>
            <span class="kind-value">{{ formatNumber(item.tokens) }} tokens</span>
            <span class="kind-requests">{{ item.requests }} 次</span>
          </div>
        </div>
      </article>

      <article class="home-card usage-trend">
        <h3>近 7 日趋势</h3>
        <div class="trend-chart">
          <div v-for="day in usage.daily" :key="day.date" class="trend-col">
            <div class="trend-bar-wrap">
              <div class="trend-bar" :style="{ height: trendBarHeight(day.tokens) }" :title="`${day.date}: ${formatNumber(day.tokens)} tokens`"></div>
            </div>
            <span class="trend-label">{{ formatDayLabel(day.date) }}</span>
          </div>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <article class="home-card panel task-panel">
        <div class="panel-title">
          <h2>今日待办</h2>
          <router-link to="/todos">查看全部</router-link>
        </div>
        <button v-for="todo in activeTodos.slice(0, 5)" :key="todo.id" class="todo-item" @click="toggleTodo(todo)">
          <i :class="todo.priority"></i>
          <span>{{ todo.title }}</span>
          <small>{{ todo.due ? formatTime(todo.due) : '无截止' }}</small>
        </button>
        <div v-if="activeTodos.length === 0" class="empty">暂无进行中的待办</div>
      </article>

      <article class="home-card panel">
        <div class="panel-title">
          <h2>最近对话</h2>
          <router-link to="/chat">打开聊天</router-link>
        </div>
        <div v-for="message in recentMessages.slice(-4)" :key="message.id" class="chat-item">
          <span>{{ message.role === 'user' ? '我' : 'AI' }}</span>
          <strong>{{ message.content }}</strong>
        </div>
        <div v-if="recentMessages.length === 0" class="empty">暂无最近对话</div>
      </article>

      <article class="home-card panel">
        <div class="panel-title">
          <h2>最近记事</h2>
          <router-link to="/notes">打开</router-link>
        </div>
        <div class="note-preview">
          <strong>{{ latestNoteTitle }}</strong>
          <span>{{ latestNoteText }}</span>
        </div>
        <div class="quick-links">
          <router-link to="/chat">AI 聊天</router-link>
          <router-link to="/settings">设置</router-link>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, onUnmounted, reactive, ref } from 'vue';
import type { AIUsageSummary, Settings, Todo, Note, ChatMessage } from '../../../shared/types';
import { DEFAULT_SETTINGS } from '../../../shared/constants';

const { ipcRenderer } = require('electron');

const todos = ref<Todo[]>([]);
const notes = ref<Note[]>([]);
const recentMessages = ref<ChatMessage[]>([]);
const loading = ref(false);
const counts = reactive({ messages: 0, todos: 0, notes: 0 });
const settings = reactive<Settings>(structuredClone(DEFAULT_SETTINGS));
const usage = reactive<AIUsageSummary>({
  totalTokens: 0,
  todayTokens: 0,
  monthTokens: 0,
  totalRequests: 0,
  todayRequests: 0,
  byKind: [],
  daily: [],
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
});

const aiConfigured = computed(() => {
  const apiUrl = String(settings.ai.apiUrl || '').trim();
  const apiKey = String(settings.ai.apiKey || '').trim();
  const model = String(settings.ai.model || '').trim();
  return Boolean(apiUrl && (apiKey || model));
});
const activeTodos = computed(() => todos.value.filter(todo => !todo.completed));
const reminderCount = computed(() => todos.value.filter(todo => todo.due && todo.enabled && !todo.completed).length);
const latestNoteTitle = computed(() => notes.value[0]?.title || makeFallbackTitle(notes.value[0]?.content || ''));
const latestNoteText = computed(() => notes.value[0]?.content?.slice(0, 70) || '还没有记事内容。');

async function loadData() {
  if (loading.value) return;
  loading.value = true;
  try {
    const [todoResult, noteResult, messageResult, countsResult, usageResult, settingsResult] = await Promise.allSettled([
      ipcRenderer.invoke('todo:get-all'),
      ipcRenderer.invoke('note:get-all'),
      ipcRenderer.invoke('chat:get-history', 12),
      ipcRenderer.invoke('data:counts'),
      ipcRenderer.invoke('ai:usage-summary'),
      ipcRenderer.invoke('settings:get-all'),
    ]);

    if (todoResult.status === 'fulfilled') todos.value = todoResult.value || [];
    if (noteResult.status === 'fulfilled') notes.value = noteResult.value || [];
    if (messageResult.status === 'fulfilled') recentMessages.value = messageResult.value || [];
    if (countsResult.status === 'fulfilled') Object.assign(counts, countsResult.value || {});
    if (usageResult.status === 'fulfilled') Object.assign(usage, usageResult.value || {});
    if (settingsResult.status === 'fulfilled') deepAssign(settings, settingsResult.value || {});
  } catch (e) {
    console.error('Failed to load overview data:', e);
  } finally {
    loading.value = false;
  }
}

async function toggleTodo(todo: Todo) {
  const updated = await ipcRenderer.invoke('todo:toggle', todo.id);
  if (!updated) return;
  const index = todos.value.findIndex(item => item.id === todo.id);
  if (index >= 0) todos.value[index] = updated;
}

function deepAssign(target: any, source: any) {
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = target[key] || {};
      deepAssign(target[key], value);
      return;
    }
    target[key] = value;
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function formatTime(value: string): string {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function makeFallbackTitle(content: string): string {
  return String(content || '').split(/\r?\n/).find(Boolean)?.slice(0, 24) || '暂无记事';
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = { chat: '对话', bubble: '气泡', context: '查询' };
  return map[kind] || kind;
}

function kindBarWidth(tokens: number): string {
  const max = Math.max(...usage.byKind.map(k => k.tokens), 1);
  return `${Math.round((tokens / max) * 100)}%`;
}

function trendBarHeight(tokens: number): string {
  const max = Math.max(...usage.daily.map(d => d.tokens), 1);
  return `${Math.round((tokens / max) * 100)}%`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${day}(${weekdays[d.getDay()]})`;
}

function handleWindowFocus() {
  loadData();
}

onMounted(() => {
  loadData();
  window.addEventListener('focus', handleWindowFocus);
});
onActivated(loadData);
onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus);
});
</script>

<style>
.overview-panel {
  display: grid;
  grid-template-rows: 58px 92px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.overview-panel .topbar,
.overview-panel .home-card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
  min-width: 0;
  overflow: hidden;
}

.overview-panel .topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.overview-panel .top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.overview-panel .refresh-btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  color: #334155;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.overview-panel .refresh-btn:disabled {
  opacity: 0.55;
}

.overview-panel .topbar span,
.overview-panel .token-card span,
.overview-panel .mini-card span,
.overview-panel .panel-title a,
.overview-panel .chat-item span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.overview-panel h1,
.overview-panel h2 {
  margin: 0;
  color: #111827;
}

.overview-panel h1 {
  margin-top: 2px;
  font-size: 22px;
}

.overview-panel h2 {
  font-size: 15px;
}

.overview-panel .ai-state {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #92400e;
  font-size: 13px;
  font-weight: 800;
}

.overview-panel .ai-state.ok {
  color: #047857;
}

.overview-panel .ai-state i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.overview-panel .dashboard {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.overview-panel .token-card strong,
.overview-panel .mini-card strong {
  display: block;
  margin: 7px 0 5px;
  color: #111827;
  font-size: 24px;
  line-height: 1;
}

.overview-panel .token-card small,
.overview-panel .mini-card small {
  display: block;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-panel .content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr) minmax(0, 0.9fr);
  gap: 12px;
  min-height: 0;
  min-width: 0;
}

.overview-panel .panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.overview-panel .panel-title a,
.overview-panel .quick-links a {
  text-decoration: none;
}

.overview-panel .todo-item {
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.52);
  color: #111827;
  font: inherit;
  text-align: left;
}

.overview-panel .todo-item i {
  width: 4px;
  height: 22px;
  border-radius: 999px;
  background: #94a3b8;
}

.overview-panel .todo-item i.high {
  background: #ef4444;
}

.overview-panel .todo-item i.low {
  background: #22c55e;
}

.overview-panel .todo-item span {
  overflow: hidden;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-panel .todo-item small {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.overview-panel .chat-item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.overview-panel .chat-item:last-child {
  border-bottom: 0;
}

.overview-panel .chat-item strong {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #111827;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-panel .note-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 86px;
  overflow: hidden;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.7;
}

.overview-panel .note-preview strong {
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-panel .note-preview span {
  display: -webkit-box;
  overflow: hidden;
  color: #64748b;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.overview-panel .quick-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.overview-panel .quick-links a {
  display: grid;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: #111827;
  color: white;
  font-size: 13px;
  font-weight: 800;
}

.overview-panel .empty {
  display: grid;
  height: calc(100% - 36px);
  place-items: center;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.usage-detail-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-width: 0;
}

.overview-panel .usage-breakdown h3,
.overview-panel .usage-trend h3 {
  margin: 0 0 14px;
  font-size: 14px;
}

.kind-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kind-item {
  display: grid;
  grid-template-columns: 56px 1fr auto auto;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.kind-label {
  font-weight: 700;
  color: var(--text);
}

.kind-bar-wrap {
  height: 6px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.06);
  overflow: hidden;
}

.kind-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #111827, #6b7280);
  transition: width 0.3s ease;
}

.kind-value {
  color: var(--text-secondary);
  font-weight: 700;
}

.kind-requests {
  color: var(--text-secondary);
  font-size: 11px;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 80px;
  padding-top: 4px;
}

.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.trend-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.trend-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #111827, #374151);
  transition: height 0.3s ease;
}

.trend-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (max-width: 1080px) {
  .overview-panel .content-grid {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr) minmax(0, 0.9fr);
  }
}

@media (max-width: 680px) {
  .overview-panel {
    grid-template-rows: 58px 196px minmax(0, 1fr);
  }

  .overview-panel .dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-panel .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
