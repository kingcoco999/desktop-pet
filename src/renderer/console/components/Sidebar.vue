<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="logo">🐾</span>
      <span class="title">Desktop Pet</span>
    </div>
    <nav class="sidebar-nav">
      <router-link to="/overview" class="nav-item" active-class="active">
        <span class="icon">📊</span>
        <span class="label">概览</span>
      </router-link>
      <router-link to="/chat" class="nav-item" active-class="active">
        <span class="icon">💬</span>
        <span class="label">聊天</span>
      </router-link>
      <router-link to="/todos" class="nav-item" active-class="active">
        <span class="icon">✅</span>
        <span class="label">待办</span>
      </router-link>
      <router-link to="/notes" class="nav-item" active-class="active">
        <span class="icon">📒</span>
        <span class="label">记事</span>
      </router-link>
      <router-link to="/reminders" class="nav-item" active-class="active">
        <span class="icon">⏰</span>
        <span class="label">提醒</span>
      </router-link>
      <router-link to="/settings" class="nav-item" active-class="active">
        <span class="icon">⚙️</span>
        <span class="label">设置</span>
      </router-link>
    </nav>
    <div class="sidebar-footer">
      <span class="version">v1.0.0</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  -webkit-app-region: drag;
}
.sidebar-header {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.logo {
  font-size: 24px;
}
.title {
  font-size: 16px;
  font-weight: 700;
}
.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  -webkit-app-region: no-drag;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--sidebar-text);
  text-decoration: none;
  transition: background 0.2s;
  font-size: 14px;
}
.nav-item:hover {
  background: rgba(255,255,255,0.1);
}
.nav-item.active {
  background: var(--sidebar-active);
  color: white;
  font-weight: 600;
}
.icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}
.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
  text-align: center;
}
.version {
  font-size: 12px;
  opacity: 0.5;
}
</style>
