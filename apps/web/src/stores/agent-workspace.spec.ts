import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  clearAuthSession: vi.fn(),
  devLogin: vi.fn(),
  emailLogin: vi.fn(),
  emailRegister: vi.fn(),
  fetchAgents: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchModels: vi.fn(),
  getRefreshToken: vi.fn(),
  hasStoredTokens: vi.fn(),
  logout: vi.fn(),
  publishAgent: vi.fn(),
  saveAgent: vi.fn(),
  setAuthSession: vi.fn(),
  streamChat: vi.fn(),
  updateAgent: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import { getAgentById } from '@/data/agents';
import { useAgentWorkspaceStore } from './agent-workspace';
import { useSessionStore } from './session';

const authenticatedUser = {
  displayName: '测试用户',
  email: 'agent@example.com',
  id: 'user-agent',
  pointsBalance: 100,
  role: 'USER' as const,
  status: 'ACTIVE' as const,
};

describe('agent workspace store', () => {
  let persistedAgents: Map<string, Record<string, unknown>>;

  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.clearAllMocks();
    persistedAgents = new Map();

    apiMocks.fetchAgents.mockImplementation(async () => [...persistedAgents.values()]);
    apiMocks.saveAgent.mockImplementation(async (input: Record<string, unknown>) => {
      const id =
        typeof input.id === 'string' && input.id
          ? input.id
          : `persisted-agent-${persistedAgents.size + 1}`;
      const existing = persistedAgents.get(id);
      const agent = {
        ...input,
        category: '我的智能体',
        createdAt: existing?.createdAt ?? '2026-10-18T00:00:00.000Z',
        id,
        publishedAt: existing?.publishedAt ?? null,
        rating: 5,
        status: existing?.status ?? 'DRAFT',
        updatedAt: '2026-10-18T00:00:00.000Z',
        usage: 0,
      };

      persistedAgents.set(id, agent);
      return agent;
    });
    apiMocks.publishAgent.mockImplementation(async (agentId: string) => {
      const agent = persistedAgents.get(agentId);

      if (!agent) {
        throw new Error('智能体不存在');
      }

      const publishedAgent = {
        ...agent,
        publishedAt: '2026-10-18T00:00:00.000Z',
        status: 'PUBLISHED',
        updatedAt: '2026-10-18T00:00:00.000Z',
      };

      persistedAgents.set(agentId, publishedAgent);
      return publishedAgent;
    });

    apiMocks.fetchModels.mockResolvedValue([
      {
        alias: 'openai-gpt-6-astra',
        capabilities: ['chat'],
        displayName: '极光对话',
      },
    ]);
    apiMocks.hasStoredTokens.mockReturnValue(true);
  });

  it('restores favorites and published agents in a new store instance', async () => {
    const store = useAgentWorkspaceStore();

    store.toggleFavorite('visual-prompt');
    await store.publishDraft({
      capabilities: ['web-search', 'smart-chart'],
      description: '整理产品需求并输出验收清单。',
      id: 'custom-product-helper',
      instructions: '先澄清目标，再输出结构化结果。',
      name: '产品验收助手',
      opening: '告诉我产品目标，我会整理验收范围。',
      published: false,
      starterPrompts: ['整理验收清单'],
      tags: ['产品', '验收'],
    });

    setActivePinia(createPinia());

    const restoredStore = useAgentWorkspaceStore();

    await restoredStore.initialize();

    expect(restoredStore.favoriteAgentIds).toEqual(['visual-prompt']);
    expect(restoredStore.customAgents).toEqual([
      expect.objectContaining({
        category: '我的智能体',
        capabilities: ['web-search', 'smart-chart'],
        id: 'custom-product-helper',
        name: '产品验收助手',
      }),
    ]);
  });

  it('migrates legacy local agents to the server without duplicating existing ids', async () => {
    window.localStorage.setItem(
      'aurora:agent-workspace:v1',
      JSON.stringify({
        customAgents: [
          {
            capabilities: ['web-search'],
            category: '我的智能体',
            color: '#3979ed',
            description: '旧版本地智能体',
            glyph: '旧',
            id: 'legacy-agent',
            instructions: '先确认目标，再整理结果。',
            name: '旧版助手',
            opening: '你好，我可以整理信息。',
            rating: 5,
            starterPrompts: ['整理今天的资料'],
            tags: ['迁移'],
            usage: 0,
          },
        ],
        drafts: [],
        favoriteAgentIds: [],
        modelAlias: '',
        sessions: [],
      }),
    );
    persistedAgents.set('existing-agent', {
      capabilities: [],
      category: '我的智能体',
      color: '#3979ed',
      createdAt: '2026-10-18T00:00:00.000Z',
      description: '服务端已有智能体',
      glyph: '服',
      id: 'existing-agent',
      instructions: '',
      name: '服务端助手',
      opening: '',
      publishedAt: null,
      rating: 5,
      starterPrompts: [],
      status: 'DRAFT',
      tags: [],
      updatedAt: '2026-10-18T00:00:00.000Z',
      usage: 0,
    });

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const store = useAgentWorkspaceStore();

    await store.initialize();

    expect(apiMocks.saveAgent).toHaveBeenCalledTimes(1);
    expect(apiMocks.saveAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'legacy-agent',
        name: '旧版助手',
      }),
    );
    expect(store.customAgents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'existing-agent' }),
        expect.objectContaining({ id: 'legacy-agent' }),
      ]),
    );
  });

  it('surfaces server save errors instead of pretending the draft was saved', async () => {
    apiMocks.saveAgent.mockRejectedValueOnce(new Error('智能体保存接口不可用'));
    const store = useAgentWorkspaceStore();
    const draft = {
      capabilities: ['web-search'] as const,
      description: '测试错误状态',
      id: 'failing-agent',
      instructions: '输出结构化结果。',
      name: '失败助手',
      opening: '你好',
      published: false,
      starterPrompts: ['开始'],
      tags: ['测试'],
    };

    await expect(
      store.saveDraft({ ...draft, capabilities: [...draft.capabilities] }),
    ).rejects.toThrow('智能体保存接口不可用');

    expect(store.error).toBe('智能体保存接口不可用');
    expect(store.status).toBe('error');
    expect(store.customAgents).toEqual([]);
  });

  it('streams a real agent response with ephemeral agent instructions', async () => {
    const agent = {
      ...getAgentById('code-mentor')!,
      instructions: '先定位根因，再给出可直接修改的代码和测试。',
    };

    apiMocks.streamChat.mockImplementation(
      async (
        input: {
          content: string;
          conversationId?: string;
          modelAlias?: string;
          systemPrompt?: string;
        },
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
        expect(input).toMatchObject({
          content: '帮我定位空指针',
          modelAlias: 'openai-gpt-6-astra',
          systemPrompt: expect.stringContaining('工作规则：先定位根因'),
        });
        expect(input.conversationId).toBeUndefined();

        handlers.onMeta({
          assistantMessageId: 'assistant-agent-1',
          balance: 99,
          conversationId: 'conversation-agent-1',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: 'request-agent-1',
        });
        handlers.onDelta({ content: '先检查' });
        handlers.onDelta({ content: '调用栈。' });
        handlers.onDone({
          assistantMessageId: 'assistant-agent-1',
          balance: 99,
          requestId: 'request-agent-1',
          status: 'COMPLETED',
        });
      },
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const store = useAgentWorkspaceStore();

    await store.initialize();
    const session = await store.sendMessage(agent, '帮我定位空指针');

    expect(session.messages).toHaveLength(2);
    expect(session.messages[1]).toMatchObject({
      content: '先检查调用栈。',
      id: 'assistant-agent-1',
      role: 'assistant',
      status: 'COMPLETED',
    });
    expect(session.conversationId).toBe('conversation-agent-1');
    expect(session.modelAlias).toBe('openai-gpt-6-astra');
    expect(sessionStore.points).toBe(99);
    expect(store.status).toBe('ready');
    expect(store.streamingSessionId).toBeNull();
  });

  it('keeps the stream error in the session and applies the refunded balance', async () => {
    const agent = getAgentById('document-editor')!;

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
          assistantMessageId: 'assistant-agent-error',
          balance: 99,
          conversationId: 'conversation-agent-error',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: 'request-agent-error',
        });
        handlers.onError({
          balance: 100,
          code: 'LLM_TIMEOUT',
          message: '模型响应超时，本次积分已退回',
          refunded: true,
          requestId: 'request-agent-error',
        });
      },
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const store = useAgentWorkspaceStore();

    await store.initialize();
    const session = await store.sendMessage(agent, '整理这份会议记录');

    expect(session.messages[1]).toMatchObject({
      content: '模型响应超时，本次积分已退回',
      status: 'FAILED',
    });
    expect(sessionStore.points).toBe(100);
    expect(store.error).toBe('模型响应超时，本次积分已退回');
    expect(store.status).toBe('error');
  });

  it('restores interrupted messages as failed after a restart', () => {
    window.localStorage.setItem(
      'aurora:agent-workspace:v1',
      JSON.stringify({
        customAgents: [],
        drafts: [],
        favoriteAgentIds: [],
        modelAlias: 'openai-gpt-6-astra',
        sessions: [
          {
            agentId: 'code-mentor',
            conversationId: 'conversation-restored',
            createdAt: 1,
            id: 'session-restored',
            messages: [
              {
                content: '',
                createdAt: 2,
                id: 'message-pending',
                role: 'assistant',
                status: 'PENDING',
              },
              {
                content: '已经生成了一部分',
                createdAt: 3,
                id: 'message-streaming',
                role: 'assistant',
                status: 'STREAMING',
              },
            ],
            modelAlias: 'openai-gpt-6-astra',
            title: '中断会话',
            updatedAt: 3,
          },
        ],
      }),
    );

    const store = useAgentWorkspaceStore();

    expect(store.sessions[0]?.messages).toEqual([
      expect.objectContaining({
        content: '生成已中断',
        id: 'message-pending',
        status: 'FAILED',
      }),
      expect.objectContaining({
        content: '已经生成了一部分',
        id: 'message-streaming',
        status: 'FAILED',
      }),
    ]);
  });

  it('marks a stopped response as interrupted', async () => {
    const agent = getAgentById('study-planner')!;

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

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const store = useAgentWorkspaceStore();

    await store.initialize();
    const sendPromise = store.sendMessage(agent, '制定 30 天计划');

    await vi.waitFor(() => {
      expect(apiMocks.streamChat).toHaveBeenCalledTimes(1);
    });
    store.stopStreaming();
    const session = await sendPromise;

    expect(session.messages[1]).toMatchObject({
      content: '生成已中断',
      status: 'FAILED',
    });
    expect(store.error).toBe('生成已中断，本次积分已退回');
    expect(store.status).toBe('error');
  });

  it('marks an unexpectedly closed stream as failed instead of leaving it streaming', async () => {
    const agent = getAgentById('code-mentor')!;

    apiMocks.streamChat.mockImplementation(
      async (
        _input: unknown,
        handlers: {
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
          assistantMessageId: 'assistant-agent-closed',
          balance: 99,
          conversationId: 'conversation-agent-closed',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: 'request-agent-closed',
        });
      },
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const store = useAgentWorkspaceStore();

    await store.initialize();
    const session = await store.sendMessage(agent, '检查这段流式代码');

    expect(session.messages[1]).toMatchObject({
      content: '生成连接意外中断，请重试',
      status: 'FAILED',
    });
    expect(store.error).toBe('生成连接意外中断，请重试');
    expect(store.status).toBe('error');
    expect(store.streamingSessionId).toBeNull();
  });

  it('streams into a pre-created session so the detail view can bind it immediately', async () => {
    const agent = getAgentById('visual-prompt')!;
    let finishStream: (() => void) | undefined;

    apiMocks.streamChat.mockImplementation(
      async (
        _input: unknown,
        handlers: {
          onMeta: (event: {
            assistantMessageId: string;
            balance: number;
            conversationId: string;
            modelAlias: string;
            pointsCost: number;
            requestId: string;
          }) => void;
        },
      ) =>
        new Promise<void>((resolve) => {
          finishStream = resolve;
          handlers.onMeta({
            assistantMessageId: 'assistant-agent-visible',
            balance: 99,
            conversationId: 'conversation-agent-visible',
            modelAlias: 'openai-gpt-6-astra',
            pointsCost: 1,
            requestId: 'request-agent-visible',
          });
        }),
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const store = useAgentWorkspaceStore();

    await store.initialize();
    const session = store.createSession(agent.id);
    const sendPromise = store.sendMessage(agent, '生成一张赛博城市海报', session.id);

    await vi.waitFor(() => {
      expect(store.streamingSessionId).toBe(session.id);
    });
    expect(store.sessions.find((item) => item.id === session.id)?.messages).toEqual([
      expect.objectContaining({ role: 'user', content: '生成一张赛博城市海报' }),
      expect.objectContaining({ role: 'assistant', status: 'STREAMING' }),
    ]);

    finishStream?.();
    await sendPromise;
  });

  it('regenerates the final response without appending a duplicate user message', async () => {
    const agent = getAgentById('code-mentor')!;
    let requestCount = 0;

    apiMocks.streamChat.mockImplementation(
      async (
        input: { content: string },
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
        requestCount += 1;
        const suffix = requestCount === 1 ? '第一次回答' : '重新生成的回答';

        expect(input.content).toBe('解释这段代码');
        handlers.onMeta({
          assistantMessageId: `assistant-regenerate-${requestCount}`,
          balance: 100 - requestCount,
          conversationId: 'conversation-regenerate',
          modelAlias: 'openai-gpt-6-astra',
          pointsCost: 1,
          requestId: `request-regenerate-${requestCount}`,
        });
        handlers.onDelta({ content: suffix });
        handlers.onDone({
          assistantMessageId: `assistant-regenerate-${requestCount}`,
          balance: 100 - requestCount,
          requestId: `request-regenerate-${requestCount}`,
          status: 'COMPLETED',
        });
      },
    );

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const store = useAgentWorkspaceStore();

    await store.initialize();
    const session = await store.sendMessage(agent, '解释这段代码');
    const regenerated = await store.regenerateLastResponse(agent, session.id);

    expect(regenerated?.messages).toEqual([
      expect.objectContaining({
        content: '解释这段代码',
        role: 'user',
      }),
      expect.objectContaining({
        content: '重新生成的回答',
        role: 'assistant',
        status: 'COMPLETED',
      }),
    ]);
    expect(apiMocks.streamChat).toHaveBeenCalledTimes(2);
  });
});
