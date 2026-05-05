<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" :class="['toast-item', t.type]">
          <span class="toast-icon">{{ icon(t.type) }}</span>
          <span class="toast-message">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'warning' | 'info'; }

const toasts = ref<ToastItem[]>([]);
let nextId = 0;

function show(message: string, type: string = 'info') {
  const id = nextId++;
  toasts.value.push({ id, message, type: type as ToastItem['type'] });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3000);
}

function icon(type: string): string {
  return ({ success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' } as Record<string, string>)[type] || 'ℹ️';
}

defineExpose({ show });
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 22px;
  right: 22px;
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
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
  font-size: 13px;
  min-width: 220px;
  border: 1px solid rgba(255, 255, 255, 0.82);
}
.toast-item.success { border-left: 3px solid var(--success); }
.toast-item.error { border-left: 3px solid var(--danger); }
.toast-item.warning { border-left: 3px solid var(--warning); }
.toast-item.info { border-left: 3px solid var(--info); }
.toast-enter-active { animation: slide-in 0.25s ease; }
.toast-leave-active { animation: slide-out 0.25s ease; }
@keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
</style>
