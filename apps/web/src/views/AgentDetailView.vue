<script setup lang="ts">
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  DislikeOutlined,
  EditOutlined,
  HistoryOutlined,
  LikeOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  ThunderboltFilled,
} from '@ant-design/icons-vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MarkdownMessage from '@/components/MarkdownMessage.vue';
import { getAgentById } from '@/data/agents';
import { useAgentWorkspaceStore, type AgentSession } from '@/stores/agent-workspace';
import { isImeComposing } from '@/utils/keyboard';

const route = useRoute();
const router = useRouter();
const workspace = useAgentWorkspaceStore();
const prompt = ref('');
const search = ref('');
const activeSessionId = ref<string | null>(null);
const conversationArea = ref<HTMLElement | null>(null);
const consumedRoutePrompt = ref('');
const sessionSearchInput = ref<HTMLInputElement | null>(null);
const composerInput = ref<HTMLTextAreaElement | null>(null);
const historyOpen = ref(false);
const copiedMessageId = ref('');
const costRuleMessageId = ref('');
const messageFeedback = ref<Record<string, '' | 'dislike' | 'like'>>({});
const streaming = computed(() => workspace.streamingSessionId !== null);

const agent = computed(
  () =>
    getAgentById(String(route.params.id)) ??
    workspace.customAgents.find((item) => item.id === String(route.params.id)) ??
    getAgentById('code-mentor'),
);
const editableAgent = computed(() =>
  workspace.customAgents.some((item) => item.id === agent.value?.id),
);

const sessions = computed(() => {
  if (!agent.value) {
    return [];
  }

  const query = search.value.trim().toLowerCase();
  const items = workspace.sessionsForAgent(agent.value.id);

  if (!query) {
    return items;
  }

  return items.filter((session) => session.title.toLowerCase().includes(query));
});

const activeSession = computed(
  () =>
    sessions.value.find((session) => session.id === activeSessionId.value) ??
    workspace.sessions.find((session) => session.id === activeSessionId.value),
);

const messages = computed(() => activeSession.value?.messages ?? []);
const historyGroups = computed(() => {
  const groups = new Map<string, AgentSession[]>();

  for (const session of sessions.value) {
    const label = formatHistoryDate(session.updatedAt);
    const items = groups.get(label) ?? [];

    items.push(session);
    groups.set(label, items);
  }

  return [...groups.entries()].map(([label, items]) => ({ items, label }));
});

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function formatHistoryDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDifference = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (dayDifference === 0) {
    return '今天';
  }

  if (dayDifference === 1) {
    return '昨天';
  }

  if (dayDifference < 7) {
    return '最近 7 天';
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

async function scrollToLatest(): Promise<void> {
  await nextTick();
  conversationArea.value?.scrollTo({
    behavior: 'smooth',
    top: conversationArea.value.scrollHeight,
  });
}

function selectSession(sessionId: string): void {
  activeSessionId.value = sessionId;
  prompt.value = '';
  void scrollToLatest();
}

function startNewSession(): void {
  activeSessionId.value = null;
  prompt.value = '';
  historyOpen.value = false;
  void scrollToLatest();
}

function openHistory(): void {
  historyOpen.value = true;
}

function editAgent(): void {
  if (!editableAgent.value || !agent.value) {
    return;
  }

  void router.push({
    path: '/agents/create',
    query: {
      edit: agent.value.id,
    },
  });
}

function selectHistorySession(sessionId: string): void {
  selectSession(sessionId);
  historyOpen.value = false;
}

function useStarter(starter: string): void {
  prompt.value = starter;
  composerInput.value?.focus();
}

async function copyMessage(messageId: string, content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
    copiedMessageId.value = messageId;
  } catch {
    copiedMessageId.value = '';
  }
}

function continueMessage(): void {
  prompt.value = '请继续展开上一条回答，并给出更具体的步骤。';
  composerInput.value?.focus();
}

function toggleFeedback(messageId: string, value: 'dislike' | 'like'): void {
  messageFeedback.value[messageId] = messageFeedback.value[messageId] === value ? '' : value;
}

function toggleCostRule(messageId: string): void {
  costRuleMessageId.value = costRuleMessageId.value === messageId ? '' : messageId;
}

