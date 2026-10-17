import { defineStore } from 'pinia';
import type { AgentCatalogItem } from '@/data/agents';

export interface AgentMessage {
  content: string;
  createdAt: number;
  id: string;
  role: 'assistant' | 'user';
}

export interface AgentSession {
  agentId: string;
  createdAt: number;
  id: string;
  messages: AgentMessage[];
  title: string;
  updatedAt: number;
}

export interface AgentDraft {
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
  favoriteAgentIds: string[];
  sessions: AgentSession[];
}

const AGENT_WORKSPACE_STORAGE_KEY = 'aurora:agent-workspace:v1';
const customAgentColors = ['#3979ed', '#198e68', '#c36d2d', '#7c5bd9', '#c54871'];

function emptyWorkspaceState(): AgentWorkspaceState {
  return {
    customAgents: [],
    drafts: [],
    favoriteAgentIds: [],
    sessions: [],
  };
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
      sessions: Array.isArray(parsedState.sessions) ? parsedState.sessions : [],
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

function createAssistantReply(agent: AgentCatalogItem, prompt: string): string {
  const normalized = prompt.toLowerCase();

  if (/代码|报错|bug|函数|sql|接口|重构/.test(normalized)) {
    return [
      `可以，我会按“定位问题、解释原因、给出实现、检查边界”的顺序处理。`,
      '',
      '当前需要补充的信息：',
      '1. 相关代码或完整报错；',
      '2. 期望输入与当前输出；',
      '3. 运行环境、依赖版本和已尝试的方案。',
      '',
      '收到材料后我会给出可执行修改，并标出容易回归的测试点。',
    ].join('\n');
  }

  if (/报告|调研|研究|分析|市场|数据/.test(normalized)) {
    return [
      `我会把“${prompt}”整理成一份可继续深化的分析框架。`,
      '',
      '建议结构：',
      '1. 背景与核心问题；',
      '2. 关键对象、数据口径和判断指标；',
      '3. 主要发现、风险与机会；',
      '4. 结论、行动建议和下一步验证。',
      '',
      '如果你补充目标读者、资料来源和篇幅，我可以继续生成完整初稿。',
    ].join('\n');
  }

  if (/旅行|行程|出游|路线/.test(normalized)) {
    return [
      `我先把“${prompt}”拆成一份可执行的行程骨架。`,
      '',
      '1. 确认目的地、日期、人数、预算和节奏；',
      '2. 按区域安排每日路线，减少折返；',
      '3. 为交通、住宿、用餐和门票留出时间余量；',
      '4. 准备雨天与临时闭馆的备用方案。',
      '',
      '补充出发城市、天数和预算后，我会输出逐日时间表与费用估算。',
    ].join('\n');
  }

  if (/文案|营销|推广|标题|卖点|小红书/.test(normalized)) {
    return [
      `可以围绕“${prompt}”先产出三组不同方向的内容。`,
      '',
      '方向 A：痛点切入，先描述用户当前遇到的问题；',
      '方向 B：结果导向，直接展示使用后的变化；',
      '方向 C：场景叙事，把产品能力放进具体生活或工作片段。',
      '',
      '告诉我目标平台、受众和核心卖点，我会继续给出完整标题与正文。',
    ].join('\n');
  }

  if (/翻译|英文|中文|双语|术语/.test(normalized)) {
    return [
      `我会按“准确表达、业务语境、术语统一、格式保留”四项标准处理。`,
      '',
      '请继续提供原文、目标语言、目标读者和必须保留的术语。',
      '如果已有术语表，也可以一起粘贴；没有时我会先列出关键译法供你确认。',
    ].join('\n');
  }

  if (/设计|海报|视觉|配色|品牌/.test(normalized)) {
    return [
      `我会把“${prompt}”拆成视觉策略与执行参数。`,
      '',
      '先确认品牌气质、使用场景、目标人群和必须出现的信息；',
      '再给出构图方向、字体层级、色彩关系与画面材质；',
      '最后整理成可直接用于图片模型的提示词和备选风格。',
    ].join('\n');
  }

  return [
    `${agent.name}已收到你的目标：${prompt}`,
    '',
    '我会按以下步骤推进：',
    '1. 明确目标、受众、范围和交付格式；',
    '2. 拆分关键任务并标记需要补充的材料；',
    '3. 先给出结构清晰的初稿，再根据反馈迭代。',
    '',
    '当前为本地演示回复；后续接入模型服务后，这里会返回真实生成结果。',
  ].join('\n');
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
          sessions: this.sessions,
        }),
      );
    },
    createSession(agentId: string): AgentSession {
      const now = Date.now();
      const session: AgentSession = {
        agentId,
        createdAt: now,
        id: makeId('session'),
        messages: [],
        title: '新会话',
        updatedAt: now,
      };

      this.sessions.unshift(session);
      this.persist();
      return session;
    },
    sendMessage(agent: AgentCatalogItem, content: string, sessionId?: string): AgentSession {
      const normalized = content.trim();
      let session = sessionId ? this.sessions.find((item) => item.id === sessionId) : undefined;

      if (!session || session.agentId !== agent.id) {
        session = this.createSession(agent.id);
      }

      const now = Date.now();
      session.messages.push(
        {
          content: normalized,
          createdAt: now,
          id: makeId('message'),
          role: 'user',
        },
        {
          content: createAssistantReply(agent, normalized),
          createdAt: now + 1,
          id: makeId('message'),
          role: 'assistant',
        },
      );
      session.title = summarizeTitle(normalized);
      session.updatedAt = now + 1;

      this.sessions = [session, ...this.sessions.filter((item) => item.id !== session.id)];
      this.persist();

      return session;
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
    saveDraft(draft: AgentDraft): AgentDraft {
      const index = this.drafts.findIndex((item) => item.id === draft.id);

      if (index >= 0) {
        this.drafts.splice(index, 1, draft);
      } else {
        this.drafts.unshift(draft);
      }

      this.persist();
      return draft;
    },
    publishDraft(draft: AgentDraft): AgentCatalogItem {
      const savedDraft = this.saveDraft({
        ...draft,
        published: true,
      });
      const existingIndex = this.customAgents.findIndex((agent) => agent.id === savedDraft.id);
      const customAgent: AgentCatalogItem = {
        category: '我的智能体',
        color: customAgentColors[this.customAgents.length % customAgentColors.length] ?? '#3979ed',
        description: savedDraft.description.trim() || '由极光AI创建的专属智能体。',
        glyph: savedDraft.name.trim().slice(0, 1) || '智',
        id: savedDraft.id,
        name: savedDraft.name.trim() || '未命名智能体',
        opening:
          savedDraft.opening.trim() ||
          `你好，我是${savedDraft.name.trim() || '你的专属智能体'}。告诉我你的目标，我会开始处理。`,
        rating: 5,
        starterPrompts:
          savedDraft.starterPrompts.filter(Boolean).length > 0
            ? savedDraft.starterPrompts.filter(Boolean)
            : ['介绍你能完成的任务', '帮我拆解一个目标', '开始处理我的需求'],
        tags: savedDraft.tags.length > 0 ? savedDraft.tags : ['专属智能体', '本地草稿'],
        usage: 0,
      };

      if (existingIndex >= 0) {
        this.customAgents.splice(existingIndex, 1, customAgent);
      } else {
        this.customAgents.unshift(customAgent);
      }

      this.persist();
      return customAgent;
    },
  },
});
