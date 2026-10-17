<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BgColorsOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  ExperimentOutlined,
  ExpandOutlined,
  HighlightOutlined,
  HomeOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ScissorOutlined,
  ShopOutlined,
  StarOutlined,
  ThunderboltFilled,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import type { FileAsset } from '@/app/api';
import {
  DRAW_EFFECT_CATEGORIES,
  DRAW_EFFECT_TEMPLATES,
  type DrawEffectTemplate,
} from '@/data/draw-templates';
import {
  IMAGE_TASK_POINTS_COST,
  useDrawWorkspaceStore,
  type DrawWorkStatus,
} from '@/stores/draw-workspace';
import { useModelCatalogStore } from '@/stores/model-catalog';
import { useSessionStore } from '@/stores/session';

interface NavigationItem {
  icon: Component;
  label: string;
  to: string;
}

interface ModelItem {
  accent: string;
  badge?: string;
  label: string;
  value: string;
}

interface ToolItem {
  accent: string;
  description: string;
  glyph: string;
  label: string;
  tags: string[];
}

interface ReferenceImage {
  assetId: string;
  id: string;
  name: string;
  url: string;
}

const navigation: NavigationItem[] = [
  { icon: HomeOutlined, label: '首页', to: '/' },
  { icon: PictureOutlined, label: '作品广场', to: '/draw' },
];

const modelAccents = ['#7a5cff', '#ff7043', '#20a66a', '#2f8ddb', '#d05b9a', '#d69a2d'];

const topNavigation = ['做电商', '做视频', '拍写真', '搞设计'];
const creationModes = ['文生图', '参考图重绘', '局部编辑', '商品图处理'];
const ratios = ['智能比例', '1:1', '4:3', '3:4', '16:9', '9:16'];
const amounts = [1, 2, 3, 4];
const galleryFilters = [
  '全部',
  '写实',
  '人物',
  '头像',
  '动漫',
  '3D',
  '国风',
  '风景',
  '建筑',
  '其他',
];
const effectCategories = DRAW_EFFECT_CATEGORIES;
const effectTemplates = DRAW_EFFECT_TEMPLATES;
const storageOptions = ['1天', '3天', '7天'];
const MAX_REFERENCE_IMAGES = 10;

const creativeTypes: ToolItem[] = [
  {
    accent: '#3979ed',
    description: '从文字或参考图生成高质量画面，适合灵感探索与内容配图。',
    glyph: '绘',
    label: 'AI 绘画',
    tags: ['文生图', '图片重绘', '批量探索'],
  },
  {
    accent: '#15966e',
    description: '让图片动起来，生成产品短片和创意镜头。',
    glyph: '视',
    label: 'AI 视频',
    tags: ['图生视频', '文生视频', '视频特效'],
  },
  {
    accent: '#e28732',
    description: '完成放大、扩图、擦除、修复和商品图批量处理。',
    glyph: '修',
    label: '图片编辑',
    tags: ['图片放大', 'AI 扩图', '一键抠图'],
  },
];

const commerceTools: ToolItem[] = [
  {
    accent: '#e2a02f',
    description: '上传商品图，一次生成主图、详情页与活动背景，保持品牌视觉统一。',
    glyph: '商',
    label: 'AI 商品套图',
    tags: ['商品主图', '详情页', '活动素材'],
  },
  {
    accent: '#2c8fd1',
    description: '保留商品主体与构图，快速替换场景并生成多比例展示图。',
    glyph: '展',
    label: '商品场景图',
    tags: ['商品展示', '场景替换', '多比例'],
  },
];

const imageToolGroups: { label: string; tools: ToolItem[] }[] = [
  {
    label: '核心功能',
    tools: [
      {
        accent: '#27a36f',
        description: '调色、增强与细节修复',
        glyph: '处',
        label: '图片处理',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '去噪、修复与瑕疵清理',
        glyph: '复',
        label: '图片修复',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '一键识别主体并移除背景',
        glyph: '抠',
        label: '智能抠图',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '人像美化、证件照与精修',
        glyph: '人',
        label: '人像处理',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '增强光线、氛围与清晰度',
        glyph: '场',
        label: '场景优化',
        tags: [],
      },
    ],
  },
  {
    label: '编辑与优化',
    tools: [
      {
        accent: '#27a36f',
        description: '油彩、动漫与插画风格转换',
        glyph: '风',
        label: '风格转换',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '亮度、色彩与对比度调整',
        glyph: '色',
        label: '色彩调整',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '锐化、降噪与纹理增强',
        glyph: '细',
        label: '细节优化',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '智能裁剪、旋转与无损扩图',
        glyph: '裁',
        label: '尺寸调整',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '镜头光晕与真实特效叠加',
        glyph: '效',
        label: '特效处理',
        tags: [],
      },
    ],
  },
  {
    label: '创意实验室',
    tools: [
      {
        accent: '#27a36f',
        description: '生成海报、封面和视觉草案',
        glyph: '创',
        label: '创意设计',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '多图融合与统一风格输出',
        glyph: '融',
        label: '图片融合',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '识别物体、场景和文字信息',
        glyph: '识',
        label: '智能识别',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '水印、压缩与批量处理',
        glyph: '批',
        label: '批量处理',
        tags: [],
      },
      {
        accent: '#27a36f',
        description: '探索更多图片创作能力',
        glyph: '更',
        label: '更多工具',
        tags: [],
      },
    ],
  },
];

const prompt = ref('');
const libraryQuery = ref('');
const drawLibraryCollapsed = ref(false);
const libraryToolsOpen = ref(true);
const modelCatalog = useModelCatalogStore();
const currentModel = ref(modelCatalog.resolveAlias('image'));
const selectedRatio = ref('智能比例');
const selectedAmount = ref(1);
const selectedSize = ref('1K');
const selectedMode = ref('文生图');
const activeResultTab = ref<'gallery' | 'mine'>('gallery');
const activeEffectCategory = ref('全部');
const activeGalleryFilter = ref('全部');
const selectedEffectId = ref('');
const selectedStorage = ref('1天');
const templateAdvancedOpen = ref(false);
const templateExampleId = ref('');
const selectedWorkDetailId = ref('');
const detailPrompt = ref('');
const detailSubmitting = ref(false);
const workEditDrafts = ref<Record<string, string>>({});
const referenceImages = ref<ReferenceImage[]>([]);
const referenceError = ref('');
const referenceInput = ref<HTMLInputElement | null>(null);
const templateReferenceInput = ref<HTMLInputElement | null>(null);
const consumedGenerationToken = ref('');
const uploadingReference = ref(false);
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const workspace = useDrawWorkspaceStore();

const models = computed<ModelItem[]>(() =>
  modelCatalog.modelsFor('image').map((model, index) => ({
    accent: modelAccents[index % modelAccents.length] ?? '#7a5cff',
    badge: index === 0 ? '推荐' : undefined,
    label: model.displayName,
    value: model.alias,
  })),
);

const filteredModels = computed(() => {
  const query = libraryQuery.value.trim().toLowerCase();

  if (!query) {
    return models.value;
  }

  return models.value.filter((model) => model.label.toLowerCase().includes(query));
});
const filteredImageToolGroups = computed(() => {
  const query = libraryQuery.value.trim().toLowerCase();

  if (!query) {
    return imageToolGroups;
  }

  return imageToolGroups
    .map((group) => ({
      ...group,
      tools: group.tools.filter((tool) =>
        `${tool.label} ${tool.description}`.toLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.tools.length > 0);
});

const selectedModelLabel = computed(
  () => models.value.find((model) => model.value === currentModel.value)?.label ?? '选择模型',
);

const isGeneratingView = computed(() => route.query.view === 'generate');
const isTemplateView = computed(() => route.name === 'newdraw' || route.query.view === 'templates');
const generationCost = computed(() => selectedAmount.value * IMAGE_TASK_POINTS_COST);
const generating = computed(() => workspace.generating || uploadingReference.value);
const filteredEffectTemplates = computed(() => {
  if (activeEffectCategory.value === '全部') {
    return effectTemplates;
  }

  return effectTemplates.filter((item) => item.category === activeEffectCategory.value);
});
const selectedExampleTemplate = computed(
  () =>
    effectTemplates.find((template) => template.id === templateExampleId.value) ??
    effectTemplates.find((template) => template.id === selectedEffectId.value) ??
    filteredEffectTemplates.value[0] ??
    null,
);
const visibleWorks = computed(() => {
  const works =
    activeResultTab.value === 'gallery'
      ? workspace.works.filter((work) => work.status === 'done')
      : [...workspace.works];

  if (activeResultTab.value !== 'gallery' || activeGalleryFilter.value === '全部') {
    return works;
  }

  return works.filter(
    (work) => inferGalleryCategory(work.prompt, work.modelLabel) === activeGalleryFilter.value,
  );
});
const activeWorkDetail = computed(
  () =>
    workspace.works.find(
      (work) => work.id === selectedWorkDetailId.value && work.status === 'done',
    ) ?? null,
);

watch(
  activeWorkDetail,
  (work) => {
    detailPrompt.value = work?.prompt ?? '';
  },
  { immediate: true },
);

function inferGalleryCategory(prompt: string, modelLabel: string): string {
  const content = `${prompt} ${modelLabel}`.toLowerCase();

  if (/动漫|漫画|二次元|anime|插画/.test(content)) {
    return '动漫';
  }

  if (/国风|水墨|工笔|汉服/.test(content)) {
    return '国风';
  }

  if (/3d|三维|建模|黏土/.test(content)) {
    return '3D';
  }

  if (/建筑|室内|空间|景观/.test(content)) {
    return '建筑';
  }

  if (/风景|山川|雪山|海边|森林|湖边|天空|城市/.test(content)) {
    return '风景';
  }

  if (/头像|证件照|肖像/.test(content)) {
    return '头像';
  }

  if (/人物|女孩|男孩|女性|男性|模特|写真|服装/.test(content)) {
    return '人物';
  }

  if (/写实|摄影|真实|高清/.test(content)) {
    return '写实';
  }

  return '其他';
}

function syncGeneratorFromRoute(): void {
  const routePrompt = route.query.prompt;
  const routeModel = route.query.model;
  const routeRatio = route.query.ratio;
  const routeAmount = Number(route.query.amount);
  const routeSize = route.query.size;
  const routeMode = route.query.mode;
  const routeStorage = route.query.storage;

  if (typeof routePrompt === 'string') {
    prompt.value = routePrompt;
  }

  if (typeof routeModel === 'string' && models.value.some((model) => model.value === routeModel)) {
    currentModel.value = routeModel;
  }

  if (typeof routeRatio === 'string' && ratios.includes(routeRatio)) {
    selectedRatio.value = routeRatio;
  }

  if (Number.isFinite(routeAmount) && routeAmount >= 1 && routeAmount <= 4) {
    selectedAmount.value = routeAmount;
  }

  if (typeof routeSize === 'string' && ['1K', '2K', '4K'].includes(routeSize)) {
    selectedSize.value = routeSize;
  }

  if (typeof routeMode === 'string' && creationModes.includes(routeMode)) {
    selectedMode.value = routeMode;
  }

  if (typeof routeStorage === 'string' && storageOptions.includes(routeStorage)) {
    selectedStorage.value = routeStorage;
  }
}

function openGenerator(options: { auto?: boolean; mode?: string } = {}): void {
  if (options.mode) {
    selectedMode.value = options.mode;
  }

  void router.push({
    name: 'draw',
    query: {
      amount: String(selectedAmount.value),
      auto: options.auto ? '1' : undefined,
      mode: selectedMode.value,
      model: currentModel.value,
      prompt: prompt.value.trim() || undefined,
      ratio: selectedRatio.value,
      size: selectedSize.value,
      start: options.auto ? Date.now().toString() : undefined,
      storage: selectedStorage.value,
      view: 'generate',
    },
  });
}

function toggleDrawLibrary(): void {
  drawLibraryCollapsed.value = !drawLibraryCollapsed.value;
}

function handleLibraryTool(item: ToolItem): void {
  handleImageTool(item);

  if (window.innerWidth < 980) {
    drawLibraryCollapsed.value = true;
  }
}

function handleCreativeTag(item: ToolItem, tag: string): void {
  if (/视频/.test(tag)) {
    void router.push('/video');
    return;
  }

  if (/商品|电商/.test(tag)) {
    void router.push('/commerce');
    return;
  }

  if (/抠图/.test(tag)) {
    openRetouch('cutout');
    return;
  }

  if (/扩图|放大|裁剪/.test(tag)) {
    openRetouch('upscale');
    return;
  }

  if (/修复|重绘/.test(tag)) {
    openRetouch('enhance');
    return;
  }

  openGenerator({
    mode: item.label === 'AI 绘画' || item.label === '批量创作' ? '文生图' : '参考图重绘',
  });
}

function handleCommerceTag(item: ToolItem): void {
  if (item.label === '商品场景图') {
    void router.push('/commerce');
    return;
  }

  openGenerator({ mode: '商品图处理' });
}

function openTemplateRetouch(): void {
  void router.push({ name: 'smart-retouch' });
}

function openTemplatePicker(): void {
  void router.push({
    name: 'draw',
    query: {
      amount: String(selectedAmount.value),
      mode: selectedMode.value,
      model: currentModel.value,
      prompt: prompt.value.trim() || undefined,
      ratio: selectedRatio.value,
      size: selectedSize.value,
      storage: selectedStorage.value,
      view: 'templates',
    },
  });
}

function openRetouch(operation: string, work?: { id: string; prompt: string }): void {
  void router.push({
    name: 'smart-retouch',
    query: {
      operation,
      prompt: work?.prompt,
      sourceWork: work?.id,
    },
  });
}

function applyEffectTemplate(template: DrawEffectTemplate): void {
  selectedEffectId.value = template.id;
  selectedMode.value = template.mode;
  prompt.value = template.prompt;

  requestAnimationFrame(() => {
    document.querySelector('.draw-template-composer')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  });
}

function openTemplateExample(template?: DrawEffectTemplate): void {
  templateExampleId.value =
    (template?.id ?? selectedEffectId.value) || filteredEffectTemplates.value[0]?.id || '';
}

function closeTemplateExample(): void {
  templateExampleId.value = '';
}

function applyTemplateExample(template: DrawEffectTemplate): void {
  applyEffectTemplate(template);
  closeTemplateExample();
}

function handleTemplateExampleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeTemplateExample();
  }
}

function usePromptInComposer(value: string): void {
  prompt.value = value;
  activeResultTab.value = 'mine';
}

async function startGeneration(): Promise<void> {
  if (!prompt.value.trim() || generating.value) {
    return;
  }

  await workspace.initialize();

  const createdWorks = await workspace.createGenerationWorks({
    amount: selectedAmount.value,
    model: currentModel.value,
    modelAlias: currentModel.value,
    modelLabel: selectedModelLabel.value,
    prompt: prompt.value.trim(),
    ratio: selectedRatio.value,
    referenceFileIds: referenceImages.value.slice(1).map((image) => image.assetId),
    size: selectedSize.value,
    sourceFileId: referenceImages.value[0]?.assetId,
    extraParameters: {
      storage: selectedStorage.value,
    },
  });

  if (createdWorks.length > 0) {
    activeResultTab.value = 'mine';
  }
}

function leaveGenerator(): void {
  void router.push('/draw');
}

function handleTopNavigation(item: string): void {
  const destinations: Record<string, () => void> = {
    做电商: () => void router.push('/commerce'),
    做视频: () => void router.push('/video'),
    拍写真: () => openRetouch('restyle'),
    搞设计: () => void router.push('/canvas'),
  };
  const destination = destinations[item];

  if (destination) {
    destination();
  } else {
    openGenerator();
  }
}

function handleCreativeType(item: ToolItem): void {
  if (item.label === '图片编辑') {
    openRetouch('enhance');
    return;
  }

  if (item.label === 'AI 视频') {
    void router.push('/video');
    return;
  }

  openGenerator({
    mode: item.label === 'AI 绘画' ? '文生图' : '参考图重绘',
  });
}

function handleImageTool(item: ToolItem): void {
  const operations: Record<string, string> = {
    人物处理: 'restyle',
    图片修复: 'enhance',
    图片处理: 'enhance',
    图片融合: 'canvas',
    场景优化: 'background',
    尺寸调整: 'upscale',
    批量处理: 'commerce',
    智能抠图: 'cutout',
    智能识别: 'erase',
    更多工具: 'map',
    色彩调整: 'restyle',
    特效处理: 'restyle',
    细节优化: 'enhance',
    创意设计: 'restyle',
    风格转换: 'restyle',
  };
  const destination = operations[item.label];

  if (destination === 'canvas') {
    void router.push('/canvas');
    return;
  }

  if (destination === 'commerce') {
    void router.push('/commerce');
    return;
  }

  if (destination === 'map') {
    void router.push('/map');
    return;
  }

  openRetouch(destination ?? 'enhance');
}

function selectCreationMode(mode: string): void {
  selectedMode.value = mode;
  openGenerator({ mode });
}

async function handleReferenceUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  if (files.length === 0) {
    return;
  }

  const remaining = MAX_REFERENCE_IMAGES - referenceImages.value.length;

  if (remaining <= 0) {
    referenceError.value = `最多上传 ${MAX_REFERENCE_IMAGES} 张参考图`;
    input.value = '';
    return;
  }

  const acceptedFiles = files.slice(0, remaining);
  uploadingReference.value = true;
  referenceError.value = '';

  try {
    const uploaded = await Promise.all(
      acceptedFiles.map(async (file) => ({
        asset: (await workspace.uploadReference(file)) as FileAsset,
        file,
      })),
    );

    referenceImages.value = [
      ...referenceImages.value,
      ...uploaded.map(({ asset, file }) => ({
        assetId: asset.id,
        id: asset.id,
        name: asset.originalName,
        url: URL.createObjectURL(file),
      })),
    ];

    if (files.length > acceptedFiles.length) {
      referenceError.value = `最多上传 ${MAX_REFERENCE_IMAGES} 张参考图，超出的图片未上传`;
    }
  } catch (error) {
    referenceError.value = error instanceof Error ? error.message : '参考图上传失败，请重试';
  } finally {
    input.value = '';
    uploadingReference.value = false;
  }
}