async function regenerateMessage(messageId: string): Promise<void> {
  if (!agent.value || !activeSessionId.value || streaming.value) {
    return;
  }

  const lastAssistantMessage = [...messages.value]
    .reverse()
    .find((message) => message.role === 'assistant');

  if (lastAssistantMessage?.id !== messageId) {
    return;
  }

  await workspace.regenerateLastResponse(agent.value, activeSessionId.value);
  await scrollToLatest();
}

async function sendMessage(): Promise<void> {
  const content = prompt.value.trim();

  if (!content || !agent.value || streaming.value) {
    return;
  }

  const sessionId = activeSessionId.value ?? workspace.createSession(agent.value.id).id;
  activeSessionId.value = sessionId;
  prompt.value = '';
  await scrollToLatest();

  const session = await workspace.sendMessage(agent.value, content, sessionId);

  activeSessionId.value = session.id;
  await scrollToLatest();
}

function handleComposerKeydown(event: KeyboardEvent): void {
  if (isImeComposing(event)) {
    return;
  }

  event.preventDefault();
  void sendMessage();
}

function stopStreaming(): void {
  workspace.stopStreaming();
}

async function consumeRoutePrompt(): Promise<void> {
  const queryPrompt = route.query.prompt;
  const routeKey = `${String(route.params.id)}:${String(route.query.start ?? '')}:${String(queryPrompt ?? '')}`;

  if (
    !agent.value ||
    typeof queryPrompt !== 'string' ||
    !queryPrompt.trim() ||
    consumedRoutePrompt.value === routeKey
  ) {
    return;
  }

  consumedRoutePrompt.value = routeKey;
  const sessionId = activeSessionId.value ?? workspace.createSession(agent.value.id).id;
  activeSessionId.value = sessionId;
  const session = await workspace.sendMessage(agent.value, queryPrompt.trim(), sessionId);
  activeSessionId.value = session.id;
  prompt.value = '';
  await scrollToLatest();
}

onMounted(() => {
  void workspace.initialize();
});

watch(
  () => [route.params.id, route.query.prompt, route.query.start, route.query.session],
  () => {
    const sessionId = route.query.session;
    activeSessionId.value =
      typeof sessionId === 'string' &&
      workspace.sessions.some((session) => session.id === sessionId)
        ? sessionId
        : null;
    prompt.value = '';
    void consumeRoutePrompt();
  },
  {
    immediate: true,
  },
);

watch(
  () => messages.value.length,
  () => {
    void scrollToLatest();
  },
);
</script>

