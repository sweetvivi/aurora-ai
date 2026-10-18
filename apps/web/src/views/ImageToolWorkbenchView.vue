<script setup lang="ts">
import {
  AppstoreOutlined,
  BgColorsOutlined,
  BulbOutlined,
  CheckOutlined,
  CloseOutlined,
  CloudDownloadOutlined,
  CommentOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  ExperimentOutlined,
  HighlightOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  RedoOutlined,
  ScanOutlined,
  ScissorOutlined,
  SendOutlined,
  SettingOutlined,
  SmileOutlined,
  StarOutlined,
  ThunderboltFilled,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { fetchFileBlob, type FileAsset } from '@/app/api';
import {
  IMAGE_TASK_POINTS_COST,
  useDrawWorkspaceStore,
  type DrawWork,
  type DrawWorkStatus,
} from '@/stores/draw-workspace';
import { useModelCatalogStore } from '@/stores/model-catalog';
import { useSessionStore } from '@/stores/session';
import { clampImageSizePreset, getImageSizePresets } from '@/utils/model-capabilities';

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

interface RetouchHistorySnapshot {
  canvasZoom: number;
  selectedCanvasWorkId: string;
  selectedRetouchShowcaseId: string;
  sourceImage: SourceImage | null;
}

interface RetouchModelOption {
  description: string;
  label: string;
  value: string;
}

interface RetouchShowcase {
  id: string;
  image: string;
  label: string;
  operation: string;
  position: string;
  variant: 'cutout' | 'hair' | 'outfit' | 'scene';
}

interface GenerationCategory {
  icon?: Component;
  label: string;
  value: string;
}

interface GenerationShowcase {
  category: string;
  description: string;
  id: string;
  image: string;
  label: string;
  preview: 'fashion' | 'landscape' | 'portrait' | 'poster' | 'product' | 'repair';
  prompt: string;
  ratio: string;
}

const modelAccents = ['#7157e8', '#2f8ddb', '#22a172', '#d36c9b', '#d99a36', '#3979d5'];

const generationCategories: GenerationCategory[] = [
  { icon: AppstoreOutlined, label: '全部', value: 'all' },
  { icon: SmileOutlined, label: '人像美化', value: 'portrait' },
  { icon: PictureOutlined, label: '场景优化', value: 'scene' },
  { icon: BulbOutlined, label: '创意设计', value: 'creative' },
  { icon: BgColorsOutlined, label: '风格迁移', value: 'style' },
  { icon: ScanOutlined, label: '图片修复', value: 'repair' },
  { icon: HighlightOutlined, label: 'AI 绘画', value: 'paint' },
];

const generationShowcases: GenerationShowcase[] = [
  {
    category: 'portrait',
    description: '修复肤质与光影，保留自然五官和发丝细节',
    id: 'portrait-enhance',
    image: '/showcase/portrait-v1.png',
    label: '人像精修',
    preview: 'portrait',
    prompt: '自然精修人物肖像，保留真实五官与发丝细节，柔化肤色和光线，高清商业摄影质感。',
    ratio: '3:4',
  },
  {
    category: 'style',
    description: '保持人物主体，生成自然的服装与造型变化',
    id: 'fashion-change',
    image: '/showcase/fashion-v1.png',
    label: '服饰换装',
    preview: 'fashion',
    prompt: '保持人物身份、姿态和光影不变，将服装替换为清新的浅色礼服，材质自然，画面真实。',
    ratio: '3:4',
  },
  {
    category: 'scene',
    description: '从参考构图延伸出完整的高级风景画面',
    id: 'landscape-extend',
    image: '/showcase/landscape-v1.png',
    label: '场景延展',
    preview: 'landscape',
    prompt: '延展远处山脉和云海，保留原始构图与光影方向，生成清晨薄雾中的电影感风景。',
    ratio: '16:9',
  },
  {
    category: 'creative',
    description: '生成干净背景、商业棚拍光与产品卖点构图',
    id: 'product-shot',
    image: '/showcase/product-v1.png',
    label: '商品摄影',
    preview: 'product',
    prompt: '高级极简商品摄影，透明玻璃瓶置于浅色石材台面，柔和棚拍光，清晰材质细节。',
    ratio: '1:1',
  },
  {
    category: 'paint',
    description: '把文字创意转化成有层次的概念插画',
    id: 'poster-art',
    image: '/showcase/concept-v1.png',
    label: '概念海报',
    preview: 'poster',
    prompt: '未来城市与漂浮岛屿的科幻概念海报，克制蓝紫配色，纵深构图，精细光影层次。',
    ratio: '3:4',
  },
  {
    category: 'repair',
    description: '移除瑕疵并自然补全背景纹理',
    id: 'image-repair',
    image: '/showcase/restore-v1.png',
    label: '图片修复',
    preview: 'repair',
    prompt: '移除画面中的干扰物和瑕疵，自然补全背景纹理，保持原有清晰度、色彩和构图。',
    ratio: '智能比例',
  },
];

const retouchShowcases: RetouchShowcase[] = [
  {
    id: 'hair',
    image: '/showcase/portrait-v1.png',
    label: '换个发型',
    operation: 'restyle',
    position: '50% 20%',
    variant: 'hair',
  },
  {
    id: 'outfit',
    image: '/showcase/fashion-v1.png',
    label: '换个穿搭',
    operation: 'restyle',
    position: '50% 27%',
    variant: 'outfit',
  },
  {
    id: 'scene',
    image: '/showcase/landscape-v1.png',
    label: '换个背景',
    operation: 'background',
    position: '50% 58%',
    variant: 'scene',
  },
  {
    id: 'cutout',
    image: '/showcase/product-v1.png',
    label: '一键抠图',
    operation: 'cutout',
    position: '50% 49%',
    variant: 'cutout',
  },
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
const amounts = [1, 2, 3, 4];
const route = useRoute();
const workspace = useDrawWorkspaceStore();
const sessionStore = useSessionStore();
const modelCatalog = useModelCatalogStore();

const prompt = ref('');
const instruction = ref('');
const selectedAmount = ref(1);
const selectedModel = ref(modelCatalog.resolveAlias('image'));
const selectedRetouchModel = ref(modelCatalog.resolveAlias('image'));
const selectedOperation = ref(retouchOperations[0]?.value ?? 'enhance');
const activeGenerationCategory = ref('all');
const selectedRatio = ref('智能比例');
const selectedSize = ref('2K');
const selectedStorageDays = ref(1);
const generationStyleStrength = ref(60);
const generationSeed = ref('');
const generationPromptOptimize = ref(true);
const advancedGenerationOpen = ref(false);
const generationExamplesOpen = ref(false);
const retouchStrength = ref(65);
const legacyGenerationMode = ref(false);
const legacyRetouchMode = ref(false);
const canvasZoom = ref(100);
const selectedCanvasWorkId = ref('');
const selectedRetouchShowcaseId = ref('');
const retouchUndoStack = ref<RetouchHistorySnapshot[]>([]);
const retouchRedoStack = ref<RetouchHistorySnapshot[]>([]);
const retainedSourceUrls = new Set<string>();
const sourceError = ref('');
const sourceImage = ref<SourceImage | null>(null);
const sourceInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const consumedRouteContext = ref('');

const generationModels = computed<ModelOption[]>(() =>
  modelCatalog.modelsFor('image').map((model, index) => ({
    accent: modelAccents[index % modelAccents.length] ?? '#7157e8',
    label: model.displayName,
    value: model.alias,
  })),
);
const retouchModels = computed<RetouchModelOption[]>(() =>
  modelCatalog.modelsFor('image').map((model, index) => ({
    description: index === 0 ? '快速修图与日常增强' : '更精细的人像、商品与场景细节',
    label: model.displayName,
    value: model.alias,
  })),
);
const isGeneration = computed(() => route.name === 'image-generation');
const activeImageModelAlias = computed(() =>
  isGeneration.value ? selectedModel.value : selectedRetouchModel.value,
);
const activeImageProfile = computed(
  () =>
    modelCatalog.modelsFor('image').find((model) => model.alias === activeImageModelAlias.value)
      ?.profile?.image,
);
const availableSizes = computed(() => getImageSizePresets(activeImageProfile.value));

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
    generationModels.value.find((item) => item.value === selectedModel.value)?.label ??
    '图片生成模型',
);
const activeRetouchModelLabel = computed(
  () =>
    retouchModels.value.find((item) => item.value === selectedRetouchModel.value)?.label ??
    '智能修图',
);
const selectedRetouchShowcase = computed(() =>
  retouchShowcases.find((item) => item.id === selectedRetouchShowcaseId.value),
);
const generationCost = computed(() =>
  isGeneration.value ? selectedAmount.value * IMAGE_TASK_POINTS_COST : IMAGE_TASK_POINTS_COST,
);
const visibleGenerationShowcases = computed(() =>
  activeGenerationCategory.value === 'all'
    ? generationShowcases
    : generationShowcases.filter(
        (showcase) => showcase.category === activeGenerationCategory.value,
      ),
);
const visibleWorks = computed(() => workspace.works.filter((work) => work.tool === toolKey.value));
const generationGroups = computed(() => {
  const groups = new Map<string, DrawWork[]>();

  for (const work of visibleWorks.value) {
    const date = new Date(work.createdAt);
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    const group = groups.get(key) ?? [];

    group.push(work);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([label, works]) => ({ label, works }));
});
const latestCanvasWork = computed(() =>
  visibleWorks.value.find((work) => work.status === 'done' && work.artworkUrl),
);
const selectedCanvasWork = computed(
  () =>
    visibleWorks.value.find(
      (work) => work.id === selectedCanvasWorkId.value && work.status === 'done' && work.artworkUrl,
    ) ?? undefined,
);
const activeCanvasWork = computed(
  () =>
    selectedCanvasWork.value ??
    (sourceImage.value || selectedRetouchShowcase.value ? undefined : latestCanvasWork.value),
);
const canvasImageUrl = computed(
  () =>
    sourceImage.value?.url ??
    selectedRetouchShowcase.value?.image ??
    activeCanvasWork.value?.artworkUrl ??
    '',
);
const canvasImageName = computed(
  () =>
    sourceImage.value?.name ??
    (selectedRetouchShowcase.value
      ? `示例演示 · ${selectedRetouchShowcase.value.label}`
      : (activeCanvasWork.value?.prompt ?? '')),
);
const canUndoRetouch = computed(() => retouchUndoStack.value.length > 0);
const canRedoRetouch = computed(() => retouchRedoStack.value.length > 0);
const submitting = computed(() => workspace.submitting || uploading.value);
const canSubmit = computed(() => {
  if (submitting.value) {
    return false;
  }

  return isGeneration.value ? Boolean(prompt.value.trim()) : Boolean(sourceImage.value);
});

function cloneSourceImage(source: SourceImage | null): SourceImage | null {
  return source ? { ...source } : null;
}

function captureRetouchSnapshot(): RetouchHistorySnapshot {
  return {
    canvasZoom: canvasZoom.value,
    selectedCanvasWorkId: selectedCanvasWorkId.value,
    selectedRetouchShowcaseId: selectedRetouchShowcaseId.value,
    sourceImage: cloneSourceImage(sourceImage.value),
  };
}

function applyRetouchSnapshot(snapshot: RetouchHistorySnapshot): void {
  canvasZoom.value = snapshot.canvasZoom;
  selectedCanvasWorkId.value = snapshot.selectedCanvasWorkId;
  selectedRetouchShowcaseId.value = snapshot.selectedRetouchShowcaseId;
  sourceImage.value = cloneSourceImage(snapshot.sourceImage);
  sourceError.value = '';

  const showcase = retouchShowcases.find((item) => item.id === selectedRetouchShowcaseId.value);

  if (showcase) {
    selectedOperation.value = showcase.operation;
  }
}

function releaseUnusedSourceUrls(): void {
  const referencedUrls = new Set<string>();

  if (sourceImage.value) {
    referencedUrls.add(sourceImage.value.url);
  }

  for (const snapshot of [...retouchUndoStack.value, ...retouchRedoStack.value]) {
    if (snapshot.sourceImage) {
      referencedUrls.add(snapshot.sourceImage.url);
    }
  }

  for (const url of retainedSourceUrls) {
    if (!referencedUrls.has(url)) {
      URL.revokeObjectURL(url);
      retainedSourceUrls.delete(url);
    }
  }
}

function resetRetouchHistory(): void {
  retouchUndoStack.value = [];
  retouchRedoStack.value = [];

  for (const url of retainedSourceUrls) {
    URL.revokeObjectURL(url);
  }

  retainedSourceUrls.clear();
}

function commitRetouchHistory(): void {
  retouchUndoStack.value = [...retouchUndoStack.value.slice(-29), captureRetouchSnapshot()];
  retouchRedoStack.value = [];
}

function undoRetouch(): void {
  const snapshot = retouchUndoStack.value.at(-1);

  if (!snapshot) {
    return;
  }

  retouchRedoStack.value = [...retouchRedoStack.value, captureRetouchSnapshot()];
  retouchUndoStack.value = retouchUndoStack.value.slice(0, -1);
  applyRetouchSnapshot(snapshot);
  releaseUnusedSourceUrls();
}

function redoRetouch(): void {
  const snapshot = retouchRedoStack.value.at(-1);

  if (!snapshot) {
    return;
  }

  retouchUndoStack.value = [...retouchUndoStack.value, captureRetouchSnapshot()];
  retouchRedoStack.value = retouchRedoStack.value.slice(0, -1);
  applyRetouchSnapshot(snapshot);
  releaseUnusedSourceUrls();
}

function resetLocalForm(): void {
  prompt.value = '';
  instruction.value = '';
  selectedAmount.value = 1;
  activeGenerationCategory.value = 'all';
  selectedRatio.value = '智能比例';
  selectedSize.value = clampImageSizePreset('2K', availableSizes.value);
  selectedStorageDays.value = 1;
  generationStyleStrength.value = 60;
  generationSeed.value = '';
  generationPromptOptimize.value = true;
  advancedGenerationOpen.value = false;
  generationExamplesOpen.value = false;
  retouchStrength.value = 65;
  legacyGenerationMode.value = false;
  legacyRetouchMode.value = false;
  canvasZoom.value = 100;
  selectedCanvasWorkId.value = '';
  selectedRetouchShowcaseId.value = '';
  sourceError.value = '';
  resetRetouchHistory();

  if (sourceImage.value) {
    sourceImage.value = null;
  }
}

async function consumeRouteContext(): Promise<void> {
  const queryOperation =
    typeof route.query.operation === 'string' ? route.query.operation.trim() : '';
  const queryPrompt = typeof route.query.prompt === 'string' ? route.query.prompt.trim() : '';
  const sourceWorkId =
    typeof route.query.sourceWork === 'string' ? route.query.sourceWork.trim() : '';
  const routeKey = `${String(route.name)}:${queryOperation}:${sourceWorkId}:${queryPrompt}`;

  if (consumedRouteContext.value === routeKey) {
    return;
  }

  consumedRouteContext.value = routeKey;

  if (
    !isGeneration.value &&
    queryOperation &&
    retouchOperations.some((operation) => operation.value === queryOperation)
  ) {
    selectedOperation.value = queryOperation;
  }

  if (queryPrompt) {
    if (isGeneration.value) {
      prompt.value = queryPrompt;
    } else {
      instruction.value = queryPrompt;
    }
  }

  if (!sourceWorkId || isGeneration.value) {
    return;
  }

  uploading.value = true;
  sourceError.value = '';

  try {
    await workspace.initialize();

    const work = workspace.works.find(
      (item) => item.id === sourceWorkId && item.status === 'done' && item.resultFileId,
    );

    if (!work?.resultFileId) {
      throw new Error('原作品文件暂不可用，请重新上传图片');
    }

    const blob = await fetchFileBlob(work.resultFileId);

    commitRetouchHistory();
    sourceImage.value = null;
    sourceImage.value = {
      assetId: work.resultFileId,
      id: work.resultFileId,
      name: work.resultFileName || `draw-${work.id}.png`,
      url: URL.createObjectURL(blob),
    };
    retainedSourceUrls.add(sourceImage.value.url);
    selectedCanvasWorkId.value = '';
    selectedRetouchShowcaseId.value = '';
    releaseUnusedSourceUrls();
  } catch (error) {
    sourceError.value = error instanceof Error ? error.message : '原作品载入失败，请重新上传图片';
  } finally {
    uploading.value = false;
  }
}

function changeCanvasZoom(delta: number): void {
  const nextZoom = Math.min(200, Math.max(25, canvasZoom.value + delta));

  if (nextZoom === canvasZoom.value) {
    return;
  }

  commitRetouchHistory();
  canvasZoom.value = nextZoom;
}

function selectCanvasWork(workId: string): void {
  if (
    selectedCanvasWorkId.value === workId &&
    !sourceImage.value &&
    !selectedRetouchShowcaseId.value
  ) {
    return;
  }

  commitRetouchHistory();
  sourceImage.value = null;
  selectedRetouchShowcaseId.value = '';
  selectedCanvasWorkId.value = workId;
  releaseUnusedSourceUrls();
}

async function reuseGenerationPrompt(value: string): Promise<void> {
  prompt.value = value;

  const clipboard = navigator.clipboard;

  if (clipboard) {
    await clipboard.writeText(value).catch(() => undefined);
  }

  window.scrollTo({ behavior: 'smooth', top: document.body.scrollHeight });
}

function useGenerationShowcase(showcase: GenerationShowcase): void {
  prompt.value = showcase.prompt;
  selectedRatio.value = showcase.ratio;
  window.scrollTo({ behavior: 'smooth', top: document.body.scrollHeight });
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

    commitRetouchHistory();
    sourceImage.value = null;
    selectedRetouchShowcaseId.value = '';
    selectedCanvasWorkId.value = '';
    sourceImage.value = {
      assetId: asset.id,
      id: asset.id,
      name: asset.originalName,
      url: URL.createObjectURL(file),
    };
    retainedSourceUrls.add(sourceImage.value.url);
    releaseUnusedSourceUrls();
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

  commitRetouchHistory();
  sourceImage.value = null;
  selectedRetouchShowcaseId.value = '';
  sourceError.value = '';
  releaseUnusedSourceUrls();
}

function showRetouchShowcase(showcase?: RetouchShowcase): void {
  const nextShowcase =
    showcase ??
    retouchShowcases[
      (retouchShowcases.findIndex((item) => item.id === selectedRetouchShowcaseId.value) + 1) %
        retouchShowcases.length
    ];

  if (!nextShowcase) {
    return;
  }

  if (
    selectedRetouchShowcaseId.value === nextShowcase.id &&
    !sourceImage.value &&
    !selectedCanvasWorkId.value
  ) {
    return;
  }

  commitRetouchHistory();
  sourceImage.value = null;
  selectedCanvasWorkId.value = '';
  selectedRetouchShowcaseId.value = nextShowcase.id;
  selectedOperation.value = nextShowcase.operation;
  sourceError.value = '';
  releaseUnusedSourceUrls();
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
          advanced: {
            promptOptimize: generationPromptOptimize.value,
            seed: generationSeed.value.trim(),
            styleStrength: generationStyleStrength.value,
          },
          mode: 'text-to-image',
          storageDays: selectedStorageDays.value,
        }
      : {
          mode: 'image-to-image',
          operation: operation?.value,
          strength: retouchStrength.value,
        },
    model: isGeneration.value ? selectedModel.value : selectedRetouchModel.value,
    modelAlias: isGeneration.value ? selectedModel.value : selectedRetouchModel.value,
    modelLabel: isGeneration.value ? activeModelLabel.value : activeRetouchModelLabel.value,
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
    consumedRouteContext.value = '';
    void consumeRouteContext();
  },
);

