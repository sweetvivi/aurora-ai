<script setup lang="ts">
import {
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExpandOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SoundOutlined,
  StarOutlined,
  ThunderboltFilled,
  UploadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { fetchFileBlob } from '@/app/api';
import GalleryArtwork from '@/components/GalleryArtwork.vue';
import { useDrawWorkspaceStore } from '@/stores/draw-workspace';
import { useModelCatalogStore } from '@/stores/model-catalog';
import {
  VIDEO_TASK_POINTS_COST,
  type VideoWork,
  type VideoWorkStatus,
  useVideoWorkspaceStore,
} from '@/stores/video-workspace';

type VideoMode = 'first-last-frame' | 'image-to-video' | 'text-to-video';
type GalleryTab = 'discover' | 'mine';

interface VideoModel {
  accent: string;
  badge?: string;
  description: string;
  label: string;
  short: string;
  value: string;
}

interface SourceFrame {
  id: string;
  name: string;
  url: string;
}

interface ShowcaseItem {
  duration: number;
  model: string;
  prompt: string;
  ratio: string;
  title: string;
  variant: number;
}

interface VideoModeOption {
  available?: boolean;
  description: string;
  label: string;
  value: VideoMode;
}

const modes: VideoModeOption[] = [
  { description: '用文字描述镜头', label: '文生视频', value: 'text-to-video' },
  { description: '上传图片生成视频', label: '图生视频', value: 'image-to-video' },
  {
    available: false,
    description: '控制首尾画面',
    label: '首尾帧',
    value: 'first-last-frame',
  },
];

const modelAccents = ['#7c72ff', '#e5689a', '#21a77c', '#3979d5'];

const showcaseItems: ShowcaseItem[] = [
  {
    duration: 5,
    model: 'Runway',
    prompt: '篝火旁缓慢旋转的深色瓶身，火光映照玻璃质感，镜头轻微推进。',
    ratio: '16:9',
    title: '篝火产品镜头',
    variant: 0,
  },
  {
    duration: 10,
    model: 'Sora 2',
    prompt: '黑白夜景，人群靠近镜头后自然停顿，电影级手持镜头。',
    ratio: '16:9',
    title: '街角夜景',
    variant: 1,
  },
  {
    duration: 6,
    model: 'Runway',
    prompt: '两匹马沿草地奔跑，镜头从侧后方平稳跟随，天空有柔软云层。',
    ratio: '16:9',
    title: '草原奔跑',
    variant: 2,
  },
  {
    duration: 5,
    model: 'Sora 2',
    prompt: '童话草地上的男孩与宠物奔跑，色彩明快，脚踏式镜头。',
    ratio: '16:9',
    title: '动画草地',
    variant: 3,
  },
  {
    duration: 4,
    model: 'Pika',
    prompt: '人物在泳池边跃起后转体入水，阳光穿过水花，镜头拉远。',
    ratio: '16:9',
    title: '水面跃动',
    variant: 4,
  },
  {
    duration: 7,
    model: 'CogVideo',
    prompt: '复古舞者在镜面舞台上旋转，灯光跟随身体动作移动。',
    ratio: '16:9',
    title: '镜面舞台',
    variant: 5,
  },
  {
    duration: 8,
    model: 'Sora 2',
    prompt: '一列地铁穿过雨夜城市，霓虹倒影在车窗上快速掠过。',
    ratio: '16:9',
    title: '雨夜列车',
    variant: 6,
  },
  {
    duration: 6,
    model: 'Runway',
    prompt: '镜头贴着冰川缓慢前移，光线从山脊后方穿透雾层。',
    ratio: '16:9',
    title: '冰川航拍',
    variant: 7,
  },
];

const ratios = ['16:9', '9:16', '1:1'];
const defaultDurations = [5, 10, 15];
const durationCandidates = [5, 10, 12, 15, 30];
const defaultResolutions = ['720P', '1080P'];
const promptPresets = [
  '镜头缓慢推进，光线自然变化',
  '产品在桌面上平稳旋转',
  '人物回头看向镜头，发丝轻微飘动',
  '云层流动，镜头从远景拉近',
];

const activeGalleryTab = ref<GalleryTab>('discover');
const route = useRoute();
const drawWorkspace = useDrawWorkspaceStore();
const videoWorkspace = useVideoWorkspaceStore();
const modelCatalog = useModelCatalogStore();
const mode = ref<VideoMode>('text-to-video');
const selectedModel = ref(modelCatalog.resolveAlias('video'));
const selectedRatio = ref('16:9');
const selectedDuration = ref(5);
const selectedResolution = ref('1080P');
const prompt = ref('');
const sourceFrames = ref<SourceFrame[]>([]);
const sourceInput = ref<HTMLInputElement | null>(null);
const formError = ref('');
const previewShowcase = ref<ShowcaseItem | null>(null);
const previewTask = ref<VideoWork | null>(null);
const notice = ref('');
const consumedRouteContext = ref('');
const uploadingSource = ref(false);
let noticeTimer: number | undefined;

const models = computed<VideoModel[]>(() =>
  modelCatalog.modelsFor('video').map((model, index) => ({
    accent: modelAccents[index % modelAccents.length] ?? '#7c72ff',
    badge: index === 0 ? '推荐' : undefined,
    description:
      index === 0
        ? '当前默认视频模型，适合电影感镜头与商业内容。'
        : '补充视频模型，可用于不同节奏、构图和内容风格。',
    label: model.displayName,
    short: model.displayName.slice(0, 1),
    value: model.alias,
  })),
);
const activeVideoProfile = computed(
  () =>
    modelCatalog.modelsFor('video').find((model) => model.alias === selectedModel.value)?.profile
      ?.video,
);
const availableModes = computed<VideoModeOption[]>(() =>
  modes.map((item) =>
    item.value === 'first-last-frame'
      ? {
          ...item,
          available: activeVideoProfile.value?.supportsLastFrame ?? true,
        }
      : item,
  ),
);
const availableDurations = computed(() => {
  const maximum = activeVideoProfile.value?.maxDuration;

  if (!maximum) {
    return defaultDurations;
  }

  const candidates = durationCandidates.filter((duration) => duration <= maximum);

  if (!candidates.includes(maximum)) {
    candidates.push(maximum);
  }

  return candidates.sort((left, right) => left - right);
});
const availableResolutions = computed(() => {
  const resolutions = activeVideoProfile.value?.resolutions
    ?.map((resolution) => resolution.trim().toUpperCase())
    .filter(Boolean);

  return resolutions?.length ? Array.from(new Set(resolutions)) : defaultResolutions;
});
const activeModel = computed(
  () => models.value.find((model) => model.value === selectedModel.value) ?? models.value[0],
);
const sortedTasks = computed(() =>
  [...videoWorkspace.works].sort((left, right) => right.createdAt - left.createdAt),
);
const activeTasks = computed(() => videoWorkspace.activeWorks);
const needsSource = computed(() => mode.value !== 'text-to-video');
const requiredFrameCount = computed(() => (mode.value === 'first-last-frame' ? 2 : 1));
const canSubmit = computed(() => {
  if (videoWorkspace.submitting || activeTasks.value.length > 0 || !prompt.value.trim()) {
    return false;
  }

  return (
    !uploadingSource.value &&
    (!needsSource.value || sourceFrames.value.length === requiredFrameCount.value)
  );
});
const imageHistory = computed(
  () => videoWorkspace.works.filter((task) => task.status === 'done').length,
);
const previewOpen = computed(() => Boolean(previewShowcase.value ?? previewTask.value));
const previewTitle = computed(
  () => previewTask.value?.prompt ?? previewShowcase.value?.title ?? '视频预览',
);
const previewPrompt = computed(
  () => previewTask.value?.prompt ?? previewShowcase.value?.prompt ?? '',
);
const previewModel = computed(
  () => previewTask.value?.modelLabel ?? previewShowcase.value?.model ?? '视频模型',
);
const previewRatio = computed(
  () => previewTask.value?.ratio ?? previewShowcase.value?.ratio ?? '16:9',
);
const previewDuration = computed(() =>
  previewTask.value
    ? taskDuration(previewTask.value)
    : `00:${String(previewShowcase.value?.duration ?? 0).padStart(2, '0')}`,
);
const previewResultUrl = computed(() => previewTask.value?.resultUrl ?? '');
const previewIsVideo = computed(() =>
  Boolean(previewTask.value && isVideoResult(previewTask.value)),
);

async function handleSourceUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  if (files.length === 0) {
    return;
  }

  const availableSlots = Math.max(0, requiredFrameCount.value - sourceFrames.value.length);

  formError.value = '';
  uploadingSource.value = true;

  try {
    for (const file of files.slice(0, availableSlots)) {
      const asset = await videoWorkspace.uploadFrame(file);

      sourceFrames.value = [
        ...sourceFrames.value,
        {
          id: asset.id,
          name: file.name,
          url: URL.createObjectURL(file),
        },
      ];
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '素材上传失败，请重试';
  } finally {
    uploadingSource.value = false;
    input.value = '';
  }
}

function removeSourceFrame(index: number): void {
  const frame = sourceFrames.value[index];

  if (!frame) {
    return;
  }

  URL.revokeObjectURL(frame.url);
  sourceFrames.value = sourceFrames.value.filter((_, frameIndex) => frameIndex !== index);
}

function removeAllSourceFrames(): void {
  for (const frame of sourceFrames.value) {
    URL.revokeObjectURL(frame.url);
  }

  sourceFrames.value = [];
}

function isVideoMode(value: string): value is VideoMode {
  return modes.some((item) => item.value === value);
}

async function consumeRouteContext(): Promise<void> {
  const queryMode = typeof route.query.mode === 'string' ? route.query.mode.trim() : '';
  const queryPrompt = typeof route.query.prompt === 'string' ? route.query.prompt.trim() : '';
  const sourceWorkId =
    typeof route.query.sourceWork === 'string' ? route.query.sourceWork.trim() : '';
  const routeKey = `${queryMode}:${queryPrompt}:${sourceWorkId}`;

  if (consumedRouteContext.value === routeKey) {
    return;
  }

  consumedRouteContext.value = routeKey;

  if (queryMode && isVideoMode(queryMode)) {
    changeMode(queryMode);
  }

  if (queryPrompt) {
    prompt.value = queryPrompt;
  }

  if (!sourceWorkId) {
    return;
  }

  formError.value = '';

  try {
    await drawWorkspace.initialize();

    const work = drawWorkspace.works.find(
      (item) => item.id === sourceWorkId && item.status === 'done' && item.resultFileId,
    );

    if (!work?.resultFileId) {
      throw new Error('原作品文件暂不可用，请重新上传参考图');
    }

    const blob = await fetchFileBlob(work.resultFileId);
    const frameName = work.resultFileName || `draw-${work.id}.png`;
    const frameFile = new File([blob], frameName, {
      type: blob.type || 'image/png',
    });
    const asset = await videoWorkspace.uploadFrame(frameFile);

    removeAllSourceFrames();
    changeMode('image-to-video');
    sourceFrames.value = [
      {
        id: asset.id,
        name: frameName,
        url: URL.createObjectURL(frameFile),
      },
    ];
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '原作品载入失败，请重新上传参考图';
  }
}

function changeMode(nextMode: VideoMode): void {
  if (availableModes.value.find((item) => item.value === nextMode)?.available === false) {
    showNotice('首尾帧能力待接入，当前支持文生视频和单图参考');
    return;
  }

  mode.value = nextMode;
  formError.value = '';

  if (nextMode !== 'first-last-frame' && sourceFrames.value.length > 1) {
    const [firstFrame] = sourceFrames.value;
    sourceFrames.value.slice(1).forEach((frame) => URL.revokeObjectURL(frame.url));
    sourceFrames.value = firstFrame ? [firstFrame] : [];
  }
}

function selectVideoModel(modelAlias: string): void {
  selectedModel.value = modelAlias;
  applyActiveModelConstraints();
}

function applyActiveModelConstraints(): void {
  const durations = availableDurations.value;
  const resolutions = availableResolutions.value;

  if (!durations.includes(selectedDuration.value)) {
    const preferredDuration = [...durations]
      .reverse()
      .find((duration) => duration <= selectedDuration.value);

    selectedDuration.value = preferredDuration ?? durations[0] ?? 5;
  }

  if (!resolutions.includes(selectedResolution.value)) {
    selectedResolution.value = resolutions.includes('1080P')
      ? '1080P'
      : (resolutions.at(-1) ?? '720P');
  }

  if (mode.value === 'first-last-frame' && activeVideoProfile.value?.supportsLastFrame === false) {
    changeMode('image-to-video');
  }
}

async function submitTask(): Promise<void> {
  formError.value = '';

  if (!prompt.value.trim()) {
    formError.value = '请填写镜头描述';
    return;
  }

  if (needsSource.value && sourceFrames.value.length !== requiredFrameCount.value) {
    formError.value =
      mode.value === 'first-last-frame' ? '请上传首帧和尾帧图片' : '请先上传一张参考图';
    return;
  }

  const sourceIds = sourceFrames.value.map((frame) => frame.id);
  const task = await videoWorkspace.createGeneration({
    duration: selectedDuration.value,
    lastFrameFileId: mode.value === 'first-last-frame' ? sourceIds[1] : undefined,
    mode: mode.value,
    model: selectedModel.value,
    modelAlias: selectedModel.value,
    modelLabel: activeModel.value?.label ?? '视频模型',
    prompt: prompt.value.trim(),
    ratio: selectedRatio.value,
    resolution: selectedResolution.value,
    sourceFileId: needsSource.value ? sourceIds[0] : undefined,
  });

  if (!task) {
    formError.value = videoWorkspace.error?.message ?? '视频任务提交失败，请稍后重试';
    return;
  }

  activeGalleryTab.value = 'mine';
  prompt.value = '';
}

async function retryTask(taskId: string): Promise<void> {
  if (activeTasks.value.length > 0) {
    return;
  }

  const task = await videoWorkspace.retryWork(taskId);

  if (!task) {
    formError.value = videoWorkspace.error?.message ?? '视频任务重试失败，请稍后再试';
    return;
  }

  activeGalleryTab.value = 'mine';
}

async function cancelTask(taskId: string): Promise<void> {
  await videoWorkspace.cancelWork(taskId);
}

function removeTask(taskId: string): void {
  videoWorkspace.removeWork(taskId);
}

function toggleFavorite(taskId: string): void {
  videoWorkspace.toggleFavorite(taskId);
}

function reuseTask(task: VideoWork): void {
  prompt.value = task.prompt;
  selectedRatio.value = task.ratio;
  selectedDuration.value = task.duration;
  selectedResolution.value = task.resolution;
  selectVideoModel(task.modelAlias);

  if (isVideoMode(task.mode)) {
    changeMode(task.mode);
  }

  window.scrollTo({ behavior: 'smooth', top: 0 });
}

function reuseShowcase(item: ShowcaseItem): void {
  prompt.value = item.prompt;
  selectedRatio.value = item.ratio;
  selectedDuration.value = item.duration;
  const model =
    models.value.find(
      (entry) => entry.label.includes(item.model) || entry.value.includes(item.model),
    ) ?? models.value[item.variant % models.value.length];

  if (model) {
    selectVideoModel(model.value);
  }

  activeGalleryTab.value = 'mine';
  window.scrollTo({ behavior: 'smooth', top: 0 });
}

function showNotice(message: string): void {
  notice.value = message;

  if (noticeTimer !== undefined) {
    window.clearTimeout(noticeTimer);
  }

  noticeTimer = window.setTimeout(() => {
    notice.value = '';
    noticeTimer = undefined;
  }, 2200);
}

async function copyPrompt(value: string): Promise<void> {
  const text = value.trim();

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showNotice('提示词已复制');
  } catch {
    showNotice('复制失败，请手动选择提示词');
  }
}

