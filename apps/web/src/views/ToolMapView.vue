<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  AudioOutlined,
  BulbOutlined,
  DownOutlined,
  FileTextOutlined,
  HeartFilled,
  HomeOutlined,
  PictureOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  StarOutlined,
  ThunderboltOutlined,
  TranslationOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import GalleryArtwork from '@/components/GalleryArtwork.vue';
import { useDiscoveryStore } from '@/stores/discovery';

interface SideNavigationItem {
  accent?: boolean;
  icon: Component;
  label: string;
  to?: string;
}

interface ToolItem {
  accent: string;
  category: string;
  description: string;
  glyph: string;
  metric: string;
  route: string;
  title: string;
}

const router = useRouter();
const discoveryStore = useDiscoveryStore();
const { query } = storeToRefs(discoveryStore);
const tools = [
  {
    accent: '#7447d7',
    category: '视频工具',
    description: '新一代多模态视频模型，支持图像、视频和音频参考输入。',
    glyph: '影',
    metric: '本周 4.2 万次创作',
    route: '/studio',
    title: '极光影像 3.0',
  },
  {
    accent: '#1fa06d',
    category: '视频工具',
    description: '用一张图片生成自然运动画面，适合广告、短片与创意镜头。',
    glyph: '动',
    metric: '平均 38 秒完成',
    route: '/studio',
    title: '动态画布',
  },
  {
    accent: '#22a0a8',
    category: '股票工具',
    description: '聚合市场数据、趋势信息与研究框架，生成结构化分析结论。',
    glyph: '析',
    metric: '覆盖 6 类市场数据',
    route: '/agents/data-analyst',
    title: 'AI 分析中心',
  },
  {
    accent: '#7d57d8',
    category: '图片工具',
    description: '精准识别人像与商品主体，一键去除背景并输出透明素材。',
    glyph: '抠',
    metric: '支持批量处理',
    route: '/studio',
    title: '智能抠图',
  },
  {
    accent: '#e08637',
    category: 'PPT 工具',
    description: '根据主题生成目录、内容页和统一视觉，快速完成演示初稿。',
    glyph: '演',
    metric: '32 套原创版式',
    route: '/workbench',
    title: '一键生成 PPT',
  },
  {
    accent: '#2b83d4',
    category: '翻译工具',
    description: '理解上下文与行业术语，处理长文档和多语言内容。',
    glyph: '译',
    metric: '支持 90 多种语言',
    route: '/chat',
    title: '上下文翻译',
  },
  {
    accent: '#d85f72',
    category: '文档工具',
    description: '把资料、访谈与数据整理成结构清晰的长文档或报告。',
    glyph: '文',
    metric: '支持 50 页长文',
    route: '/workbench',
    title: '研究文档',
  },
  {
    accent: '#2b9674',
    category: '绘画工具',
    description: '从文字描述到高质量画面，支持参考图、重绘和局部编辑。',
    glyph: '绘',
    metric: '36 个绘画模型',
    route: '/draw',
    title: 'AI 绘画',
  },
];

const primaryNavigation: SideNavigationItem[] = [
  { icon: HomeOutlined, label: '首页', to: '/' },
  { accent: true, icon: HeartFilled, label: '我的工具' },
  { icon: AppstoreOutlined, label: 'AI 大模型', to: '/chat' },
  { icon: RobotOutlined, label: 'AI 智能体', to: '/agents' },
];

const rankingNavigation = ['最新发布', '热度最高'];
const categoryNavigation = [
  '股票工具',
  '视频工具',
  '音频工具',
  '绘画模型',
  '图片工具',
  'PDF 工具',
  'PPT 工具',
  '文档处理',
  '文档转换',
  '翻译工具',
  '电商工具',
  'AI 设计',
  '学术研究',
];

const filteredTools = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();

  if (!normalizedQuery) {
    return tools;
  }

  return tools.filter((tool) =>
    `${tool.title}${tool.description}${tool.category}`.toLowerCase().includes(normalizedQuery),
  );
});

