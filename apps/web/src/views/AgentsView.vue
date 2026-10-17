<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  BulbOutlined,
  CodeOutlined,
  CoffeeOutlined,
  EditOutlined,
  FileTextOutlined,
  HighlightOutlined,
  LayoutOutlined,
  LeftOutlined,
  MessageOutlined,
  PictureOutlined,
  PlusOutlined,
  ReadOutlined,
  RightOutlined,
  RobotOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SoundOutlined,
  StarFilled,
  StarOutlined,
  TeamOutlined,
  ThunderboltFilled,
  TranslationOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { agentCatalog, type AgentCatalogItem } from '@/data/agents';
import { useAgentWorkspaceStore } from '@/stores/agent-workspace';

type CatalogTab = 'created' | 'favorites' | 'official';

interface CategoryItem {
  count: number;
  icon: Component;
  label: string;
}

const router = useRouter();
const workspace = useAgentWorkspaceStore();
const activeTab = ref<CatalogTab>('official');
const selectedCategory = ref('全部');
const search = ref('');
const currentPage = ref(1);
const resultsHeading = ref<HTMLElement | null>(null);
const pageSize = 24;

const hotSearches = ['AI写作助手', '代码生成器', '数据分析', '图像处理', '翻译助手'];

const categoryDefinitions: { icon: Component; label: string }[] = [
  { icon: ReadOutlined, label: 'AI教育' },
  { icon: ReadOutlined, label: '教育与培训' },
  { icon: PictureOutlined, label: 'AI视觉创作' },
  { icon: HighlightOutlined, label: '图形与图像处理' },
  { icon: FileTextOutlined, label: '办公文档生成' },
  { icon: BarChartOutlined, label: '数据计算与分析' },
  { icon: SearchOutlined, label: '知识检索与信息获取' },
  { icon: CodeOutlined, label: '编程与软件开发' },
  { icon: BulbOutlined, label: '创意营销与内容策划' },
  { icon: ReadOutlined, label: '学术与研究辅助' },
  { icon: TranslationOutlined, label: '语言与文字处理' },
  { icon: TeamOutlined, label: '商务与运营支持' },
  { icon: CoffeeOutlined, label: '生活与娱乐' },
  { icon: LayoutOutlined, label: '产品与UI设计' },
  { icon: SoundOutlined, label: '媒体与传播' },
  { icon: AppstoreOutlined, label: '综合工具（多模态）' },
  { icon: ShoppingCartOutlined, label: 'AI电商' },
  { icon: PictureOutlined, label: 'AI图片' },
  { icon: UserOutlined, label: '我的智能体' },
];

const tabs: { icon: Component; label: string; value: CatalogTab }[] = [
  { icon: StarFilled, label: '官方智能体', value: 'official' },
  { icon: UserOutlined, label: '我创建的', value: 'created' },
  { icon: StarOutlined, label: '我收藏的', value: 'favorites' },
];

const activeCollection = computed<AgentCatalogItem[]>(() => {
  if (activeTab.value === 'created') {
    return workspace.customAgents;
  }

  if (activeTab.value === 'favorites') {
    return [...agentCatalog, ...workspace.customAgents].filter((agent) =>
      workspace.favoriteAgentIds.includes(agent.id),
    );
  }

  return agentCatalog;
});

const categories = computed<CategoryItem[]>(() => {
  const countByCategory = new Map<string, number>();

  for (const agent of activeCollection.value) {
    countByCategory.set(agent.category, (countByCategory.get(agent.category) ?? 0) + 1);
  }

  return categoryDefinitions
    .filter((category) => (countByCategory.get(category.label) ?? 0) > 0)
    .map((category) => ({
      ...category,
      count: countByCategory.get(category.label) ?? 0,
    }));
});

const filteredAgents = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return activeCollection.value.filter((agent) => {
    const matchesCategory =
      selectedCategory.value === '全部' || agent.category === selectedCategory.value;

    if (!matchesCategory) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [agent.name, agent.description, agent.tags.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAgents.value.length / pageSize)));

