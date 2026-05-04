<template>
  <div class="overview-panel">
    <h1>📊 概览</h1>
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <span class="stat-icon">{{ stat.icon }}</span>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="sections">
      <div class="section card">
        <h3>📋 今日待办</h3>
        <div v-if="recentTodos.length === 0" class="empty-hint">暂无待办</div>
        <div v-else class="todo-list">
          <div v-for="todo in recentTodos" :key="todo.id" class="todo-item">
            <span :class="['check', { checked: todo.completed }]">{{ todo.completed ? '✅' : '⬜' }}</span>
            <span class="title" :class="{ done: todo.completed }">{{ todo.title }}</span>
          </div>
        </div>
      </div>

      <div class="section card">
        <h3>⏰ 即将到来的提醒</h3>
        <div v-if="upcomingReminders.length === 0" class="empty-hint">暂无提醒</div>
        <div v-else class="reminder-list">
          <div v-for="r in upcomingReminders" :key="r.id" class="reminder-item">
            <span class="time">{{ formatTime(r.time) }}</span>
            <span class="content">{{ r.content }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const { ipcRenderer } = require('electron');

const stats = ref([
  { icon: '💬', label: '今日对话', value: 0 },
  { icon: '✅', label: '待办事项', value: 0 },
  { icon: '📒', label: '记事本', value: 0 },
  { icon: '⏰', label: '提醒', value: 0 },
]);

const recentTodos = ref<any[]>([]);
const upcomingReminders = ref<any[]>([]);

async function loadData() {
  try {
    const counts = await ipcRenderer.invoke('data:counts');
    stats.value[0].value = counts.messages;
    stats.value[1].value = counts.todos;
    stats.value[2].value = counts.notes;
    stats.value[3].value = counts.reminders;

    const todos = await ipcRenderer.invoke('todo:get-all');
    recentTodos.value = todos.slice(0, 5);

    const reminders = await ipcRenderer.invoke('reminder:get-all');
    upcomingReminders.value = reminders
      .filter((r: any) => r.enabled && new Date(r.time) > new Date())
      .slice(0, 5);
  } catch (e) {
    console.error('Failed to load overview data:', e);
  }
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(loadData);
</script>

<style scoped>
.overview-panel h1 {
  margin-bottom: 24px;
  font-size: 24px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-icon {
  font-size: 32px;
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.section h3 {
  margin-bottom: 12px;
  font-size: 16px;
}
.empty-hint {
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}
.todo-item, .reminder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #F0F0F0;
}
.todo-item .title.done {
  text-decoration: line-through;
  opacity: 0.5;
}
.reminder-item .time {
  font-size: 12px;
  color: var(--primary);
  white-space: nowrap;
}
</style>