function openShowcasePreview(item: ShowcaseItem): void {
  previewTask.value = null;
  previewShowcase.value = item;
}

function openTaskPreview(task: VideoWork): void {
  if (task.status !== 'done') {
    return;
  }

  previewShowcase.value = null;
  previewTask.value = task;
}

function closeVideoPreview(): void {
  previewShowcase.value = null;
  previewTask.value = null;
}

function reusePreview(): void {
  if (previewTask.value) {
    reuseTask(previewTask.value);
  } else if (previewShowcase.value) {
    reuseShowcase(previewShowcase.value);
  }

  closeVideoPreview();
}

function handlePreviewKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && previewOpen.value) {
    closeVideoPreview();
  }
}

async function refreshTasks(): Promise<void> {
  await videoWorkspace.loadInitialTasks();
}

async function downloadTask(taskId: string): Promise<void> {
  await videoWorkspace.downloadWork(taskId);
}

function statusLabel(status: VideoWorkStatus): string {
  const labels: Record<VideoWorkStatus, string> = {
    cancelled: '已取消',
    done: '已完成',
    failed: '生成失败',
    generating: '生成中',
    queued: '排队中',
  };

  return labels[status];
}

function modeLabel(modeValue: VideoMode): string {
  return modes.find((item) => item.value === modeValue)?.label ?? '视频';
}

