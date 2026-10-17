<script setup lang="ts">
import {
  BgColorsOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExperimentOutlined,
  HighlightOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScanOutlined,
  ScissorOutlined,
  StarOutlined,
  ThunderboltFilled,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import type { FileAsset } from '@/app/api';
import {
  IMAGE_TASK_POINTS_COST,
  useDrawWorkspaceStore,
  type DrawWorkStatus,
} from '@/stores/draw-workspace';
import { useSessionStore } from '@/stores/session';

interface ModelOption {
  accent: string;
  label: string;
  value: string;
}

interface RetouchOperation {
  accent: string;
  description: string;
  glyph: string;
  icon: Component;
  label: string;
  prompt: string;
  value: string;
}

interface SourceImage {
  assetId: string;
  id: string;
  name: string;
  url: string;
}

const generationModels: ModelOption[] = [
  { accent: '#7157e8', label: '极光光影 2.1', value: 'generation-light-2' },
  { accent: '#2f8ddb', label: '高清写实 4.0', value: 'generation-realistic-4' },
  { accent: '#22a172', label: '商业摄影 3.0', value: 'generation-product-3' },
  { accent: '#d36c9b', label: '插画设计 3.0', value: 'generation-illustration-3' },
  { accent: '#d99a36', label: '国风水墨 1.8', value: 'generation-ink-1' },
  { accent: '#3979d5', label: '概念场景 2.4', value: 'generation-scene-2' },
];

const retouchOperations: RetouchOperation[] = [
  {
    accent: '#258b70',
    description: '增强光线、清晰度与材质细节',
    glyph: '清',
    icon: HighlightOutlined,
    label: '画质增强',
    prompt: '增强原图清晰度、光线层次和材质细节，保持人物或商品主体真实，不改变原有构图。',
    value: 'enhance',
  },
  {
    accent: '#3979d5',
    description: '无损放大并补全纹理细节',
    glyph: '放',
    icon: ScanOutlined,
    label: '超清放大',
    prompt: '将原图无损放大并补充自然纹理细节，避免过度锐化、涂抹和边缘光晕。',
    value: 'upscale',
  },
  {
    accent: '#d27b2f',
    description: '识别主体并生成透明或纯色背景',
    glyph: '抠',
    icon: ScissorOutlined,
    label: '一键抠图',
    prompt: '准确识别画面主体并保留发丝和边缘细节，移除原背景，输出干净清晰的商品或人物主体。',
    value: 'cutout',
  },
  {
    accent: '#8a62d6',
    description: '移除杂乱物体、水印或指定区域',
    glyph: '擦',
    icon: EditOutlined,
    label: '智能擦除',
    prompt: '移除用户指定的干扰物、瑕疵或水印，并根据周边内容自然补全背景。',
    value: 'erase',
  },
  {
    accent: '#2b9b9a',
    description: '保留主体并替换环境与氛围',
    glyph: '景',
    icon: PictureOutlined,
    label: '背景替换',
    prompt: '保留主体身份、结构、透视和光影，替换为自然协调的新背景，边缘融合真实。',
    value: 'background',
  },
  {
    accent: '#c95a6d',
    description: '统一色调、风格与摄影质感',
    glyph: '调',
    icon: BgColorsOutlined,
    label: '风格调整',
    prompt: '在不改变人物或商品身份的前提下，重新统一色调、光线和摄影风格。',
    value: 'restyle',
  },
];

const ratios = ['智能比例', '1:1', '4:3', '3:4', '16:9', '9:16'];
const sizes = ['1K', '2K', '4K'];
const amounts = [1, 2, 3, 4];
const route = useRoute();
const workspace = useDrawWorkspaceStore();
const sessionStore = useSessionStore();

const prompt = ref('');
const instruction = ref('');
const selectedAmount = ref(1);
const selectedModel = ref(generationModels[0]?.value ?? 'generation-light-2');
const selectedOperation = ref(retouchOperations[0]?.value ?? 'enhance');
const selectedRatio = ref('智能比例');
const selectedSize = ref('2K');
const retouchStrength = ref(65);
const sourceError = ref('');
const sourceImage = ref<SourceImage | null>(null);
const sourceInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

const isGeneration = computed(() => route.name === 'image-generation');
const toolKey = computed(() => (isGeneration.value ? 'image-generation' : 'smart-retouch'));
const pageTitle = computed(() => (isGeneration.value ? '图片生成' : '智能修图'));
const pageDescription = computed(() =>
  isGeneration.value
    ? '按描述生成可直接使用的商业视觉、摄影和设计素材。'
    : '上传一张图片，通过增强、抠图、擦除和背景替换完成快速精修。',
);
const activeOperation = computed(() =>
  retouchOperations.find((item) => item.value === selectedOperation.value),
);
const activeModelLabel = computed(
  () =>
    generationModels.find((item) => item.value === selectedModel.value)?.label ?? '图片生成模型',
);
const generationCost = computed(() =>
  isGeneration.value ? selectedAmount.value * IMAGE_TASK_POINTS_COST : IMAGE_TASK_POINTS_COST,
);
const visibleWorks = computed(() => workspace.works.filter((work) => work.tool === toolKey.value));
const submitting = computed(() => workspace.submitting || uploading.value);
const canSubmit = computed(() => {
  if (submitting.value) {
    return false;
  }

  return isGeneration.value ? Boolean(prompt.value.trim()) : Boolean(sourceImage.value);
});

function resetLocalForm(): void {
  prompt.value = '';
  instruction.value = '';
  selectedAmount.value = 1;
  selectedRatio.value = '智能比例';
  selectedSize.value = '2K';
  retouchStrength.value = 65;
  sourceError.value = '';

  if (sourceImage.value) {
    URL.revokeObjectURL(sourceImage.value.url);
    sourceImage.value = null;
  }
}

async function handleSourceUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploading.value = true;
  sourceError.value = '';

  try {
    const asset: FileAsset = await workspace.uploadReference(file);

    if (sourceImage.value) {
      URL.revokeObjectURL(sourceImage.value.url);
    }

    sourceImage.value = {
      assetId: asset.id,
      id: asset.id,
      name: asset.originalName,
      url: URL.createObjectURL(file),
    };
  } catch (error) {
    sourceError.value = error instanceof Error ? error.message : '图片上传失败，请重试';
  } finally {
    input.value = '';
    uploading.value = false;
  }
}

