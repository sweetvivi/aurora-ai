<script setup lang="ts">
import { ArrowRightOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import GalleryArtwork from '@/components/GalleryArtwork.vue';
import {
  resolveModuleIcon,
  useModuleCatalogStore,
  type ModuleCatalogItem,
} from '@/stores/module-catalog';

interface ToolItem {
  color: string;
  cover?: string;
  description: string;
  icon: Component;
  label: string;
  soft: string;
  to: string;
}

interface ModelItem {
  badge: string;
  color: string;
  description: string;
  glyph: string;
  name: string;
  soft: string;
}

interface CampaignItem {
  cta: string;
  description: string;
  eyebrow: string;
  title: string;
  to: string;
  tone: 'dusk' | 'mint' | 'night' | 'warm';
  variant: number;
}

interface QuickTabItem {
  icon: Component;
  label: string;
  to: string;
}

const router = useRouter();
const moduleCatalogStore = useModuleCatalogStore();
const prompt = ref('');
const selectedModel = ref('Aurora Chat 2.6');

const quickPrompts = ['写一份周报', '生成长文大纲', '拆解产品需求', '设计活动海报'];

const campaigns: CampaignItem[] = [
  {
    cta: '立即体验',
    description: '高清视频生成 · 多模态参考 · 稳定快速不排队',
    eyebrow: '新模型上线',
    title: '极光影像 3.0',
    to: '/video',
    tone: 'dusk',
    variant: 6,
  },
  {
    cta: '开始对话',
    description: '旗舰模型，适合长任务、深度推理与多模态创作',
    eyebrow: '旗舰模型',
    title: 'Aurora Chat 2.6',
    to: '/chat',
    tone: 'night',
    variant: 0,
  },
  {
    cta: '浏览场景',
    description: '6000+ 预设助手覆盖写作、设计与数据分析',
    eyebrow: '智能体精选',
    title: '专业助手直接开工',
    to: '/agents',
    tone: 'mint',
    variant: 3,
  },
  {
    cta: '查看权益',
    description: '工具、模型与云端能力统一接入',
    eyebrow: '极光创作季',
    title: '会员权益限时开放',
    to: '/map',
    tone: 'warm',
    variant: 7,
  },
];

const models: ModelItem[] = [
  {
    badge: '推荐',
    color: '#4c84ff',
    description: '旗舰通用模型，适合日常创作与复杂任务',
    glyph: 'A',
    name: 'Aurora Chat 2.6',
    soft: '#edf3ff',
  },
  {
    badge: '新上线',
    color: '#7758f4',
    description: '深度推理与长链任务执行',
    glyph: 'R',
    name: 'Aurora Reason',
    soft: '#f1edff',
  },
  {
    badge: '快速',
    color: '#25ae68',
    description: '轻快高效，适合日常工作学习',
    glyph: 'F',
    name: 'Aurora Fast',
    soft: '#eaf9f0',
  },
  {
    badge: '视觉',
    color: '#e07b48',
    description: '图像理解、设计与多模态分析',
    glyph: 'V',
    name: 'Aurora Vision',
    soft: '#fff2e9',
  },
  {
    badge: '代码',
    color: '#2d8f9d',
    description: '代码生成、解释与工程任务',
    glyph: 'C',
    name: 'Aurora Code',
    soft: '#e8f7f8',
  },
];

const homeTabs = computed<QuickTabItem[]>(() =>
  moduleCatalogStore.catalogItems
    .filter((item) => item.presentation.homeTab)
    .map((item) => ({
      icon: resolveModuleIcon(item.icon),
      label: item.name,
      to: item.route,
    })),
);

const tools = computed<ToolItem[]>(() =>
  moduleCatalogStore.catalogItems.filter((item) => item.presentation.featured).map(toToolItem),
);

const categories = computed<ToolItem[]>(() =>
  moduleCatalogStore.catalogItems.filter((item) => item.presentation.category).map(toToolItem),
);

function submitPrompt(): void {
  const query = prompt.value.trim();

  if (!query) {
    void router.push('/chat');
    return;
  }

  void router.push({
    path: '/chat',
    query: {
      prompt: query,
    },
  });
}

function toToolItem(item: ModuleCatalogItem): ToolItem {
  return {
    color: item.presentation.color,
    cover: item.cover ?? undefined,
    description: item.presentation.description || `${item.name} 已接入平台工作台`,
    icon: resolveModuleIcon(item.icon),
    label: item.name,
    soft: item.presentation.soft,
    to: item.route,
  };
}

onMounted(() => {
  void moduleCatalogStore.load();
});
</script>

<template>
  <div class="home-view">
    <section class="home-campaigns" aria-label="推荐活动">
      <RouterLink
        v-for="campaign in campaigns"
        :key="campaign.title"
        :to="campaign.to"
        :rel="campaign.to === '/video' ? 'noopener noreferrer' : undefined"
        :target="campaign.to === '/video' ? '_blank' : undefined"
        class="home-campaign"
        :class="`home-campaign--${campaign.tone}`"
      >
        <GalleryArtwork
          class="home-campaign__art"
          :title="campaign.title"
          :variant="campaign.variant"
        />
        <div class="home-campaign__copy">
          <span>{{ campaign.eyebrow }}</span>
          <strong>{{ campaign.title }}</strong>
          <p>{{ campaign.description }}</p>
          <em>
            {{ campaign.cta }}
            <ArrowRightOutlined />
          </em>
        </div>
      </RouterLink>
    </section>

    <section class="home-models">
      <div class="home-models__heading">
        <div>
          <h2>一键使用热门模型</h2>
          <p>选择模型后，可直接在下方描述任务</p>
        </div>
        <button type="button" @click="router.push('/map')">
          查看全部
          <ArrowRightOutlined />
        </button>
      </div>
      <div class="home-models__track">
        <button
          v-for="model in models"
          :key="model.name"
          type="button"
          class="home-model"
          :class="{ active: selectedModel === model.name }"
          :style="{ '--model-color': model.color, '--model-soft': model.soft }"
          @click="selectedModel = model.name"
        >
          <span class="home-model__glyph">{{ model.glyph }}</span>
          <span class="home-model__copy">
            <strong>{{ model.name }}</strong>
            <small>{{ model.description }}</small>
          </span>
          <em>{{ model.badge }}</em>
        </button>
      </div>
    </section>

    <nav class="home-quick-tabs" aria-label="热门工具">
      <button
        v-for="item in homeTabs"
        :key="item.label"
        type="button"
        @click="router.push(item.to)"
      >
        <component :is="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <section class="home-hero">
      <span class="home-hero__model">
        <i />
        {{ selectedModel }} 已准备就绪
      </span>
      <h1>您好，今天想完成什么？</h1>
      <p>描述你的问题或创作目标，极光AI 会自动选择合适的工具与工作流。</p>

      <div class="home-prompt">
        <div class="home-prompt__tabs">
          <button class="active" type="button">智能创作</button>
          <button type="button" @click="router.push('/chat')">深度思考</button>
          <button type="button" @click="router.push('/map')">工具模式</button>
        </div>

        <textarea
          v-model="prompt"
          rows="4"
          placeholder="输入你的问题或创作需求，例如：为新品写一份发布方案，并配一张宣传海报"
          @keydown.ctrl.enter="submitPrompt"
        />

        <div class="home-prompt__footer">
          <div>
            <button v-for="item in quickPrompts" :key="item" type="button" @click="prompt = item">
              {{ item }}
            </button>
          </div>
          <button class="home-prompt__submit" type="button" @click="submitPrompt">
            <SendOutlined />
            立即生成
          </button>
        </div>
      </div>
    </section>

    <section class="home-section home-section--featured">
      <div class="home-section__heading">
        <div>
          <h2>开始创作</h2>
          <p>从常用入口进入完整工作台</p>
        </div>
        <button type="button" @click="router.push('/map')">
          全部工具
          <ArrowRightOutlined />
        </button>
      </div>

      <div class="featured-grid">
        <RouterLink
          v-for="(tool, index) in tools"
          :key="tool.label"
          :to="tool.to"
          :rel="tool.to === '/video' ? 'noopener noreferrer' : undefined"
          :target="tool.to === '/video' ? '_blank' : undefined"
          class="featured-card"
          :style="{ '--accent': tool.color, '--accent-soft': tool.soft }"
        >
          <div v-if="tool.cover" class="featured-card__art featured-card__art--cover">
            <img :alt="tool.label" :src="tool.cover" />
          </div>
          <div v-else-if="index === 1" class="featured-card__art">
            <GalleryArtwork :variant="4" title="AI 绘画示例作品" />
          </div>
          <div v-else class="featured-card__art featured-card__art--abstract">
            <component :is="tool.icon" />
            <span />
            <span />
            <span />
          </div>
          <div class="featured-card__content">
            <span class="featured-card__icon">
              <component :is="tool.icon" />
            </span>
            <div>
              <strong>{{ tool.label }}</strong>
              <p>{{ tool.description }}</p>
            </div>
            <ArrowRightOutlined class="featured-card__arrow" />
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="home-section">
      <div class="home-section__heading">
        <div>
          <h2>探索工具</h2>
          <p>按创作类型快速定位能力</p>
        </div>
      </div>

      <div class="category-grid">
        <RouterLink
          v-for="category in categories"
          :key="category.label"
          :to="category.to"
          class="category-card"
          :style="{ '--accent': category.color, '--accent-soft': category.soft }"
        >
          <span>
            <component :is="category.icon" />
          </span>
          <div>
            <strong>{{ category.label }}</strong>
            <p>{{ category.description }}</p>
          </div>
          <ArrowRightOutlined />
        </RouterLink>
      </div>
    </section>

    <section class="home-banner">
      <div>
        <span>超级智能体广场</span>
        <h2>选一个专业助手，直接开始任务</h2>
        <p>编程、学习、文案、翻译、数据分析等预设智能体已准备好。</p>
        <button type="button" @click="router.push('/agents')">
          <SearchOutlined />
          浏览智能体
        </button>
      </div>
      <div class="home-banner__cards" aria-hidden="true">
        <span>码</span>
        <span>文</span>
        <span>学</span>
        <span>译</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  min-height: calc(100vh - 56px);
  padding-bottom: 48px;
  background:
    radial-gradient(circle at 50% -80px, rgb(177 239 205 / 55%), transparent 430px), #f7f8fb;
}