function isVideoResult(task: VideoWork): boolean {
  return task.resultMimeType.startsWith('video/');
}

function taskDuration(task: VideoWork): string {
  return `00:${String(task.duration).padStart(2, '0')}`;
}

onMounted(() => {
  window.addEventListener('keydown', handlePreviewKeydown);
  void modelCatalog.load();
  void videoWorkspace.initialize();
  void consumeRouteContext();
});

watch(
  () =>
    JSON.stringify(modelCatalog.modelsFor('video').map((model) => [model.alias, model.profile])),
  () => {
    selectedModel.value = modelCatalog.resolveAlias('video', selectedModel.value);
    applyActiveModelConstraints();
  },
  { immediate: true },
);

watch(
  () => [route.query.mode, route.query.prompt, route.query.sourceWork],
  () => {
    void consumeRouteContext();
  },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePreviewKeydown);
  removeAllSourceFrames();

  if (noticeTimer !== undefined) {
    window.clearTimeout(noticeTimer);
  }
});
</script>

<template>
  <section class="video-studio">
    <header class="video-toolbar">
      <div class="video-toolbar__brand">
        <span class="video-toolbar__mark">
          <VideoCameraOutlined />
        </span>
        <strong>视频创作</strong>
      </div>
      <nav class="video-toolbar__nav" aria-label="创作工具切换">
        <RouterLink class="active" to="/video">AI 视频</RouterLink>
        <RouterLink to="/retouch" target="_blank" rel="noopener noreferrer">AI 绘画</RouterLink>
        <RouterLink to="/chat/groups" target="_blank" rel="noopener noreferrer"
          >超级对话</RouterLink
        >
        <RouterLink to="/music" target="_blank" rel="noopener noreferrer">AI 音乐</RouterLink>
      </nav>
      <div class="video-toolbar__status">
        <span>
          <ClockCircleOutlined />
          {{ videoWorkspace.generating ? '任务处理中' : '视频工作台已连接' }}
        </span>
        <RouterLink to="/map">工作台</RouterLink>
      </div>
    </header>

    <div class="video-workbench">
      <aside class="video-model-rail" aria-label="视频模型">
        <span class="video-model-rail__label">模型</span>
        <button
          v-for="model in models"
          :key="model.value"
          type="button"
          :class="{ active: selectedModel === model.value }"
          :title="model.label"
          @click="selectVideoModel(model.value)"
        >
          <i :style="{ '--model-accent': model.accent }">{{ model.short }}</i>
          <span>{{ model.label }}</span>
          <small v-if="model.badge">{{ model.badge }}</small>
        </button>
        <div class="video-model-rail__footer">
          <SoundOutlined />
          <span>音效</span>
        </div>
      </aside>

      <aside class="video-control-panel">
        <div class="video-control-panel__model">
          <div>
            <i :style="{ '--model-accent': activeModel?.accent }">
              {{ activeModel?.short }}
            </i>
            <span>
              <strong>{{ activeModel?.label }}</strong>
              <small>{{ activeModel?.badge ?? '视频模型' }}</small>
            </span>
          </div>
          <p>{{ activeModel?.description }}</p>
        </div>

        <section class="video-section video-section--modes">
          <header>
            <strong>生成方式</strong>
            <span>{{ modeLabel(mode) }}</span>
          </header>
          <div class="video-mode-grid">
            <button
              v-for="item in availableModes"
              :key="item.value"
              type="button"
              :class="{ active: mode === item.value }"
              :disabled="item.available === false"
              :title="item.available === false ? '首尾帧能力待接入' : item.description"
              @click="changeMode(item.value)"
            >
              <PlayCircleOutlined />
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.available === false ? '待接入' : item.description }}</small>
              </span>
              <CheckOutlined v-if="mode === item.value" />
            </button>
          </div>
        </section>

        <section v-if="needsSource" class="video-section">
          <header>
            <strong>{{ mode === 'first-last-frame' ? '首帧与尾帧' : '参考画面' }}</strong>
            <span>{{ sourceFrames.length }} / {{ requiredFrameCount }}</span>
          </header>
          <input
            ref="sourceInput"
            type="file"
            accept="image/*"
            multiple
            hidden
            @change="handleSourceUpload"
          />
          <div class="video-source-grid">
            <div v-for="(frame, index) in sourceFrames" :key="frame.url" class="video-source-frame">
              <img :src="frame.url" :alt="frame.name" />
              <span>{{ index === 0 ? '首帧' : '尾帧' }}</span>
              <button type="button" aria-label="移除画面" @click="removeSourceFrame(index)">
                <CloseOutlined />
              </button>
            </div>
            <button
              v-if="sourceFrames.length < requiredFrameCount"
              type="button"
              class="video-source-empty"
              @click="sourceInput?.click()"
            >
              <UploadOutlined />
              <strong>{{ sourceFrames.length === 0 ? '上传参考画面' : '补充尾帧' }}</strong>
              <small>当前支持图片，视频/音频待接入</small>
            </button>
          </div>
        </section>

        <label class="video-prompt">
          <strong>镜头描述</strong>
          <span>
            <textarea
              v-model="prompt"
              maxlength="4000"
              placeholder="一句话描述你的视频主题，场景、风格等（新手推荐点击下方使用AI智能创作提示词）"
            />
            <small>{{ prompt.length }} / 4000</small>
          </span>
        </label>

        <div class="video-presets">
          <button
            v-for="preset in promptPresets"
            :key="preset"
            type="button"
            @click="prompt = preset"
          >
            {{ preset }}
          </button>
        </div>

        <section class="video-enhancements" aria-label="创作增强">
          <div>
            <span>
              <strong>AI 音效</strong>
              <small>根据画面自动匹配声音</small>
            </span>
            <em>待接入</em>
          </div>
          <div>
            <span>
              <strong>极速模式</strong>
              <small>优先返回生成结果</small>
            </span>
            <em>待接入</em>
          </div>
          <div>
            <span>
              <strong>自适应</strong>
              <small>按当前规格自动匹配</small>
            </span>
            <em>本地生效</em>
          </div>
        </section>

        <section class="video-section video-section--options">
          <header>
            <strong>视频规格</strong>
            <span>{{ selectedDuration }} 秒 · {{ selectedResolution }}</span>
          </header>
          <div class="video-option-row">
            <span>比例</span>
            <div>
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
          </div>
          <div class="video-option-row">
            <span>时长</span>
            <div>
              <button
                v-for="duration in availableDurations"
                :key="duration"
                type="button"
                :class="{ active: selectedDuration === duration }"
                @click="selectedDuration = duration"
              >
                {{ duration }}s
              </button>
            </div>
          </div>
          <div class="video-option-row">
            <span>清晰度</span>
            <div>
              <button
                v-for="resolution in availableResolutions"
                :key="resolution"
                type="button"
                :class="{ active: selectedResolution === resolution }"
                @click="selectedResolution = resolution"
              >
                {{ resolution }}
              </button>
            </div>
          </div>
        </section>

        <div class="video-submit">
          <span>
            <ThunderboltFilled />
            预计 {{ VIDEO_TASK_POINTS_COST }} 积分
          </span>
          <button type="button" :disabled="!canSubmit" @click="submitTask">
            <LoadingOutlined v-if="activeTasks.length > 0 || videoWorkspace.submitting" />
            <VideoCameraOutlined v-else />
            {{ activeTasks.length > 0 ? '镜头生成中' : '立即生成' }}
          </button>
          <small v-if="formError" role="alert">{{ formError }}</small>
          <small v-else>生成任务会在后台持续同步，刷新页面后可继续查看</small>
        </div>
      </aside>

      <main class="video-gallery">
        <header class="video-gallery__header">
          <div class="video-gallery__tabs">
            <button
              type="button"
              :class="{ active: activeGalleryTab === 'discover' }"
              @click="activeGalleryTab = 'discover'"
            >
              创意广场
              <span>{{ showcaseItems.length }}</span>
            </button>
            <button
              type="button"
              :class="{ active: activeGalleryTab === 'mine' }"
              @click="activeGalleryTab = 'mine'"
            >
              我的作品
              <span>{{ imageHistory }}</span>
            </button>
          </div>
          <div class="video-gallery__meta">
            <p>注意：上传的素材和生成作品只保留 1 个月，请及时备份。</p>
            <button
              type="button"
              aria-label="刷新作品"
              :disabled="videoWorkspace.status === 'loading'"
              @click="refreshTasks"
            >
              <LoadingOutlined v-if="videoWorkspace.status === 'loading'" />
              <ReloadOutlined v-else />
            </button>
          </div>
        </header>

        <div v-if="activeGalleryTab === 'discover'" class="video-showcase-grid">
          <article v-for="item in showcaseItems" :key="item.title" class="video-showcase-card">
            <div
              class="video-showcase-card__visual"
              :class="`ratio-${item.ratio.replace(':', '-')}`"
            >
              <GalleryArtwork :title="item.title" :variant="item.variant" />
              <span class="video-showcase-card__model">{{ item.model }}</span>
              <span class="video-showcase-card__duration">
                00:{{ String(item.duration).padStart(2, '0') }}
              </span>
              <button type="button" aria-label="放大预览" @click="openShowcasePreview(item)">
                <ExpandOutlined />
              </button>
              <div class="video-showcase-card__play">
                <PlayCircleOutlined />
              </div>
            </div>
            <footer>
              <p>{{ item.prompt }}</p>
              <button type="button" @click="copyPrompt(item.prompt)">
                <CopyOutlined />
                复制
              </button>
            </footer>
          </article>
        </div>

        <div v-else-if="sortedTasks.length > 0" class="video-showcase-grid">
          <article
            v-for="task in sortedTasks"
            :key="task.id"
            class="video-showcase-card video-showcase-card--task"
          >
            <div
              class="video-showcase-card__visual"
              :class="`ratio-${task.ratio.replace(':', '-')}`"
              :data-result-kind="isVideoResult(task) ? 'video' : 'image'"
            >
              <template v-if="task.status === 'done' && task.resultUrl">
                <video
                  v-if="isVideoResult(task)"
                  :src="task.resultUrl"
                  controls
                  playsinline
                  preload="metadata"
                />
                <img v-else :src="task.resultUrl" :alt="task.prompt" />
              </template>
              <div
                v-else-if="task.status === 'done' && task.resultLoading"
                class="video-task-loading"
              >
                <span>
                  <LoadingOutlined />
                </span>
                <strong>载入作品</strong>
              </div>
              <GalleryArtwork
                v-else-if="task.status === 'done'"
                :title="task.prompt"
                :variant="task.variant"
              />
              <div v-else-if="task.status === 'cancelled' || task.status === 'failed'">
                <CloseOutlined />
                <strong>{{ statusLabel(task.status) }}</strong>
              </div>
              <div v-else class="video-task-loading">
                <span>
                  <LoadingOutlined />
                </span>
                <strong>{{ task.progress }}%</strong>
                <i>
                  <span :style="{ width: `${task.progress}%` }" />
                </i>
              </div>
              <span class="video-showcase-card__model">{{ task.modelLabel }}</span>
              <span class="video-showcase-card__duration">{{ taskDuration(task) }}</span>
              <button
                v-if="task.status === 'done'"
                type="button"
                aria-label="放大预览"
                @click="openTaskPreview(task)"
              >
                <ExpandOutlined />
              </button>
              <div v-if="task.status === 'done'" class="video-showcase-card__play">
                <PlayCircleOutlined />
              </div>
            </div>
            <footer>
              <p>{{ task.prompt }}</p>
              <div class="video-task-actions">
                <button
                  v-if="task.status === 'done'"
                  type="button"
                  :class="{ active: task.favorite }"
                  title="收藏"
                  @click="toggleFavorite(task.id)"
                >
                  <StarOutlined />
                </button>
                <button
                  v-if="task.status === 'done'"
                  type="button"
                  title="下载"
                  @click="downloadTask(task.id)"
                >
                  <DownloadOutlined />
                </button>
                <button v-if="task.status === 'done'" type="button" @click="reuseTask(task)">
                  <ReloadOutlined />
                </button>
                <button
                  v-if="task.status === 'done'"
                  type="button"
                  title="复制提示词"
                  @click="copyPrompt(task.prompt)"
                >
                  <CopyOutlined />
                </button>
                <button
                  v-if="task.status === 'cancelled' || task.status === 'failed'"
                  type="button"
                  @click="retryTask(task.id)"
                >
                  <ReloadOutlined />
                </button>
                <button
                  v-if="task.status === 'cancelled' || task.status === 'failed'"
                  type="button"
                  @click="removeTask(task.id)"
                >
                  <DeleteOutlined />
                </button>
                <button
                  v-if="task.status === 'queued' || task.status === 'generating'"
                  type="button"
                  @click="cancelTask(task.id)"
                >
                  <CloseOutlined />
                </button>
              </div>
            </footer>
          </article>
        </div>

        <div v-else class="video-empty">
          <span>
            <VideoCameraOutlined />
          </span>
          <strong>还没有视频任务</strong>
          <p>选择生成方式并描述镜头，处理结果会显示在这里。</p>
          <button type="button" @click="activeGalleryTab = 'discover'">浏览创意广场</button>
        </div>
      </main>
    </div>

    <Teleport to="body">
      <div
        v-if="previewOpen"
        class="video-preview"
        role="dialog"
        aria-modal="true"
        aria-label="视频作品预览"
        @click.self="closeVideoPreview"
      >
        <section class="video-preview__dialog">
          <header>
            <div>
              <span>{{ previewModel }}</span>
              <strong>{{ previewTitle }}</strong>
            </div>
            <button type="button" aria-label="关闭预览" @click="closeVideoPreview">
              <CloseOutlined />
            </button>
          </header>

          <div class="video-preview__stage" :class="`ratio-${previewRatio.replace(':', '-')}`">
            <video
              v-if="previewTask && previewResultUrl && previewIsVideo"
              :src="previewResultUrl"
              controls
              autoplay
              playsinline
            />
            <img
              v-else-if="previewTask && previewResultUrl"
              :src="previewResultUrl"
              :alt="previewPrompt"
            />
            <GalleryArtwork
              v-else-if="previewShowcase"
              :title="previewShowcase.title"
              :variant="previewShowcase.variant"
            />
          </div>

          <footer>
            <div class="video-preview__meta">
              <span>{{ previewRatio }}</span>
              <span>{{ previewDuration }}</span>
              <span>{{ previewModel }}</span>
            </div>
            <p>{{ previewPrompt }}</p>
            <div class="video-preview__actions">
              <button type="button" @click="copyPrompt(previewPrompt)">
                <CopyOutlined />
                复制提示词
              </button>
              <button type="button" @click="reusePreview">
                <ReloadOutlined />
                用于创作
              </button>
            </div>
          </footer>
        </section>
      </div>
      <div v-if="notice" class="video-notice" role="status">{{ notice }}</div>
    </Teleport>
  </section>