watch(
  () => [route.query.operation, route.query.prompt, route.query.sourceWork],
  () => {
    void consumeRouteContext();
  },
);

onMounted(() => {
  void modelCatalog.load();
  void workspace.initialize();
  void consumeRouteContext();
});

watch(
  () =>
    modelCatalog
      .modelsFor('image')
      .map((model) => model.alias)
      .join('|'),
  () => {
    selectedModel.value = modelCatalog.resolveAlias('image', selectedModel.value);
    selectedRetouchModel.value = modelCatalog.resolveAlias('image', selectedRetouchModel.value);
  },
  { immediate: true },
);

watch(
  [selectedModel, selectedRetouchModel, availableSizes],
  () => {
    selectedSize.value = clampImageSizePreset(selectedSize.value, availableSizes.value);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  resetRetouchHistory();
});
</script>

<template>
  <section v-if="isGeneration ? legacyGenerationMode : legacyRetouchMode" class="image-tool-view">
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

        <section v-else class="image-tool-section">
          <header>
            <strong>修图模型</strong>
            <span>{{ retouchModels.length }} 个可用模型</span>
          </header>
          <div class="image-model-grid">
            <button
              v-for="(model, index) in retouchModels"
              :key="model.value"
              type="button"
              :class="{ active: selectedRetouchModel === model.value }"
              @click="selectedRetouchModel = model.value"
            >
              <i
                :style="{
                  '--model-accent': modelAccents[index % modelAccents.length] ?? '#7157e8',
                }"
              >
                {{ model.label.slice(0, 1) }}
              </i>
              <span>{{ model.label }}</span>
              <CheckOutlined v-if="selectedRetouchModel === model.value" />
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
              v-for="size in availableSizes"
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

  <section v-else-if="isGeneration" class="generation-studio">
    <header class="generation-studio__header">
      <div class="generation-studio__title">
        <span class="generation-studio__title-icon"><EditOutlined /></span>
        <span>AI PLATFORM</span>
        <h1>智能生图</h1>
      </div>
      <nav aria-label="图片生成入口">
        <button type="button" @click="legacyGenerationMode = true">旧文生图</button>
        <RouterLink to="/retouch">新版修图</RouterLink>
      </nav>
    </header>

    <div class="generation-studio__content">
      <div v-if="generationGroups.length > 0" class="generation-filter-bar">
        <button type="button">
          <ExperimentOutlined />
          全部时间
          <DownOutlined />
        </button>
        <span>批量操作</span>
        <div>
          <em v-if="workspace.generating">任务处理中</em>
          <small>{{ visibleWorks.length }} 个作品</small>
        </div>
      </div>

      <div v-if="workspace.error" class="generation-studio__error" role="alert">
        <span>{{ workspace.error.message }}</span>
        <button type="button" @click="workspace.clearError">关闭</button>
      </div>

      <div v-if="generationGroups.length > 0" class="generation-groups">
        <section v-for="group in generationGroups" :key="group.label">
          <header>
            <h2>{{ group.label }}</h2>
            <span>{{ group.works.length }} 张</span>
          </header>
          <div class="generation-work-grid">
            <article
              v-for="work in group.works"
              :key="work.id"
              class="generation-work-card"
              :class="`generation-work-card--${work.status}`"
            >
              <div class="generation-work-card__visual">
                <img
                  v-if="work.status === 'done' && work.artworkUrl"
                  :src="work.artworkUrl"
                  :alt="work.prompt"
                />
                <div v-else-if="work.status === 'failed'" class="generation-work-card__state">
                  <CloseOutlined />
                  <strong>生成失败</strong>
                </div>
                <div
                  v-else
                  class="generation-work-card__state generation-work-card__state--loading"
                >
                  <LoadingOutlined />
                  <strong>{{ work.status === 'queued' ? '等待生成' : '正在生成画面' }}</strong>
                </div>
                <span class="generation-work-card__badge">
                  {{ work.status === 'done' ? '已完成' : workStatusLabel(work.status) }}
                </span>
                <span class="generation-work-card__cost">
                  <ThunderboltFilled />
                  {{ IMAGE_TASK_POINTS_COST }}积分
                </span>
                <span class="generation-work-card__size">{{ work.size }}</span>
              </div>

              <div class="generation-work-card__body">
                <div class="generation-work-card__status">
                  <span :class="work.status" />
                  <strong>{{ workStatusLabel(work.status) }}</strong>
                  <time>{{ formatWorkTime(work.createdAt) }}</time>
                </div>
                <div class="generation-work-card__prompt">
                  <p>{{ work.prompt }}</p>
                  <button
                    type="button"
                    aria-label="复制提示词并再次使用"
                    title="复制提示词并再次使用"
                    @click="reuseGenerationPrompt(work.prompt)"
                  >
                    <CopyOutlined />
                  </button>
                </div>
                <small v-if="work.errorMessage" class="generation-work-card__error">
                  {{ work.errorMessage }}
                </small>
                <div class="generation-work-card__meta">
                  <span>
                    <ExperimentOutlined />
                    {{ work.modelLabel }}
                  </span>
                  <small>{{ work.ratio }} · {{ work.size }}</small>
                </div>
                <footer>
                  <button
                    v-if="work.status === 'done'"
                    type="button"
                    :class="{ active: work.favorite }"
                    @click="workspace.toggleFavorite(work.id)"
                  >
                    <StarOutlined />
                    {{ work.favorite ? '已收藏' : '收藏' }}
                  </button>
                  <button
                    v-if="work.status === 'done'"
                    type="button"
                    @click="workspace.downloadWork(work.id)"
                  >
                    <DownloadOutlined />
                    下载
                  </button>
                  <button v-else type="button" @click="workspace.retryWork(work.id)">
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
        </section>
      </div>

      <div v-else class="generation-studio__empty">
        <span><PictureOutlined /></span>
        <strong>开始生成你的第一张图片吧</strong>
        <p>输入您的创意描述，开始您的 AI 艺术创作之旅</p>

        <div class="generation-studio__feature-pills">
          <span><CheckOutlined />支持多种艺术风格</span>
          <span><ExperimentOutlined />高清画质输出</span>
          <span><ThunderboltFilled />快速生成</span>
        </div>

        <div class="generation-category-filter" aria-label="图片生成分类">
          <button
            v-for="category in generationCategories"
            :key="category.value"
            type="button"
            :class="{ active: activeGenerationCategory === category.value }"
            @click="activeGenerationCategory = category.value"
          >
            <component :is="category.icon" v-if="category.icon" />
            {{ category.label }}
          </button>
        </div>

        <div v-if="visibleGenerationShowcases.length > 0" class="generation-showcase-grid">
          <article
            v-for="showcase in visibleGenerationShowcases"
            :key="showcase.id"
            class="generation-showcase-card"
            tabindex="0"
            @click="useGenerationShowcase(showcase)"
            @keydown.enter="useGenerationShowcase(showcase)"
          >
            <div
              class="generation-showcase-card__visual"
              :class="`generation-showcase-card__visual--${showcase.preview}`"
            >
              <div class="generation-showcase-card__frame generation-showcase-card__frame--before">
                <span>原图</span>
                <img :src="showcase.image" alt="" loading="lazy" />
              </div>
              <div class="generation-showcase-card__frame generation-showcase-card__frame--after">
                <span>效果图</span>
                <img :src="showcase.image" alt="" loading="lazy" />
              </div>
            </div>
            <footer>
              <span>
                <strong>{{ showcase.label }}</strong>
                <small>{{ showcase.description }}</small>
              </span>
              <button type="button" @click.stop="useGenerationShowcase(showcase)">
                使用提示词
              </button>
            </footer>
          </article>
        </div>
      </div>
    </div>

    <footer
      class="generation-composer"
      :class="{ 'generation-composer--sticky': generationGroups.length > 0 }"
    >
      <input
        ref="sourceInput"
        type="file"
        accept="image/*"
        hidden
        :disabled="uploading"
        @change="handleSourceUpload"
      />

      <div v-if="generationExamplesOpen" class="generation-composer__examples-panel">
        <header>
          <span>
            <BulbOutlined />
            <strong>效果示例</strong>
          </span>
          <button type="button" aria-label="关闭效果示例" @click="generationExamplesOpen = false">
            <CloseOutlined />
          </button>
        </header>
        <div>
          <button
            v-for="showcase in generationShowcases"
            :key="showcase.id"
            type="button"
            @click="
              useGenerationShowcase(showcase);
              generationExamplesOpen = false;
            "
          >
            <img :src="showcase.image" alt="" />
            <span>{{ showcase.label }}</span>
          </button>
        </div>
      </div>

      <button
        v-if="!sourceImage"
        type="button"
        class="generation-composer__upload-tile"
        :disabled="uploading"
        @click="sourceInput?.click()"
      >
        <LoadingOutlined v-if="uploading" />
        <PlusOutlined v-else />
        <strong>{{ uploading ? '上传中' : '上传图片' }}</strong>
        <small>最多10张</small>
      </button>

      <div v-else class="generation-composer__source">
        <img :src="sourceImage.url" :alt="sourceImage.name" />
        <span>
          <strong>{{ sourceImage.name }}</strong>
          <small>参考图已就绪</small>
        </span>
        <button type="button" aria-label="移除参考图" @click="removeSource">
          <CloseOutlined />
        </button>
      </div>

      <label class="generation-composer__prompt">
        <textarea
          v-model="prompt"
          maxlength="1000"
          placeholder="请详细描述您想要生成的图片，例如：一只可爱的小猫坐在樱花树下，春日阳光透过花瓣洒下，高清摄影风格，柔和光线..."
          @keydown.enter.exact.prevent="submitTask"
        />
        <small>{{ prompt.length }}/1000</small>
      </label>

      <div v-if="advancedGenerationOpen" class="generation-composer__advanced">
        <label>
          <span>风格强度</span>
          <input v-model.number="generationStyleStrength" type="range" min="0" max="100" step="5" />
          <em>{{ generationStyleStrength }}%</em>
        </label>
        <label>
          <span>随机种子</span>
          <input
            v-model.trim="generationSeed"
            type="text"
            inputmode="numeric"
            maxlength="12"
            placeholder="随机"
          />
        </label>
        <label class="generation-composer__advanced-switch">
          <input v-model="generationPromptOptimize" type="checkbox" />
          <span>智能优化提示词</span>
        </label>
      </div>

      <div class="generation-composer__actions">
        <div class="generation-composer__settings">
          <label>
            <ExperimentOutlined />
            <select v-model="selectedModel" aria-label="生成模型">
              <option v-for="model in generationModels" :key="model.value" :value="model.value">
                {{ model.label }}
              </option>
            </select>
            <DownOutlined />
          </label>
          <label>
            <PictureOutlined />
            <select v-model.number="selectedAmount" aria-label="生成数量">
              <option v-for="amount in amounts" :key="amount" :value="amount">
                {{ amount }} 张
              </option>
            </select>
            <DownOutlined />
          </label>
          <label>
            <span class="generation-composer__ratio-mark" />
            <select v-model="selectedRatio" aria-label="画面比例">
              <option v-for="ratio in ratios" :key="ratio" :value="ratio">{{ ratio }}</option>
            </select>
            <DownOutlined />
          </label>
          <label>
            <ScanOutlined />
            <select v-model="selectedSize" aria-label="输出清晰度">
              <option v-for="size in availableSizes" :key="size" :value="size">{{ size }}</option>
            </select>
            <DownOutlined />
          </label>
          <button
            type="button"
            class="generation-composer__advanced-toggle"
            :class="{ active: advancedGenerationOpen }"
            :aria-expanded="advancedGenerationOpen"
            @click="advancedGenerationOpen = !advancedGenerationOpen"
          >
            <SettingOutlined />
            高级设置
            <DownOutlined />
          </button>
          <label class="generation-composer__storage">
            <CloudDownloadOutlined />
            <select v-model.number="selectedStorageDays" aria-label="存储时长">
              <option :value="1">存储 1 天</option>
              <option :value="7">存储 7 天</option>
              <option :value="30">存储 30 天</option>
            </select>
            <DownOutlined />
          </label>
          <button
            type="button"
            class="generation-composer__examples-toggle"
            :class="{ active: generationExamplesOpen }"
            :aria-expanded="generationExamplesOpen"
            @click="generationExamplesOpen = !generationExamplesOpen"
          >
            <BulbOutlined />
            查看示例
          </button>
        </div>
        <button
          type="button"
          class="generation-composer__submit"
          :disabled="!canSubmit"
          @click="submitTask"
        >
          <ThunderboltFilled />
          <span>{{ submitting ? '正在提交' : '立即生成' }}</span>
          <small>{{ generationCost }} 积分</small>
        </button>
      </div>
    </footer>
  </section>

  <section v-else class="retouch-studio">
    <main class="retouch-canvas">
      <header class="retouch-canvas__header">
        <div>
          <span class="retouch-canvas__title-icon"><ExperimentOutlined /></span>
          <strong>我的创作</strong>
          <small>（{{ visibleWorks.length }} 张图片）</small>
        </div>
        <button type="button" @click="legacyRetouchMode = true">
          <UndoOutlined />
          返回旧版
        </button>
      </header>

      <div class="retouch-canvas__workspace">
        <div v-if="canvasImageUrl" class="retouch-canvas__artwork">
          <img
            :src="canvasImageUrl"
            :alt="canvasImageName || '当前修图作品'"
            :style="{ transform: `scale(${canvasZoom / 100})` }"
          />
          <span v-if="activeCanvasWork">{{ activeCanvasWork.modelLabel }}</span>
        </div>

        <div v-else class="retouch-empty-guide">
          <div class="retouch-empty-guide__title">
            <span>修图示例</span>
            <small>动动嘴，一键 P 图</small>
          </div>
          <div class="retouch-empty-guide__examples" aria-label="智能修图能力示例">
            <button
              v-for="showcase in retouchShowcases"
              :key="showcase.id"
              type="button"
              class="retouch-empty-guide__example"
              :class="{
                active: selectedRetouchShowcaseId === showcase.id,
                'retouch-empty-guide__example--cutout': showcase.variant === 'cutout',
              }"
              @click="showRetouchShowcase(showcase)"
            >
              <strong>{{ showcase.label }}</strong>
              <img
                class="example-portrait"
                :src="showcase.image"
                alt=""
                loading="lazy"
                :style="{ '--example-position': showcase.position }"
              />
            </button>
          </div>
          <p>上传图片后，在右侧输入修改效果即可开始</p>
        </div>
      </div>

      <footer class="retouch-canvas__toolbar">
        <input
          ref="sourceInput"
          type="file"
          accept="image/*"
          hidden
          :disabled="uploading"
          @change="handleSourceUpload"
        />
        <button
          type="button"
          class="retouch-toolbar__add"
          :disabled="uploading"
          @click="sourceInput?.click()"
        >
          <LoadingOutlined v-if="uploading" />
          <PlusOutlined v-else />
          <span>{{ uploading ? '上传中' : '添加' }}</span>
        </button>
        <div class="retouch-toolbar__zoom">
          <button type="button" aria-label="缩小画布" @click="changeCanvasZoom(-10)">
            <ZoomOutOutlined />
          </button>
          <span>{{ canvasZoom }}%</span>
          <button type="button" aria-label="放大画布" @click="changeCanvasZoom(10)">
            <ZoomInOutlined />
          </button>
        </div>
        <div class="retouch-toolbar__history">
          <button type="button" :disabled="!canUndoRetouch" aria-label="撤销" @click="undoRetouch">
            <UndoOutlined />
            <span>撤销</span>
          </button>
          <button type="button" :disabled="!canRedoRetouch" aria-label="恢复" @click="redoRetouch">
            <RedoOutlined />
            <span>恢复</span>
          </button>
        </div>
      </footer>

      <div v-if="workspace.error || sourceError" class="retouch-canvas__notice" role="alert">
        <span>{{ workspace.error?.message || sourceError }}</span>
        <button
          type="button"
          @click="workspace.error ? workspace.clearError() : (sourceError = '')"
        >
          关闭
        </button>
      </div>
    </main>

    <aside class="retouch-chat">
      <header class="retouch-chat__new-project">
        <span><PlusOutlined /></span>
        <div>
          <strong>新建项目</strong>
          <small>开始新的修图对话</small>
        </div>
        <DownOutlined />
      </header>

      <div class="retouch-chat__body">
        <div v-if="visibleWorks.length > 0" class="retouch-history">
          <span class="retouch-history__label">最近创作</span>
          <button
            v-for="work in visibleWorks.slice(0, 5)"
            :key="work.id"
            type="button"
            :class="{ active: activeCanvasWork?.id === work.id }"
            @click="selectCanvasWork(work.id)"
          >
            <i>
              <img
                v-if="work.status === 'done' && work.artworkUrl"
                :src="work.artworkUrl"
                :alt="work.prompt"
              />
              <LoadingOutlined
                v-else-if="work.status === 'generating' || work.status === 'queued'"
              />
              <CloseOutlined v-else />
            </i>
            <span>
              <strong>{{ work.prompt }}</strong>
              <small
                >{{ workStatusLabel(work.status) }} · {{ formatWorkTime(work.createdAt) }}</small
              >
            </span>
          </button>
        </div>

        <div v-else class="retouch-chat__empty">
          <div class="retouch-chat__empty-mark">
            <CommentOutlined />
            <CommentOutlined />
          </div>
          <strong>开始您的 AI 修图之旅吧~</strong>
          <button type="button" @click="showRetouchShowcase()">查看示例演示 ✦</button>
        </div>
      </div>

      <footer class="retouch-composer">
        <div v-if="sourceImage" class="retouch-composer__source">
          <img :src="sourceImage.url" :alt="sourceImage.name" />
          <span>
            <strong>{{ sourceImage.name }}</strong>
            <small>原图已就绪</small>
          </span>
          <button type="button" aria-label="移除原图" @click="removeSource">
            <CloseOutlined />
          </button>
        </div>

        <div class="retouch-composer__operations">
          <button
            v-for="operation in retouchOperations"
            :key="operation.value"
            type="button"
            :class="{ active: selectedOperation === operation.value }"
            @click="selectedOperation = operation.value"
          >
            <component :is="operation.icon" />
            {{ operation.label }}
          </button>
        </div>

        <label class="retouch-composer__input">
          <textarea
            v-model="instruction"
            maxlength="600"
            placeholder="输入您想要的修改效果（@ 选择图片，/ 修图指令）"
            @keydown.enter.exact.prevent="submitTask"
          />
        </label>

        <div class="retouch-composer__actions">
          <div>
            <button
              type="button"
              class="retouch-composer__icon-button"
              aria-label="上传图片"
              :disabled="uploading"
              @click="sourceInput?.click()"
            >
              <LoadingOutlined v-if="uploading" />
              <PictureOutlined v-else />
            </button>
            <label class="retouch-composer__model">
              <PictureOutlined />
              <select v-model="selectedRetouchModel" aria-label="修图模型">
                <option v-for="model in retouchModels" :key="model.value" :value="model.value">
                  {{ model.label }}
                </option>
              </select>
              <DownOutlined />
            </label>
          </div>
          <button
            type="button"
            class="retouch-composer__submit"
            :disabled="!canSubmit"
            aria-label="提交修图"
            @click="submitTask"
          >
            <LoadingOutlined v-if="submitting" />
            <SendOutlined v-else />
          </button>
        </div>

        <div class="retouch-composer__meta">
          <span>{{ activeOperation?.label }} · {{ retouchStrength }}%</span>
          <span>本次消耗 {{ generationCost }} 积分 · 余额 {{ sessionStore.points }}</span>
        </div>
      </footer>
    </aside>
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

