import { defineStore } from 'pinia';
import {
  fetchAgents,
  fetchModels,
  publishAgent,
  saveAgent,
  streamChat,
  type PersistedAgent,
  type SaveAgentInput,
} from '@/app/api';
import {
  agentCapabilityOptions,
  type AgentCapabilityId,
  type AgentCatalogItem,
} from '@/data/agents';
import { useSessionStore } from './session';

export type AgentMessageStatus = 'COMPLETED' | 'FAILED' | 'PENDING' | 'STREAMING';

export interface AgentMessage {
  content: string;
  createdAt: number;
  id: string;
  role: 'assistant' | 'user';
  status: AgentMessageStatus;
}

export interface AgentSession {
  agentId: string;
  conversationId: string | null;
  createdAt: number;
  id: string;
  messages: AgentMessage[];
  modelAlias: string;
  title: string;
  updatedAt: number;
}

export interface AgentSendOptions {
  appendUser?: boolean;
}

export interface AgentDraft {
  capabilities: AgentCapabilityId[];
  description: string;
  id: string;
  instructions: string;
  name: string;
  opening: string;
  published: boolean;
  starterPrompts: string[];
  tags: string[];
}

interface AgentWorkspaceState {
  customAgents: AgentCatalogItem[];
  drafts: AgentDraft[];
  error: string;
  favoriteAgentIds: string[];
  modelAlias: string;
  sessions: AgentSession[];
  status: 'error' | 'idle' | 'loading' | 'ready' | 'streaming';
  streamingSessionId: string | null;
}

const AGENT_WORKSPACE_STORAGE_KEY = 'aurora:agent-workspace:v1';
const customAgentColors = ['#3979ed', '#198e68', '#c36d2d', '#7c5bd9', '#c54871'];
let activeAgentStreamController: AbortController | null = null;

function emptyWorkspaceState(): AgentWorkspaceState {
  return {
    customAgents: [],
    drafts: [],
    error: '',
    favoriteAgentIds: [],
    modelAlias: '',
    sessions: [],
    status: 'idle',
    streamingSessionId: null,
  };
}

function restoreSessions(value: unknown): AgentSession[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const session = item as Partial<AgentSession>;

    if (
      typeof session.agentId !== 'string' ||
      typeof session.id !== 'string' ||
      typeof session.title !== 'string' ||
      typeof session.createdAt !== 'number' ||
      typeof session.updatedAt !== 'number'
    ) {
      return [];
    }

    const messages = Array.isArray(session.messages)
      ? session.messages.flatMap((messageItem) => {
          const message = messageItem as Partial<AgentMessage>;

          if (
            typeof message.id !== 'string' ||
            typeof message.content !== 'string' ||
            typeof message.createdAt !== 'number' ||
            (message.role !== 'assistant' && message.role !== 'user')
          ) {
            return [];
          }

          const isInterrupted = message.status === 'PENDING' || message.status === 'STREAMING';

          return [
            {
              content: isInterrupted && !message.content ? '生成已中断' : message.content,
              createdAt: message.createdAt,
              id: message.id,
              role: message.role,
              status: isInterrupted ? 'FAILED' : (message.status ?? 'COMPLETED'),
            } satisfies AgentMessage,
          ];
        })
      : [];

    return [
      {
        agentId: session.agentId,
        conversationId: typeof session.conversationId === 'string' ? session.conversationId : null,
        createdAt: session.createdAt,
        id: session.id,
        messages,
        modelAlias: typeof session.modelAlias === 'string' ? session.modelAlias : '',
        title: session.title,
        updatedAt: session.updatedAt,
      } satisfies AgentSession,
    ];
  });
}