</template>

<style scoped>
.video-studio {
  min-height: 100vh;
  overflow: hidden;
  padding: 0 0 28px;
  background: radial-gradient(circle at 72% -10%, rgb(100 75 240 / 9%), transparent 360px), #08080a;
  color: #f2f2f5;
}

.video-toolbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 28px;
  margin: 0;
  padding: 0 22px;
  border-bottom: 1px solid #202127;
  background: rgb(9 9 12 / 96%);
  backdrop-filter: blur(18px);
}

.video-toolbar__brand,
.video-toolbar__status,
.video-toolbar__nav {
  display: flex;
  align-items: center;
}

.video-toolbar__brand {
  flex: 0 0 auto;
  gap: 9px;
  color: #f1f1f4;
}

.video-toolbar__mark {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(145deg, #6454ef, #9d5df1);
  color: #fff;
  font-size: 14px;
  box-shadow: 0 8px 24px rgb(104 76 230 / 28%);
}

.video-toolbar__brand strong {
  font-size: 13px;
  font-weight: 780;
}

.video-toolbar__nav {
  min-width: 0;
  gap: 4px;
}

.video-toolbar__nav a {
  display: inline-flex;
  height: 34px;
  align-items: center;
  padding: 0 12px;
  border-radius: 7px;
  color: #8f8f99;
  font-size: 10px;
  font-weight: 700;
  text-decoration: none;
}

.video-toolbar__nav a:hover {
  background: #17171b;
  color: #fff;
}

.video-toolbar__nav a.active {
  background: #202027;
  color: #b69cff;
}

.video-toolbar__status {
  gap: 12px;
  margin-left: auto;
  color: #85858f;
  font-size: 9px;
}

.video-toolbar__status > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.video-toolbar__status a {
  display: inline-flex;
  height: 29px;
  align-items: center;
  padding: 0 10px;
  border: 1px solid #302c4d;
  border-radius: 6px;
  color: #c7b7ff;
  text-decoration: none;
}

.video-workbench {
  display: grid;
  min-height: calc(100vh - 58px);
  grid-template-columns: 78px 322px minmax(0, 1fr);
}

.video-model-rail {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  padding: 17px 8px;
  border-right: 1px solid #1d1e23;
  background: #0b0b0e;
}

.video-model-rail__label {
  padding: 0 6px 9px;
  color: #64646d;
  font-size: 8px;
  font-weight: 760;
  letter-spacing: 0.08em;
}

.video-model-rail button {
  position: relative;
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 4px;
  padding: 7px 2px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #767680;
  cursor: pointer;
}

.video-model-rail button:hover,
.video-model-rail button.active {
  background: #17171c;
  color: #e7e7eb;
}

.video-model-rail button i {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--model-accent) 18%, #15151a);
  color: var(--model-accent);
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
}

