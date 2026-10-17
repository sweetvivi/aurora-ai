<script setup lang="ts">
import {
  AppstoreOutlined,
  BgColorsOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  ThunderboltFilled,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import type { FileAsset } from '@/app/api';
import {
  IMAGE_TASK_POINTS_COST,
  useDrawWorkspaceStore,
  type DrawWorkStatus,
} from '@/stores/draw-workspace';
import { useSessionStore } from '@/stores/session';

interface CommerceMode {
  accent: string;
  description: string;
  glyph: string;
  icon: Component;
  label: string;
  prompt: string;
  value: string;
}

interface ScenePreset {
  accent: string;
  description: string;
  label: string;
  value: string;
}

interface UploadState {
  assetId: string;
  name: string;
  url: string;
}

interface PromptPreset {
  label: string;
  prompt: string;
}

const commerceModes: CommerceMode[] = [
  {
    accent: '#b9653c',
    description: '自动抠图、布光与主图排版',
    glyph: '主',
    icon: ShoppingCartOutlined,
    label: '商品主图',
    prompt:
      '将商品置于干净明亮的商业摄影棚中，主体居中，柔和棚拍光，材质细节清晰，画面适合电商主图展示。',
    value: 'product-shot',
  },
  {
    accent: '#3b83b8',
    description: '保留商品，替换场景与氛围',
    glyph: '景',
    icon: BgColorsOutlined,
    label: '商品换背景',
    prompt:
      '保留商品主体、结构和品牌标签，替换为自然协调的商业场景，边缘融合真实，保持原有商品比例。',
    value: 'background',
  },
  {
    accent: '#8d63b1',
    description: '商品上身，生成模特展示图',
    glyph: '模',
    icon: UserOutlined,
    label: '模特试穿',
    prompt:
      '让模特自然穿戴或使用商品，保持商品颜色、材质和细节准确，模特姿态自然，整体光线真实，适合详情页展示。',
    value: 'model-try-on',
  },
  {
    accent: '#b48628',
    description: '一套素材生成多比例展示图',
    glyph: '套',
    icon: AppstoreOutlined,
    label: '多比例商拍',
    prompt:
      '以同一商品和统一视觉语言生成一组多比例商业展示图，保持品牌色调、光线方向和商品细节一致。',
    value: 'multi-ratio',
  },
];

const scenePresets: ScenePreset[] = [
  {
    accent: '#e7e3dc',
    description: '干净棚拍',
    label: '高级灰',
    value: 'studio-gray',
  },
  {
    accent: '#d9e5df',
    description: '自然柔和',
    label: '松石绿',
    value: 'soft-green',
  },
  {
    accent: '#e7d7cb',
    description: '生活方式',
    label: '暖沙色',
    value: 'warm-sand',
  },
  {
    accent: '#d9e2ed',
    description: '科技质感',
    label: '雾霾蓝',
    value: 'mist-blue',
  },
  {
    accent: '#e2d9e9',
    description: '柔光精品',
    label: '淡雾紫',
    value: 'soft-lilac',
  },
  {
    accent: '#d9d5ce',
    description: '质感深色',
    label: '岩石灰',
    value: 'stone-graphite',
  },
];

const promptPresets: PromptPreset[] = [
  {
    label: '主图聚焦',
    prompt: '商品居中，背景简洁，突出材质和轮廓，边缘干净，适合平台主图。',
  },
  {
    label: '详情页延展',
    prompt: '加入轻微场景层次和辅助道具，保持商品主体清晰，适合详情页与落地页。',
  },
  {
    label: '社媒质感',
    prompt: '自然抓拍感，柔和侧光，留出文案空间，适合社媒种草和活动海报。',
  },
];

const ratios = ['1:1', '4:5', '3:4', '16:9', '9:16'];
const sizes = ['1K', '2K', '4K'];
const amounts = [1, 2, 3, 4];
const workspace = useDrawWorkspaceStore();
const sessionStore = useSessionStore();

const activePreview = ref<'preview' | 'checklist'>('preview');
const modelImage = ref<UploadState | null>(null);
const modelInput = ref<HTMLInputElement | null>(null);
const productImage = ref<UploadState | null>(null);
const productInput = ref<HTMLInputElement | null>(null);
const prompt = ref('');
const selectedAmount = ref(1);
const selectedMode = ref(commerceModes[0]?.value ?? 'product-shot');
const selectedRatio = ref('1:1');
const selectedScene = ref(scenePresets[0]?.value ?? 'studio-gray');
const selectedSize = ref('2K');
const uploadError = ref('');
const uploadingRole = ref<'model' | 'product' | null>(null);

const activeMode = computed(
  () => commerceModes.find((mode) => mode.value === selectedMode.value) ?? commerceModes[0],
);
const activeScene = computed(
  () => scenePresets.find((scene) => scene.value === selectedScene.value) ?? scenePresets[0],
);
const visibleWorks = computed(() => workspace.works.filter((work) => work.tool === 'commerce'));
const submitting = computed(() => workspace.submitting || uploadingRole.value !== null);
const generationCost = computed(() => selectedAmount.value * IMAGE_TASK_POINTS_COST);
const canSubmit = computed(() => Boolean(productImage.value) && !submitting.value);
const modeRequiresModel = computed(() => selectedMode.value === 'model-try-on');

function setMode(mode: CommerceMode): void {
  selectedMode.value = mode.value;

  if (!prompt.value.trim()) {
    prompt.value = mode.prompt;
  }
}

function setPromptPreset(preset: PromptPreset): void {
  prompt.value = preset.prompt;
}

async function handleUpload(role: 'model' | 'product', event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploadingRole.value = role;
  uploadError.value = '';

  try {
    const asset: FileAsset = await workspace.uploadReference(file);
    const previous = role === 'product' ? productImage.value : modelImage.value;

    if (previous) {
      URL.revokeObjectURL(previous.url);
    }

    const nextImage: UploadState = {
      assetId: asset.id,
      name: asset.originalName,
      url: URL.createObjectURL(file),
    };

    if (role === 'product') {
      productImage.value = nextImage;
    } else {
      modelImage.value = nextImage;
    }
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : '素材上传失败，请重试';
  } finally {
    input.value = '';
    uploadingRole.value = null;
  }
}

function removeImage(role: 'model' | 'product'): void {
  const target = role === 'product' ? productImage.value : modelImage.value;

  if (target) {
    URL.revokeObjectURL(target.url);
  }

  if (role === 'product') {
    productImage.value = null;
  } else {
    modelImage.value = null;
  }
}

function resetForm(): void {
  if (productImage.value) {
    URL.revokeObjectURL(productImage.value.url);
  }

  if (modelImage.value) {
    URL.revokeObjectURL(modelImage.value.url);
  }

  productImage.value = null;
  modelImage.value = null;
  prompt.value = activeMode.value?.prompt ?? '';
  selectedAmount.value = 1;
  selectedRatio.value = '1:1';
  selectedScene.value = scenePresets[0]?.value ?? 'studio-gray';
  selectedSize.value = '2K';
  uploadError.value = '';
}

function buildPrompt(): string {
  const mode = activeMode.value;
  const scene = activeScene.value;
  const parts = [
    mode?.prompt,
    prompt.value.trim() ? `补充要求：${prompt.value.trim()}` : '',
    scene ? `场景氛围：${scene.label}，${scene.description}。` : '',
    modeRequiresModel.value && modelImage.value ? '保留模特提供的姿态与人物比例。' : '',
  ];

  return parts.filter(Boolean).join('\n');
}

async function submitTask(): Promise<void> {
  if (!canSubmit.value || !productImage.value) {
    if (!productImage.value) {
      uploadError.value = '请先上传商品素材';
    }
    return;
  }

  await workspace.initialize();

  const createdWorks = await workspace.createGenerationWorks({
    amount: selectedAmount.value,
    extraParameters: {
      mode: selectedMode.value,
      scene: selectedScene.value,
      sceneLabel: activeScene.value?.label,
      sourceRole: modeRequiresModel.value ? 'product-and-model' : 'product',
      modelSourceFileId: modelImage.value?.assetId,
    },
    model: 'commerce-visual-3',
    modelLabel: activeMode.value?.label ?? '电商视觉',
    prompt: buildPrompt(),
    ratio: selectedRatio.value,
    size: selectedSize.value,
    sourceFileId: productImage.value.assetId,
    toolKey: 'commerce',
  });

  if (createdWorks.length > 0) {
    prompt.value = activeMode.value?.prompt ?? '';
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
    failed: '生成失败',
    generating: '处理中',
    queued: '排队中',
  };

  return labels[status];
}

onMounted(() => {
  prompt.value = activeMode.value?.prompt ?? '';
  void workspace.initialize();
});

onBeforeUnmount(() => {
  if (productImage.value) {
    URL.revokeObjectURL(productImage.value.url);
  }

  if (modelImage.value) {
    URL.revokeObjectURL(modelImage.value.url);
  }
});
</script>

<template>
  <section class="commerce-view">
    <header class="commerce-header">
      <div class="commerce-header__copy">
        <span>COMMERCE VISUAL STUDIO</span>
        <h1>AI 电商工具</h1>
        <p>从商品素材到多比例商拍图，统一完成主图、换景和模特展示。</p>
      </div>
      <nav class="commerce-header__switch" aria-label="电商工具切换">
        <RouterLink to="/draw">AI 绘画</RouterLink>
        <RouterLink to="/retouch">智能修图</RouterLink>
        <RouterLink to="/image-generation">图片生成</RouterLink>
        <RouterLink class="active" to="/commerce">电商工具</RouterLink>
      </nav>
    </header>

    <div class="commerce-summary">
      <div>
        <PictureOutlined />
        <span>
          <strong>商品素材</strong>
          <small>{{ productImage ? '已添加 1 张' : '等待上传' }}</small>
        </span>
      </div>
      <div>
        <BgColorsOutlined />
        <span>
          <strong>场景预设</strong>
          <small>{{ activeScene?.label }}</small>
        </span>
      </div>
      <div>
        <ExperimentOutlined />
        <span>
          <strong>输出规格</strong>
          <small>{{ selectedRatio }} · {{ selectedSize }}</small>
        </span>
      </div>
      <div class="commerce-summary__balance">
        <ThunderboltFilled />
        <span>
          <strong>{{ generationCost }} 积分</strong>
          <small>本次预计消耗</small>
        </span>
      </div>
    </div>

    <div class="commerce-layout">
      <aside class="commerce-params">
        <section class="commerce-section">
          <header>
            <strong>创作方式</strong>
            <span>{{ commerceModes.length }} 种流程</span>
          </header>
          <div class="commerce-mode-grid">
            <button
              v-for="mode in commerceModes"
              :key="mode.value"
              type="button"
              :class="{ active: selectedMode === mode.value }"
              @click="setMode(mode)"
            >
              <i :style="{ '--commerce-accent': mode.accent }">
                <component :is="mode.icon" />
              </i>
              <span>
                <strong>{{ mode.label }}</strong>
                <small>{{ mode.description }}</small>
              </span>
              <CheckOutlined v-if="selectedMode === mode.value" />
            </button>
          </div>
        </section>

        <section class="commerce-section">
          <header>
            <strong>商品素材</strong>
            <span>{{ uploadingRole === 'product' ? '上传中...' : '必填' }}</span>
          </header>
          <input
            ref="productInput"
            type="file"
            accept="image/*"
            hidden
            :disabled="uploadingRole !== null"
            @change="handleUpload('product', $event)"
          />
          <div v-if="productImage" class="commerce-upload-preview">
            <img :src="productImage.url" :alt="productImage.name" />
            <button type="button" aria-label="移除商品素材" @click="removeImage('product')">
              <CloseOutlined />
            </button>
            <span>商品主体</span>
          </div>
          <button
            v-else
            type="button"
            class="commerce-upload-empty"
            :disabled="uploadingRole !== null"
            @click="productInput?.click()"
          >
            <LoadingOutlined v-if="uploadingRole === 'product'" />
            <UploadOutlined v-else />
            <strong>{{ uploadingRole === 'product' ? '正在上传商品图' : '上传商品图' }}</strong>
            <small>建议使用主体清晰、背景简洁的 JPG、PNG 或 WebP</small>
          </button>
        </section>

        <section v-if="modeRequiresModel" class="commerce-section">
          <header>
            <strong>模特素材</strong>
            <span>{{ uploadingRole === 'model' ? '上传中...' : '可选' }}</span>
          </header>
          <input
            ref="modelInput"
            type="file"
            accept="image/*"
            hidden
            :disabled="uploadingRole !== null"
            @change="handleUpload('model', $event)"
          />
          <div v-if="modelImage" class="commerce-upload-preview commerce-upload-preview--portrait">
            <img :src="modelImage.url" :alt="modelImage.name" />
            <button type="button" aria-label="移除模特素材" @click="removeImage('model')">
              <CloseOutlined />
            </button>
            <span>模特参考</span>
          </div>
          <button
            v-else
            type="button"
            class="commerce-upload-empty commerce-upload-empty--compact"
            :disabled="uploadingRole !== null"
            @click="modelInput?.click()"
          >
            <LoadingOutlined v-if="uploadingRole === 'model'" />
            <UserOutlined v-else />
            <strong>{{ uploadingRole === 'model' ? '正在上传模特图' : '添加模特参考' }}</strong>
            <small>不上传时由系统生成自然姿态</small>
          </button>
        </section>

        <label class="commerce-prompt">
          <strong>画面要求</strong>
          <span>
            <textarea
              v-model="prompt"
              maxlength="1000"
              placeholder="描述商品卖点、拍摄角度、光线、背景和氛围"
            />
            <small>{{ prompt.length }} / 1000</small>
          </span>
        </label>

        <section class="commerce-section">
          <header>
            <strong>场景预设</strong>
            <span>{{ activeScene?.label }}</span>
          </header>
          <div class="commerce-scene-grid">
            <button
              v-for="scene in scenePresets"
              :key="scene.value"
              type="button"
              :class="{ active: selectedScene === scene.value }"
              @click="selectedScene = scene.value"
            >
              <i :style="{ '--scene-accent': scene.accent }" />
              <span>{{ scene.label }}</span>
            </button>
          </div>
        </section>

        <section class="commerce-section commerce-section--split">
          <header>
            <strong>画面比例</strong>
            <span>{{ selectedRatio }}</span>
          </header>
          <div class="commerce-option-grid">
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

        <section class="commerce-section commerce-section--split">
          <header>
            <strong>输出清晰度</strong>
            <span>{{ selectedSize }}</span>
          </header>
          <div class="commerce-option-grid">
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

        <section class="commerce-section commerce-section--split">
          <header>
            <strong>生成数量</strong>
            <span>每次最多 4 张</span>
          </header>
          <div class="commerce-option-grid">
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

        <div class="commerce-submit">
          <span>
            <ThunderboltFilled />
            本次消耗 {{ generationCost }} 积分
          </span>
          <button type="button" :disabled="!canSubmit" @click="submitTask">
            <LoadingOutlined v-if="submitting" />
            <ShoppingCartOutlined v-else />
            {{ submitting ? '正在提交...' : '生成商拍图' }}
          </button>
          <button type="button" class="commerce-reset" @click="resetForm">
            <ReloadOutlined />
            重置当前设置
          </button>
          <small>当前余额 {{ sessionStore.points }} 积分</small>
        </div>
      </aside>

      <main class="commerce-stage">
        <header class="commerce-stage__header">
          <div>
            <strong>画面预览</strong>
            <span>先确认商品主体和场景方向，再提交生成</span>
          </div>
          <div class="commerce-stage__tabs">
            <button
              type="button"
              :class="{ active: activePreview === 'preview' }"
              @click="activePreview = 'preview'"
            >
              预览
            </button>
            <button
              type="button"
              :class="{ active: activePreview === 'checklist' }"
              @click="activePreview = 'checklist'"
            >
              检查项
            </button>
          </div>
        </header>

        <div v-if="activePreview === 'preview'" class="commerce-stage__preview">
          <div class="commerce-stage__paper" :style="{ '--stage-scene': activeScene?.accent }">
            <span class="commerce-stage__paper-label">{{ activeMode?.label }}</span>
            <div class="commerce-stage__photo">
              <img v-if="productImage" :src="productImage.url" :alt="productImage.name" />
              <div v-else class="commerce-stage__photo-empty">
                <ShoppingCartOutlined />
                <strong>商品主体预览</strong>
                <span>上传商品图后，这里会显示构图位置</span>
              </div>
            </div>
            <div class="commerce-stage__safe-area" aria-hidden="true" />
            <span class="commerce-stage__guide commerce-stage__guide--left">主体安全区</span>
            <span class="commerce-stage__guide commerce-stage__guide--bottom">
              {{ selectedRatio }} · {{ selectedSize }}
            </span>
          </div>
          <div class="commerce-stage__scene-strip">
            <span>场景</span>
            <strong>{{ activeScene?.label }}</strong>
            <i :style="{ '--scene-accent': activeScene?.accent }" />
            <small>{{ activeScene?.description }}，保持商品细节和边缘干净。</small>
          </div>
        </div>

        <div v-else class="commerce-checklist">
          <article>
            <span>01</span>
            <div>
              <strong>素材是否清晰</strong>
              <p>商品主体、标签和边缘需要保持可识别，避免严重模糊或遮挡。</p>
            </div>
            <CheckOutlined v-if="productImage" />
            <CloseOutlined v-else />
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>场景是否匹配</strong>
              <p>当前选择 {{ activeScene?.label }}，适合 {{ activeScene?.description }} 氛围。</p>
            </div>
            <CheckOutlined />
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>输出比例是否完整</strong>
              <p>当前输出 {{ selectedRatio }}，检查商品是否需要保留文案或边距。</p>
            </div>
            <CheckOutlined />
          </article>
        </div>

        <section class="commerce-quick-presets">
          <header>
            <div>
              <strong>快捷描述</strong>
              <span>快速补充拍摄方向</span>
            </div>
            <span>{{ promptPresets.length }} 个预设</span>
          </header>
          <div>
            <button
              v-for="preset in promptPresets"
              :key="preset.label"
              type="button"
              @click="setPromptPreset(preset)"
            >
              <PlusOutlined />
              {{ preset.label }}
            </button>
          </div>
        </section>
      </main>

      <aside class="commerce-history">
        <header>
          <div>
            <strong>生成记录</strong>
            <span>{{ visibleWorks.length }} 个任务</span>
          </div>
          <button type="button" aria-label="刷新生成记录" @click="workspace.initialize()">
            <ReloadOutlined />
          </button>
        </header>

        <div v-if="workspace.error" class="commerce-error" role="alert">
          <span>{{ workspace.error.message }}</span>
          <button type="button" @click="workspace.clearError">关闭</button>
        </div>

        <div v-if="visibleWorks.length > 0" class="commerce-work-list">
          <article v-for="work in visibleWorks" :key="work.id" class="commerce-work-card">
            <div class="commerce-work-card__visual">
              <img
                v-if="work.status === 'done' && work.artworkUrl"
                :src="work.artworkUrl"
                :alt="work.prompt"
              />
              <div v-else-if="work.status === 'failed'" class="commerce-work-card__state">
                <CloseOutlined />
                <strong>处理失败</strong>
              </div>
              <div v-else class="commerce-work-card__state commerce-work-card__state--loading">
                <LoadingOutlined />
                <strong>{{ work.status === 'queued' ? '等待处理' : '生成中' }}</strong>
              </div>
            </div>
            <div class="commerce-work-card__copy">
              <header>
                <strong>{{ work.modelLabel }}</strong>
                <small>{{ formatWorkTime(work.createdAt) }}</small>
              </header>
              <p>{{ work.prompt }}</p>
              <div>
                <span>{{ work.ratio }}</span>
                <span>{{ work.size }}</span>
                <em :class="work.status">{{ workStatusLabel(work.status) }}</em>
              </div>
              <footer v-if="work.status === 'done'">
                <button type="button" @click="workspace.toggleFavorite(work.id)">
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
            </div>
          </article>
        </div>

        <div v-else class="commerce-history__empty">
          <span>
            <ShoppingCartOutlined />
          </span>
          <strong>还没有商拍记录</strong>
          <p>上传商品图并选择创作方式，生成结果会显示在这里。</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.commerce-view {
  min-height: calc(100vh - 56px);
  padding: 28px 28px 54px;
  background:
    linear-gradient(90deg, rgb(71 86 104 / 2%) 1px, transparent 1px),
    linear-gradient(rgb(71 86 104 / 2%) 1px, transparent 1px), #f7f8fa;
  background-size: 36px 36px;
}

.commerce-header,
.commerce-summary,
.commerce-layout {
  width: min(100%, 1540px);
  margin-right: auto;
  margin-left: auto;
}

.commerce-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 17px;
}

