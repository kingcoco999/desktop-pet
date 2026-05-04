<template>
  <div class="app-layout">
    <Sidebar />
    <main class="main-content">
      <router-view />
    </main>
    <Toast ref="toastRef" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Toast from './components/common/Toast.vue';
import ConfirmDialog from './components/common/ConfirmDialog.vue';

const toastRef = ref();
const confirmRef = ref();

provide('toast', {
  show: (message: string, type?: string) => toastRef.value?.show(message, type),
});

provide('confirm', {
  show: (title: string, message: string) => confirmRef.value?.show(title, message),
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg);
}
</style>
