<script setup lang="ts">
import {
  AudioOutlined,
  CustomerServiceOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ScissorOutlined,
  SoundOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { ref } from 'vue';

interface MediaTask {
  accent: string;
  description: string;
  icon: Component;
  label: string;
  soft: string;
  title: string;
}

const tabs = ['视频', '音频', '音乐', '语音'];
const activeTab = ref('视频');

const tasks: MediaTask[] = [
  {
    accent: '#7758f4',
    description: '输入画面、镜头和风格描述，生成短视频素材。',
    icon: VideoCameraOutlined,
    label: '视频生成',
    soft: '#f2efff',
    title: '文生视频',
  },
  {
    accent: '#4c84ff',
    description: '上传首帧或参考图，控制主体与镜头运动。',
    icon: PlayCircleOutlined,
    label: '图生视频',
    soft: '#edf3ff',
    title: '图生视频',
  },
  {
    accent: '#25ae68',
    description: '镜头拼接、字幕、比例转换与口型处理。',
    icon: ScissorOutlined,
    label: '视频编辑',
    soft: '#eaf9f0',
    title: '智能剪辑',
  },
  {
    accent: '#e49a34',
    description: '根据脚本批量生成旁白、对白和声音内容。',
    icon: SoundOutlined,
    label: '语音合成',
    soft: '#fff5e5',
    title: '文本转语音',
  },
  {
    accent: '#d45f9a',
    description: '从主题、情绪和风格生成原创音乐片段。',
    icon: AudioOutlined,
    label: '音乐生成',
    soft: '#fff0f7',
    title: 'AI 音乐',
  },
  {
    accent: '#2ba9a3',
    description: '声音克隆、降噪、分离与音色转换。',
    icon: CustomerServiceOutlined,
    label: '音频处理',
    soft: '#e9f8f7',
    title: '音频工具',
  },
];
</script>

<template>
  <div class="media-studio">
    <header class="media-studio__header">
      <div>
        <span>Media Studio</span>
        <h1>媒体工作台</h1>
        <p>在一个工作流中完成视频、音频、音乐和语音任务。</p>
      </div>
      <button type="button">
        <PlusOutlined />
        新建媒体任务
      </button>
    </header>

    <section class="media-studio__tabs">
      <div>
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
      <span>任务队列与文件存储将在 M4 接入</span>
    </section>

    <section class="media-studio__hero">
      <div>
        <span class="media-studio__hero-icon">
          <VideoCameraOutlined />
        </span>
        <h2>把一段描述变成可见的画面</h2>
        <p>选择生成、剪辑或音频工具，创建你的第一个媒体任务。</p>
      </div>
      <div class="media-studio__timeline" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
        <i />
        <i />
      </div>
    </section>

    <section class="media-grid">
      <article
        v-for="task in tasks"
        :key="task.title"
        class="media-card"
        :style="{ '--accent': task.accent, '--accent-soft': task.soft }"
      >
        <header>
          <span>
            <component :is="task.icon" />
          </span>
          <small>{{ task.label }}</small>
        </header>
        <h3>{{ task.title }}</h3>
        <p>{{ task.description }}</p>
        <footer>
          <span>进入工作台</span>
          <button type="button">开始</button>
        </footer>
      </article>
    </section>
  </div>
</template>

<style scoped>
.media-studio {
  width: min(100%, 1280px);
  margin: 0 auto;
  padding: 32px 24px 52px;
}

.media-studio__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.media-studio__header span {
  color: #7758f4;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.media-studio__header h1 {
  margin: 8px 0 0;
  font-size: 28px;
}

.media-studio__header p {
  margin: 8px 0 0;
  color: #7c8593;
  font-size: 12px;
}

.media-studio__header > button {
  display: inline-flex;
  height: 38px;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: #7758f4;
  color: #fff;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}

.media-studio__tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 24px;
  padding: 10px;
  border: 1px solid #e6e8ed;
  border-radius: 10px;
  background: #fff;
}

.media-studio__tabs > div {
  display: flex;
  gap: 5px;
}

.media-studio__tabs button {
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #6e7786;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.media-studio__tabs button.active {
  background: #f1edff;
  color: #6c4ddf;
}

.media-studio__tabs > span {
  color: #9ba3af;
  font-size: 9px;
}

.media-studio__hero {
  position: relative;
  display: flex;
  min-height: 190px;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  margin-top: 16px;
  padding: 30px;
  overflow: hidden;
  border: 1px solid #ddd5ff;
  border-radius: 12px;
  background:
    radial-gradient(circle at 82% 20%, rgb(255 255 255 / 78%), transparent 250px),
    linear-gradient(135deg, #f0edff, #eef4ff);
}

.media-studio__hero > div:first-child {
  max-width: 560px;
}

.media-studio__hero-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #7758f4;
  color: #fff;
}

.media-studio__hero h2 {
  margin: 15px 0 0;
  font-size: 22px;
}

.media-studio__hero p {
  margin: 8px 0 0;
  color: #737d8b;
  font-size: 11px;
}

.media-studio__timeline {
  position: relative;
  display: grid;
  width: min(400px, 38%);
  height: 116px;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  transform: rotate(-3deg);
}

.media-studio__timeline span {
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 11px;
  background: rgb(255 255 255 / 68%);
  box-shadow: 0 12px 26px rgb(58 48 113 / 8%);
}

.media-studio__timeline i {
  position: absolute;
  right: 4px;
  bottom: 18px;
  width: 72%;
  height: 6px;
  border-radius: 999px;
  background: rgb(119 88 244 / 16%);
}

.media-studio__timeline i:nth-of-type(2) {
  bottom: 7px;
  width: 56%;
}

.media-studio__timeline i:nth-of-type(3) {
  right: auto;
  bottom: auto;
  top: 23px;
  left: 5px;
  width: 42%;
}

.media-grid {
  display: grid;
  gap: 13px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 18px;
}

.media-card {
  display: grid;
  min-height: 196px;
  align-content: start;
  padding: 16px;
  border: 1px solid #e6e8ed;
  border-radius: 10px;
  background: #fff;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.media-card:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, #dfe3e9);
  box-shadow: 0 14px 30px rgb(39 43 62 / 7%);
  transform: translateY(-2px);
}

.media-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.media-card header > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
}

.media-card header small {
  padding: 3px 7px;
  border-radius: 999px;
  background: #f5f6f8;
  color: #858e9c;
  font-size: 8px;
}

.media-card h3 {
  margin: 18px 0 0;
  font-size: 15px;
}

.media-card p {
  margin: 7px 0 0;
  color: #7d8694;
  font-size: 10px;
  line-height: 1.65;
}

.media-card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 18px;
}

.media-card footer > span {
  color: #9aa2ae;
  font-size: 9px;
}

.media-card footer button {
  height: 29px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
}

@media (max-width: 1000px) {
  .media-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .media-studio {
    padding: 24px 12px 40px;
  }

  .media-studio__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .media-studio__tabs {
    align-items: flex-start;
    flex-direction: column;
    overflow-x: auto;
  }

  .media-studio__tabs > div {
    min-width: max-content;
  }

  .media-studio__hero {
    padding: 24px 20px;
  }

  .media-studio__timeline {
    display: none;
  }

  .media-grid {
    grid-template-columns: 1fr;
  }
}
</style>