function removeSource(): void {
  if (!sourceImage.value) {
    return;
  }

  URL.revokeObjectURL(sourceImage.value.url);
  sourceImage.value = null;
  sourceError.value = '';
}

async function submitTask(): Promise<void> {
  if (!canSubmit.value) {
    if (!isGeneration.value && !sourceImage.value) {
      sourceError.value = '请先上传需要处理的图片';
    }
    return;
  }

  const operation = activeOperation.value;
  const taskPrompt = isGeneration.value
    ? prompt.value.trim()
    : [operation?.prompt, instruction.value.trim() ? `补充要求：${instruction.value.trim()}` : '']
        .filter(Boolean)
        .join('\n');

  await workspace.initialize();

  const createdWorks = await workspace.createGenerationWorks({
    amount: isGeneration.value ? selectedAmount.value : 1,
    extraParameters: isGeneration.value
      ? {
          mode: 'text-to-image',
        }
      : {
          mode: 'image-to-image',
          operation: operation?.value,
          strength: retouchStrength.value,
        },
    model: isGeneration.value ? selectedModel.value : 'smart-retouch',
    modelLabel: isGeneration.value ? activeModelLabel.value : (operation?.label ?? '智能修图'),
    prompt: taskPrompt,
    ratio: isGeneration.value ? selectedRatio.value : '保持原图',
    size: isGeneration.value ? selectedSize.value : selectedSize.value,
    sourceFileId: sourceImage.value?.assetId,
    toolKey: toolKey.value,
  });

  if (createdWorks.length > 0 && isGeneration.value) {
    prompt.value = '';
  }
}

function formatWorkTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(timestamp);
}

function workStatusLabel(status: DrawWorkStatus): string {
  const labels: Record<DrawWorkStatus, string> = {
    done: '已完成',
    failed: '处理失败',
    generating: '处理中',
    queued: '排队中',
  };

  return labels[status];
}

watch(
  () => route.name,
  () => {
    resetLocalForm();
  },
);

onMounted(() => {
  void workspace.initialize();
});

onBeforeUnmount(() => {
  if (sourceImage.value) {
    URL.revokeObjectURL(sourceImage.value.url);
  }
});
</script>