const visibleAgents = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredAgents.value.slice(start, start + pageSize);
});

const paginationItems = computed<Array<number | 'left-ellipsis' | 'right-ellipsis'>>(() => {
  const pages = totalPages.value;

  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  const items: Array<number | 'left-ellipsis' | 'right-ellipsis'> = [1];
  const start = Math.max(2, currentPage.value - 1);
  const end = Math.min(pages - 1, currentPage.value + 1);

  if (start > 2) {
    items.push('left-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < pages - 1) {
    items.push('right-ellipsis');
  }

  items.push(pages);
  return items;
});

const collectionLabel = computed(() => {
  if (activeTab.value === 'created') {
    return '我创建的智能体';
  }

  if (activeTab.value === 'favorites') {
    return '我收藏的智能体';
  }

  return '全部智能体';
});

const emptyTitle = computed(() => {
  if (search.value.trim()) {
    return '没有找到匹配的智能体';
  }

  if (activeTab.value === 'created') {
    return '还没有创建智能体';
  }

  if (activeTab.value === 'favorites') {
    return '还没有收藏智能体';
  }

  return '当前分类暂无智能体';
});

watch([activeTab, selectedCategory, search], () => {
  currentPage.value = 1;
});

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});

onMounted(() => {
  void workspace.initialize();
});

function openAgent(agentId: string): void {
  void router.push(`/agents/${agentId}`);
}

function editAgent(agentId: string): void {
  void router.push({
    path: '/agents/create',
    query: {
      edit: agentId,
    },
  });
}

function toggleFavorite(agentId: string): void {
  workspace.toggleFavorite(agentId);
}

function applyHotSearch(keyword: string): void {
  search.value = keyword;
  activeTab.value = 'official';
  selectedCategory.value = '全部';
}

