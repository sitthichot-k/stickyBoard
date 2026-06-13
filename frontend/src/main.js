import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router); // the router guard loads the current user before the first route
app.mount('#app');