<template>
  <section class="image-tool-view">
    <header class="image-tool-header">
      <div class="image-tool-header__copy">
        <span>{{ isGeneration ? 'IMAGE CREATION' : 'SMART RETOUCH' }}</span>
        <h1>{{ pageTitle }}</h1>
        <p>{{ pageDescription }}</p>
      </div>
      <nav class="image-tool-header__switch" aria-label="图片工具切换">
        <RouterLink to="/draw">AI 绘画</RouterLink>
        <RouterLink :class="{ active: !isGeneration }" to="/retouch">智能修图</RouterLink>
        <RouterLink :class="{ active: isGeneration }" to="/image-generation">图片生成</RouterLink>
      </nav>
    </header>

    <div class="image-tool-layout">
      <aside class="image-tool-panel">
        <section v-if="isGeneration" class="image-tool-section">
          <header>
            <strong>生成模型</strong>
            <span>{{ generationModels.length }} 个可用模型</span>
          </header>
          <div class="image-model-grid">
            <button
              v-for="model in generationModels"
              :key="model.value"
              type="button"
              :class="{ active: selectedModel === model.value }"
              @click="selectedModel = model.value"
            >
              <i :style="{ '--model-accent': model.accent }">{{ model.label.slice(0, 1) }}</i>
              <span>{{ model.label }}</span>
              <CheckOutlined v-if="selectedModel === model.value" />
            </button>
          </div>
        </section>

        <section v-if="!isGeneration" class="image-tool-section">
          <header>
            <strong>原始图片</strong>
            <span>{{ uploading ? '上传中...' : '支持 JPG、PNG、WebP' }}</span>
          </header>
          <input
            ref="sourceInput"
            type="file"
            accept="image/*"
            hidden
            :disabled="uploading"
            @change="handleSourceUpload"
          />
          <div class="retouch-source">
            <div v-if="sourceImage" class="retouch-source__preview">
              <img :src="sourceImage.url" :alt="sourceImage.name" />
              <button type="button" aria-label="移除原始图片" @click="removeSource">
                <CloseOutlined />
              </button>
            </div>
            <button
              v-else
              type="button"
              class="retouch-source__empty"
              :disabled="uploading"
              @click="sourceInput?.click()"
            >
              <LoadingOutlined v-if="uploading" />
              <PlusOutlined v-else />
              <strong>{{ uploading ? '正在上传图片' : '上传一张图片' }}</strong>
              <small>建议使用主体清晰、光线充足的原图</small>
            </button>
          </div>
          <p v-if="sourceError" class="image-tool-field-error">{{ sourceError }}</p>
        </section>

        <label v-if="isGeneration" class="image-tool-prompt">
          <strong>图片描述</strong>
          <span>
            <textarea
              v-model="prompt"
              maxlength="1000"
              placeholder="描述画面主体、环境、光线、构图和风格"
            />
            <small>{{ prompt.length }} / 1000</small>
          </span>
        </label>

        <label v-if="!isGeneration" class="image-tool-prompt">
          <strong>补充要求</strong>
          <span>
            <textarea
              v-model="instruction"
              maxlength="600"
              placeholder="例如：保留商品标签，移除桌面杂物，光线更柔和"
            />
            <small>{{ instruction.length }} / 600</small>
          </span>
        </label>

        <section v-if="!isGeneration" class="image-tool-section">
          <header>
            <strong>选择处理方式</strong>
            <span>一次执行一个任务</span>
          </header>
          <div class="retouch-operation-grid">
            <button
              v-for="operation in retouchOperations"
              :key="operation.value"
              type="button"
              :class="{ active: selectedOperation === operation.value }"
              @click="selectedOperation = operation.value"
            >
              <i :style="{ '--operation-accent': operation.accent }">
                <component :is="operation.icon" />
              </i>
              <span>
                <strong>{{ operation.label }}</strong>
                <small>{{ operation.description }}</small>
              </span>
              <CheckOutlined v-if="selectedOperation === operation.value" />
            </button>
          </div>
        </section>

        <section v-if="isGeneration" class="image-tool-section image-tool-section--split">
          <header>
            <strong>画面比例</strong>
            <span>{{ selectedRatio }}</span>
          </header>
          <div class="image-option-grid">
            <button
              v-for="ratio in ratios"
              :key="ratio"
              type="button"
              :class="{ active: selectedRatio === ratio }"
              @click="selectedRatio = ratio"
            >
              {{ ratio }}
            </button>
          </div>
        </section>

        <section class="image-tool-section image-tool-section--split">
          <header>
            <strong>{{ isGeneration ? '输出清晰度' : '输出尺寸' }}</strong>
            <span>{{ retouchStrength }}%</span>
          </header>
          <div class="image-option-grid">
            <button
              v-for="size in sizes"
              :key="size"
              type="button"
              :class="{ active: selectedSize === size }"
              @click="selectedSize = size"
            >
              {{ size }}
            </button>
          </div>
        </section>

        <section v-if="!isGeneration" class="image-tool-section image-tool-section--strength">
          <header>
            <strong>处理强度</strong>
            <span>{{ retouchStrength }}%</span>
          </header>
          <input v-model.number="retouchStrength" type="range" min="20" max="100" step="5" />
          <div>
            <span>轻微</span>
            <span>自然</span>
            <span>明显</span>
          </div>
        </section>

        <section v-if="isGeneration" class="image-tool-section">
          <header>
            <strong>生成数量</strong>
            <span>每次最多 4 张</span>
          </header>
          <div class="image-option-grid">
            <button
              v-for="amount in amounts"
              :key="amount"
              type="button"
              :class="{ active: selectedAmount === amount }"
              @click="selectedAmount = amount"
            >
              {{ amount }} 张
            </button>
          </div>
        </section>

        <div class="image-tool-submit">
          <span>
            <ThunderboltFilled />
            本次消耗 {{ generationCost }} 积分
          </span>
          <button type="button" :disabled="!canSubmit" @click="submitTask">
            <LoadingOutlined v-if="submitting" />
            <ExperimentOutlined v-else />
            {{ submitting ? '正在提交...' : isGeneration ? '生成图片' : '开始修图' }}
          </button>
          <small>当前余额 {{ sessionStore.points }} 积分</small>
        </div>
      </aside>

      <main class="image-tool-results">
        <header class="image-tool-results__header">
          <div>
            <strong>{{ isGeneration ? '生成记录' : '修图记录' }}</strong>
            <span>{{ visibleWorks.length }} 个任务</span>
          </div>
          <em v-if="workspace.generating">任务正在处理中</em>
        </header>

        <div v-if="workspace.error" class="image-tool-error" role="alert">
          <span>{{ workspace.error.message }}</span>
          <button type="button" @click="workspace.clearError">关闭</button>
        </div>

        <div v-if="visibleWorks.length > 0" class="image-work-grid">
          <article
            v-for="work in visibleWorks"
            :key="work.id"
            class="image-work-card"
            :class="`image-work-card--${work.status}`"
          >
            <header>
              <span>{{ work.modelLabel }}</span>
              <small>{{ formatWorkTime(work.createdAt) }}</small>
              <em :class="work.status">{{ workStatusLabel(work.status) }}</em>
            </header>

            <div class="image-work-card__visual">
              <img
                v-if="work.status === 'done' && work.artworkUrl"
                :src="work.artworkUrl"
                :alt="work.prompt"
              />
              <div v-else-if="work.status === 'failed'" class="image-work-card__state">
                <CloseOutlined />
                <strong>处理失败</strong>
              </div>
              <div v-else class="image-work-card__state image-work-card__state--loading">
                <LoadingOutlined />
                <strong>{{ work.status === 'queued' ? '等待处理' : '正在处理画面' }}</strong>
              </div>
            </div>

            <p>{{ work.prompt }}</p>
            <small v-if="work.errorMessage" class="image-work-card__error">
              {{ work.errorMessage }}
            </small>
            <div class="image-work-card__meta">
              <span>{{ work.size }}</span>
              <span>{{ work.ratio }}</span>
            </div>

            <footer v-if="work.status === 'done'">
              <button
                type="button"
                :class="{ active: work.favorite }"
                @click="workspace.toggleFavorite(work.id)"
              >
                <StarOutlined />
                {{ work.favorite ? '已收藏' : '收藏' }}
              </button>
              <button type="button" @click="workspace.downloadWork(work.id)">
                <DownloadOutlined />
                下载
              </button>
              <button type="button" @click="workspace.removeWork(work.id)">
                <DeleteOutlined />
                删除
              </button>
            </footer>

            <footer v-else-if="work.status === 'failed'">
              <button type="button" @click="workspace.retryWork(work.id)">
                <ReloadOutlined />
                重试
              </button>
              <button type="button" @click="workspace.removeWork(work.id)">
                <DeleteOutlined />
                删除
              </button>
            </footer>
          </article>
        </div>

        <div v-else class="image-tool-empty">
          <span>
            <PictureOutlined />
          </span>
          <strong>{{ isGeneration ? '还没有生成记录' : '还没有修图记录' }}</strong>
          <p>
            {{
              isGeneration
                ? '填写图片描述后提交任务，结果会显示在这里。'
                : '上传图片并选择处理方式，结果会显示在这里。'
            }}
          </p>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.image-tool-view {
  min-height: calc(100vh - 56px);
  padding: 28px 28px 56px;
  background:
    radial-gradient(circle at 12% 0, rgb(67 148 123 / 8%), transparent 290px),
    linear-gradient(180deg, #f7f9f8 0, #fff 330px);
}

.image-tool-header {
  display: flex;
  width: min(100%, 1320px);
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto 22px;
}

.image-tool-header__copy {
  display: grid;
  gap: 5px;
}

.image-tool-header__copy > span {
  color: #25866b;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.13em;
}

.image-tool-header h1 {
  margin: 0;
  color: #20272e;
  font-size: 27px;
}

.image-tool-header p {
  margin: 0;
  color: #818b96;
  font-size: 10px;
}

.image-tool-header__switch {
  display: flex;
  padding: 3px;
  border: 1px solid #e2e7e5;
  border-radius: 8px;
  background: rgb(255 255 255 / 82%);
}

.image-tool-header__switch a {
  display: inline-flex;
  height: 31px;
  align-items: center;
  padding: 0 12px;
  border-radius: 6px;
  color: #68727e;
  font-size: 9px;
  font-weight: 700;
  text-decoration: none;
}

.image-tool-header__switch a.active {
  background: #20272e;
  color: #fff;
}

.image-tool-layout {
  display: grid;
  width: min(100%, 1320px);
  align-items: start;
  gap: 16px;
  grid-template-columns: 390px minmax(0, 1fr);
  margin: 0 auto;
}

.image-tool-panel,
.image-tool-results {
  border: 1px solid #e1e6e4;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 34px rgb(36 55 48 / 6%);
}

.image-tool-panel {
  position: sticky;
  top: 74px;
  display: grid;
  gap: 0;
  overflow: hidden;
}

.image-tool-section {
  display: grid;
  gap: 10px;
  padding: 15px;
  border-bottom: 1px solid #edf0ef;
}

.image-tool-section header,
.image-tool-prompt > strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #343c44;
  font-size: 10px;
}

