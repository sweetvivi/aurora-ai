<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { RouterView } from 'vue-router';
import GlobalTopbar from '@/components/GlobalTopbar.vue';
import { useDiscoveryStore } from '@/stores/discovery';

const discoveryStore = useDiscoveryStore();
const { query } = storeToRefs(discoveryStore);
</script>

<template>
  <div class="discovery-shell">
    <GlobalTopbar
      v-model="query"
      :show-download="false"
      :wide-search="true"
      search-placeholder="搜索模型、智能体和全部工具"
    />

    <main class="discovery-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.discovery-shell {
  min-height: 100vh;
  background: #fff;
}

.discovery-shell__content {
  min-height: calc(100vh - 56px);
}
</style>
