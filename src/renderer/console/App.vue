<template>
  <div class="console-shell">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="ambient ambient-three"></div>
    <div class="app-layout" :style="layoutVars">
      <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
      <main class="main-content">
        <div class="content-scroll">
          <router-view v-slot="{ Component }">
            <div class="page-host">
              <component :is="Component" class="page-view" />
            </div>
          </router-view>
        </div>
      </main>
      <Toast ref="toastRef" />
      <ConfirmDialog ref="confirmRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, computed } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Toast from './components/common/Toast.vue';
import ConfirmDialog from './components/common/ConfirmDialog.vue';

const sidebarCollapsed = ref(false);
const toastRef = ref();
const confirmRef = ref();

const layoutVars = computed(() => ({
  '--sidebar-width': sidebarCollapsed.value ? '78px' : '218px',
}));

provide('toast', {
  show: (message: string, type?: string) => toastRef.value?.show(message, type),
});

provide('confirm', {
  show: (title: string, message: string) => confirmRef.value?.show(title, message),
});
</script>

<style scoped>
.console-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.ambient {
  position: absolute;
  border-radius: 999px;
  filter: blur(12px);
  opacity: 0.75;
  pointer-events: none;
}

.ambient-one {
  width: 420px;
  height: 420px;
  top: -120px;
  right: -80px;
  background: radial-gradient(circle, rgba(255, 213, 220, 0.8) 0%, rgba(255, 213, 220, 0) 68%);
}

.ambient-two {
  width: 360px;
  height: 360px;
  bottom: -140px;
  left: -60px;
  background: radial-gradient(circle, rgba(196, 221, 255, 0.75) 0%, rgba(196, 221, 255, 0) 70%);
}

.ambient-three {
  width: 280px;
  height: 280px;
  top: 34%;
  left: 42%;
  background: radial-gradient(circle, rgba(236, 244, 214, 0.65) 0%, rgba(236, 244, 214, 0) 72%);
}

.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
  z-index: 1;
  min-width: 0;
}

.main-content {
  flex: 0 0 calc(100vw - var(--sidebar-width) - 26px);
  width: calc(100vw - var(--sidebar-width) - 26px);
  max-width: calc(100vw - var(--sidebar-width) - 26px);
  overflow: hidden;
  padding: 18px 18px 18px 8px;
  background: transparent;
  min-width: 0;
  min-height: 0;
}

.content-scroll {
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 6px 24px;
  box-sizing: border-box;
}

.page-host {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
}

.page-view {
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
</style>
