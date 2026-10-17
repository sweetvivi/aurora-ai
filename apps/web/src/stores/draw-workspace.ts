import { defineStore } from 'pinia';
import {
  ApiError,
  type FileAsset,
  type ImageTask,
  type ImageTaskStatus,
  createImageTask,
  fetchFileBlob,
  getImageTask,
  listImageTasks,
  uploadImageFile,
} from '@/app/api';
import { useSessionStore } from './session';

export const IMAGE_MODEL_ALIAS = 'volc-seedream-5';
export const IMAGE_TASK_POINTS_COST = 5;

export type DrawWorkStatus = 'done' | 'failed' | 'generating' | 'queued';
export type DrawWorkspaceStatus = 'error' | 'idle' | 'loading' | 'ready';

export interface DrawWork {
  artworkLoading: boolean;
  artworkUrl: string;
  completedAt: number | null;
  createdAt: number;
  errorMessage: string;
  favorite: boolean;
  id: string;
  model: string;
  modelLabel: string;
  parameters: Record<string, unknown>;
  prompt: string;
  ratio: string;
  resultFileId: string;
  resultFileName: string;
  size: string;
  sourceFileId: string | null;
  status: DrawWorkStatus;
  tool: string;
  variant: number;
}

export interface DrawWorkspaceError {
  code: string;
  message: string;
  recoverable: boolean;
  requestId?: string;
}

interface CreateGenerationInput {
  amount: number;
  extraParameters?: Record<string, unknown>;
  model: string;
  modelLabel: string;
  prompt: string;
  ratio: string;
  size: string;
  sourceFileId?: string;
  toolKey?: string;
}

interface TaskDisplayMetadata {
  model: string;
  modelLabel: string;
  parameters?: Record<string, unknown>;
  ratio: string;
  size: string;
  tool: string;
}

interface DrawWorkspaceState {
  dismissedTaskIds: string[];
  error: DrawWorkspaceError | null;
  initialized: boolean;
  status: DrawWorkspaceStatus;
  submitting: boolean;
  works: DrawWork[];
}

const POLL_INTERVAL_MS = 700;
const POLL_ERROR_INTERVAL_MS = 1_500;
const POLL_MAX_CONSECUTIVE_ERRORS = 12;
const POLL_MAX_DURATION_MS = 30 * 60 * 1_000;
const artworkLoads = new Set<string>();
let initializePromise: Promise<void> | null = null;
let pollFailures = 0;
let pollInFlight = false;
let pollingPaused = false;
let pollTimer: number | undefined;

