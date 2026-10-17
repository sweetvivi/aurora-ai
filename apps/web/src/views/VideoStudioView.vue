<script setup lang="ts">
import {
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SoundOutlined,
  StarOutlined,
  ThunderboltFilled,
  UploadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import GalleryArtwork from '@/components/GalleryArtwork.vue';

type VideoMode = 'first-last-frame' | 'image-to-video' | 'text-to-video';
type VideoTaskStatus = 'cancelled' | 'done' | 'failed' | 'generating' | 'queued';

interface VideoModel {
  accent: string;
  badge?: string;
  description: string;
  label: string;
  value: string;
}

interface VideoTask {
  createdAt: number;
  duration: number;
  favorite: boolean;
  id: string;
  mode: VideoMode;
  model: string;
  modelLabel: string;
  progress: number;
  prompt: string;
  ratio: string;
  resolution: string;
  status: VideoTaskStatus;
  variant: number;
}

interface SourceFrame {
  name: string;
  url: string;
}

const STORAGE_KEY = 'aurora-video-tasks-v1';

const modes: { label: string; value: VideoMode }[] = [
  { label: '文生视频', value: 'text-to-video' },
  { label: '图生视频', value: 'image-to-video' },
  { label: '首尾帧', value: 'first-last-frame' },
];

const models: VideoModel[] = [
  {
    accent: '#526fe8',
    badge: '推荐',
    description: '画面稳定，适合广告和人物镜头',
    label: '极光影像 3.0',
    value: 'aurora-video-3',
  },
  {
    accent: '#8a62d6',
    description: '电影感镜头与自然运动',
    label: '光影电影 2.4',
    value: 'cinema-motion-2',
  },
  {
    accent: '#218b79',
    description: '产品展示与商业场景',
    label: '商业镜头 2.1',
    value: 'commerce-shot-2',
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

const mode = ref<VideoMode>('text-to-video');
const selectedModel = ref(models[0]?.value ?? 'aurora-video-3');
const selectedRatio = ref('16:9');
const selectedDuration = ref(5);
const selectedResolution = ref('1080P');
const prompt = ref('');
const sourceFrames = ref<SourceFrame[]>([]);
const sourceInput = ref<HTMLInputElement | null>(null);
const tasks = ref<VideoTask[]>([]);
const formError = ref('');
let progressTimer: number | undefined;

const activeModel = computed(
  () => models.find((model) => model.value === selectedModel.value) ?? models[0],
);
const sortedTasks = computed(() =>
  [...tasks.value].sort((left, right) => right.createdAt - left.createdAt),
);
const activeTasks = computed(() =>
  tasks.value.filter((task) => task.status === 'queued' || task.status === 'generating'),
);
const needsSource = computed(() => mode.value !== 'text-to-video');
const requiredFrameCount = computed(() => (mode.value === 'first-last-frame' ? 2 : 1));
const canSubmit = computed(() => {
  if (activeTasks.value.length > 0) {
    return false;
  }

  if (!prompt.value.trim()) {
    return false;
  }

  return !needsSource.value || sourceFrames.value.length === requiredFrameCount.value;
});
const hasSource = computed(() => sourceFrames.value.length > 0);
const sourceReplacementIndex = computed(() => sourceFrames.value.length);

function loadStoredTasks(): void {
  try {
    const rawTasks = window.localStorage.getItem(STORAGE_KEY);

    if (!rawTasks) {
      return;
    }

    const parsedTasks = JSON.parse(rawTasks) as VideoTask[];

    tasks.value = Array.isArray(parsedTasks)
      ? parsedTasks.map((task) => ({
          ...task,
          progress: task.status === 'done' ? 100 : Math.min(task.progress ?? 0, 96),
          status:
            task.status === 'queued' || task.status === 'generating' ? 'generating' : task.status,
        }))
      : [];
  } catch {
    tasks.value = [];
  }
}

function persistTasks(): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value));
}

