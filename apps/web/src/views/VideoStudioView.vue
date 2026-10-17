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

const modes: { description: string; label: string; value: VideoMode }[] = [
  { description: '用文字描述镜头', label: '文生视频', value: 'text-to-video' },
  { description: '上传图片生成视频', label: '图生视频', value: 'image-to-video' },
  { description: '控制首尾画面', label: '首尾帧', value: 'first-last-frame' },
];

const models: VideoModel[] = [
  {
    accent: '#7c72ff',
    badge: '推荐',
    description: '新一代多模态视频模型，适合电影感镜头与商业内容。',
    label: '极光影像 3.0',
    short: '极',
    value: 'aurora-video-3',
  },
  {
    accent: '#e5689a',
    badge: '新',
    description: '节奏自然，适合人物、产品和短视频叙事。',
    label: '光影电影 2.4',
    short: '光',
    value: 'cinema-motion-2',
  },
  {
    accent: '#21a77c',
    description: '稳定构图与商业场景表现，适合电商和广告。',
    label: '商业镜头 2.1',
    short: '商',
    value: 'commerce-shot-2',
  },
];

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
const durations = [5, 10, 15];
const resolutions = ['720P', '1080P'];
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
const mode = ref<VideoMode>('text-to-video');
const selectedModel = ref(models[0]?.value ?? 'aurora-video-3');
const selectedRatio = ref('16:9');
const selectedDuration = ref(5);
const selectedResolution = ref('1080P');
const prompt = ref('');
const sourceFrames = ref<SourceFrame[]>([]);
const sourceInput = ref<HTMLInputElement | null>(null);
const formError = ref('');
const consumedRouteContext = ref('');
const uploadingSource = ref(false);

const activeModel = computed(
  () => models.find((model) => model.value === selectedModel.value) ?? models[0],
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
  mode.value = nextMode;
  formError.value = '';

  if (nextMode !== 'first-last-frame' && sourceFrames.value.length > 1) {
    const [firstFrame] = sourceFrames.value;
    sourceFrames.value.slice(1).forEach((frame) => URL.revokeObjectURL(frame.url));
    sourceFrames.value = firstFrame ? [firstFrame] : [];
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
  if (isVideoMode(task.mode)) {
    changeMode(task.mode);
  }

  prompt.value = task.prompt;
  selectedModel.value = task.model;
  selectedRatio.value = task.ratio;
  selectedDuration.value = task.duration;
  selectedResolution.value = task.resolution;
  window.scrollTo({ behavior: 'smooth', top: 0 });
}

function reuseShowcase(item: ShowcaseItem): void {
  prompt.value = item.prompt;
  selectedRatio.value = item.ratio;
  selectedDuration.value = item.duration;
  const model =
    models.find((entry) => entry.label.includes(item.model) || entry.value.includes(item.model)) ??
    models[item.variant % models.length];

  if (model) {
    selectedModel.value = model.value;
  }

  activeGalleryTab.value = 'mine';
  window.scrollTo({ behavior: 'smooth', top: 0 });
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
  void videoWorkspace.initialize();
  void consumeRouteContext();
});

watch(
  () => [route.query.mode, route.query.prompt, route.query.sourceWork],
  () => {
    void consumeRouteContext();
  },
);

onBeforeUnmount(() => {
  removeAllSourceFrames();
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
        <RouterLink to="/chat" target="_blank" rel="noopener noreferrer">超级对话</RouterLink>
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
          @click="selectedModel = model.value"
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
              v-for="item in modes"
              :key="item.value"
              type="button"
              :class="{ active: mode === item.value }"
              @click="changeMode(item.value)"
            >
              <PlayCircleOutlined />
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
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
              <small>JPG、PNG、WebP</small>
            </button>
          </div>
        </section>

        <label class="video-prompt">
          <strong>镜头描述</strong>
          <span>
            <textarea
              v-model="prompt"
              maxlength="800"
              placeholder="描述主体、动作、镜头运动、光线和氛围"
            />
            <small>{{ prompt.length }} / 800</small>
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
                v-for="duration in durations"
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
                v-for="resolution in resolutions"
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
          <p>注意：上传的素材和生成作品只保留 1 个月，请及时备份。</p>
        </header>

        <div v-if="activeGalleryTab === 'discover'" class="video-showcase-grid">
          <article v-for="item in showcaseItems" :key="item.title" class="video-showcase-card">
            <div
              class="video-showcase-card__visual"
              :class="`ratio-${item.ratio.replace(':', '-')}`"
            >
              <GalleryArtwork :title="item.title" :variant="item.variant" />
              <span class="video-showcase-card__model">{{ item.model }}</span>
              <span class="video-showcase-card__duration">00:0{{ item.duration }}</span>
              <button type="button" aria-label="放大预览">
                <ExpandOutlined />
              </button>
              <div class="video-showcase-card__play">
                <PlayCircleOutlined />
              </div>
            </div>
            <footer>
              <p>{{ item.prompt }}</p>
              <button type="button" @click="reuseShowcase(item)">
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
  </section>
</template>

<style scoped>
.video-studio {
  min-height: calc(100vh - 56px);
  overflow: hidden;
  padding: 0 18px 28px;
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
  margin: 0 -18px;
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
  min-height: calc(100vh - 114px);
  grid-template-columns: 78px 310px minmax(0, 1fr);
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

.video-showcase-grid {
  display: grid;
  gap: 13px;
  grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
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

@media (max-width: 1180px) {
  .video-workbench {
    grid-template-columns: 72px 285px minmax(0, 1fr);
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