.video-model-rail button span {
  width: 100%;
  overflow: hidden;
  font-size: 7px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-model-rail button small {
  position: absolute;
  top: 3px;
  right: 2px;
  padding: 1px 3px;
  border-radius: 3px;
  background: #7a66f4;
  color: #fff;
  font-size: 5px;
  line-height: 1.3;
}

.video-model-rail__footer {
  display: grid;
  justify-items: center;
  gap: 5px;
  margin-top: auto;
  padding: 11px 2px 4px;
  border-top: 1px solid #1e1f25;
  color: #74747d;
  font-size: 7px;
}

.video-control-panel {
  display: grid;
  align-content: start;
  min-width: 0;
  padding: 17px 15px 0;
  border-right: 1px solid #1d1e23;
  background: #0d0d10;
}

.video-control-panel__model {
  padding: 12px;
  border: 1px solid #26262d;
  border-radius: 9px;
  background: linear-gradient(145deg, #19191e, #121216);
}

.video-control-panel__model > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.video-control-panel__model i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--model-accent) 17%, #17171b);
  color: var(--model-accent);
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
}

.video-control-panel__model > div > span {
  display: grid;
  gap: 2px;
}

.video-control-panel__model strong {
  font-size: 11px;
}

.video-control-panel__model small {
  color: #777780;
  font-size: 7px;
}