.commerce-header__copy {
  display: grid;
  gap: 5px;
}

.commerce-header__copy > span {
  color: #a45f38;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.13em;
}

.commerce-header h1 {
  margin: 0;
  color: #20272e;
  font-size: 28px;
}

.commerce-header p {
  margin: 0;
  color: #818b96;
  font-size: 10px;
}

.commerce-header__switch {
  display: flex;
  padding: 3px;
  border: 1px solid #e1e5e8;
  border-radius: 8px;
  background: rgb(255 255 255 / 84%);
}

.commerce-header__switch a {
  display: inline-flex;
  height: 31px;
  align-items: center;
  padding: 0 11px;
  border-radius: 6px;
  color: #68727e;
  font-size: 9px;
  font-weight: 700;
  text-decoration: none;
}

.commerce-header__switch a.active {
  background: #242a31;
  color: #fff;
}

.commerce-summary {
  display: grid;
  gap: 1px;
  overflow: hidden;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 14px;
  border: 1px solid #e1e5e8;
  border-radius: 9px;
  background: #e7eaed;
}

.commerce-summary > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  background: rgb(255 255 255 / 94%);
}

.commerce-summary > div > :deep(svg) {
  flex: 0 0 auto;
  color: #a7653d;
  font-size: 14px;
}