<template>
  <div v-if="agent" class="agent-detail">
    <aside class="agent-detail__history">
      <header>
        <strong>所有会话</strong>
        <div>
          <button type="button" @click="startNewSession">
            <PlusOutlined />
            新对话
          </button>
          <button type="button" aria-label="会话记录" @click="openHistory">
            <HistoryOutlined />
          </button>
        </div>
      </header>

      <label>
        <SearchOutlined />
        <input ref="sessionSearchInput" v-model="search" placeholder="搜索会话" />
      </label>

      <div v-if="sessions.length > 0" class="agent-detail__session-list">
        <button
          v-for="session in sessions"
          :key="session.id"
          type="button"
          :class="{ active: activeSessionId === session.id }"
          @click="selectSession(session.id)"
        >
          <span class="agent-detail__session-avatar" :style="{ background: agent.color }">
            {{ agent.glyph }}
          </span>
          <span>
            <span class="agent-detail__session-title">
              <strong>{{ session.title }}</strong>
              <small>
                <ClockCircleOutlined />
                {{ formatTime(session.updatedAt) }}
              </small>
            </span>
            <small>
              {{ session.messages.at(-1)?.content || '等待第一条消息' }}
            </small>
          </span>
        </button>
      </div>

      <div v-else class="agent-detail__history-empty">
        <span>⌛</span>
        <p>{{ search ? '没有匹配的会话' : 'AI 提升工作效率从第一个对话开始' }}</p>
        <button type="button" @click="startNewSession">+ 新会话</button>
      </div>
    </aside>

    <main class="agent-detail__main">
      <header class="agent-detail__heading">
        <button type="button" @click="router.push('/agents')">
          <ArrowLeftOutlined />
          返回
        </button>
        <span class="agent-detail__avatar" :style="{ background: agent.color }">
          {{ agent.glyph }}
        </span>
        <strong>{{ agent.name }}</strong>
        <em>{{ agent.tags[0] }}</em>
        <button v-if="editableAgent" type="button" @click="editAgent">
          <EditOutlined />
          编辑
        </button>
        <span class="agent-detail__cost">
          <ThunderboltFilled />
          1 积分/次
        </span>
        <span class="agent-detail__status" :class="{ active: streaming }">
          {{ streaming ? '正在生成' : '服务就绪' }}
        </span>
      </header>

      <section ref="conversationArea" class="agent-detail__conversation">
        <div v-if="messages.length === 0" class="agent-detail__welcome">
          <h1>你好，我是{{ agent.name }}</h1>
          <p>{{ agent.opening }}</p>
        </div>

        <div v-else class="agent-detail__messages">
          <article
            v-for="message in messages"
            :key="message.id"
            class="agent-detail__message"
            :class="`agent-detail__message--${message.role}`"
          >
            <span
              class="agent-detail__message-avatar"
              :style="message.role === 'assistant' ? { background: agent.color } : undefined"
            >
              {{ message.role === 'assistant' ? agent.glyph : '我' }}
            </span>
            <div>
              <strong v-if="message.role === 'user'">你</strong>
              <MarkdownMessage
                v-if="message.role === 'assistant' && message.status === 'COMPLETED'"
                class="agent-detail__markdown"
                :content="message.content"
              />
              <MarkdownMessage
                v-else-if="message.role === 'assistant' && message.status === 'STREAMING'"
                class="agent-detail__markdown"
                :content="message.content"
                streaming
              />
              <p v-else>
                {{ message.content }}
              </p>
              <div
                v-if="message.role === 'assistant' && message.status === 'COMPLETED'"
                class="agent-detail__message-result"
              >
                <div class="agent-detail__cost-note">
                  <span>
                    <ThunderboltFilled />
                    本次任务共消耗 1 积分
                  </span>
                  <button type="button" @click="toggleCostRule(message.id)">
                    查看积分消耗规则
                  </button>
                  <p v-if="costRuleMessageId === message.id">
                    单次消耗与所选模型、任务能力和处理时长有关，本页面当前按 1 积分/次展示。
                  </p>
                </div>
                <div class="agent-detail__message-actions">
                  <button
                    type="button"
                    data-action="copy"
                    aria-label="复制回答"
                    :class="{ active: copiedMessageId === message.id }"
                    :title="copiedMessageId === message.id ? '已复制' : '复制回答'"
                    @click="copyMessage(message.id, message.content)"
                  >
                    <CopyOutlined />
                    <span class="agent-detail__action-label">{{
                      copiedMessageId === message.id ? '已复制' : '复制'
                    }}</span>
                  </button>
                  <button
                    type="button"
                    data-action="like"
                    aria-label="有帮助"
                    title="有帮助"
                    :class="{ active: messageFeedback[message.id] === 'like' }"
                    @click="toggleFeedback(message.id, 'like')"
                  >
                    <LikeOutlined />
                  </button>
                  <button
                    type="button"
                    data-action="dislike"
                    aria-label="需改进"
                    title="需改进"
                    :class="{ active: messageFeedback[message.id] === 'dislike' }"
                    @click="toggleFeedback(message.id, 'dislike')"
                  >
                    <DislikeOutlined />
                  </button>
                  <button
                    type="button"
                    data-action="regenerate"
                    aria-label="重新生成"
                    title="重新生成"
                    :disabled="streaming"
                    @click="regenerateMessage(message.id)"
                  >
                    <ReloadOutlined />
                    <span class="agent-detail__action-label">重新生成</span>
                  </button>
                  <button
                    type="button"
                    data-action="continue"
                    aria-label="继续追问"
                    title="继续追问"
                    @click="continueMessage"
                  >
                    <EditOutlined />
                    <span class="agent-detail__action-label">继续追问</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <footer class="agent-detail__composer">
        <div v-if="workspace.error" class="agent-detail__error">
          {{ workspace.error }}
        </div>
        <div class="agent-detail__composer-actions">
          <button type="button" class="active" @click="startNewSession">
            <MessageOutlined />
            新建对话
          </button>
          <button type="button" @click="openHistory">
            <HistoryOutlined />
            历史记录
          </button>
          <button
            type="button"
            class="agent-detail__scroll-latest"
            aria-label="回到最新消息"
            title="回到最新消息"
            @click="scrollToLatest"
          >
            <ArrowDownOutlined />
          </button>
        </div>
        <div class="agent-detail__input">
          <textarea
            ref="composerInput"
            v-model="prompt"
            rows="2"
            :disabled="streaming"
            placeholder="请输入你的需求，例如：研究一个主题、制定旅行攻略、生成可视化网页或数据报告。"
            @keydown.enter.exact="handleComposerKeydown"
          />
          <div class="agent-detail__input-footer">
            <div class="agent-detail__input-lead">
              <button
                type="button"
                class="agent-detail__cost-rule"
                :class="{ active: costRuleMessageId === 'composer' }"
                :title="'查看积分消耗规则'"
                @click="toggleCostRule('composer')"
              >
                <span class="agent-detail__cost-rule-avatar">{{ agent.glyph }}</span>
                积分消耗规则
              </button>
              <div v-if="messages.length === 0" class="agent-detail__starter-list">
                <button
                  v-for="starter in agent.starterPrompts.slice(0, 2)"
                  :key="starter"
                  type="button"
                  @click="useStarter(starter)"
                >
                  {{ starter }}
                </button>
              </div>
            </div>
            <button
              type="button"
              data-action="submit"
              :disabled="!streaming && !prompt.trim()"
              :aria-label="streaming ? '停止生成' : '发送消息'"
              @click="streaming ? stopStreaming() : sendMessage()"
            >
              <StopOutlined v-if="streaming" />
              <SendOutlined v-else />
            </button>
          </div>
          <p v-if="costRuleMessageId === 'composer'" class="agent-detail__cost-rule-note">
            单次消耗与所选模型、任务能力和处理时长有关，本页面当前按 1 积分/次展示。
          </p>
        </div>
      </footer>
    </main>

    <Teleport to="body">
      <div
        v-if="historyOpen"
        class="agent-history-layer"
        role="presentation"
        @click.self="historyOpen = false"
      >
        <aside class="agent-history-panel" aria-label="历史记录">
          <header>
            <button type="button" aria-label="关闭历史记录" @click="historyOpen = false">
              <CloseOutlined />
            </button>
            <div>
              <span class="agent-history-panel__agent" :style="{ background: agent.color }">
                {{ agent.glyph }}
              </span>
              <strong>{{ agent.name }}</strong>
              <small>{{ sessions.length }} 个对话</small>
            </div>
          </header>

          <div v-if="historyGroups.length > 0" class="agent-history-panel__groups">
            <section v-for="group in historyGroups" :key="group.label">
              <h3>{{ group.label }}</h3>
              <button
                v-for="session in group.items"
                :key="session.id"
                type="button"
                :class="{ active: activeSessionId === session.id }"
                @click="selectHistorySession(session.id)"
              >
                <strong>{{ session.title }}</strong>
              </button>
            </section>
          </div>

          <div v-else class="agent-history-panel__empty">
            <MessageOutlined />
            <strong>{{ search ? '没有匹配的会话' : '暂无历史记录' }}</strong>
            <p>
              {{ search ? '换一个关键词继续搜索。' : '发送第一条消息后，会话会保存在这里。' }}
            </p>
            <button type="button" @click="startNewSession">新建对话</button>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.agent-detail {
  display: grid;
  min-height: calc(100vh - 56px);
  grid-template-columns: 320px minmax(0, 1fr);
  background: #fff;
}

