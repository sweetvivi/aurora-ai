<script setup lang="ts">
import { RouterLink } from 'vue-router';

withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);
</script>

<template>
  <RouterLink class="brand-mark" to="/" aria-label="返回极光AI首页">
    <span class="brand-mark__symbol" aria-hidden="true">极</span>
    <span v-if="!compact" class="brand-mark__copy">
      <strong>极光AI</strong>
      <small>生产工作台</small>
    </span>
  </RouterLink>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--ink);
  text-decoration: none;
}

.brand-mark__symbol {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 7px;
  background: var(--ink);
  color: #fff;
  font-size: 17px;
  font-weight: 760;
  box-shadow: 0 8px 18px rgb(23 32 51 / 16%);
}

.brand-mark__copy {
  display: grid;
  min-width: 0;
  line-height: 1.1;
}

.brand-mark__copy strong {
  overflow: hidden;
  font-size: 15px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-mark__copy small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 620;
  letter-spacing: 0.08em;
}
</style>
