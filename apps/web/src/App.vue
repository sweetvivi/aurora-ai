<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const sessionStore = useSessionStore();

function handleExpiredSession(): void {
  sessionStore.setSessionExpired();
}

onMounted(() => {
  window.addEventListener('aurora:auth-expired', handleExpiredSession);
  void sessionStore.bootstrap();
});

onUnmounted(() => {
  window.removeEventListener('aurora:auth-expired', handleExpiredSession);
});
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="Component" :key="route.matched[0]?.path ?? route.path" />
  </RouterView>
</template>
