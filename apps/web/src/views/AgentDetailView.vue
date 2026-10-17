<script setup lang="ts">
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  HistoryOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons-vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAgentById } from '@/data/agents';
import { useAgentWorkspaceStore, type AgentSession } from '@/stores/agent-workspace';

const route = useRoute();
const router = useRouter();
const workspace = useAgentWorkspaceStore();
const prompt = ref('');
const search = ref('');
const activeSessionId = ref<string | null>(null);
const conversationArea = ref<HTMLElement | null>(null);
const consumedRoutePrompt = ref('');
const sessionSearchInput = ref<HTMLInputElement | null>(null);
const historyOpen = ref(false);
const streaming = computed(() => workspace.streamingSessionId !== null);

const agent = computed(
  () =>
    getAgentById(String(route.params.id)) ??
    workspace.customAgents.find((item) => item.id === String(route.params.id)) ??
    getAgentById('code-mentor'),
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

function formatHistoryTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
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

function selectHistorySession(sessionId: string): void {
  selectSession(sessionId);
  historyOpen.value = false;
}

function useStarter(starter: string): void {
  prompt.value = starter;
}

async function sendMessage(): Promise<void> {
  const content = prompt.value.trim();

  if (!content || !agent.value || streaming.value) {
    return;
  }

  const session = await workspace.sendMessage(
    agent.value,
    content,
    activeSessionId.value ?? undefined,
  );

  activeSessionId.value = session.id;
  prompt.value = '';
  await scrollToLatest();
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
  const session = await workspace.sendMessage(agent.value, queryPrompt.trim());
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
          <MessageOutlined />
          <span>
            <strong>{{ session.title }}</strong>
            <small>
              <ClockCircleOutlined />
              {{ formatTime(session.updatedAt) }}
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
        <span class="agent-detail__status" :class="{ active: streaming }">
          {{ streaming ? '正在生成' : '服务就绪' }}
        </span>
      </header>

      <section ref="conversationArea" class="agent-detail__conversation">
        <div v-if="messages.length === 0" class="agent-detail__welcome">
          <h1>你好，我是{{ agent.name }}</h1>
          <p>{{ agent.opening }}</p>
          <div class="agent-detail__welcome-prompts">
            <button
              v-for="starter in agent.starterPrompts"
              :key="starter"
              type="button"
              @click="useStarter(starter)"
            >
              {{ starter }}
            </button>
          </div>
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
              <strong>{{ message.role === 'assistant' ? agent.name : '你' }}</strong>
              <p>
                {{ message.content }}
                <i v-if="message.status === 'STREAMING'" class="agent-detail__cursor" />
              </p>
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
        </div>
        <div class="agent-detail__input">
          <textarea
            v-model="prompt"
            rows="2"
            :disabled="streaming"
            :placeholder="`请输入问题，例如：${agent.starterPrompts[0]}`"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <div class="agent-detail__input-footer">
            <div class="agent-detail__starter-list">
              <button
                v-for="starter in agent.starterPrompts.slice(0, 2)"
                :key="starter"
                type="button"
                @click="useStarter(starter)"
              >
                {{ starter }}
              </button>
            </div>
            <button
              type="button"
              :disabled="!streaming && !prompt.trim()"
              :aria-label="streaming ? '停止生成' : '发送消息'"
              @click="streaming ? stopStreaming() : sendMessage()"
            >
              <StopOutlined v-if="streaming" />
              <SendOutlined v-else />
            </button>
          </div>
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
            <div>
              <span><HistoryOutlined /></span>
              <strong>历史记录</strong>
              <small>{{ sessions.length }} 个对话</small>
            </div>
            <button type="button" aria-label="关闭历史记录" @click="historyOpen = false">
              <CloseOutlined />
            </button>
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
                <span class="agent-history-panel__avatar">
                  {{ session.title.slice(0, 1) }}
                </span>
                <span>
                  <strong>{{ session.title }}</strong>
                  <small>
                    {{ session.messages.length }} 条消息 ·
                    {{ formatHistoryTimestamp(session.updatedAt) }}
                  </small>
                </span>
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
  grid-template-columns: 260px minmax(0, 1fr);
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
  grid-template-columns: 20px minmax(0, 1fr);
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

.agent-detail__session-list > button > svg {
  font-size: 14px;
}

.agent-detail__session-list > button > span {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.agent-detail__session-list strong {
  overflow: hidden;
  color: #3f4653;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-detail__session-list small {
  display: inline-flex;
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
  font-size: 15px;
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

.agent-detail__conversation {
  overflow-y: auto;
  padding: 38px 32px 24px;
}

.agent-detail__welcome {
  display: grid;
  max-width: 920px;
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

.agent-detail__welcome-prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.agent-detail__welcome-prompts button {
  height: 34px;
  padding: 0 13px;
  border: 1px solid #e1e5eb;
  border-radius: 999px;
  background: #fff;
  color: #66707f;
  font-size: 10px;
  cursor: pointer;
}

.agent-detail__welcome-prompts button:hover {
  border-color: #b9cef7;
  color: #3979ed;
}

.agent-detail__messages {
  display: grid;
  max-width: 920px;
  gap: 24px;
  margin: 0 auto;
}

.agent-detail__message {
  display: grid;
  align-items: start;
  gap: 10px;
  grid-template-columns: 34px minmax(0, 1fr);
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
  max-width: min(720px, 82%);
}

.agent-detail__message--user > div {
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
  font-size: 12px;
  line-height: 1.75;
  text-align: left;
  white-space: pre-wrap;
}

.agent-detail__message--user p {
  border-radius: 12px 4px 12px 12px;
  background: #edf3ff;
}

.agent-detail__composer {
  width: min(820px, calc(100% - 48px));
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
  width: min(380px, 100%);
  height: 100%;
  flex-direction: column;
  border-left: 1px solid #e9edf2;
  background: #fff;
  box-shadow: -20px 0 54px rgb(21 31 48 / 14%);
  animation: agent-history-slide-in 180ms ease-out both;
}

.agent-history-panel > header {
  display: flex;
  min-height: 74px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid #eef1f5;
}

.agent-history-panel > header > div {
  display: grid;
  align-items: center;
  gap: 1px 10px;
  grid-template-columns: 36px auto;
}

.agent-history-panel > header > div > span {
  display: grid;
  width: 36px;
  height: 36px;
  grid-row: 1 / span 2;
  place-items: center;
  border-radius: 10px;
  background: #eef4ff;
  color: #4c84ff;
}

.agent-history-panel > header strong {
  color: #343c48;
  font-size: 14px;
}

.agent-history-panel > header small {
  color: #969eaa;
  font-size: 9px;
}

.agent-history-panel > header > button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e3e7ed;
  border-radius: 8px;
  background: #fff;
  color: #6d7583;
  cursor: pointer;
}

.agent-history-panel > header > button:hover {
  border-color: #bdcff4;
  color: #3979ed;
}

.agent-history-panel__groups {
  min-height: 0;
  overflow-y: auto;
  padding: 17px 14px 28px;
}

.agent-history-panel__groups section + section {
  margin-top: 22px;
}

.agent-history-panel__groups h3 {
  margin: 0 0 8px;
  padding: 0 7px;
  color: #8c94a1;
  font-size: 10px;
  font-weight: 700;
}

.agent-history-panel__groups section > button {
  display: grid;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 10px;
  grid-template-columns: 34px minmax(0, 1fr);
  padding: 10px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #556071;
  text-align: left;
  cursor: pointer;
}

.agent-history-panel__groups section > button:hover,
.agent-history-panel__groups section > button.active {
  border-color: #d8e4ff;
  background: #f4f8ff;
}

.agent-history-panel__avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #edf3ff;
  color: #3979ed;
  font-size: 11px;
  font-weight: 800;
}

.agent-history-panel__groups section > button > span:last-child {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.agent-history-panel__groups strong {
  overflow: hidden;
  color: #424a57;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-history-panel__groups small {
  color: #969eaa;
  font-size: 9px;
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
    padding: 0 14px;
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