function goToPage(page: number): void {
  currentPage.value = Math.min(totalPages.value, Math.max(1, page));
  void nextTick(() => {
    resultsHeading.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
</script>

<template>
  <div class="agents-catalog-page">
    <section class="agents-hero">
      <header class="agents-hero__heading">
        <span>
          <RobotOutlined />
          SUPER AGENTS
        </span>
        <h1>超级智能体，创建你的 APP 或助手</h1>
        <p>释放 AI 的潜能，通过自定义模型、提示词和界面，打造属于你的智能应用。</p>
      </header>

      <div class="agents-hero__cards">
        <article class="agents-builder-card agents-builder-card--active">
          <div class="agents-builder-card__visual agents-builder-card__visual--chat">
            <div class="agent-window">
              <header>
                <i />
                <span>智能体创建助手 (Prompt)</span>
              </header>
              <p />
              <p />
              <p />
              <p />
              <button type="button">AI 帮我完善</button>
            </div>
          </div>
          <div class="agents-builder-card__content">
            <span class="agents-builder-card__tag">单智能体</span>
            <h2>创建智能体</h2>
            <p>适用于轻量灵活、自然语言驱动的场景。</p>
            <ul>
              <li>支持自定义界面</li>
              <li>多模型选择</li>
            </ul>
            <button type="button" @click="router.push('/agents/create')">
              <PlusOutlined />
              立即创建
            </button>
          </div>
        </article>

        <article class="agents-builder-card agents-builder-card--disabled">
          <div class="agents-builder-card__visual agents-builder-card__visual--flow">
            <span class="flow-node flow-node--one">开始</span>
            <span class="flow-node flow-node--two">信息检索</span>
            <span class="flow-node flow-node--three">内容生成</span>
            <span class="flow-node flow-node--four">结果复核</span>
            <i class="flow-line flow-line--one" />
            <i class="flow-line flow-line--two" />
            <i class="flow-line flow-line--three" />
          </div>
          <div class="agents-builder-card__content">
            <span class="agents-builder-card__tag">多智能体</span>
            <h2>创建多智能体蜂群</h2>
            <p>适用于真实业务链路和多个专业角色协作的场景。</p>
            <span class="agents-builder-card__soon">
              <i />
              即将上线
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="agents-catalog">
      <header class="agents-catalog__toolbar">
        <nav class="agents-tabs" aria-label="智能体资源库">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            <component :is="tab.icon" />
            {{ tab.label }}
            <span v-if="tab.value === 'created' && workspace.customAgents.length">
              {{ workspace.customAgents.length }}
            </span>
            <span v-if="tab.value === 'favorites' && workspace.favoriteAgentIds.length">
              {{ workspace.favoriteAgentIds.length }}
            </span>
          </button>
        </nav>

        <label class="agents-search">
          <SearchOutlined />
          <input v-model="search" placeholder="搜索智能体..." />
          <kbd>Ctrl K</kbd>
        </label>

        <div class="agents-hot-search">
          <span>热门搜索：</span>
          <button
            v-for="keyword in hotSearches"
            :key="keyword"
            type="button"
            @click="applyHotSearch(keyword)"
          >
            {{ keyword }}
          </button>
        </div>
      </header>

      <div class="agents-catalog__body">
        <aside class="agents-categories">
          <header>
            <strong>分类</strong>
            <span>{{ activeCollection.length }}</span>
          </header>
          <nav aria-label="智能体分类">
            <button
              type="button"
              :class="{ active: selectedCategory === '全部' }"
              @click="selectedCategory = '全部'"
            >
              <span>
                <AppstoreOutlined />
                全部
              </span>
              <em>{{ activeCollection.length }}</em>
            </button>
            <button
              v-for="category in categories"
              :key="category.label"
              type="button"
              :class="{ active: selectedCategory === category.label }"
              @click="selectedCategory = category.label"
            >
              <span>
                <component :is="category.icon" />
                {{ category.label }}
              </span>
              <em>{{ category.count }}</em>
            </button>
          </nav>
        </aside>

        <main class="agents-results">
          <header ref="resultsHeading" class="agents-results__heading">
            <div>
              <h2>{{ collectionLabel }}</h2>
              <p>选择智能体即可进入对话，也可以先收藏常用能力。</p>
            </div>
            <span>{{ filteredAgents.length }} 个结果</span>
          </header>

          <template v-if="filteredAgents.length > 0">
            <div class="agents-grid">
              <article
                v-for="agent in visibleAgents"
                :key="agent.id"
                class="agent-card"
                tabindex="0"
                @click="openAgent(agent.id)"
                @keydown.enter="openAgent(agent.id)"
              >
                <header class="agent-card__header">
                  <span class="agent-card__avatar" :style="{ background: agent.color }">
                    {{ agent.glyph }}
                  </span>
                  <div>
                    <strong>{{ agent.name }}</strong>
                    <span v-if="activeTab === 'created'">我创建的</span>
                    <span v-else>AI 助手</span>
                  </div>
                  <span class="agent-card__actions">
                    <button
                      v-if="activeTab === 'created'"
                      type="button"
                      class="agent-card__edit"
                      aria-label="编辑智能体"
                      @click.stop="editAgent(agent.id)"
                    >
                      <EditOutlined />
                    </button>
                    <button
                      type="button"
                      class="agent-card__favorite"
                      :class="{ active: workspace.favoriteAgentIds.includes(agent.id) }"
                      :aria-label="
                        workspace.favoriteAgentIds.includes(agent.id) ? '取消收藏' : '收藏智能体'
                      "
                      @click.stop="toggleFavorite(agent.id)"
                    >
                      <StarFilled v-if="workspace.favoriteAgentIds.includes(agent.id)" />
                      <StarOutlined v-else />
                    </button>
                  </span>
                </header>

                <div class="agent-card__metrics">
                  <span>
                    <StarFilled />
                    {{ agent.rating.toFixed(1) }}
                  </span>
                  <span>
                    <MessageOutlined />
                    {{ agent.usage }}
                  </span>
                </div>

                <p>{{ agent.description }}</p>

                <footer>
                  <span v-for="tag in agent.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
                </footer>
              </article>
            </div>

            <nav
              v-if="filteredAgents.length > pageSize"
              class="agents-pagination"
              aria-label="智能体分页"
            >
              <button
                type="button"
                aria-label="上一页"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                <LeftOutlined />
              </button>
              <template v-for="(page, index) in paginationItems" :key="`${page}-${index}`">
                <span v-if="typeof page !== 'number'">...</span>
                <button
                  v-else
                  type="button"
                  :class="{ active: currentPage === page }"
                  :aria-current="currentPage === page ? 'page' : undefined"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </template>
              <button
                type="button"
                aria-label="下一页"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                <RightOutlined />
              </button>
            </nav>
          </template>

          <div v-else class="agents-empty">
            <span>
              <RobotOutlined />
            </span>
            <strong>{{ emptyTitle }}</strong>
            <p>
              {{
                activeTab === 'created'
                  ? '创建后可以继续添加提示词、知识库和工具能力。'
                  : '调整关键词或切换分类后再试。'
              }}
            </p>
            <button
              v-if="activeTab === 'created'"
              type="button"
              @click="router.push('/agents/create')"
            >
              <PlusOutlined />
              创建智能体
            </button>
          </div>
        </main>
      </div>
    </section>

    <section v-if="activeTab === 'official'" class="agents-callout">
      <span>
        <ThunderboltFilled />
      </span>
      <div>
        <strong>没有找到合适的智能体？</strong>
        <p>把提示词、知识边界和输出格式组合起来，创建一个真正符合你工作习惯的助手。</p>
      </div>
      <button type="button" @click="router.push('/agents/create')">
        开始创建
        <ArrowRightOutlined />
      </button>
    </section>
  </div>
</template>

<style scoped>
.agents-catalog-page {
  min-height: calc(100vh - 56px);
  padding: 30px 28px 58px;
  background:
    radial-gradient(circle at 50% 0, rgb(61 202 136 / 8%), transparent 440px),
    linear-gradient(180deg, #f7fcf9 0, #fff 430px);
}

.agents-hero,
.agents-catalog,
.agents-callout {
  width: min(100%, 1380px);
  margin: 0 auto;
}

.agents-hero__heading {
  display: grid;
  justify-items: center;
  text-align: center;
}

.agents-hero__heading > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #1ca96d;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.agents-hero__heading h1 {
  margin: 9px 0 0;
  color: #169f67;
  font-size: clamp(25px, 2.2vw, 34px);
  font-weight: 900;
  letter-spacing: -0.025em;
}

.agents-hero__heading p {
  margin: 9px 0 0;
  color: #6d7882;
  font-size: 11px;
  line-height: 1.7;
}

.agents-hero__cards {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 25px;
}

.agents-builder-card {
  display: grid;
  min-height: 184px;
  overflow: hidden;
  grid-template-columns: minmax(240px, 0.92fr) minmax(260px, 1fr);
  border: 1px solid #e4ebe7;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 38px rgb(33 78 59 / 6%);
}

.agents-builder-card--disabled {
  opacity: 0.72;
}

.agents-builder-card__visual {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgb(63 172 126 / 6%) 1px, transparent 1px),
    linear-gradient(rgb(63 172 126 / 6%) 1px, transparent 1px), #edf8f3;
  background-size: 28px 28px;
}

.agents-builder-card__visual--chat::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgb(255 255 255 / 72%), transparent 65%);
  content: '';
}

