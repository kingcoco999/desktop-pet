<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="cancel">
      <div class="confirm-container">
        <div class="confirm-icon-wrap">
          <div class="confirm-icon">!</div>
        </div>
        <div class="confirm-copy">
          <span class="confirm-kicker">请确认操作</span>
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="cancel">取消</button>
          <button class="btn btn-danger" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);
const title = ref('');
const message = ref('');
let resolvePromise: ((value: boolean) => void) | null = null;

function show(t: string, m: string): Promise<boolean> {
  title.value = t;
  message.value = m;
  visible.value = true;
  return new Promise((resolve) => { resolvePromise = resolve; });
}

function confirm() { visible.value = false; resolvePromise?.(true); }
function cancel() { visible.value = false; resolvePromise?.(false); }

defineExpose({ show });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  pointer-events: none;
}
.confirm-container {
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 30px;
  padding: 28px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.16);
  animation: confirm-pop 0.18s ease;
  pointer-events: auto;
}
.confirm-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}
.confirm-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(251, 191, 36, 0.18));
  color: #b91c1c;
  font-size: 24px;
  font-weight: 800;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
.confirm-copy {
  text-align: center;
}
.confirm-kicker {
  display: inline-block;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.confirm-container h3 {
  margin-bottom: 8px;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--text);
}
.confirm-container p {
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-size: 14px;
  line-height: 1.7;
}
.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}
@keyframes confirm-pop {
  from { transform: translateY(10px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
</style>