function openTool(tool: ToolItem): void {
  void router.push(tool.route);
}
</script>

<template>
  <div class="discovery-page">
    <aside class="discovery-sidebar">
      <nav class="discovery-sidebar__primary" aria-label="发现导航">
        <template v-for="item in primaryNavigation" :key="item.label">
          <RouterLink v-if="item.to" :to="item.to" :class="{ active: item.label === '首页' }">
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </RouterLink>
          <button v-else type="button" :class="{ active: item.accent }">
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </button>
        </template>
      </nav>

      <section class="discovery-sidebar__group">
        <header>
          <span class="discovery-sidebar__group-mark discovery-sidebar__group-mark--rank">
            <ThunderboltOutlined />
          </span>
          <strong>排行榜</strong>
          <DownOutlined />
        </header>
        <button v-for="item in rankingNavigation" :key="item" type="button">
          {{ item }}
        </button>
      </section>

      <section class="discovery-sidebar__group">
        <header>
          <span class="discovery-sidebar__group-mark">
            <AppstoreOutlined />
          </span>
          <strong>类别</strong>
          <DownOutlined />
        </header>
        <button v-for="item in categoryNavigation" :key="item" type="button">
          {{ item }}
        </button>
      </section>

      <section class="discovery-sidebar__group discovery-sidebar__group--media">
        <header>
          <span class="discovery-sidebar__group-mark">
            <BulbOutlined />
          </span>
          <strong>更多能力</strong>
          <DownOutlined />
        </header>
        <RouterLink to="/draw">
          <PictureOutlined />
          绘画工作台
        </RouterLink>
        <RouterLink to="/studio">
          <VideoCameraOutlined />
          视频工作台
        </RouterLink>
        <RouterLink to="/studio">
          <AudioOutlined />
          音频工作台
        </RouterLink>
        <RouterLink to="/workbench">
          <FileTextOutlined />
          文档工作台
        </RouterLink>
      </section>
    </aside>

    <nav class="discovery-mobile-navigation" aria-label="发现页移动导航">
      <RouterLink to="/">首页</RouterLink>
      <button type="button" class="active">我的工具</button>
      <RouterLink to="/chat">AI 大模型</RouterLink>
      <RouterLink to="/agents">AI 智能体</RouterLink>
      <RouterLink to="/draw">绘画工具</RouterLink>
    </nav>

    <main class="discovery-main">
      <header class="discovery-intro">
        <div>
          <h1>发现适合你的 AI 能力</h1>
          <p>精选模型、智能体与效率工具，即开即用，让创作和工作更简单</p>
        </div>
      </header>

      <section class="discovery-overview">
        <div class="discovery-stats">
          <article class="discovery-stat">
            <span class="discovery-stat__icon discovery-stat__icon--blue">
              <AppstoreOutlined />
            </span>
            <div>
              <strong>6,421</strong>
              <small>AI 工具与模型</small>
            </div>
            <em>
              <PlusOutlined />
              本周新增 126
            </em>
          </article>

          <article class="discovery-stat">
            <span class="discovery-stat__icon discovery-stat__icon--green">
              <HeartFilled />
            </span>
            <div>
              <strong>8,920,436,118</strong>
              <small>本月累计 Tokens</small>
            </div>
            <em>稳定服务中</em>
          </article>
        </div>

        <article class="discovery-feature">
          <div class="discovery-feature__art" aria-hidden="true">
            <GalleryArtwork :variant="6" title="极光影像宣传视觉" />
          </div>
          <div class="discovery-feature__copy">
            <span>新模型上线</span>
            <h2>极光影像 3.0</h2>
            <p>高清视频生成 · 多模态参考 · 稳定快速不排队</p>
            <button type="button" @click="router.push('/studio')">
              立即体验
              <ArrowRightOutlined />
            </button>
          </div>
          <div class="discovery-feature__dots" aria-hidden="true">
            <i class="active" />
            <i />
            <i />
          </div>
        </article>
      </section>

      <section class="discovery-section">
        <header class="discovery-section__heading">
          <div>
            <h2>我的工具</h2>
            <p>收藏常用工具，下次使用更快捷</p>
          </div>
          <button type="button">查看全部</button>
        </header>

        <div class="discovery-empty">
          <span>
            <StarOutlined />
          </span>
          <strong>登录后即可收藏和同步常用工具</strong>
          <p>你的收藏会显示在这里，也可以按使用习惯自动排序。</p>
          <button type="button">立即登录</button>
        </div>
      </section>

      <section class="discovery-section">
        <header class="discovery-section__heading">
          <div>
            <h2>精选工具</h2>
            <p>从常用能力中挑选，覆盖创作、办公、图片与研究场景</p>
          </div>
          <span class="discovery-section__count">{{ filteredTools.length }} 个入口</span>
        </header>

        <div v-if="filteredTools.length" class="discovery-tool-grid">
          <article
            v-for="tool in filteredTools"
            :key="tool.title"
            class="discovery-tool-card"
            tabindex="0"
            @click="openTool(tool)"
            @keydown.enter="openTool(tool)"
          >
            <header>
              <span class="discovery-tool-card__glyph" :style="{ '--tool-accent': tool.accent }">
                {{ tool.glyph }}
              </span>
              <span class="discovery-tool-card__category">{{ tool.category }}</span>
              <button type="button" aria-label="收藏工具" @click.stop>
                <StarOutlined />
              </button>
            </header>
            <div class="discovery-tool-card__body">
              <h3>{{ tool.title }}</h3>
              <p>{{ tool.description }}</p>
            </div>
            <footer>
              <span>{{ tool.metric }}</span>
              <em>
                使用
                <ArrowRightOutlined />
              </em>
            </footer>
          </article>
        </div>

        <div v-else class="discovery-no-results">
          <SearchOutlined />
          <strong>没有找到匹配的工具</strong>
          <span>换个关键词试试，或者浏览左侧工具分类。</span>
          <button type="button" @click="query = ''">清除搜索</button>
        </div>
      </section>

      <section class="discovery-suggestion">
        <div>
          <span>
            <TranslationOutlined />
          </span>
          <div>
            <strong>还想要更多能力？</strong>
            <p>告诉我们你的工作流，我们会持续补充合适的 AI 工具。</p>
          </div>
        </div>
        <button type="button">提交工具建议</button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.discovery-page {
  display: grid;
  min-height: calc(100vh - 56px);
  grid-template-columns: 228px minmax(0, 1fr);
  background: #fff;
}

