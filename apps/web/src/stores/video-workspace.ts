import { defineStore } from 'pinia';
import {
  ApiError,
  cancelVideoTask,
  createVideoTask,
  fetchFileBlob,
  getVideoTask,
  listVideoTasks,
  type FileAsset,
  type VideoTask,
  type VideoTaskStatus,
  uploadImageFile,
} from '@/app/api';
import { useSessionStore } from './session';

export const VIDEO_MODEL_ALIAS = 'xai-grok-imagine-video';
export const VIDEO_TASK_POINTS_COST = 10;

export type VideoWorkStatus = 'cancelled' | 'done' | 'failed' | 'generating' | 'queued';
export type VideoWorkspaceStatus = 'error' | 'idle' | 'loading' | 'ready';

export interface VideoWork {
  completedAt: number | null;
  createdAt: number;
  duration: number;
  errorMessage: string;
  favorite: boolean;
  generateAudio: boolean;
  id: string;
  lastFrameFileId: string | null;
  mode: string;
  model: string;
  modelAlias: string;
  modelLabel: string;
  parameters: Record<string, unknown>;
  progress: number;
  prompt: string;
  ratio: string;
  resolution: string;
  resultFileId: string;
  resultFileName: string;
  resultLoading: boolean;
  resultMimeType: string;
  resultUrl: string;
  sourceFileId: string | null;
  status: VideoWorkStatus;
  variant: number;
}

export interface VideoWorkspaceError {
  code: string;
  message: string;
  recoverable: boolean;
  requestId?: string;
}

interface CreateVideoGenerationInput {
  duration: number;
  generateAudio?: boolean;
  lastFrameFileId?: string;
  mode: string;
  model: string;
  modelAlias?: string;
  modelLabel: string;
  prompt: string;
  ratio: string;
  resolution: string;
  sourceFileId?: string;
}

interface VideoTaskDisplayMetadata {
  duration?: number;
  generateAudio?: boolean;
  mode?: string;
  model?: string;
  modelAlias?: string;
  modelLabel?: string;
  ratio?: string;
  resolution?: string;
}

interface VideoWorkspaceState {
  dismissedTaskIds: string[];
  error: VideoWorkspaceError | null;
  initialized: boolean;
  status: VideoWorkspaceStatus;
  submitting: boolean;
  works: VideoWork[];
}

const POLL_INTERVAL_MS = 900;
const POLL_ERROR_INTERVAL_MS = 1_800;
const POLL_MAX_CONSECUTIVE_ERRORS = 12;
const POLL_MAX_DURATION_MS = 35 * 60 * 1_000;
const resultLoads = new Set<string>();
let initializePromise: Promise<void> | null = null;
let pollFailures = 0;
let pollInFlight = false;
let pollingPaused = false;
let pollTimer: number | undefined;