.agent-window {
  position: absolute;
  top: 25px;
  right: 26px;
  bottom: 24px;
  left: 26px;
  display: grid;
  align-content: start;
  gap: 9px;
  padding: 14px;
  border: 1px solid #cfe1d9;
  border-radius: 8px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 14px 30px rgb(41 96 74 / 10%);
}

.agent-window header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 2px;
  color: #5e6d67;
  font-size: 8px;
  font-weight: 750;
}

.agent-window header i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: #69c9a3;
}

.agent-window p {
  height: 7px;
  margin: 0;
  border-radius: 999px;
  background: #e3e9e6;
}

.agent-window p:nth-of-type(2) {
  width: 82%;
}

.agent-window p:nth-of-type(3) {
  width: 92%;
}

.agent-window p:nth-of-type(4) {
  width: 68%;
}

.agent-window button {
  justify-self: end;
  height: 23px;
  margin-top: 2px;
  padding: 0 9px;
  border: 0;
  border-radius: 5px;
  background: #55b98f;
  color: #fff;
  font-size: 7px;
}

.agents-builder-card__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 28px;
}

.agents-builder-card__tag {
  color: #1ca96d;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.agents-builder-card__content h2 {
  margin: 7px 0 0;
  color: #26302c;
  font-size: 19px;
  font-weight: 850;
}

