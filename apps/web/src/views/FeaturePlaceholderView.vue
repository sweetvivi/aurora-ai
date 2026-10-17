<script setup lang="ts">
import {
  ApartmentOutlined,
  AudioOutlined,
  BgColorsOutlined,
  ShoppingCartOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface FeatureConfig {
  accent: string;
  description: string;
  icon: Component;
  label: string;
  title: string;
}

const route = useRoute();
const features: Record<string, FeatureConfig> = {
  'image-tools': {
    accent: '#d97722',
    description: '图片增强、修复、抠图与批量处理入口',
    icon: BgColorsOutlined,
    label: 'Image Tools',
    title: '图片处理',
  },
  'ai-canvas': {
    accent: '#7057d8',
    description: '节点编排、素材连接与多步骤创作工作流',
    icon: ApartmentOutlined,
    label: 'AI Canvas',
    title: 'AI 画布',
  },
  'commerce-tools': {
    accent: '#d05f76',
    description: '商品图、试衣、换背景与电商视觉效率工具',
    icon: ShoppingCartOutlined,
    label: 'Commerce Studio',
    title: '电商工具',
  },
  music: {
    accent: '#b44d91',
    description: '音乐生成、配音与声音处理入口',
    icon: AudioOutlined,
    label: 'Music Studio',
    title: 'AI 音乐',
  },
  video: {
    accent: '#4c74d9',
    description: '视频生成、镜头控制与智能剪辑入口',
    icon: VideoCameraOutlined,
    label: 'Video Studio',
    title: 'AI 视频',
  },
};
const fallbackFeature = features['ai-canvas'] as FeatureConfig;
const feature = computed(() => features[String(route.name)] ?? fallbackFeature);
</script>

<template>
  <section class="feature-placeholder" :style="{ '--feature-accent': feature.accent }">
    <header class="feature-placeholder__header">
      <span class="feature-placeholder__icon">
        <component :is="feature.icon" />
      </span>
      <div>
        <span>{{ feature.label }}</span>
        <h1>{{ feature.title }}</h1>
        <p>{{ feature.description }}</p>
      </div>
    </header>

    <div class="feature-placeholder__canvas">
      <div class="feature-placeholder__state">
        <i />
        <strong>功能建设中</strong>
        <span>入口已经保留，当前阶段先完成智能体和绘画主链路。</span>
      </div>
      <div class="feature-placeholder__blueprint" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  </section>
</template>

<style scoped>
.feature-placeholder {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 34px 28px 64px;
}

.feature-placeholder__header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.feature-placeholder__icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--feature-accent) 22%, white);
  border-radius: 9px;
  background: color-mix(in srgb, var(--feature-accent) 10%, white);
  color: var(--feature-accent);
  font-size: 19px;
}

.feature-placeholder__header > div {
  display: grid;
  gap: 5px;
}

.feature-placeholder__header > div > span {
  color: var(--feature-accent);
  font-size: 9px;
  font-weight: 820;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.feature-placeholder__header h1 {
  margin: 0;
  color: #252c35;
  font-size: 25px;
}

.feature-placeholder__header p {
  margin: 0;
  color: #858e9b;
  font-size: 10px;
}

.feature-placeholder__canvas {
  position: relative;
  display: grid;
  min-height: 430px;
  overflow: hidden;
  place-items: center;
  margin-top: 24px;
  border: 1px solid #e4e7eb;
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgb(31 44 61 / 4%) 1px, transparent 1px),
    linear-gradient(rgb(31 44 61 / 4%) 1px, transparent 1px), #fafbfc;
  background-size: 32px 32px;
}

.feature-placeholder__state {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 24px 28px;
  border: 1px solid #e2e6eb;
  border-radius: 8px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 16px 42px rgb(34 49 72 / 8%);
  text-align: center;
}

.feature-placeholder__state i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--feature-accent);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--feature-accent) 12%, white);
}

.feature-placeholder__state strong {
  margin-top: 5px;
  color: #313945;
  font-size: 14px;
}

.feature-placeholder__state span {
  color: #8d96a2;
  font-size: 9px;
}

.feature-placeholder__blueprint {
  position: absolute;
  inset: 24px;
  display: grid;
  align-content: center;
  gap: 12px;
  opacity: 0.55;
}

.feature-placeholder__blueprint span {
  display: block;
  height: 44px;
  border: 1px solid #e1e5ea;
  border-radius: 7px;
  background: rgb(255 255 255 / 80%);
}

.feature-placeholder__blueprint span:nth-child(1) {
  width: 36%;
}

.feature-placeholder__blueprint span:nth-child(2) {
  width: 72%;
  margin-left: 14%;
}

.feature-placeholder__blueprint span:nth-child(3) {
  width: 54%;
  margin-left: 6%;
}

.feature-placeholder__blueprint span:nth-child(4) {
  width: 80%;
  margin-left: 20%;
}

@media (max-width: 760px) {
  .feature-placeholder {
    padding: 24px 14px 48px;
  }

  .feature-placeholder__header h1 {
    font-size: 21px;
  }

  .feature-placeholder__canvas {
    min-height: 360px;
    margin-top: 18px;
  }

  .feature-placeholder__state {
    width: min(100%, 270px);
    padding-right: 18px;
    padding-left: 18px;
  }

  .feature-placeholder__blueprint {
    inset: 14px;
  }
}
</style>