export const useVideoWorkspaceStore = defineStore('video-workspace', {
  state: (): VideoWorkspaceState => ({
    dismissedTaskIds: [],
    error: null,
    initialized: false,
    status: 'idle',
    submitting: false,
    works: [],
  }),
  getters: {
    activeWorks: (state) =>
      state.works.filter((work) => work.status === 'queued' || work.status === 'generating'),
    hasActiveWorks(): boolean {
      return this.activeWorks.length > 0;
    },
    generating: (state) => state.submitting || state.works.some(isActiveWork),
  },
  actions: {
    async initialize(): Promise<void> {
      if (this.initialized) {
        this.ensurePolling();
        return;
      }

      if (!initializePromise) {
        initializePromise = this.loadInitialTasks().finally(() => {
          initializePromise = null;
        });
      }

      return initializePromise;
    },
    async loadInitialTasks(): Promise<void> {
      const sessionStore = useSessionStore();

      this.status = 'loading';
      this.error = null;

      if (!sessionStore.authenticated) {
        await sessionStore.bootstrap();
      }

      if (!sessionStore.authenticated) {
        this.error = {
          code: 'AUTH_REQUIRED',
          message: sessionStore.error?.message ?? '请先登录后再生成视频',
          recoverable: true,
        };
        this.status = 'error';
        return;
      }

      try {
        const tasks = await listVideoTasks(30);

        this.mergeTasks(tasks);
        this.initialized = true;
        this.status = 'ready';
        this.ensurePolling();
      } catch (error) {
        this.error = normalizeVideoError(error);
        this.status = 'error';
      }
    },
    async uploadFrame(file: File): Promise<FileAsset> {
      if (!(await this.ensureAuthenticated())) {
        throw new Error(this.error?.message ?? '请先登录后再上传素材');
      }

      return uploadImageFile(file);
    },
    async createGeneration(input: CreateVideoGenerationInput): Promise<VideoWork | null> {
      if (this.submitting) {
        return null;
      }

      if (!(await this.ensureAuthenticated())) {
        return null;
      }

      const prompt = input.prompt.trim();

      if (!prompt) {
        this.error = {
          code: 'VIDEO_PROMPT_REQUIRED',
          message: '请先填写镜头描述',
          recoverable: true,
        };
        return null;
      }

      const sessionStore = useSessionStore();
      const idempotencyKey = createLocalId('video-generation');

      this.submitting = true;
      this.error = null;

      try {
        const task = await createVideoTask(
          {
            lastFrameFileId: input.lastFrameFileId,
            modelAlias: input.modelAlias || VIDEO_MODEL_ALIAS,
            parameters: {
              duration: input.duration,
              ...(input.generateAudio ? { generate_audio: true } : {}),
              mode: input.mode,
              ratio: input.ratio,
              resolution: input.resolution,
              uiModel: input.model,
              uiModelLabel: input.modelLabel,
            },
            prompt,
            sourceFileId: input.sourceFileId,
          },
          idempotencyKey,
        );

        return this.mergeTask(task, {
          duration: input.duration,
          generateAudio: input.generateAudio,
          mode: input.mode,
          model: input.model,
          modelAlias: input.modelAlias || VIDEO_MODEL_ALIAS,
          modelLabel: input.modelLabel,
          ratio: input.ratio,
          resolution: input.resolution,
        });
      } catch (error) {
        this.error = normalizeVideoError(error);
        return null;
      } finally {
        this.submitting = false;
        await sessionStore.refreshProfile();
        this.ensurePolling();
      }
    },
    async retryWork(workId: string): Promise<VideoWork | null> {
      const work = this.works.find((item) => item.id === workId);

      if (!work) {
        return null;
      }

      return this.createGeneration({
        duration: work.duration,
        generateAudio: work.generateAudio,
        lastFrameFileId: work.lastFrameFileId ?? undefined,
        mode: work.mode,
        model: work.model,
        modelAlias: work.modelAlias,
        modelLabel: work.modelLabel,
        prompt: work.prompt,
        ratio: work.ratio,
        resolution: work.resolution,
        sourceFileId: work.sourceFileId ?? undefined,
      });
    },
    async cancelWork(workId: string): Promise<void> {
      if (!(await this.ensureAuthenticated())) {
        return;
      }

      try {
        const task = await cancelVideoTask(workId);

        this.mergeTask(task);
        await useSessionStore().refreshProfile();
      } catch (error) {
        this.error = normalizeVideoError(error);
      }
    },
    ensurePolling(): void {
      if (pollingPaused || pollInFlight || !this.hasActiveWorks) {
        return;
      }

      schedulePoll(() => {
        void this.pollActiveTasks();
      }, POLL_INTERVAL_MS);
    },
    async pollActiveTasks(): Promise<void> {
      clearPollTimer();

      if (pollInFlight) {
        return;
      }

      const activeWorks = this.works.filter(isActiveWork);

      if (activeWorks.length === 0) {
        return;
      }

      const pollableWorks = activeWorks.filter((work) => !isPollingExpired(work));

      if (pollableWorks.length === 0) {
        pollingPaused = true;
        this.error = {
          code: 'VIDEO_TASK_POLL_PAUSED',
          message: '视频任务同步已暂停，请刷新页面后继续查询',
          recoverable: true,
        };
        return;
      }

      const previousStatuses = new Map(pollableWorks.map((work) => [work.id, work.status]));

      pollInFlight = true;

      try {
        const tasks = await Promise.all(pollableWorks.map((work) => getVideoTask(work.id)));
        let reachedTerminalState = false;

        pollFailures = 0;

        for (const task of tasks) {
          const previousStatus = previousStatuses.get(task.id);

          this.mergeTask(task);
          reachedTerminalState ||=
            isTerminalStatus(task.status) && previousStatus !== mapTaskStatus(task.status);
        }

        if (reachedTerminalState) {
          await useSessionStore().refreshProfile();
        }

        if (this.error?.code === 'VIDEO_TASK_POLL_FAILED') {
          this.error = null;
        }
      } catch (error) {
        pollFailures += 1;

        if (pollFailures >= POLL_MAX_CONSECUTIVE_ERRORS) {
          pollingPaused = true;
          clearPollTimer();
          this.error = {
            code: 'VIDEO_TASK_POLL_PAUSED',
            message: '视频任务同步连续失败，请刷新页面后继续查询',
            recoverable: true,
          };
        } else {
          this.error = normalizeVideoError(error, 'VIDEO_TASK_POLL_FAILED');
        }
      } finally {
        pollInFlight = false;

        if (this.hasActiveWorks && !pollingPaused) {
          schedulePoll(
            () => {
              void this.pollActiveTasks();
            },
            this.error?.code === 'VIDEO_TASK_POLL_FAILED'
              ? POLL_ERROR_INTERVAL_MS
              : POLL_INTERVAL_MS,
          );
        }
      }
    },
    mergeTasks(tasks: VideoTask[]): void {
      for (const task of tasks) {
        this.mergeTask(task);
      }
    },
    mergeTask(task: VideoTask, metadata?: VideoTaskDisplayMetadata): VideoWork {
      const existing = this.works.find((work) => work.id === task.id);

      if (existing) {
        const sameResultFile = existing.resultFileId === (task.resultFile?.id ?? '');
        const nextResultUrl = sameResultFile ? existing.resultUrl : '';

        if (existing.resultUrl && !sameResultFile) {
          URL.revokeObjectURL(existing.resultUrl);
        }

        Object.assign(existing, {
          completedAt: toTimestamp(task.completedAt),
          duration: metadata?.duration ?? asNumber(task.parameters?.duration) ?? existing.duration,
          errorMessage: task.errorMessage ?? '',
          generateAudio:
            metadata?.generateAudio ??
            asBoolean(task.parameters?.generate_audio) ??
            existing.generateAudio,
          lastFrameFileId: task.lastFrameFile?.id ?? null,
          mode: metadata?.mode ?? asString(task.parameters?.mode) ?? existing.mode,
          model: metadata?.model ?? asString(task.parameters?.uiModel) ?? existing.model,
          modelAlias: metadata?.modelAlias ?? task.modelAlias ?? existing.modelAlias,
          modelLabel:
            metadata?.modelLabel ?? asString(task.parameters?.uiModelLabel) ?? existing.modelLabel,
          parameters: extractExtraParameters(task.parameters),
          progress: task.progress,
          prompt: task.prompt,
          ratio: metadata?.ratio ?? asString(task.parameters?.ratio) ?? existing.ratio,
          resolution:
            metadata?.resolution ?? asString(task.parameters?.resolution) ?? existing.resolution,
          resultFileId: task.resultFile?.id ?? '',
          resultFileName: task.resultFile?.originalName ?? '',
          resultLoading: Boolean(task.resultFile) && !nextResultUrl,
          resultMimeType: task.resultFile?.mimeType ?? existing.resultMimeType,
          resultUrl: nextResultUrl,
          sourceFileId: task.sourceFile?.id ?? null,
          status: mapTaskStatus(task.status),
        });

        if (task.resultFile && !nextResultUrl) {
          void this.loadResult(task.id);
        }

        return existing;
      }

      const work: VideoWork = {
        completedAt: toTimestamp(task.completedAt),
        createdAt: toTimestamp(task.createdAt) ?? Date.now(),
        duration: metadata?.duration ?? asNumber(task.parameters?.duration) ?? 5,
        errorMessage: task.errorMessage ?? '',
        favorite: false,
        generateAudio:
          metadata?.generateAudio ?? asBoolean(task.parameters?.generate_audio) ?? false,
        id: task.id,
        lastFrameFileId: task.lastFrameFile?.id ?? null,
        mode: metadata?.mode ?? asString(task.parameters?.mode) ?? 'text-to-video',
        model: metadata?.model ?? asString(task.parameters?.uiModel) ?? task.modelAlias,
        modelAlias: metadata?.modelAlias ?? task.modelAlias ?? VIDEO_MODEL_ALIAS,
        modelLabel:
          metadata?.modelLabel ?? asString(task.parameters?.uiModelLabel) ?? task.modelAlias,
        parameters: extractExtraParameters(task.parameters),
        progress: task.progress,
        prompt: task.prompt,
        ratio: metadata?.ratio ?? asString(task.parameters?.ratio) ?? '16:9',
        resolution: metadata?.resolution ?? asString(task.parameters?.resolution) ?? '720P',
        resultFileId: task.resultFile?.id ?? '',
        resultFileName: task.resultFile?.originalName ?? '',
        resultLoading: Boolean(task.resultFile),
        resultMimeType: task.resultFile?.mimeType ?? '',
        resultUrl: '',
        sourceFileId: task.sourceFile?.id ?? null,
        status: mapTaskStatus(task.status),
        variant: variantFromId(task.id),
      };

      if (!this.dismissedTaskIds.includes(task.id)) {
        this.works = [work, ...this.works].sort((left, right) => right.createdAt - left.createdAt);
      }

      if (task.resultFile) {
        void this.loadResult(task.id);
      }

      return work;
    },
    async loadResult(workId: string): Promise<void> {
      const work = this.works.find((item) => item.id === workId);

      if (!work || !work.resultFileId || resultLoads.has(workId)) {
        return;
      }

      work.resultLoading = true;
      resultLoads.add(workId);
      const fileId = work.resultFileId;

      try {
        const blob = await fetchFileBlob(fileId);

        if (!this.works.includes(work) || work.resultFileId !== fileId) {
          return;
        }

        const resultUrl = URL.createObjectURL(blob);

        if (work.resultUrl) {
          URL.revokeObjectURL(work.resultUrl);
        }

        work.resultMimeType = blob.type || work.resultMimeType;
        work.resultUrl = resultUrl;
        work.resultLoading = false;
      } catch (error) {
        work.resultLoading = false;
        this.error = normalizeVideoError(error, 'VIDEO_RESULT_LOAD_FAILED');
      } finally {
        resultLoads.delete(workId);
      }
    },
    removeWork(workId: string): void {
      const work = this.works.find((item) => item.id === workId);

      if (work?.resultUrl) {
        URL.revokeObjectURL(work.resultUrl);
      }

      if (!this.dismissedTaskIds.includes(workId)) {
        this.dismissedTaskIds.push(workId);
      }

      this.works = this.works.filter((item) => item.id !== workId);
    },
    toggleFavorite(workId: string): void {
      const work = this.works.find((item) => item.id === workId);

      if (work) {
        work.favorite = !work.favorite;
      }
    },
    async downloadWork(workId: string): Promise<void> {
      const work = this.works.find((item) => item.id === workId);

      if (!work) {
        return;
      }

      if (!work.resultFileId) {
        this.error = {
          code: 'VIDEO_RESULT_NOT_READY',
          message: '视频文件尚未生成完成',
          recoverable: true,
        };
        return;
      }

      try {
        const blob = work.resultUrl
          ? await fetch(work.resultUrl).then((response) => response.blob())
          : await fetchFileBlob(work.resultFileId);
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = objectUrl;
        anchor.download =
          work.resultFileName ||
          `aurora-video-${work.id}.${extensionFromMimeType(blob.type || work.resultMimeType)}`;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        this.error = normalizeVideoError(error, 'VIDEO_DOWNLOAD_FAILED');
      }
    },
    clearError(): void {
      this.error = null;

      if (pollingPaused) {
        pollingPaused = false;
        pollFailures = 0;
        this.ensurePolling();
      }
    },
    async ensureAuthenticated(): Promise<boolean> {
      const sessionStore = useSessionStore();

      if (!sessionStore.authenticated) {
        await sessionStore.bootstrap();
      }

      if (!sessionStore.authenticated) {
        this.error = {
          code: 'AUTH_REQUIRED',
          message: sessionStore.error?.message ?? '请先登录后再生成视频',
          recoverable: true,
        };
      }

      return sessionStore.authenticated;
    },
  },
});