.generation-studio {
  display: grid;
  min-height: calc(100vh - 56px);
  grid-template-rows: auto minmax(0, 1fr) auto;
  background:
    linear-gradient(rgb(39 91 127 / 4%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(39 91 127 / 4%) 1px, transparent 1px), #fbfcfd;
  background-size: 42px 42px;
  color: #28333d;
}

.generation-studio__header {
  display: flex;
  width: min(100%, 1320px);
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  padding: 30px 27px 20px;
}

.generation-studio__title {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 1px 9px;
  grid-template-columns: auto minmax(0, 1fr);
}

.generation-studio__title > span:not(.generation-studio__title-icon) {
  align-self: end;
  color: #258b70;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.generation-studio__title-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  grid-row: 1 / 3;
  place-items: center;
  border: 1px solid #b9dfd3;
  border-radius: 8px;
  background: #eef9f5;
  color: #1f9471;
  font-size: 14px;
}

.generation-studio__header h1 {
  align-self: start;
  margin: 0;
  color: #26313a;
  font-size: 28px;
  font-weight: 900;
}

.generation-studio__header nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.generation-studio__header nav a,
.generation-studio__header nav button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 6px;
  padding: 0 13px;
  border: 1px solid #e3e8e6;
  border-radius: 8px;
  background: #fff;
  color: #48535d;
  font-size: 11px;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
}