.image-tool-section header span {
  color: #9aa2ab;
  font-size: 8px;
  font-weight: 500;
}

.image-model-grid {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-model-grid button {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 7px 8px;
  border: 1px solid #e6e9e8;
  border-radius: 7px;
  background: #fff;
  color: #46505a;
  font-size: 8px;
  text-align: left;
  cursor: pointer;
}

.image-model-grid button.active {
  border-color: #9acdbd;
  background: #f2faf7;
  color: #20785f;
}

.image-model-grid i {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--model-accent) 11%, white);
  color: var(--model-accent);
  font-size: 9px;
  font-style: normal;
  font-weight: 850;
}

.image-model-grid span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-model-grid :deep(svg) {
  color: #258b70;
  font-size: 8px;
}

.image-tool-prompt {
  display: grid;
  gap: 9px;
  padding: 15px;
  border-bottom: 1px solid #edf0ef;
}

.image-tool-prompt > span {
  position: relative;
  display: block;
}

.image-tool-prompt textarea {
  display: block;
  width: 100%;
  min-height: 96px;
  padding: 11px 11px 24px;
  border: 1px solid #e1e6e4;
  border-radius: 7px;
  outline: 0;
  color: #323a42;
  font-size: 10px;
  line-height: 1.7;
  resize: vertical;
}

