import { defineStore } from 'pinia';
import {
  ApiError,
  type ChatModel,
  type ConversationAttachment,
  type ReasoningEffort,
  streamChat,
} from '@/app/api';
import { useSessionStore } from './session';

export type GroupChatStatus = 'error' | 'idle' | 'ready' | 'streaming';
export type GroupResponseStatus = 'CANCELLED' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'STREAMING';

export interface GroupChatAttachment extends ConversationAttachment {
  previewUrl?: string;
}

export interface GroupModelResponse {
  alias: string;
  assistantMessageId?: string;
  content: string;
  conversationId?: string;
  createdAt: string;
  displayName: string;
  error?: string;
  id: string;
  pointsCost?: number;
  requestId?: string;
  status: GroupResponseStatus;
}

export interface GroupChatRound {
  attachments: GroupChatAttachment[];
  content: string;
  createdAt: string;
  id: string;
  responses: GroupModelResponse[];
}

export interface GroupChatError {
  code: string;
  message: string;
  recoverable: boolean;
  requestId?: string;
}

interface GroupChatState {
  error: GroupChatError | null;
  initialized: boolean;
  models: ChatModel[];
  ownerUserId: string | null;
  rounds: GroupChatRound[];
  selectedAliases: string[];
  status: GroupChatStatus;
}

interface SendGroupMessageOptions {
  attachments?: GroupChatAttachment[];
  fileIds?: string[];
  reasoningEffort?: ReasoningEffort;
  taskMode?: boolean;
}

let activeControllers = new Map<string, AbortController>();
const STORAGE_PREFIX = 'aurora.group-chat-workspace.v1';
const MAX_PERSISTED_ROUNDS = 20;