.commerce-summary span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.commerce-summary strong {
  overflow: hidden;
  color: #3f4750;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-summary small {
  overflow: hidden;
  color: #959da6;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-summary__balance > :deep(svg) {
  color: #c07e2e !important;
}

.commerce-layout {
  display: grid;
  min-height: 700px;
  align-items: start;
  gap: 14px;
  grid-template-columns: 360px minmax(360px, 1fr) 330px;
}

.commerce-params,
.commerce-stage,
.commerce-history {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e0e4e7;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(34 47 63 / 5%);
}

.commerce-params {
  display: grid;
}

.commerce-section,
.commerce-prompt {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid #edf0f2;
}

.commerce-section header,
.commerce-prompt > strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #343c44;
  font-size: 10px;
}

.commerce-section header span {
  color: #9aa2ab;
  font-size: 8px;
  font-weight: 500;
}

.commerce-mode-grid {
  display: grid;
  gap: 7px;
}

.commerce-mode-grid button {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 62px;
  align-items: start;
  gap: 8px;
  grid-template-columns: 29px minmax(0, 1fr) auto;
  padding: 8px;
  border: 1px solid #e5e8eb;
  border-radius: 7px;
  background: #fff;
  color: #444d57;
  text-align: left;
  cursor: pointer;
}

