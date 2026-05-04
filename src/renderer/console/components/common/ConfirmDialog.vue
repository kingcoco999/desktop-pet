<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="cancel">
      <div class="confirm-container">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
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
  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}

function confirm() {
  visible.value = false;
  resolvePromise?.(true);
}

function cancel() {
  visible.value = false;
  resolvePromise?.(false);
}

defineExpose({ show });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}
.confirm-container {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 380px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.confirm-container h3 {
  margin-bottom: 8px;
  font-size: 18px;
}
.confirm-container p {
  color: var(--text-secondary);
  margin-bottom: 20px;
  font-size: 14px;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