export const useGroupChatWorkspaceStore = defineStore('group-chat-workspace', {
  state: (): GroupChatState => ({
    error: null,
    initialized: false,
    models: [],
    ownerUserId: null,
    rounds: [],
    selectedAliases: [],
    status: 'idle',
  }),
  getters: {
    canSend: (state) => state.status !== 'streaming' && state.selectedAliases.length > 0,
    selectedModels: (state) =>
      state.selectedAliases
        .map((alias) => state.models.find((model) => model.alias === alias))
        .filter((model): model is ChatModel => Boolean(model)),
    streaming: (state) => state.status === 'streaming',
  },
  actions: {
    async initialize(): Promise<void> {
      const sessionStore = useSessionStore();
      const userId = sessionStore.user?.id ?? null;

      if (this.initialized && this.ownerUserId === userId) {
        return;
      }

      this.status = 'idle';

      if (!sessionStore.authenticated) {
        await sessionStore.bootstrap();
      }

      if (!sessionStore.authenticated) {
        this.error = {
          code: sessionStore.error?.code ?? 'AUTH_REQUIRED',
          message: sessionStore.error?.message ?? '请先登录后再开始多模型对话',
          recoverable: true,
        };
        this.status = 'error';
        return;
      }

      const authenticatedUserId = sessionStore.user?.id;

      if (!authenticatedUserId) {
        this.error = {
          code: 'AUTH_REQUIRED',
          message: '无法识别当前登录用户，请重新登录后重试',
          recoverable: true,
        };
        this.status = 'error';
        return;
      }

      const ownerChanged = this.ownerUserId !== null && this.ownerUserId !== authenticatedUserId;

      if (ownerChanged) {
        this.error = null;
        this.rounds = [];
        this.selectedAliases = [];
      }

      this.ownerUserId = authenticatedUserId;
      const hydrated = this.hydrateWorkspace(authenticatedUserId);

      if (ownerChanged && !hydrated && this.models.length > 0) {
        this.syncModels(this.models);
      }

      this.initialized = true;
      this.status = 'ready';
    },
    syncModels(models: ChatModel[]): void {
      this.models = models;

      const availableAliases = new Set(models.map((model) => model.alias));
      const retained = this.selectedAliases.filter((alias) => availableAliases.has(alias));
      const defaults = models.slice(0, 10).map((model) => model.alias);

      this.selectedAliases = retained.length > 0 ? retained : defaults;
      this.persistWorkspace();
    },
    toggleModel(alias: string): void {
      if (!this.models.some((model) => model.alias === alias)) {
        return;
      }

      if (this.selectedAliases.includes(alias)) {
        this.selectedAliases = this.selectedAliases.filter((item) => item !== alias);
        this.persistWorkspace();
        return;
      }

      if (this.selectedAliases.length < 10) {
        this.selectedAliases = [...this.selectedAliases, alias];
        this.persistWorkspace();
      }
    },
    selectAllModels(): void {
      this.selectedAliases = this.models.slice(0, 10).map((model) => model.alias);
      this.persistWorkspace();
    },
    clearModels(): void {
      this.selectedAliases = [];
      this.persistWorkspace();
    },
    clearConversation(): void {
      this.stopAll();
      this.error = null;
      this.rounds = [];
      this.status = 'ready';
      this.persistWorkspace();
    },
    async sendMessage(rawContent: string, options: SendGroupMessageOptions = {}): Promise<void> {
      const content = rawContent.trim();
      const selectedModels = this.selectedModels;

      if (!content || selectedModels.length === 0 || this.streaming) {
        return;
      }

      const sessionStore = useSessionStore();

      if (!sessionStore.authenticated) {
        await this.initialize();

        if (!sessionStore.authenticated) {
          return;
        }
      }

      const createdAt = new Date().toISOString();
      const attachments = options.attachments ?? [];
      const fileIds = options.fileIds ?? attachments.map((attachment) => attachment.fileId);
      const conversationByAlias = new Map<string, string>();

      for (const previousRound of this.rounds) {
        for (const response of previousRound.responses) {
          if (response.conversationId) {
            conversationByAlias.set(response.alias, response.conversationId);
          }
        }
      }

      const responses = selectedModels.map((model) => ({
        alias: model.alias,
        content: '',
        conversationId: conversationByAlias.get(model.alias),
        createdAt,
        displayName: model.displayName,
        id: createLocalId('group-response'),
        status: 'PENDING' as const,
      }));
      const round: GroupChatRound = {
        attachments,
        content,
        createdAt,
        id: createLocalId('group-round'),
        responses,
      };

      this.error = null;
      this.rounds.push(round);
      this.status = 'streaming';
      this.persistWorkspace();

      await Promise.all(
        round.responses.map((response) =>
          this.runModelResponse(round.id, response.id, {
            content,
            fileIds,
            reasoningEffort: options.reasoningEffort,
            taskMode: options.taskMode,
          }),
        ),
      );

      await sessionStore.refreshProfile().catch(() => undefined);
      activeControllers = new Map();
      this.status = 'ready';
      this.persistWorkspace();
    },
    async runModelResponse(
      roundId: string,
      responseId: string,
      input: {
        content: string;
        fileIds: string[];
        reasoningEffort?: ReasoningEffort;
        taskMode?: boolean;
      },
    ): Promise<void> {
      const response = this.findResponse(roundId, responseId);

      if (!response) {
        return;
      }

      const controller = new AbortController();
      const sessionStore = useSessionStore();

      activeControllers.set(responseId, controller);
      response.status = 'STREAMING';
      this.persistWorkspace();

      try {
        await streamChat(
          {
            content: input.content,
            conversationId: response.conversationId,
            fileIds: input.fileIds.length > 0 ? input.fileIds : undefined,
            modelAlias: response.alias,
            reasoningEffort: input.reasoningEffort,
            taskMode: input.taskMode,
          },
          {
            onDelta: (event) => {
              const target = this.findResponse(roundId, responseId);

              if (target) {
                target.content += event.content;
              }
            },
            onDone: (event) => {
              const target = this.findResponse(roundId, responseId);

              if (target) {
                target.assistantMessageId = event.assistantMessageId;
                target.requestId = event.requestId;
                target.status = 'COMPLETED';
              }

              sessionStore.updatePoints(event.balance);
              this.persistWorkspace();
            },
            onError: (event) => {
              const target = this.findResponse(roundId, responseId);

              if (target) {
                target.content ||= event.message;
                target.error = event.message;
                target.requestId = event.requestId;
                target.status = 'FAILED';
              }

              sessionStore.updatePoints(event.balance);
              this.persistWorkspace();
            },
            onMeta: (event) => {
              const target = this.findResponse(roundId, responseId);

              if (target) {
                target.assistantMessageId = event.assistantMessageId;
                target.conversationId = event.conversationId;
                target.pointsCost = event.pointsCost;
                target.requestId = event.requestId;
              }

              sessionStore.updatePoints(event.balance);
              this.persistWorkspace();
            },
          },
          controller.signal,
        );
      } catch (error) {
        const target = this.findResponse(roundId, responseId);

        if (!target) {
          return;
        }

        if (isAbortError(error)) {
          target.content ||= '已停止生成，本次积分已退回';
          target.error = '已停止生成';
          target.status = 'CANCELLED';
        } else {
          const normalized = normalizeGroupChatError(error);

          target.content ||= normalized.message;
          target.error = normalized.message;
          target.status = 'FAILED';
        }
      } finally {
        activeControllers.delete(responseId);
        this.persistWorkspace();
      }
    },
    retryRound(roundId: string): void {
      const round = this.rounds.find((item) => item.id === roundId);

      if (!round || this.streaming) {
        return;
      }

      round.responses = round.responses.map((response) => ({
        alias: response.alias,
        content: '',
        conversationId: response.conversationId,
        createdAt: new Date().toISOString(),
        displayName: response.displayName,
        id: createLocalId('group-response'),
        status: 'PENDING',
      }));
      this.status = 'streaming';
      this.persistWorkspace();

      void Promise.all(
        round.responses.map((response) =>
          this.runModelResponse(round.id, response.id, {
            content: round.content,
            fileIds: round.attachments.map((attachment) => attachment.fileId),
          }),
        ),
      )
        .then(async () => {
          await useSessionStore()
            .refreshProfile()
            .catch(() => undefined);
          this.status = 'ready';
          this.persistWorkspace();
        })
        .finally(() => {
          activeControllers = new Map();
        });
    },
    async retryResponse(roundId: string, responseId: string): Promise<void> {
      const round = this.rounds.find((item) => item.id === roundId);
      const response = round?.responses.find((item) => item.id === responseId);

      if (!round || !response || this.streaming) {
        return;
      }

      response.assistantMessageId = undefined;
      response.content = '';
      response.createdAt = new Date().toISOString();
      response.error = undefined;
      response.pointsCost = undefined;
      response.requestId = undefined;
      response.status = 'PENDING';
      this.status = 'streaming';
      this.persistWorkspace();

      try {
        await this.runModelResponse(round.id, response.id, {
          content: round.content,
          fileIds: round.attachments.map((attachment) => attachment.fileId),
        });
      } finally {
        await useSessionStore()
          .refreshProfile()
          .catch(() => undefined);
        this.status = 'ready';
        this.persistWorkspace();
      }
    },
    stopAll(): void {
      for (const controller of activeControllers.values()) {
        controller.abort();
      }

      activeControllers = new Map();

      if (this.status === 'streaming') {
        this.status = 'ready';
      }

      this.persistWorkspace();
    },
    hydrateWorkspace(userId: string): boolean {
      const persisted = readPersistedWorkspace(userId);

      if (!persisted) {
        return false;
      }

      this.rounds = persisted.rounds;
      this.selectedAliases = persisted.selectedAliases;
      return true;
    },
    persistWorkspace(): void {
      if (!this.ownerUserId) {
        return;
      }

      writePersistedWorkspace(this.ownerUserId, {
        rounds: this.rounds,
        selectedAliases: this.selectedAliases,
      });
    },
    findResponse(roundId: string, responseId: string): GroupModelResponse | undefined {
      return this.rounds
        .find((round) => round.id === roundId)
        ?.responses.find((response) => response.id === responseId);
    },
  },
});