.generation-studio__header nav a:last-child {
  border-color: #8dcab7;
  background: #eef9f5;
  color: #247b63;
}

.generation-studio__content {
  width: min(100%, 1320px);
  min-height: 0;
  margin: 0 auto;
  padding: 0 27px 190px;
}

.generation-filter-bar {
  display: flex;
  min-height: 57px;
  align-items: center;
  gap: 16px;
  padding: 9px 12px;
  border: 1px solid #e4e9e7;
  border-radius: 10px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 8px 24px rgb(35 54 48 / 4%);
  backdrop-filter: blur(12px);
}

.generation-filter-bar > button {
  display: inline-flex;
  height: 35px;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid #e2e7e5;
  border-radius: 8px;
  background: #fff;
  color: #58636d;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.generation-filter-bar > button :deep(svg:first-child) {
  color: #129065;
}

.generation-filter-bar > span {
  color: #69737d;
  font-size: 10px;
}

.generation-filter-bar > div {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.generation-filter-bar em {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border-radius: 999px;
  background: #fff4e5;
  color: #c77b17;
  font-size: 9px;
  font-style: normal;
  font-weight: 750;
}

.generation-filter-bar small {
  color: #9aa2a8;
  font-size: 9px;
}

.generation-studio__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid #efc8c3;
  border-radius: 8px;
  background: #fff5f4;
  color: #a8433a;
  font-size: 10px;
}

