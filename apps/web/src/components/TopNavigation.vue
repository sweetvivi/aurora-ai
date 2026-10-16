<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { label: '首页', to: '/' },
  { label: '对话', to: '/chat' },
  { label: '工具地图', to: '/map' },
  { label: '绘画', to: '/draw' },
  { label: '媒体', to: '/studio' },
  { label: '文档工作台', to: '/workbench' },
  { label: '兼容工具', to: '/legacy' },
];

const activePath = computed(() => route.path);
</script>

<template>
  <nav class="top-navigation" aria-label="主导航">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="top-navigation__link"
      :class="{ 'top-navigation__link--active': activePath === item.to }"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.top-navigation {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.top-navigation::-webkit-scrollbar {
  display: none;
}

.top-navigation__link {
  flex: 0 0 auto;
  padding: 7px 10px;
  border-radius: 5px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.top-navigation__link:hover {
  background: #eef2f4;
  color: var(--ink);
}

.top-navigation__link--active {
  background: var(--ink);
  color: #fff;
}
</style>
