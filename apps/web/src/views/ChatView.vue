<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  BulbOutlined,
  CheckOutlined,
  CloseOutlined,
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  DislikeOutlined,
  DownOutlined,
  EditOutlined,
  FilePptOutlined,
  FileTextOutlined,
  LikeOutlined,
  LoadingOutlined,
  MenuOutlined,
  MessageOutlined,
  MoreOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ChartThumbnail from '@/components/ChartThumbnail.vue';
import ChatComposer from '@/components/ChatComposer.vue';
import HomeDiscovery from '@/components/HomeDiscovery.vue';
import MarkdownMessage from '@/components/MarkdownMessage.vue';
import MessageAttachments from '@/components/MessageAttachments.vue';
import { useChatWorkspaceStore } from '@/stores/chat-workspace';
import { useSessionStore } from '@/stores/session';
import type { ConversationSummary, ReasoningEffort } from '@/app/api';

const route = useRoute();
const sessionStore = useSessionStore();
const chatStore = useChatWorkspaceStore();
const { conversations, error, messages, models, selectedModelAlias, status, streaming } =
  storeToRefs(chatStore);

const prompt = ref('');
const reasoningEffort = ref<ReasoningEffort>();
const taskMode = ref(false);
const search = ref('');
const conversationArea = ref<HTMLElement | null>(null);
const composerInput = ref<InstanceType<typeof ChatComposer> | null>(null);
const historyOpen = ref(false);
const historyFilterOpen = ref(false);
const historyModelFilter = ref('');
const historyRefreshing = ref(false);
const historyClearing = ref(false);
const settingsOpen = ref(false);
const showModelIcons = ref(true);
const copiedMessageId = ref('');
const messageFeedback = ref<Record<string, '' | 'dislike' | 'like'>>({});
const editingConversationId = ref('');
const editingConversationTitle = ref('');
const conversationMutationId = ref('');
const renameConversationInput = ref<HTMLInputElement | null>(null);

const suggestions = [
  {
    description: '对比主要功能、覆盖范围与差异',
    icon: AppstoreOutlined,
    label: '创建产品功能对比矩阵',
    prompt: '请帮我创建一份产品功能对比矩阵，对比主要功能、覆盖范围和差异。',
  },
  {
    description: '用树形图梳理预算结构和层级',
    icon: BulbOutlined,
    label: '使用树形图可视化公司预算',
    prompt: '请使用树形图可视化公司预算，梳理预算结构和各层级占比。',
  },
  {
    description: '加入目标、结果与跟踪机制',
    icon: FileTextOutlined,
    label: '撰写带有 OKR 跟踪的团队生产力报告',
    prompt: '请撰写一份带有 OKR 跟踪的团队生产力报告，包含目标、结果和改进建议。',
  },
  {
    description: '分析市场机会、风险和优先级',
    icon: CodeOutlined,
    label: '为产品发布呈现市场机会分析',
    prompt: '请为产品发布呈现市场机会分析，说明目标市场、机会、风险和优先级。',
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
    label: '象形柱图',
    prompt: '请把下面的数据整理成象形柱图，用直观图形对比各类别的数量和规模。',
    preview: 'pictorial-bar',
  },
  {
    label: '气泡图',
    prompt: '请把下面的数据整理成气泡图分析，同时比较数值、规模和分布关系。',
    preview: 'bubble',
  },
  {
    label: '旭日图',
    prompt: '请把下面的数据整理成旭日图分析，展示多层级分类的组成和占比关系。',
    preview: 'sunburst',
  },
  {
    label: '面积图',
    prompt: '请把下面的数据整理成面积图分析，展示总体变化趋势和累计规模。',
    preview: 'area',
  },
  {
    label: '漏斗图',
    prompt: '请把下面的数据整理成漏斗图分析，说明各阶段的转化和流失情况。',
    preview: 'funnel',
  },
  {
    label: '矩形树图',
    prompt: '请把下面的数据整理成矩形树图分析，比较各类别的规模占比和层级结构。',
    preview: 'treemap',
  },
  {
    label: 'K线图',
    prompt: '请把下面的数据整理成 K 线图分析，说明开盘、收盘、最高和最低价的走势。',
    preview: 'candlestick',
  },
  {
    label: '流程图',
    prompt: '请把下面的信息整理成流程图，明确步骤、判断分支和流转方向。',
    preview: 'flow',
  },
  {
    label: '甘特图',
    prompt: '请把下面的任务整理成甘特图分析，展示时间范围、依赖关系和关键路径。',
    preview: 'gantt',
  },
  {
    label: '地理坐标/地图',
    prompt: '请把下面的数据整理成地图分析，展示地域分布、差异和热点区域。',
    preview: 'map',
  },
  {
    label: '盒须图',
    prompt: '请把下面的数据整理成盒须图分析，比较中位数、四分位范围和异常值。',
    preview: 'box',
  },
  {
    label: '关系图',
    prompt: '请把下面的数据整理成关系图分析，说明节点之间的联系、强度和群体结构。',
    preview: 'graph',
  },
  {
    label: '路径图',
    prompt: '请把下面的信息整理成路径图，展示用户行为顺序、节点跳转和关键路径。',
    preview: 'path',
  },
  {
    label: '树状图',
    prompt: '请把下面的数据结构整理成树状图，展示父子关系、层级和分支。',
    preview: 'tree',
  },
  {
    label: '平行坐标系',
    prompt: '请把下面的多指标数据整理成平行坐标图，比较不同样本在各维度上的表现。',
    preview: 'parallel',
  },
  {
    label: '仪表盘',
    prompt: '请把下面的指标整理成仪表盘分析，展示当前值、目标值和健康区间。',
    preview: 'gauge',
  },
  {
    label: '日历坐标系',
    prompt: '请把下面的数据整理成日历热力分析，展示周期规律、峰值日期和异常波动。',
    preview: 'calendar',
  },
  {
    label: '矩阵坐标系',
    prompt: '请把下面的数据整理成矩阵图分析，比较两个维度组合下的分布和强弱关系。',
    preview: 'matrix',
  },
  {
    label: '和弦图',
    prompt: '请把下面的关系数据整理成和弦图，展示类别之间的双向联系和联系强度。',
    preview: 'chord',
  },
];

