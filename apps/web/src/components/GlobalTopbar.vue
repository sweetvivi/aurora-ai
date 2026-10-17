<script setup lang="ts">
import {
  BellOutlined,
  DownloadOutlined,
  MenuOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import { computed, ref } from 'vue';
import AccountPill from '@/components/AccountPill.vue';
import BrandMark from '@/components/BrandMark.vue';

const props = withDefaults(
  defineProps<{
    darkBrand?: boolean;
    modelValue?: string;
    searchPlaceholder?: string;
    showBrand?: boolean;
    showDownload?: boolean;
    wideSearch?: boolean;
  }>(),
  {
    darkBrand: false,
    modelValue: undefined,
    searchPlaceholder: '搜索功能、模型、工具...(Ctrl+K)',
    showBrand: true,
    showDownload: true,
    wideSearch: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const localSearchValue = ref('');
const searchValue = computed({
  get: () => props.modelValue ?? localSearchValue.value,
  set: (value: string) => {
    if (props.modelValue === undefined) {
      localSearchValue.value = value;
      return;
    }

    emit('update:modelValue', value);
  },
});
</script>

<template>
  <header
    class="global-topbar"
    :class="{
      'global-topbar--dark-brand': props.darkBrand,
      'global-topbar--without-brand': !props.showBrand,
      'global-topbar--wide-search': props.wideSearch,
    }"
  >
    <div v-if="props.showBrand" class="global-topbar__brand">
      <BrandMark :inverse="props.darkBrand" />
    </div>

    <button v-if="props.showDownload" class="global-topbar__download" type="button">
      <DownloadOutlined />
      <span>下载客户端</span>
    </button>

    <label class="global-topbar__search">
      <SearchOutlined />
      <input v-model="searchValue" :placeholder="props.searchPlaceholder" />
    </label>

    <div class="global-topbar__actions">
      <button class="global-topbar__icon-button" type="button" aria-label="通知">
        <BellOutlined />
      </button>
      <AccountPill />
      <button
        class="global-topbar__icon-button global-topbar__menu-button"
        type="button"
        aria-label="展开导航"
      >
        <MenuOutlined />
      </button>
    </div>
  </header>
</template>

<style scoped>
.global-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  height: 56px;
  align-items: center;
  gap: 12px;
  padding: 0 16px 0 0;
  border-bottom: 1px solid var(--line);
  background: rgb(255 255 255 / 97%);
  backdrop-filter: blur(16px);
}

.global-topbar__brand {
  display: flex;
  width: 240px;
  height: 100%;
  flex: 0 0 240px;
  align-items: center;
  padding: 0 22px;
  border-right: 1px solid var(--line);
  background: #fff;
}

.global-topbar--dark-brand .global-topbar__brand {
  border-right-color: #262c37;
  background: #141922;
}

.global-topbar--without-brand {
  padding-left: 14px;
}

.global-topbar__download,
.global-topbar__icon-button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #5f6878;
  cursor: pointer;
}

.global-topbar__download {
  flex: 0 0 auto;
  gap: 7px;
  padding: 0 8px;
  color: #7659ea;
  font-size: 12px;
  font-weight: 700;
}

.global-topbar__download:hover,
.global-topbar__icon-button:hover {
  background: #f4f5f8;
}

.global-topbar__search {
  display: flex;
  width: min(360px, 32vw);
  height: 34px;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: #fff;
  color: #9aa1ae;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.global-topbar--wide-search .global-topbar__search {
  width: min(680px, 50vw);
}

.global-topbar__search:focus-within {
  border-color: #c6bafb;
  box-shadow: 0 0 0 3px rgb(119 88 244 / 8%);
}

.global-topbar__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
}

.global-topbar__search input::placeholder {
  color: #a8aeba;
}

.global-topbar__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.global-topbar__icon-button {
  width: 32px;
  flex: 0 0 32px;
  font-size: 15px;
}

.global-topbar__menu-button {
  display: none;
}

@media (max-width: 980px) {
  .global-topbar__brand {
    width: 200px;
    flex-basis: 200px;
    padding: 0 18px;
  }

  .global-topbar__download span {
    display: none;
  }

  .global-topbar__search {
    width: min(320px, 36vw);
  }

  .global-topbar--wide-search .global-topbar__search {
    width: min(520px, 46vw);
  }
}

@media (max-width: 720px) {
  .global-topbar {
    gap: 7px;
    padding-right: 10px;
  }

  .global-topbar__brand {
    width: auto;
    flex: 0 0 auto;
    padding: 0 12px;
    border-right: 0;
  }

  .global-topbar__download,
  .global-topbar__search,
  .global-topbar__actions > :deep(.account-pill) {
    display: none;
  }

  .global-topbar__menu-button {
    display: inline-flex;
  }
}
</style>