.agents-builder-card__content > p {
  margin: 8px 0 0;
  color: #7c8882;
  font-size: 10px;
  line-height: 1.65;
}

.agents-builder-card__content ul {
  display: grid;
  gap: 4px;
  margin: 10px 0 0;
  padding: 0;
  color: #69756f;
  font-size: 9px;
  list-style: none;
}

.agents-builder-card__content li::before {
  margin-right: 6px;
  color: #1ca96d;
  content: '✓';
  font-weight: 900;
}

.agents-builder-card__content > button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: #159c66;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.agents-builder-card__soon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 17px;
  color: #8d9691;
  font-size: 9px;
}

.agents-builder-card__soon i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef9141;
}

.agents-builder-card__visual--flow {
  background:
    linear-gradient(90deg, rgb(68 130 226 / 6%) 1px, transparent 1px),
    linear-gradient(rgb(68 130 226 / 6%) 1px, transparent 1px), #eff5fc;
  background-size: 28px 28px;
}

.flow-node {
  position: absolute;
  z-index: 2;
  padding: 7px 9px;
  border: 1px solid #d5e3f5;
  border-radius: 5px;
  background: #fff;
  color: #5e7087;
  font-size: 7px;
  box-shadow: 0 7px 16px rgb(54 86 128 / 8%);
}

.flow-node--one {
  top: 41px;
  left: 32px;
}

.flow-node--two {
  top: 94px;
  left: 66px;
}

.flow-node--three {
  top: 50px;
  right: 48px;
}

.flow-node--four {
  right: 31px;
  bottom: 32px;
}

.flow-line {
  position: absolute;
  z-index: 1;
  width: 62px;
  height: 1px;
  background: #9ebce5;
  transform-origin: left center;
}

.flow-line--one {
  top: 69px;
  left: 77px;
  transform: rotate(28deg);
}

.flow-line--two {
  top: 79px;
  left: 130px;
  transform: rotate(-15deg);
}

.flow-line--three {
  top: 95px;
  right: 78px;
  transform: rotate(34deg);
}

.agents-catalog {
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid #e4ebe7;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 14px 40px rgb(33 78 59 / 5%);
}

.agents-catalog__toolbar {
  display: grid;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  grid-template-columns: auto minmax(280px, 540px) minmax(0, 1fr);
  padding: 12px 16px;
  border-bottom: 1px solid #edf1ef;
}

.agents-tabs {
  display: flex;
  min-width: 0;
  padding: 3px;
  border-radius: 8px;
  background: #f3f5f4;
}

.agents-tabs button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #68726d;
  font-size: 9px;
  font-weight: 760;
  white-space: nowrap;
  cursor: pointer;
}

.agents-tabs button.active {
  background: #fff;
  color: #169c66;
  box-shadow: 0 3px 12px rgb(35 67 53 / 8%);
}

.agents-tabs button span {
  min-width: 15px;
  padding: 1px 4px;
  border-radius: 999px;
  background: #e5f5ee;
  color: #169c66;
  font-size: 7px;
}