.commerce-mode-grid button:hover {
  border-color: #d7c2b2;
}

.commerce-mode-grid button.active {
  border-color: #d1a98d;
  background: #fffaf6;
}

.commerce-mode-grid i {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--commerce-accent) 11%, white);
  color: var(--commerce-accent);
}

.commerce-mode-grid button > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.commerce-mode-grid strong {
  font-size: 9px;
}

.commerce-mode-grid small {
  display: -webkit-box;
  overflow: hidden;
  color: #929aa3;
  font-size: 7px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.commerce-mode-grid :deep(svg:last-child) {
  color: #a7653d;
  font-size: 8px;
}

.commerce-upload-empty {
  display: grid;
  min-height: 112px;
  place-items: center;
  align-content: center;
  gap: 6px;
  padding: 14px;
  border: 1px dashed #d4d9dd;
  border-radius: 8px;
  background: #fafbfc;
  color: #68727b;
  cursor: pointer;
}

.commerce-upload-empty :deep(svg) {
  color: #a7653d;
  font-size: 18px;
}

.commerce-upload-empty strong {
  font-size: 10px;
}

.commerce-upload-empty small {
  max-width: 230px;
  color: #9ba3ab;
  font-size: 8px;
  line-height: 1.5;
  text-align: center;
}

.commerce-upload-empty--compact {
  min-height: 84px;
}

.commerce-upload-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid #e2e6e9;
  border-radius: 8px;
  background: #f4f6f7;
}