.discovery-sidebar {
  position: sticky;
  top: 56px;
  z-index: 10;
  height: calc(100vh - 56px);
  overflow-y: auto;
  padding: 12px 12px 28px;
  border-right: 1px solid #edf0f3;
  background: #fff;
  scrollbar-width: thin;
}

.discovery-sidebar__primary {
  display: grid;
  gap: 4px;
}

.discovery-sidebar__primary a,
.discovery-sidebar__primary button {
  display: grid;
  height: 40px;
  align-items: center;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr);
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #515a68;
  font-size: 11px;
  font-weight: 680;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.discovery-sidebar__primary a:hover,
.discovery-sidebar__primary button:hover {
  background: #f6f7f9;
}

.discovery-sidebar__primary a.active,
.discovery-sidebar__primary button.active {
  background: #3979ed;
  color: #fff;
}

.discovery-sidebar__primary :deep(svg) {
  width: 15px;
  height: 15px;
}

.discovery-sidebar__group {
  display: grid;
  gap: 2px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f1f2f4;
}

.discovery-sidebar__group header {
  display: grid;
  height: 38px;
  align-items: center;
  gap: 8px;
  grid-template-columns: 19px minmax(0, 1fr) auto;
  padding: 0 10px;
  color: #4f5865;
}

.discovery-sidebar__group header strong {
  font-size: 11px;
}

