import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.js';
import './styles/main.css';

const app = createApp(App);

app.use(createPinia());

// Load the current user from the stored token before the first navigation.
useAuthStore().fetchMe();

app.use(router);
app.mount('#app');