.home-campaigns {
  display: grid;
  width: min(calc(100% - 40px), 1240px);
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 14px auto 0;
}

.home-campaign {
  position: relative;
  display: block;
  min-height: 132px;
  overflow: hidden;
  border: 1px solid #dfe4eb;
  border-radius: 11px;
  background: #172033;
  color: #fff;
  text-decoration: none;
  box-shadow: 0 10px 24px rgb(20 30 48 / 7%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.home-campaign::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgb(8 12 22 / 90%),
    rgb(8 12 22 / 45%) 72%,
    rgb(8 12 22 / 18%)
  );
  content: '';
}

.home-campaign--night::after {
  background: linear-gradient(
    90deg,
    rgb(5 15 45 / 94%),
    rgb(12 24 58 / 58%) 75%,
    rgb(8 20 48 / 18%)
  );
}

.home-campaign--mint::after {
  background: linear-gradient(
    90deg,
    rgb(8 45 33 / 94%),
    rgb(14 75 54 / 62%) 72%,
    rgb(15 74 55 / 22%)
  );
}

.home-campaign--warm::after {
  background: linear-gradient(
    90deg,
    rgb(70 31 17 / 93%),
    rgb(112 54 24 / 62%) 72%,
    rgb(101 45 18 / 20%)
  );
}

