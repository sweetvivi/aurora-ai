<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BgColorsOutlined,
  CustomerServiceOutlined,
  DeploymentUnitOutlined,
  LeftOutlined,
  PictureOutlined,
  RightOutlined,
  RobotOutlined,
  ScissorOutlined,
  ShoppingOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { ref } from 'vue';
import GalleryArtwork from '@/components/GalleryArtwork.vue';
import type { ChatModel } from '@/app/api';

withDefaults(
  defineProps<{
    activeAlias?: string;
    models: ChatModel[];
  }>(),
  {
    activeAlias: '',
  },
);

const emit = defineEmits<{
  select: [alias: string];
}>();

const track = ref<HTMLElement | null>(null);

const campaigns = [
  {
    cta: '立即体验',
    description: '超清视频生成，多镜头叙事一次成片',
    eyebrow: '影像上新',
    title: '极光影像 3.0',
    to: '/video',
    tone: 'cyan',
    variant: 2,
  },
  {
    cta: '开始对话',
    description: '长任务推理，复杂项目一次说清',
    eyebrow: '旗舰模型',
    title: 'Aurora Chat 2.6',
    to: '/chat',
    tone: 'indigo',
    variant: 7,
  },
  {
    cta: '查看方案',
    description: '分镜、配音、字幕一次生成',
    eyebrow: '短剧特攻',
    title: '短视频工作台',
    to: '/video',
    tone: 'amber',
    variant: 5,
  },
  {
    cta: '了解权益',
    description: '工具、模型与云端能力统一接入',
    eyebrow: '会员权益',
    title: '限时开放中',
    to: '/map',
    tone: 'navy',
    variant: 0,
  },
];

const tabs = [
  { active: true, icon: RobotOutlined, label: '模型对话', to: '/' },
  { icon: PictureOutlined, label: '图片生成', to: '/image-generation' },
  { icon: BgColorsOutlined, label: 'AI 绘画', to: '/newdraw' },
  { icon: ScissorOutlined, label: '智能修图', to: '/retouch' },
  { icon: DeploymentUnitOutlined, label: '超级智能体', to: '/agents' },
  { icon: VideoCameraOutlined, label: '视频生成', to: '/video' },
  { icon: ShoppingOutlined, label: '电商工具', to: '/commerce' },
  { icon: AppstoreOutlined, label: 'AI 画布', to: '/canvas' },
  { icon: CustomerServiceOutlined, label: 'AI 音乐', to: '/music' },
];

const modelColors = ['#4c6ef5', '#7c5cff', '#15966e', '#e28732', '#2f8fd8', '#d1495b'];

function scrollModels(direction: -1 | 1) {
  const element = track.value;

  if (!element) {
    return;
  }

  element.scrollBy({
    behavior: 'smooth',
    left: direction * Math.max(element.clientWidth * 0.7, 240),
  });
}

function modelGlyph(model: ChatModel) {
  return model.displayName.trim().slice(0, 1).toUpperCase() || 'A';
}

function modelColor(index: number) {
  return modelColors[index % modelColors.length];
}

function modelDescription(model: ChatModel) {
  const text = `${model.alias} ${model.displayName}`.toLowerCase();

  if (text.includes('deepseek')) {
    return '深度推理旗舰';
  }

  if (text.includes('qwen') || text.includes('通义')) {
    return '中文办公与创作';
  }

  if (text.includes('llama')) {
    return '开源多语言模型';
  }

  if (text.includes('gpt') || text.includes('openai')) {
    return '通用对话与推理';
  }

  return '通用对话与推理';
}

function isExternal(to: string) {
  return to === '/video';
}
</script>

<template>
  <section class="home-discovery" aria-label="首页推荐">
    <div class="home-discovery__campaigns">
      <RouterLink
        v-for="campaign in campaigns"
        :key="campaign.title"
        :to="campaign.to"
        :rel="isExternal(campaign.to) ? 'noopener noreferrer' : undefined"
        :target="isExternal(campaign.to) ? '_blank' : undefined"
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
    </div>

    <section class="home-discovery__models">
      <header>
        <h2>一键使用顶尖AI模型</h2>
        <div class="home-discovery__arrows">
          <button type="button" aria-label="向左滚动模型" @click="scrollModels(-1)">
            <LeftOutlined />
          </button>
          <button type="button" aria-label="向右滚动模型" @click="scrollModels(1)">
            <RightOutlined />
          </button>
        </div>
      </header>

      <div ref="track" class="home-discovery__track">
        <button
          v-for="(model, index) in models"
          :key="model.alias"
          type="button"
          class="home-model"
          :class="{ active: model.alias === activeAlias }"
          :style="{ '--model-color': modelColor(index) }"
          @click="emit('select', model.alias)"
        >
          <span class="home-model__glyph">{{ modelGlyph(model) }}</span>
          <span class="home-model__copy">
            <strong>{{ model.displayName }}</strong>
            <small>{{ modelDescription(model) }}</small>
          </span>
          <em>New</em>
        </button>

        <p v-if="models.length === 0" class="home-discovery__empty">模型列表加载中</p>
      </div>
    </section>

    <nav class="home-discovery__tabs" aria-label="热门工具">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.label"
        :to="tab.to"
        :class="{ active: tab.active }"
        :rel="isExternal(tab.to) ? 'noopener noreferrer' : undefined"
        :target="isExternal(tab.to) ? '_blank' : undefined"
      >
        <component :is="tab.icon" />
        <span>{{ tab.label }}</span>
      </RouterLink>
    </nav>
  </section>