.video-control-panel__model p {
  margin: 9px 0 0;
  color: #8a8a94;
  font-size: 8px;
  line-height: 1.6;
}

.video-section {
  display: grid;
  gap: 9px;
  padding: 15px 0;
  border-bottom: 1px solid #1d1e23;
}

.video-section > header,
.video-prompt > strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #d8d8dd;
  font-size: 9px;
}

.video-section > header span {
  color: #6f6f79;
  font-size: 7px;
  font-weight: 500;
}

.video-mode-grid {
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.video-mode-grid button {
  display: grid;
  min-width: 0;
  min-height: 52px;
  place-items: center;
  align-content: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid #27272e;
  border-radius: 7px;
  background: #121216;
  color: #777780;
  cursor: pointer;
}

.video-mode-grid button:hover,
.video-mode-grid button.active {
  border-color: #6d5be0;
  background: #1b1930;
  color: #bdaaff;
}

.video-mode-grid button:disabled {
  border-color: #24242a;
  background: #101014;
  color: #5d5d66;
  cursor: not-allowed;
  opacity: 0.72;
}

.video-mode-grid button:disabled small {
  color: #a183e9;
}

.video-mode-grid button > :deep(svg:first-child) {
  font-size: 13px;
}

.video-mode-grid button > :deep(svg:last-child) {
  position: absolute;
  opacity: 0;
}

.video-mode-grid button > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.video-mode-grid strong {
  font-size: 7px;
}

.video-mode-grid small {
  overflow: hidden;
  max-width: 100%;
  color: #70707a;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-source-grid {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.video-source-frame,
.video-source-empty {
  position: relative;
  width: 100%;
  min-height: 96px;
  overflow: hidden;
  border: 1px dashed #373742;
  border-radius: 8px;
  background: #131317;
}

.video-source-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-source-frame span {
  position: absolute;
  bottom: 6px;
  left: 6px;
  padding: 3px 5px;
  border-radius: 4px;
  background: rgb(0 0 0 / 65%);
  color: #fff;
  font-size: 6px;
}

.video-source-frame button {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: rgb(0 0 0 / 66%);
  color: #fff;
  cursor: pointer;
}

.video-source-empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  color: #8c8c96;
  cursor: pointer;
}

.video-source-empty :deep(svg) {
  color: #8d7bea;
  font-size: 16px;
}

.video-source-empty strong {
  font-size: 8px;
}

.video-source-empty small {
  color: #64646e;
  font-size: 6px;
}

.video-prompt {
  display: grid;
  gap: 8px;
  padding: 15px 0 9px;
}

.video-prompt > span {
  position: relative;
  display: block;
}

.video-prompt textarea {
  display: block;
  width: 100%;
  min-height: 96px;
  padding: 10px 10px 23px;
  border: 1px solid #2a2a31;
  border-radius: 7px;
  outline: 0;
  background: #121216;
  color: #e7e7eb;
  font-size: 9px;
  line-height: 1.7;
  resize: vertical;
}

.video-prompt textarea:focus {
  border-color: #705de8;
  box-shadow: 0 0 0 3px rgb(112 93 232 / 12%);
}

.video-prompt textarea::placeholder {
  color: #61616b;
}

.video-prompt small {
  position: absolute;
  right: 9px;
  bottom: 7px;
  color: #6f6f79;
  font-size: 7px;
}

.video-presets {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 11px;
  scrollbar-width: none;
}

.video-presets::-webkit-scrollbar {
  display: none;
}

.video-presets button {
  min-width: max-content;
  height: 25px;
  padding: 0 8px;
  border: 1px solid #292930;
  border-radius: 999px;
  background: #131317;
  color: #85858f;
  font-size: 7px;
  cursor: pointer;
}

.video-presets button:hover {
  border-color: #6558cf;
  color: #c5b9ff;
}

.video-enhancements {
  display: grid;
  gap: 1px;
  overflow: hidden;
  margin: 2px 0 13px;
  border: 1px solid #24242b;
  border-radius: 8px;
  background: #18181d;
}

.video-enhancements > div {
  display: flex;
  min-width: 0;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 9px;
  background: #111115;
}

.video-enhancements > div > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.video-enhancements strong {
  color: #d9d9df;
  font-size: 8px;
}

.video-enhancements small {
  overflow: hidden;
  color: #666670;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-enhancements em {
  flex: 0 0 auto;
  padding: 2px 5px;
  border: 1px solid #383044;
  border-radius: 999px;
  color: #9c83e5;
  font-size: 6px;
  font-style: normal;
}

.video-enhancements > div:last-child em {
  border-color: #28483c;
  color: #70c9a0;
}

.video-section--options {
  gap: 10px;
}

.video-option-row {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: 38px minmax(0, 1fr);
}

.video-option-row > span {
  color: #777780;
  font-size: 7px;
}

.video-option-row > div {
  display: flex;
  gap: 5px;
}

.video-option-row button {
  min-width: 0;
  height: 27px;
  flex: 1;
  padding: 0 6px;
  border: 1px solid #292930;
  border-radius: 6px;
  background: #121216;
  color: #7f7f89;
  font-size: 7px;
  cursor: pointer;
}

.video-option-row button.active {
  border-color: #6d5be0;
  background: #1a1830;
  color: #c6b7ff;
  font-weight: 750;
}

.video-submit {
  position: sticky;
  bottom: 0;
  display: grid;
  gap: 7px;
  margin: 15px -15px 0;
  padding: 14px 15px 16px;
  border-top: 1px solid #25252c;
  background: rgb(12 12 15 / 97%);
  backdrop-filter: blur(12px);
}

.video-submit > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #e8b34e;
  font-size: 8px;
}

