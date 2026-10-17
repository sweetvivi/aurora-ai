import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { appRoutes } from './routes';

export const router = createRouter({
  history: createWebHistory(),
  routes: appRoutes,
  scrollBehavior: () => ({
    top: 0,
  }),
});

router.beforeEach(async (route) => {
  if (!route.meta.requiresAdmin) {
    return true;
  }

  const sessionStore = useSessionStore();
  await sessionStore.bootstrap();

  if (sessionStore.user?.role !== 'ADMIN') {
    return {
      name: 'home',
      query: {
        admin: 'required',
      },
    };
  }

  return true;
});

router.afterEach((route) => {
  document.title = route.meta.title ? `${route.meta.title} - 极光AI` : '极光AI';
});