function removeReference(referenceId: string): void {
  const target = referenceImages.value.find((item) => item.id === referenceId);

  if (target) {
    URL.revokeObjectURL(target.url);
  }

  referenceImages.value = referenceImages.value.filter((item) => item.id !== referenceId);
}

function formatWorkTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(timestamp);
}

function formatWorkId(workId: string): string {
  return (
    workId
      .replace(/[^a-z0-9]/gi, '')
      .slice(-10)
      .toUpperCase() || workId
  );
}

function getWorkEditDraft(workId: string, prompt: string): string {
  return workEditDrafts.value[workId] ?? prompt;
}

function setWorkEditDraft(workId: string, value: string): void {
  workEditDrafts.value = {
    ...workEditDrafts.value,
    [workId]: value,
  };
}

function downloadWork(workId: string): void {
  void workspace.downloadWork(workId);
}

function retryWork(workId: string): void {
  void workspace.retryWork(workId);
}

function openWorkDetail(workId: string): void {
  const work = workspace.works.find((item) => item.id === workId);

  if (work?.status === 'done') {
    selectedWorkDetailId.value = workId;
  }
}

function closeWorkDetail(): void {
  selectedWorkDetailId.value = '';
}

function reuseWorkPrompt(workId: string): void {
  const work = workspace.works.find((item) => item.id === workId);

  if (!work) {
    return;
  }

  usePromptInComposer(work.prompt);
  closeWorkDetail();
  document.querySelector('.draw-composer')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

function regenerateWork(workId: string): void {
  void workspace.retryWork(workId);
  closeWorkDetail();
}

async function submitWorkModification(workId: string, rawPrompt?: string): Promise<void> {
  const work = workspace.works.find((item) => item.id === workId);
  const nextPrompt = (rawPrompt ?? getWorkEditDraft(workId, work?.prompt ?? '')).trim();

  if (!work || !nextPrompt || detailSubmitting.value) {
    return;
  }

  detailSubmitting.value = true;

  try {
    const createdWorks = await workspace.createGenerationWorks({
      amount: 1,
      extraParameters: work.parameters,
      model: work.model,
      modelAlias: work.modelAlias,
      modelLabel: work.modelLabel,
      prompt: nextPrompt,
      ratio: work.ratio,
      size: work.size,
      sourceFileId: work.resultFileId || work.sourceFileId || undefined,
      toolKey: work.tool,
    });

    if (createdWorks.length === 0) {
      return;
    }

    delete workEditDrafts.value[work.id];
    detailPrompt.value = nextPrompt;
    activeResultTab.value = 'mine';
    closeWorkDetail();
  } finally {
    detailSubmitting.value = false;
  }
}

function editWork(operation: string, workId: string): void {
  const work = workspace.works.find((item) => item.id === workId);

  if (!work) {
    return;
  }

  closeWorkDetail();
  openRetouch(operation, work);
}

function workStatusLabel(status: DrawWorkStatus): string {
  const labels: Record<DrawWorkStatus, string> = {
    done: '已完成',
    failed: '生成失败',
    generating: '生成中',
    queued: '排队中',
  };

  return labels[status];
}

function generate(): void {
  if (!prompt.value.trim()) {
    return;
  }

  openGenerator({
    auto: true,
  });
}

watch(
  () => [route.query.view, route.query.start, route.query.prompt],
  () => {
    if (!isGeneratingView.value && !isTemplateView.value) {
      return;
    }

    syncGeneratorFromRoute();

    if (!isGeneratingView.value) {
      return;
    }

    const token = `${String(route.query.start ?? '')}:${String(route.query.prompt ?? '')}`;

    if (
      route.query.auto === '1' &&
      consumedGenerationToken.value !== token &&
      prompt.value.trim()
    ) {
      consumedGenerationToken.value = token;
      void startGeneration();
    }
  },
  {
    immediate: true,
  },
);

onMounted(() => {
  void modelCatalog.load();
  void workspace.initialize();
  window.addEventListener('keydown', handleTemplateExampleKeydown);
});

watch(
  () => models.value.map((model) => model.value).join('|'),
  () => {
    currentModel.value = modelCatalog.resolveAlias('image', currentModel.value);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleTemplateExampleKeydown);

  for (const image of referenceImages.value) {
    URL.revokeObjectURL(image.url);
  }
});
</script>