.agent-detail__history {
  display: flex;
  min-width: 0;
  flex-direction: column;
  border-right: 1px solid #e8ebf0;
}

.agent-detail__history > header {
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 20px;
}

.agent-detail__history > header strong {
  font-size: 16px;
}

.agent-detail__history > header div {
  display: flex;
  gap: 7px;
}

.agent-detail__history > header button {
  display: inline-flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 9px;
  border: 1px solid #dce6ff;
  border-radius: 7px;
  background: #fff;
  color: #4c84ff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.agent-detail__history > header button:last-child {
  width: 30px;
  padding: 0;
  border-color: #e8ebf0;
  color: #697283;
}

.agent-detail__history > label {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 7px;
  margin: 0 20px;
  padding: 0 10px;
  border-radius: 7px;
  background: #f3f4f6;
  color: #a2a9b4;
}

.agent-detail__history > label input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #3f4653;
  font-size: 11px;
}

.agent-detail__session-list {
  display: grid;
  gap: 5px;
  margin-top: 14px;
  padding: 0 12px 18px;
}

.agent-detail__session-list > button {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 9px;
  grid-template-columns: 40px minmax(0, 1fr);
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #697283;
  text-align: left;
  cursor: pointer;
}

.agent-detail__session-list > button:hover,
.agent-detail__session-list > button.active {
  border-color: #dce7ff;
  background: #f4f8ff;
  color: #3979ed;
}

