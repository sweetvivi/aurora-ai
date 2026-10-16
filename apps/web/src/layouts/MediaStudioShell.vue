<script setup lang="ts">
import { RouterView } from 'vue-router';
import AccountPill from '@/components/AccountPill.vue';
import BrandMark from '@/components/BrandMark.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import TopNavigation from '@/components/TopNavigation.vue';
</script>

<template>
  <div class="media-shell">
    <header class="media-shell__header">
      <BrandMark />
      <TopNavigation class="media-shell__navigation" />
      <div class="media-shell__actions">
        <StatusBadge tone="accent">Studio</StatusBadge>
        <AccountPill />
      </div>
    </header>

    <main class="media-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.media-shell {
  min-height: 100vh;
  background: #eef1f3;
}

.media-shell__header {
  display: grid;
  min-height: 62px;
  align-items: center;
  gap: 18px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  background: #151d2c;
}

.media-shell__header :deep(.brand-mark),
.media-shell__header :deep(.brand-mark__copy strong) {
  color: #fff;
}

.media-shell__header :deep(.brand-mark__copy small) {
  color: #9da9b9;
}

.media-shell__header :deep(.brand-mark__symbol) {
  background: #fff;
  color: #151d2c;
}

.media-shell__navigation {
  justify-self: center;
}

.media-shell__header :deep(.top-navigation__link) {
  color: #aeb8c6;
}

.media-shell__header :deep(.top-navigation__link:hover) {
  background: #253044;
  color: #fff;
}

.media-shell__header :deep(.top-navigation__link--active) {
  background: #fff;
  color: #151d2c;
}

.media-shell__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.media-shell__content {
  min-height: calc(100vh - 62px);
}

@media (max-width: 1050px) {
  .media-shell__header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .media-shell__navigation {
    order: 3;
    width: 100%;
    grid-column: 1 / -1;
    justify-self: stretch;
  }
}

@media (max-width: 640px) {
  .media-shell__header {
    padding: 10px 14px;
  }

  .media-shell__actions :deep(.status-badge) {
    display: none;
  }
}
</style>
