<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowUpOutlined,
  BulbOutlined,
  CodeOutlined,
  DownOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LoadingOutlined,
  MessageOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  ThunderboltFilled,
} from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useChatWorkspaceStore } from '@/stores/chat-workspace';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const sessionStore = useSessionStore();
const chatStore = useChatWorkspaceStore();
const { conversations, error, messages, models, selectedModelAlias, status, streaming } =
  storeToRefs(chatStore);

const prompt = ref('');
const search = ref('');
const conversationArea = ref<HTMLElement | null>(null);

const suggestions = [
  {
    description: '拆解目标并生成可执行步骤',
    icon: BulbOutlined,
    label: '制定工作计划',
    prompt: '帮我拆解本周的工作目标，并整理成可执行的优先级清单。',
  },
  {
    description: '分析需求、风险和验收标准',
    icon: AppstoreOutlined,
    label: '分析产品需求',
    prompt: '请帮我分析这份产品需求中的目标、用户场景、风险和验收标准。',
  },
  {
    description: '优化结构、语气和表达',
    icon: FileTextOutlined,
    label: '润色一段文字',
    prompt: '请把下面的文字改写得更加清晰、专业，并保留原意。',
  },
  {
    description: '解释、调试或生成代码',
    icon: CodeOutlined,
    label: '解决代码问题',
    prompt: '我有一个代码问题，需要你帮助定位原因并给出修复方案。',
  },
];

const hasMessages = computed(() => messages.value.length > 0);
const selectedModel = computed(() =>
  models.value.find((model) => model.alias === selectedModelAlias.value),
);
const modelOptions = computed(() =>
  models.value.map((model) => ({
    label: model.displayName,
    value: model.alias,
  })),
);
const filteredConversations = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  if (!keyword) {
    return conversations.value;
  }

  return conversations.value.filter((conversation) =>
    conversation.title.toLowerCase().includes(keyword),
  );
});
const serviceLabel = computed(() => {
  if (streaming.value) {
    return '生成中';
  }

  if (status.value === 'loading') {
    return '连接中';
  }

  if (status.value === 'error') {
    return '需要处理';
  }

  return '服务就绪';
});
const canSend = computed(
  () => Boolean(prompt.value.trim()) && !streaming.value && sessionStore.authenticated,
);

watch(
  () => messages.value.at(-1)?.content,
  () => {
    void scrollToBottom(false);
  },
);

onMounted(async () => {
  await sessionStore.bootstrap();
  await chatStore.initialize();

  const queryPrompt = route.query.prompt;

  if (typeof queryPrompt === 'string') {
    prompt.value = queryPrompt;
  }
});

function useSuggestion(value: string): void {
  prompt.value = value;
}

async function sendMessage(): Promise<void> {
  const content = prompt.value.trim();

  if (!content || streaming.value) {
    return;
  }

  prompt.value = '';
  await chatStore.sendMessage(content);
  await scrollToBottom();
}

async function openConversation(conversationId: string): Promise<void> {
  await chatStore.openConversation(conversationId);
  await scrollToBottom();
}

function startNewConversation(): void {
  chatStore.newConversation();
  prompt.value = '';
  search.value = '';
  void scrollToBottom(false);
}

async function retryLastPrompt(): Promise<void> {
  const lastUserMessage = [...messages.value].reverse().find((message) => message.role === 'user');

  if (!lastUserMessage || streaming.value) {
    return;
  }

  await chatStore.sendMessage(lastUserMessage.content);
  await scrollToBottom();
}

async function scrollToBottom(smooth = true): Promise<void> {
  await nextTick();

  conversationArea.value?.scrollTo({
    behavior: smooth ? 'smooth' : 'auto',
    top: conversationArea.value.scrollHeight,
  });
}

function formatConversationTime(value: string | null): string {
  if (!value) {
    return '刚刚';
  }

  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}
</script>