.agent-detail__session-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.agent-detail__session-list > button > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.agent-detail__session-title {
  display: flex !important;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.agent-detail__session-list strong {
  min-width: 0;
  overflow: hidden;
  color: #3f4653;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-detail__session-list > button > span > small {
  overflow: hidden;
  color: #939ba8;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-detail__session-list small {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  color: #9aa2af;
  font-size: 8px;
}

.agent-detail__history-empty {
  display: grid;
  margin: auto 20px;
  justify-items: center;
  text-align: center;
}

.agent-detail__history-empty > span {
  color: #d4d8df;
  font-size: 42px;
}

.agent-detail__history-empty p {
  margin: 16px 0;
  color: #8f97a4;
  font-size: 11px;
}

.agent-detail__history-empty button {
  width: 100%;
  height: 42px;
  border: 0;
  border-radius: 7px;
  background: #4c84ff;
  color: #fff;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}

.agent-detail__main {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.agent-detail__heading {
  display: flex;
  height: 68px;
  align-items: center;
  gap: 10px;
  padding: 0 28px;
  border-bottom: 1px solid #eef0f4;
}

.agent-detail__heading > button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 4px;
  border: 0;
  background: transparent;
  color: #6d7584;
  font-size: 12px;
  cursor: pointer;
}

.agent-detail__avatar {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.agent-detail__heading strong {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-detail__heading em {
  padding: 3px 7px;
  border-radius: 999px;
  background: #edf3ff;
  color: #4c84ff;
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
}

.agent-detail__cost {
  display: inline-flex;
  height: 25px;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
  border: 1px solid #f5dfa6;
  border-radius: 999px;
  background: #fffaf0;
  color: #d99705;
  font-size: 10px;
  font-weight: 750;
}

.agent-detail__cost > svg {
  font-size: 11px;
}

.agent-detail__conversation {
  overflow-y: auto;
  padding: 38px 32px 24px;
}

.agent-detail__welcome {
  display: grid;
  max-width: 768px;
  width: 100%;
  margin: 6vh auto 0;
  padding-bottom: 27px;
  border-bottom: 1px solid #edf0f4;
}

.agent-detail__welcome h1 {
  margin: 0;
  font-size: 20px;
}

.agent-detail__welcome p {
  max-width: 720px;
  margin: 9px 0 0;
  color: #747d8b;
  font-size: 11px;
  line-height: 1.75;
}

.agent-detail__messages {
  display: grid;
  max-width: 768px;
  gap: 24px;
  margin: 0 auto;
}

.agent-detail__message {
  display: grid;
  align-items: start;
  gap: 10px;
  grid-template-columns: 34px minmax(0, 1fr);
}

.agent-detail__message--assistant {
  grid-template-columns: minmax(0, 1fr);
}

.agent-detail__message--assistant .agent-detail__message-avatar {
  display: none;
}

.agent-detail__message--user {
  grid-template-columns: minmax(0, 1fr) 34px;
}

.agent-detail__message--user .agent-detail__message-avatar {
  grid-column: 2;
  grid-row: 1;
  background: #eef0f3;
  color: #626b79;
}

.agent-detail__message--user > div {
  grid-column: 1;
  grid-row: 1;
  justify-self: end;
}

.agent-detail__message-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.agent-detail__message > div {
  width: 100%;
  max-width: 768px;
}

.agent-detail__message--user > div {
  width: fit-content;
  max-width: min(640px, 100%);
  text-align: right;
}

.agent-detail__message strong {
  color: #89919e;
  font-size: 9px;
  font-weight: 700;
}

.agent-detail__message p {
  margin: 5px 0 0;
  padding: 12px 14px;
  border-radius: 4px 12px 12px;
  background: #f5f7fa;
  color: #363d48;
  font-size: 13px;
  line-height: 1.75;
  text-align: left;
  white-space: pre-wrap;
}

.agent-detail__markdown {
  margin-top: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #303640;
  font-size: 13px;
  line-height: 1.82;
  text-align: left;
}

.agent-detail__message-result {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 9px;
}

.agent-detail__cost-note {
  position: relative;
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  color: #8b929c;
  font-size: 10px;
}

.agent-detail__cost-note > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #e2a027;
  font-weight: 700;
}

.agent-detail__cost-note > span > svg {
  font-size: 11px;
}

.agent-detail__cost-note > button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #db8b1b;
  font-size: 10px;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.agent-detail__cost-note > p {
  position: absolute;
  z-index: 8;
  bottom: calc(100% + 7px);
  left: 0;
  width: min(310px, calc(100vw - 32px));
  margin: 0;
  padding: 9px 11px;
  border: 1px solid #e7e9ee;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 28px rgb(24 31 50 / 10%);
  color: #626b79;
  font-size: 10px;
  line-height: 1.6;
  text-align: left;
}

.agent-detail__message-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.agent-detail__message-actions button {
  display: inline-flex;
  width: 27px;
  height: 27px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #89919e;
  cursor: pointer;
}

.agent-detail__message-actions .agent-detail__action-label {
  display: none;
}

.agent-detail__message-actions button:hover,
.agent-detail__message-actions button.active {
  border-color: #dce6f8;
  background: #f5f8fe;
  color: #3979ed;
}

.agent-detail__message-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.agent-detail__message-actions button:disabled:hover {
  border-color: transparent;
  background: transparent;
  color: #89919e;
}

.agent-detail__message--user p {
  border-radius: 12px 4px 12px 12px;
  background: #4c84ff;
  color: #fff;
}

.agent-detail__composer {
  width: min(768px, calc(100% - 48px));
  justify-self: center;
  padding-bottom: 24px;
}

.agent-detail__composer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-left: 1px;
}

.agent-detail__composer-actions button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #dfe5ed;
  border-radius: 999px;
  background: #fff;
  color: #5e6877;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.agent-detail__composer-actions button.active {
  border-color: #cfe0ff;
  background: #f6f9ff;
  color: #3979ed;
}

.agent-detail__composer-actions button:hover {
  border-color: #b9cef7;
  color: #3979ed;
}

.agent-detail__composer-actions .agent-detail__scroll-latest {
  width: 30px;
  height: 30px;
  margin-left: auto;
  padding: 0;
  border-color: transparent;
  border-radius: 50%;
  background: transparent;
}

.agent-detail__scroll-latest > svg {
  font-size: 17px;
}

.agent-detail__input {
  padding: 12px;
  border: 1px solid #dfe3e9;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 12px 30px rgb(34 47 72 / 6%);
}

.agent-detail__input textarea {
  width: 100%;
  min-height: 52px;
  padding: 0;
  border: 0;
  outline: 0;
  color: #303640;
  font-size: 12px;
  line-height: 1.7;
  resize: none;
}

.agent-detail__input-footer {
  display: flex;
  min-height: 34px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.agent-detail__input-lead {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.agent-detail__cost-rule {
  display: inline-flex;
  height: 26px;
  align-items: center;
  gap: 6px;
  padding: 0 10px 0 3px;
  border: 1px solid #e5e9ef;
  border-radius: 999px;
  background: #fff;
  color: #5e6877;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.agent-detail__cost-rule.active,
.agent-detail__cost-rule:hover {
  border-color: #cfe0ff;
  background: #f6f9ff;
  color: #3979ed;
}

.agent-detail__cost-rule-avatar {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  background: #eef4ff;
  color: #4c84ff;
  font-size: 10px;
}

.agent-detail__cost-rule-note {
  margin: 8px 0 0;
  color: #8c94a1;
  font-size: 10px;
  line-height: 1.6;
}

.agent-detail__starter-list {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.agent-detail__starter-list button {
  padding: 4px 7px;
  border: 0;
  border-radius: 5px;
  background: #f4f6f9;
  color: #77808f;
  font-size: 9px;
  cursor: pointer;
}

.agent-detail__input-footer > button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: #4c84ff;
  color: #fff;
  cursor: pointer;
}

.agent-detail__input-footer > button:disabled {
  background: #d6dbe3;
  cursor: not-allowed;
}

.agent-history-layer {
  position: fixed;
  z-index: 1700;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgb(22 30 43 / 24%);
  backdrop-filter: blur(2px);
}

.agent-history-panel {
  display: flex;
  width: min(246px, 100%);
  height: 100%;
  flex-direction: column;
  border-left: 1px solid #e9edf2;
  background: #fff;
  box-shadow: -20px 0 54px rgb(21 31 48 / 14%);
  animation: agent-history-slide-in 180ms ease-out both;
}

.agent-history-panel > header {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  padding: 0 16px;
  border-bottom: 1px solid #eef1f5;
}

.agent-history-panel > header > div {
  display: grid;
  align-items: center;
  gap: 1px 9px;
  grid-template-columns: 32px auto;
}

.agent-history-panel > header > div > span {
  display: grid;
  width: 32px;
  height: 32px;
  grid-row: 1 / span 2;
  place-items: center;
  border-radius: 9px;
  background: #eef4ff;
  color: #4c84ff;
}

.agent-history-panel > header strong {
  color: #343c48;
  font-size: 13px;
}

.agent-history-panel > header small {
  color: #969eaa;
  font-size: 9px;
}

.agent-history-panel > header > button {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #303640;
  cursor: pointer;
}

.agent-history-panel > header > button:hover {
  background: #f4f6f9;
  color: #3979ed;
}

.agent-history-panel__groups {
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px 24px;
}

.agent-history-panel__groups section + section {
  margin-top: 18px;
}

.agent-history-panel__groups h3 {
  margin: 0 0 6px;
  padding: 0;
  color: #757d8a;
  font-size: 12px;
  font-weight: 700;
}

.agent-history-panel__groups section > button {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid #e9ebef;
  border-radius: 6px;
  background: #f8f9fb;
  color: #556071;
  text-align: left;
  cursor: pointer;
}

.agent-history-panel__groups section > button:hover,
.agent-history-panel__groups section > button.active {
  border-color: #cfe0ff;
  background: #f4f8ff;
}

.agent-history-panel__groups strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: #424a57;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-history-panel__empty {
  display: grid;
  margin: auto 30px;
  justify-items: center;
  text-align: center;
}

.agent-history-panel__empty > svg {
  width: 42px;
  height: 42px;
  color: #d3d9e2;
}

.agent-history-panel__empty strong {
  margin-top: 15px;
  color: #596273;
  font-size: 13px;
}

.agent-history-panel__empty p {
  margin: 7px 0 18px;
  color: #939ba7;
  font-size: 10px;
  line-height: 1.6;
}

.agent-history-panel__empty button {
  min-width: 126px;
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: #4c84ff;
  color: #fff;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}

@keyframes agent-history-slide-in {
  from {
    opacity: 0;
    transform: translateX(28px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 720px) {
  .agent-detail {
    display: block;
  }

  .agent-detail__history {
    display: none;
  }

  .agent-detail__main {
    min-height: calc(100vh - 118px);
  }

  .agent-detail__heading {
    height: 58px;
    gap: 7px;
    padding: 0 12px;
  }

  .agent-detail__heading > button {
    margin-right: 0;
  }

  .agent-detail__heading em,
  .agent-detail__status {
    display: none;
  }

  .agent-detail__heading strong {
    flex: 1;
    font-size: 14px;
  }

  .agent-detail__avatar {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
  }

  .agent-detail__cost {
    flex: 0 0 auto;
    padding: 0 8px;
  }

  .agent-detail__conversation {
    padding: 28px 14px 20px;
  }

  .agent-detail__welcome {
    margin-top: 3vh;
  }

  .agent-detail__welcome h1 {
    font-size: 20px;
  }

  .agent-detail__message > div {
    max-width: 88%;
  }

  .agent-detail__composer {
    width: calc(100% - 24px);
  }

  .agent-history-panel {
    width: 100%;
    border-left: 0;
  }
}
</style>
