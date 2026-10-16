import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import { createApp } from 'vue';
import 'ant-design-vue/dist/reset.css';
import 'uno.css';
import App from './App.vue';
import { queryClient } from './app/query-client';
import { router } from './router';
import './styles/main.css';
import { VueQueryPlugin } from '@tanstack/vue-query';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, {
  queryClient,
});
app.use(Antd);

app.mount('#app');
