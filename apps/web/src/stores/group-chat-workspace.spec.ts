import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  fetchCurrentUser: vi.fn(),
  hasStoredTokens: vi.fn(),
  streamChat: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import { useGroupChatWorkspaceStore } from './group-chat-workspace';
import { useSessionStore } from './session';

const authenticatedUser = {
  displayName: '多模型测试用户',
  email: 'groups@example.com',
  id: 'user-groups',
  pointsBalance: 100,
  role: 'USER' as const,
  status: 'ACTIVE' as const,
};

const models = [
  { alias: 'model-1', capabilities: ['chat' as const], displayName: '模型一' },
  { alias: 'model-2', capabilities: ['chat' as const], displayName: '模型二' },
  { alias: 'model-3', capabilities: ['chat' as const], displayName: '模型三' },
  { alias: 'model-4', capabilities: ['chat' as const], displayName: '模型四' },
  { alias: 'model-5', capabilities: ['chat' as const], displayName: '模型五' },
  { alias: 'model-6', capabilities: ['chat' as const], displayName: '模型六' },
  { alias: 'model-7', capabilities: ['chat' as const], displayName: '模型七' },
  { alias: 'model-8', capabilities: ['chat' as const], displayName: '模型八' },
  { alias: 'model-9', capabilities: ['chat' as const], displayName: '模型九' },
  { alias: 'model-10', capabilities: ['chat' as const], displayName: '模型十' },
  { alias: 'model-11', capabilities: ['chat' as const], displayName: '模型十一' },
  { alias: 'model-12', capabilities: ['chat' as const], displayName: '模型十二' },
];

type StreamHandlers = {
  onDelta: (event: { content: string }) => void;
  onDone: (event: {
    assistantMessageId: string;
    balance: number;
    requestId: string;
    status: 'COMPLETED';
  }) => void;
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
};