<template>
  <div class="chat-view">
    <aside class="chat-history">
      <header>
        <strong>所有会话</strong>
        <div>
          <button type="button" @click="startNewConversation">
            <PlusOutlined />
            新对话
          </button>
          <button type="button" aria-label="会话设置">
            <HistoryOutlined />
          </button>
        </div>
      </header>

      <label class="chat-history__search">
        <SearchOutlined />
        <input v-model="search" placeholder="搜索会话" />
      </label>

      <div v-if="filteredConversations.length > 0" class="chat-history__list">
        <button
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          type="button"
          :class="{ active: conversation.id === chatStore.currentConversationId }"
          @click="openConversation(conversation.id)"
        >
          <MessageOutlined />
          <span>
            <strong>{{ conversation.title }}</strong>
            <small>{{ formatConversationTime(conversation.lastMessageAt) }}</small>
          </span>
        </button>
      </div>

      <div v-else class="chat-history__empty">
        <MessageOutlined />
        <strong>{{ search ? '没有匹配的会话' : '暂无历史会话' }}</strong>
        <span>
          {{ search ? '换一个关键词继续搜索。' : '开始一段对话后，会话会保存在这里。' }}
        </span>
      </div>
    </aside>

    <main class="chat-main">
      <header class="chat-main__toolbar">
        <div>
          <span class="chat-main__mark">极</span>
          <strong>模型对话</strong>
          <a-select
            v-model:value="selectedModelAlias"
            class="chat-main__model-select"
            :disabled="hasMessages || streaming"
            :options="modelOptions"
            size="small"
          >
            <template #suffixIcon>
              <DownOutlined />
            </template>
          </a-select>
        </div>
        <span class="chat-main__status" :class="{ error: status === 'error' }">
          <i />
          {{ serviceLabel }}
        </span>
      </header>

      <section ref="conversationArea" class="chat-conversation" :class="{ active: hasMessages }">
        <div v-if="status === 'loading' && !hasMessages" class="chat-loading">
          <LoadingOutlined spin />
          <span>正在加载会话</span>
        </div>

        <div v-else-if="!hasMessages" class="chat-welcome">
          <span class="chat-welcome__mark">极</span>
          <h1>今天想从什么开始？</h1>
          <p>选择一种常用能力，或直接在下方描述你的任务。</p>

          <div class="chat-suggestions">
            <button
              v-for="item in suggestions"
              :key="item.label"
              type="button"
              @click="useSuggestion(item.prompt)"
            >
              <span>
                <component :is="item.icon" />
              </span>
              <strong>{{ item.label }}</strong>
              <p>{{ item.description }}</p>
            </button>
          </div>
        </div>

        <div v-else class="chat-messages">
          <article
            v-for="message in messages"
            :key="message.id"
            class="chat-message"
            :class="[
              `chat-message--${message.role}`,
              { 'chat-message--failed': message.status === 'FAILED' },
            ]"
          >
            <span>{{ message.role === 'assistant' ? '极' : '我' }}</span>
            <p>
              {{ message.content }}
              <i v-if="message.status === 'STREAMING'" class="chat-message__cursor" />
              <em v-if="message.status === 'PENDING'">正在恢复生成状态...</em>
            </p>
          </article>
        </div>
      </section>

      <footer class="chat-composer">
        <div v-if="error" class="chat-error">
          <span>
            <strong>{{ error.code === 'INSUFFICIENT_POINTS' ? '积分不足' : '生成未完成' }}</strong>
            {{ error.message }}
          </span>
          <button v-if="error.recoverable" type="button" @click="retryLastPrompt">
            <ReloadOutlined />
            重试
          </button>
        </div>

        <div class="chat-composer__inner">
          <textarea
            v-model="prompt"
            rows="3"
            :disabled="streaming"
            placeholder="输入问题，粘贴材料，或描述你希望完成的任务"
            @keydown.ctrl.enter="sendMessage"
          />
          <div class="chat-composer__footer">
            <div>
              <button type="button" aria-label="上传附件">
                <PaperClipOutlined />
              </button>
              <button type="button">
                <ThunderboltFilled />
                {{ selectedModel?.displayName ?? '智能模式' }}
                <DownOutlined />
              </button>
            </div>
            <button
              v-if="streaming"
              class="chat-composer__send chat-composer__send--stop"
              type="button"
              aria-label="停止生成"
              @click="chatStore.stopStreaming"
            >
              <StopOutlined />
            </button>
            <button
              v-else
              class="chat-composer__send"
              type="button"
              :disabled="!canSend"
              aria-label="发送消息"
              @click="sendMessage"
            >
              <ArrowUpOutlined />
            </button>
          </div>
        </div>
        <small>内容由 AI 生成，请注意核验重要信息</small>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.chat-view {
  display: grid;
  min-height: calc(100vh - 56px);
  grid-template-columns: 270px minmax(0, 1fr);
  background: #fff;
}

.chat-history {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e8ebf0;
  background: #fff;
}

.chat-history > header {
  display: flex;
  min-height: 70px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 20px;
}

.chat-history > header strong {
  font-size: 16px;
}

.chat-history > header div {
  display: flex;
  gap: 7px;
}

.chat-history > header button {
  display: inline-flex;
  height: 29px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid #dce7ff;
  border-radius: 7px;
  background: #fff;
  color: #4c84ff;
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
}

