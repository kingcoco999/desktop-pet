<template>
  <div class="note-panel">
    <div class="page-header">
      <h1>📝 记事本</h1>
      <div class="actions">
        <input v-model="searchQuery" class="input-field search-input" placeholder="搜索..." />
        <button class="btn btn-primary" @click="showCreateModal = true">+ 新建</button>
      </div>
    </div>

    <div class="note-workspace">
      <div class="note-main-column">
        <section class="card notes-overview">
          <div class="overview-chip">
            <span class="overview-label">全部记事</span>
            <strong>{{ notes.length }}</strong>
          </div>
          <div class="overview-chip">
            <span class="overview-label">置顶内容</span>
            <strong>{{ pinnedCount }}</strong>
          </div>
          <div class="overview-chip">
            <span class="overview-label">标签数量</span>
            <strong>{{ allTags.length }}</strong>
          </div>
          <div class="overview-chip">
            <span class="overview-label">当前筛选</span>
            <strong>{{ searchQuery || '全部' }}</strong>
          </div>
        </section>

        <section class="card notes-tags-bar">
          <div class="tags-title">常用标签</div>
          <div v-if="allTags.length === 0" class="side-empty">还没有标签</div>
          <div v-else class="tag-cloud">
            <button v-for="tag in allTags" :key="tag" class="tag-chip" @click="searchQuery = tag">{{ tag }}</button>
          </div>
        </section>

        <div v-if="filteredNotes.length === 0" class="empty-state card">
          <div class="emoji">📝</div>
          <div class="message">暂无记事</div>
          <div class="hint">创建一个新记事或通过对话让宠物帮你记录</div>
        </div>

        <div v-else class="notes-grid">
          <div v-for="note in filteredNotes" :key="note.id" class="note-card card">
            <div class="note-title">{{ note.title || makeFallbackTitle(note.content) }}</div>
            <div class="note-content">{{ note.content }}</div>
            <div class="note-tags">
              <span v-for="tag in note.tags" :key="tag" class="tag" @click="searchQuery = tag">{{ tag }}</span>
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
      </div>

      <aside class="note-side-column">
        <section class="card side-card">
          <div class="side-card-title">记录概览</div>
          <div class="note-side-stats">
            <div class="note-side-stat">
              <span>最近新增</span>
              <strong>{{ filteredNotes.slice(0, 3).length }}</strong>
            </div>
            <div class="note-side-stat">
              <span>已置顶</span>
              <strong>{{ pinnedCount }}</strong>
            </div>
          </div>
        </section>

        <section class="card side-card">
          <div class="side-card-title">标签索引</div>
          <div v-if="allTags.length === 0" class="side-empty">还没有标签</div>
          <div v-else class="side-tag-list">
            <button v-for="tag in allTags.slice(0, 12)" :key="tag" class="side-tag-chip" @click="searchQuery = tag">
              {{ tag }}
            </button>
          </div>
        </section>
      </aside>
    </div>

    <Modal v-if="showCreateModal || editingNote" @close="closeModal">
      <template #header>{{ editingNote ? '编辑记事' : '新建记事' }}</template>
      <div class="form-group">
        <label>标题</label>
        <input v-model="formData.title" class="input-field" placeholder="记事标题" autofocus />
      </div>
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
const confirmDialog = inject<any>('confirm');

const notes = ref<any[]>([]);
const searchQuery = ref('');
const showCreateModal = ref(false);
const editingNote = ref<any>(null);
const formData = ref({ title: '', content: '', tags: '' });

const allTags = computed(() => {
  const tags = new Set<string>();
  notes.value.forEach(n => n.tags?.forEach((t: string) => tags.add(t)));
  return Array.from(tags);
});

const filteredNotes = computed(() => {
  let list = [...notes.value];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags?.some((t: string) => t.toLowerCase().includes(q)),
    );
  }
  return list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

const pinnedCount = computed(() => notes.value.filter(n => n.pinned).length);

async function loadNotes() {
  try { notes.value = await ipcRenderer.invoke('note:get-all'); } catch (e) { console.error(e); }
}

function editNote(note: any) {
  editingNote.value = note;
  formData.value = { title: note.title || makeFallbackTitle(note.content), content: note.content, tags: note.tags?.join(', ') || '' };
}