<template>
  <div
    class="draw-studio"
    :class="{
      'draw-studio--library-collapsed': drawLibraryCollapsed,
      'draw-studio--template': isTemplateView,
    }"
  >
    <aside class="draw-library">
      <header class="draw-library__header">
        <span class="draw-library__mark">
          <BgColorsOutlined />
        </span>
        <span>
          <strong>极光 AI 绘画</strong>
          <small>Draw Studio</small>
        </span>
        <button
          type="button"
          :aria-label="drawLibraryCollapsed ? '展开绘画侧栏' : '收起绘画侧栏'"
          :title="drawLibraryCollapsed ? '展开绘画侧栏' : '收起绘画侧栏'"
          @click="toggleDrawLibrary"
        >
          <DownOutlined />
        </button>
      </header>

      <label class="draw-library__search">
        <SearchOutlined />
        <input v-model="libraryQuery" placeholder="搜索工具或模型" />
      </label>

      <nav class="draw-library__navigation" aria-label="绘画工具导航">
        <RouterLink v-for="item in navigation" :key="item.label" :to="item.to" :title="item.label">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <section class="draw-library__models">
        <header>
          <strong>绘画模型</strong>
          <span>{{ filteredModels.length }}</span>
        </header>
        <button
          v-for="model in filteredModels"
          :key="model.value"
          type="button"
          :class="{ active: currentModel === model.value }"
          @click="currentModel = model.value"
        >
          <i :style="{ '--model-accent': model.accent }">{{ model.label.slice(0, 1) }}</i>
          <span>{{ model.label }}</span>
          <em v-if="model.badge">{{ model.badge }}</em>
          <CheckOutlined v-if="currentModel === model.value" />
        </button>
      </section>

      <section class="draw-library__tools">
        <button
          type="button"
          class="draw-library__tools-toggle"
          :aria-expanded="libraryToolsOpen"
          @click="libraryToolsOpen = !libraryToolsOpen"
        >
          <span>
            <AppstoreOutlined />
            图片创作工具
          </span>
          <DownOutlined :class="{ open: libraryToolsOpen }" />
        </button>

        <div
          v-if="libraryToolsOpen && filteredImageToolGroups.length"
          class="draw-library__tool-groups"
        >
          <section v-for="group in filteredImageToolGroups" :key="group.label">
            <strong>{{ group.label }}</strong>
            <button
              v-for="tool in group.tools"
              :key="tool.label"
              type="button"
              :title="tool.label"
              @click="handleLibraryTool(tool)"
            >
              <i :style="{ '--tool-accent': tool.accent }">{{ tool.glyph }}</i>
              <span>
                {{ tool.label }}
                <small>{{ tool.description }}</small>
              </span>
            </button>
          </section>
        </div>
      </section>

      <section class="draw-library__shortcut">
        <span>快速开始</span>
        <button type="button" @click="openTemplatePicker">
          <PictureOutlined />
          文生图
          <ArrowRightOutlined />
        </button>
        <button type="button" @click="openGenerator({ mode: '参考图重绘' })">
          <ExperimentOutlined />
          参考图重绘
          <ArrowRightOutlined />
        </button>
      </section>
    </aside>

    <main class="draw-main">
      <section v-if="isTemplateView" class="draw-template-studio">
        <header class="draw-template-studio__header">
          <strong class="draw-template-studio__brand">
            <PictureOutlined />
            极光 AI 智能生图
          </strong>
          <div>
            <button
              type="button"
              class="draw-template-studio__action draw-template-studio__action--legacy"
              @click="openGenerator({ mode: '文生图' })"
            >
              <StarOutlined />
              旧文生图
            </button>
            <button
              type="button"
              class="draw-template-studio__action draw-template-studio__action--retouch"
              @click="openTemplateRetouch"
            >
              <HighlightOutlined />
              新版修图
            </button>
          </div>
        </header>

        <div class="draw-template-studio__content">
          <header class="draw-template-hero">
            <span>
              <PictureOutlined />
            </span>
            <h1>开始生成你的第一张图片吧</h1>
            <p>输入创意描述，或从效果模板开始你的 AI 创作之旅</p>
            <div>
              <em>支持多种艺术风格</em>
              <em>高清画质输出</em>
              <em>快速生成</em>
            </div>
          </header>

          <nav class="draw-template-categories" aria-label="效果分类">
            <button
              v-for="category in effectCategories"
              :key="category"
              type="button"
              :class="{ active: activeEffectCategory === category }"
              @click="activeEffectCategory = category"
            >
              {{ category }}
            </button>
          </nav>

          <section class="draw-effect-grid">
            <article
              v-for="template in filteredEffectTemplates"
              :key="template.id"
              class="draw-effect-card"
              :class="{ active: selectedEffectId === template.id }"
            >
              <div
                class="draw-effect-card__visual"
                :class="`draw-effect-card__visual--${template.visualClass}`"
              >
                <span>原图</span>
                <img
                  class="draw-effect-card__visual-before"
                  :src="template.image"
                  alt=""
                  loading="lazy"
                />
                <img
                  class="draw-effect-card__visual-after"
                  :src="template.image"
                  alt=""
                  loading="lazy"
                />
                <em>效果图</em>
              </div>
              <div class="draw-effect-card__copy">
                <header>
                  <h2>{{ template.label }}</h2>
                  <span>
                    <em v-for="tag in template.tags" :key="tag">{{ tag }}</em>
                  </span>
                </header>
                <p>{{ template.description }}</p>
                <div class="draw-effect-card__steps">
                  <strong>操作步骤：</strong>
                  <span v-for="(step, index) in template.steps" :key="step">
                    <i>{{ index + 1 }}</i>
                    {{ step }}
                  </span>
                </div>
              </div>
              <button type="button" @click="applyEffectTemplate(template)">
                {{ selectedEffectId === template.id ? '已应用，继续描述' : '使用该效果' }}
              </button>
            </article>
          </section>
        </div>

        <form class="draw-template-composer" @submit.prevent="generate">
          <input
            ref="templateReferenceInput"
            type="file"
            accept="image/*"
            multiple
            hidden
            :disabled="uploadingReference || referenceImages.length >= MAX_REFERENCE_IMAGES"
            @change="handleReferenceUpload"
          />
          <button
            type="button"
            class="draw-template-composer__upload"
            aria-label="上传参考图"
            :disabled="uploadingReference || referenceImages.length >= MAX_REFERENCE_IMAGES"
            @click="templateReferenceInput?.click()"
          >
            <img v-if="referenceImages[0]" :src="referenceImages[0].url" alt="" />
            <LoadingOutlined v-else-if="uploadingReference" />
            <PlusOutlined v-else />
            <span>
              {{
                referenceImages.length
                  ? `${referenceImages.length} / ${MAX_REFERENCE_IMAGES}`
                  : '上传图片'
              }}
            </span>
            <small>{{ referenceImages.length ? '继续添加' : '最多 10 张' }}</small>
          </button>
          <label class="draw-template-composer__prompt">
            <textarea
              v-model="prompt"
              maxlength="500"
              placeholder="请详细描述您想要生成的图片，例如：一只可爱的小猫坐在樱花树下，春日阳光透过花瓣洒下，高清摄影风格，柔和光线..."
            />
            <small>{{ prompt.length }}/500</small>
          </label>
          <p v-if="referenceError" class="draw-template-composer__error">{{ referenceError }}</p>
          <div v-if="templateAdvancedOpen" class="draw-template-composer__advanced">
            <label>
              <span>画面比例</span>
              <select v-model="selectedRatio">
                <option v-for="ratio in ratios" :key="ratio" :value="ratio">{{ ratio }}</option>
              </select>
            </label>
            <label>
              <span>输出清晰度</span>
              <select v-model="selectedSize">
                <option v-for="size in ['1K', '2K', '4K']" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
            </label>
          </div>
          <footer>
            <label>
              <select v-model="currentModel" aria-label="选择绘画模型">
                <option v-for="model in models" :key="model.value" :value="model.value">
                  {{ model.label }}
                </option>
              </select>
              <DownOutlined />
            </label>
            <label>
              <select v-model="selectedAmount" aria-label="选择生成数量">
                <option v-for="amount in amounts" :key="amount" :value="amount">
                  {{ amount }} 张
                </option>
              </select>
              <DownOutlined />
            </label>
            <button
              type="button"
              :class="{ active: templateAdvancedOpen }"
              @click="templateAdvancedOpen = !templateAdvancedOpen"
            >
              高级设置
              <DownOutlined />
            </button>
            <label>
              <select v-model="selectedStorage" aria-label="选择图片存储时长">
                <option v-for="storage in storageOptions" :key="storage" :value="storage">
                  存储 {{ storage }}
                </option>
              </select>
              <DownOutlined />
            </label>
            <span>
              <ThunderboltFilled />
              {{ generationCost }} 积分
            </span>
            <button type="button" @click="openTemplateExample()">查看示例</button>
            <button
              class="draw-template-composer__submit"
              type="submit"
              :disabled="!prompt.trim() || generating"
            >
              <LoadingOutlined v-if="generating" />
              <ThunderboltFilled v-else />
              {{ generating ? '生成中' : '立即生成' }}
            </button>
          </footer>
        </form>
      </section>

      <section v-else-if="isGeneratingView" class="draw-generator">
        <header class="draw-generator__header">
          <button type="button" class="draw-generator__back" @click="leaveGenerator">
            <ArrowLeftOutlined />
            返回创作中心
          </button>
          <div class="draw-generator__title">
            <strong>{{ selectedModelLabel }}</strong>
            <span>{{ models.length }} 个模型</span>
          </div>
          <div class="draw-generator__tabs">
            <button
              type="button"
              :class="{ active: activeResultTab === 'gallery' }"
              @click="activeResultTab = 'gallery'"
            >
              作品广场
            </button>
            <button
              type="button"
              :class="{ active: activeResultTab === 'mine' }"
              @click="activeResultTab = 'mine'"
            >
              我的作品
              <span v-if="workspace.works.length">{{ workspace.works.length }}</span>
            </button>
          </div>
        </header>

        <div class="draw-generator__workspace">
          <aside class="draw-generator__params">
            <section class="draw-param-section">
              <header>
                <strong>选择模型</strong>
                <span>{{ models.length }} 个模型</span>
              </header>
              <div class="draw-generator__model-grid">
                <button
                  v-for="model in models"
                  :key="model.value"
                  type="button"
                  :class="{ active: currentModel === model.value }"
                  @click="currentModel = model.value"
                >
                  <i :style="{ '--model-accent': model.accent }">
                    {{ model.label.slice(0, 1) }}
                  </i>
                  <span>{{ model.label }}</span>
                  <CheckOutlined v-if="currentModel === model.value" />
                </button>
              </div>
            </section>

            <label class="draw-generator__prompt">
              <strong>绘画描述</strong>
              <span>
                <textarea
                  v-model="prompt"
                  maxlength="500"
                  placeholder="描述你想生成的图片，例如：春日樱花树下的橘猫，柔和自然光，高清摄影"
                />
                <small>{{ prompt.length }} / 500</small>
              </span>
            </label>

            <section class="draw-param-section draw-generator__references">
              <header>
                <strong>参考图</strong>
                <span>
                  {{
                    uploadingReference
                      ? '上传中...'
                      : `已上传 ${referenceImages.length} / ${MAX_REFERENCE_IMAGES} 张`
                  }}
                </span>
              </header>
              <input
                ref="referenceInput"
                type="file"
                accept="image/*"
                multiple
                hidden
                :disabled="uploadingReference || referenceImages.length >= MAX_REFERENCE_IMAGES"
                @change="handleReferenceUpload"
              />
              <div>
                <span
                  v-for="image in referenceImages"
                  :key="image.id"
                  class="draw-generator__reference"
                >
                  <img :src="image.url" :alt="image.name" />
                  <button type="button" aria-label="移除参考图" @click="removeReference(image.id)">
                    <CloseOutlined />
                  </button>
                </span>
                <button
                  v-if="referenceImages.length < MAX_REFERENCE_IMAGES"
                  type="button"
                  class="draw-generator__upload"
                  :disabled="uploadingReference || referenceImages.length >= MAX_REFERENCE_IMAGES"
                  @click="referenceInput?.click()"
                >
                  <LoadingOutlined v-if="uploadingReference" />
                  <PlusOutlined v-else />
                  <small>{{ uploadingReference ? '上传中' : '上传参考图' }}</small>
                </button>
              </div>
              <p v-if="referenceError" class="draw-generator__field-error">{{ referenceError }}</p>
            </section>

            <section class="draw-param-section">
              <header>
                <strong>图片尺寸</strong>
                <span>清晰度</span>
              </header>
              <div class="draw-generator__options">
                <button
                  v-for="size in ['1K', '2K', '4K']"
                  :key="size"
                  type="button"
                  :class="{ active: selectedSize === size }"
                  @click="selectedSize = size"
                >
                  {{ size }}
                </button>
              </div>
            </section>

            <section class="draw-param-section">
              <header>
                <strong>生成数量</strong>
                <span>本次消耗 {{ generationCost }} 积分</span>
              </header>
              <div class="draw-generator__options">
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

            <button
              type="button"
              class="draw-generator__submit"
              :disabled="!prompt.trim() || generating || uploadingReference"
              @click="startGeneration"
            >
              <LoadingOutlined v-if="generating" />
              <ThunderboltFilled v-else />
              {{ generating ? '正在生成图片...' : '立即生成' }}
            </button>
          </aside>

          <section class="draw-generator__results">
            <header>
              <div>
                <strong>{{ activeResultTab === 'gallery' ? '作品广场' : '我的作品' }}</strong>
                <span>
                  {{
                    activeResultTab === 'gallery'
                      ? '浏览已经完成的本地生成作品'
                      : '查看生成状态与最近创作记录'
                  }}
                </span>
              </div>
              <em v-if="generating">
                {{ workspace.submitting ? '正在提交任务...' : '正在生成图片...' }}
              </em>
            </header>

            <nav
              v-if="activeResultTab === 'gallery'"
              class="draw-generator__gallery-filters"
              aria-label="作品分类"
            >
              <button
                v-for="filter in galleryFilters"
                :key="filter"
                type="button"
                :class="{ active: activeGalleryFilter === filter }"
                @click="activeGalleryFilter = filter"
              >
                {{ filter }}
              </button>
            </nav>

            <div v-if="workspace.error" class="draw-generator__error" role="alert">
              <span>{{ workspace.error.message }}</span>
              <button type="button" @click="workspace.clearError">关闭</button>
            </div>

            <div
              v-if="visibleWorks.length > 0"
              class="draw-generator__work-grid"
              :class="{ 'draw-generator__work-grid--mine': activeResultTab === 'mine' }"
            >
              <article
                v-for="work in visibleWorks"
                :key="work.id"
                class="draw-work-card"
                :class="[
                  `draw-work-card--${work.status}`,
                  { 'draw-work-card--mine': activeResultTab === 'mine' },
                ]"
              >
                <header>
                  <span>{{ work.modelLabel }}</span>
                  <small>{{ formatWorkTime(work.createdAt) }}</small>
                  <small class="draw-work-card__id">ID: {{ formatWorkId(work.id) }}</small>
                  <em :class="work.status">
                    {{ workStatusLabel(work.status) }}
                  </em>
                  <div v-if="work.status === 'done'" class="draw-work-card__header-actions">
                    <button
                      type="button"
                      aria-label="下载作品"
                      title="下载作品"
                      @click="downloadWork(work.id)"
                    >
                      <DownloadOutlined />
                      <span>下载</span>
                    </button>
                    <button
                      type="button"
                      :class="{ active: work.favorite }"
                      :aria-label="work.favorite ? '取消收藏' : '收藏作品'"
                      :title="work.favorite ? '取消收藏' : '收藏作品'"
                      @click="workspace.toggleFavorite(work.id)"
                    >
                      <StarOutlined />
                      <span>{{ work.favorite ? '已收藏' : '收藏' }}</span>
                    </button>
                    <button
                      type="button"
                      class="draw-work-card__delete"
                      aria-label="删除作品"
                      title="删除作品"
                      @click="workspace.removeWork(work.id)"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </header>

                <div
                  class="draw-work-card__visual"
                  :class="{ 'draw-work-card__visual--interactive': work.status === 'done' }"
                  :role="work.status === 'done' ? 'button' : undefined"
                  :tabindex="work.status === 'done' ? 0 : undefined"
                  @click="work.status === 'done' && openWorkDetail(work.id)"
                  @keyup.enter="work.status === 'done' && openWorkDetail(work.id)"
                >
                  <img
                    v-if="work.status === 'done' && work.artworkUrl"
                    :src="work.artworkUrl"
                    :alt="work.prompt"
                  />
                  <div v-else-if="work.status === 'failed'" class="draw-work-card__failure">
                    <CloseOutlined />
                    <span>生成失败</span>
                  </div>
                  <div v-else class="draw-work-card__loading">
                    <LoadingOutlined />
                    <span>
                      {{ work.status === 'queued' ? '等待生成资源...' : '正在渲染画面...' }}
                    </span>
                  </div>
                </div>

                <p>{{ work.prompt }}</p>
                <small v-if="work.errorMessage" class="draw-work-card__error-message">
                  {{ work.errorMessage }}
                </small>
                <div class="draw-work-card__meta">
                  <span>{{ work.size }}</span>
                  <span>{{ work.ratio }}</span>
                  <span>{{ work.model }}</span>
                </div>

                <form
                  v-if="activeResultTab === 'mine' && work.status === 'done'"
                  class="draw-work-card__edit"
                  @submit.prevent="submitWorkModification(work.id)"
                >
                  <span>提示词</span>
                  <input
                    :aria-label="`修改${work.modelLabel}作品的提示词`"
                    :value="getWorkEditDraft(work.id, work.prompt)"
                    placeholder="请输入修改上方图片的描述"
                    @input="setWorkEditDraft(work.id, ($event.target as HTMLInputElement).value)"
                  />
                  <button
                    type="submit"
                    :disabled="
                      detailSubmitting ||
                      !getWorkEditDraft(work.id, work.prompt).trim() ||
                      getWorkEditDraft(work.id, work.prompt).trim() === work.prompt
                    "
                  >
                    {{ detailSubmitting ? '提交中' : '提交修改' }}
                  </button>
                </form>

                <footer
                  v-if="activeResultTab === 'mine' && work.status === 'done'"
                  class="draw-work-card__edit-actions"
                >
                  <button type="button" @click="openWorkDetail(work.id)">
                    <EditOutlined />
                    编辑
                  </button>
                  <button type="button" @click="regenerateWork(work.id)">
                    <ReloadOutlined />
                    重新生成
                  </button>
                  <button type="button" @click="editWork('cutout', work.id)">
                    <ScissorOutlined />
                    抠图
                  </button>
                  <button type="button" @click="editWork('upscale', work.id)">
                    <ExpandOutlined />
                    裁剪
                  </button>
                  <button type="button" @click="editWork('upscale', work.id)">
                    <ExpandOutlined />
                    扩图
                  </button>
                  <button type="button" @click="editWork('enhance', work.id)">
                    <HighlightOutlined />
                    重绘
                  </button>
                  <button type="button" @click="editWork('erase', work.id)">
                    <CloseOutlined />
                    消除
                  </button>
                </footer>

                <footer v-else-if="work.status === 'done'">
                  <button type="button" @click="usePromptInComposer(work.prompt)">
                    <ThunderboltFilled />
                    使用提示词
                  </button>
                  <button
                    type="button"
                    :class="{ active: work.favorite }"
                    @click="workspace.toggleFavorite(work.id)"
                  >
                    <StarOutlined />
                    {{ work.favorite ? '已收藏' : '收藏' }}
                  </button>
                  <button type="button" @click="downloadWork(work.id)">
                    <DownloadOutlined />
                    下载
                  </button>
                  <button
                    type="button"
                    class="draw-work-card__delete"
                    @click="workspace.removeWork(work.id)"
                  >
                    <DeleteOutlined />
                    删除
                  </button>
                </footer>

                <footer v-else-if="work.status === 'failed'">
                  <button type="button" @click="retryWork(work.id)">
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

            <div v-else class="draw-generator__empty">
              <span>
                <PictureOutlined />
              </span>
              <strong>还没有生成作品</strong>
              <p>填写绘画描述并点击立即生成，结果会出现在这里。</p>
            </div>
          </section>
        </div>
      </section>

      <div v-else class="draw-main__inner">
        <header class="draw-main__navigation">
          <nav aria-label="绘画场景">
            <button
              v-for="item in topNavigation"
              :key="item"
              type="button"
              @click="handleTopNavigation(item)"
            >
              <component
                :is="
                  item === '做电商'
                    ? ShopOutlined
                    : item === '做视频'
                      ? VideoCameraOutlined
                      : item === '拍写真'
                        ? PictureOutlined
                        : HighlightOutlined
                "
              />
              {{ item }}
              <DownOutlined />
            </button>
          </nav>
          <span>创作内容仅保留 60 天，请及时下载与整理</span>
        </header>

        <section class="draw-composer">
          <header class="draw-composer__heading">
            <h1>描述想法，AI 帮你生成</h1>
            <p>选择模型和比例，快速进入图片创作</p>
          </header>

          <form class="draw-composer__box" @submit.prevent="generate">
            <div class="draw-composer__input">
              <button
                type="button"
                class="draw-composer__upload"
                aria-label="上传参考图"
                @click="openGenerator({ mode: '参考图重绘' })"
              >
                <PlusOutlined />
                <span>上传</span>
              </button>
              <textarea
                v-model="prompt"
                maxlength="500"
                placeholder="描述画面，可 Ctrl+V 粘贴图片或拖拽上传，输入 @ 引用图片"
              />
            </div>

            <footer class="draw-composer__toolbar">
              <span class="draw-composer__mode-label">
                <PictureOutlined />
                图片
              </span>

              <label>
                <select v-model="currentModel" aria-label="选择绘画模型">
                  <option v-for="model in models" :key="model.value" :value="model.value">
                    {{ model.label }}
                  </option>
                </select>
                <DownOutlined />
              </label>

              <label>
                <select v-model="selectedRatio" aria-label="选择图片比例">
                  <option v-for="ratio in ratios" :key="ratio" :value="ratio">
                    {{ ratio }}
                  </option>
                </select>
                <DownOutlined />
              </label>

              <label>
                <select v-model="selectedAmount" aria-label="选择生成数量">
                  <option v-for="amount in amounts" :key="amount" :value="amount">
                    {{ amount }} 张
                  </option>
                </select>
                <DownOutlined />
              </label>

              <span class="draw-composer__credits">
                <ThunderboltFilled />
                {{ generationCost }} 积分 · 余额 {{ sessionStore.points }}
              </span>

              <button
                class="draw-composer__submit"
                type="submit"
                :disabled="!prompt.trim() || generating || uploadingReference"
              >
                <LoadingOutlined v-if="generating" />
                {{ generating ? '生成中' : '立即生成' }}
              </button>
            </footer>
          </form>

          <div v-if="workspace.error" class="draw-composer__error" role="alert">
            <span>{{ workspace.error.message }}</span>
            <button type="button" @click="workspace.clearError">关闭</button>
          </div>

          <div class="draw-composer__presets">
            <button
              v-for="mode in creationModes"
              :key="mode"
              type="button"
              :class="{ active: selectedMode === mode }"
              @click="selectCreationMode(mode)"
            >
              {{ mode }}
            </button>
          </div>

          <p class="draw-composer__model-note">
            当前模型：{{ selectedModelLabel }} · 支持单张参考图重绘和批量生成
          </p>
        </section>

        <section class="draw-section">
          <header class="draw-section__heading">
            <div>
              <h2>选择创作类型</h2>
              <p>从常用目标开始，系统会自动准备对应的模型与参数。</p>
            </div>
          </header>

          <div class="draw-type-grid">
            <article
              v-for="item in creativeTypes"
              :key="item.label"
              class="draw-type-card"
              role="button"
              tabindex="0"
              @click="handleCreativeType(item)"
              @keyup.enter="handleCreativeType(item)"
            >
              <span class="draw-tool-glyph" :style="{ '--tool-accent': item.accent }">
                {{ item.glyph }}
              </span>
              <div>
                <h3>{{ item.label }}</h3>
                <p>{{ item.description }}</p>
              </div>
              <footer>
                <button
                  v-for="tag in item.tags"
                  :key="tag"
                  type="button"
                  @click.stop="handleCreativeTag(item, tag)"
                >
                  {{ tag }}
                </button>
              </footer>
            </article>
          </div>
        </section>

        <section class="draw-section">
          <header class="draw-section__heading">
            <div>
              <h2>电商与宣传</h2>
              <p>商品图、电商宣传和设计素材集中在这里，方便从素材快速进入商业内容流程。</p>
            </div>
          </header>

          <div class="draw-commerce-grid">
            <article v-for="item in commerceTools" :key="item.label" class="draw-commerce-card">
              <div class="draw-commerce-card__copy">
                <span class="draw-tool-glyph" :style="{ '--tool-accent': item.accent }">
                  {{ item.glyph }}
                </span>
                <h3>{{ item.label }}</h3>
                <p>{{ item.description }}</p>
                <div>
                  <button type="button" @click="handleCommerceTag(item)">
                    {{ item.tags[0] }}
                  </button>
                  <button type="button" @click="handleCommerceTag(item)">立即使用</button>
                </div>
              </div>
              <div class="draw-commerce-card__preview" aria-hidden="true">
                <span class="draw-commerce-card__photo draw-commerce-card__photo--one" />
                <span class="draw-commerce-card__photo draw-commerce-card__photo--two" />
                <span class="draw-commerce-card__panel">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </article>
          </div>
        </section>

        <section class="draw-section">
          <header class="draw-section__heading draw-section__heading--tools">
            <div>
              <h2>图片创作</h2>
              <p>全部图片处理工具，按任务分类快速进入对应能力。</p>
            </div>
            <button type="button" @click="router.push('/map')">查看全部工具</button>
          </header>

          <div v-for="group in imageToolGroups" :key="group.label" class="draw-tool-group">
            <h3>
              <span />
              {{ group.label }}
            </h3>
            <div class="draw-tool-grid">
              <button
                v-for="item in group.tools"
                :key="item.label"
                type="button"
                class="draw-tool-card"
                @click="handleImageTool(item)"
              >
                <span class="draw-tool-glyph" :style="{ '--tool-accent': item.accent }">
                  {{ item.glyph }}
                </span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="activeWorkDetail"
        class="draw-work-detail"
        role="presentation"
        @click.self="closeWorkDetail"
      >
        <section
          class="draw-work-detail__dialog"
          role="dialog"
          aria-modal="true"
          aria-label="作品详情"
        >
          <header>
            <div>
              <span>{{ activeWorkDetail.modelLabel }}</span>
              <strong>作品详情</strong>
            </div>
            <button type="button" aria-label="关闭作品详情" @click="closeWorkDetail">
              <CloseOutlined />
            </button>
          </header>

          <div class="draw-work-detail__content">
            <div class="draw-work-detail__preview">
              <img :src="activeWorkDetail.artworkUrl" :alt="activeWorkDetail.prompt" />
            </div>

            <div class="draw-work-detail__info">
              <div class="draw-work-detail__meta">
                <span>{{ activeWorkDetail.size }}</span>
                <span>{{ activeWorkDetail.ratio }}</span>
                <span>{{ formatWorkTime(activeWorkDetail.createdAt) }}</span>
              </div>
              <p>{{ activeWorkDetail.prompt }}</p>

              <form
                class="draw-work-detail__edit-prompt"
                @submit.prevent="submitWorkModification(activeWorkDetail.id, detailPrompt)"
              >
                <span>提示词</span>
                <input
                  v-model="detailPrompt"
                  aria-label="修改作品提示词"
                  placeholder="请输入修改上方图片的描述"
                />
                <button
                  type="submit"
                  :disabled="
                    detailSubmitting ||
                    !detailPrompt.trim() ||
                    detailPrompt.trim() === activeWorkDetail.prompt
                  "
                >
                  {{ detailSubmitting ? '提交中' : '提交修改' }}
                </button>
              </form>

              <div class="draw-work-detail__primary">
                <button type="button" @click="downloadWork(activeWorkDetail.id)">
                  <DownloadOutlined />
                  下载原图
                </button>
                <button
                  type="button"
                  :class="{ active: activeWorkDetail.favorite }"
                  @click="workspace.toggleFavorite(activeWorkDetail.id)"
                >
                  <StarOutlined />
                  {{ activeWorkDetail.favorite ? '已收藏' : '收藏' }}
                </button>
                <button type="button" @click="reuseWorkPrompt(activeWorkDetail.id)">
                  <ThunderboltFilled />
                  使用提示词
                </button>
                <button type="button" @click="regenerateWork(activeWorkDetail.id)">
                  <ReloadOutlined />
                  重新生成
                </button>
              </div>

              <section class="draw-work-detail__edits">
                <header>
                  <strong>继续编辑</strong>
                  <span>选择操作后会带着当前作品进入对应工作台</span>
                </header>
                <div>
                  <button type="button" @click="editWork('restyle', activeWorkDetail.id)">
                    <EditOutlined />
                    编辑
                  </button>
                  <button type="button" @click="editWork('cutout', activeWorkDetail.id)">
                    <ScissorOutlined />
                    抠图
                  </button>
                  <button type="button" @click="editWork('upscale', activeWorkDetail.id)">
                    <ExpandOutlined />
                    裁剪扩图
                  </button>
                  <button type="button" @click="editWork('erase', activeWorkDetail.id)">
                    <CloseOutlined />
                    擦除
                  </button>
                  <button type="button" @click="editWork('enhance', activeWorkDetail.id)">
                    <HighlightOutlined />
                    重绘
                  </button>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="templateExampleId && selectedExampleTemplate"
        class="draw-template-example"
        role="presentation"
        @click.self="closeTemplateExample"
      >
        <section
          class="draw-template-example__dialog"
          role="dialog"
          aria-labelledby="draw-template-example-title"
          aria-modal="true"
        >
          <header>
            <div>
              <span>{{ selectedExampleTemplate.category }}</span>
              <strong id="draw-template-example-title">
                {{ selectedExampleTemplate.label }}效果示例
              </strong>
            </div>
            <button type="button" aria-label="关闭效果示例" @click="closeTemplateExample">
              <CloseOutlined />
            </button>
          </header>

          <div class="draw-template-example__preview">
            <figure>
              <span>原图</span>
              <img
                :src="selectedExampleTemplate.image"
                :alt="`${selectedExampleTemplate.label}原图`"
              />
            </figure>
            <figure>
              <span>效果图</span>
              <img
                :src="selectedExampleTemplate.image"
                :alt="`${selectedExampleTemplate.label}效果图`"
              />
            </figure>
          </div>

          <div class="draw-template-example__content">
            <p>{{ selectedExampleTemplate.description }}</p>
            <ol>
              <li v-for="step in selectedExampleTemplate.steps" :key="step">{{ step }}</li>
            </ol>
          </div>

          <footer>
            <button type="button" @click="closeTemplateExample">取消</button>
            <button type="button" @click="applyTemplateExample(selectedExampleTemplate)">
              使用该效果
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.draw-studio {
  display: grid;
  min-height: calc(100vh - 56px);
  grid-template-columns: 240px minmax(0, 1fr);
  background: #fff;
}

