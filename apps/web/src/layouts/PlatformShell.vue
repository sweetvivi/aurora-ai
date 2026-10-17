<script setup lang="ts">
import {
  ArrowRightOutlined,
  CommentOutlined,
  GiftOutlined,
  HomeOutlined,
  PictureOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import type { Component } from 'vue';
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import GlobalTopbar from '@/components/GlobalTopbar.vue';
import {
  resolveModuleIcon,
  useModuleCatalogStore,
  type ModuleCatalogItem,
} from '@/stores/module-catalog';
import { useSessionStore } from '@/stores/session';

interface NavigationItem {
  badge?: string;
  icon: Component;
  label: string;
  to: string;
}

interface NavigationGroup {
  items: NavigationItem[];
  label?: string;
}

const route = useRoute();
const sessionStore = useSessionStore();
const moduleCatalogStore = useModuleCatalogStore();
const { user } = storeToRefs(sessionStore);
const { catalogItems } = storeToRefs(moduleCatalogStore);

const mobileModuleKeys = ['home', 'chat', 'draw', 'agents', 'map'];
const navigationGroups = computed<NavigationGroup[]>(() => [
  {
    items: catalogItems.value.filter((item) => item.group === 'primary').map(toNavigationItem),
  },
  {
    label: '创作与办公',
    items: catalogItems.value
      .filter((item) => item.group === 'creation-office')
      .map(toNavigationItem),
  },
]);
const mobileNavigation = computed<NavigationItem[]>(() => {
  const itemsByKey = new Map(catalogItems.value.map((item) => [item.key, item]));
  const preferred = mobileModuleKeys
    .map((key) => itemsByKey.get(key))
    .filter((item): item is ModuleCatalogItem => Boolean(item));
  const preferredKeys = new Set(preferred.map((item) => item.key));
  const remaining = catalogItems.value.filter((item) => !preferredKeys.has(item.key));

  return [...preferred, ...remaining].slice(0, 5).map(toNavigationItem);
});

const currentTitle = computed(() => String(route.meta.title ?? '工作台'));
const isAdmin = computed(() => user.value?.role === 'ADMIN');
const showCampaign = computed(() => ['/', '/draw', '/agents'].includes(route.path));
const pageTheme = computed(() => {
  if (route.path.startsWith('/chat')) {
    return 'theme-blue';
  }

  if (route.path.startsWith('/agents')) {
    return 'theme-green';
  }

  return 'theme-purple';
});

function isActivePath(path: string, target: string): boolean {
  if (target === '/') {
    return path === '/';
  }

  return path === target || path.startsWith(`${target}/`);
}

function toNavigationItem(item: ModuleCatalogItem): NavigationItem {
  return {
    badge: item.badge ?? undefined,
    icon: resolveModuleIcon(item.icon),
    label: item.name,
    to: item.route,
  };
}

function isStandaloneNavigation(target: string): boolean {
  return target === '/video';
}

onMounted(() => {
  void moduleCatalogStore.load();
});
</script>

<template>
  <div class="platform-shell" :class="pageTheme">
    <section v-if="showCampaign" class="platform-campaign" aria-label="创作活动">
      <span class="platform-campaign__badge">
        <GiftOutlined />
        极光创作季
      </span>
      <strong>会员权益限时开放</strong>
      <p>模型、绘画、文档与智能体工具统一接入</p>
      <RouterLink to="/map">
        查看权益
        <ArrowRightOutlined />
      </RouterLink>
      <i class="platform-campaign__shape platform-campaign__shape--left" aria-hidden="true" />
      <i class="platform-campaign__shape platform-campaign__shape--right" aria-hidden="true" />
    </section>

    <GlobalTopbar dark-brand />

    <div class="platform-shell__body">
      <aside class="platform-sidebar">
        <nav class="platform-sidebar__navigation" aria-label="平台导航">
          <section
            v-for="group in navigationGroups"
            v-show="group.items.length > 0"
            :key="group.label ?? 'primary'"
          >
            <span v-if="group.label" class="platform-sidebar__group-label">
              {{ group.label }}
            </span>
            <RouterLink
              v-for="item in group.items"
              :key="`${group.label}-${item.to}-${item.label}`"
              :to="item.to"
              :rel="isStandaloneNavigation(item.to) ? 'noopener noreferrer' : undefined"
              :target="isStandaloneNavigation(item.to) ? '_blank' : undefined"
              class="platform-sidebar__link"
              :class="{ 'platform-sidebar__link--active': isActivePath(route.path, item.to) }"
            >
              <component :is="item.icon" class="platform-sidebar__icon" />
              <span class="platform-sidebar__label">{{ item.label }}</span>
              <span v-if="item.badge" class="platform-sidebar__badge">{{ item.badge }}</span>
            </RouterLink>
          </section>
          <section v-if="isAdmin">
            <span class="platform-sidebar__group-label">系统管理</span>
            <RouterLink
              to="/admin"
              class="platform-sidebar__link"
              :class="{ 'platform-sidebar__link--active': isActivePath(route.path, '/admin') }"
            >
              <SettingOutlined class="platform-sidebar__icon" />
              <span class="platform-sidebar__label">管理后台</span>
            </RouterLink>
          </section>
        </nav>

        <div class="platform-sidebar__footer">
          <button type="button">
            <SettingOutlined />
            <span>设置与帮助</span>
          </button>
        </div>
      </aside>

      <main class="platform-content">
        <div class="platform-content__crumb">
          <span>{{ currentTitle }}</span>
          <span class="platform-content__crumb-mark" aria-hidden="true" />
        </div>
        <RouterView />
      </main>
    </div>

    <nav class="mobile-navigation" aria-label="移动端主导航">
      <RouterLink
        v-for="item in mobileNavigation"
        :key="`mobile-${item.to}-${item.label}`"
        :to="item.to"
        :rel="isStandaloneNavigation(item.to) ? 'noopener noreferrer' : undefined"
        :target="isStandaloneNavigation(item.to) ? '_blank' : undefined"
        :class="{ active: isActivePath(route.path, item.to) }"
      >
        <component :is="item.icon" />
        <small>{{ item.label }}</small>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.platform-shell {
  --nav-accent: #9a7cff;
  --nav-active-bg: #25233b;
  min-height: 100vh;
  background: #fff;
}

.platform-campaign {
  position: relative;
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 13px;
  overflow: hidden;
  padding: 0 56px;
  background: #172033;
  color: #fff;
}

.platform-campaign__badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  height: 25px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border-radius: 999px;
  background: #e95b48;
  color: #fff;
  font-size: 9px;
  font-weight: 820;
  letter-spacing: 0.04em;
}