function beginProgress(taskId: string): void {
  if (progressTimer === undefined) {
    progressTimer = window.setInterval(advanceTasks, 650);
  }

  const task = tasks.value.find((item) => item.id === taskId);

  if (task) {
    task.status = 'generating';
    task.progress = Math.max(task.progress, 4);
    persistTasks();
  }
}

function advanceTasks(): void {
  let hasActiveTask = false;

  for (const task of tasks.value) {
    if (task.status !== 'queued' && task.status !== 'generating') {
      continue;
    }

    hasActiveTask = true;
    task.status = 'generating';
    task.progress = Math.min(100, task.progress + 4 + Math.floor(Math.random() * 9));

    if (task.progress >= 100) {
      task.progress = 100;
      task.status = 'done';
    }
  }

  persistTasks();

  if (!hasActiveTask || activeTasks.value.length === 0) {
    clearProgressTimer();
  }
}

function clearProgressTimer(): void {
  if (progressTimer !== undefined) {
    window.clearInterval(progressTimer);
    progressTimer = undefined;
  }
}

function handleSourceUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  if (files.length === 0) {
    return;
  }

  const availableSlots = Math.max(0, requiredFrameCount.value - sourceFrames.value.length);
  const nextFrames = files.slice(0, availableSlots).map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  }));

  sourceFrames.value = [...sourceFrames.value, ...nextFrames];
  formError.value = '';
  input.value = '';
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

function changeMode(nextMode: VideoMode): void {
  mode.value = nextMode;
  formError.value = '';

  if (nextMode !== 'first-last-frame' && sourceFrames.value.length > 1) {
    const [firstFrame] = sourceFrames.value;
    sourceFrames.value.slice(1).forEach((frame) => URL.revokeObjectURL(frame.url));
    sourceFrames.value = firstFrame ? [firstFrame] : [];
  }
}

function submitTask(): void {
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

  const task: VideoTask = {
    createdAt: Date.now(),
    duration: selectedDuration.value,
    favorite: false,
    id: createTaskId(),
    mode: mode.value,
    model: selectedModel.value,
    modelLabel: activeModel.value?.label ?? '视频模型',
    progress: 2,
    prompt: prompt.value.trim(),
    ratio: selectedRatio.value,
    resolution: selectedResolution.value,
    status: 'queued',
    variant: variantFromId(createTaskId()),
  };

  tasks.value = [task, ...tasks.value];
  persistTasks();
  prompt.value = '';
  beginProgress(task.id);
}

function retryTask(taskId: string): void {
  const task = tasks.value.find((item) => item.id === taskId);

  if (!task || activeTasks.value.length > 0) {
    return;
  }

  task.createdAt = Date.now();
  task.progress = 2;
  task.status = 'queued';
  persistTasks();
  beginProgress(task.id);
}

function cancelTask(taskId: string): void {
  const task = tasks.value.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.status = 'cancelled';
  task.progress = Math.min(task.progress, 96);
  persistTasks();

  if (activeTasks.value.length === 0) {
    clearProgressTimer();
  }
}

function removeTask(taskId: string): void {
  tasks.value = tasks.value.filter((task) => task.id !== taskId);
  persistTasks();
}

function toggleFavorite(taskId: string): void {
  const task = tasks.value.find((item) => item.id === taskId);

  if (task) {
    task.favorite = !task.favorite;
    persistTasks();
  }
}

function reuseTask(task: VideoTask): void {
  changeMode(task.mode);
  prompt.value = task.prompt;
  selectedModel.value = task.model;
  selectedRatio.value = task.ratio;
  selectedDuration.value = task.duration;
  selectedResolution.value = task.resolution;
  window.scrollTo({ behavior: 'smooth', top: 0 });
}