.image-tool-prompt textarea:focus {
  border-color: #86c5b2;
  box-shadow: 0 0 0 3px rgb(37 139 112 / 8%);
}

.image-tool-prompt textarea::placeholder {
  color: #a6adb4;
}

.image-tool-prompt small {
  position: absolute;
  right: 9px;
  bottom: 7px;
  color: #abb2b9;
  font-size: 7px;
}

.retouch-source__preview,
.retouch-source__empty {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px dashed #cfd9d5;
  border-radius: 8px;
  background: #f8faf9;
}

.retouch-source__preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background:
    linear-gradient(45deg, #eef1f0 25%, transparent 25%),
    linear-gradient(-45deg, #eef1f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eef1f0 75%),
    linear-gradient(-45deg, transparent 75%, #eef1f0 75%), #fff;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

.retouch-source__preview button {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: rgb(27 34 41 / 72%);
  color: #fff;
  cursor: pointer;
}

.retouch-source__empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: #61706b;
  cursor: pointer;
}

.retouch-source__empty :deep(svg) {
  color: #258b70;
  font-size: 18px;
}

.retouch-source__empty strong {
  font-size: 10px;
}

.retouch-source__empty small {
  color: #969fa1;
  font-size: 8px;
}

.image-tool-field-error {
  margin: 0;
  color: #b64c43;
  font-size: 8px;
}

.retouch-operation-grid {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.retouch-operation-grid button {
  display: grid;
  min-width: 0;
  min-height: 64px;
  align-items: start;
  gap: 7px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 8px;
  border: 1px solid #e5e9e7;
  border-radius: 7px;
  background: #fff;
  color: #444d56;
  text-align: left;
  cursor: pointer;
}

.retouch-operation-grid button.active {
  border-color: #85c5b1;
  background: #f3faf7;
}

.retouch-operation-grid i {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--operation-accent) 10%, white);
  color: var(--operation-accent);
}

.retouch-operation-grid button > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.retouch-operation-grid strong {
  font-size: 8px;
}

.retouch-operation-grid small {
  display: -webkit-box;
  overflow: hidden;
  color: #929ba2;
  font-size: 7px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.retouch-operation-grid :deep(svg:last-child) {
  color: #258b70;
  font-size: 8px;
}

.image-option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.image-option-grid button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid #e2e7e5;
  border-radius: 6px;
  background: #fff;
  color: #66717a;
  font-size: 8px;
  cursor: pointer;
}

.image-option-grid button.active {
  border-color: #84c4b0;
  background: #edf8f4;
  color: #21785f;
  font-weight: 750;
}

.image-tool-section--strength input {
  width: 100%;
  accent-color: #258b70;
}

.image-tool-section--strength > div {
  display: flex;
  justify-content: space-between;
  color: #a0a7ad;
  font-size: 7px;
}

.image-tool-submit {
  display: grid;
  gap: 8px;
  padding: 15px;
  background: #fbfcfc;
}

.image-tool-submit > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #a46d22;
  font-size: 8px;
}

