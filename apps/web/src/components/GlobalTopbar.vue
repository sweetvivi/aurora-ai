<script setup lang="ts">
import {
  ArrowRightOutlined,
  BellOutlined,
  DownloadOutlined,
  MenuOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AccountPill from '@/components/AccountPill.vue';
import BrandMark from '@/components/BrandMark.vue';
import { resolveModuleIcon, useModuleCatalogStore } from '@/stores/module-catalog';
import {
  buildGlobalSearchEntries,
  normalizeSearchText,
  searchGlobalEntries,
  type GlobalSearchEntry,
} from '@/utils/global-search';

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

const maxVisibleResults = 8;
const router = useRouter();
const moduleCatalogStore = useModuleCatalogStore();
const { catalogItems } = storeToRefs(moduleCatalogStore);
const localSearchValue = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const searchOpen = ref(false);
const activeIndex = ref(-1);
const searchValue = computed({
  get: () => props.modelValue ?? localSearchValue.value,
  set: (value: string) => {
    if (props.modelValue === undefined) {
      localSearchValue.value = value;
    } else {
      emit('update:modelValue', value);
    }

    searchOpen.value = true;
    activeIndex.value = 0;
  },
});
const searchEntries = computed(() => buildGlobalSearchEntries(catalogItems.value));
const matchingEntries = computed(() => searchGlobalEntries(searchEntries.value, searchValue.value));
const visibleEntries = computed(() => matchingEntries.value.slice(0, maxVisibleResults));
const hasSearchQuery = computed(() => normalizeSearchText(searchValue.value).length > 0);
const searchSummary = computed(() => {
  if (hasSearchQuery.value) {
    return `${matchingEntries.value.length} 个匹配结果`;
  }

  return '快速入口';
});
const activeDescendant = computed(() => {
  const activeEntry = visibleEntries.value[activeIndex.value];
  return activeEntry ? `global-search-${activeEntry.id}` : undefined;
});

watch(visibleEntries, (entries) => {
  activeIndex.value = entries.length > 0 ? 0 : -1;
});

onMounted(() => {
  void moduleCatalogStore.load();
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') {
    return;
  }

  event.preventDefault();
  searchOpen.value = true;
  void nextTick(() => {
    searchInput.value?.focus();
    searchInput.value?.select();
  });
}

function handleSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    searchOpen.value = true;
    moveActiveIndex(1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    searchOpen.value = true;
    moveActiveIndex(-1);
    return;
  }

  if (event.key === 'Enter') {
    const entry = visibleEntries.value[activeIndex.value] ?? visibleEntries.value[0];

    if (entry) {
      event.preventDefault();
      openEntry(entry);
    }

    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeSearch();
  }
}

function handleSearchFocusOut(event: FocusEvent): void {
  const currentTarget = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (!(currentTarget instanceof HTMLElement) || !(nextTarget instanceof Node)) {
    closeSearch();
    return;
  }

  if (!currentTarget.contains(nextTarget)) {
    closeSearch();
  }
}

function moveActiveIndex(step: number): void {
  const resultCount = visibleEntries.value.length;

  if (resultCount === 0) {
    activeIndex.value = -1;
    return;
  }

  activeIndex.value = (activeIndex.value + step + resultCount) % resultCount;
}

function closeSearch(): void {
  searchOpen.value = false;
  activeIndex.value = -1;
  searchInput.value?.blur();
}

function openEntry(entry: GlobalSearchEntry): void {
  searchValue.value = '';
  closeSearch();

  if (entry.standalone) {
    const popup = window.open(entry.route, '_blank');

    if (popup) {
      popup.opener = null;
      return;
    }
  }

  void router.push(entry.route);
}
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

    <div
      class="global-topbar__search-shell"
      :class="{ 'global-topbar__search-shell--active': searchOpen }"
      @focusout="handleSearchFocusOut"
    >
      <div class="global-topbar__search">
        <SearchOutlined />
        <input
          ref="searchInput"
          v-model="searchValue"
          :aria-activedescendant="activeDescendant"
          aria-autocomplete="list"
          aria-controls="global-search-results"
          :aria-expanded="searchOpen"
          aria-haspopup="listbox"
          :placeholder="props.searchPlaceholder"
          role="combobox"
          @focus="searchOpen = true"
          @keydown="handleSearchKeydown"
        />
        <kbd v-if="!searchValue">Ctrl K</kbd>
      </div>

      <Transition name="global-search">
        <section
          v-if="searchOpen"
          id="global-search-results"
          class="global-topbar__search-panel"
          aria-label="全局搜索"
          role="listbox"
        >
          <header>
            <span>{{ searchSummary }}</span>
            <kbd>↑↓ 选择 · Enter 打开</kbd>
          </header>

          <div v-if="visibleEntries.length" class="global-topbar__search-list">
            <button
              v-for="(entry, index) in visibleEntries"
              :id="`global-search-${entry.id}`"
              :key="entry.id"
              class="global-topbar__search-result"
              :class="{ 'global-topbar__search-result--active': index === activeIndex }"
              type="button"
              role="option"
              :aria-selected="index === activeIndex"
              data-testid="global-search-result"
              @mousedown.prevent="openEntry(entry)"
              @mouseenter="activeIndex = index"
            >
              <span class="global-topbar__result-icon">
                <component :is="resolveModuleIcon(entry.iconKey)" />
              </span>
              <span class="global-topbar__result-copy">
                <strong>
                  {{ entry.title }}
                  <em v-if="entry.standalone">新窗口</em>
                </strong>
                <small>{{ entry.description || entry.category }}</small>
              </span>
              <span class="global-topbar__result-category">{{ entry.category }}</span>
              <ArrowRightOutlined class="global-topbar__result-arrow" />
            </button>
          </div>

          <div v-else class="global-topbar__search-empty">
            <SearchOutlined />
            <strong>没有找到匹配功能</strong>
            <span>试试“生图”“抠图”“视频”或“工作流”</span>
          </div>
        </section>
      </Transition>
    </div>

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

