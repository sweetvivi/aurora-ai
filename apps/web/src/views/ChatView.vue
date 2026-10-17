<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  BulbOutlined,
  CodeOutlined,
  CopyOutlined,
  DislikeOutlined,
  DownOutlined,
  EditOutlined,
  FilePptOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LikeOutlined,
  LoadingOutlined,
  MenuOutlined,
  MessageOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  ThunderboltFilled,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ChartThumbnail from '@/components/ChartThumbnail.vue';
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
const composerInput = ref<HTMLTextAreaElement | null>(null);
const historyOpen = ref(false);
const copiedMessageId = ref('');
const messageFeedback = ref<Record<string, '' | 'dislike' | 'like'>>({});

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

const capabilities = [
  {
    icon: BarChartOutlined,
    label: '图表报告',
    prompt: '请根据我提供的数据生成一份图表报告，包含关键结论、图表建议和执行摘要。',
  },
  {
    icon: FilePptOutlined,
    label: '制作 PPT',
    prompt: '请帮我规划一份结构清晰、重点突出的演示 PPT，并给出每页标题和要点。',
  },
  {
    icon: AppstoreOutlined,
    label: '应用创作',
    prompt: '请帮我把一个想法梳理成可落地的应用方案，包含页面、流程和数据结构。',
  },
  {
    icon: PictureOutlined,
    label: '生图 / 设计',
    prompt: '请根据产品定位设计一组视觉方向，并给出可用于 AI 生图的详细提示词。',
  },
  {
    icon: VideoCameraOutlined,
    label: '创意视频',
    prompt: '请为一段 30 秒创意视频设计分镜、画面描述、字幕和镜头时长。',
  },
  {
    icon: MoreOutlined,
    label: '更多',
    prompt: '请询问我的具体任务目标，然后给出最合适的工作流程和步骤。',
  },
];

