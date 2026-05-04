<template>
  <div class="todo-panel">
    <div class="header">
      <h1>✅ 待办事项</h1>
      <div class="actions">
        <select v-model="filter" class="input-field filter-select">
          <option value="all">全部</option>
          <option value="active">进行中</option>
          <option value="completed">已完成</option>
          <option value="high">高优先级</option>
        </select>
        <button class="btn btn-primary" @click="showCreateModal = true">+ 新建待办</button>
      </div>
    </div>

    <div v-if="filteredTodos.length === 0" class="empty-state">
      <div class="emoji">📋</div>
      <div class="message">暂无待办事项</div>
      <div class="hint">创建一个新待办或通过对话让宠物帮你添加</div>
    </div>

    <div v-else class="todo-list">
      <div v-for="todo in filteredTodos" :key="todo.id" class="todo-item card">
        <div class="todo-main" @click="toggleTodo(todo)">
          <span :class="['checkbox', { checked: todo.completed }]">
            {{ todo.completed ? '✅' : '⬜' }}
          </span>
          <div class="todo-info">
            <span :class="['title', { done: todo.completed }]">{{ todo.title }}</span>
            <div class="todo-meta">
              <span v-if="todo.due" class="due">📅 {{ formatDate(todo.due) }}</span>
              <span :class="['priority', 'badge', priorityClass(todo.priority)]">{{ todo.priority }}</span>
              <span v-if="todo.source === 'ai'" class="badge badge-info">AI</span>
            </div>
          </div>
        </div>
        <div class="todo-actions">
          <button class="btn-icon" @click="editTodo(todo)" title="编辑">✏️</button>
          <button class="btn-icon" @click="deleteTodo(todo)" title="删除">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal v-if="showCreateModal || editingTodo" @close="closeModal">
      <template #header>{{ editingTodo ? '编辑待办' : '新建待办' }}</template>
      <div class="form-group">
        <label>标题</label>
        <input v-model="formData.title" class="input-field" placeholder="待办标题" />
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="formData.description" class="input-field" placeholder="详细描述（可选）"></textarea>
      </div>
      <div class="form-group">
        <label>优先级</label>
        <select v-model="formData.priority" class="input-field">
          <option value="low">低</option>
          <option value="normal">普通</option>
          <option value="high">高</option>
        </select>
      </div>
      <div class="form-group">
        <label>截止日期</label>
        <input v-model="formData.due" type="datetime-local" class="input-field" />
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

const todos = ref<any[]>([]);
const filter = ref('all');
const showCreateModal = ref(false);
const editingTodo = ref<any>(null);
const formData = ref({
  title: '',
  description: '',
  priority: 'normal',
  due: '',
});

const filteredTodos = computed(() => {
  let list = [...todos.value];
  switch (filter.value) {
    case 'active': list = list.filter(t => !t.completed); break;
    case 'completed': list = list.filter(t => t.completed); break;
    case 'high': list = list.filter(t => t.priority === 'high'); break;
  }
  return list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pOrder = { high: 0, normal: 1, low: 2 };
    return (pOrder[a.priority as keyof typeof pOrder] || 1) - (pOrder[b.priority as keyof typeof pOrder] || 1);
  });
});

async function loadTodos() {
  try {
    todos.value = await ipcRenderer.invoke('todo:get-all');
  } catch (e) {
    console.error('Failed to load todos:', e);
  }
}

async function toggleTodo(todo: any) {
  try {
    const updated = await ipcRenderer.invoke('todo:toggle', todo.id);
    if (updated) {
      const idx = todos.value.findIndex(t => t.id === todo.id);
      if (idx >= 0) todos.value[idx] = updated;
    }
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

function editTodo(todo: any) {
  editingTodo.value = todo;
  formData.value = {
    title: todo.title,
    description: todo.description || '',
    priority: todo.priority,
    due: todo.due ? todo.due.slice(0, 16) : '',
  };
}

async function deleteTodo(todo: any) {
  if (!confirm(`确定删除「${todo.title}」？`)) return;
  try {
    await ipcRenderer.invoke('todo:delete', todo.id);
    todos.value = todos.value.filter(t => t.id !== todo.id);
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

  try {
    if (editingTodo.value) {
      const updated = await ipcRenderer.invoke('todo:update', editingTodo.value.id, {
        title: formData.value.title,
        description: formData.value.description,
        priority: formData.value.priority,
        due: formData.value.due || null,
      });
      if (updated) {
        const idx = todos.value.findIndex(t => t.id === editingTodo.value.id);
        if (idx >= 0) todos.value[idx] = updated;
      }
    } else {
      const created = await ipcRenderer.invoke('todo:create', {
        title: formData.value.title,
        description: formData.value.description,
        priority: formData.value.priority,
        due: formData.value.due || null,
      });
      todos.value.unshift(created);
    }
    closeModal();
    toast?.show(editingTodo.value ? '已更新' : '已创建', 'success');
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

function closeModal() {
  showCreateModal.value = false;
  editingTodo.value = null;
  formData.value = { title: '', description: '', priority: 'normal', due: '' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function priorityClass(p: string): string {
  return p === 'high' ? 'badge-danger' : p === 'low' ? 'badge-info' : 'badge-warning';
}

onMounted(loadTodos);
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header h1 { font-size: 24px; }
.actions { display: flex; gap: 8px; align-items: center; }
.filter-select { width: 120px; padding: 6px 10px; }
.todo-list { display: flex; flex-direction: column; gap: 8px; }
.todo-item { display: flex; align-items: center; justify-content: space-between; }
.todo-main { display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer; }
.checkbox { font-size: 20px; }
.title { font-size: 14px; }
.title.done { text-decoration: line-through; opacity: 0.5; }
.todo-meta { display: flex; gap: 8px; margin-top: 4px; }
.due { font-size: 12px; color: var(--text-secondary); }
.todo-actions { display: flex; gap: 4px; }
</style>