export const useDrawWorkspaceStore = defineStore('draw-workspace', {
  state: (): DrawWorkspaceState => ({
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
          message: sessionStore.error?.message ?? '请先登录后再生成图片',
          recoverable: true,
        };
        this.status = 'error';
        return;
      }

      try {
        const tasks = await listImageTasks(30);

        this.mergeTasks(tasks);
        this.initialized = true;
        this.status = 'ready';
        this.ensurePolling();
      } catch (error) {
        this.error = normalizeDrawError(error);
        this.status = 'error';
      }
    },
    async uploadReference(file: File): Promise<FileAsset> {
      if (!(await this.ensureAuthenticated())) {
        throw new Error(this.error?.message ?? '请先登录后再上传参考图');
      }

      return uploadImageFile(file);
    },
    async createGenerationWorks(input: CreateGenerationInput): Promise<DrawWork[]> {
      if (this.submitting) {
        return [];
      }

      if (!(await this.ensureAuthenticated())) {
        return [];
      }

      const amount = Math.min(Math.max(Math.floor(input.amount), 1), 4);
      const prompt = input.prompt.trim();

      if (!prompt) {
        this.error = {
          code: 'IMAGE_PROMPT_REQUIRED',
          message: '请先填写绘画描述',
          recoverable: true,
        };
        return [];
      }

      const sessionStore = useSessionStore();
      const generationId = createLocalId('generation');
      const createdWorks: DrawWork[] = [];
      const toolKey = input.toolKey ?? 'draw';

      this.submitting = true;
      this.error = null;

      try {
        for (let index = 0; index < amount; index += 1) {
          const task = await createImageTask(
            {
              modelAlias: IMAGE_MODEL_ALIAS,
              parameters: {
                ...input.extraParameters,
                ratio: input.ratio,
                size: input.size,
                uiModel: input.model,
                uiModelLabel: input.modelLabel,
                tool: toolKey,
              },
              prompt,
              sourceFileId: input.sourceFileId,
            },
            `${generationId}:${index + 1}`,
          );

          createdWorks.push(
            this.mergeTask(task, {
              model: input.model,
              modelLabel: input.modelLabel,
              parameters: input.extraParameters,
              ratio: input.ratio,
              size: input.size,
              tool: toolKey,
            }),
          );
        }
      } catch (error) {
        this.error = normalizeDrawError(error);
      } finally {
        this.submitting = false;
        await sessionStore.refreshProfile();
        this.ensurePolling();
      }

      return createdWorks;
    },
    async retryWork(workId: string): Promise<DrawWork[]> {
      const work = this.works.find((item) => item.id === workId);

      if (!work) {
        return [];
      }

      return this.createGenerationWorks({
        amount: 1,
        model: work.model,
        modelLabel: work.modelLabel,
        extraParameters: work.parameters,
        prompt: work.prompt,
        ratio: work.ratio,
        size: work.size,
        sourceFileId: work.sourceFileId ?? undefined,
        toolKey: work.tool,
      });
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
          code: 'IMAGE_TASK_POLL_PAUSED',
          message: '图片任务同步已暂停，请刷新页面后继续查询',
          recoverable: true,
        };
        return;
      }

      const previousStatuses = new Map(pollableWorks.map((work) => [work.id, work.status]));

      pollInFlight = true;

      try {
        const tasks = await Promise.all(pollableWorks.map((work) => getImageTask(work.id)));
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

        if (this.error?.code === 'IMAGE_TASK_POLL_FAILED') {
          this.error = null;
        }
      } catch (error) {
        pollFailures += 1;

        if (pollFailures >= POLL_MAX_CONSECUTIVE_ERRORS) {
          pollingPaused = true;
          clearPollTimer();
          this.error = {
            code: 'IMAGE_TASK_POLL_PAUSED',
            message: '图片任务同步连续失败，请刷新页面后继续查询',
            recoverable: true,
          };
        } else {
          this.error = normalizeDrawError(error, 'IMAGE_TASK_POLL_FAILED');
        }
      } finally {
        pollInFlight = false;

        if (this.hasActiveWorks && !pollingPaused) {
          schedulePoll(
            () => {
              void this.pollActiveTasks();
            },
            this.error?.code === 'IMAGE_TASK_POLL_FAILED'
              ? POLL_ERROR_INTERVAL_MS
              : POLL_INTERVAL_MS,
          );
        }
      }
    },
    mergeTasks(tasks: ImageTask[]): void {
      for (const task of tasks) {
        this.mergeTask(task);
      }
    },
    mergeTask(task: ImageTask, metadata?: TaskDisplayMetadata): DrawWork {
      const existing = this.works.find((work) => work.id === task.id);

      if (existing) {
        const hasSameResultFile = existing.resultFileId === (task.resultFile?.id ?? '');
        const nextArtworkUrl = hasSameResultFile ? existing.artworkUrl : '';

        if (existing.artworkUrl && !hasSameResultFile) {
          URL.revokeObjectURL(existing.artworkUrl);
        }

        Object.assign(existing, {
          artworkLoading: Boolean(task.resultFile) && !nextArtworkUrl,
          artworkUrl: nextArtworkUrl,
          completedAt: toTimestamp(task.completedAt),
          errorMessage: task.errorMessage ?? '',
          model: metadata?.model ?? asString(task.parameters?.uiModel) ?? existing.model,
          modelLabel:
            metadata?.modelLabel ?? asString(task.parameters?.uiModelLabel) ?? existing.modelLabel,
          parameters:
            metadata?.parameters ?? extractExtraParameters(task.parameters) ?? existing.parameters,
          prompt: task.prompt,
          ratio: metadata?.ratio ?? asString(task.parameters?.ratio) ?? existing.ratio,
          resultFileId: task.resultFile?.id ?? '',
          resultFileName: task.resultFile?.originalName ?? '',
          size: metadata?.size ?? asString(task.parameters?.size) ?? existing.size,
          sourceFileId: task.sourceFile?.id ?? null,
          status: mapTaskStatus(task.status),
          tool: metadata?.tool ?? asString(task.parameters?.tool) ?? existing.tool,
        });

        if (task.resultFile && !nextArtworkUrl) {
          void this.loadArtwork(task.id);
        }

        return existing;
      }

      const work: DrawWork = {
        artworkLoading: Boolean(task.resultFile),
        artworkUrl: '',
        completedAt: toTimestamp(task.completedAt),
        createdAt: toTimestamp(task.createdAt) ?? Date.now(),
        errorMessage: task.errorMessage ?? '',
        favorite: false,
        id: task.id,
        model: metadata?.model ?? asString(task.parameters?.uiModel) ?? task.modelAlias,
        modelLabel:
          metadata?.modelLabel ?? asString(task.parameters?.uiModelLabel) ?? task.modelAlias,
        parameters: metadata?.parameters ?? extractExtraParameters(task.parameters) ?? {},
        prompt: task.prompt,
        ratio: metadata?.ratio ?? asString(task.parameters?.ratio) ?? '智能比例',
        resultFileId: task.resultFile?.id ?? '',
        resultFileName: task.resultFile?.originalName ?? '',
        size: metadata?.size ?? asString(task.parameters?.size) ?? '1K',
        sourceFileId: task.sourceFile?.id ?? null,
        status: mapTaskStatus(task.status),
        tool: metadata?.tool ?? asString(task.parameters?.tool) ?? 'draw',
        variant: variantFromId(task.id),
      };

      if (!this.dismissedTaskIds.includes(task.id)) {
        this.works = [work, ...this.works].sort((left, right) => right.createdAt - left.createdAt);
      }

      if (task.resultFile) {
        void this.loadArtwork(task.id);
      }

      return work;
    },
    async loadArtwork(workId: string): Promise<void> {
      const work = this.works.find((item) => item.id === workId);

      if (!work || !work.resultFileId || artworkLoads.has(workId)) {
        return;
      }

      work.artworkLoading = true;
      artworkLoads.add(workId);
      const fileId = work.resultFileId;

      try {
        const blob = await fetchFileBlob(fileId);

        if (!this.works.includes(work) || work.resultFileId !== fileId) {
          return;
        }

        const artworkUrl = URL.createObjectURL(blob);

        if (work.artworkUrl) {
          URL.revokeObjectURL(work.artworkUrl);
        }

        work.artworkUrl = artworkUrl;
        work.artworkLoading = false;
      } catch (error) {
        work.artworkLoading = false;
        this.error = normalizeDrawError(error, 'IMAGE_RESULT_LOAD_FAILED');
      } finally {
        artworkLoads.delete(workId);
      }
    },
    removeWork(workId: string): void {
      const work = this.works.find((item) => item.id === workId);

      if (work?.artworkUrl) {
        URL.revokeObjectURL(work.artworkUrl);
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

      if (!work.artworkUrl && !work.resultFileId) {
        this.error = {
          code: 'IMAGE_RESULT_NOT_READY',
          message: '图片文件尚未生成完成',
          recoverable: true,
        };
        return;
      }

      try {
        const blob = work.artworkUrl
          ? await fetch(work.artworkUrl).then((response) => response.blob())
          : await fetchFileBlob(work.resultFileId);
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = objectUrl;
        anchor.download =
          work.resultFileName || `aurora-${work.id}.${extensionFromMimeType(blob.type)}`;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        this.error = normalizeDrawError(error, 'IMAGE_DOWNLOAD_FAILED');
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
          message: sessionStore.error?.message ?? '请先登录后再生成图片',
          recoverable: true,
        };
      }

      return sessionStore.authenticated;
    },
  },
});