.agents-search {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid #dde4e0;
  border-radius: 8px;
  color: #98a19c;
}

.agents-search:focus-within {
  border-color: #85c9ad;
  box-shadow: 0 0 0 3px rgb(28 169 109 / 8%);
}

.agents-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #39423e;
  font-size: 10px;
}

.agents-search input::placeholder {
  color: #a4aca8;
}

.agents-search kbd {
  flex: 0 0 auto;
  padding: 2px 5px;
  border: 1px solid #e2e7e4;
  border-radius: 4px;
  background: #f7f9f8;
  color: #9aa29e;
  font-size: 7px;
}

.agents-hot-search {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  overflow: hidden;
  white-space: nowrap;
}

.agents-hot-search span {
  flex: 0 0 auto;
  color: #929b96;
  font-size: 8px;
}

.agents-hot-search button {
  overflow: hidden;
  padding: 0;
  border: 0;
  background: transparent;
  color: #3267d8;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.agents-hot-search button:hover {
  text-decoration: underline;
}

.agents-catalog__body {
  display: grid;
  align-items: start;
  gap: 18px;
  grid-template-columns: 250px minmax(0, 1fr);
  padding: 18px;
}

.agents-categories {
  position: sticky;
  top: 74px;
  overflow: hidden;
  border: 1px solid #edf1ef;
  border-radius: 9px;
  background: #fbfcfc;
}

.agents-categories > header {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid #edf1ef;
}

.agents-categories > header strong {
  color: #46504b;
  font-size: 11px;
}

.agents-categories > header span {
  color: #9ca49f;
  font-size: 8px;
}

.agents-categories nav {
  display: grid;
  gap: 3px;
  padding: 8px;
}

.agents-categories nav button {
  display: flex;
  min-width: 0;
  min-height: 37px;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #68726d;
  font-size: 9px;
  text-align: left;
  cursor: pointer;
}

.agents-categories nav button:hover {
  background: #f0f6f3;
}

.agents-categories nav button.active {
  background: linear-gradient(90deg, #18ad72, #28bd80);
  color: #fff;
  box-shadow: 0 8px 18px rgb(24 173 114 / 18%);
}

.agents-categories nav button > span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agents-categories nav button :deep(svg) {
  flex: 0 0 auto;
  font-size: 11px;
}

.agents-categories nav button em {
  flex: 0 0 auto;
  color: #9ba39f;
  font-size: 8px;
  font-style: normal;
}

.agents-categories nav button.active em {
  color: rgb(255 255 255 / 82%);
}

.agents-results {
  min-width: 0;
}

.agents-results__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}

.agents-results__heading h2 {
  margin: 0;
  color: #29332e;
  font-size: 15px;
}

.agents-results__heading p {
  margin: 5px 0 0;
  color: #8d9691;
  font-size: 8px;
}

.agents-results__heading > span {
  flex: 0 0 auto;
  color: #8e9792;
  font-size: 8px;
}

.agents-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agent-card {
  display: grid;
  min-width: 0;
  min-height: 164px;
  align-content: start;
  padding: 14px;
  border: 1px solid #e3e9e6;
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.agent-card:hover,
.agent-card:focus-visible {
  border-color: #a9d8c3;
  outline: 0;
  box-shadow: 0 13px 28px rgb(37 91 67 / 9%);
  transform: translateY(-2px);
}

.agent-card__header {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 9px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
}

.agent-card__avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 850;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 18%);
}

.agent-card__header > div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.agent-card__header strong {
  overflow: hidden;
  color: #2e3732;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-card__header > div > span {
  width: max-content;
  padding: 2px 5px;
  border-radius: 4px;
  background: #e8f7f0;
  color: #1ca96d;
  font-size: 6px;
  font-weight: 800;
}

.agent-card__actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.agent-card__edit,
.agent-card__favorite {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: #f5f7f6;
  color: #a3aaa6;
  font-size: 11px;
  cursor: pointer;
}

.agent-card__edit:hover {
  background: #eef4ff;
  color: #3979ed;
}