function normalizeGroupChatError(error: unknown): GroupChatError {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      requestId: error.requestId,
    };
  }

  return {
    code: 'GROUP_CHAT_REQUEST_FAILED',
    message: error instanceof Error ? error.message : '多模型请求失败，请稍后重试',
    recoverable: true,
  };
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function createLocalId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart}`;
}

interface PersistedGroupChatWorkspace {
  rounds: GroupChatRound[];
  selectedAliases: string[];
}

function readPersistedWorkspace(userId: string): PersistedGroupChatWorkspace | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return null;
    }

    const selectedAliases = Array.isArray(parsed.selectedAliases)
      ? Array.from(
          new Set(
            parsed.selectedAliases
              .filter((alias): alias is string => typeof alias === 'string' && alias.length > 0)
              .slice(0, 10),
          ),
        )
      : [];
    const rounds = Array.isArray(parsed.rounds)
      ? parsed.rounds
          .map(normalizePersistedRound)
          .filter((round): round is GroupChatRound => Boolean(round))
          .slice(-MAX_PERSISTED_ROUNDS)
      : [];

    return {
      rounds,
      selectedAliases,
    };
  } catch {
    return null;
  }
}

function writePersistedWorkspace(userId: string, workspace: PersistedGroupChatWorkspace): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const rounds = workspace.rounds.slice(-MAX_PERSISTED_ROUNDS).map((round) => ({
      ...round,
      attachments: round.attachments.map(
        ({ previewUrl: _previewUrl, ...attachment }) => attachment,
      ),
      responses: round.responses.map((response) => ({
        ...response,
        status:
          response.status === 'PENDING' || response.status === 'STREAMING'
            ? ('CANCELLED' as const)
            : response.status,
      })),
    }));

    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({
        rounds,
        selectedAliases: workspace.selectedAliases.slice(0, 10),
      }),
    );
  } catch {
    // Storage quota or policy failures should not interrupt an active chat.
  }
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizePersistedRound(value: unknown): GroupChatRound | null {
  if (!isRecord(value)) {
    return null;
  }

  const responses = Array.isArray(value.responses)
    ? value.responses
        .map(normalizePersistedResponse)
        .filter((response): response is GroupModelResponse => Boolean(response))
    : [];

  if (
    typeof value.id !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.createdAt !== 'string' ||
    responses.length === 0
  ) {
    return null;
  }

  return {
    attachments: Array.isArray(value.attachments)
      ? value.attachments
          .map(normalizePersistedAttachment)
          .filter((attachment): attachment is GroupChatAttachment => Boolean(attachment))
      : [],
    content: value.content,
    createdAt: value.createdAt,
    id: value.id,
    responses,
  };
}

function normalizePersistedResponse(value: unknown): GroupModelResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const status = normalizePersistedResponseStatus(value.status);

  if (
    typeof value.alias !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.displayName !== 'string' ||
    typeof value.id !== 'string'
  ) {
    return null;
  }

  const normalizedContent =
    value.content || (status === 'CANCELLED' ? '生成已中断，可重新生成本轮回答' : '');

  return {
    alias: value.alias,
    assistantMessageId: optionalString(value.assistantMessageId),
    content: normalizedContent,
    conversationId: optionalString(value.conversationId),
    createdAt: value.createdAt,
    displayName: value.displayName,
    error: optionalString(value.error),
    id: value.id,
    pointsCost: optionalPositiveNumber(value.pointsCost),
    requestId: optionalString(value.requestId),
    status,
  };
}

function normalizePersistedResponseStatus(value: unknown): GroupModelResponse['status'] {
  if (
    value === 'CANCELLED' ||
    value === 'COMPLETED' ||
    value === 'FAILED' ||
    value === 'PENDING' ||
    value === 'STREAMING'
  ) {
    if (value === 'PENDING' || value === 'STREAMING') {
      return 'CANCELLED';
    }

    return value;
  }

  return 'CANCELLED';
}

function normalizePersistedAttachment(value: unknown): GroupChatAttachment | null {
  if (
    !isRecord(value) ||
    !isRecord(value.file) ||
    typeof value.fileId !== 'string' ||
    typeof value.id !== 'string' ||
    typeof value.sortOrder !== 'number' ||
    typeof value.file.checksum !== 'string' ||
    typeof value.file.createdAt !== 'string' ||
    typeof value.file.id !== 'string' ||
    typeof value.file.mimeType !== 'string' ||
    typeof value.file.originalName !== 'string' ||
    typeof value.file.size !== 'number'
  ) {
    return null;
  }

  return {
    file: {
      checksum: value.file.checksum,
      createdAt: value.file.createdAt,
      id: value.file.id,
      mimeType: value.file.mimeType,
      originalName: value.file.originalName,
      size: value.file.size,
    },
    fileId: value.fileId,
    id: value.id,
    sortOrder: value.sortOrder,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}
