<script setup lang="ts">
import { RouterView } from 'vue-router';
import AccountPill from '@/components/AccountPill.vue';
import BrandMark from '@/components/BrandMark.vue';
import SystemStatus from '@/components/SystemStatus.vue';
import TopNavigation from '@/components/TopNavigation.vue';
</script>

<template>
  <div class="discovery-shell">
    <header class="discovery-shell__header">
      <BrandMark />
      <TopNavigation class="discovery-shell__navigation" />
      <div class="discovery-shell__actions">
        <SystemStatus />
        <AccountPill />
      </div>
    </header>

    <main class="discovery-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.discovery-shell {
  min-height: 100vh;
  background:
    linear-gradient(90deg, rgb(15 118 110 / 4%) 1px, transparent 1px),
    linear-gradient(rgb(15 118 110 / 4%) 1px, transparent 1px), var(--surface);
  background-size: 28px 28px;
}

.discovery-shell__header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  min-height: 66px;
  align-items: center;
  gap: 22px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 10px 24px;
  border-bottom: 1px solid var(--line);
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(14px);
}

.discovery-shell__navigation {
  justify-self: center;
}

.discovery-shell__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.discovery-shell__content {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: 38px 24px 48px;
}

@media (max-width: 1050px) {
  .discovery-shell__header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .discovery-shell__navigation {
    order: 3;
    width: 100%;
    grid-column: 1 / -1;
    justify-self: stretch;
  }

  .discovery-shell__actions {
    justify-self: end;
  }
}

@media (max-width: 640px) {
  .discovery-shell__header {
    padding: 10px 14px;
  }

  .discovery-shell__content {
    padding: 26px 14px 38px;
  }
}
</style>
