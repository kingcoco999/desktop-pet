<template>
  <div class="reminder-panel">
    <div class="header">
      <h1>⏰ 提醒</h1>
      <button class="btn btn-primary" @click="showCreateModal = true">+ 新建提醒</button>
    </div>

    <div v-if="reminders.length === 0" class="empty-state">
      <div class="emoji">⏰</div>
      <div class="message">暂无提醒</div>
      <div class="hint">创建一个新提醒或通过对话让宠物帮你设置</div>
    </div>

    <div v-else class="reminder-list">
      <div v-for="r in sortedReminders" :key="r.id" :class="['reminder-item card', { disabled: !r.enabled, expired: isExpired(r) }]">
        <div class="reminder-main">
          <div class="reminder-toggle">
            <label class="toggle">
              <input type="checkbox" :checked="r.enabled" @change="toggleReminder(r)" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="reminder-info">
            <span class="content">{{ r.content }}</span>
            <div class="reminder-meta">
              <span class="time">📅 {{ formatTime(r.time) }}</span>
              <span v-if="r.repeat !== 'none'" class="repeat badge badge-info">{{ repeatLabel(r.repeat) }}</span>
              <span v-if="r.source === 'ai'" class="badge badge-info">AI</span>
            </div>
          </div>
        </div>
        <div class="reminder-actions">
          <button class="btn-icon" @click="editReminder(r)" title="编辑">✏️</button>
          <button class="btn-icon" @click="deleteReminder(r)" title="删除">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal v-if="showCreateModal || editingReminder" @close="closeModal">
      <template #header>{{ editingReminder ? '编辑提醒' : '新建提醒' }}</template>
      <div class="form-group">
        <label>提醒内容</label>
        <input v-model="formData.content" class="input-field" placeholder="提醒内容..." />
      </div>
      <div class="form-group">
        <label>提醒时间</label>
        <input v-model="formData.time" type="datetime-local" class="input-field" />
      </div>
      <div class="form-group">
        <label>重复</label>
        <select v-model="formData.repeat" class="input-field">
          <option value="none">不重复</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveReminder">{{ editingReminder ? '保存' : '创建' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import Modal from './common/Modal.vue';

const { ipcRenderer } = require('electron');
const toast = inject<any>('toast');

const reminders = ref<any[]>([]);
const showCreateModal = ref(false);
const editingReminder = ref<any>(null);
const formData = ref({ content: '', time: '', repeat: 'none' });

const sortedReminders = computed(() => {
  return [...reminders.value].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
});

async function loadReminders() {
  try {
    reminders.value = await ipcRenderer.invoke('reminder:get-all');
  } catch (e) {
    console.error('Failed to load reminders:', e);
  }
}

function editReminder(r: any) {
  editingReminder.value = r;
  formData.value = { content: r.content, time: r.time.slice(0, 16), repeat: r.repeat };
}

async function deleteReminder(r: any) {
  if (!confirm('确定删除这条提醒？')) return;
  try {
    await ipcRenderer.invoke('reminder:delete', r.id);
    reminders.value = reminders.value.filter(item => item.id !== r.id);
    toast?.show('已删除', 'success');
  } catch (e) {
    toast?.show('删除失败', 'error');
  }
}

async function toggleReminder(r: any) {
  try {
    const updated = await ipcRenderer.invoke('reminder:toggle', r.id);
    if (updated) {
      const idx = reminders.value.findIndex(item => item.id === r.id);
      if (idx >= 0) reminders.value[idx] = updated;
    }
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

async function saveReminder() {
  if (!formData.value.content.trim() || !formData.value.time) {
    toast?.show('请填写完整信息', 'warning');
    return;
  }

  try {
    if (editingReminder.value) {
      const updated = await ipcRenderer.invoke('reminder:update', editingReminder.value.id, {
        content: formData.value.content,
        time: new Date(formData.value.time).toISOString(),
        repeat: formData.value.repeat,
      });
      if (updated) {
        const idx = reminders.value.findIndex(r => r.id === editingReminder.value.id);
        if (idx >= 0) reminders.value[idx] = updated;
      }
    } else {
      const created = await ipcRenderer.invoke('reminder:create', {
        content: formData.value.content,
        time: new Date(formData.value.time).toISOString(),
        repeat: formData.value.repeat,
      });
      reminders.value.push(created);
    }
    closeModal();
    toast?.show(editingReminder.value ? '已更新' : '已创建', 'success');
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

function closeModal() {
  showCreateModal.value = false;
  editingReminder.value = null;
  formData.value = { content: '', time: '', repeat: 'none' };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isExpired(r: any): boolean {
  return r.enabled && new Date(r.time) < new Date();
}

function repeatLabel(r: string): string {
  const labels: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月' };
  return labels[r] || r;
}

onMounted(loadReminders);
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header h1 { font-size: 24px; }
.reminder-list { display: flex; flex-direction: column; gap: 8px; }
.reminder-item { display: flex; align-items: center; justify-content: space-between; }
.reminder-item.disabled { opacity: 0.5; }
.reminder-item.expired { border-left: 3px solid var(--warning); }
.reminder-main { display: flex; align-items: center; gap: 12px; flex: 1; }
.reminder-info .content { font-size: 14px; font-weight: 500; }
.reminder-meta { display: flex; gap: 8px; margin-top: 4px; }
.time { font-size: 12px; color: var(--text-secondary); }
.reminder-actions { display: flex; gap: 4px; }

/* Toggle switch */
.toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #CCC; border-radius: 24px; transition: 0.3s; }
.slider::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .slider { background: var(--primary); }
.toggle input:checked + .slider::before { transform: translateX(20px); }
</style>
