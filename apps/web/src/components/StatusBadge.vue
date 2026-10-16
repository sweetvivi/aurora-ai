<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'accent' | 'brand' | 'neutral' | 'warning';
  }>(),
  {
    tone: 'neutral',
  },
);
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    <slot />
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #edf0f3;
  color: #536070;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.status-badge--brand {
  background: #d9f0ec;
  color: #09665f;
}

.status-badge--accent {
  background: #fbe6df;
  color: #a63b23;
}

.status-badge--warning {
  background: #f8edd9;
  color: #8b5714;
}
</style>
