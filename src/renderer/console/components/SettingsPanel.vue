<template>
  <div class="settings-panel">
    <div class="page-header">
      <h1>⚙️ 通用设置</h1>
    </div>

    <div class="settings-tabs card">
      <div class="settings-tabs-scroll">
        <button v-for="tab in tabs" :key="tab.id" :class="['settings-tab', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
          <span class="tab-title">{{ tab.label }}</span>
          <span class="tab-hint">{{ tab.hint }}</span>
        </button>
      </div>
    </div>

    <section class="card settings-content">
      <section v-if="activeTab === 'ai'" class="settings-section">
        <h2>🤖 AI 设置</h2>
        <div class="form-grid">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="settings.ai.apiUrl" class="input-field" placeholder="https://api.openai.com/v1" />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <div class="input-with-btn">
              <input v-model="settings.ai.apiKey" :type="showKey ? 'text' : 'password'" class="input-field" placeholder="sk-..." />
              <button class="btn btn-secondary btn-sm" @click="showKey = !showKey">{{ showKey ? '🙈' : '👁️' }}</button>
            </div>
          </div>
          <div class="form-group">
            <label>模型</label>
            <div class="input-with-btn">
              <select v-model="settings.ai.model" class="input-field">
                <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
              <button class="btn btn-secondary btn-sm" @click="loadModels">🔄</button>
            </div>
          </div>
          <div class="form-group form-actions-row">
            <button class="btn btn-secondary" @click="testConnection" :disabled="testing">
              {{ testing ? '测试中...' : '🔍 测试连接' }}
            </button>
            <span v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
              {{ testResult.message }}
            </span>
          </div>
          <div class="form-group full-width">
            <label>宠物人设</label>
            <textarea v-model="settings.ai.systemPrompt" class="input-field" rows="6"></textarea>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'pet'" class="settings-section">
        <h2>🐾 外观</h2>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>模型管理</label>
            <div class="pet-model-toolbar">
              <select v-model="settings.pet.currentPet" class="input-field">
                <option v-for="p in pets" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button class="btn btn-secondary btn-sm" @click="refreshPets">🔄 刷新</button>
              <button class="btn btn-secondary btn-sm" @click="importPet">📥 导入模型</button>
            </div>
            <div v-if="currentPetInfo" class="current-pet-card">
              <div>
                <div class="current-pet-name">{{ currentPetInfo.name }}</div>
                <div class="current-pet-meta">
                  <span class="pet-meta-badge">{{ currentPetInfo.builtin ? '内置模型' : '自定义模型' }}</span>
                  <span class="pet-meta-text">ID: {{ currentPetInfo.id }}</span>
                </div>
              </div>
            </div>
            <div v-if="pets.length > 0" class="pet-library">
              <button
                v-for="pet in pets"
                :key="pet.id"
                :class="['pet-library-item', { active: settings.pet.currentPet === pet.id }]"
                @click="settings.pet.currentPet = pet.id"
              >
                <span class="pet-library-name">{{ pet.name }}</span>
                <span class="pet-library-type">{{ pet.builtin ? '内置' : '自定义' }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>宠物大小: {{ settings.pet.size }}px</label>
            <input v-model.number="settings.pet.size" type="range" min="40" max="160" class="range-input" />
          </div>
          <div class="form-group">
            <label>透明度: {{ Math.round(settings.pet.opacity * 100) }}%</label>
            <input v-model.number="settings.pet.opacity" type="range" min="0.3" max="1" step="0.05" class="range-input" />
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.pet.bubbleAutoHide" />
              气泡自动隐藏
            </label>
          </div>
          <div class="form-group">
            <label>气泡消失时间: {{ settings.pet.bubbleHideDelay / 1000 }}秒</label>
            <input v-model.number="settings.pet.bubbleHideDelay" type="range" min="2000" max="15000" step="1000" class="range-input" />
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'interaction'" class="settings-section">
        <h2>💬 宠物发话</h2>
        <div class="form-grid">
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.petChatter.clickEnabled" />
              点击宠物时主动发话
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.petChatter.idleEnabled" />
              空闲时随机发话
            </label>
          </div>
          <div class="form-group">
            <label>最短发送间隔: {{ Math.round(settings.petChatter.idleIntervalMinMs / 1000) }}秒</label>
            <input v-model.number="settings.petChatter.idleIntervalMinMs" type="range" min="5000" max="120000" step="1000" class="range-input" />
          </div>
          <div class="form-group">
            <label>最长发送间隔: {{ Math.round(settings.petChatter.idleIntervalMaxMs / 1000) }}秒</label>
            <input v-model.number="settings.petChatter.idleIntervalMaxMs" type="range" min="10000" max="180000" step="1000" class="range-input" />
          </div>
          <div class="form-group full-width">
            <label>气泡提示词</label>
            <textarea
              v-model="settings.petChatter.prompt"
              class="input-field"
              rows="6"
              placeholder="描述宠物说话风格、长度、语气、是否提醒喝水等"
            ></textarea>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'interaction'" class="settings-section section-divider">
        <h2>🏃 运动设置</h2>
        <div class="form-grid">
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.behavior.walkEnabled" />
              启用自由移动
            </label>
          </div>
          <div class="form-group">
            <label>快跑概率: {{ Math.round(settings.behavior.fastRunChance * 100) }}%</label>
            <input v-model.number="settings.behavior.fastRunChance" type="range" min="0" max="1" step="0.05" class="range-input" />
          </div>
          <div class="form-group">
            <label>最短移动间隔: {{ Math.round(settings.behavior.walkInterval[0] / 1000) }}秒</label>
            <input v-model.number="settings.behavior.walkInterval[0]" type="range" min="2000" max="30000" step="500" class="range-input" />
          </div>
          <div class="form-group">
            <label>最长移动间隔: {{ Math.round(settings.behavior.walkInterval[1] / 1000) }}秒</label>
            <input v-model.number="settings.behavior.walkInterval[1]" type="range" min="3000" max="40000" step="500" class="range-input" />
          </div>
          <div class="form-group">
            <label>最短移动距离: {{ settings.behavior.moveDistance[0] }}px</label>
            <input v-model.number="settings.behavior.moveDistance[0]" type="range" min="24" max="400" step="4" class="range-input" />
          </div>
          <div class="form-group">
            <label>最长移动距离: {{ settings.behavior.moveDistance[1] }}px</label>
            <input v-model.number="settings.behavior.moveDistance[1]" type="range" min="40" max="600" step="4" class="range-input" />
          </div>
          <div class="form-group">
            <label>慢走速度: {{ settings.behavior.slowWalkSpeed }} px/s</label>
            <input v-model.number="settings.behavior.slowWalkSpeed" type="range" min="18" max="90" step="2" class="range-input" />
          </div>
          <div class="form-group">
            <label>快跑速度: {{ settings.behavior.fastRunSpeed }} px/s</label>
            <input v-model.number="settings.behavior.fastRunSpeed" type="range" min="36" max="180" step="2" class="range-input" />
          </div>
          <div class="form-group full-width">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.behavior.movementArea.enabled" />
              限制在指定活动区域内移动
            </label>
          </div>
          <template v-if="settings.behavior.movementArea.enabled">
            <div class="form-group">
              <label>区域左边距: {{ settings.behavior.movementArea.leftPercent }}%</label>
              <input v-model.number="settings.behavior.movementArea.leftPercent" type="range" min="0" max="70" step="1" class="range-input" />
            </div>
            <div class="form-group">
              <label>区域上边距: {{ settings.behavior.movementArea.topPercent }}%</label>
              <input v-model.number="settings.behavior.movementArea.topPercent" type="range" min="0" max="70" step="1" class="range-input" />
            </div>
            <div class="form-group">
              <label>区域宽度: {{ settings.behavior.movementArea.widthPercent }}%</label>
              <input v-model.number="settings.behavior.movementArea.widthPercent" type="range" min="20" max="100" step="1" class="range-input" />
            </div>
            <div class="form-group">
              <label>区域高度: {{ settings.behavior.movementArea.heightPercent }}%</label>
              <input v-model.number="settings.behavior.movementArea.heightPercent" type="range" min="20" max="100" step="1" class="range-input" />
            </div>
          </template>
        </div>
      </section>

      <section v-if="activeTab === 'interaction'" class="settings-section section-divider">
        <h2>🔔 提醒</h2>
        <div class="form-grid">
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.reminder.soundEnabled" />
              提醒音效
            </label>
          </div>
          <div class="form-group">
            <label>通知方式</label>
            <select v-model="settings.reminder.notifyMode" class="input-field">
              <option value="bubble">仅气泡</option>
              <option value="system">仅系统通知</option>
              <option value="both">气泡 + 系统通知</option>
            </select>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'data'" class="settings-section">
        <h2>💾 数据管理</h2>
        <div class="data-counts">
          <span>💬 聊天: {{ dataCounts.messages }} 条</span>
          <span>✅ 待办: {{ dataCounts.todos }} 条</span>
          <span>📝 记事: {{ dataCounts.notes }} 条</span>
        </div>
        <div class="data-actions">
          <button class="btn btn-secondary" @click="exportData">📤 导出</button>
          <button class="btn btn-secondary" @click="importData">📥 导入</button>
          <button class="btn btn-danger" @click="clearData">⚠️ 清空</button>
        </div>
      </section>

      <section v-if="activeTab === 'data'" class="settings-section section-divider">
        <h2>ℹ️ 关于</h2>
        <p style="font-size: 14px;">Coco Pet v1.1.0</p>
        <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">AI 驱动的智能桌面宠物助手</p>
      </section>
    </section>

    <div class="save-bar">
      <button class="btn btn-primary" @click="saveSettings">💾 保存设置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject, computed } from 'vue';