.draw-studio--library-collapsed {
  grid-template-columns: 64px minmax(0, 1fr);
}

.draw-studio--template {
  grid-template-columns: minmax(0, 1fr);
}

.draw-studio--template .draw-library {
  display: none;
}

.draw-library {
  position: sticky;
  top: 56px;
  z-index: 10;
  display: flex;
  height: calc(100vh - 56px);
  min-width: 0;
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid #e8eaee;
  background: #fff;
  scrollbar-width: thin;
}

.draw-library__header {
  display: grid;
  min-height: 62px;
  align-items: center;
  gap: 9px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 0 14px;
  border-bottom: 1px solid #f0f1f4;
}

.draw-library__mark {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 8px;
  background: #171a22;
  color: #fff;
  font-size: 14px;
}

.draw-library__header > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.draw-library__header strong {
  overflow: hidden;
  color: #252a33;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-library__header small {
  color: #9aa1ad;
  font-size: 8px;
}

.draw-library__header button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #838b98;
  cursor: pointer;
}

.draw-library__header button:hover {
  background: #f5f6f8;
}

.draw-library__header button :deep(svg) {
  transform: rotate(-90deg);
}

.draw-library__search {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 7px;
  margin: 12px 14px 9px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  color: #a1a8b3;
}

.draw-library__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #333a45;
  font-size: 10px;
}

.draw-library__navigation {
  display: grid;
  gap: 2px;
  padding: 4px 10px 10px;
  border-bottom: 1px solid #f0f1f4;
}

