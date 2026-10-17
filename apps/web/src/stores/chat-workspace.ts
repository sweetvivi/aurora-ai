import { defineStore } from 'pinia';
import {
  ApiError,
  type ChatModel,
  type ConversationMessage,
  type ConversationSummary,
  fetchConversation,
  fetchConversations,
  fetchModels,
  streamChat,
} from '@/app/api';
import { useSessionStore } from './session';

export type ChatMessageStatus = 'COMPLETED' | 'FAILED' | 'PENDING' | 'STREAMING';
export type ChatWorkspaceStatus = 'error' | 'idle' | 'loading' | 'ready' | 'streaming';

export interface ChatThreadMessage {
  content: string;
  createdAt: string;
  id: string;
  role: 'assistant' | 'user';
  status: ChatMessageStatus;
}

export interface ChatWorkspaceError {
  code: string;
  message: string;
  recoverable: boolean;
  requestId?: string;
}

interface ChatWorkspaceState {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  error: ChatWorkspaceError | null;
  initialized: boolean;
  messages: ChatThreadMessage[];
  models: ChatModel[];
  selectedModelAlias: string;
  status: ChatWorkspaceStatus;
}

let activeStreamController: AbortController | null = null;

export const useChatWorkspaceStore = defineStore('chat-workspace', {
  state: (): ChatWorkspaceState => ({
    conversations: [],
    currentConversationId: null,
    error: null,
    initialized: false,
    messages: [],
    models: [],
    selectedModelAlias: '',
    status: 'idle',
  }),
  getters: {
    streaming: (state) => state.status === 'streaming',
    hasMessages: (state) => state.messages.length > 0,
    selectedModel: (state) =>
      state.models.find((model) => model.alias === state.selectedModelAlias),
  },
  actions: {
    async initialize(): Promise<void> {
      if (this.initialized) {
        return;
      }

      const sessionStore = useSessionStore();
      this.status = 'loading';

      if (!sessionStore.authenticated) {
        await sessionStore.bootstrap();
      }

      if (!sessionStore.authenticated) {
        this.error = {
          code: sessionStore.error?.code ?? 'AUTH_REQUIRED',
          message: sessionStore.error?.message ?? '请先登录后再开始对话',
          recoverable: true,
        };
        this.status = 'error';
        return;
      }

      try {
        await Promise.all([this.loadModels(), this.loadConversations()]);
        this.initialized = true;
        this.status = 'ready';
      } catch (error) {
        this.error = normalizeChatError(error);
        this.status = 'error';
      }
    },
    async loadModels(): Promise<void> {
      const models = await fetchModels('chat');

      this.models = models;

      if (!models.some((model) => model.alias === this.selectedModelAlias)) {
        this.selectedModelAlias = models[0]?.alias ?? '';
      }
    },
    async loadConversations(): Promise<void> {
      this.conversations = await fetchConversations();
    },
    newConversation(): void {
      this.stopStreaming();
      this.currentConversationId = null;
      this.error = null;
      this.messages = [];
      this.status = 'ready';
    },
    async openConversation(conversationId: string): Promise<void> {
      if (conversationId === this.currentConversationId && this.messages.length > 0) {
        return;
      }

      this.stopStreaming();
      this.currentConversationId = conversationId;
      this.error = null;
      this.messages = [];
      this.status = 'loading';

      try {
        const conversation = await fetchConversation(conversationId);

        this.messages = conversation.messages.map(mapConversationMessage);
        this.selectedModelAlias = conversation.modelAlias || this.selectedModelAlias;
        this.status = 'ready';
      } catch (error) {
        this.error = normalizeChatError(error);
        this.status = 'error';
      }
    },
    async sendMessage(rawContent: string): Promise<void> {
      const content = rawContent.trim();

      if (!content || this.streaming) {
        return;
      }

      const sessionStore = useSessionStore();

      if (!sessionStore.authenticated) {
        await sessionStore.bootstrap();

        if (!sessionStore.authenticated) {
          this.error = {
            code: 'AUTH_REQUIRED',
            message: '请先登录后再开始对话',
            recoverable: true,
          };
          return;
        }
      }

      const createdAt = new Date().toISOString();
      const assistantMessageId = createLocalId('assistant');
      const balanceBeforeRequest = sessionStore.points;

      this.error = null;
      this.messages.push(
        {
          content,
          createdAt,
          id: createLocalId('user'),
          role: 'user',
          status: 'COMPLETED',
        },
        {
          content: '',
          createdAt,
          id: assistantMessageId,
          role: 'assistant',
          status: 'STREAMING',
        },
      );
      this.status = 'streaming';
      activeStreamController = new AbortController();

      try {
        await streamChat(
          {
            content,
            conversationId: this.currentConversationId ?? undefined,
            modelAlias: this.selectedModelAlias || undefined,
          },
          {
            onDelta: (event) => {
              const message = this.messages.find((item) => item.id === assistantMessageId);

              if (message) {
                message.content += event.content;
              }
            },
            onDone: (event) => {
              const message = this.messages.find((item) => item.id === assistantMessageId);

              if (message) {
                message.id = event.assistantMessageId;
                message.status = 'COMPLETED';
              }

              sessionStore.updatePoints(event.balance);
              void this.loadConversations().catch(() => undefined);
            },
            onError: (event) => {
              const message = this.messages.find((item) => item.id === assistantMessageId);

              if (message) {
                message.content ||= event.message;
                message.status = 'FAILED';
              }

              sessionStore.updatePoints(event.balance);
              this.error = {
                code: event.code,
                message: event.message,
                recoverable: isRecoverableCode(event.code),
                requestId: event.requestId,
              };
            },
            onMeta: (event) => {
              this.currentConversationId = event.conversationId;
              this.selectedModelAlias = event.modelAlias;
              sessionStore.updatePoints(event.balance);
            },
          },
          activeStreamController.signal,
        );
      } catch (error) {
        const message = this.messages.find((item) => item.id === assistantMessageId);

        if (isAbortError(error)) {
          if (message) {
            message.content ||= '生成已中断';
            message.status = 'FAILED';
          }

          await refreshBalanceAfterAbort(sessionStore, balanceBeforeRequest);
          this.error = {
            code: 'CLIENT_ABORTED',
            message: '生成已中断，本次积分已退回',
            recoverable: true,
          };
        } else {
          const normalized = normalizeChatError(error);

          if (message) {
            message.content ||= normalized.message;
            message.status = 'FAILED';
          }

          this.error = normalized;
        }
      } finally {
        activeStreamController = null;
        this.status = this.error ? 'error' : 'ready';
      }
    },
    stopStreaming(): void {
      activeStreamController?.abort();
      activeStreamController = null;
    },
  },
});

function mapConversationMessage(message: ConversationMessage): ChatThreadMessage {
  return {
    content: message.content || (message.status === 'FAILED' ? '生成失败' : ''),
    createdAt: message.createdAt,
    id: message.id,
    role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
    status: message.status === 'PENDING' ? 'PENDING' : message.status,
  };
}

function normalizeChatError(error: unknown): ChatWorkspaceError {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      requestId: error.requestId,
    };
  }

  return {
    code: 'CHAT_REQUEST_FAILED',
    message: error instanceof Error ? error.message : '对话请求失败，请稍后重试',
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

function isRecoverableCode(code: string): boolean {
  return (
    code === 'CLIENT_ABORTED' ||
    code === 'NETWORK_ERROR' ||
    code.startsWith('LLM_') ||
    code === 'CHAT_STREAM_UNAVAILABLE'
  );
}

function createLocalId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart}`;
}

async function refreshBalanceAfterAbort(
  sessionStore: ReturnType<typeof useSessionStore>,
  balanceBeforeRequest: number,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sessionStore.refreshProfile();

    if (sessionStore.points >= balanceBeforeRequest) {
      return;
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 150 * (attempt + 1));
    });
  }
}
