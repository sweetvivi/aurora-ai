import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  clearAuthSession: vi.fn(),
  devLogin: vi.fn(),
  emailLogin: vi.fn(),
  emailRegister: vi.fn(),
  fetchConversation: vi.fn(),
  fetchConversations: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchModels: vi.fn(),
  getRefreshToken: vi.fn(),
  hasStoredTokens: vi.fn(),
  logout: vi.fn(),
  setAuthSession: vi.fn(),
  streamChat: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import { useChatWorkspaceStore } from './chat-workspace';
import { useSessionStore } from './session';

const authenticatedUser = {
  displayName: '测试用户',
  email: 'chat@example.com',
  id: 'user-chat',
  pointsBalance: 100,
  role: 'USER' as const,
  status: 'ACTIVE' as const,
};

describe('chat workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.clearAllMocks();

    apiMocks.fetchModels.mockResolvedValue([
      {
        alias: 'openai-gpt-6-astra',
        capabilities: ['chat'],
        displayName: '极光对话',
      },
    ]);
    apiMocks.fetchConversations.mockResolvedValue([]);
    apiMocks.hasStoredTokens.mockReturnValue(true);
    apiMocks.fetchCurrentUser.mockResolvedValue(authenticatedUser);
  });

  it('maps SSE metadata, deltas and completion into the active thread', async () => {
    apiMocks.streamChat.mockImplementation(
      async (
        _input: unknown,
        handlers: {
          onDelta: (event: { content: string }) => void;
          onDone: (event: {
            assistantMessageId: string;
            balance: number;
            requestId: string;
            status: 'COMPLETED';
          }) => void;
          onMeta: (event: {
            assistantMessageId: string;
            balance: number;
            conversationId: string;
            modelAlias: string;
            pointsCost: number;
            requestId: string;
          }) => void;
        },
      ) => {
        handlers.onMeta({
          assistantMessageId: 'assistant-1',
          balance: 99,
          conversationId: 'conversation-1',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: 'request-1',
        });
        handlers.onDelta({ content: '你' });
        handlers.onDelta({ content: '好' });
        handlers.onDone({
          assistantMessageId: 'assistant-1',
          balance: 99,
          requestId: 'request-1',
          status: 'COMPLETED',
        });
      },
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const chatStore = useChatWorkspaceStore();

    await chatStore.initialize();
    apiMocks.fetchConversations.mockClear();

    await chatStore.sendMessage('你好');

    expect(chatStore.messages).toHaveLength(2);
    expect(chatStore.messages[0]).toMatchObject({
      content: '你好',
      role: 'user',
      status: 'COMPLETED',
    });
    expect(chatStore.messages[1]).toMatchObject({
      content: '你好',
      id: 'assistant-1',
      role: 'assistant',
      status: 'COMPLETED',
    });
    expect(chatStore.currentConversationId).toBe('conversation-1');
    expect(sessionStore.points).toBe(99);
    expect(apiMocks.fetchConversations).toHaveBeenCalledTimes(1);
    expect(chatStore.status).toBe('ready');
  });

  it('marks a stream error as retryable and applies the refunded balance', async () => {
    apiMocks.streamChat.mockImplementation(
      async (
        _input: unknown,
        handlers: {
          onError: (event: {
            balance: number;
            code: string;
            message: string;
            refunded: boolean;
            requestId: string;
          }) => void;
          onMeta: (event: {
            assistantMessageId: string;
            balance: number;
            conversationId: string;
            modelAlias: string;
            pointsCost: number;
            requestId: string;
          }) => void;
        },
      ) => {
        handlers.onMeta({
          assistantMessageId: 'assistant-error',
          balance: 99,
          conversationId: 'conversation-error',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: 'request-error',
        });
        handlers.onError({
          balance: 100,
          code: 'LLM_TIMEOUT',
          message: '模型响应超时，本次积分已退回',
          refunded: true,
          requestId: 'request-error',
        });
      },
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const chatStore = useChatWorkspaceStore();

    await chatStore.initialize();
    await chatStore.sendMessage('超时测试');

    expect(chatStore.messages[1]).toMatchObject({
      content: '模型响应超时，本次积分已退回',
      status: 'FAILED',
    });
    expect(chatStore.error).toMatchObject({
      code: 'LLM_TIMEOUT',
      recoverable: true,
    });
    expect(sessionStore.points).toBe(100);
    expect(chatStore.status).toBe('error');
  });

  it('returns the reserved points after the user stops generation', async () => {
    apiMocks.streamChat.mockImplementation(
      async (_input: unknown, _handlers: unknown, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true },
          );
        }),
    );
    apiMocks.fetchCurrentUser.mockResolvedValue(authenticatedUser);

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: {
        ...authenticatedUser,
        pointsBalance: 99,
      },
    });
    const chatStore = useChatWorkspaceStore();

    await chatStore.initialize();
    const sendPromise = chatStore.sendMessage('停止生成');

    await Promise.resolve();
    sessionStore.updatePoints(99);
    chatStore.stopStreaming();
    await sendPromise;

    expect(apiMocks.fetchCurrentUser).toHaveBeenCalled();
    expect(sessionStore.points).toBe(100);
    expect(chatStore.messages[1]).toMatchObject({
      content: '生成已中断',
      status: 'FAILED',
    });
    expect(chatStore.error).toMatchObject({
      code: 'CLIENT_ABORTED',
      recoverable: true,
    });
  });

  it('regenerates the latest reply without duplicating the user message', async () => {
    apiMocks.streamChat.mockImplementation(
      async (
        _input: unknown,
        handlers: {
          onDone: (event: {
            assistantMessageId: string;
            balance: number;
            requestId: string;
            status: 'COMPLETED';
          }) => void;
          onMeta: (event: {
            assistantMessageId: string;
            balance: number;
            conversationId: string;
            modelAlias: string;
            pointsCost: number;
            requestId: string;
          }) => void;
        },
      ) => {
        const assistantMessageId = `assistant-${apiMocks.streamChat.mock.calls.length}`;

        handlers.onMeta({
          assistantMessageId,
          balance: 99,
          conversationId: 'conversation-regenerate',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: assistantMessageId,
        });
        handlers.onDone({
          assistantMessageId,
          balance: 99,
          requestId: assistantMessageId,
          status: 'COMPLETED',
        });
      },
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const chatStore = useChatWorkspaceStore();

    await chatStore.initialize();
    await chatStore.sendMessage('需要重试的问题');

    expect(chatStore.messages).toHaveLength(2);

    await chatStore.regenerateLastResponse();

    expect(chatStore.messages).toHaveLength(2);
    expect(chatStore.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(chatStore.messages.filter((message) => message.role === 'user')).toHaveLength(1);
    expect(apiMocks.streamChat).toHaveBeenCalledTimes(2);
  });

  it('sends file ids and restores attachment metadata from conversation history', async () => {
    let streamInput: unknown;

    apiMocks.streamChat.mockImplementation(
      async (
        input: unknown,
        handlers: {
          onDone: (event: {
            assistantMessageId: string;
            balance: number;
            requestId: string;
            status: 'COMPLETED';
          }) => void;
          onMeta: (event: {
            assistantMessageId: string;
            balance: number;
            conversationId: string;
            modelAlias: string;
            pointsCost: number;
            requestId: string;
          }) => void;
        },
      ) => {
        streamInput = input;
        handlers.onMeta({
          assistantMessageId: 'assistant-attachment',
          balance: 99,
          conversationId: 'conversation-attachment',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: 'request-attachment',
        });
        handlers.onDone({
          assistantMessageId: 'assistant-attachment',
          balance: 99,
          requestId: 'request-attachment',
          status: 'COMPLETED',
        });
      },
    );

    const file = {
      checksum: 'checksum',
      createdAt: '2026-10-18T00:00:00.000Z',
      id: 'file-1',
      mimeType: 'image/png',
      originalName: 'reference.png',
      size: 128,
    };
    const localAttachment = {
      file,
      fileId: file.id,
      id: 'local-attachment',
      previewUrl: 'blob:preview',
      sortOrder: 0,
    };
    const sessionStore = useSessionStore();

    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    const chatStore = useChatWorkspaceStore();

    await chatStore.initialize();
    await chatStore.sendMessage('请分析图片', {
      attachments: [localAttachment],
      reasoningEffort: 'high',
      taskMode: true,
    });

    expect(streamInput).toMatchObject({
      fileIds: ['file-1'],
      reasoningEffort: 'high',
      taskMode: true,
    });
    expect(chatStore.messages[0]?.attachments[0]).toMatchObject(localAttachment);

    apiMocks.fetchConversation.mockResolvedValue({
      createdAt: '2026-10-18T00:00:00.000Z',
      id: 'conversation-history',
      lastMessageAt: '2026-10-18T00:01:00.000Z',
      messages: [
        {
          attachments: [
            {
              file,
              fileId: file.id,
              id: 'persisted-attachment',
              sortOrder: 0,
            },
          ],
          content: '请分析图片',
          createdAt: '2026-10-18T00:01:00.000Z',
          id: 'message-1',
          role: 'USER',
          status: 'COMPLETED',
        },
      ],
      modelAlias: 'openai-gpt-6-astra',
      title: '图片分析',
      updatedAt: '2026-10-18T00:01:00.000Z',
      userId: authenticatedUser.id,
    });

    await chatStore.openConversation('conversation-history');

    expect(chatStore.messages[0]?.attachments[0]).toMatchObject({
      file,
      fileId: file.id,
      id: 'persisted-attachment',
      sortOrder: 0,
    });
  });
});