.video-submit > button {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(90deg, #705cf1, #9665f3);
  color: #fff;
  font-size: 10px;
  font-weight: 780;
  cursor: pointer;
  box-shadow: 0 12px 28px rgb(106 81 230 / 24%);
}

.video-submit > button:disabled {
  background: #292930;
  box-shadow: none;
  color: #6d6d77;
  cursor: not-allowed;
}

.video-submit > small {
  color: #70707a;
  font-size: 7px;
  text-align: right;
}

.video-submit > small[role='alert'] {
  color: #f18e86;
}

.video-gallery {
  min-width: 0;
  padding: 18px 22px 40px;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 1.7%) 1px, transparent 1px),
    linear-gradient(rgb(255 255 255 / 1.7%) 1px, transparent 1px), #08080a;
  background-size: 28px 28px;
}

.video-gallery__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 15px;
}

.video-gallery__tabs {
  display: flex;
  align-items: center;
  gap: 14px;
}

.video-gallery__tabs button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: #75757f;
  font-size: 10px;
  font-weight: 730;
  cursor: pointer;
}

.video-gallery__tabs button.active {
  border-color: #a78aff;
  color: #f3f3f5;
}

.video-gallery__tabs button span {
  padding: 1px 5px;
  border-radius: 999px;
  background: #23232a;
  color: #8d8d97;
  font-size: 6px;
}

.video-gallery__header p {
  margin: 0;
  color: #72727c;
  font-size: 8px;
}

.video-gallery__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.video-gallery__meta > button {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #292930;
  border-radius: 7px;
  background: #121216;
  color: #8e8e99;
  cursor: pointer;
}

.video-gallery__meta > button:hover:not(:disabled) {
  border-color: #6657d2;
  color: #cbbdff;
}

.video-gallery__meta > button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.video-gallery__meta > button :deep(svg) {
  font-size: 12px;
}

.video-showcase-grid {
  display: grid;
  gap: 13px;
  grid-template-columns: repeat(auto-fill, minmax(218px, 1fr));
}

.video-showcase-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #25252c;
  border-radius: 8px;
  background: #111115;
  transition:
    border-color 140ms ease,
    transform 140ms ease;
}

.video-showcase-card:hover {
  border-color: #48415f;
  transform: translateY(-2px);
}

.video-showcase-card__visual {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #1b1b21;
}

.video-showcase-card__visual.ratio-9-16 {
  aspect-ratio: 9 / 13;
}

.video-showcase-card__visual.ratio-1-1 {
  aspect-ratio: 1 / 1;
}

.video-showcase-card__visual > :deep(svg),
.video-showcase-card__visual > img,
.video-showcase-card__visual > video {
  width: 100%;
  height: 100%;
  background: #0b0b0e;
  object-fit: cover;
}

.video-showcase-card__model,
.video-showcase-card__duration {
  position: absolute;
  z-index: 2;
  padding: 3px 6px;
  border-radius: 5px;
  background: rgb(10 10 13 / 76%);
  color: #e6e6eb;
  font-size: 7px;
  backdrop-filter: blur(8px);
}

.video-showcase-card__model {
  top: 7px;
  left: 7px;
}

.video-showcase-card__duration {
  bottom: 7px;
  left: 7px;
}

.video-showcase-card__visual[data-result-kind='video'] .video-showcase-card__duration {
  top: 7px;
  right: 7px;
  bottom: auto;
  left: auto;
}

.video-showcase-card__visual > button {
  position: absolute;
  right: 7px;
  bottom: 7px;
  z-index: 2;
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: rgb(10 10 13 / 68%);
  color: #e7e7eb;
  cursor: pointer;
}

.video-showcase-card__play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 44%);
  border-radius: 999px;
  background: rgb(10 10 13 / 42%);
  color: #fff;
  font-size: 18px;
  transform: translate(-50%, -50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease;
  backdrop-filter: blur(8px);
}

.video-showcase-card:hover .video-showcase-card__play {
  opacity: 1;
}

.video-showcase-card__visual[data-result-kind='video'] .video-showcase-card__play {
  display: none;
}

.video-task-loading {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 7px;
  background: linear-gradient(145deg, #5241bb, #874fd1);
  color: #fff;
}

.video-task-loading > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 999px;
}

.video-task-loading > span :deep(svg) {
  animation: video-spin 1s linear infinite;
}

.video-task-loading strong {
  font-size: 8px;
}

.video-task-loading > i {
  display: block;
  width: 56%;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 22%);
}

.video-task-loading > i span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #fff;
  transition: width 400ms ease;
}

@keyframes video-spin {
  to {
    transform: rotate(360deg);
  }
}

.video-showcase-card > footer {
  display: flex;
  min-height: 55px;
  align-items: center;
  gap: 8px;
  padding: 8px;
}

.video-showcase-card > footer p {
  display: -webkit-box;
  overflow: hidden;
  flex: 1;
  margin: 0;
  color: #aaaab3;
  font-size: 7px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.video-showcase-card > footer > button,
.video-task-actions button {
  display: inline-flex;
  height: 26px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 7px;
  border: 1px solid #2b2b33;
  border-radius: 6px;
  background: #17171c;
  color: #92929d;
  font-size: 7px;
  cursor: pointer;
}

.video-showcase-card > footer > button:hover,
.video-task-actions button:hover {
  border-color: #6657d2;
  color: #d2c7ff;
}

.video-task-actions {
  display: flex;
  gap: 4px;
}

.video-task-actions button {
  width: 25px;
  padding: 0;
}

.video-task-actions button.active {
  border-color: #8f6f28;
  color: #f1bc4d;
}

.video-empty {
  display: grid;
  min-height: 520px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed #292931;
  border-radius: 9px;
  background: rgb(18 18 22 / 72%);
  text-align: center;
}

.video-empty > span {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 15px;
  background: #211d3a;
  color: #a992ff;
  font-size: 22px;
}

.video-empty strong {
  color: #d9d9df;
  font-size: 12px;
}

.video-empty p {
  margin: 0;
  color: #74747e;
  font-size: 8px;
}

.video-empty button {
  height: 30px;
  margin-top: 5px;
  padding: 0 11px;
  border: 1px solid #4f438e;
  border-radius: 7px;
  background: #1b1830;
  color: #c4b6ff;
  font-size: 8px;
  cursor: pointer;
}

.video-preview {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  overflow: auto;
  box-sizing: border-box;
  place-items: center;
  padding: 20px;
  background: rgb(3 3 6 / 84%);
  backdrop-filter: blur(16px);
}

.video-preview__dialog {
  width: min(1060px, 100%);
  max-height: calc(100dvh - 40px);
  min-width: 0;
  overflow: auto;
  border: 1px solid #30303a;
  border-radius: 10px;
  background: #0e0e12;
  box-shadow: 0 28px 90px rgb(0 0 0 / 58%);
}

.video-preview__dialog > header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 15px;
  border-bottom: 1px solid #24242b;
  background: #121216;
}