.home-campaign:hover {
  border-color: #c8d0da;
  box-shadow: 0 15px 30px rgb(20 30 48 / 12%);
  transform: translateY(-2px);
}

.home-campaign__art {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.94;
  transform: scale(1.03);
  transition: transform 220ms ease;
}

.home-campaign:hover .home-campaign__art {
  transform: scale(1.08);
}

.home-campaign__copy {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 132px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 15px 17px;
}

.home-campaign__copy > span {
  padding: 3px 6px;
  border: 1px solid rgb(255 255 255 / 17%);
  border-radius: 5px;
  background: rgb(255 255 255 / 11%);
  color: rgb(255 255 255 / 86%);
  font-size: 8px;
  font-weight: 780;
  letter-spacing: 0.04em;
}

.home-campaign__copy strong {
  max-width: 88%;
  margin-top: 8px;
  overflow: hidden;
  font-size: 17px;
  font-weight: 850;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-campaign__copy p {
  display: -webkit-box;
  max-width: 92%;
  overflow: hidden;
  margin: 6px 0 0;
  color: rgb(255 255 255 / 67%);
  font-size: 9px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home-campaign__copy em {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 9px;
  color: #fff;
  font-size: 9px;
  font-style: normal;
  font-weight: 750;
}

.home-models {
  max-width: 1240px;
  margin: 18px auto 0;
  padding: 0 24px;
}

.home-models__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.home-models__heading h2 {
  margin: 0;
  color: #222830;
  font-size: 15px;
}

.home-models__heading p {
  margin: 4px 0 0;
  color: #929aa6;
  font-size: 9px;
}

.home-models__heading button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6d7685;
  font-size: 9px;
  cursor: pointer;
}

.home-models__track {
  display: grid;
  gap: 9px;
  grid-auto-flow: column;
  grid-auto-columns: minmax(180px, 1fr);
  overflow-x: auto;
  padding-bottom: 3px;
  scrollbar-width: none;
}

.home-models__track::-webkit-scrollbar {
  display: none;
}

.home-model {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 82px;
  align-items: center;
  gap: 9px;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 12px;
  border: 1px solid #e5e8ed;
  border-radius: 9px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.home-model:hover,
.home-model.active {
  border-color: color-mix(in srgb, var(--model-color) 34%, #e5e8ed);
  box-shadow: 0 10px 24px rgb(32 44 65 / 7%);
  transform: translateY(-1px);
}

.home-model.active::after {
  position: absolute;
  right: 9px;
  bottom: 0;
  left: 9px;
  height: 2px;
  border-radius: 999px 999px 0 0;
  background: var(--model-color);
  content: '';
}

.home-model__glyph {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: var(--model-soft);
  color: var(--model-color);
  font-size: 13px;
  font-weight: 850;
}

.home-model__copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.home-model__copy strong {
  overflow: hidden;
  color: #323942;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-model__copy small {
  display: -webkit-box;
  overflow: hidden;
  color: #929aa6;
  font-size: 8px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home-model em {
  position: absolute;
  top: 7px;
  right: 8px;
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--model-soft);
  color: var(--model-color);
  font-size: 7px;
  font-style: normal;
  font-weight: 750;
}

.home-quick-tabs {
  display: flex;
  max-width: 1240px;
  align-items: center;
  gap: 2px;
  margin: 12px auto -6px;
  overflow-x: auto;
  padding: 0 24px;
  border-bottom: 1px solid #e8eaf0;
  scrollbar-width: none;
}

.home-quick-tabs::-webkit-scrollbar {
  display: none;
}

.home-quick-tabs button {
  display: inline-flex;
  min-width: max-content;
  height: 42px;
  align-items: center;
  gap: 6px;
  padding: 0 13px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #697382;
  font-size: 10px;
  font-weight: 680;
  cursor: pointer;
}

.home-quick-tabs button:first-child,
.home-quick-tabs button:hover {
  border-bottom-color: #25ae68;
  color: #168f54;
}

.home-quick-tabs button :deep(svg) {
  font-size: 13px;
}

.home-hero {
  display: grid;
  max-width: 1040px;
  justify-items: center;
  margin: 0 auto;
  padding: 24px 24px 22px;
  text-align: center;
}

.home-hero__model {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid #c8eeda;
  border-radius: 999px;
  background: rgb(255 255 255 / 72%);
  color: #4e7e65;
  font-size: 10px;
  font-weight: 750;
  box-shadow: 0 6px 18px rgb(34 116 72 / 6%);
}

.home-hero__model i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #25ae68;
  box-shadow: 0 0 0 3px rgb(37 174 104 / 12%);
}

.home-hero h1 {
  margin: 13px 0 0;
  color: #162019;
  font-size: 29px;
  font-weight: 860;
  letter-spacing: -0.035em;
}

.home-hero > p {
  margin: 10px 0 0;
  color: #747d8b;
  font-size: 13px;
}

.home-prompt {
  width: min(100%, 780px);
  margin-top: 18px;
  padding: 15px;
  border: 1px solid #dfe4e9;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 44px rgb(38 67 49 / 9%);
  text-align: left;
}

.home-prompt__tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.home-prompt__tabs button {
  height: 29px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #727b89;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.home-prompt__tabs button.active {
  background: #eaf9f0;
  color: #168f54;
}

.home-prompt textarea {
  display: block;
  width: 100%;
  min-height: 102px;
  padding: 10px 6px;
  border: 0;
  outline: 0;
  color: #252a31;
  font-size: 14px;
  line-height: 1.75;
  resize: none;
}

.home-prompt textarea::placeholder {
  color: #a6acb6;
}

.home-prompt__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-top: 11px;
  border-top: 1px solid #f0f1f4;
}

.home-prompt__footer > div {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.home-prompt__footer > div button {
  padding: 5px 8px;
  border: 1px solid #e7e9ee;
  border-radius: 6px;
  background: #fff;
  color: #737c8b;
  font-size: 9px;
  cursor: pointer;
}

.home-prompt__footer > div button:hover {
  border-color: #b8dec9;
  color: #168f54;
}

.home-prompt__submit {
  display: inline-flex;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 0 15px;
  border: 0;
  border-radius: 8px;
  background: #25ae68;
  color: #fff;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 7px 16px rgb(37 174 104 / 22%);
}

.home-section {
  max-width: 1240px;
  margin: 18px auto 0;
  padding: 0 24px;
}

.home-section--featured {
  margin-top: 8px;
}

.home-section__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.home-section__heading h2 {
  margin: 0;
  font-size: 17px;
}

.home-section__heading p {
  margin: 5px 0 0;
  color: #9098a6;
  font-size: 10px;
}

.home-section__heading > button {
  display: inline-flex;
  height: 31px;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid #e2e5ea;
  border-radius: 7px;
  background: #fff;
  color: #6b7483;
  font-size: 10px;
  cursor: pointer;
}

.featured-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.featured-card {
  overflow: hidden;
  border: 1px solid #e6e8ed;
  border-radius: 11px;
  background: #fff;
  color: inherit;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.featured-card:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, #dfe3e9);
  box-shadow: 0 14px 30px rgb(28 48 37 / 8%);
  transform: translateY(-2px);
}

.featured-card__art {
  height: 132px;
  overflow: hidden;
  background: var(--accent-soft);
}

.featured-card__art :deep(svg) {
  width: 100%;
  height: 100%;
}

.featured-card__art--cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-card__art--abstract {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--accent);
}

.featured-card__art--abstract::before {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  content: '';
}

.featured-card__art--abstract > svg {
  position: relative;
  z-index: 1;
  width: 38px;
  height: 38px;
}

.featured-card__art--abstract span {
  position: absolute;
  width: 78px;
  height: 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 25%, white);
}