const { ipcRenderer } = require('electron');
const toast = inject<any>('toast');
const confirmDialog = inject<any>('confirm');

const showKey = ref(false);
const activeTab = ref('ai');
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const models = ref<{ id: string; name: string }[]>([]);
const pets = ref<{ id: string; name: string; builtin?: boolean }[]>([]);
const dataCounts = ref({ messages: 0, todos: 0, notes: 0 });
const tabs = [
  { id: 'ai', label: 'AI 设置', hint: '模型、接口与人设' },
  { id: 'pet', label: '外观', hint: '模型、大小与气泡' },
  { id: 'interaction', label: '互动', hint: '发话、运动与提醒' },
  { id: 'data', label: '数据', hint: '导入导出与应用信息' },
];

const settings = reactive({
  ai: { apiUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', systemPrompt: '', maxHistoryLength: 20 },
  pet: { currentPet: 'honey', size: 80, opacity: 0.9, bubbleAutoHide: true, bubbleHideDelay: 5000, bubbleDefaultOpen: true },
  petChatter: {
    clickEnabled: true,
    idleEnabled: true,
    idleIntervalMinMs: 18000,
    idleIntervalMaxMs: 38000,
    prompt: '',
  },
  behavior: {
    enabled: true,
    walkEnabled: true,
    idleToSitChance: 0.3,
    sitToSleepChance: 0.2,
    walkInterval: [8000, 20000] as [number, number],
    walkDuration: [2000, 5000] as [number, number],
    moveDistance: [90, 240] as [number, number],
    slowWalkSpeed: 42,
    fastRunSpeed: 86,
    fastRunChance: 0.35,
    movementArea: {
      enabled: false,
      leftPercent: 10,
      topPercent: 12,
      widthPercent: 80,
      heightPercent: 76,
    },
  },
  reminder: { soundEnabled: true, soundFile: 'default', notifyMode: 'both' as 'bubble' | 'system' | 'both' },
  app: { startOnBoot: false, startMinimized: false },
});

const currentPetInfo = computed(() => pets.value.find((pet) => pet.id === settings.pet.currentPet) || null);

function mergeSettings(saved: any) {
  if (!saved) return;

  Object.assign(settings.ai, saved.ai || {});
  Object.assign(settings.pet, saved.pet || {});
  Object.assign(settings.petChatter, saved.petChatter || {});
  Object.assign(settings.reminder, saved.reminder || {});
  Object.assign(settings.app, saved.app || {});

  if (saved.behavior) {
    Object.assign(settings.behavior, saved.behavior);
    if (Array.isArray(saved.behavior.walkInterval)) {
      settings.behavior.walkInterval = [...saved.behavior.walkInterval] as [number, number];
    }
    if (Array.isArray(saved.behavior.walkDuration)) {
      settings.behavior.walkDuration = [...saved.behavior.walkDuration] as [number, number];
    }
    if (Array.isArray(saved.behavior.moveDistance)) {
      settings.behavior.moveDistance = [...saved.behavior.moveDistance] as [number, number];
    }
    Object.assign(settings.behavior.movementArea, saved.behavior.movementArea || {});
  }
}

async function loadSettings() {
  try {
    const saved = await ipcRenderer.invoke('settings:get-all');
    mergeSettings(saved);
    dataCounts.value = await ipcRenderer.invoke('data:counts');
    await refreshPets();
  } catch (e) { console.error(e); }
}

async function saveSettings() {
  try {
    settings.petChatter.idleIntervalMaxMs = Math.max(settings.petChatter.idleIntervalMinMs, settings.petChatter.idleIntervalMaxMs);
    settings.behavior.walkInterval[1] = Math.max(settings.behavior.walkInterval[0], settings.behavior.walkInterval[1]);
    settings.behavior.moveDistance[1] = Math.max(settings.behavior.moveDistance[0], settings.behavior.moveDistance[1]);
    settings.behavior.fastRunSpeed = Math.max(settings.behavior.slowWalkSpeed, settings.behavior.fastRunSpeed);
    settings.behavior.fastRunChance = Math.max(0, Math.min(1, settings.behavior.fastRunChance));
    settings.behavior.movementArea.leftPercent = Math.max(0, Math.min(80, settings.behavior.movementArea.leftPercent));
    settings.behavior.movementArea.topPercent = Math.max(0, Math.min(80, settings.behavior.movementArea.topPercent));
    settings.behavior.movementArea.widthPercent = Math.max(20, Math.min(100, settings.behavior.movementArea.widthPercent));
    settings.behavior.movementArea.heightPercent = Math.max(20, Math.min(100, settings.behavior.movementArea.heightPercent));
    await ipcRenderer.invoke('settings:set', 'app_settings', JSON.stringify(settings));
    toast?.show('设置已保存', 'success');
  } catch (e) { toast?.show('保存失败', 'error'); }
}

async function testConnection() {
  testing.value = true;
  testResult.value = null;
  try {
    await ipcRenderer.invoke('settings:set', 'app_settings', JSON.stringify(settings));
    testResult.value = await ipcRenderer.invoke('ai:test-connection');
  } catch (e: any) { testResult.value = { success: false, message: e.message }; }
  finally { testing.value = false; }
}

async function loadModels() {
  try {
    await ipcRenderer.invoke('settings:set', 'app_settings', JSON.stringify(settings));
    models.value = await ipcRenderer.invoke('ai:get-models');
    toast?.show(models.value.length > 0 ? `找到 ${models.value.length} 个模型` : '未找到模型', models.value.length > 0 ? 'success' : 'warning');
  } catch (e) { toast?.show('获取模型列表失败', 'error'); }
}

async function refreshPets() {
  try {
    pets.value = await ipcRenderer.invoke('pet:get-list');
  } catch (e) {
    toast?.show('加载模型列表失败', 'error');
  }
}

async function importPet() {
  try {
    const result = await ipcRenderer.invoke('pet:import');
    if (!result) {
      toast?.show('已取消导入', 'info');
      return;
    }
    if (!result.success) {
      toast?.show(result.message || '导入失败', 'error');
      return;
    }
    await refreshPets();
    if (result.pet?.id) {
      settings.pet.currentPet = result.pet.id;
    }
    toast?.show(`已导入模型：${result.pet?.name || '新模型'}`, 'success');
  } catch (e) {
    toast?.show('导入模型失败', 'error');
  }
}

async function exportData() {
  try { const r = await ipcRenderer.invoke('data:export'); toast?.show(r ? '数据已导出' : '已取消', r ? 'success' : 'info'); }
  catch (e) { toast?.show('导出失败', 'error'); }
}

async function importData() {
  try { const r = await ipcRenderer.invoke('data:import'); if (r) { toast?.show('数据已导入', 'success'); dataCounts.value = await ipcRenderer.invoke('data:counts'); } }
  catch (e) { toast?.show('导入失败', 'error'); }
}

async function clearData() {
  const ok = await confirmDialog?.show('清空全部数据？', '聊天、待办、记事和设置都会被清空，而且无法恢复。');
  if (!ok) return;
  try { await ipcRenderer.invoke('data:clear'); dataCounts.value = { messages: 0, todos: 0, notes: 0 }; toast?.show('数据已清空', 'success'); }
  catch (e) { toast?.show('清空失败', 'error'); }
}

onMounted(loadSettings);
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-width: 0;
}
.settings-tabs {
  padding: 10px;
  overflow: hidden;
}
.settings-tabs-scroll {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 2px;
}
.settings-tabs-scroll > * { flex: 0 0 auto; }
.settings-content {
  width: 100%;
  min-width: 0;
  padding: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58));
}
.settings-tab {
  border: none;
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(17,24,39,0.04);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.settings-tab.active {
  background: linear-gradient(135deg, #111827, #374151);
  color: white;
}
.tab-title {
  font-size: 14px;
}
.tab-hint {
  font-size: 11px;
  opacity: 0.75;
}
.settings-section h2 { font-size: 15px; font-weight: 700; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid rgba(17,24,39,0.06); }
.section-divider {
  margin-top: 28px;
  padding-top: 2px;
}
.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.input-with-btn { display: flex; gap: 8px; }
.input-with-btn .input-field { flex: 1; }
.pet-model-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pet-model-toolbar .input-field {
  flex: 1;
}
.current-pet-card {
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(17,24,39,0.06);
}
.current-pet-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.current-pet-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pet-meta-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(17,24,39,0.08);
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
}
.pet-meta-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.pet-library {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.pet-library-item {
  border: 1px solid rgba(17,24,39,0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.68);
  padding: 12px 14px;
  text-align: left;
}
.pet-library-item.active {
  border-color: rgba(17,24,39,0.22);
  background: rgba(17,24,39,0.06);
}
.pet-library-name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.pet-library-type {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}
.full-width {
  grid-column: 1 / -1;
}
.form-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.test-result { font-size: 13px; }
.test-result.success { color: var(--success); }
.test-result.error { color: var(--danger); }
.range-input { width: 100%; margin-top: 4px; accent-color: var(--primary); }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal; font-size: 13px; }
.checkbox-label input { width: 16px; height: 16px; accent-color: var(--primary); }
.form-group > label:not(.checkbox-label) { cursor: default; }
.data-counts { display: flex; gap: 20px; margin-bottom: 16px; font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; }
.data-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.save-bar {
  padding: 2px 0 4px;
  text-align: right;
  position: static;
}

@media (max-width: 860px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .pet-model-toolbar {
    flex-wrap: wrap;
  }

  .pet-model-toolbar .input-field {
    width: 100%;
  }

  .full-width {
    grid-column: auto;
  }

  .form-actions-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
