<template>
  <div class="settings-panel">
    <h1>⚙️ 设置</h1>

    <!-- AI Settings -->
    <section class="card">
      <h2>🤖 AI 设置</h2>
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
        <button class="btn btn-secondary" @click="testConnection" :disabled="testing">
          {{ testing ? '测试中...' : '🔍 测试连接' }}
        </button>
        <span v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
          {{ testResult.message }}
        </span>
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
      <div class="form-group">
        <label>宠物人设</label>
        <textarea v-model="settings.ai.systemPrompt" class="input-field" rows="4"></textarea>
      </div>
    </section>

    <!-- Appearance -->
    <section class="card">
      <h2>🐾 外观</h2>
      <div class="form-group">
        <label>宠物: </label>
        <select v-model="settings.pet.currentPet" class="input-field">
          <option v-for="p in pets" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
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
    </section>

    <!-- Reminder Settings -->
    <section class="card">
      <h2>🔔 提醒</h2>
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
    </section>

    <!-- Data Management -->
    <section class="card">
      <h2>💾 数据管理</h2>
      <div class="data-counts">
        <span>💬 聊天: {{ dataCounts.messages }} 条</span>
        <span>✅ 待办: {{ dataCounts.todos }} 条</span>
        <span>📒 记事: {{ dataCounts.notes }} 条</span>
        <span>⏰ 提醒: {{ dataCounts.reminders }} 条</span>
      </div>
      <div class="data-actions">
        <button class="btn btn-secondary" @click="exportData">📤 导出数据</button>
        <button class="btn btn-secondary" @click="importData">📥 导入数据</button>
        <button class="btn btn-danger" @click="clearData">⚠️ 清空所有数据</button>
      </div>
    </section>

    <!-- About -->
    <section class="card">
      <h2>ℹ️ 关于</h2>
      <p>Desktop Pet v1.0.0</p>
      <p class="about-desc">AI 驱动的智能桌面宠物助手</p>
    </section>

    <div class="save-bar">
      <button class="btn btn-primary" @click="saveSettings">💾 保存设置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject } from 'vue';

const { ipcRenderer } = require('electron');
const toast = inject<any>('toast');

const showKey = ref(false);
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const models = ref<{ id: string; name: string }[]>([]);
const pets = ref<{ id: string; name: string }[]>([]);
const dataCounts = ref({ messages: 0, todos: 0, notes: 0, reminders: 0 });

const settings = reactive({
  ai: {
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt: '',
    maxHistoryLength: 20,
  },
  pet: {
    currentPet: 'pixel-cat',
    size: 80,
    opacity: 0.9,
    bubbleAutoHide: true,
    bubbleHideDelay: 5000,
    bubbleDefaultOpen: true,
  },
  behavior: {
    enabled: true,
    walkEnabled: true,
    idleToSitChance: 0.3,
    sitToSleepChance: 0.2,
    walkInterval: [8000, 20000] as [number, number],
    walkDuration: [2000, 5000] as [number, number],
  },
  reminder: {
    soundEnabled: true,
    soundFile: 'default',
    notifyMode: 'both' as 'bubble' | 'system' | 'both',
  },
  app: {
    startOnBoot: false,
    startMinimized: false,
  },
});

async function loadSettings() {
  try {
    const saved = await ipcRenderer.invoke('settings:get-all');
    if (saved) {
      Object.assign(settings, saved);
    }
    dataCounts.value = await ipcRenderer.invoke('data:counts');
    pets.value = await ipcRenderer.invoke('pet:get-list');
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function saveSettings() {
  try {
    await ipcRenderer.invoke('settings:set', 'app_settings', JSON.stringify(settings));
    toast?.show('设置已保存', 'success');
  } catch (e) {
    toast?.show('保存失败', 'error');
  }
}

async function testConnection() {
  testing.value = true;
  testResult.value = null;
  try {
    // Save current API settings first
    await ipcRenderer.invoke('settings:set', 'app_settings', JSON.stringify(settings));
    testResult.value = await ipcRenderer.invoke('ai:test-connection');
  } catch (e: any) {
    testResult.value = { success: false, message: e.message };
  } finally {
    testing.value = false;
  }
}

async function loadModels() {
  try {
    await ipcRenderer.invoke('settings:set', 'app_settings', JSON.stringify(settings));
    models.value = await ipcRenderer.invoke('ai:get-models');
    if (models.value.length > 0) {
      toast?.show(`找到 ${models.value.length} 个模型`, 'success');
    } else {
      toast?.show('未找到模型，请检查 API 配置', 'warning');
    }
  } catch (e) {
    toast?.show('获取模型列表失败', 'error');
  }
}

async function exportData() {
  try {
    const result = await ipcRenderer.invoke('data:export');
    toast?.show(result ? '数据已导出' : '已取消', result ? 'success' : 'info');
  } catch (e) {
    toast?.show('导出失败', 'error');
  }
}

async function importData() {
  try {
    const result = await ipcRenderer.invoke('data:import');
    if (result) {
      toast?.show('数据已导入', 'success');
      dataCounts.value = await ipcRenderer.invoke('data:counts');
    }
  } catch (e) {
    toast?.show('导入失败', 'error');
  }
}

async function clearData() {
  if (!confirm('确定清空所有数据？此操作不可恢复！')) return;
  try {
    await ipcRenderer.invoke('data:clear');
    dataCounts.value = { messages: 0, todos: 0, notes: 0, reminders: 0 };
    toast?.show('数据已清空', 'success');
  } catch (e) {
    toast?.show('清空失败', 'error');
  }
}

onMounted(loadSettings);
</script>

<style scoped>
.settings-panel h1 { font-size: 24px; margin-bottom: 20px; }
.card { margin-bottom: 16px; }
.card h2 { font-size: 18px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.input-with-btn { display: flex; gap: 8px; }
.input-with-btn .input-field { flex: 1; }
.test-result { margin-left: 12px; font-size: 13px; }
.test-result.success { color: var(--success); }
.test-result.error { color: var(--danger); }
.range-input { width: 100%; margin-top: 4px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal; }
.checkbox-label input { width: 16px; height: 16px; }
.data-counts { display: flex; gap: 20px; margin-bottom: 16px; font-size: 14px; }
.data-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.about-desc { color: var(--text-secondary); margin-top: 4px; }
.save-bar { position: sticky; bottom: 0; padding: 16px 0; background: var(--bg); text-align: right; }
</style>