const chartTemplates = [
  {
    label: '折线图',
    prompt: '请把下面的数据整理成折线图分析，说明趋势、拐点和异常值。',
    preview: 'line',
  },
  {
    label: '柱状图',
    prompt: '请把下面的数据整理成柱状图分析，对比类别差异并给出结论。',
    preview: 'bar',
  },
  {
    label: '饼图',
    prompt: '请把下面的数据整理成占比分析，说明主要构成和变化原因。',
    preview: 'pie',
  },
  {
    label: '散点图',
    prompt: '请把下面的数据整理成散点图分析，识别相关性和离群点。',
    preview: 'scatter',
  },
  {
    label: '热力图',
    prompt: '请把下面的数据整理成热力图分析，识别高峰、低谷和明显聚集区域。',
    preview: 'heat',
  },
  {
    label: '气泡图',
    prompt: '请把下面的数据整理成气泡图分析，同时比较数值、规模和分布关系。',
    preview: 'bubble',
  },
  {
    label: '词云',
    prompt: '请把下面的文本整理成词云分析，提炼高频主题、关键词和语义关联。',
    preview: 'word',
  },
  {
    label: '桑基图',
    prompt: '请把下面的数据整理成桑基图分析，说明不同节点之间的流向和转化关系。',
    preview: 'sankey',
  },
  {
    label: '主题河流图',
    prompt: '请把下面的数据整理成主题河流图分析，展示多个主题随时间的占比变化。',
    preview: 'stream',
  },
  {
    label: '雷达图',
    prompt: '请把下面的数据整理成雷达图分析，对比各维度优势、短板和综合表现。',
    preview: 'radar',
  },
  {
    label: '堆积柱状图',
    prompt: '请把下面的数据整理成堆积柱状图分析，说明总量和各组成部分的变化。',
    preview: 'stack',
  },
  {
    label: '旭日图',
    prompt: '请把下面的数据整理成旭日图分析，展示多层级分类的组成和占比关系。',
    preview: 'sunburst',
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
  historyOpen.value = false;
  await scrollToBottom();
}

function startNewConversation(): void {
  chatStore.newConversation();
  prompt.value = '';
  search.value = '';
  historyOpen.value = false;
  void scrollToBottom(false);
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

async function regenerateMessage(messageId: string): Promise<void> {
  const assistantMessages = messages.value.filter((message) => message.role === 'assistant');

  if (streaming.value || !assistantMessages.length || assistantMessages.at(-1)?.id !== messageId) {
    return;
  }

  await chatStore.regenerateLastResponse();
  await scrollToBottom();
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
    <button
      v-if="historyOpen"
      class="chat-history__backdrop"
      type="button"
      aria-label="关闭历史会话"
      @click="historyOpen = false"
    />

    <aside class="chat-history" :class="{ open: historyOpen }">
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
        <div class="chat-main__identity">
          <button
            class="chat-main__history-toggle"
            type="button"
            aria-label="打开历史会话"
            @click="historyOpen = true"
          >
            <MenuOutlined />
          </button>
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
        <nav class="chat-mode-switch" aria-label="对话模式">
          <RouterLink class="active" to="/chat">
            <MessageOutlined />
            模型对话
          </RouterLink>
          <RouterLink to="/agents">
            <AppstoreOutlined />
            超级对话
          </RouterLink>
        </nav>
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

          <div class="chat-capabilities" aria-label="常用能力">
            <button
              v-for="item in capabilities"
              :key="item.label"
              type="button"
              @click="useSuggestion(item.prompt)"
            >
              <component :is="item.icon" />
              {{ item.label }}
            </button>
          </div>

          <div class="chat-welcome__section-title">
            <strong>示例提示词</strong>
            <span>点击即可填入输入框</span>
          </div>

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

          <div class="chat-welcome__section-title chat-welcome__section-title--charts">
            <strong>支持图表类型</strong>
            <span>生成报告时可直接指定</span>
          </div>

          <div class="chat-chart-types">
            <button
              v-for="item in chartTemplates"
              :key="item.label"
              type="button"
              :title="`使用${item.label}分析`"
              @click="useSuggestion(item.prompt)"
            >
              <span
                class="chat-chart-types__preview"
                :class="`chat-chart-types__preview--${item.preview}`"
                aria-hidden="true"
              >
                <ChartThumbnail :type="item.preview" />
              </span>
              <strong>{{ item.label }}</strong>
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
            <div
              v-if="message.role === 'assistant' && message.status === 'COMPLETED'"
              class="chat-message__actions"
            >
              <button
                type="button"
                :class="{ active: copiedMessageId === message.id }"
                :title="copiedMessageId === message.id ? '已复制' : '复制回答'"
                @click="copyMessage(message.id, message.content)"
              >
                <CopyOutlined />
                <span>{{ copiedMessageId === message.id ? '已复制' : '复制' }}</span>
              </button>
              <button type="button" title="继续追问" @click="continueMessage">
                <EditOutlined />
                <span>继续追问</span>
              </button>
              <button
                type="button"
                title="重新生成"
                :disabled="streaming"
                @click="regenerateMessage(message.id)"
              >
                <ReloadOutlined />
                <span>重新生成</span>
              </button>
              <button
                type="button"
                title="有帮助"
                :class="{ active: messageFeedback[message.id] === 'like' }"
                @click="toggleFeedback(message.id, 'like')"
              >
                <LikeOutlined />
              </button>
              <button
                type="button"
                title="需改进"
                :class="{ active: messageFeedback[message.id] === 'dislike' }"
                @click="toggleFeedback(message.id, 'dislike')"
              >
                <DislikeOutlined />
              </button>
            </div>
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
            ref="composerInput"
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
  display: block;
  min-height: calc(100vh - 56px);
  background: #fff;
}

.chat-history {
  position: fixed;
  z-index: 45;
  top: 56px;
  bottom: 0;
  left: 0;
  display: flex;
  width: min(86vw, 320px);
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e8ebf0;
  background: rgb(255 255 255 / 98%);
  box-shadow: 18px 0 44px rgb(31 43 65 / 14%);
  transform: translateX(-105%);
  transition: transform 180ms ease;
}

.chat-history__backdrop {
  position: fixed;
  z-index: 40;
  inset: 56px 0 0;
  display: block;
  padding: 0;
  border: 0;
  background: rgb(28 36 50 / 24%);
}

.chat-history.open {
  transform: translateX(0);
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
  display: grid;
  height: 70px;
  align-items: center;
  gap: 20px;
  grid-template-columns: minmax(150px, 1fr) auto minmax(150px, 1fr);
  padding: 0 28px;
  border-bottom: 1px solid #eef0f4;
}

.chat-main__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  justify-self: start;
}

.chat-main__history-toggle {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  border: 1px solid #e2e6ec;
  border-radius: 8px;
  background: #fff;
  color: #596273;
  cursor: pointer;
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
  width: 210px;
}

.chat-main__model-select :deep(.ant-select-selector) {
  border-color: #e2e6ec !important;
}

.chat-main__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: end;
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

.chat-mode-switch {
  display: inline-grid;
  padding: 3px;
  border: 1px solid #e0e8f7;
  border-radius: 999px;
  background: #f7f9fd;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chat-mode-switch a {
  display: inline-flex;
  height: 31px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border-radius: 999px;
  color: #6e7787;
  font-size: 11px;
  font-weight: 750;
  text-decoration: none;
  white-space: nowrap;
}

.chat-mode-switch a.active {
  background: #4c84ff;
  color: #fff;
  box-shadow: 0 7px 18px rgb(76 132 255 / 22%);
}

.chat-mode-switch a:not(.active):hover {
  background: #edf3ff;
  color: #356fe0;
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
  max-width: 880px;
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

.chat-capabilities {
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.chat-capabilities button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  border: 1px solid #e1e7f0;
  border-radius: 999px;
  background: rgb(255 255 255 / 92%);
  color: #4e5868;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.chat-capabilities button:hover {
  border-color: #a9c4ff;
  color: #356fe0;
  transform: translateY(-1px);
}

.chat-capabilities button :deep(svg) {
  color: #4c84ff;
  font-size: 13px;
}

.chat-welcome__section-title {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 28px;
  text-align: left;
}

.chat-welcome__section-title--charts {
  margin-top: 24px;
}

.chat-welcome__section-title strong {
  color: #414958;
  font-size: 12px;
}

.chat-welcome__section-title span {
  color: #9aa2af;
  font-size: 9px;
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

.chat-chart-types {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-top: 10px;
}

.chat-chart-types button {
  display: grid;
  min-width: 0;
  gap: 7px;
  justify-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #5f6877;
  cursor: pointer;
}

.chat-chart-types__preview {
  display: grid;
  width: 100%;
  aspect-ratio: 1.35;
  place-items: center;
  overflow: hidden;
  border: 1px solid #e4e8ef;
  border-radius: 7px;
  background: #fff;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.chat-chart-types button:hover .chat-chart-types__preview {
  border-color: #a9c4ff;
  box-shadow: 0 9px 18px rgb(41 78 144 / 8%);
  transform: translateY(-2px);
}

.chat-chart-types strong {
  overflow: hidden;
  max-width: 100%;
  font-size: 9px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.chat-message__actions {
  display: flex;
  grid-column: 2;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.chat-message--user .chat-message__actions {
  grid-column: 1;
}

.chat-message__actions button {
  display: inline-flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #8a93a0;
  font-size: 9px;
  cursor: pointer;
}

.chat-message__actions button:hover,
.chat-message__actions button.active {
  border-color: #dbe5f8;
  background: #f5f8ff;
  color: #3979ed;
}

.chat-message__actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

  .chat-chart-types {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .chat-view {
    display: block;
    min-height: calc(100vh - 56px);
  }

  .chat-history {
    border-right: 1px solid #e3e7ec;
  }

  .chat-history__backdrop {
    display: block;
  }

  .chat-main {
    min-height: calc(100vh - 118px);
  }

  .chat-main__toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    height: 56px;
    gap: 8px;
    padding: 0 14px;
  }

  .chat-main__identity {
    gap: 7px;
  }

  .chat-main__status {
    display: none;
  }

  .chat-main__model-select {
    width: 122px;
  }

  .chat-mode-switch a {
    height: 29px;
    gap: 4px;
    padding: 0 9px;
    font-size: 10px;
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

  .chat-capabilities {
    gap: 6px;
    margin-top: 18px;
  }

  .chat-capabilities button {
    height: 31px;
    padding: 0 10px;
  }

  .chat-capabilities button:last-child {
    display: none;
  }

  .chat-welcome__section-title {
    margin-top: 21px;
  }

  .chat-chart-types {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .chat-composer {
    padding: 10px 12px 16px;
  }

  .chat-message__actions {
    flex-wrap: wrap;
  }

  .chat-error {
    align-items: flex-start;
  }
}
</style>