async function deleteNote(note: any) {
  const ok = await confirmDialog?.show('删除这条记事？', '删除后内容将无法恢复，请确认这次操作。');
  if (!ok) return;
  try {
    await ipcRenderer.invoke('note:delete', note.id);
    notes.value = notes.value.filter(n => n.id !== note.id);
    toast?.show('已删除', 'success');
  } catch (e) { toast?.show('删除失败', 'error'); }
}

async function togglePin(note: any) {
  try {
    const updated = await ipcRenderer.invoke('note:update', note.id, { pinned: !note.pinned });
    if (updated) { const idx = notes.value.findIndex(n => n.id === note.id); if (idx >= 0) notes.value[idx] = updated; }
  } catch (e) { toast?.show('操作失败', 'error'); }
}

async function saveNote() {
  if (!formData.value.title.trim()) { toast?.show('请输入标题', 'warning'); return; }
  if (!formData.value.content.trim()) { toast?.show('请输入内容', 'warning'); return; }
  const tags = formData.value.tags.split(',').map(t => t.trim()).filter(Boolean);
  try {
    if (editingNote.value) {
      const updated = await ipcRenderer.invoke('note:update', editingNote.value.id, { title: formData.value.title, content: formData.value.content, tags });
      if (updated) { const idx = notes.value.findIndex(n => n.id === editingNote.value.id); if (idx >= 0) notes.value[idx] = updated; }
    } else {
      const created = await ipcRenderer.invoke('note:create', { title: formData.value.title, content: formData.value.content, tags });
      notes.value.unshift(created);
    }
    closeModal();
    toast?.show(editingNote.value ? '已更新' : '已创建', 'success');
  } catch (e) { toast?.show('操作失败', 'error'); }
}

function closeModal() {
  showCreateModal.value = false;
  editingNote.value = null;
  formData.value = { title: '', content: '', tags: '' };
}

function makeFallbackTitle(content: string) {
  return String(content || '').split(/\r?\n/).find(Boolean)?.slice(0, 24) || '未命名记事';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(loadNotes);
</script>

<style scoped>
.note-panel { width: 100%; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.note-workspace { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.7fr); gap: 16px; width: 100%; min-width: 0; align-items: start; }
.note-main-column, .note-side-column { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.notes-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.62)); }
.notes-tags-bar { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.62)); }
.overview-chip { padding: 14px 16px; border-radius: 18px; background: rgba(255,255,255,0.66); display: flex; flex-direction: column; gap: 8px; }
.overview-label { font-size: 12px; color: var(--text-secondary); }
.tags-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
.side-empty { font-size: 12px; color: var(--text-secondary); }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-chip { border: none; background: rgba(17,24,39,0.06); color: #374151; border-radius: 999px; padding: 7px 12px; cursor: pointer; font-size: 12px; }
.search-input { width: 220px; font-size: 12px; }
.notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.note-card { padding: 18px; display: flex; flex-direction: column; min-height: 190px; background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.56)); }
.note-title { font-size: 16px; font-weight: 800; color: var(--text); line-height: 1.35; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note-content { display: -webkit-box; font-size: 13px; line-height: 1.7; margin-bottom: 14px; white-space: pre-wrap; max-height: 68px; overflow: hidden; color: var(--text-secondary); -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.note-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.tag { display: inline-block; padding: 4px 10px; background: rgba(17,24,39,0.06); color: #374151; border-radius: 999px; font-size: 11px; cursor: pointer; transition: opacity 0.2s, background 0.2s; }
.tag:hover { opacity: 1; background: rgba(17,24,39,0.1); }
.note-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(17,24,39,0.06); }
.time { font-size: 11px; color: var(--text-secondary); }
.note-actions { display: flex; gap: 4px; }
.side-card { min-height: 180px; background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58)); }
.side-card-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; color: var(--text); }
.note-side-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.note-side-stat { padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.74); display: flex; flex-direction: column; gap: 6px; }
.note-side-stat span { font-size: 12px; color: var(--text-secondary); }
.note-side-stat strong { font-size: 22px; color: var(--text); }
.side-tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
.side-tag-chip { border: none; background: rgba(17,24,39,0.06); color: #374151; border-radius: 999px; padding: 8px 12px; cursor: pointer; font-size: 12px; }

@media (max-width: 780px) {
  .note-workspace {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: flex-start;
    gap: 12px;
  }

  .page-header .actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .notes-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-input {
    width: 100%;
  }

  .notes-tags-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .notes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