.discovery-sidebar__group header > :deep(svg) {
  color: #9ba2ad;
  font-size: 8px;
}

.discovery-sidebar__group-mark {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 5px;
  background: #eef2f7;
  color: #617086;
  font-size: 9px;
}

.discovery-sidebar__group-mark--rank {
  background: #fff4ef;
  color: #d97649;
}

.discovery-sidebar__group > button {
  height: 31px;
  padding: 0 10px 0 37px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #697382;
  font-size: 10px;
  text-align: left;
  cursor: pointer;
}

.discovery-sidebar__group > button:hover {
  background: #f6f7f9;
  color: #2f6fd8;
}

.discovery-sidebar__group--media a {
  display: flex;
  height: 33px;
  align-items: center;
  gap: 9px;
  padding: 0 10px 0 37px;
  border-radius: 6px;
  color: #697382;
  font-size: 10px;
  text-decoration: none;
}

.discovery-sidebar__group--media a:hover {
  background: #f6f7f9;
  color: #2f6fd8;
}

.discovery-sidebar__group--media :deep(svg) {
  width: 13px;
  height: 13px;
}

.discovery-mobile-navigation {
  display: none;
}

.discovery-main {
  min-width: 0;
  padding: 28px 34px 54px;
  background: #fff;
}

.discovery-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.discovery-intro h1 {
  margin: 0;
  color: #1d242e;
  font-size: 26px;
  font-weight: 860;
  letter-spacing: 0;
}

.discovery-intro p {
  margin: 8px 0 0;
  color: #7f8997;
  font-size: 10px;
}

.discovery-overview {
  display: grid;
  align-items: stretch;
  gap: 18px;
  grid-template-columns: 320px minmax(0, 1fr);
}

.discovery-stats {
  display: grid;
  gap: 13px;
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.discovery-stat {
  position: relative;
  display: grid;
  min-height: 105px;
  align-items: center;
  gap: 12px;
  grid-template-columns: 50px minmax(0, 1fr);
  padding: 16px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 5px 18px rgb(32 42 60 / 4%);
}

.discovery-stat__icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 9px;
  font-size: 19px;
}

.discovery-stat__icon--blue {
  background: #edf4ff;
  color: #3779eb;
}

.discovery-stat__icon--green {
  background: #eaf8ff;
  color: #1689bd;
}

.discovery-stat > div {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.discovery-stat strong {
  overflow: hidden;
  color: #202630;
  font-size: 20px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discovery-stat small {
  color: #858e9b;
  font-size: 10px;
}

.discovery-stat em {
  position: absolute;
  right: 13px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8d96a3;
  font-size: 8px;
  font-style: normal;
}

.discovery-stat em :deep(svg) {
  color: #28a377;
  font-size: 8px;
}

.discovery-feature {
  position: relative;
  min-height: 223px;
  overflow: hidden;
  border-radius: 8px;
  background: #181d24;
}

.discovery-feature__art {
  position: absolute;
  inset: 0 0 0 auto;
  width: 62%;
  opacity: 0.72;
}

.discovery-feature__art::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #181d24 0%, rgb(24 29 36 / 85%) 38%, rgb(24 29 36 / 18%) 100%);
  content: '';
}

.discovery-feature__art :deep(svg) {
  width: 100%;
  height: 100%;
}

.discovery-feature__copy {
  position: relative;
  z-index: 1;
  display: grid;
  max-width: 470px;
  align-content: center;
  min-height: 223px;
  padding: 28px 32px;
}

.discovery-feature__copy > span {
  color: #72e1bd;
  font-size: 9px;
  font-weight: 820;
}

.discovery-feature__copy h2 {
  margin: 7px 0 0;
  color: #fff;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: 0;
}

.discovery-feature__copy p {
  margin: 8px 0 0;
  color: rgb(255 255 255 / 72%);
  font-size: 10px;
}

.discovery-feature__copy button {
  display: inline-flex;
  width: max-content;
  height: 33px;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  padding: 0 13px;
  border: 0;
  border-radius: 7px;
  background: #fff;
  color: #202630;
  font-size: 9px;
  font-weight: 760;
  cursor: pointer;
}

.discovery-feature__dots {
  position: absolute;
  right: 22px;
  bottom: 15px;
  z-index: 2;
  display: flex;
  gap: 5px;
}

.discovery-feature__dots i {
  width: 13px;
  height: 3px;
  border-radius: 999px;
  background: rgb(255 255 255 / 36%);
}

.discovery-feature__dots i.active {
  width: 24px;
  background: #fff;
}

.discovery-section {
  margin-top: 30px;
}

.discovery-section__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 13px;
}