const hasMessages = computed(() => messages.value.length > 0);
const isHome = computed(() => route.name === 'home');
const selectedModel = computed(() =>
  models.value.find((model) => model.alias === selectedModelAlias.value),
);
const modelOptions = computed(() =>
  models.value.map((model) => ({
    label: model.displayName,
    value: model.alias,
  })),
);
const historyModelOptions = computed(() => {
  const aliases = [...new Set(conversations.value.map((conversation) => conversation.modelAlias))];

  return aliases.filter(Boolean).map((alias) => ({
    alias,
    label: models.value.find((model) => model.alias === alias)?.displayName ?? alias,
  }));
});
const modelSeries = computed(() => {
  const series = [
    { color: '#6d5dfc', glyph: 'AI', label: 'AI 系列', pattern: /ai|gpt|openai/i },
    { color: '#7a5cff', glyph: 'D', label: 'DeepSeek 系列', pattern: /deepseek/i },
    { color: '#e28732', glyph: '通', label: '通义千问系列', pattern: /qwen|通义/i },
    { color: '#15966e', glyph: 'L', label: 'Llama 系列', pattern: /llama/i },
  ];

  return series.filter((item) =>
    models.value.some((model) => item.pattern.test(`${model.alias} ${model.displayName}`)),
  );
});
const selectedModelMark = computed(() => {
  const modelText = `${selectedModel.value?.alias ?? ''} ${selectedModel.value?.displayName ?? ''}`;

  return modelSeries.value.find((item) => item.pattern.test(modelText))?.glyph ?? '极';
});
const filteredConversations = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return conversations.value.filter((conversation) => {
    const matchesKeyword = !keyword || conversation.title.toLowerCase().includes(keyword);
    const matchesModel =
      !historyModelFilter.value || conversation.modelAlias === historyModelFilter.value;

    return matchesKeyword && matchesModel;
  });
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

function selectHomeModel(alias: string) {
  if (hasMessages.value || streaming.value) {
    return;
  }

  selectedModelAlias.value = alias;
}

watch(
  () => messages.value.at(-1)?.content,
  () => {
    void scrollToBottom(false);
  },
);