.image-tool-submit button {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 7px;
  background: #20272e;
  color: #fff;
  font-size: 10px;
  font-weight: 780;
  cursor: pointer;
}

.image-tool-submit button:disabled {
  background: #d6dcda;
  cursor: not-allowed;
}

.image-tool-submit small {
  color: #969fa4;
  font-size: 7px;
  text-align: right;
}

.image-tool-results {
  min-width: 0;
  overflow: hidden;
  padding: 16px;
}

.image-tool-results__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 13px;
}

.image-tool-results__header > div {
  display: grid;
  gap: 3px;
}

.image-tool-results__header strong {
  color: #303840;
  font-size: 14px;
}

.image-tool-results__header span {
  color: #969fa7;
  font-size: 8px;
}

.image-tool-results__header em {
  color: #258b70;
  font-size: 8px;
  font-style: normal;
  font-weight: 750;
}

.image-tool-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 9px 11px;
  border: 1px solid #efc9c4;
  border-radius: 7px;
  background: #fff5f4;
  color: #a64138;
  font-size: 8px;
}

.image-tool-error button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 8px;
  font-weight: 750;
  cursor: pointer;
}

.image-work-grid {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}

.image-work-card {
  display: grid;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e1e6e4;
  border-radius: 8px;
  background: #fff;
}

.image-work-card > header {
  display: grid;
  min-height: 37px;
  align-items: center;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  padding: 0 10px;
  border-bottom: 1px solid #eef1f0;
}