.discovery-section__heading h2 {
  margin: 0;
  color: #232a34;
  font-size: 19px;
  font-weight: 840;
}

.discovery-section__heading p {
  margin: 5px 0 0;
  color: #8d95a1;
  font-size: 9px;
}

.discovery-section__heading > button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #3278e7;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.discovery-section__count {
  color: #9aa2ad;
  font-size: 9px;
}

.discovery-empty {
  display: grid;
  min-height: 176px;
  place-items: center;
  align-content: center;
  gap: 6px;
  border: 1px dashed #d9dee5;
  border-radius: 8px;
  background: #fbfcfd;
  text-align: center;
}

.discovery-empty > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  margin-bottom: 2px;
  color: #e5b541;
  font-size: 21px;
}

.discovery-empty strong {
  color: #5f6876;
  font-size: 12px;
}

.discovery-empty p {
  margin: 0;
  color: #9aa2ad;
  font-size: 9px;
}

.discovery-empty button {
  height: 32px;
  margin-top: 6px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: #3278e7;
  color: #fff;
  font-size: 10px;
  font-weight: 740;
  cursor: pointer;
}

.discovery-tool-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.discovery-tool-card {
  display: grid;
  min-height: 190px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  padding: 14px;
  border: 1px solid #e4e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(33 43 60 / 3%);
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.discovery-tool-card:hover,
.discovery-tool-card:focus-visible {
  border-color: #bed2f0;
  box-shadow: 0 10px 24px rgb(42 73 117 / 8%);
  outline: 0;
  transform: translateY(-2px);
}

.discovery-tool-card > header {
  display: grid;
  align-items: start;
  gap: 8px;
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.discovery-tool-card__glyph {
  display: grid;
  width: 37px;
  height: 37px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--tool-accent) 20%, white);
  border-radius: 9px;
  background: color-mix(in srgb, var(--tool-accent) 10%, white);
  color: var(--tool-accent);
  font-size: 11px;
  font-weight: 860;
}

.discovery-tool-card__category {
  align-self: center;
  justify-self: start;
  padding: 3px 7px;
  border-radius: 5px;
  background: #eef6ff;
  color: #2d78dc;
  font-size: 8px;
  font-weight: 740;
}

.discovery-tool-card > header button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #c2c8d0;
  cursor: pointer;
}

.discovery-tool-card > header button:hover {
  background: #f6f7f9;
  color: #e5b541;
}

.discovery-tool-card__body h3 {
  margin: 14px 0 0;
  color: #2b313b;
  font-size: 13px;
  font-weight: 790;
}

.discovery-tool-card__body p {
  display: -webkit-box;
  overflow: hidden;
  margin: 7px 0 0;
  color: #7e8794;
  font-size: 9px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.discovery-tool-card > footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f1f4;
}

.discovery-tool-card > footer > span {
  overflow: hidden;
  color: #9aa2ad;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discovery-tool-card > footer em {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  color: #2f74df;
  font-size: 8px;
  font-style: normal;
  font-weight: 750;
}