.commerce-upload-preview--portrait {
  aspect-ratio: 4 / 5;
}

.commerce-upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.commerce-upload-preview > button {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: rgb(28 34 40 / 74%);
  color: #fff;
  cursor: pointer;
}

.commerce-upload-preview > span {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 3px 6px;
  border-radius: 4px;
  background: rgb(255 255 255 / 88%);
  color: #68727b;
  font-size: 7px;
}

.commerce-prompt {
  border-bottom: 1px solid #edf0f2;
}

.commerce-prompt > span {
  position: relative;
  display: block;
}

.commerce-prompt textarea {
  display: block;
  width: 100%;
  min-height: 100px;
  padding: 10px 10px 24px;
  border: 1px solid #e1e5e8;
  border-radius: 7px;
  outline: 0;
  color: #323a42;
  font-size: 10px;
  line-height: 1.7;
  resize: vertical;
}

.commerce-prompt textarea:focus {
  border-color: #cda98f;
  box-shadow: 0 0 0 3px rgb(169 101 61 / 8%);
}

.commerce-prompt textarea::placeholder {
  color: #a6adb4;
}

.commerce-prompt small {
  position: absolute;
  right: 9px;
  bottom: 7px;
  color: #abb2b9;
  font-size: 7px;
}

.commerce-scene-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.commerce-scene-grid button {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 7px 4px;
  border: 1px solid #e4e8ea;
  border-radius: 7px;
  background: #fff;
  color: #77818a;
  font-size: 7px;
  cursor: pointer;
}