function isActiveWork(work: DrawWork): boolean {
  return work.status === 'queued' || work.status === 'generating';
}

function isTerminalStatus(status: ImageTaskStatus): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED';
}

function isPollingExpired(work: DrawWork): boolean {
  return Date.now() - work.createdAt >= POLL_MAX_DURATION_MS;
}

function mapTaskStatus(status: ImageTaskStatus): DrawWorkStatus {
  if (status === 'SUCCEEDED') {
    return 'done';
  }

  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'failed';
  }

  return status === 'RUNNING' ? 'generating' : 'queued';
}

function normalizeDrawError(
  error: unknown,
  fallbackCode = 'IMAGE_REQUEST_FAILED',
): DrawWorkspaceError {
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
    message: error instanceof Error ? error.message : '图片请求失败，请稍后重试',
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

function extractExtraParameters(
  parameters: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!parameters) {
    return null;
  }

  const displayKeys = new Set(['ratio', 'size', 'tool', 'uiModel', 'uiModelLabel']);
  const extraParameters = Object.fromEntries(
    Object.entries(parameters).filter(([key]) => !displayKeys.has(key)),
  );

  return Object.keys(extraParameters).length > 0 ? extraParameters : null;
}

function createLocalId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart}`;
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
    'image/webp': 'webp',
  };

  return extensionByMimeType[mimeType] ?? 'png';
}