function loadWorkspaceState(): AgentWorkspaceState {
  if (typeof window === 'undefined') {
    return emptyWorkspaceState();
  }

  try {
    const rawState = window.localStorage.getItem(AGENT_WORKSPACE_STORAGE_KEY);

    if (!rawState) {
      return emptyWorkspaceState();
    }

    const parsedState = JSON.parse(rawState) as Partial<AgentWorkspaceState>;

    return {
      customAgents: Array.isArray(parsedState.customAgents) ? parsedState.customAgents : [],
      drafts: Array.isArray(parsedState.drafts) ? parsedState.drafts : [],
      favoriteAgentIds: Array.isArray(parsedState.favoriteAgentIds)
        ? parsedState.favoriteAgentIds.filter((id): id is string => typeof id === 'string')
        : [],
      modelAlias: typeof parsedState.modelAlias === 'string' ? parsedState.modelAlias : '',
      sessions: restoreSessions(parsedState.sessions),
      status: 'idle',
      streamingSessionId: null,
      error: '',
    };
  } catch {
    return emptyWorkspaceState();
  }
}

function makeId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

function summarizeTitle(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '新会话';
  }

  return normalized.length > 22 ? `${normalized.slice(0, 22)}…` : normalized;
}

function buildAgentSystemPrompt(agent: AgentCatalogItem): string {
  const capabilityLabels =
    agent.capabilities
      ?.map((capabilityId) => {
        return agentCapabilityOptions.find((option) => option.id === capabilityId)?.label;
      })
      .filter((label): label is string => Boolean(label)) ?? [];

  return [
    `你是“${agent.name}”，一个专注于${agent.category}的智能体。`,
    `角色说明：${agent.description}`,
    agent.instructions ? `工作规则：${agent.instructions}` : '',
    agent.tags.length > 0 ? `能力标签：${agent.tags.join('、')}` : '',
    capabilityLabels.length > 0 ? `启用模块：${capabilityLabels.join('、')}` : '',
    `开场介绍：${agent.opening}`,
    '请始终以第一人称直接回应用户，先解决当前问题，再补充必要说明。',
    '需要更多材料时，请明确列出缺失信息；不得声称已经执行尚未实际执行的外部操作。',
  ]
    .filter(Boolean)
    .join('\n');
}

function cleanList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

function colorForAgent(agentId: string): string {
  const hash = [...agentId].reduce((value, character) => value + character.charCodeAt(0), 0);

  return customAgentColors[hash % customAgentColors.length] ?? '#3979ed';
}

function draftToSaveInput(draft: AgentDraft): SaveAgentInput {
  const name = draft.name.trim() || '未命名智能体';

  return {
    capabilities: [...draft.capabilities],
    color: colorForAgent(draft.id),
    description: draft.description.trim(),
    glyph: name.slice(0, 1) || '智',
    id: draft.id,
    instructions: draft.instructions.trim(),
    name,
    opening: draft.opening.trim(),
    starterPrompts: cleanList(draft.starterPrompts),
    tags: cleanList(draft.tags),
  };
}

function catalogItemToSaveInput(agent: AgentCatalogItem): SaveAgentInput {
  const name = agent.name.trim() || '未命名智能体';

  return {
    capabilities: [...(agent.capabilities ?? [])],
    color: agent.color || colorForAgent(agent.id),
    description: agent.description.trim(),
    glyph: agent.glyph.trim().slice(0, 1) || name.slice(0, 1) || '智',
    id: agent.id,
    instructions: agent.instructions?.trim() ?? '',
    name,
    opening: agent.opening.trim(),
    starterPrompts: cleanList(agent.starterPrompts),
    tags: cleanList(agent.tags),
  };
}

function persistedAgentToCatalogItem(agent: PersistedAgent): AgentCatalogItem {
  return {
    capabilities: [...agent.capabilities],
    category: agent.category,
    color: agent.color,
    description: agent.description,
    glyph: agent.glyph,
    id: agent.id,
    instructions: agent.instructions,
    name: agent.name,
    opening: agent.opening,
    rating: agent.rating,
    starterPrompts: [...agent.starterPrompts],
    tags: [...agent.tags],
    usage: agent.usage,
  };
}