.commerce-scene-grid button.active {
  border-color: #cfa98e;
  background: #fffaf6;
  color: #8d5638;
  font-weight: 750;
}

.commerce-scene-grid i {
  display: block;
  width: 32px;
  height: 25px;
  border: 1px solid rgb(63 74 84 / 8%);
  border-radius: 5px;
  background: var(--scene-accent);
}

.commerce-option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.commerce-option-grid button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid #e2e6e8;
  border-radius: 6px;
  background: #fff;
  color: #66717a;
  font-size: 8px;
  cursor: pointer;
}

.commerce-option-grid button.active {
  border-color: #c99e81;
  background: #fff8f3;
  color: #985b38;
  font-weight: 750;
}

.commerce-submit {
  display: grid;
  gap: 8px;
  padding: 14px;
  background: #fbfbfc;
}

.commerce-submit > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #a46d22;
  font-size: 8px;
}

.commerce-submit > button:not(.commerce-reset) {
  display: inline-flex;
  height: 39px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 7px;
  background: #242a31;
  color: #fff;
  font-size: 10px;
  font-weight: 780;
  cursor: pointer;
}

.commerce-submit > button:not(.commerce-reset):disabled {
  background: #d6dbde;
  cursor: not-allowed;
}

.commerce-reset {
  display: inline-flex;
  height: 31px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid #e0e4e7;
  border-radius: 7px;
  background: #fff;
  color: #69737c;
  font-size: 8px;
  cursor: pointer;
}

.commerce-submit small {
  color: #969fa5;
  font-size: 7px;
  text-align: right;
}

.commerce-stage {
  display: grid;
  align-content: start;
}

.commerce-stage__header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid #edf0f2;
}

.commerce-stage__header > div:first-child {
  display: grid;
  gap: 3px;
}

.commerce-stage__header strong {
  color: #303840;
  font-size: 13px;
}

.commerce-stage__header span {
  color: #969fa7;
  font-size: 8px;
}

.commerce-stage__tabs {
  display: flex;
  padding: 2px;
  border-radius: 7px;
  background: #f1f3f5;
}

.commerce-stage__tabs button {
  height: 28px;
  padding: 0 11px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #7c858d;
  font-size: 8px;
  cursor: pointer;
}

.commerce-stage__tabs button.active {
  background: #fff;
  color: #343c44;
  font-weight: 750;
  box-shadow: 0 2px 8px rgb(37 48 60 / 8%);
}

.commerce-stage__preview {
  display: grid;
  gap: 11px;
  padding: 16px;
}

.commerce-stage__paper {
  position: relative;
  display: grid;
  min-height: 520px;
  overflow: hidden;
  place-items: center;
  border: 1px solid #e0e4e7;
  border-radius: 9px;
  background:
    linear-gradient(90deg, rgb(42 52 62 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(42 52 62 / 5%) 1px, transparent 1px), var(--stage-scene);
  background-size: 34px 34px;
}

.commerce-stage__paper::before {
  position: absolute;
  inset: 8%;
  border: 1px solid rgb(255 255 255 / 64%);
  border-radius: 8px;
  content: '';
}

.commerce-stage__paper-label,
.commerce-stage__guide {
  position: absolute;
  z-index: 2;
  padding: 4px 7px;
  border: 1px solid rgb(255 255 255 / 72%);
  border-radius: 5px;
  background: rgb(255 255 255 / 74%);
  color: #606a73;
  font-size: 7px;
  backdrop-filter: blur(8px);
}

.commerce-stage__paper-label {
  top: 18px;
  left: 18px;
}

.commerce-stage__guide--left {
  top: 50%;
  left: 18px;
  transform: rotate(-90deg) translateX(-50%);
  transform-origin: left top;
}

.commerce-stage__guide--bottom {
  right: 18px;
  bottom: 18px;
}

.commerce-stage__photo {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(62%, 360px);
  aspect-ratio: 4 / 5;
  place-items: center;
  overflow: hidden;
  border: 10px solid rgb(255 255 255 / 92%);
  border-radius: 8px;
  background: rgb(248 249 250 / 92%);
  box-shadow: 0 20px 50px rgb(34 45 57 / 16%);
}

.commerce-stage__photo > img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.commerce-stage__photo-empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: #7b858d;
  text-align: center;
}