.chat-history > header button:last-child {
  width: 30px;
  padding: 0;
  border-color: #e8ebf0;
  color: #697283;
}

.chat-history__search {
  display: flex;
  height: 35px;
  align-items: center;
  gap: 7px;
  margin: 0 20px;
  padding: 0 10px;
  border-radius: 8px;
  background: #f3f5f8;
  color: #9fa6b2;
}

.chat-history__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 11px;
}

.chat-history__list {
  display: grid;
  gap: 3px;
  margin-top: 12px;
  overflow-y: auto;
  padding: 0 10px 14px;
}

.chat-history__list button {
  display: grid;
  min-height: 52px;
  align-items: center;
  gap: 9px;
  grid-template-columns: 17px minmax(0, 1fr);
  padding: 7px 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #596273;
  text-align: left;
  cursor: pointer;
}

.chat-history__list button:hover,
.chat-history__list button.active {
  background: #f1f5ff;
  color: #356fe0;
}

.chat-history__list button > svg {
  font-size: 14px;
}

.chat-history__list button > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.chat-history__list strong {
  overflow: hidden;
  color: #444c5a;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-history__list small {
  color: #a0a7b3;
  font-size: 9px;
}

.chat-history__empty {
  display: grid;
  margin: auto 22px;
  justify-items: center;
  color: #a0a7b3;
  text-align: center;
}

.chat-history__empty > svg {
  width: 37px;
  height: 37px;
  margin-bottom: 14px;
  color: #d0d5dd;
}

.chat-history__empty strong {
  color: #737c8a;
  font-size: 12px;
}

.chat-history__empty span {
  max-width: 180px;
  margin-top: 7px;
  font-size: 10px;
  line-height: 1.6;
}

.chat-main {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: radial-gradient(circle at 50% 35%, rgb(240 245 255 / 70%), transparent 430px), #fff;
}

.chat-main__toolbar {
  display: flex;
  height: 70px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 28px;
  border-bottom: 1px solid #eef0f4;
}

.chat-main__toolbar > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.chat-main__mark,
.chat-welcome__mark {
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(145deg, #68a2ff, #326de8);
  color: #fff;
  font-weight: 850;
  box-shadow: 0 8px 18px rgb(76 132 255 / 22%);
}

.chat-main__mark {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  font-size: 13px;
}

.chat-main__toolbar strong {
  font-size: 14px;
  white-space: nowrap;
}

.chat-main__model-select {
  width: 154px;
}

.chat-main__model-select :deep(.ant-select-selector) {
  border-color: #e2e6ec !important;
}

.chat-main__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #7c8593;
  font-size: 10px;
  white-space: nowrap;
}

.chat-main__status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #25ae68;
  box-shadow: 0 0 0 3px rgb(37 174 104 / 10%);
}

.chat-main__status.error {
  color: #b5534b;
}

.chat-main__status.error i {
  background: #e85d5d;
  box-shadow: 0 0 0 3px rgb(232 93 93 / 10%);
}

.chat-conversation {
  overflow-y: auto;
  padding: 48px 28px 24px;
}

.chat-conversation.active {
  padding-top: 30px;
}

.chat-loading {
  display: grid;
  min-height: 280px;
  place-items: center;
  align-content: center;
  gap: 12px;
  color: #7c8696;
  font-size: 12px;
}

.chat-loading :deep(svg) {
  color: #4c84ff;
  font-size: 24px;
}

.chat-welcome {
  display: grid;
  max-width: 760px;
  justify-items: center;
  margin: 4vh auto 0;
  text-align: center;
}

.chat-welcome__mark {
  width: 54px;
  height: 54px;
  font-size: 20px;
}

.chat-welcome h1 {
  margin: 20px 0 0;
  font-size: 25px;
}

.chat-welcome > p {
  margin: 9px 0 0;
  color: #858e9c;
  font-size: 12px;
}

.chat-suggestions {
  display: grid;
  width: 100%;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 28px;
}

.chat-suggestions button {
  display: grid;
  min-height: 112px;
  align-content: start;
  justify-items: start;
  padding: 13px;
  border: 1px solid #e5e8ee;
  border-radius: 10px;
  background: rgb(255 255 255 / 88%);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.chat-suggestions button:hover {
  border-color: #abc6ff;
  box-shadow: 0 12px 26px rgb(38 79 147 / 7%);
  transform: translateY(-2px);
}

.chat-suggestions button > span {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 8px;
  background: #edf3ff;
  color: #4c84ff;
}

.chat-suggestions strong {
  margin-top: 12px;
  font-size: 11px;
}

.chat-suggestions p {
  margin: 5px 0 0;
  color: #8992a0;
  font-size: 9px;
  line-height: 1.55;
}

.chat-messages {
  display: grid;
  max-width: 820px;
  gap: 22px;
  margin: 0 auto;
}

.chat-message {
  display: grid;
  align-items: start;
  gap: 11px;
  grid-template-columns: 34px minmax(0, 1fr);
}

.chat-message > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #edf3ff;
  color: #4c84ff;
  font-size: 11px;
  font-weight: 800;
}