function isActiveWork(work: VideoWork): boolean {
  return work.status === 'queued' || work.status === 'generating';
}

function isTerminalStatus(status: VideoTaskStatus): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED';
}

function isPollingExpired(work: VideoWork): boolean {
  return Date.now() - work.createdAt >= POLL_MAX_DURATION_MS;
}

function mapTaskStatus(status: VideoTaskStatus): VideoWorkStatus {
  if (status === 'SUCCEEDED') {
    return 'done';
  }

  if (status === 'FAILED') {
    return 'failed';
  }

  if (status === 'CANCELLED') {
    return 'cancelled';
  }

  return status === 'RUNNING' ? 'generating' : 'queued';
}

function normalizeVideoError(
  error: unknown,
  fallbackCode = 'VIDEO_REQUEST_FAILED',
): VideoWorkspaceError {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      requestId: error.requestId,
    };
  }

  return {
    code: fallbackCode,
    message: error instanceof Error ? error.message : '视频请求失败，请稍后重试',
    recoverable: true,
  };
}

function schedulePoll(callback: () => void, delay: number): void {
  clearPollTimer();
  pollTimer = window.setTimeout(callback, delay);
}

function clearPollTimer(): void {
  if (pollTimer !== undefined) {
    window.clearTimeout(pollTimer);
    pollTimer = undefined;
  }
}

function toTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value !== 'string') {
    return null;
  }

  return !['0', 'false', 'no', 'off', 'disabled'].includes(value.trim().toLowerCase());
}

function extractExtraParameters(
  parameters: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!parameters) {
    return {};
  }

  const displayKeys = new Set([
    'duration',
    'mode',
    'ratio',
    'resolution',
    'uiModel',
    'uiModelLabel',
  ]);

  return Object.fromEntries(Object.entries(parameters).filter(([key]) => !displayKeys.has(key)));
}

function createLocalId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart}-${Date.now().toString(36)}`;
}

function variantFromId(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % 8;
}

function extensionFromMimeType(mimeType: string): string {
  const extensionByMimeType: Record<string, string> = {
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };

  return extensionByMimeType[mimeType] ?? 'mp4';
}