.discovery-no-results {
  display: grid;
  min-height: 280px;
  place-items: center;
  align-content: center;
  gap: 7px;
  border: 1px dashed #d9dee5;
  border-radius: 8px;
  color: #929aa6;
  text-align: center;
}

.discovery-no-results :deep(svg:first-child) {
  width: 28px;
  height: 28px;
  color: #c4cad2;
}

.discovery-no-results strong {
  color: #596270;
  font-size: 12px;
}

.discovery-no-results span {
  font-size: 9px;
}

.discovery-no-results button {
  height: 31px;
  margin-top: 5px;
  padding: 0 11px;
  border: 1px solid #dfe3e8;
  border-radius: 6px;
  background: #fff;
  color: #5f6876;
  font-size: 9px;
  cursor: pointer;
}

.discovery-suggestion {
  display: flex;
  min-height: 70px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 28px;
  padding: 13px 16px;
  border: 1px solid #e4e8ec;
  border-radius: 8px;
  background: #fafbfc;
}

.discovery-suggestion > div {
  display: flex;
  align-items: center;
  gap: 11px;
}

.discovery-suggestion > div > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 8px;
  background: #edf4ff;
  color: #3478e4;
}

.discovery-suggestion strong {
  color: #444d5a;
  font-size: 11px;
}

.discovery-suggestion p {
  margin: 4px 0 0;
  color: #929aa6;
  font-size: 8px;
}

.discovery-suggestion > button {
  height: 32px;
  flex: 0 0 auto;
  padding: 0 12px;
  border: 1px solid #dce1e7;
  border-radius: 7px;
  background: #fff;
  color: #5e6876;
  font-size: 9px;
  cursor: pointer;
}

@media (max-width: 1180px) {
  .discovery-tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .discovery-overview {
    grid-template-columns: 290px minmax(0, 1fr);
  }
}

@media (max-width: 980px) {
  .discovery-page {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .discovery-main {
    padding-right: 22px;
    padding-left: 22px;
  }

  .discovery-intro {
    align-items: stretch;
    flex-direction: column;
  }

  .discovery-overview {
    grid-template-columns: 1fr;
  }

  .discovery-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }
}

@media (max-width: 820px) {
  .discovery-page {
    display: block;
  }

  .discovery-sidebar {
    display: none;
  }

  .discovery-mobile-navigation {
    position: sticky;
    top: 56px;
    z-index: 20;
    display: flex;
    overflow-x: auto;
    gap: 5px;
    padding: 8px 12px;
    border-bottom: 1px solid #edf0f3;
    background: rgb(255 255 255 / 97%);
    scrollbar-width: none;
  }

  .discovery-mobile-navigation::-webkit-scrollbar {
    display: none;
  }

  .discovery-mobile-navigation a,
  .discovery-mobile-navigation button {
    min-width: max-content;
    height: 31px;
    padding: 0 11px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #626c7a;
    font-size: 9px;
    font-weight: 680;
    text-decoration: none;
    cursor: pointer;
  }

  .discovery-mobile-navigation a.active,
  .discovery-mobile-navigation button.active {
    background: #edf4ff;
    color: #2f72df;
  }

  .discovery-main {
    padding: 22px 16px 48px;
  }

  .discovery-tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .discovery-intro h1 {
    font-size: 22px;
  }

  .discovery-intro p {
    line-height: 1.65;
  }

  .discovery-stats {
    grid-template-columns: 1fr;
  }

  .discovery-stat strong {
    font-size: 18px;
  }

  .discovery-feature,
  .discovery-feature__copy {
    min-height: 210px;
  }

  .discovery-feature__copy {
    padding: 22px;
  }

  .discovery-feature__copy h2 {
    font-size: 25px;
  }

  .discovery-feature__art {
    width: 82%;
  }

  .discovery-tool-grid {
    grid-template-columns: 1fr;
  }

  .discovery-section__heading {
    align-items: flex-start;
  }

  .discovery-suggestion {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