.image-work-card > header span {
  overflow: hidden;
  color: #46505a;
  font-size: 8px;
  font-weight: 740;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-work-card > header small {
  color: #a0a8ae;
  font-size: 7px;
}

.image-work-card > header em {
  padding: 2px 5px;
  border-radius: 999px;
  background: #edf3ff;
  color: #3979d5;
  font-size: 7px;
  font-style: normal;
  font-weight: 750;
}

.image-work-card > header em.done {
  background: #e9f7f1;
  color: #238467;
}

.image-work-card > header em.queued {
  background: #f2f3f5;
  color: #737c89;
}

.image-work-card > header em.failed {
  background: #fff0ee;
  color: #bd4c42;
}

.image-work-card__visual {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #eef1f0;
}

.image-work-card__visual > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-work-card__state {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 8px;
  background: linear-gradient(145deg, #f1f4f3, #e4e9e7);
  color: #94645f;
}

.image-work-card__state :deep(svg) {
  font-size: 20px;
}

.image-work-card__state strong {
  font-size: 8px;
}

.image-work-card__state--loading {
  background:
    linear-gradient(
      115deg,
      rgb(255 255 255 / 0%) 32%,
      rgb(255 255 255 / 68%) 47%,
      rgb(255 255 255 / 0%) 62%
    ),
    linear-gradient(145deg, #cfe5dd, #9ecbbd 52%, #6ca895);
  background-size:
    240% 100%,
    100% 100%;
  color: #fff;
  animation: image-work-loading 1.8s ease-in-out infinite;
}

@keyframes image-work-loading {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -120% 0;
  }
}

.image-work-card > p {
  display: -webkit-box;
  min-height: 48px;
  overflow: hidden;
  margin: 0;
  padding: 10px 10px 7px;
  color: #4d5663;
  font-size: 8px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.image-work-card__error {
  overflow: hidden;
  margin: -2px 10px 8px;
  color: #b65147;
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-work-card__meta {
  display: flex;
  gap: 5px;
  padding: 0 10px 10px;
}

.image-work-card__meta span {
  padding: 2px 5px;
  border-radius: 4px;
  background: #f2f5f4;
  color: #858e94;
  font-size: 7px;
}

.image-work-card > footer {
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 8px;
  border-top: 1px solid #eef1f0;
}

.image-work-card--failed > footer {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-work-card > footer button {
  display: inline-flex;
  min-width: 0;
  height: 29px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 5px;
  border: 1px solid #e0e5e3;
  border-radius: 6px;
  background: #fff;
  color: #626c73;
  font-size: 7px;
  cursor: pointer;
}

.image-work-card > footer button.active {
  border-color: #efd49a;
  background: #fffaf0;
  color: #bd7b13;
}

.image-tool-empty {
  display: grid;
  min-height: 520px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed #d9dfdd;
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgb(37 139 112 / 3%) 1px, transparent 1px),
    linear-gradient(rgb(37 139 112 / 3%) 1px, transparent 1px), #fbfcfc;
  background-size: 34px 34px;
  text-align: center;
}

.image-tool-empty > span {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 14px;
  background: #eaf7f2;
  color: #258b70;
  font-size: 21px;
}

.image-tool-empty strong {
  color: #424a51;
  font-size: 12px;
}

.image-tool-empty p {
  margin: 0;
  color: #949ca2;
  font-size: 8px;
}

@media (max-width: 1060px) {
  .image-tool-layout {
    grid-template-columns: 340px minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .image-tool-view {
    padding: 20px 14px 44px;
  }

  .image-tool-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .image-tool-header__switch {
    width: 100%;
    overflow-x: auto;
  }

  .image-tool-header__switch a {
    flex: 1 0 auto;
    justify-content: center;
  }

  .image-tool-layout {
    grid-template-columns: 1fr;
  }

  .image-tool-panel {
    position: static;
  }
}

@media (max-width: 500px) {
  .image-tool-header h1 {
    font-size: 23px;
  }

  .image-model-grid,
  .retouch-operation-grid {
    grid-template-columns: 1fr;
  }

  .image-work-grid {
    grid-template-columns: 1fr;
  }

  .image-tool-empty {
    min-height: 360px;
  }
}
</style>