onMounted(async () => {
  try {
    showModelIcons.value = window.localStorage.getItem('aurora.chat.showModelIcons') !== 'false';
  } catch {
    showModelIcons.value = true;
  }

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

async function sendMessage(payload: { fileIds: string[] } = { fileIds: [] }): Promise<void> {
  const content = prompt.value.trim();

  if (!content || streaming.value) {
    return;
  }

  const attachments = composerInput.value?.takeReadyAttachments() ?? [];
  const fileIds =
    payload.fileIds.length > 0
      ? payload.fileIds
      : attachments.map((attachment) => attachment.fileId);

  prompt.value = '';
  await chatStore.sendMessage(content, {
    attachments,
    fileIds,
    reasoningEffort: reasoningEffort.value,
    taskMode: taskMode.value,
  });
  await scrollToBottom();
}

async function openConversation(conversationId: string): Promise<void> {
  await chatStore.openConversation(conversationId);
  historyOpen.value = false;
  await scrollToBottom();
}

async function refreshHistory(): Promise<void> {
  if (historyRefreshing.value || streaming.value) {
    return;
  }

  historyRefreshing.value = true;

  try {
    await chatStore.loadConversations();
  } catch {
    // The store exposes the server error through the existing composer alert.
  } finally {
    historyRefreshing.value = false;
  }
}

function toggleHistoryModelFilter(alias: string): void {
  historyModelFilter.value = historyModelFilter.value === alias ? '' : alias;
}

async function clearAllConversations(): Promise<void> {
  if (streaming.value || historyClearing.value || conversations.value.length === 0) {
    return;
  }

  historyClearing.value = true;

  try {
    const conversationIds = conversations.value.map((conversation) => conversation.id);

    for (const conversationId of conversationIds) {
      await chatStore.deleteConversation(conversationId);
    }

    chatStore.newConversation();
    historyModelFilter.value = '';
    search.value = '';
    await scrollToBottom(false);
  } catch {
    // The first failed deletion leaves the remaining conversations untouched.
  } finally {
    historyClearing.value = false;
  }
}

function toggleModelIcons(): void {
  showModelIcons.value = !showModelIcons.value;

  try {
    window.localStorage.setItem('aurora.chat.showModelIcons', String(showModelIcons.value));
  } catch {
    // Storage is optional; the in-memory setting still applies.
  }
}

async function startConversationRename(conversation: ConversationSummary): Promise<void> {
  if (streaming.value) {
    return;
  }

  editingConversationId.value = conversation.id;
  editingConversationTitle.value = conversation.title;
  await nextTick();
  renameConversationInput.value?.select();
}

function cancelConversationRename(): void {
  editingConversationId.value = '';
  editingConversationTitle.value = '';
}

function setRenameConversationInput(element: unknown): void {
  renameConversationInput.value = element instanceof HTMLInputElement ? element : null;
}

async function saveConversationTitle(conversation: ConversationSummary): Promise<void> {
  const title = editingConversationTitle.value.trim();

  if (!title || conversationMutationId.value || title === conversation.title) {
    if (!title || title === conversation.title) {
      cancelConversationRename();
    }

    return;
  }

  conversationMutationId.value = conversation.id;

  try {
    await chatStore.renameConversation(conversation.id, title);
    cancelConversationRename();
  } catch {
    // The store exposes the server error through the existing composer alert.
  } finally {
    conversationMutationId.value = '';
  }
}

async function deleteConversation(conversationId: string): Promise<void> {
  if (streaming.value || conversationMutationId.value) {
    return;
  }

  conversationMutationId.value = conversationId;

  try {
    await chatStore.deleteConversation(conversationId);
    prompt.value = '';
    await scrollToBottom(false);
  } catch {
    // The store exposes the server error through the existing composer alert.
  } finally {
    conversationMutationId.value = '';
  }
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

  await chatStore.sendMessage(lastUserMessage.content, {
    attachments: lastUserMessage.attachments,
    fileIds: lastUserMessage.attachments.map((attachment) => attachment.fileId),
  });
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
      aria-label="关闭历史记录"
      @click="historyOpen = false"
    />

    <aside class="chat-history" :class="{ open: historyOpen }" aria-label="历史记录">
      <header class="chat-history__header">
        <strong>历史记录</strong>
        <div class="chat-history__tools">
          <button type="button" aria-label="关闭历史记录" @click="historyOpen = false">
            <CloseOutlined />
          </button>
          <button
            type="button"
            aria-label="刷新历史记录"
            :disabled="historyRefreshing || streaming"
            @click="refreshHistory"
          >
            <ReloadOutlined :spin="historyRefreshing" />
          </button>
          <a-popconfirm
            title="清空全部历史记录？"
            description="所有会话和消息都会删除，此操作无法撤销。"
            ok-text="清空"
            cancel-text="取消"
            :disabled="streaming || historyClearing || conversations.length === 0"
            @confirm="clearAllConversations"
          >
            <button
              type="button"
              aria-label="清空历史记录"
              :disabled="streaming || historyClearing || conversations.length === 0"
            >
              <DeleteOutlined />
              <span>清空</span>
            </button>
          </a-popconfirm>
        </div>
      </header>

      <div class="chat-history__filter-bar">
        <button
          class="chat-history__filter-toggle"
          type="button"
          :class="{ active: historyFilterOpen || Boolean(historyModelFilter) }"
          aria-label="筛选历史记录"
          :aria-expanded="historyFilterOpen"
          @click="historyFilterOpen = !historyFilterOpen"
        >
          <SearchOutlined />
          <span>筛选</span>
        </button>
        <span v-if="historyModelFilter" class="chat-history__active-filter">
          {{
            historyModelOptions.find((item) => item.alias === historyModelFilter)?.label ??
            historyModelFilter
          }}
          <button type="button" aria-label="清除模型筛选" @click="historyModelFilter = ''">
            <CloseOutlined />
          </button>
        </span>
        <button class="chat-history__new" type="button" @click="startNewConversation">
          <PlusOutlined />
          新对话
        </button>
      </div>

      <div v-if="historyFilterOpen" class="chat-history__filters">
        <button
          v-for="item in historyModelOptions"
          :key="item.alias"
          type="button"
          :class="{ active: historyModelFilter === item.alias }"
          @click="toggleHistoryModelFilter(item.alias)"
        >
          {{ item.label }}
        </button>
      </div>

      <label class="chat-history__search">
        <SearchOutlined />
        <input v-model="search" placeholder="搜索历史记录" />
      </label>

      <div v-if="filteredConversations.length > 0" class="chat-history__list">
        <div
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          class="chat-history__item"
          :class="{ active: conversation.id === chatStore.currentConversationId }"
        >
          <div v-if="editingConversationId === conversation.id" class="chat-history__rename">
            <MessageOutlined />
            <input
              :ref="setRenameConversationInput"
              v-model="editingConversationTitle"
              maxlength="80"
              aria-label="会话标题"
              @keydown.enter.prevent="saveConversationTitle(conversation)"
              @keydown.esc.prevent="cancelConversationRename"
            />
            <button
              type="button"
              aria-label="保存会话标题"
              :disabled="Boolean(conversationMutationId)"
              @click="saveConversationTitle(conversation)"
            >
              <CheckOutlined />
            </button>
            <button
              type="button"
              aria-label="取消重命名"
              :disabled="Boolean(conversationMutationId)"
              @click="cancelConversationRename"
            >
              <CloseOutlined />
            </button>
          </div>

          <template v-else>
            <button
              class="chat-history__item-main"
              type="button"
              @click="openConversation(conversation.id)"
            >
              <MessageOutlined />
              <span>
                <strong>{{ conversation.title }}</strong>
                <small>{{ formatConversationTime(conversation.lastMessageAt) }}</small>
              </span>
            </button>
            <div class="chat-history__item-actions">
              <button
                type="button"
                aria-label="重命名会话"
                :disabled="streaming || Boolean(conversationMutationId)"
                @click="startConversationRename(conversation)"
              >
                <EditOutlined />
              </button>
              <a-popconfirm
                title="删除这个会话？"
                description="会话消息会一并删除，此操作无法撤销。"
                ok-text="删除"
                cancel-text="取消"
                :disabled="streaming || Boolean(conversationMutationId)"
                @confirm="deleteConversation(conversation.id)"
              >
                <button
                  type="button"
                  aria-label="删除会话"
                  :disabled="streaming || Boolean(conversationMutationId)"
                >
                  <DeleteOutlined />
                </button>
              </a-popconfirm>
            </div>
          </template>
        </div>
      </div>

      <div v-else class="chat-history__empty">
        <strong>{{ search || historyModelFilter ? '没有匹配的历史记录' : '暂无历史记录' }}</strong>
      </div>

      <footer class="chat-history__footer">历史记录最长保留六个月，请及时导出记录。</footer>
    </aside>

    <HomeDiscovery
      v-if="isHome && !hasMessages"
      :active-alias="selectedModelAlias"
      :models="models"
      @select="selectHomeModel"
    />

    <main class="chat-main">
      <header class="chat-main__toolbar">
        <div class="chat-main__identity">
          <button
            class="chat-main__history-toggle"
            type="button"
            aria-label="打开历史记录"
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
        <div class="chat-main__center">
          <nav class="chat-mode-switch" aria-label="对话模式">
            <RouterLink class="active" :to="isHome ? '/' : '/newchat'">
              <MessageOutlined />
              模型对话
              <i class="chat-mode-switch__badge">New</i>
            </RouterLink>
            <RouterLink to="/newchat/groups">
              <AppstoreOutlined />
              超级对话
            </RouterLink>
          </nav>
          <a-popover
            v-model:open="settingsOpen"
            placement="bottom"
            trigger="click"
            overlay-class-name="chat-settings-popover"
          >
            <template #content>
              <div class="chat-settings">
                <strong>显示AI模型图标</strong>
                <a-switch
                  size="small"
                  :checked="showModelIcons"
                  aria-label="显示AI模型图标"
                  @change="toggleModelIcons"
                />
              </div>
            </template>
            <button class="chat-main__settings" type="button" aria-label="对话设置">
              <SettingOutlined />
            </button>
          </a-popover>
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
          <div v-if="modelSeries.length > 0" class="chat-model-series" aria-label="支持的模型系列">
            <span v-for="item in modelSeries" :key="item.label">
              <i :style="{ background: item.color }">{{ item.glyph }}</i>
              {{ item.label }}
            </span>
          </div>

          <div class="chat-welcome__heading">
            <h1>
              您好，
              <span
                >👋今天有什么我可以帮你的<i class="chat-welcome__caret" aria-hidden="true"
              /></span>
            </h1>
          </div>

          <ChatComposer
            ref="composerInput"
            v-model="prompt"
            :attachment-enabled="sessionStore.authenticated"
            :can-send="canSend"
            :error="error"
            :placeholder="`给 ${selectedModel?.displayName ?? '当前模型'} 发消息`"
            placement="welcome"
            :reasoning-effort="reasoningEffort"
            :streaming="streaming"
            :task-mode="taskMode"
            @update:reasoning-effort="reasoningEffort = $event"
            @update:task-mode="taskMode = $event"
            @retry="retryLastPrompt"
            @send="sendMessage"
            @stop="chatStore.stopStreaming"
          />

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
              <strong>{{ item.label }}</strong>
              <p>{{ item.description }}</p>
              <ArrowUpOutlined class="chat-suggestions__arrow" aria-hidden="true" />
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
            <span
              :class="{
                'chat-message__avatar--model': message.role === 'assistant' && showModelIcons,
              }"
            >
              {{
                message.role === 'assistant' && showModelIcons
                  ? selectedModelMark
                  : message.role === 'assistant'
                    ? '极'
                    : '我'
              }}
            </span>
            <MessageAttachments
              v-if="message.role === 'user' && message.attachments.length > 0"
              :attachments="message.attachments"
            />
            <MarkdownMessage
              v-if="message.role === 'assistant' && message.status === 'COMPLETED'"
              class="chat-message__markdown"
              :content="message.content"
            />
            <MarkdownMessage
              v-else-if="message.role === 'assistant' && message.status === 'STREAMING'"
              class="chat-message__markdown"
              :content="message.content"
              streaming
            />
            <p v-else>
              {{ message.content }}
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

      <ChatComposer
        v-if="hasMessages"
        ref="composerInput"
        v-model="prompt"
        :attachment-enabled="sessionStore.authenticated"
        :can-send="canSend"
        :error="error"
        :placeholder="`给 ${selectedModel?.displayName ?? '当前模型'} 发消息`"
        placement="docked"
        :reasoning-effort="reasoningEffort"
        :streaming="streaming"
        :task-mode="taskMode"
        @update:reasoning-effort="reasoningEffort = $event"
        @update:task-mode="taskMode = $event"
        @retry="retryLastPrompt"
        @send="sendMessage"
        @stop="chatStore.stopStreaming"
      />
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
  z-index: 60;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  width: min(92vw, 390px);
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #e8ebf0;
  background: #fff;
  box-shadow: -18px 0 44px rgb(31 43 65 / 12%);
  transform: translateX(105%);
  transition: transform 180ms ease;
}

.chat-history__backdrop {
  position: fixed;
  z-index: 55;
  inset: 0;
  display: block;
  padding: 0;
  border: 0;
  background: rgb(28 36 50 / 20%);
}

.chat-history.open {
  transform: translateX(0);
}

.chat-history > header {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 18px;
  border-bottom: 1px solid #eef0f4;
}

.chat-history > header strong {
  font-size: 16px;
  font-weight: 650;
}

.chat-history__tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat-history__tools button {
  display: inline-flex;
  min-width: 31px;
  height: 31px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: #fff;
  color: #596273;
  font-size: 11px;
  cursor: pointer;
}

.chat-history__tools button:hover,
.chat-history__tools button:focus-visible {
  background: #f3f6fb;
  color: #356fe0;
}

.chat-history__tools button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chat-history__filter-bar {
  display: flex;
  min-height: 49px;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
}

.chat-history__filter-toggle {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #596273;
  font-size: 11px;
  cursor: pointer;
}

.chat-history__filter-toggle.active {
  color: #356fe0;
}

.chat-history__active-filter {
  display: inline-flex;
  min-width: 0;
  height: 26px;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  padding: 0 5px 0 9px;
  border-radius: 7px;
  background: #f5f1ff;
  color: #7a5cff;
  font-size: 10px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-history__active-filter button {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.chat-history__new {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 0 8px;
  border: 1px solid #dce7ff;
  border-radius: 7px;
  background: #fff;
  color: #4c84ff;
  font-size: 10px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
}

.chat-history__new:hover {
  background: #f3f7ff;
}

.chat-history__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 18px 13px;
}

.chat-history__filters button {
  min-width: 0;
  height: 27px;
  overflow: hidden;
  padding: 0 10px;
  border: 1px solid #e3e7ef;
  border-radius: 7px;
  background: #fff;
  color: #687181;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.chat-history__filters button.active {
  border-color: #c9b8ff;
  background: #f5f1ff;
  color: #6f55df;
}

.chat-history__search {
  display: flex;
  height: 35px;
  align-items: center;
  gap: 7px;
  margin: 0 18px 12px;
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
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 14px;
}

.chat-history__item {
  display: grid;
  position: relative;
  min-height: 52px;
  align-items: center;
  grid-template-columns: minmax(0, 1fr) auto;
  border-radius: 8px;
  background: transparent;
  color: #596273;
  transition:
    background 150ms ease,
    color 150ms ease;
}

.chat-history__item:hover,
.chat-history__item:focus-within,
.chat-history__item.active {
  background: #f1f5ff;
  color: #356fe0;
}

.chat-history__item-main {
  display: grid;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  gap: 9px;
  grid-template-columns: 17px minmax(0, 1fr);
  padding: 7px 4px 7px 9px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.chat-history__item-main > svg {
  font-size: 14px;
}

.chat-history__item-main > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.chat-history__item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 6px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.chat-history__item:hover .chat-history__item-actions,
.chat-history__item:focus-within .chat-history__item-actions,
.chat-history__item.active .chat-history__item-actions {
  opacity: 1;
}

.chat-history__item-actions button,
.chat-history__rename button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #7c8593;
  cursor: pointer;
}

.chat-history__item-actions button:hover,
.chat-history__rename button:hover {
  border-color: #dbe5f8;
  background: #fff;
  color: #3979ed;
}

.chat-history__item-actions button:last-child:hover {
  border-color: #f1d3cf;
  color: #cc554d;
}

.chat-history__item-actions button:disabled,
.chat-history__rename button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chat-history__rename {
  display: grid;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  gap: 6px;
  grid-column: 1 / -1;
  grid-template-columns: 17px minmax(0, 1fr) 26px 26px;
  padding: 7px 6px 7px 9px;
}

.chat-history__rename > svg {
  color: #4c84ff;
  font-size: 14px;
}

.chat-history__rename input {
  width: 100%;
  min-width: 0;
  height: 29px;
  padding: 0 8px;
  border: 1px solid #9dbdff;
  border-radius: 6px;
  outline: 0;
  background: #fff;
  color: #3f4653;
  font-size: 11px;
  box-shadow: 0 0 0 2px rgb(76 132 255 / 10%);
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
  min-height: 0;
  flex: 1;
  margin: 0 22px;
  place-items: center;
  color: #a0a7b3;
  text-align: center;
}

.chat-history__empty strong {
  color: #a2a8b3;
  font-size: 12px;
  font-weight: 500;
}

.chat-history__footer {
  margin-top: auto;
  padding: 14px 18px 17px;
  border-top: 1px solid #f0f2f5;
  color: #a2a8b3;
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
}

.chat-main {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr);
  background: #fff;
}

.chat-main__toolbar {
  display: grid;
  height: 80px;
  align-items: center;
  gap: 18px;
  grid-template-columns: minmax(150px, 1fr) auto minmax(150px, 1fr);
  padding: 0 24px;
  border-bottom: 1px solid #eef0f4;
}

.chat-main__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: row-reverse;
  gap: 10px;
  justify-content: flex-end;
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

.chat-main__toolbar strong {
  font-size: 14px;
  white-space: nowrap;
}

.chat-main__model-select {
  width: 178px;
}

.chat-main__model-select :deep(.ant-select-selector) {
  border-color: #e2e6ec !important;
}

.chat-main__center {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: center;
}

.chat-main__settings {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #697283;
  cursor: pointer;
}

.chat-main__settings:hover,
.chat-main__settings:focus-visible {
  background: #f3f6fb;
  color: #356fe0;
}

.chat-settings {
  display: flex;
  width: 180px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 3px 2px;
}

.chat-settings strong {
  color: #313643;
  font-size: 12px;
  font-weight: 550;
  white-space: nowrap;
}

:global(.chat-settings-popover .ant-popover-inner) {
  padding: 13px 14px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgb(31 43 65 / 12%);
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
  position: relative;
  display: inline-flex;
  height: 31px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 999px;
  color: #6e7787;
  font-size: 12px;
  font-weight: 750;
  text-decoration: none;
  white-space: nowrap;
}

.chat-mode-switch__badge {
  position: absolute;
  top: -7px;
  right: -2px;
  padding: 1px 5px 1px 6px;
  border-radius: 8px 8px 8px 2px;
  background: #ff4d4f;
  box-shadow: 0 3px 8px rgb(255 77 79 / 32%);
  color: #fff;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.35;
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
  padding: 56px 24px 24px;
}

.chat-conversation.active {
  padding-top: 26px;
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
  position: relative;
  width: min(100%, 820px);
  justify-items: stretch;
  margin: 94px auto 16px;
}

.chat-model-series {
  display: grid;
  position: absolute;
  top: -66px;
  right: 0;
  gap: 8px;
  justify-items: end;
}

.chat-model-series span {
  display: inline-flex;
  height: 25px;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 5px;
  border-radius: 6px;
  background: #fff7f7;
  color: #9b7272;
  font-size: 10px;
  white-space: nowrap;
}

.chat-model-series span:nth-child(2n) {
  background: #f3f7ff;
  color: #7082a0;
}

.chat-model-series i {
  display: grid;
  width: 17px;
  height: 17px;
  place-items: center;
  border-radius: 4px;
  color: #fff;
  font-size: 8px;
  font-style: normal;
  font-weight: 800;
}

.chat-welcome__heading {
  margin-bottom: 28px;
}

.chat-welcome h1 {
  margin: 0;
  color: #313643;
  font-size: 25px;
  font-weight: 800;
  line-height: 1.3;
  text-align: left;
}

.chat-welcome h1 span {
  display: block;
  margin-top: 0;
}

.chat-welcome__caret {
  display: inline-block;
  width: 3px;
  height: 0.9em;
  margin-left: 6px;
  border-radius: 1px;
  background: #2f3442;
  vertical-align: -0.05em;
  animation: chat-welcome-caret 1.1s steps(1, end) infinite;
}

@keyframes chat-welcome-caret {
  0%,
  50% {
    opacity: 1;
  }

  50.01%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-welcome__caret {
    animation: none;
  }
}

.chat-capabilities {
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 26px;
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
  margin-top: 36px;
  text-align: left;
}

.chat-welcome__section-title--charts {
  margin-top: 28px;
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
  gap: 9px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 6px;
}

.chat-suggestions button {
  display: grid;
  position: relative;
  min-height: 91px;
  align-content: space-between;
  justify-items: start;
  padding: 14px 15px 13px;
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

.chat-suggestions strong {
  padding-right: 20px;
  color: #414958;
  font-size: 12px;
  line-height: 1.65;
}

.chat-suggestions p {
  margin: 8px 22px 0 0;
  color: #8992a0;
  font-size: 9px;
  line-height: 1.55;
}

.chat-suggestions__arrow {
  position: absolute;
  right: 12px;
  bottom: 11px;
  color: #9aa4b2;
  font-size: 11px;
  transform: rotate(45deg);
}

.chat-chart-types {
  display: grid;
  width: 100%;
  gap: 7px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-top: 11px;
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
  gap: 28px;
  margin: 0 auto;
}

.chat-message {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: 32px minmax(0, 1fr);
}

.chat-message > span {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: #edf3ff;
  color: #4c84ff;
  font-size: 11px;
  font-weight: 800;
}

.chat-message > span.chat-message__avatar--model {
  border: 1px solid #e1e8f7;
  background: #f7f9ff;
  color: #6d5dfc;
  font-size: 10px;
}

.chat-message--user {
  grid-template-columns: minmax(0, 1fr) 32px;
}

.chat-message--user > span {
  grid-column: 2;
  grid-row: 1;
  background: #f0f1f4;
  color: #636c7a;
}

.chat-message.chat-message--user p {
  grid-column: 1;
  grid-row: 1;
  justify-self: end;
  width: fit-content;
  max-width: min(640px, 82%);
  border-radius: 12px 12px 4px 12px;
  background: #1f7ae8;
  color: #ffffff;
  text-align: left;
}

.chat-message--user > .message-attachments {
  grid-column: 1;
  grid-row: 1;
  justify-self: end;
}

.chat-message--user > .message-attachments + p {
  grid-row: 2;
  margin-top: 8px;
}

.chat-message p {
  margin: 0;
  padding: 2px 0;
  color: #303640;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.chat-message__markdown {
  margin: 0;
  padding: 2px 0;
  background: transparent;
  color: #303640;
  font-size: 13px;
  line-height: 1.8;
}

.chat-message--user .chat-message__markdown {
  justify-self: end;
  width: fit-content;
  max-width: min(640px, 82%);
  padding: 10px 14px;
  border-radius: 12px 12px 4px 12px;
  background: #1f7ae8;
  color: #ffffff;
  text-align: left;
}

.chat-message--failed p {
  border: 1px solid #f1d3cf;
  border-radius: 10px;
  padding: 10px 12px;
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
  justify-content: flex-end;
  gap: 3px;
  margin-top: 4px;
}

.chat-message--user .chat-message__actions {
  grid-column: 1;
}

.chat-message__actions button {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #8c94a0;
  font-size: 12px;
  cursor: pointer;
}

.chat-message--assistant .chat-message__actions button > span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.chat-message__actions button:hover,
.chat-message__actions button.active {
  background: #f5f8ff;
  color: #3979ed;
}

.chat-message__actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .chat-model-series {
    display: none;
  }

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
    border-left: 1px solid #e3e7ec;
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
    margin-top: 36px;
  }

  .chat-welcome h1 {
    font-size: 22px;
  }

  .chat-welcome h1 span {
    margin-top: 12px;
  }

  .chat-welcome__heading {
    margin-bottom: 20px;
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

  .chat-message__actions {
    flex-wrap: nowrap;
    gap: 0;
  }

  .chat-message__actions button {
    width: 28px;
    height: 28px;
  }

  .chat-message--user p,
  .chat-message--user .chat-message__markdown {
    max-width: 86%;
  }
}

@media (hover: none) {
  .chat-history__item-actions {
    opacity: 1;
  }
}
</style>
