<template>
  <div class="todo-panel">
    <div class="page-header todo-header">
      <div>
        <h1>✅ 待办事项</h1>
        <p class="page-subtitle">把今天真正要做的事收拢到一个清晰面板里。</p>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" @click="filter = 'remind'">只看提醒</button>
        <button class="btn btn-primary" @click="openCreateModal">+ 新建任务</button>
      </div>
    </div>

    <section class="card todo-summary">
      <div class="summary-card summary-card-strong">
        <span class="summary-label">今日任务池</span>
        <strong>{{ todos.length }}</strong>
        <span class="summary-caption">全部待办</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">进行中</span>
        <strong>{{ activeCount }}</strong>
        <span class="summary-caption">还没完成的任务</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">已完成</span>
        <strong>{{ completedCount }}</strong>
        <span class="summary-caption">今天已经推进的事</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">提醒任务</span>
        <strong>{{ remindCount }}</strong>
        <span class="summary-caption">带时间提醒</span>
      </div>
    </section>

    <div class="todo-workspace">
      <section class="card task-board">
        <div class="task-board-top">
          <div class="task-filter-group">
            <button
              v-for="item in filterItems"
              :key="item.value"
              :class="['filter-chip', { active: filter === item.value }]"
              @click="filter = item.value"
            >
              {{ item.label }}
            </button>
          </div>
          <input
            v-model="searchQuery"
            class="input-field task-search"
            placeholder="搜索任务标题、描述"
          />
        </div>

        <div class="task-board-header">
          <div>
            <div class="board-title">任务列表</div>
            <div class="board-subtitle">当前筛选下共 {{ filteredTodos.length }} 项</div>
          </div>
          <div class="board-meta">
            <span class="meta-pill">完成率 {{ completionRate }}%</span>
          </div>
        </div>

        <div v-if="filteredTodos.length === 0" class="empty-state task-empty">
          <div class="emoji">📋</div>
          <div class="message">当前筛选下没有任务</div>
          <div class="hint">试试切换筛选，或者新建一个更明确的待办。</div>
        </div>

        <div v-else class="task-list">
          <article
            v-for="todo in filteredTodos"
            :key="todo.id"
            :class="['task-row', { active: selectedTodoView?.id === todo.id, completed: todo.completed }]"
            @click="selectTodo(todo.id)"
          >
            <button class="check-btn" @click.stop="toggleTodo(todo)" :title="todo.completed ? '标记为未完成' : '标记为已完成'">
              {{ todo.completed ? '✓' : '' }}
            </button>

            <div class="task-content">
              <div class="task-title-line">
                <span class="task-title">{{ todo.title }}</span>
                <span :class="['priority-dot', todo.priority]"></span>
              </div>
              <p v-if="todo.description" class="task-desc">{{ todo.description }}</p>
              <div class="task-tags">
                <span :class="['task-badge', 'priority', todo.priority]">{{ priorityLabel(todo.priority) }}</span>
                <span v-if="todo.due" class="task-badge">📅 {{ formatDate(todo.due) }}</span>
                <span v-if="todo.repeat && todo.repeat !== 'none'" class="task-badge">{{ repeatLabel(todo.repeat) }}</span>
                <span v-if="todo.enabled && todo.due" class="task-badge highlight">提醒中</span>
                <span v-if="todo.source === 'ai'" class="task-badge">AI</span>
              </div>
            </div>

            <div class="task-trailing">
              <button class="btn-icon" @click.stop="editTodo(todo)" title="编辑">✏️</button>
              <button class="btn-icon" @click.stop="deleteTodo(todo)" title="删除">🗑️</button>
            </div>
          </article>
        </div>
      </section>

      <aside class="todo-sidebar">
        <section class="card focus-card" v-if="selectedTodoView">
          <div class="focus-header">
            <div>
              <div class="focus-kicker">当前聚焦</div>
              <h3>{{ selectedTodoView.title }}</h3>
            </div>
            <span :class="['status-pill', selectedTodoView.completed ? 'done' : 'active']">
              {{ selectedTodoView.completed ? '已完成' : '进行中' }}
            </span>
          </div>

          <p class="focus-description">
            {{ selectedTodoView.description || '这条任务还没有补充说明，建议补充一个更明确的执行描述。' }}
          </p>

          <div class="focus-grid">
            <div class="focus-item">
              <span>优先级</span>
              <strong>{{ priorityLabel(selectedTodoView.priority) }}</strong>
            </div>
            <div class="focus-item">
              <span>提醒</span>
              <strong>{{ selectedTodoView.enabled && selectedTodoView.due ? '已开启' : '未开启' }}</strong>
            </div>
            <div class="focus-item">
              <span>截止时间</span>
              <strong>{{ selectedTodoView.due ? formatDate(selectedTodoView.due) : '未设置' }}</strong>
            </div>
            <div class="focus-item">
              <span>重复方式</span>
              <strong>{{ selectedTodoView.repeat && selectedTodoView.repeat !== 'none' ? repeatLabel(selectedTodoView.repeat) : '不重复' }}</strong>
            </div>
          </div>

          <div class="focus-actions">
            <button class="btn btn-secondary" @click="toggleTodo(selectedTodoView)">
              {{ selectedTodoView.completed ? '恢复任务' : '标记完成' }}
            </button>
            <button class="btn btn-primary" @click="editTodo(selectedTodoView)">编辑任务</button>
          </div>
        </section>

        <section v-else class="card focus-card empty-focus">
          <div class="focus-kicker">当前聚焦</div>
          <h3>还没有可查看的任务</h3>
          <p class="focus-description">创建一个任务，或者切换筛选查看现有待办。</p>
        </section>

        <section class="card side-card">
          <div class="side-card-title">即将提醒</div>
          <div v-if="upcomingReminderTodos.length === 0" class="side-empty">没有即将到来的提醒任务</div>
          <div v-else class="side-list">
            <div v-for="todo in upcomingReminderTodos" :key="todo.id" class="side-list-item" @click="selectTodo(todo.id)">
              <strong>{{ todo.title }}</strong>
              <span>{{ formatDate(todo.due) }}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <Modal v-if="showCreateModal || editingTodo" @close="closeModal">
      <template #header>{{ editingTodo ? '编辑待办' : '新建待办' }}</template>
      <div class="form-group">
        <label>标题</label>
        <input v-model="formData.title" class="input-field" placeholder="待办标题" autofocus />
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="formData.description" class="input-field" placeholder="详细描述（可选）"></textarea>
      </div>
      <div class="form-group">
        <label>优先级</label>
        <div class="priority-btns">
          <button
            v-for="p in priorities"
            :key="p.value"
            :class="['priority-btn', { active: formData.priority === p.value }]"
            @click="formData.priority = p.value"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
      <div class="form-group">
        <label>截止日期</label>
        <div class="quick-dates">
          <button
            v-for="d in quickDates"
            :key="d.label"
            :class="['date-btn', { active: formData.quickDate === d.label }]"
            @click="applyQuickDate(d)"
          >
            {{ d.label }}
          </button>
        </div>
        <input v-model="formData.due" type="datetime-local" class="input-field" />
      </div>
      <div class="form-group">
        <label>提醒</label>
        <div class="remind-row">
          <label class="toggle">
            <input type="checkbox" v-model="formData.enabled" />
            <span class="slider"></span>
          </label>
          <span class="toggle-label">{{ formData.enabled ? '开启提醒' : '关闭提醒' }}</span>
        </div>
      </div>
      <div class="form-group" v-if="formData.enabled">
        <label>重复</label>
        <div class="repeat-btns">
          <button
            v-for="r in repeatOptions"
            :key="r.value"
            :class="['repeat-btn', { active: formData.repeat === r.value }]"
            @click="formData.repeat = r.value"
          >
            {{ r.label }}
          </button>
        </div>
        <div v-if="formData.repeat === 'custom'" class="custom-days-row">
          <span class="days-label">每</span>
          <input v-model.number="formData.customDays" type="number" min="1" max="365" class="input-field days-input" />
          <span class="days-label">天</span>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveTodo">{{ editingTodo ? '保存' : '创建' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import Modal from './common/Modal.vue';