.commerce-stage__photo-empty :deep(svg) {
  color: #a7653d;
  font-size: 26px;
}

.commerce-stage__photo-empty strong {
  font-size: 10px;
}

.commerce-stage__photo-empty span {
  max-width: 180px;
  color: #9ca4ab;
  font-size: 8px;
  line-height: 1.5;
}

.commerce-stage__safe-area {
  position: absolute;
  top: 15%;
  right: 19%;
  bottom: 15%;
  left: 19%;
  border: 1px dashed rgb(122 92 73 / 22%);
  border-radius: 8px;
  pointer-events: none;
}

.commerce-stage__scene-strip {
  display: grid;
  align-items: center;
  gap: 7px;
  grid-template-columns: auto auto auto minmax(0, 1fr);
  padding: 10px 12px;
  border: 1px solid #e4e7ea;
  border-radius: 8px;
  background: #fbfbfc;
}

.commerce-stage__scene-strip > span {
  color: #979fa7;
  font-size: 8px;
}

.commerce-stage__scene-strip strong {
  color: #4d5660;
  font-size: 8px;
}

.commerce-stage__scene-strip i {
  display: block;
  width: 25px;
  height: 20px;
  border-radius: 4px;
  background: var(--scene-accent);
}

.commerce-stage__scene-strip small {
  color: #8e969e;
  font-size: 8px;
  line-height: 1.5;
}

.commerce-checklist {
  display: grid;
  gap: 9px;
  padding: 16px;
}

.commerce-checklist article {
  display: grid;
  min-height: 92px;
  align-items: start;
  gap: 10px;
  grid-template-columns: 31px minmax(0, 1fr) auto;
  padding: 13px;
  border: 1px solid #e4e7ea;
  border-radius: 8px;
  background: #fcfcfd;
}

.commerce-checklist article > span {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 7px;
  background: #fff1e8;
  color: #a7653d;
  font-size: 9px;
  font-weight: 850;
}

.commerce-checklist article > div {
  display: grid;
  gap: 5px;
}

.commerce-checklist strong {
  color: #48515a;
  font-size: 10px;
}

.commerce-checklist p {
  margin: 0;
  color: #8c959d;
  font-size: 8px;
  line-height: 1.6;
}

.commerce-checklist article > :deep(svg) {
  color: #3b9b73;
  font-size: 13px;
}

.commerce-checklist article > :deep(svg.anticon-close) {
  color: #b65a4e;
}

.commerce-quick-presets {
  display: grid;
  gap: 10px;
  padding: 0 16px 16px;
}

.commerce-quick-presets > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.commerce-quick-presets > header > div {
  display: grid;
  gap: 3px;
}

.commerce-quick-presets strong {
  color: #48515a;
  font-size: 10px;
}

.commerce-quick-presets span {
  color: #9aa2a9;
  font-size: 8px;
}

.commerce-quick-presets > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.commerce-quick-presets button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid #e1e5e8;
  border-radius: 6px;
  background: #fff;
  color: #636d76;
  font-size: 8px;
  cursor: pointer;
}

.commerce-quick-presets button:hover {
  border-color: #d0aa90;
  color: #8f5739;
}

.commerce-history {
  display: grid;
  align-content: start;
}

.commerce-history > header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid #edf0f2;
}

.commerce-history > header > div {
  display: grid;
  gap: 3px;
}

.commerce-history > header strong {
  color: #303840;
  font-size: 13px;
}

.commerce-history > header span {
  color: #969fa7;
  font-size: 8px;
}

.commerce-history > header > button {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 1px solid #e2e6e9;
  border-radius: 7px;
  background: #fff;
  color: #707981;
  cursor: pointer;
}

.commerce-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 12px 12px 0;
  padding: 9px;
  border: 1px solid #efc9c4;
  border-radius: 7px;
  background: #fff5f4;
  color: #a64138;
  font-size: 8px;
}

.commerce-error button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 8px;
  font-weight: 750;
  cursor: pointer;
}