function persistedAgentToDraft(agent: PersistedAgent): AgentDraft {
  return {
    capabilities: [...agent.capabilities],
    description: agent.description,
    id: agent.id,
    instructions: agent.instructions,
    name: agent.name,
    opening: agent.opening,
    published: agent.status === 'PUBLISHED',
    starterPrompts: [...agent.starterPrompts],
    tags: [...agent.tags],
  };
}

async function migrateLegacyAgents(
  localAgents: AgentCatalogItem[],
  drafts: AgentDraft[],
  persistedAgents: PersistedAgent[],
): Promise<{ agents: PersistedAgent[]; error: string }> {
  const agentsById = new Map(persistedAgents.map((agent) => [agent.id, agent]));
  const candidates = new Map<string, SaveAgentInput>();

  for (const draft of drafts) {
    if (draft.published) {
      candidates.set(draft.id, draftToSaveInput(draft));
    }
  }

  for (const agent of localAgents) {
    candidates.set(agent.id, catalogItemToSaveInput(agent));
  }

  let migrationError = '';

  for (const [agentId, input] of candidates) {
    if (agentsById.has(agentId)) {
      continue;
    }

    try {
      const savedAgent = await saveAgent(input);
      agentsById.set(savedAgent.id, savedAgent);
    } catch (error) {
      migrationError =
        migrationError ||
        (error instanceof Error ? error.message : '本地智能体同步失败，请稍后重试');
    }
  }

  return {
    agents: [...agentsById.values()],
    error: migrationError,
  };
}