.chat-message--user {
  grid-template-columns: minmax(0, 1fr) 34px;
}

.chat-message--user > span {
  grid-column: 2;
  grid-row: 1;
  background: #f0f1f4;
  color: #636c7a;
}

.chat-message--user p {
  grid-column: 1;
  grid-row: 1;
  justify-self: end;
  background: #edf3ff;
}

.chat-message p {
  margin: 0;
  padding: 12px 14px;
  border-radius: 11px;
  background: #f6f7f9;
  color: #363d48;
  font-size: 12px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.chat-message--failed p {
  border: 1px solid #f1d3cf;
  background: #fff8f7;
  color: #9d4e48;
}

.chat-message p em {
  display: block;
  margin-top: 5px;
  color: #a0a7b3;
  font-size: 10px;
  font-style: normal;
}

.chat-message__cursor {
  display: inline-block;
  width: 6px;
  height: 14px;
  margin-left: 3px;
  vertical-align: -2px;
  background: #4c84ff;
  animation: cursor-blink 900ms steps(2, jump-none) infinite;
}

@keyframes cursor-blink {
  50% {
    opacity: 0;
  }
}

.chat-composer {
  display: grid;
  justify-items: center;
  padding: 12px 24px 20px;
}

.chat-error {
  display: flex;
  width: min(100%, 820px);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
  padding: 9px 11px;
  border: 1px solid #f1d4d1;
  border-radius: 9px;
  background: #fff8f7;
  color: #9a554f;
  font-size: 10px;
  line-height: 1.5;
}

.chat-error span {
  min-width: 0;
}

.chat-error strong {
  margin-right: 5px;
}

.chat-error button {
  display: inline-flex;
  height: 27px;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid #edc5c0;
  border-radius: 6px;
  background: #fff;
  color: #9a554f;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

.chat-composer__inner {
  width: min(100%, 820px);
  padding: 11px 12px 9px;
  border: 1px solid #dce1e8;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 14px 34px rgb(36 54 86 / 8%);
}

.chat-composer textarea {
  display: block;
  width: 100%;
  min-height: 62px;
  padding: 2px 2px 8px;
  border: 0;
  outline: 0;
  color: #2f3540;
  font-size: 12px;
  line-height: 1.7;
  resize: none;
}

.chat-composer textarea:disabled {
  color: #858d9a;
  cursor: wait;
}

.chat-composer__footer {
  display: flex;
  min-height: 33px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chat-composer__footer > div {
  display: flex;
  min-width: 0;
  gap: 6px;
}

.chat-composer__footer button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: #f5f6f8;
  color: #687180;
  font-size: 9px;
  cursor: pointer;
}

.chat-composer__footer > div button:first-child {
  width: 30px;
  padding: 0;
}

.chat-composer__footer .chat-composer__send {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  background: #4c84ff;
  color: #fff;
}

.chat-composer__footer .chat-composer__send--stop {
  background: #f1f2f4;
  color: #4e5765;
}

.chat-composer__send:disabled {
  background: #d6dbe3;
  cursor: not-allowed;
}

.chat-composer > small {
  margin-top: 8px;
  color: #9da5b1;
  font-size: 9px;
}

@media (max-width: 900px) {
  .chat-suggestions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .chat-view {
    display: block;
    min-height: calc(100vh - 56px);
  }

  .chat-history {
    display: none;
  }

  .chat-main {
    min-height: calc(100vh - 118px);
  }

  .chat-main__toolbar {
    height: 56px;
    padding: 0 14px;
  }

  .chat-main__toolbar strong {
    display: none;
  }

  .chat-main__model-select {
    width: 134px;
  }

  .chat-conversation {
    padding: 34px 14px 20px;
  }

  .chat-welcome {
    margin-top: 2vh;
  }

  .chat-welcome h1 {
    font-size: 21px;
  }

  .chat-suggestions {
    grid-template-columns: 1fr 1fr;
  }

  .chat-composer {
    padding: 10px 12px 16px;
  }

  .chat-error {
    align-items: flex-start;
  }
}
</style>
