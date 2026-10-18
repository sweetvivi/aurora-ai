<script setup lang="ts">
defineProps<{
  description: string;
  eyebrow: string;
  title: string;
}>();
</script>

<template>
  <header class="page-header">
    <div class="page-header__copy">
      <span class="muted-label">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.page-header__copy {
  max-width: 720px;
}

.page-header h1 {
  margin: 8px 0 0;
  color: var(--ink);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 780;
  letter-spacing: 0;
  line-height: 1.16;
}

.page-header p {
  max-width: 660px;
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.75;
}

.page-header__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

@media (max-width: 720px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-header__actions {
    width: 100%;
  }
}
</style>