.commerce-work-list {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.commerce-work-card {
  display: grid;
  overflow: hidden;
  grid-template-columns: 92px minmax(0, 1fr);
  border: 1px solid #e2e6e9;
  border-radius: 8px;
  background: #fff;
}

.commerce-work-card__visual {
  position: relative;
  min-height: 134px;
  overflow: hidden;
  background: #eef1f2;
}

.commerce-work-card__visual > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.commerce-work-card__state {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: #9c5b55;
  font-size: 17px;
}

.commerce-work-card__state strong {
  font-size: 7px;
}

.commerce-work-card__state--loading {
  background:
    linear-gradient(
      115deg,
      rgb(255 255 255 / 0%) 32%,
      rgb(255 255 255 / 68%) 47%,
      rgb(255 255 255 / 0%) 62%
    ),
    linear-gradient(145deg, #f0d9cb, #d8ae94 52%, #b77e5f);
  background-size:
    240% 100%,
    100% 100%;
  color: #fff;
  animation: commerce-loading 1.8s ease-in-out infinite;
}

@keyframes commerce-loading {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -120% 0;
  }
}

.commerce-work-card__copy {
  display: grid;
  min-width: 0;
  align-content: start;
  padding: 9px;
}

.commerce-work-card__copy > header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.commerce-work-card__copy > header strong {
  overflow: hidden;
  color: #4b545d;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-work-card__copy > header small {
  color: #a0a8ae;
  font-size: 7px;
  white-space: nowrap;
}

.commerce-work-card__copy > p {
  display: -webkit-box;
  overflow: hidden;
  margin: 7px 0;
  color: #69737c;
  font-size: 7px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.commerce-work-card__copy > div {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.commerce-work-card__copy > div span,
.commerce-work-card__copy > div em {
  padding: 2px 5px;
  border-radius: 4px;
  background: #f2f4f5;
  color: #838c94;
  font-size: 7px;
  font-style: normal;
}

.commerce-work-card__copy > div em.done {
  background: #e9f7f1;
  color: #238467;
}

.commerce-work-card__copy > div em.queued {
  background: #f2f3f5;
  color: #737c89;
}

.commerce-work-card__copy > div em.failed {
  background: #fff0ee;
  color: #bd4c42;
}

.commerce-work-card__copy > footer {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 8px;
}

.commerce-work-card__copy > footer button {
  display: inline-flex;
  min-width: 0;
  height: 27px;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 4px;
  border: 1px solid #e0e4e7;
  border-radius: 6px;
  background: #fff;
  color: #626c73;
  font-size: 7px;
  cursor: pointer;
}

.commerce-history__empty {
  display: grid;
  min-height: 480px;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 26px;
  text-align: center;
}

.commerce-history__empty > span {
  display: grid;
  width: 51px;
  height: 51px;
  place-items: center;
  border-radius: 13px;
  background: #fff1e8;
  color: #a7653d;
  font-size: 20px;
}

.commerce-history__empty strong {
  color: #424a51;
  font-size: 11px;
}

.commerce-history__empty p {
  max-width: 200px;
  margin: 0;
  color: #949ca2;
  font-size: 8px;
  line-height: 1.6;
}

@media (max-width: 1360px) {
  .commerce-layout {
    grid-template-columns: 330px minmax(350px, 1fr) 290px;
  }

  .commerce-stage__paper {
    min-height: 460px;
  }
}

@media (max-width: 1120px) {
  .commerce-layout {
    grid-template-columns: 320px minmax(0, 1fr);
  }

  .commerce-history {
    grid-column: 1 / -1;
  }

  .commerce-work-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .commerce-history__empty {
    min-height: 220px;
  }
}

@media (max-width: 860px) {
  .commerce-view {
    padding: 20px 14px 44px;
  }

  .commerce-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .commerce-header__switch {
    width: 100%;
    overflow-x: auto;
  }

  .commerce-header__switch a {
    flex: 1 0 auto;
    justify-content: center;
  }

  .commerce-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .commerce-layout {
    grid-template-columns: 1fr;
  }

  .commerce-stage {
    order: 2;
  }

  .commerce-params {
    order: 1;
  }

  .commerce-history {
    order: 3;
    grid-column: auto;
  }

  .commerce-work-list {
    grid-template-columns: 1fr;
  }

  .commerce-stage__paper {
    min-height: 380px;
  }

  .commerce-stage__photo {
    width: min(68%, 280px);
  }

  .commerce-stage {
    order: 1;
  }

  .commerce-params {
    order: 2;
  }
}

@media (max-width: 500px) {
  .commerce-header h1 {
    font-size: 23px;
  }

  .commerce-summary {
    grid-template-columns: 1fr;
  }

  .commerce-stage__header {
    align-items: flex-start;
    flex-direction: column;
    padding-top: 13px;
    padding-bottom: 13px;
  }

  .commerce-stage__tabs {
    width: 100%;
  }

  .commerce-stage__tabs button {
    flex: 1;
  }

  .commerce-stage__preview,
  .commerce-checklist {
    padding: 12px;
  }

  .commerce-stage__paper {
    min-height: 320px;
  }

  .commerce-stage__photo {
    width: 72%;
  }

  .commerce-stage__guide--left {
    display: none;
  }

  .commerce-stage__scene-strip {
    grid-template-columns: auto auto 1fr;
  }

  .commerce-stage__scene-strip small {
    grid-column: 1 / -1;
  }

  .commerce-mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
