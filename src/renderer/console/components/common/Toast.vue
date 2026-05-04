<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="['toast-item', t.type]"
        >
          <span class="toast-icon">{{ icon(t.type) }}</span>
          <span class="toast-message">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const toasts = ref<ToastItem[]>([]);
let nextId = 0;

function show(message: string, type: string = 'info') {
  const id = nextId++;
  toasts.value.push({ id, message, type: type as ToastItem['type'] });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 3000);
}

function icon(type: string): string {
  const icons: Record<string, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };
  return icons[type] || 'ℹ️';
}

defineExpose({ show });
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  min-width: 200px;
}
.toast-item.success { border-left: 4px solid var(--success); }
.toast-item.error { border-left: 4px solid var(--danger); }
.toast-item.warning { border-left: 4px solid var(--warning); }
.toast-item.info { border-left: 4px solid var(--info); }
.toast-enter-active { animation: slide-in 0.3s ease; }
.toast-leave-active { animation: slide-out 0.3s ease; }
@keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
</style>
