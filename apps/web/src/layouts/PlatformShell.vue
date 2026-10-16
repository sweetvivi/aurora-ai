<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import AccountPill from '@/components/AccountPill.vue';
import BrandMark from '@/components/BrandMark.vue';
import SystemStatus from '@/components/SystemStatus.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const route = useRoute();

const navigation = [
  { glyph: '首', label: '工作台', to: '/' },
  { glyph: '聊', label: '模型对话', to: '/chat' },
  { glyph: '图', label: '工具地图', to: '/map' },
  { glyph: '绘', label: 'AI 绘画', to: '/draw' },
  { glyph: '媒', label: '媒体工作室', to: '/studio' },
  { glyph: '文', label: '文档工作台', to: '/workbench' },
];

const mobileNavigation = navigation.slice(0, 5);
const currentTitle = computed(() => String(route.meta.title ?? '工作台'));
</script>

<template>
  <div class="platform-shell">
    <aside class="platform-sidebar">
      <BrandMark />

      <nav class="platform-sidebar__navigation" aria-label="平台导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="platform-sidebar__link"
          :class="{ 'platform-sidebar__link--active': route.path === item.to }"
        >
          <span class="platform-sidebar__glyph" aria-hidden="true">{{ item.glyph }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="platform-sidebar__note">
        <StatusBadge tone="brand">M0</StatusBadge>
        <strong>基础工程</strong>
        <span>页面骨架与接口联调</span>
      </div>
    </aside>

    <div class="platform-frame">
      <header class="platform-topbar">
        <div class="platform-topbar__mobile-brand">
          <BrandMark compact />
        </div>

        <div class="platform-topbar__title">
          <span class="muted-label">Aurora workspace</span>
          <strong>{{ currentTitle }}</strong>
        </div>

        <div class="platform-topbar__actions">
          <SystemStatus />
          <AccountPill />
        </div>
      </header>

      <main class="platform-content">
        <RouterView />
      </main>

      <nav class="mobile-navigation" aria-label="移动端主导航">
        <RouterLink
          v-for="item in mobileNavigation"
          :key="item.to"
          :to="item.to"
          class="mobile-navigation__link"
          :class="{ 'mobile-navigation__link--active': route.path === item.to }"
        >
          <span aria-hidden="true">{{ item.glyph }}</span>
          <small>{{ item.label.replace('模型', '').replace('工作室', '') }}</small>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.platform-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 232px minmax(0, 1fr);
  background: var(--surface);
}

.platform-sidebar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  height: 100vh;
  flex-direction: column;
  padding: 20px 16px 18px;
  border-right: 1px solid var(--line);
  background: #fff;
}

.platform-sidebar__navigation {
  display: grid;
  gap: 4px;
  margin-top: 28px;
}

.platform-sidebar__link {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  border-radius: 6px;
  color: #4b5869;
  font-size: 13px;
  font-weight: 630;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.platform-sidebar__link:hover {
  background: #f0f3f5;
  color: var(--ink);
}

.platform-sidebar__link--active {
  background: #e8f3f1;
  color: #0b685f;
}

.platform-sidebar__glyph {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 760;
  opacity: 0.86;
}

.platform-sidebar__note {
  display: grid;
  gap: 6px;
  margin-top: auto;
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #f8fafb;
}

.platform-sidebar__note strong {
  color: var(--ink);
  font-size: 12px;
}

.platform-sidebar__note span {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
}

.platform-frame {
  min-width: 0;
}

.platform-topbar {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  min-height: 67px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--line);
  background: rgb(255 255 255 / 92%);
  backdrop-filter: blur(12px);
}

.platform-topbar__mobile-brand {
  display: none;
}

.platform-topbar__title {
  display: grid;
  gap: 3px;
}

.platform-topbar__title strong {
  color: var(--ink);
  font-size: 14px;
}

.platform-topbar__actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.platform-content {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: 28px 24px 36px;
}

.mobile-navigation {
  display: none;
}

@media (max-width: 900px) {
  .platform-shell {
    display: block;
  }

  .platform-sidebar {
    display: none;
  }

  .platform-topbar__mobile-brand {
    display: block;
  }

  .platform-topbar {
    padding-right: 14px;
    padding-left: 14px;
  }

  .platform-topbar__title {
    display: none;
  }

  .platform-content {
    padding: 20px 14px 94px;
  }

  .mobile-navigation {
    position: fixed;
    right: 10px;
    bottom: 10px;
    left: 10px;
    z-index: 25;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    padding: 6px;
    border: 1px solid rgb(220 226 232 / 90%);
    border-radius: 10px;
    background: rgb(255 255 255 / 96%);
    box-shadow: 0 12px 30px rgb(23 32 51 / 12%);
    backdrop-filter: blur(16px);
  }

  .mobile-navigation__link {
    display: grid;
    min-width: 0;
    min-height: 50px;
    place-items: center;
    gap: 2px;
    border-radius: 7px;
    color: var(--muted);
    text-decoration: none;
  }

  .mobile-navigation__link > span {
    display: grid;
    width: 25px;
    height: 25px;
    place-items: center;
    border: 1px solid currentColor;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 760;
  }

  .mobile-navigation__link small {
    overflow: hidden;
    max-width: 100%;
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-navigation__link--active {
    background: #e8f3f1;
    color: #0b685f;
  }
}
</style>
