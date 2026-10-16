import { createRouter, createWebHistory } from 'vue-router';
import { appRoutes } from './routes';

export const router = createRouter({
  history: createWebHistory(),
  routes: appRoutes,
  scrollBehavior: () => ({
    top: 0,
  }),
});

router.afterEach((route) => {
  document.title = route.meta.title ? `${route.meta.title} - 极光AI` : '极光AI';
});
