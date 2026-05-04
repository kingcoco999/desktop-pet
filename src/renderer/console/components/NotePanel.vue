<template>
  <div class="note-panel">
    <div class="header">
      <h1>📒 记事本</h1>
      <div class="actions">
        <input v-model="searchQuery" class="input-field search-input" placeholder="搜索记事..." />
        <select v-model="tagFilter" class="input-field filter-select">
          <option value="">所有标签</option>
          <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
        <button class="btn btn-primary" @click="showCreateModal = true">+ 新建记事</button>
      </div>
    </div>

    <div v-if="filteredNotes.length === 0" class="empty-state">
      <div class="emoji">📒</div>
      <div class="message">暂无记事</div>
      <div class="hint">创建一个新记事或通过对话让宠物帮你记录</div>
    </div>

    <div v-else class="notes-grid">
      <div v-for="note in filteredNotes" :key="note.id" class="note-card card">
        <div class="note-content">{{ note.content }}</div>
        <div class="note-tags">
          <span v-for="tag in note.tags" :key="tag" class="tag" @click="tagFilter = tag">{{ tag }}</span>
        </div>
        <div class="note-footer">
          <span class="time">{{ formatDate(note.createdAt) }}</span>
          <div class="note-actions">
            <button class="btn-icon" @click="togglePin(note)" :title="note.pinned ? '取消置顶' : '置顶'">
              {{ note.pinned ? '📌' : '📍' }}
            </button>
            <button class="btn-icon" @click="editNote(note)" title="编辑">✏️</button>
            <button class="btn-icon" @click="deleteNote(note)" title="删除">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal v-if="showCreateModal || editingNote" @close="closeModal">
      <template #header>{{ editingNote ? '编辑记事' : '新建记事' }}</template>
      <div class="form-group">
        <label>内容</label>
        <textarea v-model="formData.content" class="input-field" rows="5" placeholder="记事内容..."></textarea>
      </div>
      <div class="form-group">
        <label>标签（逗号分隔）</label>
        <input v-model="formData.tags" class="input-field" placeholder="标签1, 标签2" />
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveNote">{{ editingNote ? '保存' : '创建' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import Modal from './common/Modal.vue';

const { ipcRenderer } = require('electron');
const toast = inject<any>('toast');

const notes = ref<any[]>([]);
const searchQuery = ref('');
const tagFilter = ref('');
const showCreateModal = ref(false);
const editingNote = ref<any>(null);
const formData = ref({ content: '', tags: '' });

const allTags = computed(() => {
  const tags = new Set<string>();
  notes.value.forEach(n => n.tags?.forEach((t: string) => tags.add(t)));
  return Array.from(tags);
});

const filteredNotes = computed(() => {
  let list = [...notes.value];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(n => n.content.toLowerCase().includes(q));
  }
  if (tagFilter.value) {
    list = list.filter(n => n.tags?.includes(tagFilter.value));
  }
  return list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

async function loadNotes() {
  try {
    notes.value = await ipcRenderer.invoke('note:get-all');
  } catch (e) {
    console.error('Failed to load notes:', e);
  }
}

function editNote(note: any) {
  editingNote.value = note;
  formData.value = { content: note.content, tags: note.tags?.join(', ') || '' };
}

async function deleteNote(note: any) {
  if (!confirm('确定删除这条记事？')) return;
  try {
    await ipcRenderer.invoke('note:delete', note.id);
    notes.value = notes.value.filter(n => n.id !== note.id);
    toast?.show('已删除', 'success');
  } catch (e) {
    toast?.show('删除失败', 'error');
  }
}

async function togglePin(note: any) {
  try {
    const updated = await ipcRenderer.invoke('note:update', note.id, { pinned: !note.pinned });
    if (updated) {
      const idx = notes.value.findIndex(n => n.id === note.id);
      if (idx >= 0) notes.value[idx] = updated;
    }
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

async function saveNote() {
  if (!formData.value.content.trim()) {
    toast?.show('请输入内容', 'warning');
    return;
  }

  const tags = formData.value.tags.split(',').map(t => t.trim()).filter(Boolean);

  try {
    if (editingNote.value) {
      const updated = await ipcRenderer.invoke('note:update', editingNote.value.id, {
        content: formData.value.content,
        tags,
      });
      if (updated) {
        const idx = notes.value.findIndex(n => n.id === editingNote.value.id);
        if (idx >= 0) notes.value[idx] = updated;
      }
    } else {
      const created = await ipcRenderer.invoke('note:create', {
        content: formData.value.content,
        tags,
      });
      notes.value.unshift(created);
    }
    closeModal();
    toast?.show(editingNote.value ? '已更新' : '已创建', 'success');
  } catch (e) {
    toast?.show('操作失败', 'error');
  }
}

function closeModal() {
  showCreateModal.value = false;
  editingNote.value = null;
  formData.value = { content: '', tags: '' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(loadNotes);
</script>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.header h1 { font-size: 24px; }
.actions { display: flex; gap: 8px; align-items: center; }
.search-input { width: 200px; }
.filter-select { width: 120px; padding: 6px 10px; }
.notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.note-card { position: relative; }
.note-content { font-size: 14px; line-height: 1.6; margin-bottom: 10px; white-space: pre-wrap; max-height: 120px; overflow: hidden; }
.note-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.tag { display: inline-block; padding: 2px 8px; background: var(--primary-light); color: var(--primary-dark); border-radius: 10px; font-size: 11px; cursor: pointer; }
.tag:hover { opacity: 0.8; }
.note-footer { display: flex; justify-content: space-between; align-items: center; }
.time { font-size: 11px; color: var(--text-secondary); }
.note-actions { display: flex; gap: 2px; }
</style>
