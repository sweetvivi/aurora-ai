<script setup lang="ts">
import {
  AppstoreOutlined,
  CommentOutlined,
  DownOutlined,
  FileTextOutlined,
  HomeOutlined,
  PictureOutlined,
  RobotOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

interface NavigationItem {
  icon: Component;
  label: string;
  to: string;
}

const route = useRoute();
const navItems: NavigationItem[] = [
  { icon: HomeOutlined, label: '首页', to: '/' },
  { icon: CommentOutlined, label: '模型对话', to: '/chat' },
  { icon: PictureOutlined, label: 'AI 绘画', to: '/draw' },
  { icon: RobotOutlined, label: '超级智能体', to: '/agents' },
  { icon: VideoCameraOutlined, label: 'AI 视频', to: '/video' },
  { icon: FileTextOutlined, label: '文档', to: '/workbench' },
  { icon: AppstoreOutlined, label: '工具地图', to: '/map' },
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
      <component :is="item.icon" />
      <span>{{ item.label }}</span>
      <DownOutlined class="top-navigation__caret" />
    </RouterLink>
  </nav>
</template>

<style scoped>
.top-navigation {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.top-navigation::-webkit-scrollbar {
  display: none;
}

.top-navigation__link {
  display: inline-flex;
  min-height: 34px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border-radius: 8px;
  color: #5c6574;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.top-navigation__link:hover {
  background: #f4f5f8;
  color: var(--ink);
}

.top-navigation__link--active {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.top-navigation__link :deep(svg) {
  width: 14px;
  height: 14px;
}

.top-navigation__caret {
  width: 9px !important;
  height: 9px !important;
  opacity: 0.55;
}
</style>