const { ipcRenderer } = require('electron');
const toast = inject<any>('toast');
const confirmDialog = inject<any>('confirm');

const todos = ref<any[]>([]);
const filter = ref('active');
const searchQuery = ref('');
const selectedTodoId = ref<string | null>(null);
const showCreateModal = ref(false);
const editingTodo = ref<any>(null);
const formData = ref({
  title: '', description: '', priority: 'normal',
  due: '', quickDate: '不限',
  enabled: false, repeat: 'none', customDays: 2,
});

const priorities = [
  { value: 'low', label: '🔽 低' },
  { value: 'normal', label: '📌 普通' },
  { value: 'high', label: '🔴 高' },
];

const filterItems = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'high', label: '高优先级' },
  { value: 'remind', label: '提醒任务' },
];

const repeatOptions = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom', label: '自定义' },
];

function getQuickDates() {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T09:00`;
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
  return [
    { label: '今天', value: fmt(now) },
    { label: '明天', value: fmt(tomorrow) },
    { label: '下周', value: fmt(nextWeek) },
    { label: '不限', value: '' },
  ];
}
const quickDates = computed(() => getQuickDates());

function applyQuickDate(d: { label: string; value: string }) {
  formData.value.quickDate = d.label;
  formData.value.due = d.value;
}

const filteredTodos = computed(() => {
  let list = [...todos.value];
  switch (filter.value) {
    case 'active': list = list.filter(t => !t.completed); break;
    case 'completed': list = list.filter(t => t.completed); break;
    case 'high': list = list.filter(t => t.priority === 'high'); break;
    case 'remind': list = list.filter(t => t.due && t.enabled && !t.completed); break;
  }

  const keyword = searchQuery.value.trim().toLowerCase();
  if (keyword) {
    list = list.filter((t) =>
      t.title.toLowerCase().includes(keyword) ||
      (t.description || '').toLowerCase().includes(keyword),
    );
  }

  return list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pOrder = { high: 0, normal: 1, low: 2 };
    return (pOrder[a.priority as keyof typeof pOrder] || 1) - (pOrder[b.priority as keyof typeof pOrder] || 1);
  });
});

const selectedTodoView = computed(() => {
  if (filteredTodos.value.length === 0) return null;
  return filteredTodos.value.find((todo) => todo.id === selectedTodoId.value) || filteredTodos.value[0];
});

const activeCount = computed(() => todos.value.filter(t => !t.completed).length);
const completedCount = computed(() => todos.value.filter(t => t.completed).length);
const remindCount = computed(() => todos.value.filter(t => t.due && t.enabled && !t.completed).length);
const completionRate = computed(() => todos.value.length ? Math.round((completedCount.value / todos.value.length) * 100) : 0);
const upcomingReminderTodos = computed(() =>
  todos.value
    .filter(t => t.due && t.enabled && !t.completed && new Date(t.due) > new Date())
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, 4),
);

function syncSelection(preferredId?: string | null) {
  const candidateId = preferredId || selectedTodoId.value;
  const exists = filteredTodos.value.find((todo) => todo.id === candidateId);
  selectedTodoId.value = exists?.id || filteredTodos.value[0]?.id || null;
}

function selectTodo(todoId: string) {
  selectedTodoId.value = todoId;
}

async function loadTodos() {
  try {
    todos.value = await ipcRenderer.invoke('todo:get-all');
    syncSelection();
  } catch (e) {
    console.error(e);
  }
}

async function toggleTodo(todo: any) {
  try {
    const updated = await ipcRenderer.invoke('todo:toggle', todo.id);
    if (updated) {
      const idx = todos.value.findIndex(t => t.id === todo.id);
      if (idx >= 0) todos.value[idx] = updated;
      syncSelection(todo.id);
    }
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

async function toggleReminderEnabled(todo: any) {
  try {
    const updated = await ipcRenderer.invoke('todo:update', todo.id, { enabled: !todo.enabled });
    if (updated) {
      const idx = todos.value.findIndex(t => t.id === todo.id);
      if (idx >= 0) todos.value[idx] = updated;
      syncSelection(todo.id);
    }
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

function openCreateModal() {
  showCreateModal.value = true;
}

function editTodo(todo: any) {
  editingTodo.value = todo;
  const repeatVal = todo.repeat || 'none';
  const isCustom = typeof repeatVal === 'number';
  formData.value = {
    title: todo.title,
    description: todo.description || '',
    priority: todo.priority,
    due: todo.due ? todo.due.slice(0, 16) : '',
    quickDate: '',
    enabled: todo.enabled,
    repeat: isCustom ? 'custom' : repeatVal,
    customDays: typeof repeatVal === 'number' ? repeatVal : 2,
  };
}

async function deleteTodo(todo: any) {
  const ok = await confirmDialog?.show('删除这条待办？', `「${todo.title}」删除后将无法恢复。`);
  if (!ok) return;
  try {
    await ipcRenderer.invoke('todo:delete', todo.id);
    todos.value = todos.value.filter(t => t.id !== todo.id);
    syncSelection();
    toast?.show('已删除', 'success');
  } catch (e) {
    toast?.show('删除失败', 'error');
  }
}

async function saveTodo() {
  if (!formData.value.title.trim()) {
    toast?.show('请输入标题', 'warning');
    return;
  }

  const repeat = formData.value.repeat === 'custom' ? formData.value.customDays : formData.value.repeat;

  try {
    if (editingTodo.value) {
      const updates: any = {
        title: formData.value.title,
        description: formData.value.description,
        priority: formData.value.priority,
        due: formData.value.due || null,
        enabled: formData.value.due ? formData.value.enabled : false,
        repeat: formData.value.due ? repeat : 'none',
      };
      const updated = await ipcRenderer.invoke('todo:update', editingTodo.value.id, updates);
      if (updated) {
        const idx = todos.value.findIndex(t => t.id === editingTodo.value.id);
        if (idx >= 0) todos.value[idx] = updated;
        syncSelection(updated.id);
      }
      toast?.show('已更新', 'success');
    } else {
      const created = await ipcRenderer.invoke('todo:create', {
        title: formData.value.title,
        description: formData.value.description,
        priority: formData.value.priority,
        due: formData.value.due || null,
        enabled: formData.value.due ? formData.value.enabled : false,
        repeat: formData.value.due ? repeat : 'none',
      });
      todos.value.unshift(created);
      syncSelection(created.id);
      toast?.show('已创建', 'success');
    }
    closeModal();
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

function closeModal() {
  showCreateModal.value = false;
  editingTodo.value = null;
  formData.value = { title: '', description: '', priority: 'normal', due: '', quickDate: '不限', enabled: false, repeat: 'none', customDays: 2 };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function priorityLabel(p: string) {
  return ({ high: '高优先级', normal: '普通', low: '低优先级' } as Record<string, string>)[p] || p;
}

function repeatLabel(r: string | number) {
  if (typeof r === 'number') return `每${r}天`;
  return ({ daily: '每天', weekly: '每周', monthly: '每月' } as Record<string, string>)[r] || r;
}

onMounted(loadTodos);
</script>

<style scoped>
.todo-panel {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.todo-header {
  margin-bottom: 0;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.todo-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 12px;
}

.summary-card {
  border-radius: 18px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card-strong {
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.94), rgba(55, 65, 81, 0.88));
  color: white;
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.summary-card-strong .summary-label,
.summary-card-strong .summary-caption {
  color: rgba(255, 255, 255, 0.72);
}

.summary-card strong {
  font-size: 30px;
  line-height: 1;
}

.summary-caption {
  font-size: 12px;
  color: var(--text-secondary);
}

.todo-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.task-board,
.todo-sidebar {
  min-width: 0;
}

.task-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-board-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.task-filter-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-chip {
  border: none;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.06);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.filter-chip.active {
  background: rgba(17, 24, 39, 0.9);
  color: white;
}

.task-search {
  width: min(280px, 100%);
}

.task-board-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.board-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.board-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.board-meta {
  display: flex;
  gap: 8px;
}

.meta-pill {
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.06);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(17, 24, 39, 0.06);
  background: rgba(255, 255, 255, 0.62);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.task-row.active {
  border-color: rgba(17, 24, 39, 0.16);
  background: rgba(255, 255, 255, 0.88);
  transform: translateY(-1px);
}

.task-row.completed {
  opacity: 0.68;
}

.check-btn {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid rgba(17, 24, 39, 0.14);
  background: white;
  color: var(--primary);
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.task-content {
  min-width: 0;
}

.task-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.task-row.completed .task-title {
  text-decoration: line-through;
}

.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-dot.high {
  background: #ef4444;
}

.priority-dot.normal {
  background: #f59e0b;
}

.priority-dot.low {
  background: #60a5fa;
}

.task-desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.task-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.06);
  font-size: 11px;
  color: var(--text-secondary);
}

.task-badge.highlight {
  background: rgba(29, 78, 216, 0.1);
  color: #1d4ed8;
}

.task-badge.priority.high {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}

.task-badge.priority.normal {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.task-badge.priority.low {
  background: rgba(96, 165, 250, 0.12);
  color: #2563eb;
}

.task-trailing {
  display: flex;
  gap: 4px;
  align-items: center;
}

.todo-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.focus-card,
.side-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.58));
}

.focus-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.focus-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.focus-header h3,
.empty-focus h3 {
  margin-top: 6px;
  font-size: 20px;
  line-height: 1.3;
  color: var(--text);
}

.status-pill {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill.active {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.status-pill.done {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.focus-description {
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.focus-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.focus-item {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.focus-item span {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.focus-item strong {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
}

.focus-actions {
  margin-top: 18px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.side-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
}

.side-empty {
  font-size: 13px;
  color: var(--text-secondary);
}

.side-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-list-item {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.side-list-item strong {
  display: block;
  font-size: 13px;
  color: var(--text);
}

.side-list-item span {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.task-empty {
  padding: 72px 20px;
}

.priority-btns,
.repeat-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.priority-btn,
.repeat-btn {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}

.priority-btn.active,
.repeat-btn.active {
  background: linear-gradient(135deg, #111827, #374151);
  color: white;
  border-color: transparent;
}

.quick-dates {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.date-btn {
  padding: 7px 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}

.date-btn.active {
  background: linear-gradient(135deg, #111827, #374151);
  color: white;
  border-color: transparent;
}

.remind-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-label,
.days-label {
  font-size: 13px;
  color: var(--text);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #d4d8e1;
  border-radius: 22px;
  transition: 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle input:checked + .slider {
  background: #111827;
}

.toggle input:checked + .slider::before {
  transform: translateX(18px);
}

.custom-days-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.days-input {
  width: 72px;
  text-align: center;
  margin-bottom: 0;
}

@media (max-width: 980px) {
  .todo-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .todo-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .page-header .actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .task-board-top,
  .task-board-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-search {
    width: 100%;
  }

  .task-row {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .task-trailing {
    grid-column: 2;
    justify-content: flex-end;
  }

  .focus-grid {
    grid-template-columns: 1fr;
  }
}
</style>