.draw-library__navigation a {
  display: grid;
  min-height: 34px;
  align-items: center;
  gap: 9px;
  grid-template-columns: 17px minmax(0, 1fr);
  padding: 0 9px;
  border-radius: 6px;
  color: #626c7a;
  font-size: 10px;
  font-weight: 650;
  text-decoration: none;
}

.draw-library__navigation a:hover,
.draw-library__navigation a.router-link-exact-active {
  background: #f2f7ff;
  color: #2f72df;
}

.draw-library__navigation :deep(svg) {
  width: 14px;
  height: 14px;
}

.draw-library__models {
  display: grid;
  gap: 3px;
  padding: 13px 10px;
  border-bottom: 1px solid #f0f1f4;
}

.draw-library__models header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 7px;
  color: #8b93a0;
  font-size: 9px;
}

.draw-library__models header strong {
  color: #596271;
  font-size: 10px;
}

.draw-library__models button {
  position: relative;
  display: grid;
  min-height: 34px;
  align-items: center;
  gap: 8px;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #5f6877;
  text-align: left;
  cursor: pointer;
}

.draw-library__models button:hover {
  background: #f7f8fa;
}

.draw-library__models button.active {
  border-color: #d7e5ff;
  background: #f1f7ff;
  color: #2f72df;
}

.draw-library__models button i {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--model-accent) 13%, white);
  color: var(--model-accent);
  font-size: 8px;
  font-style: normal;
  font-weight: 850;
}

.draw-library__models button span {
  overflow: hidden;
  font-size: 9px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-library__models button em {
  padding: 1px 4px;
  border-radius: 4px;
  background: #fff0ce;
  color: #a77719;
  font-size: 7px;
  font-style: normal;
}

.draw-library__models button > :deep(svg) {
  color: #2f72df;
  font-size: 9px;
}

.draw-library__shortcut {
  display: grid;
  gap: 3px;
  margin-top: auto;
  padding: 12px 10px 16px;
  border-top: 1px solid #f0f1f4;
}

.draw-library__shortcut > span {
  padding: 0 8px 6px;
  color: #a0a7b2;
  font-size: 8px;
  font-weight: 700;
}

.draw-library__shortcut button {
  display: grid;
  height: 34px;
  align-items: center;
  gap: 8px;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #687180;
  font-size: 9px;
  text-align: left;
  cursor: pointer;
}

.draw-library__shortcut button:hover {
  background: #f5f7fa;
}

.draw-library__tools {
  padding: 11px 10px 13px;
  border-bottom: 1px solid #f0f1f4;
}

.draw-library__tools-toggle {
  display: flex;
  width: 100%;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #596271;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.draw-library__tools-toggle:hover {
  background: #f6f8fa;
}

.draw-library__tools-toggle > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.draw-library__tools-toggle :deep(svg) {
  font-size: 11px;
}

.draw-library__tools-toggle :deep(svg:last-child) {
  color: #9aa2ae;
  font-size: 8px;
  transition: transform 160ms ease;
}

.draw-library__tools-toggle :deep(svg:last-child.open) {
  transform: rotate(180deg);
}

.draw-library__tool-groups {
  display: grid;
  gap: 11px;
  padding: 7px 0 0;
}

.draw-library__tool-groups section {
  display: grid;
  gap: 2px;
}

.draw-library__tool-groups section > strong {
  padding: 0 9px 4px;
  color: #9aa2ae;
  font-size: 8px;
  font-weight: 700;
}

.draw-library__tool-groups section > button {
  display: grid;
  min-width: 0;
  min-height: 41px;
  align-items: center;
  gap: 8px;
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 4px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #5e6978;
  text-align: left;
  cursor: pointer;
}

.draw-library__tool-groups section > button:hover {
  background: #f3faf7;
  color: #23765f;
}

.draw-library__tool-groups button i {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--tool-accent) 10%, white);
  color: var(--tool-accent);
  font-size: 8px;
  font-style: normal;
  font-weight: 850;
}

.draw-library__tool-groups button > span {
  display: grid;
  min-width: 0;
  gap: 1px;
  overflow: hidden;
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-library__tool-groups button small {
  overflow: hidden;
  color: #a0a7b2;
  font-size: 7px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-studio--library-collapsed .draw-library__header {
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 0;
}

.draw-studio--library-collapsed .draw-library__mark,
.draw-studio--library-collapsed .draw-library__header > span:nth-child(2),
.draw-studio--library-collapsed .draw-library__search,
.draw-studio--library-collapsed .draw-library__models,
.draw-studio--library-collapsed .draw-library__tools,
.draw-studio--library-collapsed .draw-library__shortcut {
  display: none;
}

.draw-studio--library-collapsed .draw-library__header button {
  width: 32px;
  height: 32px;
}

.draw-studio--library-collapsed .draw-library__header button :deep(svg) {
  transform: rotate(90deg);
}

.draw-studio--library-collapsed .draw-library__navigation {
  gap: 5px;
  padding: 11px 8px;
}

.draw-studio--library-collapsed .draw-library__navigation a {
  min-height: 38px;
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 0;
}

.draw-studio--library-collapsed .draw-library__navigation a span {
  display: none;
}

.draw-main {
  min-width: 0;
  background: #fff;
}

.draw-template-studio {
  position: relative;
  min-height: calc(100vh - 56px);
  padding-bottom: 144px;
  background: #fbfcfd;
}

.draw-template-studio__header {
  position: sticky;
  top: 56px;
  z-index: 8;
  display: grid;
  min-height: 58px;
  align-items: center;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0 22px;
  border-bottom: 1px solid #e7eaee;
  background: rgb(255 255 255 / 96%);
  backdrop-filter: blur(10px);
}

.draw-template-studio__brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #23936f;
  font-size: 18px;
}

.draw-template-studio__brand > :deep(svg) {
  font-size: 21px;
}

.draw-template-studio__header > div {
  display: flex;
  justify-self: end;
  gap: 8px;
}

.draw-template-studio__header > div button {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #dfe4ea;
  border-radius: 7px;
  background: #fff;
  color: #606a78;
  font-size: 12px;
  font-weight: 720;
  cursor: pointer;
}

.draw-template-studio__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.draw-template-studio__action--legacy {
  border-color: #f0e4c7;
  background: #fffaf0;
  color: #7f6735;
}

.draw-template-studio__action--legacy :deep(svg) {
  color: #d7a52d;
}

.draw-template-studio__action--retouch {
  border-color: #d2eee4;
  background: #eef9f5;
  color: #287f65;
}

.draw-template-studio__action--retouch :deep(svg) {
  color: #2b9b7a;
}

.draw-template-studio__content {
  width: min(100%, 1220px);
  margin: 0 auto;
  padding: 34px 32px 0;
}

.draw-template-hero {
  display: grid;
  justify-items: center;
  text-align: center;
}

.draw-template-hero > span {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 999px;
  background: #e7f8f3;
  color: #36a385;
  font-size: 27px;
}

.draw-template-hero h1 {
  margin: 20px 0 0;
  color: #1e252e;
  font-size: 24px;
  font-weight: 850;
}

.draw-template-hero p {
  margin: 9px 0 0;
  color: #818a97;
  font-size: 11px;
}

.draw-template-hero > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 18px;
}

.draw-template-hero em {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  padding: 0 12px;
  border: 1px solid #d6f1e7;
  border-radius: 999px;
  background: #edf9f5;
  color: #299271;
  font-size: 8px;
  font-style: normal;
  font-weight: 720;
}

.draw-template-categories {
  display: flex;
  justify-content: center;
  gap: 9px;
  margin-top: 31px;
  overflow-x: auto;
  padding-bottom: 3px;
  scrollbar-width: none;
}

.draw-template-categories button {
  display: inline-flex;
  min-width: 104px;
  height: 34px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  border: 1px solid #e1e5ea;
  border-radius: 8px;
  background: #fff;
  color: #495360;
  font-size: 9px;
  font-weight: 720;
  cursor: pointer;
}

.draw-template-categories button.active {
  border-color: transparent;
  background: #a94ee8;
  color: #fff;
  box-shadow: 0 7px 18px rgb(137 62 200 / 18%);
}

.draw-effect-grid {
  display: grid;
  align-items: stretch;
  gap: 18px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 23px;
}

.draw-effect-card {
  display: grid;
  min-width: 0;
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border: 1px solid #e4e8ed;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 5px 18px rgb(32 45 63 / 5%);
}

.draw-effect-card.active {
  border-color: #a95ee2;
  box-shadow: 0 0 0 2px rgb(169 94 226 / 9%);
}

.draw-effect-card__visual {
  --effect-a: #d8d6dd;
  --effect-b: #f2c5d5;
  position: relative;
  aspect-ratio: 1.75 / 1;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 22%, rgb(255 255 255 / 78%), transparent 19%),
    linear-gradient(145deg, var(--effect-a), #f4f6f8 48%, var(--effect-b));
}

.draw-effect-card__visual > img {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  height: 100%;
  object-fit: cover;
  transition: transform 220ms ease;
}

.draw-effect-card__visual-before {
  left: 0;
  filter: saturate(0.68) brightness(0.92) contrast(0.97);
}

.draw-effect-card__visual-after {
  right: 0;
  left: 50%;
  border-left: 3px solid rgb(255 255 255 / 86%);
  filter: saturate(1.06) brightness(1.03);
}

.draw-effect-card:hover .draw-effect-card__visual > img {
  transform: scale(1.045);
}

.draw-effect-card__visual--outfit {
  --effect-position: 50% 24%;
}

.draw-effect-card__visual--sky {
  --effect-position: 50% 57%;
}

.draw-effect-card__visual--product {
  --effect-position: 50% 52%;
}

.draw-effect-card__visual--anime {
  --effect-position: 50% 52%;
}

.draw-effect-card__visual--restore {
  --effect-position: 50% 50%;
}

.draw-effect-card__visual > img {
  object-position: var(--effect-position, 50% 20%);
}

.draw-effect-card__visual > span,
.draw-effect-card__visual > em {
  position: absolute;
  top: 9px;
  z-index: 2;
  padding: 3px 6px;
  border-radius: 5px;
  background: rgb(32 37 47 / 78%);
  color: #fff;
  font-size: 7px;
  font-style: normal;
  font-weight: 780;
}

.draw-effect-card__visual > span {
  left: 9px;
}

.draw-effect-card__visual > em {
  right: 9px;
  background: #ae55e0;
}

.draw-effect-card__copy {
  display: grid;
  align-content: start;
  padding: 14px 15px 10px;
}

.draw-effect-card__copy > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.draw-effect-card__copy h2 {
  margin: 0;
  color: #252c35;
  font-size: 14px;
  font-weight: 820;
}

.draw-effect-card__copy > header > span {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.draw-effect-card__copy > header em {
  padding: 2px 5px;
  border-radius: 5px;
  background: #f3e9fc;
  color: #9c4fd2;
  font-size: 7px;
  font-style: normal;
}

.draw-effect-card__copy > p {
  min-height: 34px;
  margin: 9px 0 0;
  color: #79828f;
  font-size: 9px;
  line-height: 1.65;
}

.draw-effect-card__steps {
  display: grid;
  gap: 4px;
  margin-top: 11px;
  color: #7a8491;
  font-size: 8px;
}

.draw-effect-card__steps strong {
  color: #5f6875;
}

.draw-effect-card__steps span {
  display: grid;
  align-items: start;
  gap: 6px;
  grid-template-columns: 15px minmax(0, 1fr);
}

.draw-effect-card__steps i {
  display: grid;
  width: 15px;
  height: 15px;
  place-items: center;
  border-radius: 999px;
  background: #eff1f4;
  color: #7a8490;
  font-size: 7px;
  font-style: normal;
}

.draw-effect-card > button {
  height: 38px;
  margin: 0 14px 14px;
  border: 0;
  border-radius: 7px;
  background: linear-gradient(90deg, #a854e2, #dd48d6);
  color: #fff;
  font-size: 9px;
  font-weight: 780;
  cursor: pointer;
}

.draw-effect-card.active > button {
  background: linear-gradient(90deg, #2d9f7d, #58bf8f);
}

.draw-template-composer {
  position: fixed;
  right: 26px;
  bottom: 16px;
  left: 266px;
  z-index: 9;
  display: grid;
  min-height: 126px;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 0 12px;
  width: min(calc(100% - 532px), 1180px);
  margin: 0 auto;
  padding: 13px 15px 12px;
  border: 1px solid #d9dfe6;
  border-radius: 12px;
  background: rgb(255 255 255 / 98%);
  box-shadow: 0 16px 45px rgb(31 43 60 / 15%);
  backdrop-filter: blur(12px);
}

.draw-template-composer__upload {
  position: relative;
  display: grid;
  width: 82px;
  height: 72px;
  overflow: hidden;
  place-items: center;
  align-content: center;
  gap: 4px;
  border: 1px dashed #b7dbce;
  border-radius: 8px;
  background: #f1faf7;
  color: #3b9478;
  cursor: pointer;
}

.draw-template-composer__upload img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.draw-template-composer__upload span,
.draw-template-composer__upload small {
  position: relative;
  z-index: 1;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgb(255 255 255 / 82%);
}

.draw-template-composer__upload:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.draw-template-composer__upload :deep(svg) {
  position: relative;
  z-index: 1;
  font-size: 17px;
}

.draw-template-composer__upload span {
  font-size: 9px;
  font-weight: 760;
}

.draw-template-composer__upload small {
  color: #8aa89e;
  font-size: 7px;
}

.draw-template-composer__prompt {
  position: relative;
  display: block;
  min-width: 0;
}

.draw-template-composer__prompt textarea {
  width: 100%;
  min-height: 70px;
  padding: 7px 48px 22px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #343c47;
  font: inherit;
  font-size: 10px;
  line-height: 1.7;
  resize: none;
}

.draw-template-composer__prompt textarea::placeholder {
  color: #a0a8b3;
}

.draw-template-composer__prompt small {
  position: absolute;
  right: 0;
  bottom: 4px;
  color: #8e97a3;
  font-size: 8px;
}

.draw-template-composer__error {
  align-self: end;
  margin: 2px 0 0;
  color: #d14b55;
  font-size: 8px;
  grid-column: 2;
}

.draw-template-composer__advanced {
  display: grid;
  align-items: center;
  gap: 10px;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 9px 10px;
  border: 1px solid #e4e8ed;
  border-radius: 8px;
  background: #f8fafb;
}

.draw-template-composer__advanced label {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: 74px minmax(0, 1fr);
  color: #65707d;
  font-size: 8px;
}

.draw-template-composer__advanced select {
  width: 100%;
  height: 30px;
  padding: 0 9px;
  border: 1px solid #dfe4e9;
  border-radius: 6px;
  outline: 0;
  background: #fff;
  color: #4e5865;
  font-size: 8px;
}

.draw-template-composer > footer {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  grid-column: 1 / -1;
}

.draw-template-composer > footer label {
  position: relative;
  display: flex;
  width: 132px;
  height: 34px;
  align-items: center;
  border: 1px solid #e0e4e9;
  border-radius: 7px;
  background: #fff;
}

.draw-template-composer > footer label:nth-of-type(2) {
  width: 78px;
}

.draw-template-composer > footer label:nth-of-type(3) {
  width: 110px;
}

.draw-template-composer > footer select {
  width: 100%;
  height: 100%;
  padding: 0 25px 0 10px;
  border: 0;
  outline: 0;
  appearance: none;
  background: transparent;
  color: #596273;
  font-size: 9px;
}

.draw-template-composer > footer label :deep(svg) {
  position: absolute;
  right: 8px;
  color: #969eaa;
  font-size: 8px;
  pointer-events: none;
}

.draw-template-composer > footer > button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid #e0e4e9;
  border-radius: 7px;
  background: #fff;
  color: #65707e;
  font-size: 8px;
  cursor: pointer;
}

.draw-template-composer > footer > button.active {
  border-color: #9bd7c5;
  background: #eef9f5;
  color: #287f65;
}

.draw-template-composer > footer > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  color: #737d8a;
  font-size: 8px;
  white-space: nowrap;
}

.draw-template-composer > footer > span :deep(svg) {
  color: #df7f31;
}

.draw-template-composer > footer > button.draw-template-composer__submit {
  min-width: 104px;
  border-color: #2b9877;
  background: #2b9877;
  color: #fff;
  font-size: 9px;
  font-weight: 780;
}

.draw-template-composer > footer > button.draw-template-composer__submit:disabled {
  border-color: #d7dbe1;
  background: #d7dbe1;
  cursor: not-allowed;
}

.draw-template-example {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(18 24 32 / 52%);
  backdrop-filter: blur(4px);
}

.draw-template-example__dialog {
  width: min(100%, 860px);
  max-height: min(760px, calc(100vh - 48px));
  overflow-y: auto;
  border: 1px solid #e2e6eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 26px 80px rgb(17 25 35 / 28%);
}

.draw-template-example__dialog > header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid #e9edf1;
  background: rgb(255 255 255 / 96%);
  backdrop-filter: blur(10px);
}

