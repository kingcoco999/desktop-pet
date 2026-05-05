<template>
  <aside :class="['sidebar glass-panel', { collapsed }]">
    <div class="sidebar-header">
      <button class="toggle-btn" @click="$emit('toggle')">
        <span class="hamburger" :class="{ open: !collapsed }">
          <span></span><span></span><span></span>
        </span>
      </button>
      <transition name="fade">
        <span v-if="!collapsed" class="title">Coco Pet</span>
      </transition>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        active-class="active"
      >
        <span class="icon">{{ item.icon }}</span>
        <transition name="fade">
          <span v-if="!collapsed" class="label">{{ item.label }}</span>
        </transition>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <transition name="fade">
        <span v-if="!collapsed" class="version">v1.1.0</span>
      </transition>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  collapsed: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const navItems = [
  { path: '/overview', icon: '🏠', label: '中控台' },
  { path: '/chat', icon: '💬', label: 'AI 聊天' },
  { path: '/todos', icon: '☑️', label: '待办' },
  { path: '/notes', icon: '📝', label: '记事' },
  { path: '/settings', icon: '⚙️', label: '通用设置' },
];
</script>

<style scoped>
.sidebar {
  width: 200px;
  min-width: 200px;
  background: var(--sidebar-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-right: 1px solid rgba(255, 255, 255, 0.65);
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: no-drag;
  overflow: hidden;
  margin: 18px 0 18px 18px;
  border-radius: 28px;
  box-shadow: var(--shadow);
}

.sidebar.collapsed {
  width: 60px;
  min-width: 60px;
}

.sidebar-header {
  padding: 20px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(17, 24, 39, 0.06);
  min-height: 64px;
  -webkit-app-region: no-drag;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}
.toggle-btn:hover {
  background: rgba(17, 24, 39, 0.05);
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 18px;
}
.hamburger span {
  display: block;
  height: 2px;
  background: #0f172a;
  border-radius: 2px;
  transition: all 0.25s ease;
}
.hamburger.open span:nth-child(1) {
  transform: rotate(45deg) translate(4px, 4px);
}
.hamburger.open span:nth-child(2) {
  opacity: 0;
}
.hamburger.open span:nth-child(3) {
  transform: rotate(-45deg) translate(4px, -4px);
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 18px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.75);
  color: var(--text);
}
.nav-item.active {
  background: rgba(17, 24, 39, 0.06);
  color: var(--text);
  font-weight: 700;
}

.icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
  text-align: center;
  -webkit-app-region: no-drag;
}
.version {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.5;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