.global-topbar__search-shell {
  position: relative;
  width: min(360px, 32vw);
  flex: 0 1 auto;
}

.global-topbar--wide-search .global-topbar__search-shell {
  width: min(680px, 50vw);
}

.global-topbar__search {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 8px;
  padding: 0 11px 0 13px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: #fff;
  color: #9aa1ae;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
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

.global-topbar__search kbd,
.global-topbar__search-panel kbd {
  color: #9da5b3;
  font-family: inherit;
  font-size: 8px;
  white-space: nowrap;
}

.global-topbar__search kbd {
  display: inline-flex;
  height: 20px;
  align-items: center;
  padding: 0 6px;
  border: 1px solid #e5e8ee;
  border-radius: 5px;
  background: #f8f9fb;
}

.global-topbar__search-panel {
  position: absolute;
  top: calc(100% + 9px);
  left: 0;
  z-index: 50;
  width: max(100%, 420px);
  overflow: hidden;
  border: 1px solid #e1e4eb;
  border-radius: 10px;
  background: #fff;
  box-shadow:
    0 18px 45px rgb(21 29 46 / 14%),
    0 3px 10px rgb(21 29 46 / 7%);
}

.global-topbar__search-panel > header {
  display: flex;
  height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 12px;
  border-bottom: 1px solid #eff1f5;
  background: #fafbfc;
}

.global-topbar__search-panel > header span {
  color: #596273;
  font-size: 10px;
  font-weight: 760;
}

.global-topbar__search-list {
  display: grid;
  max-height: 390px;
  gap: 2px;
  overflow-y: auto;
  padding: 5px;
}

.global-topbar__search-result {
  display: grid;
  min-height: 48px;
  align-items: center;
  gap: 9px;
  grid-template-columns: 32px minmax(0, 1fr) auto 13px;
  padding: 6px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #252c38;
  text-align: left;
  cursor: pointer;
}

.global-topbar__search-result--active {
  background: #f1effd;
}

.global-topbar__result-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 7px;
  background: #f2f4f8;
  color: #677184;
  font-size: 14px;
}

.global-topbar__search-result--active .global-topbar__result-icon {
  background: #e6e0ff;
  color: #6848df;
}

.global-topbar__result-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.global-topbar__result-copy strong {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-topbar__result-copy em {
  flex: 0 0 auto;
  padding: 1px 5px;
  border-radius: 4px;
  background: #ece8ff;
  color: #6a4bde;
  font-size: 7px;
  font-style: normal;
}

.global-topbar__result-copy small {
  overflow: hidden;
  color: #8d95a2;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-topbar__result-category {
  color: #a1a8b4;
  font-size: 8px;
  white-space: nowrap;
}

.global-topbar__result-arrow {
  color: #b4bac4;
  font-size: 9px;
}

.global-topbar__search-empty {
  display: grid;
  min-height: 132px;
  place-items: center;
  align-content: center;
  gap: 7px;
  padding: 18px;
  color: #929aa6;
  text-align: center;
}

.global-topbar__search-empty :deep(svg) {
  width: 24px;
  height: 24px;
  color: #c2c8d2;
}

.global-topbar__search-empty strong {
  color: #596270;
  font-size: 11px;
}

.global-topbar__search-empty span {
  font-size: 9px;
}

.global-search-enter-active,
.global-search-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.global-search-enter-from,
.global-search-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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

  .global-topbar__search-shell {
    width: min(320px, 36vw);
  }

  .global-topbar--wide-search .global-topbar__search-shell {
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
  .global-topbar__search-shell,
  .global-topbar__actions > :deep(.account-pill) {
    display: none;
  }

  .global-topbar__search-shell--active {
    position: absolute;
    top: 8px;
    right: 52px;
    left: 62px;
    z-index: 3;
    display: block;
    width: auto;
  }

  .global-topbar__search-panel {
    position: fixed;
    top: 56px;
    right: 8px;
    left: 8px;
    width: auto;
    max-height: calc(100vh - 68px);
  }

  .global-topbar__search-list {
    max-height: calc(100vh - 140px);
  }

  .global-topbar__result-category {
    display: none;
  }

  .global-topbar__search-result {
    grid-template-columns: 32px minmax(0, 1fr) 13px;
  }

  .global-topbar__menu-button {
    display: inline-flex;
  }
}
</style>
