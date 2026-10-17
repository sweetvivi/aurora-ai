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
  createdAt: string;
  displayName: string;
  error?: string;
  id: string;
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

export const useGroupChatWorkspaceStore = defineStore('group-chat-workspace', {
  state: (): GroupChatState => ({
    error: null,
    initialized: false,
    models: [],
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
      if (this.initialized) {
        return;
      }

      const sessionStore = useSessionStore();
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

      this.initialized = true;
      this.status = 'ready';
    },
    syncModels(models: ChatModel[]): void {
      this.models = models;

      const availableAliases = new Set(models.map((model) => model.alias));
      const retained = this.selectedAliases.filter((alias) => availableAliases.has(alias));
      const defaults = models.slice(0, 10).map((model) => model.alias);

      this.selectedAliases = retained.length > 0 ? retained : defaults;
    },
    toggleModel(alias: string): void {
      if (!this.models.some((model) => model.alias === alias)) {
        return;
      }

      if (this.selectedAliases.includes(alias)) {
        this.selectedAliases = this.selectedAliases.filter((item) => item !== alias);
        return;
      }

      if (this.selectedAliases.length < 10) {
        this.selectedAliases = [...this.selectedAliases, alias];
      }
    },
    selectAllModels(): void {
      this.selectedAliases = this.models.slice(0, 10).map((model) => model.alias);
    },
    clearModels(): void {
      this.selectedAliases = [];
    },
    clearConversation(): void {
      this.stopAll();
      this.error = null;
      this.rounds = [];
      this.status = 'ready';
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
      const responses = selectedModels.map((model) => ({
        alias: model.alias,
        content: '',
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

      try {
        await streamChat(
          {
            content: input.content,
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
            },
            onMeta: (event) => {
              const target = this.findResponse(roundId, responseId);

              if (target) {
                target.assistantMessageId = event.assistantMessageId;
                target.requestId = event.requestId;
              }

              sessionStore.updatePoints(event.balance);
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
        createdAt: new Date().toISOString(),
        displayName: response.displayName,
        id: createLocalId('group-response'),
        status: 'PENDING',
      }));
      this.status = 'streaming';

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
        })
        .finally(() => {
          activeControllers = new Map();
        });
    },
    stopAll(): void {
      for (const controller of activeControllers.values()) {
        controller.abort();
      }

      activeControllers = new Map();

      if (this.status === 'streaming') {
        this.status = 'ready';
      }
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