.generation-studio__error button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
}

.generation-groups {
  display: grid;
  gap: 30px;
  padding: 30px 0 8px;
}

.generation-groups > section {
  display: grid;
  gap: 14px;
}

.generation-groups > section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.generation-groups h2 {
  margin: 0;
  color: #2c3741;
  font-size: 19px;
}

.generation-groups > section > header span {
  color: #9aa2a8;
  font-size: 9px;
}

.generation-work-grid {
  display: grid;
  align-items: start;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.generation-work-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #dde5e2;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 9px 26px rgb(35 54 48 / 8%);
}

.generation-work-card__visual {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-bottom: 1px solid #edf1ef;
  background: #eef2f1;
}

.generation-work-card__visual > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.generation-work-card__state {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 8px;
  background: linear-gradient(145deg, #edf3f1, #dde8e4);
  color: #8a5b57;
}

.generation-work-card__state :deep(svg) {
  font-size: 22px;
}

.generation-work-card__state strong {
  font-size: 10px;
}

.generation-work-card__state--loading {
  background:
    linear-gradient(
      115deg,
      rgb(255 255 255 / 0%) 30%,
      rgb(255 255 255 / 74%) 48%,
      rgb(255 255 255 / 0%) 66%
    ),
    linear-gradient(145deg, #a8d7c9, #67ad98);
  background-size:
    240% 100%,
    100% 100%;
  color: #fff;
  animation: image-work-loading 1.8s ease-in-out infinite;
}

.generation-work-card__badge,
.generation-work-card__cost,
.generation-work-card__size {
  position: absolute;
  top: 9px;
  display: inline-flex;
  height: 23px;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgb(10 17 23 / 84%);
  color: #fff;
  font-size: 9px;
  font-weight: 750;
  backdrop-filter: blur(8px);
}

.generation-work-card__badge {
  left: 9px;
}

.generation-work-card__badge::before {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38cc87;
  content: '';
}

.generation-work-card--failed .generation-work-card__badge::before {
  background: #ef6559;
}

.generation-work-card--generating .generation-work-card__badge::before,
.generation-work-card--queued .generation-work-card__badge::before {
  background: #eea83a;
}

.generation-work-card__cost {
  right: 9px;
  padding: 0 7px;
  background: rgb(40 19 54 / 88%);
  color: #e8c9ff;
}

.generation-work-card__cost :deep(svg) {
  color: #b968ff;
}

.generation-work-card__size {
  top: auto;
  right: 9px;
  bottom: 9px;
  background: rgb(14 19 24 / 82%);
}

.generation-work-card__body {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.generation-work-card__status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.generation-work-card__status > span {
  width: 14px;
  height: 14px;
  border: 3px solid #cceee0;
  border-radius: 50%;
  background: #1ebc75;
}

.generation-work-card__status > span.failed {
  border-color: #f6d3d0;
  background: #df5a4e;
}

.generation-work-card__status > span.queued,
.generation-work-card__status > span.generating {
  border-color: #f8e6c6;
  background: #d99a35;
}

.generation-work-card__status strong {
  color: #48535c;
  font-size: 10px;
}

.generation-work-card__status time {
  margin-left: auto;
  color: #a1a8ae;
  font-size: 8px;
}

.generation-work-card__prompt {
  display: grid;
  min-width: 0;
  align-items: start;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.generation-work-card__prompt p {
  display: -webkit-box;
  min-height: 42px;
  overflow: hidden;
  margin: 0;
  color: #59636d;
  font-size: 10px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.generation-work-card__prompt button {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 1px solid #e3e8e6;
  border-radius: 6px;
  background: #fff;
  color: #6d7780;
  cursor: pointer;
}

.generation-work-card__error {
  overflow: hidden;
  color: #b24a41;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generation-work-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 9px;
  border-top: 1px solid #eef1f0;
}

.generation-work-card__meta > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  color: #4f5a63;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generation-work-card__meta :deep(svg) {
  color: #e0a22e;
}

.generation-work-card__meta small {
  color: #9aa2a8;
  font-size: 8px;
  white-space: nowrap;
}

.generation-work-card footer {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.generation-work-card footer button {
  display: inline-flex;
  min-width: 0;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 6px;
  border: 1px solid #e1e7e4;
  border-radius: 7px;
  background: #fff;
  color: #606b73;
  font-size: 8px;
  cursor: pointer;
}

.generation-work-card footer button.active {
  border-color: #ecd08f;
  background: #fffaf0;
  color: #bd7b13;
}

.generation-studio__empty {
  display: grid;
  min-height: 540px;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 99px 20px 42px;
  text-align: center;
}

.generation-studio__empty > span {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border: 1px solid #d1e9e2;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 28%, #fff, transparent 36%),
    linear-gradient(145deg, #eefaf6, #d7f1e9);
  color: #2b9175;
  font-size: 28px;
  box-shadow: 0 12px 28px rgb(45 145 117 / 10%);
}

.generation-studio__empty strong {
  margin-top: 9px;
  color: #37434c;
  font-size: 20px;
  font-weight: 850;
}

.generation-studio__empty p {
  margin: 0;
  color: #8b959c;
  font-size: 11px;
}

.generation-studio__feature-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
}

.generation-studio__feature-pills span {
  display: inline-flex;
  height: 31px;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eaf8f4;
  color: #258b70;
  font-size: 10px;
  font-weight: 680;
}

.generation-studio__feature-pills :deep(svg) {
  color: #18a178;
}

.generation-category-filter {
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 24px;
}

.generation-category-filter button {
  display: inline-flex;
  height: 38px;
  align-items: center;
  gap: 6px;
  padding: 0 19px;
  border: 1px solid #dde5e2;
  border-radius: 8px;
  background: #fff;
  color: #58636d;
  font-size: 11px;
  font-weight: 720;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.generation-category-filter button :deep(svg) {
  width: 14px;
  height: 14px;
  color: #4f5d68;
}

.generation-category-filter button:hover {
  border-color: #9bd1c0;
  color: #217c62;
}

.generation-category-filter button.active {
  border-color: #7f46d9;
  background: #8752e6;
  color: #fff;
  box-shadow: 0 8px 20px rgb(120 74 215 / 16%);
}

.generation-category-filter button.active :deep(svg) {
  color: #fff;
}

.generation-showcase-grid {
  display: grid;
  width: 100%;
  align-items: start;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 24px;
  text-align: left;
}

.generation-showcase-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #dce5e2;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 9px 24px rgb(34 57 50 / 6%);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.generation-showcase-card:hover {
  border-color: #a8d2c6;
  box-shadow: 0 14px 30px rgb(34 80 65 / 10%);
  transform: translateY(-2px);
}

.generation-showcase-card__visual {
  display: grid;
  aspect-ratio: 16 / 8.55;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  overflow: hidden;
  background: #dfe7e4;
}

.generation-showcase-card__frame {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background: #eef2f1;
}

.generation-showcase-card__frame > span {
  position: absolute;
  top: 8px;
  z-index: 2;
  display: inline-flex;
  height: 23px;
  align-items: center;
  padding: 0 8px;
  border-radius: 5px;
  background: rgb(18 22 26 / 76%);
  color: #fff;
  font-size: 9px;
  font-weight: 760;
  backdrop-filter: blur(8px);
}

.generation-showcase-card__frame--before > span {
  left: 8px;
}

.generation-showcase-card__frame--after > span {
  right: 8px;
  background: rgb(109 62 199 / 86%);
}

.generation-showcase-card__frame > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 220ms ease;
}

.generation-showcase-card__frame--before > img {
  filter: saturate(0.68) brightness(0.92) contrast(0.96);
  transform: scale(1.025);
}

.generation-showcase-card__frame--after > img {
  filter: saturate(1.06) brightness(1.03);
}

.generation-showcase-card:hover .generation-showcase-card__frame > img {
  transform: scale(1.045);
}

.generation-showcase-card:hover .generation-showcase-card__frame--before > img {
  transform: scale(1.055);
}

.generation-showcase-card__visual--portrait .generation-showcase-card__frame > img {
  object-position: 50% 20%;
}

.generation-showcase-card__visual--fashion .generation-showcase-card__frame > img {
  object-position: 50% 24%;
}

.generation-showcase-card__visual--landscape .generation-showcase-card__frame > img {
  object-position: 50% 57%;
}

.generation-showcase-card__visual--product .generation-showcase-card__frame > img {
  object-position: 50% 52%;
}

.generation-showcase-card__visual--poster .generation-showcase-card__frame > img {
  object-position: 50% 52%;
}

.generation-showcase-card__visual--repair .generation-showcase-card__frame > img {
  object-position: 50% 50%;
}

.generation-showcase-card footer {
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}

.generation-showcase-card footer > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.generation-showcase-card footer strong {
  color: #37434b;
  font-size: 11px;
}

.generation-showcase-card footer small {
  display: -webkit-box;
  overflow: hidden;
  color: #8a949a;
  font-size: 8px;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.generation-showcase-card footer button {
  height: 28px;
  flex: 0 0 auto;
  padding: 0 9px;
  border: 1px solid #cce6de;
  border-radius: 6px;
  background: #eff9f6;
  color: #248267;
  font-size: 8px;
  font-weight: 750;
  cursor: pointer;
}

.generation-composer {
  position: fixed;
  bottom: 16px;
  left: calc(50% + 120px);
  z-index: 24;
  display: grid;
  width: min(calc(100vw - 294px), 1266px);
  gap: 11px;
  grid-template-columns: 88px minmax(0, 1fr);
  grid-template-rows: 76px 50px;
  justify-self: center;
  margin: 0 auto;
  padding: 11px;
  border: 1px solid #b9ddd1;
  border-radius: 11px;
  background: rgb(252 255 254 / 96%);
  box-shadow:
    0 18px 48px rgb(31 80 65 / 14%),
    inset 0 0 0 1px rgb(255 255 255 / 78%);
  backdrop-filter: blur(18px);
  transform: translateX(-50%);
}

.generation-composer--sticky {
  position: sticky;
  bottom: 12px;
}

.generation-composer__upload-tile {
  display: grid;
  height: 82px;
  min-width: 0;
  min-height: 82px;
  align-content: center;
  align-self: center;
  justify-items: center;
  gap: 4px;
  grid-column: 1;
  grid-row: 1 / span 2;
  padding: 7px;
  border: 1px dashed #c8d8d2;
  border-radius: 9px;
  background: linear-gradient(135deg, rgb(255 255 255 / 92%), rgb(245 251 249 / 88%)), #fff;
  color: #7b8790;
  cursor: pointer;
}

.generation-composer__upload-tile :deep(svg) {
  color: #20a57d;
  font-size: 20px;
}

.generation-composer__upload-tile strong {
  color: #50615a;
  font-size: 10px;
  font-weight: 750;
}

.generation-composer__upload-tile small {
  color: #9ea9a5;
  font-size: 8px;
}

.generation-composer__upload-tile:disabled {
  cursor: wait;
  opacity: 0.72;
}

.generation-composer__source {
  display: grid;
  height: 82px;
  min-width: 0;
  min-height: 82px;
  align-items: center;
  align-self: center;
  gap: 9px;
  grid-column: 1;
  grid-row: 1 / span 2;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  padding: 6px;
  border: 1px solid #e0e9e6;
  border-radius: 8px;
  background: #f8fbfa;
}

.generation-composer__source img {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  object-fit: cover;
}

.generation-composer__source > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.generation-composer__source strong {
  overflow: hidden;
  color: #46535b;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generation-composer__source small {
  color: #8d979e;
  font-size: 8px;
}

.generation-composer__source button {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #879198;
  cursor: pointer;
}

.generation-composer__prompt {
  position: relative;
  display: block;
  align-self: start;
  grid-column: 2;
  grid-row: 1;
}

.generation-composer__prompt textarea {
  display: block;
  width: 100%;
  min-height: 68px;
  padding: 8px 48px 8px 9px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #3e4952;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.7;
  resize: vertical;
}

.generation-composer__prompt textarea::placeholder {
  color: #a6aeb4;
}

.generation-composer__prompt small {
  position: absolute;
  top: 5px;
  right: 5px;
  color: #a7aeb4;
  font-size: 8px;
}

.generation-composer__advanced {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: minmax(180px, 1fr) minmax(150px, 0.7fr) auto;
  padding: 9px 10px;
  border: 1px solid #e1ebe7;
  border-radius: 9px;
  background: #f7fbf9;
  grid-column: 1 / -1;
}

.generation-composer__advanced > label {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 7px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  color: #5b666e;
  font-size: 9px;
  font-weight: 700;
}

.generation-composer__advanced input[type='range'] {
  width: 100%;
  accent-color: #249674;
}

.generation-composer__advanced input[type='text'] {
  width: 100%;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #dbe7e3;
  border-radius: 6px;
  outline: 0;
  background: #fff;
  color: #3e4a52;
  font: inherit;
  font-size: 9px;
}

.generation-composer__advanced input[type='text']:focus {
  border-color: #8dcab7;
  box-shadow: 0 0 0 3px rgb(36 150 116 / 8%);
}

.generation-composer__advanced em {
  color: #288a6d;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}

.generation-composer__advanced-switch {
  display: inline-flex !important;
  align-items: center;
  gap: 6px !important;
  white-space: nowrap;
}

.generation-composer__advanced-switch input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #249674;
}

.generation-composer__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  grid-column: 2;
  grid-row: 2;
}

.generation-composer__settings {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.generation-composer__settings > button,
.generation-composer__settings > label {
  display: inline-flex;
  height: 34px;
  min-width: 0;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid #e0e7e4;
  border-radius: 8px;
  background: #fff;
  color: #4d5962;
  font-size: 9px;
  font-weight: 680;
}

.generation-composer__settings > button {
  cursor: pointer;
}

.generation-composer__settings > button.active {
  border-color: #8dcab7;
  background: #eff9f6;
  color: #247b63;
}

.generation-composer__advanced-toggle :deep(svg:last-child) {
  width: 9px;
  font-size: 8px;
  transition: transform 160ms ease;
}

.generation-composer__advanced-toggle.active :deep(svg:last-child) {
  transform: rotate(180deg);
}

.generation-composer__storage :deep(svg:first-child),
.generation-composer__examples-toggle :deep(svg:first-child) {
  color: #249674;
}

.generation-composer__examples-toggle {
  white-space: nowrap;
}

.generation-composer__examples-panel {
  display: grid;
  gap: 9px;
  grid-column: 1 / -1;
  padding: 10px;
  border: 1px solid #d9e9e4;
  border-radius: 10px;
  background: #f8fcfb;
}

.generation-composer__examples-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.generation-composer__examples-panel > header > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #31413c;
  font-size: 10px;
}

.generation-composer__examples-panel > header :deep(svg) {
  color: #249674;
}

.generation-composer__examples-panel > header > button {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #7f8a91;
  cursor: pointer;
}

.generation-composer__examples-panel > div {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.generation-composer__examples-panel > div > button {
  position: relative;
  min-width: 0;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  padding: 0;
  border: 1px solid #dfe9e6;
  border-radius: 7px;
  background: #eef3f1;
  cursor: pointer;
}

.generation-composer__examples-panel img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 180ms ease;
}

.generation-composer__examples-panel > div > button:hover img {
  transform: scale(1.04);
}

.generation-composer__examples-panel > div > button span {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12px 5px 4px;
  background: linear-gradient(transparent, rgb(10 20 18 / 76%));
  color: #fff;
  font-size: 8px;
  font-weight: 750;
  text-align: center;
}

.generation-composer__settings :deep(svg) {
  flex: 0 0 auto;
  color: #4b6974;
}

.generation-composer__settings select {
  min-width: 0;
  max-width: 132px;
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 9px;
  font-weight: 680;
  cursor: pointer;
}

.generation-composer__ratio-mark {
  display: block;
  width: 13px;
  height: 10px;
  border: 1.5px solid #4b6974;
  border-radius: 1px;
}

.generation-composer__submit {
  display: grid;
  min-width: 166px;
  height: 50px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 1px 7px;
  grid-template-columns: auto auto;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 18%), transparent 42%),
    linear-gradient(135deg, #51c9a0, #289b7a);
  color: #fff;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.generation-composer__submit :deep(svg) {
  color: #fff;
}

.generation-composer__submit span {
  white-space: nowrap;
}

.generation-composer__submit small {
  grid-column: 1 / -1;
  color: #dff9f0;
  font-size: 8px;
  font-weight: 600;
}

.generation-composer__submit:disabled {
  background: #cfd8d5;
  color: #fff;
  cursor: not-allowed;
}

.retouch-studio {
  display: grid;
  min-height: calc(100vh - 56px);
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 20px;
  overflow-x: hidden;
  padding: 20px;
  background: radial-gradient(circle at 42% 20%, rgb(58 75 139 / 12%), transparent 34%), #080b14;
  color: #f4f6ff;
}

.retouch-canvas,
.retouch-chat {
  min-width: 0;
  border: 1px solid #20263b;
  border-radius: 18px;
  background: #0d1120;
  box-shadow: 0 22px 60px rgb(0 0 0 / 28%);
}

.retouch-canvas {
  position: relative;
  display: grid;
  min-height: 720px;
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.retouch-canvas::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(115 128 170 / 6%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(115 128 170 / 6%) 1px, transparent 1px);
  background-size: 28px 28px;
  content: '';
  pointer-events: none;
}

.retouch-canvas__header {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 20px;
}

.retouch-canvas__header > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.retouch-canvas__title-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(145deg, #8d63ff, #3e275f);
  color: #fff;
  font-size: 13px;
}

.retouch-canvas__header strong {
  font-size: 14px;
  font-weight: 780;
}

.retouch-canvas__header small {
  overflow: hidden;
  color: #8089a3;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retouch-canvas__header button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #53a7ff;
  border-radius: 7px;
  background: #172743;
  color: #59a9ff;
  font-size: 11px;
  font-weight: 720;
  cursor: pointer;
}

.retouch-canvas__workspace {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 0;
  place-items: center;
  overflow: auto;
  padding: 24px;
}

.retouch-canvas__artwork {
  position: relative;
  display: grid;
  width: min(100%, 880px);
  height: min(100%, 640px);
  place-items: center;
}

.retouch-canvas__artwork img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  box-shadow: 0 18px 60px rgb(0 0 0 / 42%);
  object-fit: contain;
  transform-origin: center;
  transition: transform 180ms ease;
}

.retouch-canvas__artwork > span {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 5px 8px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 6px;
  background: rgb(8 11 20 / 78%);
  color: #c5cbe0;
  font-size: 10px;
  backdrop-filter: blur(10px);
}

.retouch-empty-guide {
  display: grid;
  width: min(100%, 440px);
  justify-items: center;
  gap: 22px;
}

.retouch-empty-guide__title {
  display: grid;
  justify-items: center;
  gap: 3px;
}

.retouch-empty-guide__title span {
  background: linear-gradient(90deg, #f65ce8, #aa66ff 54%, #52a7ff);
  background-clip: text;
  color: transparent;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.retouch-empty-guide__title small {
  color: #a49ac3;
  font-size: 10px;
}

.retouch-empty-guide__examples {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  padding: 5px;
  border-radius: 6px;
  background: #fff;
  box-shadow:
    0 0 0 1px rgb(196 118 255 / 85%),
    0 0 26px rgb(170 102 255 / 32%);
}

.retouch-empty-guide__example {
  position: relative;
  display: grid;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease;
}

.retouch-empty-guide__example:hover,
.retouch-empty-guide__example.active {
  filter: brightness(1.06) saturate(1.08);
  transform: translateY(-2px);
}

.retouch-empty-guide__example strong {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 2;
  padding: 2px 6px;
  border-radius: 3px;
  background: #c857f5;
  color: #fff;
  font-size: 9px;
  font-weight: 780;
  text-align: center;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

.retouch-empty-guide__example:nth-child(2) strong {
  background: #3f97f5;
}

.retouch-empty-guide__example:nth-child(3) strong {
  background: #f0824a;
}

.retouch-empty-guide__example:nth-child(4) strong {
  background: #8b5cf6;
}

.example-portrait {
  position: relative;
  display: block;
  width: 100%;
  height: 132px;
  overflow: hidden;
  background: #151a25;
  object-fit: cover;
  object-position: var(--example-position, 50% 50%);
}

.retouch-empty-guide__example--cutout {
  background:
    linear-gradient(45deg, #dadde2 25%, transparent 25%),
    linear-gradient(-45deg, #dadde2 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #dadde2 75%),
    linear-gradient(-45deg, transparent 75%, #dadde2 75%), #f3f4f6;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

.retouch-empty-guide__example--cutout .example-portrait {
  clip-path: polygon(
    34% 100%,
    35% 84%,
    27% 78%,
    25% 66%,
    31% 58%,
    35% 57%,
    37% 44%,
    42% 27%,
    54% 23%,
    69% 27%,
    75% 42%,
    71% 55%,
    78% 61%,
    75% 75%,
    66% 100%
  );
}

.retouch-empty-guide > p {
  margin: 0;
  color: #707a96;
  font-size: 11px;
}

.retouch-canvas__toolbar {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-top: 1px solid rgb(255 255 255 / 5%);
  background: rgb(9 13 23 / 72%);
}

.retouch-canvas__toolbar button {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid #353b53;
  background: #151b2b;
  color: #7d849a;
  font-size: 10px;
  cursor: pointer;
}

.retouch-canvas__toolbar button:disabled {
  cursor: default;
  opacity: 0.62;
}

.retouch-toolbar__add {
  border-color: #367a69 !important;
  color: #62c5a7 !important;
}

.retouch-canvas__toolbar .retouch-toolbar__add {
  min-width: 76px;
  height: 54px;
  flex-direction: column;
  border-radius: 8px 0 0 8px;
  font-size: 15px;
}

.retouch-toolbar__add span {
  font-size: 10px;
}

.retouch-toolbar__zoom {
  display: flex;
  height: 38px;
  align-items: center;
  overflow: hidden;
  border: 1px solid #353b53;
  border-radius: 7px;
}

.retouch-toolbar__zoom button {
  border: 0;
  background: transparent;
}

.retouch-toolbar__zoom span {
  min-width: 54px;
  color: #be7df1;
  font-size: 10px;
  text-align: center;
}

.retouch-toolbar__history {
  display: flex;
  gap: 6px;
}

.retouch-toolbar__history button {
  min-width: 58px;
  height: 54px;
  flex-direction: column;
  border-radius: 8px;
}

.retouch-toolbar__history button:not(:disabled) {
  border-color: #4c456a;
  background: #191a2b;
  color: #cfc7eb;
}

.retouch-toolbar__history button:not(:disabled):hover {
  border-color: #7b65bd;
  color: #f1ecff;
}

.retouch-toolbar__history span {
  font-size: 9px;
}

.retouch-canvas__notice {
  position: absolute;
  top: 72px;
  right: 18px;
  z-index: 5;
  display: flex;
  max-width: min(440px, calc(100% - 36px));
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #7c3f49;
  border-radius: 8px;
  background: rgb(52 22 29 / 92%);
  color: #ffc1c7;
  font-size: 11px;
}

.retouch-canvas__notice span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retouch-canvas__notice button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 10px;
  cursor: pointer;
}

.retouch-chat {
  display: grid;
  min-height: 720px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.retouch-chat__new-project {
  display: grid;
  min-height: 68px;
  align-items: center;
  gap: 10px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  padding: 0 16px;
  border-bottom: 1px solid #20263b;
  background: #121729;
}

.retouch-chat__new-project > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(145deg, #252044, #8a55e8);
  color: #fff;
}

.retouch-chat__new-project > div {
  display: grid;
  gap: 2px;
}

.retouch-chat__new-project strong {
  font-size: 13px;
}

.retouch-chat__new-project small {
  color: #747d95;
  font-size: 9px;
}

.retouch-chat__new-project > :deep(svg) {
  color: #8e97ad;
  font-size: 12px;
}

.retouch-chat__body {
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
}

.retouch-history {
  display: grid;
  gap: 8px;
}

.retouch-history__label {
  padding: 2px 3px 4px;
  color: #6e7891;
  font-size: 10px;
  font-weight: 720;
}

.retouch-history button {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 10px;
  grid-template-columns: 48px minmax(0, 1fr);
  padding: 8px;
  border: 1px solid #252b40;
  border-radius: 10px;
  background: #111728;
  color: #dfe4f3;
  text-align: left;
  cursor: pointer;
}

.retouch-history button.active {
  border-color: #6b57ac;
  background: #191a32;
  box-shadow: inset 3px 0 0 #8e68f0;
}

.retouch-history button > i {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #20263a;
  color: #8992a8;
}

.retouch-history button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.retouch-history button > span {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.retouch-history button strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retouch-history button small {
  color: #74809a;
  font-size: 9px;
}

.retouch-chat__empty {
  display: grid;
  min-height: 440px;
  place-items: center;
  align-content: center;
  gap: 20px;
  text-align: center;
}

.retouch-chat__empty-mark {
  position: relative;
  width: 62px;
  height: 48px;
}

.retouch-chat__empty-mark :deep(svg) {
  position: absolute;
  color: #4f566c;
  font-size: 34px;
}

.retouch-chat__empty-mark :deep(svg:first-child) {
  top: 0;
  left: 0;
}

.retouch-chat__empty-mark :deep(svg:last-child) {
  right: 0;
  bottom: 0;
  color: #3d4357;
}

.retouch-chat__empty strong {
  color: #717a90;
  font-size: 12px;
  font-weight: 600;
}

.retouch-chat__empty button {
  height: 36px;
  padding: 0 16px;
  border: 1px solid #6a548e;
  border-radius: 8px;
  background: #332450;
  color: #e9dcff;
  font-size: 11px;
  font-weight: 720;
  cursor: pointer;
}

.retouch-composer {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid #22283d;
  background: #101526;
}

.retouch-composer__source {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 9px;
  grid-template-columns: 40px minmax(0, 1fr) 28px;
  padding: 7px;
  border: 1px solid #2b324b;
  border-radius: 9px;
  background: #171d30;
}

.retouch-composer__source img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.retouch-composer__source > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.retouch-composer__source strong {
  overflow: hidden;
  color: #e4e8f5;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retouch-composer__source small {
  color: #77819a;
  font-size: 9px;
}

.retouch-composer__source button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #858da2;
  cursor: pointer;
}

.retouch-composer__operations {
  display: flex;
  gap: 3px;
  padding-bottom: 2px;
}

.retouch-composer__operations::-webkit-scrollbar {
  display: none;
}

.retouch-composer__operations button {
  display: inline-flex;
  height: 28px;
  min-width: 0;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 3px;
  border: 1px solid #2a3148;
  border-radius: 999px;
  background: #161c2e;
  color: #8d96ac;
  font-size: 8px;
  white-space: nowrap;
  cursor: pointer;
}

.retouch-composer__operations button :deep(svg) {
  flex: 0 0 auto;
  font-size: 9px;
}

.retouch-composer__operations button.active {
  border-color: #735bb0;
  background: #28203f;
  color: #d9c8ff;
}

.retouch-composer__input {
  display: block;
}

.retouch-composer__input textarea {
  display: block;
  width: 100%;
  min-height: 90px;
  padding: 12px;
  border: 1px solid #293149;
  border-radius: 10px;
  outline: 0;
  background: #151b2d;
  color: #f1f3fa;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.7;
  resize: vertical;
}

.retouch-composer__input textarea:focus {
  border-color: #755eb0;
  box-shadow: 0 0 0 3px rgb(122 91 199 / 12%);
}

.retouch-composer__input textarea::placeholder {
  color: #697289;
}

.retouch-composer__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.retouch-composer__actions > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.retouch-composer__icon-button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #2a3248;
  border-radius: 8px;
  background: #171d2f;
  color: #d6dbea;
  cursor: pointer;
}

.retouch-composer__model {
  position: relative;
  display: flex;
  min-width: 0;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid #2a3248;
  border-radius: 8px;
  background: #171d2f;
  color: #e7eaf4;
}

.retouch-composer__model :deep(svg) {
  flex: 0 0 auto;
  font-size: 11px;
}

.retouch-composer__model select {
  min-width: 0;
  max-width: 150px;
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 10px;
  font-weight: 650;
  cursor: pointer;
}

.retouch-composer__model option {
  background: #171d2f;
  color: #fff;
}

.retouch-composer__submit {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #7049dc, #9e5cf2);
  color: #fff;
  cursor: pointer;
}

.retouch-composer__submit:disabled {
  background: #30364a;
  color: #737b90;
  cursor: not-allowed;
}

.retouch-composer__meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #68728b;
  font-size: 8px;
}

@media (max-width: 1060px) {
  .image-tool-layout {
    grid-template-columns: 340px minmax(0, 1fr);
  }

  .retouch-studio {
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 14px;
    padding: 14px;
  }

  .generation-work-grid {
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
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

  .retouch-studio {
    min-height: calc(100vh - 56px);
    grid-template-columns: 1fr;
    padding: 12px 12px 78px;
  }

  .retouch-canvas {
    min-height: 560px;
  }

  .retouch-chat {
    min-height: 620px;
  }

  .retouch-chat__empty {
    min-height: 280px;
  }

  .generation-studio__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    padding: 22px 16px 16px;
  }

  .generation-studio__header nav {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .generation-studio__header nav::-webkit-scrollbar {
    display: none;
  }

  .generation-studio__header nav a,
  .generation-studio__header nav button {
    flex: 0 0 auto;
  }

  .generation-studio__content {
    padding: 0 16px 20px;
  }

  .generation-studio__empty {
    min-height: 560px;
    padding-right: 0;
    padding-left: 0;
  }

  .generation-category-filter {
    justify-content: flex-start;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 3px;
    scrollbar-width: none;
  }

  .generation-category-filter::-webkit-scrollbar {
    display: none;
  }

  .generation-category-filter button {
    flex: 0 0 auto;
  }

  .generation-showcase-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .generation-work-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .generation-composer {
    position: relative;
    right: auto;
    bottom: auto;
    left: auto;
    width: calc(100% - 24px);
    grid-template-columns: 92px minmax(0, 1fr);
    grid-template-rows: auto;
    margin: 0 auto 12px;
    transform: none;
  }

  .generation-composer--sticky {
    bottom: 70px;
  }

  .generation-composer__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .generation-composer__submit {
    width: 100%;
  }

  .generation-composer__advanced {
    grid-template-columns: 1fr;
  }

  .generation-composer__examples-panel > div {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .generation-studio__empty {
    min-height: 610px;
  }

  .generation-showcase-grid {
    grid-template-columns: 1fr;
  }

  .generation-showcase-card__visual {
    aspect-ratio: 16 / 7.2;
  }

  .generation-studio__feature-pills {
    gap: 7px;
  }

  .generation-studio__feature-pills span {
    padding: 0 9px;
    font-size: 9px;
  }

  .retouch-studio {
    padding-right: 8px;
    padding-left: 8px;
  }

  .retouch-canvas,
  .retouch-chat {
    border-radius: 13px;
  }

  .retouch-canvas__header {
    padding: 0 12px;
  }

  .retouch-canvas__header button {
    padding: 0 9px;
    font-size: 9px;
  }

  .retouch-canvas__workspace {
    padding: 16px 10px;
  }

  .retouch-empty-guide {
    gap: 15px;
  }

  .retouch-empty-guide__examples {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .example-portrait {
    height: 130px;
  }

  .retouch-canvas__toolbar {
    flex-wrap: wrap;
    padding: 8px;
  }

  .retouch-composer__model select {
    max-width: 116px;
  }

  .generation-studio__header > div {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .generation-studio__header h1 {
    font-size: 23px;
  }

  .generation-filter-bar {
    gap: 8px;
  }

  .generation-filter-bar > span {
    display: none;
  }

  .generation-filter-bar > div {
    gap: 7px;
  }

  .generation-groups {
    padding-top: 22px;
  }

  .generation-work-grid {
    grid-template-columns: 1fr;
  }

  .generation-studio__empty {
    min-height: 390px;
  }

  .generation-composer {
    width: calc(100% - 16px);
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .generation-composer__upload-tile,
  .generation-composer__source,
  .generation-composer__prompt,
  .generation-composer__actions {
    grid-column: 1;
    grid-row: auto;
  }

  .generation-composer__upload-tile,
  .generation-composer__source {
    min-height: 78px;
  }

  .generation-composer__settings {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .generation-composer__settings > button,
  .generation-composer__settings > label {
    width: 100%;
  }

  .generation-composer__settings > button {
    justify-content: center;
  }

  .generation-composer__settings select {
    max-width: 94px;
  }

  .retouch-composer__operations {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .retouch-composer__operations::-webkit-scrollbar {
    display: none;
  }

  .retouch-composer__operations button {
    flex: 0 0 auto;
    padding: 0 8px;
  }
}
</style>
