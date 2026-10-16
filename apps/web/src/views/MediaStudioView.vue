<script setup lang="ts">
import { ref } from 'vue';
import { Button, Segmented } from 'ant-design-vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const mode = ref<string | number>('视频');
const modes = ['视频', '音频', '音乐', '语音'];

const mediaTasks = [
  { description: '通过文本描述生成短视频素材', glyph: '视', title: '文生视频' },
  { description: '基于参考图片控制镜头与运动', glyph: '动', title: '图生视频' },
  { description: '镜头对齐、口型和字幕处理', glyph: '剪', title: '视频编辑' },
  { description: '批量生成旁白和声音内容', glyph: '声', title: '语音合成' },
];
</script>

<template>
  <div class="media-studio">
    <PageHeader
      eyebrow="Media production"
      title="媒体工作室"
      description="视频、音频、音乐和语音任务统一使用提交、轮询、结果查询和失败退回模式。"
    >
      <template #actions>
        <Button>新建任务</Button>
      </template>
    </PageHeader>

    <section class="media-studio__mode">
      <Segmented v-model:value="mode" :options="modes" />
      <div>
        <StatusBadge tone="accent">M4 产品线</StatusBadge>
        <StatusBadge>任务队列待接入</StatusBadge>
      </div>
    </section>

    <section class="media-grid">
      <article v-for="task in mediaTasks" :key="task.title" class="media-card">
        <div class="media-card__preview">
          <span aria-hidden="true">{{ task.glyph }}</span>
          <div class="media-card__timeline" />
        </div>
        <div class="media-card__copy">
          <strong>{{ task.title }}</strong>
          <p>{{ task.description }}</p>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.media-studio {
  display: grid;
  width: min(100%, 1380px);
  margin: 0 auto;
  gap: 28px;
  padding: 34px 24px 48px;
}

.media-studio :deep(.page-header h1) {
  color: #fff;
}

.media-studio :deep(.page-header p),
.media-studio :deep(.muted-label) {
  color: #9eabbc;
}

.media-studio :deep(.page-header .ant-btn) {
  border-color: #455164;
  background: #232d3e;
  color: #fff;
}

.media-studio__mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
  border: 1px solid #2d394c;
  border-radius: 8px;
  background: #1d2636;
}

.media-studio__mode > div {
  display: flex;
  gap: 7px;
}

.media-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.media-card {
  overflow: hidden;
  border: 1px solid #2e394b;
  border-radius: 8px;
  background: #1c2636;
}

.media-card__preview {
  position: relative;
  display: grid;
  min-height: 190px;
  place-items: center;
  overflow: hidden;
  border-bottom: 1px solid #2e394b;
  background: #232e40;
}

.media-card__preview > span {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid #526076;
  border-radius: 9px;
  color: #dbe4ee;
  font-size: 16px;
  font-weight: 760;
}

.media-card__timeline {
  position: absolute;
  right: 18px;
  bottom: 18px;
  left: 18px;
  height: 5px;
  border-radius: 999px;
  background: #303d51;
}

.media-card__timeline::before {
  display: block;
  width: 28%;
  height: 100%;
  border-radius: inherit;
  background: #e65f3c;
  content: '';
}

.media-card__copy {
  padding: 16px;
}

.media-card__copy strong {
  color: #fff;
  font-size: 15px;
}

.media-card__copy p {
  margin: 7px 0 0;
  color: #9daabc;
  font-size: 12px;
  line-height: 1.65;
}

@media (max-width: 760px) {
  .media-studio {
    padding: 26px 14px 38px;
  }

  .media-studio__mode {
    align-items: flex-start;
    flex-direction: column;
  }

  .media-grid {
    grid-template-columns: 1fr;
  }
}
</style>