.featured-card__art--abstract span:nth-of-type(1) {
  top: 24px;
  right: 24px;
  transform: rotate(-12deg);
}

.featured-card__art--abstract span:nth-of-type(2) {
  bottom: 28px;
  left: 16px;
  width: 58px;
  transform: rotate(16deg);
}

.featured-card__art--abstract span:nth-of-type(3) {
  right: 18px;
  bottom: 21px;
  width: 34px;
}

.featured-card__content {
  display: grid;
  align-items: center;
  gap: 9px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 13px;
}

.featured-card__icon {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent);
}

.featured-card__content strong {
  font-size: 12px;
}

.featured-card__content p {
  margin: 4px 0 0;
  color: #8b93a1;
  font-size: 9px;
  line-height: 1.5;
}

.featured-card__arrow {
  color: #b1b7c0;
  font-size: 11px;
}

.category-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.category-card {
  display: grid;
  min-height: 76px;
  align-items: center;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 12px;
  border: 1px solid #e6e8ed;
  border-radius: 9px;
  background: #fff;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}

.category-card:hover {
  border-color: color-mix(in srgb, var(--accent) 28%, #dfe3e9);
  transform: translateY(-1px);
}

.category-card > span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent);
}

.category-card strong {
  font-size: 11px;
}