describe('group chat workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.localStorage.clear();
    apiMocks.fetchCurrentUser.mockResolvedValue(authenticatedUser);
    apiMocks.hasStoredTokens.mockReturnValue(true);
  });

  it('selects at most ten models and supports clearing and toggling', async () => {
    const sessionStore = useSessionStore();
    const groupStore = useGroupChatWorkspaceStore();

    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    await groupStore.initialize();
    groupStore.syncModels(models);

    expect(groupStore.selectedAliases).toEqual(models.slice(0, 10).map((model) => model.alias));

    groupStore.selectAllModels();
    expect(groupStore.selectedAliases).toHaveLength(10);

    groupStore.clearModels();
    groupStore.toggleModel('model-1');
    groupStore.toggleModel('model-1');

    expect(groupStore.selectedAliases).toEqual([]);
    expect(groupStore.canSend).toBe(false);
  });

  it('runs selected models concurrently and maps each stream independently', async () => {
    apiMocks.streamChat.mockImplementation(
      async (input: { modelAlias: string }, handlers: StreamHandlers) => {
        handlers.onMeta({
          assistantMessageId: `assistant-${input.modelAlias}`,
          balance: 99,
          conversationId: `conversation-${input.modelAlias}`,
          modelAlias: input.modelAlias,
          pointsCost: 1,
          requestId: `request-${input.modelAlias}`,
        });
        handlers.onDelta({ content: `来自 ${input.modelAlias} ` });
        handlers.onDelta({ content: '回答' });
        handlers.onDone({
          assistantMessageId: `assistant-${input.modelAlias}`,
          balance: 97,
          requestId: `request-${input.modelAlias}`,
          status: 'COMPLETED',
        });
      },
    );
    apiMocks.fetchCurrentUser.mockResolvedValue({
      ...authenticatedUser,
      pointsBalance: 97,
    });

    const sessionStore = useSessionStore();
    const groupStore = useGroupChatWorkspaceStore();

    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    await groupStore.initialize();
    groupStore.syncModels(models.slice(0, 3));
    await groupStore.sendMessage('同时回答');

    expect(apiMocks.streamChat).toHaveBeenCalledTimes(3);
    expect(groupStore.rounds).toHaveLength(1);
    expect(groupStore.rounds[0]?.responses).toHaveLength(3);
    expect(groupStore.rounds[0]?.responses.map((response) => response.status)).toEqual([
      'COMPLETED',
      'COMPLETED',
      'COMPLETED',
    ]);
    expect(groupStore.rounds[0]?.responses.map((response) => response.content)).toEqual([
      '来自 model-1 回答',
      '来自 model-2 回答',
      '来自 model-3 回答',
    ]);
    expect(sessionStore.points).toBe(97);
    expect(groupStore.status).toBe('ready');
  });

  it('keeps successful model answers when one model fails', async () => {
    apiMocks.streamChat.mockImplementation(
      async (input: { modelAlias: string }, handlers: StreamHandlers) => {
        if (input.modelAlias === 'model-2') {
          handlers.onError({
            balance: 100,
            code: 'LLM_TIMEOUT',
            message: '模型二响应超时',
            refunded: true,
            requestId: 'request-model-2',
          });
          return;
        }

        handlers.onDelta({ content: `${input.modelAlias} 成功` });
        handlers.onDone({
          assistantMessageId: `assistant-${input.modelAlias}`,
          balance: 99,
          requestId: `request-${input.modelAlias}`,
          status: 'COMPLETED',
        });
      },
    );
    apiMocks.fetchCurrentUser.mockResolvedValue({
      ...authenticatedUser,
      pointsBalance: 100,
    });

    const sessionStore = useSessionStore();
    const groupStore = useGroupChatWorkspaceStore();

    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    await groupStore.initialize();
    groupStore.syncModels(models.slice(0, 3));
    await groupStore.sendMessage('部分失败');

    expect(groupStore.rounds[0]?.responses.map((response) => response.status)).toEqual([
      'COMPLETED',
      'FAILED',
      'COMPLETED',
    ]);
    expect(groupStore.rounds[0]?.responses[1]).toMatchObject({
      content: '模型二响应超时',
      error: '模型二响应超时',
    });
    expect(sessionStore.points).toBe(100);
    expect(groupStore.status).toBe('ready');
  });

  it('marks pending models as cancelled and refreshes points after stopping', async () => {
    apiMocks.streamChat.mockImplementation(
      async (input: { modelAlias: string }, handlers: StreamHandlers, signal: AbortSignal) => {
        if (input.modelAlias === 'model-1') {
          handlers.onDelta({ content: '已完成' });
          handlers.onDone({
            assistantMessageId: 'assistant-model-1',
            balance: 99,
            requestId: 'request-model-1',
            status: 'COMPLETED',
          });
          return;
        }

        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true },
          );
        });
      },
    );
    apiMocks.fetchCurrentUser.mockResolvedValue({
      ...authenticatedUser,
      pointsBalance: 100,
    });

    const sessionStore = useSessionStore();
    const groupStore = useGroupChatWorkspaceStore();

    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    await groupStore.initialize();
    groupStore.syncModels(models.slice(0, 2));
    const sendPromise = groupStore.sendMessage('停止测试');

    await Promise.resolve();
    groupStore.stopAll();
    await sendPromise;

    expect(groupStore.rounds[0]?.responses.map((response) => response.status)).toEqual([
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(groupStore.rounds[0]?.responses[1]).toMatchObject({
      content: '已停止生成，本次积分已退回',
      error: '已停止生成',
    });
    expect(apiMocks.fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(sessionStore.points).toBe(100);
    expect(groupStore.status).toBe('ready');
  });

  it('restores saved rounds and continues each model conversation after a reload', async () => {
    const streamInputs: Array<{ conversationId?: string; modelAlias: string }> = [];

    apiMocks.streamChat.mockImplementation(
      async (input: { conversationId?: string; modelAlias: string }, handlers: StreamHandlers) => {
        streamInputs.push({
          conversationId: input.conversationId,
          modelAlias: input.modelAlias,
        });
        handlers.onMeta({
          assistantMessageId: `assistant-${input.modelAlias}`,
          balance: 99,
          conversationId: `conversation-${input.modelAlias}`,
          modelAlias: input.modelAlias,
          pointsCost: 1,
          requestId: `request-${input.modelAlias}`,
        });
        handlers.onDelta({ content: `${input.modelAlias} 回答` });
        handlers.onDone({
          assistantMessageId: `assistant-${input.modelAlias}`,
          balance: 99,
          requestId: `request-${input.modelAlias}`,
          status: 'COMPLETED',
        });
      },
    );

    const firstSessionStore = useSessionStore();
    const firstGroupStore = useGroupChatWorkspaceStore();

    firstSessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    await firstGroupStore.initialize();
    firstGroupStore.syncModels(models.slice(0, 2));
    await firstGroupStore.sendMessage('第一轮问题');

    setActivePinia(createPinia());

    const restoredSessionStore = useSessionStore();
    const restoredGroupStore = useGroupChatWorkspaceStore();

    restoredSessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    await restoredGroupStore.initialize();
    restoredGroupStore.syncModels(models.slice(0, 2));

    expect(restoredGroupStore.rounds).toHaveLength(1);
    expect(restoredGroupStore.rounds[0]?.content).toBe('第一轮问题');
    expect(restoredGroupStore.rounds[0]?.responses[0]).toMatchObject({
      content: 'model-1 回答',
      conversationId: 'conversation-model-1',
      status: 'COMPLETED',
    });
    expect(restoredGroupStore.selectedAliases).toEqual(['model-1', 'model-2']);

    await restoredGroupStore.sendMessage('第二轮问题');

    expect(streamInputs[2]).toEqual({
      conversationId: 'conversation-model-1',
      modelAlias: 'model-1',
    });
    expect(streamInputs[3]).toEqual({
      conversationId: 'conversation-model-2',
      modelAlias: 'model-2',
    });
    expect(restoredGroupStore.rounds).toHaveLength(2);
  });

  it('clears the previous workspace when a different user signs in', async () => {
    const sessionStore = useSessionStore();
    const groupStore = useGroupChatWorkspaceStore();

    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });

    await groupStore.initialize();
    groupStore.syncModels(models.slice(0, 2));
    groupStore.$patch({
      rounds: [
        {
          attachments: [],
          content: '第一位用户的问题',
          createdAt: '2026-10-18T00:00:00.000Z',
          id: 'private-round',
          responses: [
            {
              alias: 'model-1',
              content: '第一位用户可见的回答',
              createdAt: '2026-10-18T00:00:00.000Z',
              displayName: '模型一',
              id: 'private-response',
              status: 'COMPLETED',
            },
          ],
        },
      ],
    });
    groupStore.persistWorkspace();

    sessionStore.$patch({
      user: {
        ...authenticatedUser,
        email: 'second-user@example.com',
        id: 'user-groups-second',
      },
    });

    await groupStore.initialize();

    expect(groupStore.rounds).toEqual([]);
    expect(groupStore.selectedAliases).toEqual(['model-1', 'model-2']);
  });
});