.agent-card__favorite.active {
  background: #fff7e6;
  color: #e9a226;
}

.agent-card__metrics {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 10px;
  color: #8b9490;
  font-size: 8px;
}

.agent-card__metrics span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.agent-card__metrics :deep(svg:first-child) {
  color: #f1a02b;
}

.agent-card > p {
  display: -webkit-box;
  min-height: 35px;
  overflow: hidden;
  margin: 10px 0 0;
  color: #77817c;
  font-size: 9px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.agent-card > footer {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 11px;
}

.agent-card > footer span {
  padding: 3px 6px;
  border-radius: 4px;
  background: #f3f5f4;
  color: #848d88;
  font-size: 7px;
}

.agents-empty {
  display: grid;
  min-height: 370px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed #dce5e0;
  border-radius: 9px;
  background:
    linear-gradient(90deg, rgb(28 169 109 / 3%) 1px, transparent 1px),
    linear-gradient(rgb(28 169 109 / 3%) 1px, transparent 1px), #fbfdfc;
  background-size: 32px 32px;
  text-align: center;
}

.agents-empty > span {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 14px;
  background: #eaf8f2;
  color: #1ca96d;
  font-size: 20px;
}

.agents-empty strong {
  color: #46504b;
  font-size: 12px;
}

.agents-empty p {
  max-width: 320px;
  margin: 0;
  color: #929b96;
  font-size: 8px;
  line-height: 1.65;
}

.agents-empty button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: #159c66;
  color: #fff;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
}

.agents-callout {
  display: grid;
  align-items: center;
  gap: 14px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-top: 16px;
  padding: 17px 20px;
  border: 1px solid #dcebe4;
  border-radius: 10px;
  background: #f5fbf8;
}

.agents-callout > span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 11px;
  background: #159c66;
  color: #fff;
  font-size: 16px;
}

.agents-callout strong {
  color: #35413b;
  font-size: 12px;
}

.agents-callout p {
  margin: 5px 0 0;
  color: #7f8a84;
  font-size: 8px;
}

.agents-callout button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 13px;
  border: 1px solid #9fd3bc;
  border-radius: 7px;
  background: #fff;
  color: #168d5f;
  font-size: 9px;
  font-weight: 780;
  cursor: pointer;
}

@media (max-width: 1240px) {
  .agents-catalog__toolbar {
    grid-template-columns: auto minmax(260px, 1fr);
  }

  .agents-hot-search {
    display: none;
  }
}

@media (max-width: 980px) {
  .agents-catalog-page {
    padding: 24px 18px 48px;
  }

  .agents-hero__cards {
    grid-template-columns: 1fr;
  }

  .agents-catalog__body {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .agents-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .agents-catalog-page {
    padding: 20px 12px 40px;
  }

  .agents-hero__cards {
    margin-top: 19px;
  }

  .agents-builder-card {
    grid-template-columns: 1fr;
  }

  .agents-builder-card__visual {
    min-height: 155px;
  }

  .agents-builder-card__content {
    padding: 18px;
  }

  .agents-catalog__toolbar {
    grid-template-columns: 1fr;
    padding: 11px;
  }

  .agents-tabs {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .agents-tabs::-webkit-scrollbar {
    display: none;
  }

  .agents-tabs button {
    flex: 1 0 auto;
  }

  .agents-catalog__body {
    display: block;
    padding: 12px;
  }

  .agents-categories {
    position: static;
    margin-bottom: 14px;
  }

  .agents-categories nav {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .agents-categories nav::-webkit-scrollbar {
    display: none;
  }

  .agents-categories nav button {
    min-width: max-content;
    gap: 12px;
  }

  .agents-results__heading {
    align-items: flex-start;
  }

  .agents-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agents-callout {
    align-items: start;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .agents-callout button {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 520px) {
  .agents-grid {
    grid-template-columns: 1fr;
  }

  .agent-card {
    min-height: 158px;
  }
}
</style>