.draw-template-example__dialog > header > div {
  display: grid;
  gap: 3px;
}

.draw-template-example__dialog > header span {
  color: #8d55bf;
  font-size: 8px;
  font-weight: 760;
}

.draw-template-example__dialog > header strong {
  color: #222a34;
  font-size: 16px;
}

.draw-template-example__dialog > header button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e1e5ea;
  border-radius: 7px;
  background: #fff;
  color: #697381;
  cursor: pointer;
}

.draw-template-example__preview {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 20px 20px 0;
}

.draw-template-example__preview figure {
  position: relative;
  margin: 0;
  overflow: hidden;
  border: 1px solid #e4e8ed;
  border-radius: 9px;
  background: #f4f6f8;
}

.draw-template-example__preview figure:last-child {
  box-shadow: 0 0 0 2px rgb(165 84 226 / 10%);
}

.draw-template-example__preview span {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  padding: 4px 7px;
  border-radius: 5px;
  background: rgb(30 36 45 / 78%);
  color: #fff;
  font-size: 8px;
  font-weight: 760;
}

.draw-template-example__preview figure:last-child span {
  background: #aa50dc;
}

.draw-template-example__preview img {
  display: block;
  width: 100%;
  aspect-ratio: 1.55 / 1;
  object-fit: cover;
}

.draw-template-example__preview figure:first-child img {
  filter: saturate(0.72) brightness(0.94);
}

.draw-template-example__content {
  display: grid;
  gap: 14px;
  padding: 18px 20px;
  grid-template-columns: minmax(0, 1fr) 280px;
}

.draw-template-example__content p {
  margin: 0;
  color: #697381;
  font-size: 10px;
  line-height: 1.75;
}

.draw-template-example__content ol {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  color: #747e8b;
  font-size: 9px;
  list-style: none;
}

.draw-template-example__content li {
  display: grid;
  align-items: start;
  gap: 7px;
  grid-template-columns: 18px minmax(0, 1fr);
}

.draw-template-example__content li::before {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 999px;
  background: #eef1f4;
  color: #707986;
  content: counter(list-item);
  font-size: 8px;
}

.draw-template-example__dialog > footer {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding: 0 20px 20px;
}

.draw-template-example__dialog > footer button {
  height: 36px;
  padding: 0 18px;
  border: 1px solid #dfe4e9;
  border-radius: 7px;
  background: #fff;
  color: #626c79;
  font-size: 9px;
  font-weight: 720;
  cursor: pointer;
}

.draw-template-example__dialog > footer button:last-child {
  border-color: #2b9877;
  background: #2b9877;
  color: #fff;
}

.draw-generator {
  display: grid;
  height: calc(100vh - 56px);
  min-height: 680px;
  grid-template-rows: 60px minmax(0, 1fr);
  overflow: hidden;
  background: #f5f7fa;
}

.draw-generator__header {
  display: grid;
  align-items: center;
  gap: 16px;
  grid-template-columns: minmax(170px, 1fr) auto minmax(170px, 1fr);
  padding: 0 18px;
  border-bottom: 1px solid #e7eaee;
  background: #fff;
}

.draw-generator__back {
  display: inline-flex;
  width: max-content;
  height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #5e6876;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.draw-generator__back:hover {
  background: #f3f5f8;
  color: #272e38;
}

.draw-generator__title {
  display: grid;
  min-width: 0;
  gap: 2px;
  justify-items: center;
}

.draw-generator__title strong {
  max-width: 240px;
  overflow: hidden;
  color: #242a33;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-generator__title span {
  color: #9aa2ae;
  font-size: 8px;
}

.draw-generator__tabs {
  display: flex;
  justify-self: end;
  padding: 3px;
  border-radius: 8px;
  background: #f1f3f6;
}

.draw-generator__tabs button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 13px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #737d8b;
  font-size: 9px;
  font-weight: 720;
  cursor: pointer;
}

.draw-generator__tabs button.active {
  background: #fff;
  color: #222933;
  box-shadow: 0 2px 8px rgb(30 42 60 / 9%);
}

.draw-generator__tabs button span {
  display: grid;
  min-width: 16px;
  height: 16px;
  place-items: center;
  padding: 0 4px;
  border-radius: 999px;
  background: #252b34;
  color: #fff;
  font-size: 7px;
}

.draw-generator__workspace {
  display: grid;
  min-height: 0;
  grid-template-columns: 330px minmax(0, 1fr);
}

.draw-generator__params {
  min-height: 0;
  overflow-y: auto;
  padding: 17px 17px 24px;
  border-right: 1px solid #e7eaee;
  background: #fff;
  scrollbar-width: thin;
}

.draw-param-section {
  display: grid;
  gap: 10px;
}

.draw-param-section + .draw-param-section,
.draw-generator__prompt + .draw-param-section {
  margin-top: 17px;
  padding-top: 17px;
  border-top: 1px solid #eef0f3;
}

.draw-param-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.draw-param-section > header strong,
.draw-generator__prompt > strong {
  color: #3a424d;
  font-size: 10px;
  font-weight: 780;
}

.draw-param-section > header span,
.draw-generator__prompt small {
  color: #9ba3af;
  font-size: 8px;
}

.draw-generator__model-grid {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.draw-generator__model-grid button {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  grid-template-columns: 25px minmax(0, 1fr);
  padding: 7px 8px;
  border: 1px solid #e5e8ec;
  border-radius: 8px;
  background: #fff;
  color: #596271;
  text-align: left;
  cursor: pointer;
}

.draw-generator__model-grid button:hover {
  border-color: #c9d8e9;
  background: #fafcff;
}

.draw-generator__model-grid button.active {
  border-color: #a991f6;
  background: #f6f3ff;
  color: #6440df;
  box-shadow: 0 0 0 1px rgb(100 64 223 / 8%);
}

.draw-generator__model-grid button i {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--model-accent) 13%, white);
  color: var(--model-accent);
  font-size: 8px;
  font-style: normal;
  font-weight: 850;
}

.draw-generator__model-grid button span {
  min-width: 0;
  overflow: hidden;
  font-size: 8px;
  font-weight: 720;
  line-height: 1.35;
  text-overflow: ellipsis;
}

.draw-generator__model-grid button > :deep(svg) {
  position: absolute;
  top: 5px;
  right: 5px;
  color: #6b49e7;
  font-size: 8px;
}

.draw-generator__prompt {
  display: grid;
  gap: 8px;
  margin-top: 17px;
}

.draw-generator__prompt > span {
  position: relative;
  display: block;
}

.draw-generator__prompt textarea {
  display: block;
  width: 100%;
  min-height: 112px;
  padding: 11px 11px 24px;
  border: 1px solid #dfe3e8;
  border-radius: 8px;
  outline: 0;
  background: #fbfcfd;
  color: #353d48;
  font: inherit;
  font-size: 9px;
  line-height: 1.7;
  resize: vertical;
}

.draw-generator__prompt textarea:focus {
  border-color: #99bce7;
  background: #fff;
  box-shadow: 0 0 0 3px rgb(47 114 223 / 8%);
}

.draw-generator__prompt textarea::placeholder {
  color: #a5acb7;
}

.draw-generator__prompt small {
  position: absolute;
  right: 9px;
  bottom: 7px;
}

.draw-generator__references > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.draw-generator__reference,
.draw-generator__upload {
  position: relative;
  display: grid;
  width: 74px;
  height: 74px;
  overflow: hidden;
  place-items: center;
  border-radius: 8px;
}

.draw-generator__reference {
  border: 1px solid #dde2e8;
  background: #f4f6f8;
}

.draw-generator__reference img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.draw-generator__reference button {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgb(27 32 40 / 72%);
  color: #fff;
  cursor: pointer;
}

.draw-generator__reference button :deep(svg) {
  font-size: 8px;
}

.draw-generator__upload {
  align-content: center;
  gap: 5px;
  border: 1px dashed #cfd6df;
  background: #fafbfc;
  color: #7e8896;
  cursor: pointer;
}

.draw-generator__upload:hover {
  border-color: #8bb5e4;
  background: #f5f9ff;
  color: #3678c8;
}

.draw-generator__upload:disabled {
  cursor: wait;
  opacity: 0.75;
}

.draw-generator__upload :deep(svg) {
  font-size: 15px;
}

.draw-generator__upload small {
  font-size: 8px;
}

.draw-generator__field-error {
  margin: 8px 0 0;
  color: #c6483d;
  font-size: 8px;
  line-height: 1.5;
}

.draw-generator__options {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.draw-generator__options button {
  height: 34px;
  padding: 0 6px;
  border: 1px solid #e0e4e9;
  border-radius: 7px;
  background: #fff;
  color: #626c79;
  font-size: 8px;
  font-weight: 700;
  cursor: pointer;
}

.draw-generator__options button:hover {
  border-color: #bfd2e8;
}

.draw-generator__options button.active {
  border-color: #7550e8;
  background: #f3efff;
  color: #6540db;
  box-shadow: 0 0 0 1px rgb(101 64 219 / 8%);
}

.draw-generator__submit {
  position: sticky;
  z-index: 3;
  bottom: 0;
  display: inline-flex;
  width: 100%;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 19px;
  border: 0;
  border-radius: 8px;
  background: #6d49e8;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 24px rgb(74 49 167 / 20%);
}

.draw-generator__submit:hover:not(:disabled) {
  background: #5d3bd7;
}

.draw-generator__submit:disabled {
  background: #d6dae0;
  cursor: not-allowed;
}

.draw-generator__results {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px 30px;
  background: #fff;
  scrollbar-width: thin;
}

.draw-generator__results > header {
  position: sticky;
  top: -18px;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin: -18px -20px 15px;
  padding: 18px 20px 13px;
  background: rgb(255 255 255 / 96%);
  backdrop-filter: blur(8px);
}

.draw-generator__results > header > div {
  display: grid;
  gap: 3px;
}

.draw-generator__results > header strong {
  color: #2a313b;
  font-size: 15px;
}

.draw-generator__results > header span {
  color: #8b94a1;
  font-size: 8px;
}

.draw-generator__results > header em {
  color: #3979d5;
  font-size: 8px;
  font-style: normal;
  font-weight: 750;
}

.draw-generator__gallery-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
}

.draw-generator__gallery-filters button {
  height: 29px;
  padding: 0 10px;
  border: 1px solid #e0e5ea;
  border-radius: 7px;
  background: #fff;
  color: #647080;
  font-size: 8px;
  font-weight: 700;
  cursor: pointer;
}

.draw-generator__gallery-filters button.active {
  border-color: #7352e8;
  background: #7352e8;
  color: #fff;
}

.draw-generator__error,
.draw-composer__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
  padding: 9px 11px;
  border: 1px solid #f0c8c3;
  border-radius: 7px;
  background: #fff5f4;
  color: #a73d34;
  font-size: 8px;
}