</template>

<style scoped>
.home-discovery {
  display: block;
  padding: 14px 28px 0;
  background: #fff;
}

.home-discovery__campaigns {
  display: grid;
  gap: 12px;
  grid-template-columns: 1.32fr 1fr 1fr 1fr;
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
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.home-campaign:hover {
  border-color: #c8d0da;
  box-shadow: 0 14px 28px rgb(20 30 48 / 12%);
  transform: translateY(-2px);
}

.home-campaign::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgb(8 12 22 / 92%),
    rgb(8 12 22 / 48%) 70%,
    rgb(8 12 22 / 14%)
  );
  content: '';
}

.home-campaign--indigo::after {
  background: linear-gradient(
    90deg,
    rgb(10 14 48 / 94%),
    rgb(21 30 82 / 58%) 72%,
    rgb(14 26 72 / 16%)
  );
}

.home-campaign--amber::after {
  background: linear-gradient(
    90deg,
    rgb(72 30 14 / 93%),
    rgb(116 52 22 / 60%) 72%,
    rgb(104 44 16 / 18%)
  );
}

.home-campaign--navy::after {
  background: linear-gradient(
    90deg,
    rgb(7 22 62 / 94%),
    rgb(16 38 92 / 60%) 72%,
    rgb(12 32 80 / 18%)
  );
}

.home-campaign__art {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.9;
}

.home-campaign__copy {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 132px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 15px 17px;
}

.home-campaign__copy > span {
  padding: 3px 6px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 5px;
  color: rgb(255 255 255 / 82%);
  font-size: 10px;
  letter-spacing: 0;
}

.home-campaign__copy > strong {
  font-size: 17px;
  font-weight: 700;
}

.home-campaign__copy > p {
  margin: 0;
  color: rgb(255 255 255 / 72%);
  font-size: 11px;
  line-height: 1.5;
}

.home-campaign__copy > em {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  font-style: normal;
}

.home-discovery__models {
  margin-top: 16px;
}

.home-discovery__models > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.home-discovery__models h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.home-discovery__arrows {
  display: flex;
  gap: 6px;
}

.home-discovery__arrows button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  padding: 0;
  border: 1px solid #e2e6ec;
  border-radius: 999px;
  background: #fff;
  color: #5b6472;
  cursor: pointer;
}

.home-discovery__arrows button:hover {
  border-color: #c7d0dc;
  color: #2f3a4d;
}

.home-discovery__track {
  display: flex;
  overflow-x: auto;
  gap: 10px;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.home-model {
  display: flex;
  min-width: 220px;
  max-width: 220px;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border: 1px solid #e5e9ef;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.home-model:hover,
.home-model.active {
  border-color: color-mix(in srgb, var(--model-color) 45%, #ffffff);
  box-shadow: 0 8px 18px rgb(24 33 52 / 8%);
}

.home-model__glyph {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--model-color) 16%, #ffffff);
  color: var(--model-color);
  font-size: 13px;
  font-weight: 700;
}

.home-model__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.home-model__copy strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-model__copy small {
  overflow: hidden;
  color: #7c8696;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-model em {
  margin-left: auto;
  padding: 2px 5px;
  border-radius: 999px;
  background: #fdeaea;
  color: #e2453c;
  font-size: 9px;
  font-style: normal;
  line-height: 1.4;
}

.home-discovery__empty {
  margin: 0;
  color: #8a93a2;
  font-size: 12px;
}

.home-discovery__tabs {
  display: flex;
  overflow-x: auto;
  gap: 22px;
  margin-top: 14px;
  border-bottom: 1px solid #eef0f4;
  scrollbar-width: none;
}

.home-discovery__tabs a {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 7px;
  padding: 0 0 11px;
  color: #4a5464;
  font-size: 13px;
  font-weight: 550;
  text-decoration: none;
  white-space: nowrap;
}

.home-discovery__tabs a > svg {
  font-size: 15px;
}

.home-discovery__tabs a:hover {
  color: #1f2a3d;
}

.home-discovery__tabs a.active {
  color: #2a6bf2;
}

.home-discovery__tabs a.active::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: 2px;
  background: #2a6bf2;
  content: '';
}

@media (max-width: 1180px) {
  .home-discovery__campaigns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .home-discovery {
    padding: 12px 14px 0;
  }

  .home-discovery__campaigns {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-campaign,
  .home-campaign__copy {
    min-height: 116px;
  }

  .home-model {
    min-width: 190px;
    max-width: 190px;
  }

  .home-discovery__tabs {
    gap: 18px;
  }
}
</style>