.category-card p {
  margin: 4px 0 0;
  color: #9199a6;
  font-size: 9px;
}

.category-card > svg {
  color: #b2b8c1;
  font-size: 10px;
}

.home-banner {
  display: flex;
  max-width: 1192px;
  min-height: 174px;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  margin: 24px auto 0;
  padding: 28px 34px;
  overflow: hidden;
  border: 1px solid #bfe6d0;
  border-radius: 12px;
  background:
    radial-gradient(circle at 74% 18%, rgb(255 255 255 / 72%), transparent 210px),
    linear-gradient(135deg, #e9f9f0, #eff5ff);
}

.home-banner > div:first-child {
  max-width: 540px;
}

.home-banner span {
  color: #178f54;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.home-banner h2 {
  margin: 8px 0 0;
  color: #15281c;
  font-size: 22px;
}

.home-banner p {
  margin: 8px 0 0;
  color: #6f7b72;
  font-size: 11px;
}

.home-banner button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 6px;
  margin-top: 15px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: #25ae68;
  color: #fff;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}

.home-banner__cards {
  position: relative;
  display: grid;
  width: 330px;
  height: 116px;
  flex: 0 0 330px;
  grid-template-columns: repeat(2, 108px);
  justify-content: end;
  gap: 12px;
  transform: rotate(-4deg);
}

.home-banner__cards span {
  display: grid;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 13px;
  background: rgb(255 255 255 / 76%);
  color: #27a866;
  font-size: 17px;
  font-weight: 850;
  box-shadow: 0 12px 25px rgb(31 82 52 / 9%);
}

.home-banner__cards span:nth-child(2) {
  color: #4c84ff;
  transform: translateY(17px);
}

.home-banner__cards span:nth-child(3) {
  color: #e49a34;
  transform: translateY(-8px);
}

.home-banner__cards span:nth-child(4) {
  color: #7758f4;
  transform: translateY(10px);
}

@media (max-width: 1080px) {
  .featured-grid,
  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .home-view {
    padding-bottom: 24px;
  }

  .home-campaigns {
    width: 100%;
    gap: 9px;
    grid-auto-columns: minmax(250px, 76vw);
    grid-auto-flow: column;
    grid-template-columns: none;
    margin-top: 12px;
    overflow-x: auto;
    padding: 0 12px 4px;
    scrollbar-width: none;
  }

  .home-campaigns::-webkit-scrollbar {
    display: none;
  }

  .home-campaign,
  .home-campaign__copy {
    min-height: 126px;
  }

  .home-models {
    margin-top: 16px;
    padding: 0 12px;
  }

  .home-models__track {
    grid-auto-columns: 190px;
  }

  .home-quick-tabs {
    margin-top: 10px;
    padding: 0 12px;
  }

  .home-hero {
    padding: 20px 12px 18px;
  }

  .home-hero h1 {
    font-size: 25px;
  }

  .home-hero > p {
    font-size: 11px;
  }

  .home-prompt__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .home-prompt__submit {
    justify-content: center;
  }

  .home-section {
    padding: 0 12px;
  }

  .featured-grid,
  .category-grid {
    grid-template-columns: 1fr;
  }

  .featured-card__art {
    height: 158px;
  }

  .home-banner {
    margin: 18px 12px 0;
    padding: 24px 20px;
  }

  .home-banner__cards {
    display: none;
  }
}
</style>