.platform-campaign strong,
.platform-campaign p,
.platform-campaign a {
  position: relative;
  z-index: 1;
}

.platform-campaign strong {
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.platform-campaign p {
  margin: 0;
  color: #aab4c5;
  font-size: 10px;
}

.platform-campaign a {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 5px;
  margin-left: 4px;
  padding: 0 11px;
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 7px;
  background: rgb(255 255 255 / 8%);
  color: #fff;
  font-size: 9px;
  font-weight: 750;
  text-decoration: none;
}

.platform-campaign__shape {
  position: absolute;
  display: block;
  width: 240px;
  height: 44px;
  transform: skewX(-25deg);
  opacity: 0.95;
}

.platform-campaign__shape--left {
  left: -54px;
  background: #e95b48;
}

.platform-campaign__shape--right {
  right: -42px;
  background: #2e9970;
}

.platform-shell.theme-blue {
  --nav-accent: #67a2ff;
  --nav-active-bg: #202d44;
}

.platform-shell.theme-green {
  --nav-accent: #43c98b;
  --nav-active-bg: #1d332b;
}

.platform-shell__body {
  display: grid;
  min-height: calc(100vh - 56px);
  grid-template-columns: 240px minmax(0, 1fr);
}

.platform-sidebar {
  position: sticky;
  top: 56px;
  z-index: 20;
  display: flex;
  height: calc(100vh - 56px);
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid #262c37;
  background: #141922;
  scrollbar-width: thin;
}

.platform-sidebar__navigation {
  display: grid;
  gap: 18px;
  padding: 16px 12px;
}

.platform-sidebar__navigation section {
  display: grid;
  gap: 4px;
}

.platform-sidebar__group-label {
  padding: 0 11px 8px;
  color: #737d8c;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.platform-sidebar__link {
  position: relative;
  display: grid;
  min-height: 42px;
  align-items: center;
  gap: 9px;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  padding: 0 11px;
  border-radius: 8px;
  color: #aeb7c5;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.platform-sidebar__link:hover {
  background: #202631;
  color: #fff;
}

.platform-sidebar__link--active {
  background: var(--nav-active-bg);
  color: #fff;
  box-shadow: inset 3px 0 0 var(--nav-accent);
}

.platform-sidebar__link--active :deep(svg) {
  color: var(--nav-accent);
}

.platform-sidebar__icon {
  width: 17px;
  height: 17px;
  color: currentColor;
}

.platform-sidebar__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.platform-sidebar__badge {
  padding: 1px 5px;
  border-radius: 4px;
  background: #262d39;
  color: #8b95a5;
  font-size: 8px;
  font-weight: 750;
}

.platform-sidebar__link--active .platform-sidebar__badge {
  background: rgb(255 255 255 / 12%);
  color: currentColor;
}

.platform-sidebar__footer {
  margin-top: auto;
  padding: 10px;
  border-top: 1px solid #262c37;
}

.platform-sidebar__footer button {
  display: flex;
  width: 100%;
  height: 38px;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #aeb7c5;
  font-size: 12px;
  cursor: pointer;
}

.platform-sidebar__footer button:hover {
  background: #202631;
  color: #fff;
}

.platform-content {
  min-width: 0;
  background: #fff;
}

.platform-content__crumb {
  display: none;
}

.mobile-navigation {
  display: none;
}

@media (max-width: 860px) {
  .platform-campaign {
    min-height: 40px;
    gap: 7px;
    padding: 0 38px;
  }

  .platform-campaign__badge {
    height: 22px;
    padding: 0 7px;
    font-size: 8px;
  }

  .platform-campaign strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .platform-campaign p {
    display: none;
  }

  .platform-campaign a {
    display: none;
  }

  .platform-campaign__shape {
    width: 120px;
  }

  .platform-shell__body {
    display: block;
  }

  .platform-sidebar {
    display: none;
  }

  .platform-content {
    padding-bottom: 76px;
  }

  .platform-content__crumb {
    display: flex;
    height: 38px;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--line);
    background: #fff;
    color: #5d6675;
    font-size: 12px;
    font-weight: 700;
  }

  .platform-content__crumb-mark {
    width: 5px;
    height: 5px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--brand);
  }

  .mobile-navigation {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 45;
    display: grid;
    height: 62px;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    padding: 5px 8px 7px;
    border-top: 1px solid var(--line);
    background: rgb(255 255 255 / 97%);
    box-shadow: 0 -8px 24px rgb(24 31 50 / 6%);
    backdrop-filter: blur(16px);
  }

  .mobile-navigation a {
    display: grid;
    place-items: center;
    gap: 3px;
    border-radius: 8px;
    color: #8a92a0;
    font-size: 10px;
    text-decoration: none;
  }

  .mobile-navigation a.active {
    color: var(--brand);
  }

  .mobile-navigation a :deep(svg) {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 980px) {
  .platform-shell__body {
    grid-template-columns: 200px minmax(0, 1fr);
  }
}
</style>