.draw-generator__error button,
.draw-composer__error button {
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #a73d34;
  font-size: 8px;
  font-weight: 750;
  cursor: pointer;
}

.draw-generator__work-grid {
  display: grid;
  align-items: start;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
}

.draw-generator__work-grid--mine {
  grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
}

.draw-work-card {
  display: grid;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e1e5ea;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 15px rgb(31 43 61 / 4%);
}

.draw-work-card > header {
  display: grid;
  min-height: 37px;
  align-items: center;
  gap: 7px;
  grid-template-columns: minmax(0, auto) auto auto minmax(0, 1fr) auto;
  padding: 0 10px;
  border-bottom: 1px solid #eef0f3;
}

.draw-work-card > header span {
  min-width: 0;
  overflow: hidden;
  color: #48515e;
  font-size: 8px;
  font-weight: 740;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-work-card > header small {
  color: #a0a7b2;
  font-size: 7px;
}

.draw-work-card > header .draw-work-card__id {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-work-card > header em {
  justify-self: start;
  padding: 2px 5px;
  border-radius: 999px;
  background: #edf3ff;
  color: #3979d5;
  font-size: 7px;
  font-style: normal;
  font-weight: 750;
}

.draw-work-card > header em.done {
  background: #e9f7f1;
  color: #238467;
}

.draw-work-card > header em.queued {
  background: #f2f3f5;
  color: #737c89;
}

.draw-work-card > header em.failed {
  background: #fff0ee;
  color: #bd4c42;
}

.draw-work-card__header-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.draw-work-card__header-actions button {
  display: inline-flex;
  min-width: 30px;
  height: 27px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 7px;
  border: 1px solid #e0e4e9;
  border-radius: 6px;
  background: #fff;
  color: #5f6977;
  font-size: 7px;
  cursor: pointer;
}

.draw-work-card__header-actions button:hover {
  border-color: #bdd4e9;
  color: #2f72df;
}

.draw-work-card__header-actions button.active {
  border-color: #efd49a;
  background: #fffaf0;
  color: #bd7b13;
}

.draw-work-card__header-actions button.draw-work-card__delete {
  padding: 0;
  color: #9a6260;
}

.draw-work-card--mine {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgb(31 43 61 / 7%);
}

.draw-work-card--mine > header {
  min-height: 48px;
  order: 1;
  grid-template-columns: minmax(0, auto) auto auto auto auto;
  padding: 0 14px;
}

.draw-work-card--mine > header > span {
  font-size: 9px;
}

.draw-work-card--mine > header .draw-work-card__header-actions {
  justify-self: end;
}

.draw-work-card--mine > p {
  display: block;
  min-height: 0;
  order: 2;
  padding: 15px 16px 11px;
  color: #3f4854;
  font-size: 10px;
  line-height: 1.6;
  -webkit-line-clamp: initial;
}

.draw-work-card--mine .draw-work-card__visual {
  order: 3;
  margin: 0 16px;
  border-radius: 8px;
  aspect-ratio: 3 / 2;
  background: #f5f6f8;
}

.draw-work-card--mine .draw-work-card__visual > img {
  object-fit: contain;
}

.draw-work-card--mine .draw-work-card__meta {
  order: 4;
  padding: 10px 16px;
}

.draw-work-card__visual {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #eef1f4;
}

.draw-work-card__visual > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.draw-work-card__visual--interactive {
  cursor: zoom-in;
}

.draw-work-card__visual--interactive::after {
  position: absolute;
  inset: 0;
  border: 1px solid transparent;
  background: linear-gradient(180deg, transparent 66%, rgb(20 30 46 / 22%));
  content: '';
  opacity: 0;
  transition: opacity 160ms ease;
}

.draw-work-card__visual--interactive:hover::after,
.draw-work-card__visual--interactive:focus-visible::after {
  opacity: 1;
}

.draw-work-card__loading {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 10px;
  background:
    linear-gradient(
      115deg,
      rgb(255 255 255 / 0%) 32%,
      rgb(255 255 255 / 68%) 47%,
      rgb(255 255 255 / 0%) 62%
    ),
    linear-gradient(145deg, #d9e8f6, #acd1ea 52%, #779bc9);
  background-size:
    240% 100%,
    100% 100%;
  color: #fff;
  animation: draw-loading-shine 1.8s ease-in-out infinite;
}

.draw-work-card__loading :deep(svg) {
  font-size: 20px;
}

.draw-work-card__loading span {
  font-size: 8px;
  font-weight: 750;
  text-shadow: 0 1px 8px rgb(35 58 84 / 32%);
}

.draw-work-card__failure {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 9px;
  background: linear-gradient(145deg, #f3f5f7, #e8ecef);
  color: #9d5b55;
}

.draw-work-card__failure :deep(svg) {
  font-size: 21px;
}

.draw-work-card__failure span {
  font-size: 8px;
  font-weight: 750;
}

@keyframes draw-loading-shine {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -120% 0;
  }
}

.draw-work-card > p {
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

.draw-work-card__error-message {
  display: block;
  overflow: hidden;
  margin: -2px 10px 8px;
  color: #b65147;
  font-size: 7px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draw-work-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 10px 10px;
}

.draw-work-card__meta span {
  padding: 2px 5px;
  border-radius: 4px;
  background: #f3f5f7;
  color: #858e9a;
  font-size: 7px;
}

.draw-work-card__edit {
  display: grid;
  order: 5;
  align-items: center;
  gap: 7px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin: 0 16px 12px;
}

.draw-work-card__edit > span,
.draw-work-detail__edit-prompt > span {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  border: 1px solid #dfe4ea;
  border-radius: 7px;
  background: #fff;
  color: #657080;
  font-size: 8px;
  font-weight: 700;
  white-space: nowrap;
}

.draw-work-card__edit input,
.draw-work-detail__edit-prompt input {
  width: 100%;
  min-width: 0;
  height: 34px;
  padding: 0 11px;
  border: 1px solid #dfe4ea;
  border-radius: 7px;
  outline: 0;
  background: #fff;
  color: #3f4854;
  font-size: 9px;
}

.draw-work-card__edit input:focus,
.draw-work-detail__edit-prompt input:focus {
  border-color: #9f8bea;
  box-shadow: 0 0 0 3px rgb(115 82 232 / 8%);
}

.draw-work-card__edit button,
.draw-work-detail__edit-prompt button {
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: #6544d7;
  color: #fff;
  font-size: 8px;
  font-weight: 750;
  cursor: pointer;
}

.draw-work-card__edit button:disabled,
.draw-work-detail__edit-prompt button:disabled {
  background: #d8dce3;
  cursor: not-allowed;
}

.draw-work-card > footer {
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 8px;
  border-top: 1px solid #eef0f3;
}

.draw-work-card > footer.draw-work-card__edit-actions {
  order: 6;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 10px 12px 12px;
}

.draw-work-card > footer.draw-work-card__edit-actions button {
  height: 32px;
  font-size: 8px;
}

.draw-work-card--failed > footer {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.draw-work-card > footer button {
  display: inline-flex;
  min-width: 0;
  height: 29px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 5px;
  border: 1px solid #e0e4e9;
  border-radius: 6px;
  background: #fff;
  color: #626c79;
  font-size: 7px;
  cursor: pointer;
}

.draw-work-card > footer button:hover {
  border-color: #bfd2e8;
  color: #2f72df;
}

.draw-work-card > footer button.active {
  border-color: #efd49a;
  background: #fffaf0;
  color: #bd7b13;
}

.draw-work-card > footer button.draw-work-card__delete {
  color: #9a6260;
}

.draw-work-detail {
  position: fixed;
  z-index: 1600;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 28px;
  background: rgb(18 24 34 / 62%);
  backdrop-filter: blur(8px);
}

.draw-work-detail__dialog {
  display: grid;
  width: min(1020px, 100%);
  max-height: min(780px, calc(100vh - 56px));
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid rgb(255 255 255 / 72%);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 28px 80px rgb(8 15 28 / 32%);
}

.draw-work-detail__dialog > header {
  display: flex;
  min-height: 60px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid #edf0f4;
}

.draw-work-detail__dialog > header > div {
  display: grid;
  gap: 2px;
}

.draw-work-detail__dialog > header span {
  color: #8b94a1;
  font-size: 8px;
}

.draw-work-detail__dialog > header strong {
  color: #29313c;
  font-size: 15px;
}

.draw-work-detail__dialog > header button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e0e5eb;
  border-radius: 8px;
  background: #fff;
  color: #6e7785;
  cursor: pointer;
}

.draw-work-detail__content {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 1.55fr) minmax(310px, 0.85fr);
}

.draw-work-detail__preview {
  display: grid;
  min-height: 0;
  place-items: center;
  padding: 24px;
  overflow: auto;
  background:
    linear-gradient(45deg, #e9edf2 25%, transparent 25%),
    linear-gradient(-45deg, #e9edf2 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e9edf2 75%),
    linear-gradient(-45deg, transparent 75%, #e9edf2 75%), #f5f7f9;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

.draw-work-detail__preview img {
  display: block;
  max-width: 100%;
  max-height: 620px;
  border-radius: 6px;
  box-shadow: 0 16px 42px rgb(24 36 54 / 18%);
  object-fit: contain;
}

.draw-work-detail__info {
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
  border-left: 1px solid #edf0f4;
}

.draw-work-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.draw-work-detail__meta span {
  padding: 4px 7px;
  border-radius: 5px;
  background: #f1f4f7;
  color: #7a8491;
  font-size: 8px;
}

.draw-work-detail__info > p {
  margin: 16px 0 20px;
  color: #3f4854;
  font-size: 10px;
  line-height: 1.75;
}

.draw-work-detail__edit-prompt {
  display: grid;
  align-items: center;
  gap: 7px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin: -6px 0 18px;
}

.draw-work-detail__primary {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.draw-work-detail__primary button,
.draw-work-detail__edits button {
  display: inline-flex;
  min-width: 0;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid #dfe4ea;
  border-radius: 7px;
  background: #fff;
  color: #5f6977;
  font-size: 8px;
  font-weight: 700;
  cursor: pointer;
}

.draw-work-detail__primary button:first-child {
  border-color: #5f5ad8;
  background: #5f5ad8;
  color: #fff;
}

.draw-work-detail__primary button.active {
  border-color: #e8ce87;
  background: #fffaf0;
  color: #b67a13;
}

.draw-work-detail__edits {
  margin-top: 23px;
  padding-top: 19px;
  border-top: 1px solid #edf0f4;
}

.draw-work-detail__edits > header {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}

.draw-work-detail__edits > header strong {
  color: #303844;
  font-size: 11px;
}

.draw-work-detail__edits > header span {
  color: #929aa6;
  font-size: 8px;
  line-height: 1.5;
}

.draw-work-detail__edits > div {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.draw-work-detail__primary button:hover,
.draw-work-detail__edits button:hover {
  border-color: #bdc9dc;
  color: #3e63b8;
}

.draw-generator__empty {
  display: grid;
  min-height: 390px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed #d9dee5;
  border-radius: 8px;
  background: rgb(255 255 255 / 58%);
  text-align: center;
}

.draw-generator__empty > span {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 14px;
  background: #eaf2fb;
  color: #4381c9;
  font-size: 21px;
}

.draw-generator__empty strong {
  margin-top: 3px;
  color: #424a56;
  font-size: 12px;
}

.draw-generator__empty p {
  margin: 0;
  color: #949ca8;
  font-size: 8px;
}

.draw-main__inner {
  width: min(100%, 1060px);
  margin: 0 auto;
  padding: 0 28px 64px;
}

.draw-main__navigation {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid #eef0f3;
}

.draw-main__navigation nav {
  display: flex;
  align-items: center;
  gap: 22px;
}

.draw-main__navigation button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #4c5664;
  font-size: 10px;
  font-weight: 720;
  cursor: pointer;
}

.draw-main__navigation button :deep(svg) {
  font-size: 11px;
}

.draw-main__navigation button :deep(svg:first-child) {
  color: #32987d;
}

.draw-main__navigation > span {
  color: #a0a7b2;
  font-size: 8px;
}

.draw-composer {
  padding: 30px 8px 26px;
  text-align: center;
}

.draw-composer__heading h1 {
  margin: 0;
  color: #1e242d;
  font-size: 29px;
  font-weight: 860;
  letter-spacing: -0.035em;
}

.draw-composer__heading p {
  margin: 8px 0 0;
  color: #858e9b;
  font-size: 10px;
}

.draw-composer__box {
  width: min(100%, 900px);
  margin: 24px auto 0;
  padding: 12px 14px 11px;
  border: 1px solid #dfe3e8;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 34px rgb(36 46 65 / 7%);
  text-align: left;
}

.draw-composer__input {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: 54px minmax(0, 1fr);
}

.draw-composer__upload {
  display: grid;
  width: 54px;
  height: 62px;
  place-items: center;
  align-content: center;
  gap: 5px;
  border: 1px dashed #d4d9e0;
  border-radius: 7px;
  background: #fafbfc;
  color: #7f8997;
  font-size: 8px;
  cursor: pointer;
}

.draw-composer__upload :deep(svg) {
  color: #308b74;
  font-size: 14px;
}

.draw-composer__input textarea {
  width: 100%;
  min-height: 62px;
  padding: 6px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #333b46;
  font-size: 11px;
  line-height: 1.7;
  resize: none;
}

.draw-composer__input textarea::placeholder {
  color: #a1a8b3;
}

.draw-composer__toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
}

.draw-composer__mode-label {
  display: inline-flex;
  flex: 0 0 auto;
  height: 29px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border-radius: 7px;
  background: #f2f4f6;
  color: #626c79;
  font-size: 9px;
  font-weight: 700;
}

.draw-composer__mode-label :deep(svg) {
  color: #5f5ad8;
  font-size: 11px;
}

.draw-composer__toolbar > label {
  position: relative;
  display: flex;
  min-width: 0;
  height: 34px;
  align-items: center;
  border: 1px solid #e0e4e9;
  border-radius: 7px;
  background: #fff;
}

.draw-composer__toolbar > label:nth-of-type(1) {
  width: 130px;
}

.draw-composer__toolbar > label:nth-of-type(2) {
  width: 104px;
}

.draw-composer__toolbar > label:nth-of-type(3) {
  width: 78px;
}

.draw-composer__toolbar select {
  width: 100%;
  height: 100%;
  padding: 0 27px 0 10px;
  border: 0;
  outline: 0;
  appearance: none;
  background: transparent;
  color: #596273;
  font-size: 9px;
  cursor: pointer;
}

.draw-composer__toolbar > label :deep(svg) {
  position: absolute;
  right: 8px;
  color: #969eaa;
  font-size: 8px;
  pointer-events: none;
}

.draw-composer__credits {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 0 12px;
  color: #6f7886;
  font-size: 9px;
  white-space: nowrap;
}

.draw-composer__credits :deep(svg) {
  color: #df7f31;
}

.draw-composer__submit {
  display: inline-flex;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 17px;
  border: 0;
  border-radius: 7px;
  background: #20242b;
  color: #fff;
  font-size: 10px;
  font-weight: 780;
  cursor: pointer;
}

.draw-composer__submit:disabled {
  background: #d7dbe1;
  cursor: not-allowed;
}

.draw-composer__presets {
  display: flex;
  width: min(100%, 740px);
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px auto 0;
}

.draw-composer__presets button {
  min-width: 128px;
  height: 31px;
  padding: 0 12px;
  border: 1px solid #e1e5ea;
  border-radius: 999px;
  background: #fff;
  color: #697280;
  font-size: 9px;
  cursor: pointer;
}

.draw-composer__presets button.active {
  border-color: #b9d6d0;
  background: #edf8f4;
  color: #238268;
  font-weight: 750;
}

.draw-composer__model-note {
  margin: 11px 0 0;
  color: #9aa2ae;
  font-size: 8px;
}

.draw-section {
  padding: 25px 0 4px;
}

.draw-section + .draw-section {
  margin-top: 18px;
  border-top: 1px solid #f1f2f5;
}

.draw-section__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
}

.draw-section__heading h2 {
  margin: 0;
  color: #252b34;
  font-size: 20px;
  font-weight: 820;
}

.draw-section__heading p {
  margin: 6px 0 0;
  color: #858e9b;
  font-size: 10px;
}

.draw-section__heading--tools > button {
  height: 31px;
  flex: 0 0 auto;
  padding: 0 11px;
  border: 1px solid #dfe3e8;
  border-radius: 7px;
  background: #fff;
  color: #5f6877;
  font-size: 9px;
  cursor: pointer;
}

.draw-type-grid {
  display: grid;
  gap: 11px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.draw-type-card {
  display: grid;
  min-height: 164px;
  align-content: start;
  padding: 16px;
  border: 1px solid #e4e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(31 41 58 / 3%);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.draw-type-card:hover,
.draw-type-card:focus-visible {
  border-color: #bdd4e9;
  outline: 0;
  box-shadow: 0 10px 24px rgb(31 60 98 / 8%);
  transform: translateY(-1px);
}

.draw-tool-glyph {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--tool-accent) 22%, white);
  border-radius: 8px;
  background: color-mix(in srgb, var(--tool-accent) 10%, white);
  color: var(--tool-accent);
  font-size: 10px;
  font-weight: 850;
}

.draw-type-card h3,
.draw-commerce-card h3 {
  margin: 11px 0 0;
  color: #2a3039;
  font-size: 15px;
}

.draw-type-card p,
.draw-commerce-card p {
  margin: 7px 0 0;
  color: #818a97;
  font-size: 9px;
  line-height: 1.7;
}

.draw-type-card footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 13px;
}

.draw-type-card footer button,
.draw-commerce-card__copy > div button {
  height: 27px;
  padding: 0 9px;
  border: 1px solid #e0e4e9;
  border-radius: 6px;
  background: #fff;
  color: #626c7a;
  font-size: 8px;
  cursor: pointer;
}

.draw-commerce-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.draw-commerce-card {
  display: grid;
  min-height: 180px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) 180px;
  border: 1px solid #e5e8ec;
  border-radius: 8px;
  background: #fff;
}

.draw-commerce-card__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 17px;
}

.draw-commerce-card__copy > div {
  display: flex;
  gap: 7px;
  margin-top: auto;
  padding-top: 13px;
}

.draw-commerce-card__copy > div button:last-child {
  border-color: #258b70;
  background: #258b70;
  color: #fff;
}

.draw-commerce-card__preview {
  position: relative;
  overflow: hidden;
  background: #f1f4f8;
}

.draw-commerce-card__photo,
.draw-commerce-card__panel {
  position: absolute;
  display: block;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgb(35 52 75 / 10%);
}

.draw-commerce-card__photo {
  width: 76px;
  height: 104px;
  border: 3px solid #fff;
}

.draw-commerce-card__photo--one {
  top: 18px;
  left: 21px;
  background:
    linear-gradient(145deg, transparent 42%, #ae8d68 43% 57%, transparent 58%),
    linear-gradient(180deg, #cee4ee 0 44%, #f5eee6 45%);
  transform: rotate(-4deg);
}

.draw-commerce-card__photo--two {
  top: 34px;
  left: 79px;
  background:
    linear-gradient(150deg, transparent 48%, #6c8d72 49% 62%, transparent 63%),
    linear-gradient(180deg, #f8d9cb 0 45%, #e6d5c7 46%);
  transform: rotate(3deg);
}

.draw-commerce-card__panel {
  top: 19px;
  right: 15px;
  display: grid;
  width: 48px;
  height: 108px;
  align-content: start;
  gap: 7px;
  padding: 11px 8px;
  border: 3px solid #fff;
  background: #fff;
}

.draw-commerce-card__panel i {
  display: block;
  height: 5px;
  border-radius: 999px;
  background: #d8dde5;
}

.draw-commerce-card__panel i:first-child {
  height: 22px;
  background: #b8d7d1;
}

.draw-tool-group + .draw-tool-group {
  margin-top: 18px;
}

.draw-tool-group > h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  color: #606a78;
  font-size: 10px;
}

.draw-tool-group > h3 span {
  width: 3px;
  height: 12px;
  border-radius: 999px;
  background: #31a77b;
}

.draw-tool-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.draw-tool-card {
  display: grid;
  min-height: 116px;
  place-items: center;
  align-content: center;
  gap: 7px;
  padding: 13px 9px;
  border: 1px solid #e5e8ec;
  border-radius: 8px;
  background: #fff;
  color: #2e3540;
  cursor: pointer;
}

.draw-tool-card:hover {
  border-color: #bddbd2;
  box-shadow: 0 8px 20px rgb(35 84 69 / 7%);
  transform: translateY(-1px);
}

.draw-tool-card strong {
  font-size: 11px;
  font-weight: 760;
}

.draw-tool-card small {
  color: #929aa6;
  font-size: 8px;
  line-height: 1.5;
  text-align: center;
}

@media (max-width: 1180px) {
  .draw-generator__workspace {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .draw-effect-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .draw-tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .draw-commerce-card {
    grid-template-columns: minmax(0, 1fr) 145px;
  }
}

@media (max-width: 980px) {
  .draw-studio {
    display: block;
  }

  .draw-library {
    display: none;
  }

  .draw-template-studio__header {
    grid-template-columns: minmax(145px, 1fr) auto;
  }

  .draw-template-studio__header > strong {
    display: none;
  }

  .draw-template-composer {
    left: 22px;
    width: calc(100% - 44px);
  }

  .draw-studio--template .draw-template-composer {
    left: 22px;
  }

  .draw-main__inner {
    padding-right: 20px;
    padding-left: 20px;
  }

  .draw-generator__header {
    grid-template-columns: minmax(145px, 1fr) auto minmax(145px, 1fr);
    padding-right: 12px;
    padding-left: 12px;
  }
}

@media (max-width: 820px) {
  .draw-generator {
    height: auto;
    min-height: calc(100vh - 56px);
    grid-template-rows: auto auto;
    overflow: visible;
  }

  .draw-generator__header {
    min-height: 58px;
    grid-template-columns: minmax(0, 1fr) auto;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .draw-generator__title {
    display: none;
  }

  .draw-generator__workspace {
    grid-template-columns: 1fr;
  }

  .draw-generator__params {
    overflow: visible;
    border-right: 0;
    border-bottom: 1px solid #e7eaee;
  }

  .draw-generator__results {
    overflow: visible;
    padding-right: 14px;
    padding-left: 14px;
  }

  .draw-generator__results > header {
    position: static;
    margin: 0 0 13px;
    padding: 0;
    background: transparent;
    backdrop-filter: none;
  }

  .draw-template-studio {
    padding-bottom: 170px;
  }

  .draw-template-studio__content {
    padding-right: 20px;
    padding-left: 20px;
  }
}

@media (max-width: 760px) {
  .draw-generator__model-grid,
  .draw-generator__work-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .draw-generator__work-grid--mine {
    grid-template-columns: 1fr;
  }

  .draw-work-card--mine > header {
    gap: 7px;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .draw-work-card--mine > header .draw-work-card__id,
  .draw-work-card--mine > header em {
    display: none;
  }

  .draw-work-card--mine > header .draw-work-card__header-actions {
    width: 100%;
    grid-column: 1 / -1;
    justify-content: stretch;
  }

  .draw-work-card__header-actions button {
    flex: 1;
  }

  .draw-work-card__header-actions button.draw-work-card__delete {
    flex: 0 0 38px;
  }

  .draw-work-card__edit {
    grid-template-columns: 1fr;
  }

  .draw-work-card__edit > span {
    display: none;
  }

  .draw-work-card > footer.draw-work-card__edit-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .draw-main__inner {
    padding-right: 13px;
    padding-bottom: 42px;
    padding-left: 13px;
  }

  .draw-template-studio__header {
    gap: 8px;
    padding-right: 12px;
    padding-left: 12px;
  }

  .draw-template-studio__header > div {
    gap: 5px;
  }

  .draw-template-studio__header > div button {
    padding: 0 8px;
    font-size: 8px;
  }

  .draw-template-studio__content {
    padding: 24px 13px 0;
  }

  .draw-template-hero > span {
    width: 58px;
    height: 58px;
    font-size: 22px;
  }

  .draw-template-hero h1 {
    font-size: 21px;
  }

  .draw-template-categories {
    justify-content: flex-start;
    margin-right: -13px;
    margin-left: -13px;
    padding-right: 13px;
    padding-left: 13px;
  }

  .draw-template-categories button {
    min-width: max-content;
  }

  .draw-effect-grid {
    grid-template-columns: 1fr;
  }

  .draw-template-composer {
    right: 10px;
    bottom: 10px;
    left: 10px;
    min-height: 191px;
    width: auto;
    grid-template-columns: 62px minmax(0, 1fr);
    padding: 10px;
  }

  .draw-studio--template .draw-template-composer {
    left: 10px;
  }

  .draw-template-composer__upload {
    width: 62px;
    height: 64px;
  }

  .draw-template-composer__prompt textarea {
    min-height: 63px;
    padding-right: 36px;
  }

  .draw-template-composer > footer {
    flex-wrap: wrap;
  }

  .draw-template-composer > footer label {
    width: calc(58% - 4px);
  }

  .draw-template-composer > footer label:nth-of-type(2) {
    width: calc(42% - 4px);
  }

  .draw-template-composer > footer > span {
    order: 4;
    margin-left: 0;
    padding-left: 4px;
  }

  .draw-template-composer > footer > button.draw-template-composer__submit {
    flex: 1;
    order: 5;
  }

  .draw-main__navigation {
    min-height: 46px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .draw-work-card > footer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .draw-main__navigation nav {
    gap: 14px;
  }

  .draw-main__navigation > span {
    display: none;
  }

  .draw-composer {
    padding-top: 24px;
  }

  .draw-composer__heading h1 {
    font-size: 24px;
  }

  .draw-composer__box {
    padding: 10px;
  }

  .draw-composer__input {
    grid-template-columns: 46px minmax(0, 1fr);
  }

  .draw-composer__upload {
    width: 46px;
    height: 56px;
  }

  .draw-composer__toolbar {
    flex-wrap: wrap;
  }

  .draw-composer__toolbar > label:nth-of-type(1) {
    width: calc(100% - 96px);
  }

  .draw-composer__toolbar > label:nth-of-type(2) {
    width: calc(50% - 4px);
  }

  .draw-composer__toolbar > label:nth-of-type(3) {
    width: calc(50% - 4px);
  }

  .draw-composer__credits {
    margin-left: 0;
  }

  .draw-composer__submit {
    flex: 1;
  }

  .draw-composer__presets {
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 3px;
    scrollbar-width: none;
  }

  .draw-composer__presets button {
    min-width: max-content;
  }

  .draw-type-grid,
  .draw-commerce-grid {
    grid-template-columns: 1fr;
  }

  .draw-commerce-card {
    grid-template-columns: minmax(0, 1fr) 125px;
  }

  .draw-tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .draw-generator__header {
    align-items: stretch;
    gap: 8px;
    grid-template-columns: 1fr;
  }

  .draw-generator__back {
    justify-self: start;
  }

  .draw-generator__tabs {
    width: 100%;
    justify-self: stretch;
  }

  .draw-generator__tabs button {
    flex: 1;
    justify-content: center;
  }

  .draw-generator__work-grid {
    grid-template-columns: 1fr;
  }

  .draw-section__heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .draw-section__heading h2 {
    font-size: 18px;
  }

  .draw-commerce-card {
    grid-template-columns: 1fr;
  }

  .draw-commerce-card__preview {
    min-height: 145px;
  }

  .draw-tool-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