.video-preview__dialog > header > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.video-preview__dialog > header span {
  color: #8f7bea;
  font-size: 7px;
  font-weight: 760;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.video-preview__dialog > header strong {
  overflow: hidden;
  color: #ededf1;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-preview__dialog > header button {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #303038;
  border-radius: 7px;
  background: #18181e;
  color: #a7a7b0;
  cursor: pointer;
}

.video-preview__dialog > header button:hover {
  border-color: #6657d2;
  color: #fff;
}

.video-preview__stage {
  position: relative;
  display: grid;
  width: min(100%, 1020px);
  max-height: min(66vh, 640px);
  aspect-ratio: 16 / 9;
  margin: 0 auto;
  overflow: hidden;
  place-items: center;
  background: radial-gradient(circle at 50% 30%, rgb(122 98 236 / 18%), transparent 45%), #07070a;
}

.video-preview__stage.ratio-9-16 {
  width: auto;
  height: min(66vh, 640px);
  max-width: 100%;
  aspect-ratio: 9 / 16;
}

.video-preview__stage.ratio-1-1 {
  width: auto;
  height: min(66vh, 620px);
  max-width: 100%;
  aspect-ratio: 1 / 1;
}

.video-preview__stage > :deep(svg),
.video-preview__stage > img,
.video-preview__stage > video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-preview__stage > video {
  background: #000;
}

.video-preview__dialog > footer {
  display: grid;
  min-width: 0;
  gap: 11px;
  padding: 14px 15px 15px;
  border-top: 1px solid #24242b;
  background: #111115;
}

.video-preview__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.video-preview__meta span {
  padding: 4px 7px;
  border: 1px solid #2c2c34;
  border-radius: 5px;
  background: #18181e;
  color: #aaaab4;
  font-size: 7px;
}

.video-preview__dialog > footer > p {
  margin: 0;
  overflow-wrap: anywhere;
  color: #c8c8d0;
  font-size: 9px;
  line-height: 1.75;
}

.video-preview__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.video-preview__actions button {
  display: inline-flex;
  min-height: 31px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #34343d;
  border-radius: 7px;
  background: #19191f;
  color: #c2c2ca;
  font-size: 8px;
  cursor: pointer;
}

.video-preview__actions button:last-child {
  border-color: #6656cf;
  background: linear-gradient(90deg, #604ddb, #8158e3);
  color: #fff;
}

.video-preview__actions button:hover {
  border-color: #8372e8;
  color: #fff;
}

.video-notice {
  position: fixed;
  bottom: max(24px, calc(env(safe-area-inset-bottom) + 24px));
  left: 50%;
  z-index: 10001;
  max-width: calc(100vw - 36px);
  padding: 9px 13px;
  border: 1px solid #454052;
  border-radius: 7px;
  background: rgb(24 24 30 / 96%);
  color: #ececf1;
  font-size: 9px;
  line-height: 1.5;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 14px 38px rgb(0 0 0 / 38%);
  pointer-events: none;
}

@media (max-width: 1180px) {
  .video-workbench {
    grid-template-columns: 72px 294px minmax(0, 1fr);
  }

  .video-showcase-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 900px) {
  .video-toolbar {
    flex-wrap: wrap;
    gap: 8px 16px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .video-toolbar__nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }

  .video-toolbar__nav a {
    flex: 0 0 auto;
  }

  .video-workbench {
    grid-template-columns: 70px minmax(0, 1fr);
  }

  .video-model-rail {
    grid-row: 1 / span 2;
  }

  .video-control-panel {
    border-right: 0;
    border-bottom: 1px solid #1d1e23;
  }

  .video-gallery {
    grid-column: 2;
  }
}

@media (max-width: 680px) {
  .video-studio {
    padding-right: 10px;
    padding-left: 10px;
  }

  .video-toolbar {
    margin-right: -10px;
    margin-left: -10px;
    padding-right: 12px;
    padding-left: 12px;
  }

  .video-toolbar__brand strong,
  .video-toolbar__status > span {
    display: none;
  }

  .video-toolbar__status {
    margin-left: auto;
  }

  .video-workbench {
    display: flex;
    flex-direction: column;
  }

  .video-model-rail {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    overflow-x: auto;
    padding: 8px 5px;
    border-right: 0;
    border-bottom: 1px solid #1d1e23;
    scrollbar-width: none;
  }

  .video-model-rail::-webkit-scrollbar {
    display: none;
  }

  .video-model-rail__label,
  .video-model-rail__footer {
    display: none;
  }

  .video-model-rail button {
    min-width: 59px;
    padding: 5px 4px;
  }

  .video-control-panel {
    padding-top: 12px;
    border-bottom: 0;
  }

  .video-gallery {
    padding: 15px 5px 34px;
  }

  .video-gallery__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }

  .video-gallery__meta {
    width: 100%;
    justify-content: space-between;
  }

  .video-gallery__meta > button {
    width: 31px;
    height: 31px;
  }

  .video-showcase-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .video-showcase-card > footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .video-showcase-card > footer > button {
    width: 100%;
  }

  .video-task-actions {
    width: 100%;
  }

  .video-task-actions button {
    flex: 1;
  }

  .video-preview {
    align-items: start;
    padding: 10px;
  }

  .video-preview__dialog {
    max-height: calc(100dvh - 20px);
  }

  .video-preview__dialog > header {
    padding: 11px 12px;
  }

  .video-preview__stage {
    width: 100%;
    max-height: 54vh;
  }

  .video-preview__stage.ratio-9-16 {
    width: auto;
    height: min(54vh, 560px);
  }

  .video-preview__stage.ratio-1-1 {
    width: auto;
    height: min(54vh, 540px);
  }

  .video-preview__dialog > footer {
    padding: 12px;
  }

  .video-preview__actions button {
    min-width: 0;
    flex: 1;
  }

  .video-notice {
    bottom: max(82px, calc(env(safe-area-inset-bottom) + 82px));
  }
}

@media (max-width: 400px) {
  .video-showcase-grid {
    grid-template-columns: 1fr;
  }

  .video-mode-grid {
    grid-template-columns: 1fr;
  }

  .video-mode-grid button {
    grid-template-columns: auto 1fr auto;
    justify-items: start;
    padding: 0 10px;
  }

  .video-mode-grid button > :deep(svg:last-child) {
    position: static;
    opacity: 1;
  }
}
</style>
