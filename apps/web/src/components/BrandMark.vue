<script setup lang="ts">
import { RouterLink } from 'vue-router';

withDefaults(
  defineProps<{
    compact?: boolean;
    inverse?: boolean;
  }>(),
  {
    compact: false,
    inverse: false,
  },
);
</script>

<template>
  <RouterLink
    class="brand-mark"
    :class="{ 'brand-mark--compact': compact, 'brand-mark--inverse': inverse }"
    to="/"
    aria-label="返回极光AI首页"
  >
    <span class="brand-mark__symbol" aria-hidden="true">
      <span class="brand-mark__orbit" />
      <span class="brand-mark__spark">A</span>
    </span>
    <span v-if="!compact" class="brand-mark__copy">
      <strong>极光AI</strong>
      <small>创作平台</small>
    </span>
  </RouterLink>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  color: var(--ink);
  text-decoration: none;
}

.brand-mark__symbol {
  position: relative;
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  overflow: hidden;
  border-radius: 10px;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 28%), transparent 45%),
    linear-gradient(135deg, #9b7cff, #6040e7 70%);
  color: #fff;
  box-shadow: 0 6px 16px rgb(119 88 244 / 30%);
}

.brand-mark__orbit {
  position: absolute;
  width: 24px;
  height: 10px;
  border: 1.5px solid rgb(255 255 255 / 70%);
  border-radius: 50%;
  transform: rotate(-28deg);
}

.brand-mark__orbit::after {
  position: absolute;
  top: -2px;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #fff;
  content: '';
}

.brand-mark__spark {
  position: relative;
  z-index: 1;
  margin-top: 1px;
  font-size: 15px;
  font-weight: 850;
  line-height: 1;
}

.brand-mark__copy {
  display: grid;
  min-width: 0;
  line-height: 1.05;
}

.brand-mark__copy strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-mark__copy small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.12em;
}

.brand-mark--compact .brand-mark__symbol {
  width: 30px;
  height: 30px;
  flex-basis: 30px;
  border-radius: 8px;
}

.brand-mark--inverse .brand-mark__copy strong {
  color: #fff;
}

.brand-mark--inverse .brand-mark__copy small {
  color: rgb(255 255 255 / 58%);
}
</style>
