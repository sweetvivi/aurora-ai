<script setup lang="ts">
import { computed } from 'vue';
import { RouterView } from 'vue-router';
import { useRoute } from 'vue-router';
import GlobalTopbar from '@/components/GlobalTopbar.vue';

const route = useRoute();
const shellTheme = computed(() =>
  route.path.startsWith('/agents') ? 'theme-blue' : 'theme-purple',
);
</script>

<template>
  <div class="media-shell" :class="shellTheme">
    <GlobalTopbar />
    <main class="media-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.media-shell {
  min-height: 100vh;
  background: #fafbfc;
}

.media-shell__content {
  min-height: calc(100vh - 56px);
}
</style>
