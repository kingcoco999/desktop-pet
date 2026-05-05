import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';

// Import styles
import './styles/main.css';

// Router
const routes = [
  { path: '/', redirect: '/overview' },
  { path: '/overview', component: () => import('./components/OverviewPanel.vue') },
  { path: '/chat', component: () => import('./components/ChatPanel.vue') },
  { path: '/todos', component: () => import('./components/TodoPanel.vue') },
  { path: '/notes', component: () => import('./components/NotePanel.vue') },
  { path: '/settings', component: () => import('./components/SettingsPanel.vue') },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