export const useAgentWorkspaceStore = defineStore('agent-workspace', {
  state: (): AgentWorkspaceState => loadWorkspaceState(),
  actions: {
    persist(): void {
      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.setItem(
        AGENT_WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          customAgents: this.customAgents,
          drafts: this.drafts,
          favoriteAgentIds: this.favoriteAgentIds,
          modelAlias: this.modelAlias,
          sessions: this.sessions,
        }),
      );
    },
    async initialize(): Promise<void> {
      if (this.status === 'ready' || this.status === 'streaming') {
        return;
      }

      if (this.status === 'loading') {
        return;
      }

      const sessionStore = useSessionStore();
      this.status = 'loading';
      this.error = '';

      if (!sessionStore.authenticated) {
        await sessionStore.bootstrap();
      }

      if (!sessionStore.authenticated) {
        this.error = sessionStore.error?.message ?? '请先登录后使用智能体';
        this.status = 'error';
        return;
      }

      try {
        const [modelsResult, agentsResult] = await Promise.allSettled([
          fetchModels('chat'),
          fetchAgents(),
        ]);

        if (modelsResult.status === 'rejected') {
          throw modelsResult.reason;
        }

        const models = modelsResult.value;

        if (!models.some((model) => model.alias === this.modelAlias)) {
          this.modelAlias = models[0]?.alias ?? '';
        }

        let persistedAgents: PersistedAgent[] = [];
        let workspaceError = '';

        if (agentsResult.status === 'fulfilled') {
          persistedAgents = agentsResult.value;

          const migration = await migrateLegacyAgents(
            this.customAgents,
            this.drafts,
            persistedAgents,
          );
          persistedAgents = migration.agents;
          workspaceError = migration.error;
        } else {
          workspaceError =
            agentsResult.reason instanceof Error
              ? agentsResult.reason.message
              : '智能体列表加载失败，当前显示本地缓存';
        }

        const serverAgentIds = new Set(persistedAgents.map((agent) => agent.id));
        const localAgents = this.customAgents.filter((agent) => !serverAgentIds.has(agent.id));

        this.customAgents = [...persistedAgents.map(persistedAgentToCatalogItem), ...localAgents];
        this.error = workspaceError;
        this.status = 'ready';
      } catch (error) {
        this.error = error instanceof Error ? error.message : '模型列表加载失败';
        this.status = 'error';
      }
    },
    createSession(agentId: string): AgentSession {
      const now = Date.now();
      const session: AgentSession = {
        agentId,
        conversationId: null,
        createdAt: now,
        id: makeId('session'),
        messages: [],
        modelAlias: this.modelAlias,
        title: '新会话',
        updatedAt: now,
      };

      this.sessions.unshift(session);
      this.persist();
      return session;
    },
    async sendMessage(
      agent: AgentCatalogItem,
      content: string,
      sessionId?: string,
      options: AgentSendOptions = {},
    ): Promise<AgentSession> {
      const normalized = content.trim();
      let session = sessionId ? this.sessions.find((item) => item.id === sessionId) : undefined;

      if (!session || session.agentId !== agent.id) {
        session = this.createSession(agent.id);
      }

      if (!normalized || this.streamingSessionId) {
        return session;
      }

      await this.initialize();

      const sessionStore = useSessionStore();

      if (!sessionStore.authenticated || !this.modelAlias) {
        this.error = this.error || '请先登录后再发送消息';
        this.status = 'error';
        return session;
      }

      const now = Date.now();
      const assistantMessageId = makeId('message');

      if (options.appendUser !== false) {
        session.messages.push({
          content: normalized,
          createdAt: now,
          id: makeId('message'),
          role: 'user',
          status: 'COMPLETED',
        });
      }
      session.messages.push({
        content: '',
        createdAt: now + 1,
        id: assistantMessageId,
        role: 'assistant',
        status: 'STREAMING',
      });
      session.title = summarizeTitle(normalized);
      session.updatedAt = now + 1;
      this.error = '';
      this.status = 'streaming';
      this.streamingSessionId = session.id;

      this.sessions = [session, ...this.sessions.filter((item) => item.id !== session.id)];
      this.persist();
      activeAgentStreamController = new AbortController();

      try {
        await streamChat(
          {
            content: normalized,
            conversationId: session.conversationId ?? undefined,
            modelAlias: session.modelAlias || this.modelAlias,
            systemPrompt: buildAgentSystemPrompt(agent),
          },
          {
            onDelta: (event) => {
              const message = session?.messages.find((item) => item.id === assistantMessageId);

              if (message) {
                message.content += event.content;
                session.updatedAt = Date.now();
              }
            },
            onDone: (event) => {
              const message = session?.messages.find((item) => item.id === assistantMessageId);

              if (message) {
                message.id = event.assistantMessageId;
                message.status = 'COMPLETED';
              }

              if (session) {
                session.updatedAt = Date.now();
              }

              sessionStore.updatePoints(event.balance);
            },
            onError: (event) => {
              const message = session?.messages.find((item) => item.id === assistantMessageId);

              if (message) {
                message.content ||= event.message;
                message.status = 'FAILED';
              }

              if (session) {
                session.updatedAt = Date.now();
              }

              sessionStore.updatePoints(event.balance);
              this.error = event.message;
            },
            onMeta: (event) => {
              if (session) {
                session.conversationId = event.conversationId;
                session.modelAlias = event.modelAlias;
              }

              this.modelAlias = event.modelAlias;
              sessionStore.updatePoints(event.balance);
            },
          },
          activeAgentStreamController.signal,
        );

        const message = session.messages.find((item) => item.id === assistantMessageId);

        if (message?.status === 'STREAMING') {
          message.content ||= '生成连接意外中断，请重试';
          message.status = 'FAILED';
          session.updatedAt = Date.now();
          this.error = '生成连接意外中断，请重试';
        }
      } catch (error) {
        const message = session.messages.find((item) => item.id === assistantMessageId);
        const aborted = error instanceof DOMException && error.name === 'AbortError';

        if (message) {
          message.content ||= aborted
            ? '生成已中断'
            : error instanceof Error
              ? error.message
              : '生成失败，请稍后重试';
          message.status = 'FAILED';
        }

        this.error = aborted
          ? '生成已中断，本次积分已退回'
          : error instanceof Error
            ? error.message
            : '生成失败，请稍后重试';
      } finally {
        activeAgentStreamController = null;
        this.streamingSessionId = null;
        this.status = this.error ? 'error' : 'ready';
        session.updatedAt = Date.now();
        this.sessions = [session, ...this.sessions.filter((item) => item.id !== session.id)];
        this.persist();
      }

      return session;
    },
    async regenerateLastResponse(
      agent: AgentCatalogItem,
      sessionId: string,
    ): Promise<AgentSession | undefined> {
      const session = this.sessions.find((item) => item.id === sessionId);

      if (!session || session.agentId !== agent.id || this.streamingSessionId) {
        return session;
      }

      const lastUserMessage = [...session.messages]
        .reverse()
        .find((message) => message.role === 'user');

      if (!lastUserMessage) {
        return session;
      }

      const lastUserIndex = session.messages.findIndex(
        (message) => message.id === lastUserMessage.id,
      );
      session.messages.splice(lastUserIndex + 1);
      return this.sendMessage(agent, lastUserMessage.content, session.id, { appendUser: false });
    },
    stopStreaming(): void {
      activeAgentStreamController?.abort();
      activeAgentStreamController = null;
    },
    sessionsForAgent(agentId: string): AgentSession[] {
      return this.sessions
        .filter((session) => session.agentId === agentId)
        .sort((left, right) => right.updatedAt - left.updatedAt);
    },
    latestSessionForAgent(agentId: string): AgentSession | undefined {
      return this.sessionsForAgent(agentId)[0];
    },
    toggleFavorite(agentId: string): void {
      if (this.favoriteAgentIds.includes(agentId)) {
        this.favoriteAgentIds = this.favoriteAgentIds.filter((id) => id !== agentId);
      } else {
        this.favoriteAgentIds.push(agentId);
      }

      this.persist();
    },
    async saveDraft(draft: AgentDraft): Promise<AgentDraft> {
      try {
        const persistedAgent = await saveAgent(draftToSaveInput(draft));
        const savedDraft = persistedAgentToDraft(persistedAgent);
        const customAgent = persistedAgentToCatalogItem(persistedAgent);
        const draftIndex = this.drafts.findIndex((item) => item.id === savedDraft.id);
        const agentIndex = this.customAgents.findIndex((item) => item.id === customAgent.id);

        if (draftIndex >= 0) {
          this.drafts.splice(draftIndex, 1, savedDraft);
        } else {
          this.drafts.unshift(savedDraft);
        }

        if (agentIndex >= 0) {
          this.customAgents.splice(agentIndex, 1, customAgent);
        } else {
          this.customAgents.unshift(customAgent);
        }

        this.error = '';
        this.status = 'ready';
        this.persist();
        return savedDraft;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '智能体保存失败，请稍后重试';
        this.status = 'error';
        throw error;
      }
    },
    async publishDraft(draft: AgentDraft): Promise<AgentCatalogItem> {
      try {
        const savedDraft = await this.saveDraft({
          ...draft,
          published: false,
        });
        const publishedAgent = await publishAgent(savedDraft.id);
        const customAgent = persistedAgentToCatalogItem(publishedAgent);
        const publishedDraft = persistedAgentToDraft(publishedAgent);
        const draftIndex = this.drafts.findIndex((item) => item.id === customAgent.id);
        const agentIndex = this.customAgents.findIndex((item) => item.id === customAgent.id);

        if (draftIndex >= 0) {
          this.drafts.splice(draftIndex, 1, publishedDraft);
        } else {
          this.drafts.unshift(publishedDraft);
        }

        if (agentIndex >= 0) {
          this.customAgents.splice(agentIndex, 1, customAgent);
        } else {
          this.customAgents.unshift(customAgent);
        }

        this.error = '';
        this.status = 'ready';
        this.persist();
        return customAgent;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '智能体发布失败，请稍后重试';
        this.status = 'error';
        throw error;
      }
    },
  },
});
