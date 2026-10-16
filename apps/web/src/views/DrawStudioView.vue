<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Input, Segmented, Select } from 'ant-design-vue';
import StatusBadge from '@/components/StatusBadge.vue';

const TextArea = Input.TextArea;

const ratio = ref('1:1');
const ratioOptions = ['1:1', '4:3', '16:9', '9:16'];
const qualityOptions = [
  { label: '标准', value: 'standard' },
  { label: '精细', value: 'high' },
];
const styleOptions = [
  { label: '自动', value: 'auto' },
  { label: '产品摄影', value: 'product' },
  { label: '插画', value: 'illustration' },
  { label: '概念设计', value: 'concept' },
];

const ratioClass = computed(() => String(ratio.value).replace(':', '-'));
</script>

<template>
  <div class="draw-studio">
    <aside class="draw-studio__controls">
      <div class="draw-studio__heading">
        <div>
          <span class="muted-label">Generation</span>
          <h1>AI 绘画</h1>
        </div>
        <StatusBadge tone="accent">M1</StatusBadge>
      </div>

      <label class="field-group">
        <span>提示词</span>
        <TextArea
          :auto-size="{ minRows: 7, maxRows: 10 }"
          placeholder="描述画面主体、环境和视觉风格"
        />
      </label>

      <div class="field-group">
        <span>画面比例</span>
        <Segmented v-model:value="ratio" :options="ratioOptions" block />
      </div>

      <label class="field-group">
        <span>质量</span>
        <Select :options="qualityOptions" value="standard" />
      </label>

      <label class="field-group">
        <span>风格</span>
        <Select :options="styleOptions" value="auto" />
      </label>

      <Button type="primary" size="large" block>生成图像</Button>
    </aside>

    <section class="draw-studio__canvas">
      <div class="draw-studio__toolbar">
        <StatusBadge>0 / 10 张</StatusBadge>
        <StatusBadge>本地存储 adapter</StatusBadge>
      </div>

      <div class="canvas-stage">
        <div class="canvas-stage__frame" :class="`canvas-stage__frame--${ratioClass}`">
          <div class="canvas-stage__grid" aria-hidden="true" />
          <span>等待生成任务</span>
          <small>图像结果将在任务队列完成后显示</small>
        </div>
      </div>

      <div class="draw-studio__tray">
        <span class="muted-label">Generated assets</span>
        <div class="draw-studio__empty-tray">生成结果会出现在这里</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.draw-studio {
  display: grid;
  min-height: calc(100vh - 62px);
  grid-template-columns: 330px minmax(0, 1fr);
}

.draw-studio__controls {
  display: grid;
  align-content: start;
  gap: 17px;
  padding: 22px 18px;
  border-right: 1px solid #2c3749;
  background: #1a2333;
}

.draw-studio__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.draw-studio__heading :deep(.muted-label) {
  color: #8fa0b6;
}

.draw-studio__heading h1 {
  margin: 7px 0 0;
  color: #fff;
  font-size: 24px;
}

.field-group {
  display: grid;
  gap: 7px;
  color: #dce3ec;
  font-size: 11px;
  font-weight: 660;
}

.field-group :deep(.ant-input),
.field-group :deep(.ant-select-selector) {
  border-color: #39465a !important;
  background: #222d3f !important;
  color: #edf2f7 !important;
  box-shadow: none !important;
}

.field-group :deep(textarea) {
  color: #edf2f7;
  resize: none;
}

.field-group :deep(.ant-input::placeholder) {
  color: #77869b;
}

.draw-studio__canvas {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #e8ecef;
}

.draw-studio__toolbar {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.canvas-stage {
  display: grid;
  min-height: 440px;
  place-items: center;
  padding: 32px;
}

.canvas-stage__frame {
  position: relative;
  display: grid;
  width: min(100%, 620px);
  aspect-ratio: 1;
  place-items: center;
  align-content: center;
  gap: 6px;
  overflow: hidden;
  border: 1px solid #c4cdd4;
  border-radius: 7px;
  background: #f5f7f8;
  color: #5e6b7b;
  box-shadow: 0 22px 52px rgb(23 32 51 / 11%);
}

.canvas-stage__frame--4-3 {
  aspect-ratio: 4 / 3;
}

.canvas-stage__frame--16-9 {
  aspect-ratio: 16 / 9;
}

.canvas-stage__frame--9-16 {
  width: min(72%, 420px);
  aspect-ratio: 9 / 16;
}

.canvas-stage__grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgb(23 32 51 / 6%) 1px, transparent 1px),
    linear-gradient(rgb(23 32 51 / 6%) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(to bottom, #000, transparent);
}

.canvas-stage__frame span,
.canvas-stage__frame small {
  position: relative;
  z-index: 1;
}

.canvas-stage__frame span {
  font-size: 14px;
  font-weight: 700;
}

.canvas-stage__frame small {
  color: #8b96a3;
  font-size: 10px;
}

.draw-studio__tray {
  padding: 15px 16px;
  border-top: 1px solid var(--line);
  background: #fff;
}

.draw-studio__empty-tray {
  display: grid;
  min-height: 66px;
  place-items: center;
  margin-top: 8px;
  border: 1px dashed #cfd7dd;
  border-radius: 6px;
  color: #8a96a4;
  font-size: 11px;
}

@media (max-width: 900px) {
  .draw-studio {
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .draw-studio__controls {
    border-right: 0;
  }
}
</style>