function downloadStoryboard(task: VideoTask): void {
  const payload = [
    `镜头描述：${task.prompt}`,
    `模型：${task.modelLabel}`,
    `时长：${task.duration} 秒`,
    `比例：${task.ratio}`,
    `清晰度：${task.resolution}`,
  ].join('\n');
  const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = `aurora-video-${task.id}.txt`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function statusLabel(status: VideoTaskStatus): string {
  const labels: Record<VideoTaskStatus, string> = {
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

function createTaskId(): string {
  return `video-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function variantFromId(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % 8;
}

onMounted(() => {
  loadStoredTasks();

  if (activeTasks.value.length > 0) {
    progressTimer = window.setInterval(advanceTasks, 650);
  }
});

onBeforeUnmount(() => {
  clearProgressTimer();
  removeAllSourceFrames();
});
</script>

<template>
  <section class="video-studio">
    <header class="video-header">
      <div class="video-header__copy">
        <span>VIDEO STUDIO</span>
        <h1>视频生成</h1>
        <p>从文字或参考画面生成连贯镜头，支持横屏、竖屏和方形视频。</p>
      </div>
      <nav class="video-header__switch" aria-label="视频工具切换">
        <RouterLink to="/draw">AI 绘画</RouterLink>
        <RouterLink to="/image-generation">图片生成</RouterLink>
        <RouterLink class="active" to="/video">视频生成</RouterLink>
      </nav>
    </header>

    <div class="video-layout">
      <aside class="video-panel">
        <section class="video-section">
          <header>
            <strong>生成方式</strong>
            <span>选择一种镜头工作流</span>
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
              <span>{{ item.label }}</span>
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
              <PlusOutlined />
              <strong>{{ sourceFrames.length === 0 ? '上传参考画面' : '补充尾帧' }}</strong>
              <small>JPG、PNG、WebP</small>
            </button>
          </div>
          <p v-if="sourceReplacementIndex > 0" class="video-source-note">
            已准备 {{ sourceReplacementIndex }} 张画面
          </p>
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

        <section class="video-section">
          <header>
            <strong>视频模型</strong>
            <span>{{ models.length }} 个模型</span>
          </header>
          <div class="video-model-list">
            <button
              v-for="model in models"
              :key="model.value"
              type="button"
              :class="{ active: selectedModel === model.value }"
              @click="selectedModel = model.value"
            >
              <i :style="{ '--video-model-accent': model.accent }">
                <VideoCameraOutlined />
              </i>
              <span>
                <strong>{{ model.label }}</strong>
                <small>{{ model.description }}</small>
              </span>
              <em v-if="model.badge">{{ model.badge }}</em>
              <CheckOutlined v-if="selectedModel === model.value" />
            </button>
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
            预计 {{ selectedDuration * 2 }} 积分
          </span>
          <button type="button" :disabled="!canSubmit" @click="submitTask">
            <LoadingOutlined v-if="activeTasks.length > 0" />
            <VideoCameraOutlined v-else />
            {{ activeTasks.length > 0 ? '镜头生成中' : '生成视频' }}
          </button>
          <small v-if="formError" role="alert">{{ formError }}</small>
          <small v-else>输出为演示任务，不会调用上游视频模型</small>
        </div>
      </aside>

      <main class="video-results">
        <header class="video-results__header">
          <div>
            <strong>镜头记录</strong>
            <span>{{ sortedTasks.length }} 个任务</span>
          </div>
          <em v-if="activeTasks.length > 0">{{ activeTasks.length }} 个镜头处理中</em>
        </header>

        <div v-if="sortedTasks.length > 0" class="video-work-grid">
          <article
            v-for="task in sortedTasks"
            :key="task.id"
            class="video-work-card"
            :class="`video-work-card--${task.status}`"
          >
            <header>
              <span>{{ task.modelLabel }}</span>
              <small>{{ modeLabel(task.mode) }}</small>
              <em :class="task.status">{{ statusLabel(task.status) }}</em>
            </header>

            <div class="video-work-card__visual" :class="`ratio-${task.ratio.replace(':', '-')}`">
              <GalleryArtwork
                v-if="task.status === 'done'"
                :title="task.prompt"
                :variant="task.variant"
              />
              <div v-else-if="task.status === 'cancelled' || task.status === 'failed'">
                <CloseOutlined />
                <strong>{{ statusLabel(task.status) }}</strong>
              </div>
              <div v-else class="video-work-card__loading">
                <span class="video-work-card__loading-ring">
                  <LoadingOutlined />
                </span>
                <strong>{{ task.progress }}%</strong>
                <i>
                  <span :style="{ width: `${task.progress}%` }" />
                </i>
              </div>
              <div v-if="task.status === 'done'" class="video-work-card__play">
                <PlayCircleOutlined />
              </div>
              <div v-if="task.status === 'done'" class="video-work-card__timeline">
                <span />
                <small>00:0{{ task.duration }}</small>
              </div>
            </div>

            <p>{{ task.prompt }}</p>
            <div class="video-work-card__meta">
              <span>{{ task.duration }}s</span>
              <span>{{ task.ratio }}</span>
              <span>{{ task.resolution }}</span>
            </div>

            <footer v-if="task.status === 'done'">
              <button
                type="button"
                :class="{ active: task.favorite }"
                @click="toggleFavorite(task.id)"
              >
                <StarOutlined />
                {{ task.favorite ? '已收藏' : '收藏' }}
              </button>
              <button type="button" @click="downloadStoryboard(task)">
                <DownloadOutlined />
                下载
              </button>
              <button type="button" @click="reuseTask(task)">
                <ReloadOutlined />
                再创作
              </button>
            </footer>

            <footer v-else-if="task.status === 'cancelled' || task.status === 'failed'">
              <button type="button" @click="retryTask(task.id)">
                <ReloadOutlined />
                重试
              </button>
              <button type="button" @click="removeTask(task.id)">
                <DeleteOutlined />
                删除
              </button>
            </footer>

            <footer v-else>
              <button type="button" @click="cancelTask(task.id)">
                <CloseOutlined />
                取消任务
              </button>
            </footer>
          </article>
        </div>

        <div v-else class="video-empty">
          <span>
            <VideoCameraOutlined />
          </span>
          <strong>还没有视频任务</strong>
          <p>选择生成方式并描述镜头，处理结果会显示在这里。</p>
          <div>
            <SoundOutlined />
            支持镜头节奏、画面运动和音效描述
          </div>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.video-studio {
  min-height: calc(100vh - 56px);
  padding: 28px 28px 56px;
  background:
    radial-gradient(circle at 14% -40px, rgb(80 103 232 / 9%), transparent 360px),
    linear-gradient(180deg, #f7f8fc 0, #fff 360px);
}

.video-header {
  display: flex;
  width: min(100%, 1320px);
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto 22px;
}

.video-header__copy {
  display: grid;
  gap: 5px;
}

.video-header__copy > span {
  color: #526fe8;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.13em;
}

.video-header h1 {
  margin: 0;
  color: #20272e;
  font-size: 27px;
}

.video-header p {
  margin: 0;
  color: #818b96;
  font-size: 10px;
}

.video-header__switch {
  display: flex;
  padding: 3px;
  border: 1px solid #e2e5ec;
  border-radius: 8px;
  background: rgb(255 255 255 / 84%);
}

.video-header__switch a {
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

.video-header__switch a.active {
  background: #20272e;
  color: #fff;
}

.video-layout {
  display: grid;
  width: min(100%, 1320px);
  align-items: start;
  gap: 16px;
  grid-template-columns: 390px minmax(0, 1fr);
  margin: 0 auto;
}

.video-panel,
.video-results {
  border: 1px solid #e1e5ec;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 34px rgb(33 45 75 / 6%);
}

.video-panel {
  position: sticky;
  top: 74px;
  display: grid;
  overflow: hidden;
}

.video-section {
  display: grid;
  gap: 10px;
  padding: 15px;
  border-bottom: 1px solid #edf0f4;
}

.video-section > header,
.video-prompt > strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #343c44;
  font-size: 10px;
}

.video-section > header span {
  color: #9aa2ab;
  font-size: 8px;
  font-weight: 500;
}

.video-mode-grid {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.video-mode-grid button {
  display: grid;
  min-width: 0;
  min-height: 58px;
  place-items: center;
  align-content: center;
  gap: 5px;
  border: 1px solid #e4e8ee;
  border-radius: 7px;
  background: #fff;
  color: #66717d;
  font-size: 8px;
  cursor: pointer;
}

.video-mode-grid button :deep(svg:first-child) {
  color: #7182d9;
  font-size: 15px;
}

.video-mode-grid button :deep(svg:last-child) {
  color: #526fe8;
  font-size: 7px;
}

.video-mode-grid button.active {
  border-color: #9eacef;
  background: #f1f3ff;
  color: #354fc2;
  font-weight: 760;
}

.video-source-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.video-source-frame,
.video-source-empty {
  position: relative;
  width: 100%;
  min-height: 116px;
  overflow: hidden;
  border: 1px dashed #cfd6e3;
  border-radius: 8px;
  background: #f8f9fc;
}

.video-source-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-source-frame span {
  position: absolute;
  bottom: 7px;
  left: 7px;
  padding: 3px 6px;
  border-radius: 5px;
  background: rgb(23 29 42 / 72%);
  color: #fff;
  font-size: 7px;
  font-weight: 750;
}

.video-source-frame button {
  position: absolute;
  top: 7px;
  right: 7px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: rgb(23 29 42 / 72%);
  color: #fff;
  cursor: pointer;
}

.video-source-empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: #687585;
  cursor: pointer;
}

.video-source-empty :deep(svg) {
  color: #5d70dc;
  font-size: 17px;
}

.video-source-empty strong {
  font-size: 9px;
}

.video-source-empty small {
  color: #99a2ae;
  font-size: 7px;
}

.video-source-note {
  margin: 0;
  color: #8490a0;
  font-size: 8px;
}

.video-prompt {
  display: grid;
  gap: 9px;
  padding: 15px 15px 10px;
}

.video-prompt > span {
  position: relative;
  display: block;
}

.video-prompt textarea {
  display: block;
  width: 100%;
  min-height: 108px;
  padding: 11px 11px 24px;
  border: 1px solid #dfe4ec;
  border-radius: 7px;
  outline: 0;
  color: #323a42;
  font-size: 10px;
  line-height: 1.7;
  resize: vertical;
}

.video-prompt textarea:focus {
  border-color: #91a0ea;
  box-shadow: 0 0 0 3px rgb(82 111 232 / 8%);
}

.video-prompt textarea::placeholder {
  color: #a7afb9;
}

.video-prompt small {
  position: absolute;
  right: 9px;
  bottom: 7px;
  color: #abb2bc;
  font-size: 7px;
}

.video-presets {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 15px 14px;
  scrollbar-width: none;
}

.video-presets::-webkit-scrollbar {
  display: none;
}

.video-presets button {
  min-width: max-content;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #e5e8ee;
  border-radius: 999px;
  background: #fff;
  color: #707a88;
  font-size: 7px;
  cursor: pointer;
}

.video-presets button:hover {
  border-color: #aeb8ec;
  color: #5265cc;
}

.video-model-list {
  display: grid;
  gap: 7px;
}

.video-model-list button {
  display: grid;
  min-width: 0;
  min-height: 54px;
  align-items: center;
  gap: 9px;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  padding: 8px;
  border: 1px solid #e5e8ee;
  border-radius: 7px;
  background: #fff;
  color: #46505a;
  text-align: left;
  cursor: pointer;
}

.video-model-list button.active {
  border-color: #9eacef;
  background: #f3f5ff;
}

.video-model-list i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--video-model-accent) 11%, white);
  color: var(--video-model-accent);
}

.video-model-list button > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.video-model-list strong {
  overflow: hidden;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-model-list small {
  overflow: hidden;
  color: #929aa6;
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-model-list em {
  padding: 2px 5px;
  border-radius: 4px;
  background: #edf0ff;
  color: #5265cc;
  font-size: 7px;
  font-style: normal;
  font-weight: 750;
}

.video-model-list :deep(svg:last-child) {
  color: #526fe8;
  font-size: 8px;
}

.video-section--options {
  gap: 12px;
}

.video-option-row {
  display: grid;
  align-items: center;
  gap: 9px;
  grid-template-columns: 42px minmax(0, 1fr);
}

.video-option-row > span {
  color: #7c8795;
  font-size: 8px;
}

.video-option-row > div {
  display: flex;
  gap: 6px;
}

.video-option-row button {
  min-width: 0;
  height: 28px;
  flex: 1;
  padding: 0 7px;
  border: 1px solid #e1e6ed;
  border-radius: 6px;
  background: #fff;
  color: #65707c;
  font-size: 8px;
  cursor: pointer;
}

.video-option-row button.active {
  border-color: #9eacef;
  background: #edf0ff;
  color: #3f55c8;
  font-weight: 750;
}

.video-submit {
  display: grid;
  gap: 8px;
  padding: 15px;
  background: #fafbfe;
}

.video-submit > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #a46d22;
  font-size: 8px;
}

.video-submit > button {
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

.video-submit > button:disabled {
  background: #d6dae1;
  cursor: not-allowed;
}

.video-submit > small {
  color: #919ba8;
  font-size: 7px;
  text-align: right;
}

.video-submit > small[role='alert'] {
  color: #b44e45;
}

.video-results {
  min-width: 0;
  overflow: hidden;
  padding: 16px;
}

.video-results__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 13px;
}

.video-results__header > div {
  display: grid;
  gap: 3px;
}

.video-results__header strong {
  color: #303840;
  font-size: 14px;
}

.video-results__header span {
  color: #969fa7;
  font-size: 8px;
}

.video-results__header em {
  color: #526fe8;
  font-size: 8px;
  font-style: normal;
  font-weight: 750;
}

.video-work-grid {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

.video-work-card {
  display: grid;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e1e5ec;
  border-radius: 8px;
  background: #fff;
}

.video-work-card > header {
  display: grid;
  min-height: 38px;
  align-items: center;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  padding: 0 10px;
  border-bottom: 1px solid #eef0f4;
}

.video-work-card > header span {
  overflow: hidden;
  color: #46505a;
  font-size: 8px;
  font-weight: 740;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-work-card > header small {
  color: #9ba3ae;
  font-size: 7px;
}

.video-work-card > header em {
  padding: 2px 5px;
  border-radius: 999px;
  background: #edf0ff;
  color: #5265cc;
  font-size: 7px;
  font-style: normal;
  font-weight: 750;
}

.video-work-card > header em.done {
  background: #e9f7f1;
  color: #238467;
}

.video-work-card > header em.cancelled,
.video-work-card > header em.failed {
  background: #fff0ee;
  color: #bd4c42;
}

.video-work-card__visual {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #e9edf4;
}

.video-work-card__visual.ratio-9-16 {
  aspect-ratio: 9 / 13;
}

.video-work-card__visual.ratio-1-1 {
  aspect-ratio: 1 / 1;
}

.video-work-card__visual > :deep(svg) {
  width: 100%;
  height: 100%;
}

.video-work-card__visual > div:not(.video-work-card__play, .video-work-card__timeline) {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: #7a5160;
}

.video-work-card__visual > div:not(.video-work-card__play, .video-work-card__timeline) :deep(svg) {
  font-size: 22px;
}

.video-work-card__visual strong {
  font-size: 9px;
}

.video-work-card__loading {
  background: linear-gradient(145deg, rgb(81 105 213 / 96%), rgb(119 90 201 / 92%)), #526fe8;
  color: #fff !important;
}

.video-work-card__loading-ring {
  display: grid;
  width: 45px;
  height: 45px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: 50%;
  background: rgb(255 255 255 / 12%);
}

.video-work-card__loading-ring :deep(svg) {
  animation: video-spin 1.1s linear infinite;
}

.video-work-card__loading i {
  display: block;
  width: 58%;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 22%);
}

.video-work-card__loading i span {
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

.video-work-card__play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 50%;
  background: rgb(21 28 45 / 43%);
  color: #fff;
  font-size: 23px;
  transform: translate(-50%, -50%);
  backdrop-filter: blur(6px);
}

.video-work-card__timeline {
  position: absolute;
  right: 10px;
  bottom: 9px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.video-work-card__timeline span {
  display: block;
  height: 3px;
  flex: 1;
  border-radius: 999px;
  background: rgb(255 255 255 / 55%);
}

.video-work-card__timeline small {
  color: #fff;
  font-size: 7px;
  text-shadow: 0 1px 6px rgb(0 0 0 / 45%);
}

.video-work-card > p {
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

.video-work-card__meta {
  display: flex;
  gap: 5px;
  padding: 0 10px 10px;
}

.video-work-card__meta span {
  padding: 2px 5px;
  border-radius: 4px;
  background: #f2f4f8;
  color: #858e9a;
  font-size: 7px;
}

.video-work-card > footer {
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 8px;
  border-top: 1px solid #eef0f4;
}

.video-work-card--cancelled > footer,
.video-work-card--failed > footer,
.video-work-card--generating > footer,
.video-work-card--queued > footer {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.video-work-card--generating > footer,
.video-work-card--queued > footer {
  grid-template-columns: 1fr;
}

.video-work-card > footer button {
  display: inline-flex;
  min-width: 0;
  height: 29px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 5px;
  border: 1px solid #e0e4ea;
  border-radius: 6px;
  background: #fff;
  color: #626c79;
  font-size: 7px;
  cursor: pointer;
}

.video-work-card > footer button.active {
  border-color: #efd49a;
  background: #fffaf0;
  color: #bd7b13;
}

.video-empty {
  display: grid;
  min-height: 540px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed #d9dfe9;
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgb(82 111 232 / 3%) 1px, transparent 1px),
    linear-gradient(rgb(82 111 232 / 3%) 1px, transparent 1px), #fbfcfe;
  background-size: 34px 34px;
  text-align: center;
}

.video-empty > span {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 15px;
  background: #edf0ff;
  color: #526fe8;
  font-size: 23px;
}

.video-empty strong {
  color: #424a51;
  font-size: 12px;
}

.video-empty p {
  margin: 0;
  color: #949ca2;
  font-size: 8px;
}

.video-empty > div {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  padding: 6px 9px;
  border: 1px solid #e5e8ef;
  border-radius: 999px;
  color: #7e8794;
  font-size: 7px;
}

@media (max-width: 1060px) {
  .video-layout {
    grid-template-columns: 350px minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .video-studio {
    padding: 20px 14px 44px;
  }

  .video-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .video-header__switch {
    width: 100%;
    overflow-x: auto;
  }

  .video-header__switch a {
    flex: 1 0 auto;
    justify-content: center;
  }

  .video-layout {
    grid-template-columns: 1fr;
  }

  .video-panel {
    position: static;
  }
}

@media (max-width: 520px) {
  .video-header h1 {
    font-size: 23px;
  }

  .video-mode-grid {
    grid-template-columns: 1fr;
  }

  .video-mode-grid button {
    min-height: 46px;
    grid-template-columns: auto 1fr auto;
    justify-items: start;
    padding: 0 11px;
  }

  .video-work-grid {
    grid-template-columns: 1fr;
  }

  .video-source-grid {
    grid-template-columns: 1fr;
  }

  .video-empty {
    min-height: 380px;
  }
}
</style>
