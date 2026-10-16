<script setup lang="ts">
import { RouterView } from 'vue-router';
import AccountPill from '@/components/AccountPill.vue';
import BrandMark from '@/components/BrandMark.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import TopNavigation from '@/components/TopNavigation.vue';
</script>

<template>
  <div class="legacy-shell">
    <header class="legacy-shell__header">
      <BrandMark />
      <TopNavigation class="legacy-shell__navigation" />
      <div class="legacy-shell__actions">
        <StatusBadge tone="warning">兼容模式</StatusBadge>
        <AccountPill />
      </div>
    </header>

    <main class="legacy-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.legacy-shell {
  min-height: 100vh;
  background: #f7f5f0;
}

.legacy-shell__header {
  display: grid;
  min-height: 64px;
  align-items: center;
  gap: 18px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 10px 22px;
  border-bottom: 1px solid #ddd7ca;
  background: #fffdf8;
}

.legacy-shell__navigation {
  justify-self: center;
}

.legacy-shell__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legacy-shell__content {
  width: min(100%, 1280px);
  margin: 0 auto;
  padding: 34px 22px 48px;
}

@media (max-width: 1050px) {
  .legacy-shell__header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .legacy-shell__navigation {
    order: 3;
    width: 100%;
    grid-column: 1 / -1;
    justify-self: stretch;
  }
}

@media (max-width: 640px) {
  .legacy-shell__header {
    padding: 10px 14px;
  }

  .legacy-shell__actions :deep(.status-badge) {
    display: none;
  }
}
</style>
