<script setup lang="ts">
import {
  AppstoreOutlined,
  CheckOutlined,
  CopyOutlined,
  DownOutlined,
  FireOutlined,
  LoadingOutlined,
  MessageOutlined,
  ReloadOutlined,
  RobotOutlined,
} from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ChartThumbnail from '@/components/ChartThumbnail.vue';
import ChatComposer from '@/components/ChatComposer.vue';
import MarkdownMessage from '@/components/MarkdownMessage.vue';
import MessageAttachments from '@/components/MessageAttachments.vue';
import {
  chatCapabilities,
  chatChartTemplates,
  chatSuggestions,
  type ChatCapabilityPreset,
} from '@/data/chat-presets';
import { useGroupChatWorkspaceStore, type GroupChatRound } from '@/stores/group-chat-workspace';
import { useModelCatalogStore, type ModelCatalogItem } from '@/stores/model-catalog';
import { useSessionStore } from '@/stores/session';

const sessionStore = useSessionStore();
const modelCatalog = useModelCatalogStore();
const groupStore = useGroupChatWorkspaceStore();
const { rounds, selectedModels, status } = storeToRefs(groupStore);

const prompt = ref('');
const selectorOpen = ref(false);
const selector = ref<HTMLElement | null>(null);
const conversationArea = ref<HTMLElement | null>(null);
const composerInput = ref<InstanceType<typeof ChatComposer> | null>(null);
const copiedResponseId = ref('');

const chatModels = computed(() => modelCatalog.modelsFor('chat'));
const hasRounds = computed(() => rounds.value.length > 0);
const lastRound = computed(() => rounds.value.at(-1));
const selectedAliases = computed(() => new Set(groupStore.selectedAliases));
const selectedCount = computed(() => selectedModels.value.length);
const canSend = computed(
  () =>
    Boolean(prompt.value.trim()) &&
    groupStore.canSend &&
    sessionStore.authenticated &&
    !groupStore.streaming,
);
const modelGroups = computed(() => {
  const groups = new Map<string, ModelCatalogItem[]>();

  for (const model of chatModels.value) {
    const label = resolveModelGroup(model);
    const items = groups.get(label) ?? [];

    items.push(model);
    groups.set(label, items);
  }

  return Array.from(groups, ([label, models]) => ({ label, models }));
});

watch(
  () => chatModels.value.map((model) => model.alias).join('|'),
  () => groupStore.syncModels(chatModels.value),
  { immediate: true },
);

watch(
  () =>
    rounds.value
      .at(-1)
      ?.responses.map((response) => `${response.status}:${response.content.length}`)
      .join('|'),
  () => {
    void scrollToBottom(false);
  },
);

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick);
  await sessionStore.bootstrap();
  await modelCatalog.load();
  groupStore.syncModels(chatModels.value);
  await groupStore.initialize();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  groupStore.stopAll();
});

function handleDocumentClick(event: MouseEvent): void {
  if (selectorOpen.value && !selector.value?.contains(event.target as Node)) {
    selectorOpen.value = false;
  }
}

function resolveModelGroup(model: ModelCatalogItem): string {
  const name = model.displayName.toLowerCase();

  if (name.includes('deepseek')) {
    return 'DeepSeek';
  }

  if (name.includes('qwen')) {
    return '通义千问';
  }

  if (name.includes('gpt')) {
    return 'GPT 系列';
  }

  return '更多模型';
}

function useSuggestion(value: string): void {
  prompt.value = value;
  composerInput.value?.focus();
}

function toggleModel(alias: string): void {
  groupStore.toggleModel(alias);
}

function clearConversation(): void {
  if (hasRounds.value && !window.confirm('清空本次多模型对话？')) {
    return;
  }

  groupStore.clearConversation();
  prompt.value = '';
  copiedResponseId.value = '';
  void scrollToBottom(false);
}

async function sendMessage(payload: { fileIds: string[] } = { fileIds: [] }): Promise<void> {
  const content = prompt.value.trim();

  if (!content || !canSend.value) {
    return;
  }

  const attachments = composerInput.value?.takeReadyAttachments() ?? [];
  const fileIds =
    payload.fileIds.length > 0
      ? payload.fileIds
      : attachments.map((attachment) => attachment.fileId);

  prompt.value = '';
  await groupStore.sendMessage(content, {
    attachments,
    fileIds,
  });
  await scrollToBottom();
}

function retryRound(round: GroupChatRound): void {
  groupStore.retryRound(round.id);
}

function retryResponse(roundId: string, responseId: string): void {
  void groupStore.retryResponse(roundId, responseId);
}

function retryLastRound(): void {
  if (lastRound.value) {
    retryRound(lastRound.value);
  }
}

async function copyResponse(responseId: string, content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
    copiedResponseId.value = responseId;
    window.setTimeout(() => {
      if (copiedResponseId.value === responseId) {
        copiedResponseId.value = '';
      }
    }, 1_500);
  } catch {
    copiedResponseId.value = '';
  }
}

async function scrollToBottom(smooth = true): Promise<void> {
  await nextTick();
  conversationArea.value?.scrollTo({
    behavior: smooth ? 'smooth' : 'auto',
    top: conversationArea.value.scrollHeight,
  });
}

function responseStatusLabel(
  responseStatus: GroupChatRound['responses'][number]['status'],
): string {
  const labels: Record<typeof responseStatus, string> = {
    CANCELLED: '已停止',
    COMPLETED: '已完成',
    FAILED: '生成失败',
    PENDING: '等待中',
    STREAMING: '生成中',
  };

  return labels[responseStatus];
}

function modelInitial(displayName: string): string {
  return displayName.trim().slice(0, 1).toUpperCase() || 'AI';
}

function modelAccent(alias: string): string {
  const palettes = ['#e85a4f', '#4c84ff', '#18a675', '#8b61df', '#e29135', '#377d9d'];
  const hash = Array.from(alias).reduce((total, char) => total + char.charCodeAt(0), 0);

  return palettes[hash % palettes.length] ?? '#4c84ff';
}

function openCapability(item: ChatCapabilityPreset): void {
  useSuggestion(item.prompt);
}
</script>

<template>
  <div class="group-chat-view">
    <main class="group-chat-main">
      <header class="group-chat-toolbar">
        <div ref="selector" class="group-model-picker">
          <button
            class="group-model-picker__trigger"
            type="button"
            aria-haspopup="dialog"
            :aria-expanded="selectorOpen"
            @click.stop="selectorOpen = !selectorOpen"
          >
            <span>
              <FireOutlined />
              热门推荐
            </span>
            <DownOutlined />
          </button>
          <div class="group-model-picker__summary">
            <div class="group-model-picker__avatars" aria-hidden="true">
              <i
                v-for="model in selectedModels.slice(0, 3)"
                :key="model.alias"
                :style="{ '--model-accent': modelAccent(model.alias) }"
              >
                {{ modelInitial(model.displayName) }}
              </i>
              <i v-if="selectedCount > 3" class="group-model-picker__more">
                +{{ selectedCount - 3 }}
              </i>
            </div>
            <span>
              {{
                selectedCount > 0
                  ? `已选 ${selectedCount} 个模型 · 将独立计费 ${selectedCount} 次`
                  : '请选择模型'
              }}
            </span>
          </div>

          <section v-if="selectorOpen" class="group-model-picker__panel" aria-label="选择模型">
            <header>
              <span>
                <strong>选择对话模型</strong>
                <small>最多 10 个模型，每个模型独立请求并分别计费</small>
              </span>
              <div>
                <button type="button" @click="groupStore.selectAllModels">全选</button>
                <button type="button" @click="groupStore.clearModels">清空</button>
              </div>
            </header>

            <div class="group-model-picker__groups">
              <section v-for="group in modelGroups" :key="group.label">
                <span class="group-model-picker__group-label">{{ group.label }}</span>
                <button
                  v-for="model in group.models"
                  :key="model.alias"
                  type="button"
                  :class="{ active: selectedAliases.has(model.alias) }"
                  :data-model-alias="model.alias"
                  @click="toggleModel(model.alias)"
                >
                  <i :style="{ '--model-accent': modelAccent(model.alias) }">
                    {{ modelInitial(model.displayName) }}
                  </i>
                  <span>
                    <strong>{{ model.displayName }}</strong>
                    <small>{{ group.label }}</small>
                  </span>
                  <CheckOutlined />
                </button>
              </section>
            </div>
          </section>
        </div>

        <nav class="chat-mode-switch" aria-label="对话模式">
          <RouterLink to="/newchat">
            <MessageOutlined />
            模型对话
            <i class="chat-mode-switch__badge">New</i>
          </RouterLink>
          <RouterLink class="active" to="/newchat/groups">
            <AppstoreOutlined />
            超级对话
          </RouterLink>
        </nav>

        <button
          class="group-chat-toolbar__clear"
          type="button"
          :disabled="!hasRounds || groupStore.streaming"
          title="清空本次多模型对话"
          @click="clearConversation"
        >
          <ReloadOutlined />
        </button>
      </header>

      <section
        ref="conversationArea"
        class="group-chat-conversation"
        :class="{ active: hasRounds }"
      >
        <div v-if="!hasRounds" class="group-chat-welcome">
          <div class="group-chat-welcome__heading">
            <h1>
              您好，
              <span>今天有什么我可以帮你的吗？</span>
            </h1>
          </div>

          <ChatComposer
            ref="composerInput"
            v-model="prompt"
            :attachment-enabled="sessionStore.authenticated"
            :can-send="canSend"
            :error="groupStore.error"
            placeholder="选择多个模型同时提问，每个模型都有不同的特点和能力，可以根据你的需求选择最适合的模型。"
            placement="welcome"
            :reasoning-enabled="false"
            :streaming="groupStore.streaming"
            :task-mode-enabled="false"
            @retry="retryLastRound"
            @send="sendMessage"
            @stop="groupStore.stopAll"
          />

          <div class="chat-capabilities" aria-label="常用能力">
            <button
              v-for="item in chatCapabilities"
              :key="item.label"
              type="button"
              @click="openCapability(item)"
            >
              <component :is="item.icon" />
              {{ item.label }}
            </button>
          </div>

          <div class="group-chat-section-title">
            <strong>示例提示词</strong>
            <span>点击即可填入输入框</span>
          </div>

          <div class="chat-suggestions">
            <button
              v-for="item in chatSuggestions"
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

          <div class="group-chat-section-title group-chat-section-title--charts">
            <strong>支持图表类型</strong>
            <span>生成报告时可直接指定</span>
          </div>

          <div class="chat-chart-types">
            <button
              v-for="item in chatChartTemplates"
              :key="item.label"
              type="button"
              :title="`使用${item.label}分析`"
              @click="useSuggestion(item.prompt)"
            >
              <span class="chat-chart-types__preview" aria-hidden="true">
                <ChartThumbnail :type="item.preview" />
              </span>
              <strong>{{ item.label }}</strong>
            </button>
          </div>
        </div>

        <div v-else class="group-chat-rounds">
          <article
            v-for="round in rounds"
            :key="round.id"
            class="group-chat-round"
            :data-round-id="round.id"
          >
            <div class="group-chat-round__prompt">
              <span>我</span>
              <div>
                <MessageAttachments
                  v-if="round.attachments.length > 0"
                  :attachments="round.attachments"
                />
                <p>{{ round.content }}</p>
              </div>
            </div>

            <div class="group-chat-round__responses">
              <article
                v-for="response in round.responses"
                :key="response.id"
                class="group-model-response"
                :class="`group-model-response--${response.status.toLowerCase()}`"
                :data-model-alias="response.alias"
              >
                <header>
                  <i :style="{ '--model-accent': modelAccent(response.alias) }">
                    {{ modelInitial(response.displayName) }}
                  </i>
                  <span>
                    <strong>{{ response.displayName }}</strong>
                    <small>
                      <LoadingOutlined
                        v-if="response.status === 'PENDING' || response.status === 'STREAMING'"
                        spin
                      />
                      {{ responseStatusLabel(response.status) }}
                    </small>
                  </span>
                </header>

                <div class="group-model-response__content">
                  <MarkdownMessage
                    v-if="response.content"
                    :content="response.content"
                    :streaming="response.status === 'STREAMING'"
                  />
                  <div v-else class="group-model-response__pending">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <footer
                  v-if="
                    response.status === 'COMPLETED' ||
                    response.status === 'FAILED' ||
                    response.status === 'CANCELLED'
                  "
                >
                  <button
                    v-if="response.status === 'COMPLETED'"
                    type="button"
                    @click="copyResponse(response.id, response.content)"
                  >
                    <CopyOutlined />
                    {{ copiedResponseId === response.id ? '已复制' : '复制' }}
                  </button>
                  <button
                    v-else
                    type="button"
                    :disabled="groupStore.streaming"
                    @click="retryResponse(round.id, response.id)"
                  >
                    <ReloadOutlined />
                    重试此模型
                  </button>
                  <span v-if="response.pointsCost" class="group-model-response__cost">
                    单次 {{ response.pointsCost }} 积分
                  </span>
                </footer>
              </article>
            </div>

            <button
              class="group-chat-round__retry"
              type="button"
              :disabled="groupStore.streaming"
              @click="retryRound(round)"
            >
              <ReloadOutlined />
              重新生成全部回答
            </button>
          </article>
        </div>
      </section>

      <ChatComposer
        v-if="hasRounds"
        ref="composerInput"
        v-model="prompt"
        :attachment-enabled="sessionStore.authenticated"
        :can-send="canSend"
        :error="groupStore.error"
        placeholder="继续向所选的多个模型提问"
        placement="docked"
        :reasoning-enabled="false"
        :streaming="groupStore.streaming"
        :task-mode-enabled="false"
        @retry="retryLastRound"
        @send="sendMessage"
        @stop="groupStore.stopAll"
      />
    </main>
  </div>
</template>

<style scoped>
.group-chat-view {
  min-height: calc(100vh - 56px);
  background: #fff;
}

.group-chat-main {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr);
  background: #fff;
}

.group-chat-toolbar {
  position: relative;
  z-index: 10;
  display: grid;
  min-height: 70px;
  align-items: center;
  gap: 20px;
  grid-template-columns: minmax(240px, 1fr) auto minmax(40px, 1fr);
  padding: 0 28px;
  border-bottom: 1px solid #eef0f4;
}

.group-model-picker {
  position: relative;
  justify-self: start;
}

.group-model-picker__trigger {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #4d5563;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.group-model-picker__trigger > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.group-model-picker__trigger > span :deep(svg) {
  color: #ef5b54;
  font-size: 15px;
}

.group-model-picker__trigger > :deep(svg) {
  color: #8d95a2;
  font-size: 10px;
}

.group-model-picker__summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  margin-top: 3px;
  color: #7f8794;
  font-size: 9px;
}

.group-model-picker__avatars {
  display: flex;
  min-width: 40px;
  align-items: center;
}

.group-model-picker__avatars i {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  margin-left: -7px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: color-mix(in srgb, var(--model-accent) 13%, white);
  color: var(--model-accent);
  font-size: 8px;
  font-style: normal;
  font-weight: 850;
}

.group-model-picker__avatars i:first-child {
  margin-left: 0;
}

.group-model-picker__avatars .group-model-picker__more {
  width: 25px;
  background: #eef1f5;
  color: #737c89;
}

.group-model-picker__panel {
  position: absolute;
  z-index: 30;
  top: calc(100% + 12px);
  left: 0;
  width: min(380px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid #e2e6ec;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 20px 52px rgb(32 44 66 / 18%);
}

.group-model-picker__panel > header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 13px;
  border-bottom: 1px solid #edf0f4;
  background: #fafbfd;
}

.group-model-picker__panel > header > span {
  display: grid;
  gap: 3px;
}

.group-model-picker__panel > header strong {
  color: #333a46;
  font-size: 12px;
}

.group-model-picker__panel > header small {
  color: #8d96a3;
  font-size: 9px;
}

.group-model-picker__panel > header div {
  display: flex;
  gap: 6px;
}

.group-model-picker__panel > header button {
  height: 25px;
  padding: 0 8px;
  border: 1px solid #dde4ef;
  border-radius: 6px;
  background: #fff;
  color: #4e75b6;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
}

.group-model-picker__groups {
  display: grid;
  max-height: min(61vh, 520px);
  gap: 8px;
  overflow-y: auto;
  padding: 9px;
}

.group-model-picker__groups section {
  display: grid;
  gap: 3px;
}

.group-model-picker__group-label {
  padding: 6px 8px 3px;
  color: #8d96a3;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.group-model-picker__groups section button {
  display: grid;
  min-height: 47px;
  align-items: center;
  gap: 9px;
  grid-template-columns: 30px minmax(0, 1fr) 20px;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #6c7583;
  text-align: left;
  cursor: pointer;
}

.group-model-picker__groups section button:hover {
  background: #f5f8fd;
}

.group-model-picker__groups section button.active {
  border-color: #dbe7fb;
  background: #f2f7ff;
}

.group-model-picker__groups section button > i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--model-accent) 12%, white);
  color: var(--model-accent);
  font-size: 9px;
  font-style: normal;
  font-weight: 850;
}

.group-model-picker__groups section button > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.group-model-picker__groups section button strong {
  overflow: hidden;
  color: #414956;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-model-picker__groups section button small {
  color: #929aa7;
  font-size: 8px;
}

.group-model-picker__groups section button > :deep(svg) {
  color: transparent;
}

.group-model-picker__groups section button.active > :deep(svg) {
  color: #4c84ff;
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
  padding: 0 16px;
  border-radius: 999px;
  color: #6e7787;
  font-size: 11px;
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

.group-chat-toolbar__clear {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  justify-self: end;
  padding: 0;
  border: 1px solid #e2e6ec;
  border-radius: 8px;
  background: #fff;
  color: #5c6573;
  cursor: pointer;
}

.group-chat-toolbar__clear:disabled {
  color: #c1c7d0;
  cursor: not-allowed;
}

.group-chat-conversation {
  overflow-y: auto;
  padding: 48px 28px 24px;
}

.group-chat-conversation.active {
  padding-top: 30px;
}

.group-chat-welcome,
.group-chat-rounds {
  width: min(100%, 920px);
  margin: 58px auto 30px;
}

.group-chat-welcome__heading {
  margin-bottom: 20px;
}

.group-chat-welcome h1 {
  margin: 0;
  color: #313643;
  font-size: 25px;
  font-weight: 800;
  line-height: 1.5;
  text-align: left;
}

.group-chat-welcome h1 span {
  display: block;
}

.chat-capabilities {
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
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

.group-chat-section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 28px;
  text-align: left;
}

.group-chat-section-title--charts {
  margin-top: 24px;
}

.group-chat-section-title strong {
  color: #414958;
  font-size: 12px;
}

.group-chat-section-title span {
  color: #9aa2af;
  font-size: 9px;
}

.chat-suggestions {
  display: grid;
  width: 100%;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 11px;
}

.chat-suggestions button {
  display: grid;
  min-height: 104px;
  align-content: start;
  justify-items: start;
  padding: 13px;
  border: 1px solid #e5e8ee;
  border-radius: 10px;
  background: rgb(255 255 255 / 88%);
  color: inherit;
  text-align: left;
  cursor: pointer;
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
  margin-top: 10px;
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

.group-chat-rounds {
  display: grid;
  gap: 34px;
}

.group-chat-round {
  display: grid;
  gap: 16px;
}

.group-chat-round__prompt {
  display: grid;
  align-items: start;
  gap: 10px;
  grid-template-columns: 34px minmax(0, 1fr);
}

.group-chat-round__prompt > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #f0f1f4;
  color: #636c7a;
  font-size: 11px;
  font-weight: 800;
}

.group-chat-round__prompt > div {
  display: grid;
  justify-items: start;
  gap: 7px;
}

.group-chat-round__prompt p {
  margin: 0;
  padding: 10px 13px;
  border-radius: 10px;
  background: #edf3ff;
  color: #363d48;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.group-chat-round__responses {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr));
  padding-left: 44px;
}

.group-model-response {
  display: grid;
  min-width: 0;
  align-self: start;
  overflow: hidden;
  border: 1px solid #e3e7ed;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 28px rgb(34 49 74 / 6%);
}

.group-model-response--failed {
  border-color: #efd3cf;
}

.group-model-response--cancelled {
  border-color: #e2e5ea;
  background: #fafbfc;
}

.group-model-response > header {
  display: flex;
  min-height: 53px;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border-bottom: 1px solid #eef1f5;
  background: #fafbfd;
}

.group-model-response > header > i {
  display: grid;
  width: 31px;
  height: 31px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--model-accent) 12%, white);
  color: var(--model-accent);
  font-size: 9px;
  font-style: normal;
  font-weight: 850;
}

.group-model-response > header > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.group-model-response > header strong {
  overflow: hidden;
  color: #3c4451;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-model-response > header small {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8b94a2;
  font-size: 8px;
}

.group-model-response__content {
  min-height: 96px;
  padding: 11px 12px;
  color: #363d48;
  font-size: 11px;
  line-height: 1.72;
}

.group-model-response__content :deep(.markdown-message) {
  padding: 0;
  background: transparent;
}

.group-model-response__pending {
  display: flex;
  height: 42px;
  align-items: center;
  gap: 5px;
}

.group-model-response__pending i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d7dce4;
  animation: group-pending 1s ease-in-out infinite;
}

.group-model-response__pending i:nth-child(2) {
  animation-delay: 120ms;
}

.group-model-response__pending i:nth-child(3) {
  animation-delay: 240ms;
}

.group-model-response > footer {
  display: flex;
  min-height: 37px;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-top: 1px solid #eef1f5;
}

.group-model-response > footer button {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #7f8896;
  font-size: 9px;
  cursor: pointer;
}

.group-model-response > footer button:hover {
  background: #f1f5ff;
  color: #356fe0;
}

.group-model-response > footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.group-model-response__cost {
  color: #9aa3b0;
  font-size: 8px;
  white-space: nowrap;
}

.group-chat-round__retry {
  display: inline-flex;
  height: 30px;
  align-items: center;
  justify-self: start;
  gap: 5px;
  margin-left: 44px;
  padding: 0 10px;
  border: 1px solid #dfe4eb;
  border-radius: 7px;
  background: #fff;
  color: #647080;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

.group-chat-round__retry:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes group-pending {
  0%,
  100% {
    opacity: 0.4;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
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
  .group-chat-view {
    min-height: calc(100vh - 118px);
  }

  .group-chat-toolbar {
    min-height: 62px;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) auto 32px;
    padding: 0 12px;
  }

  .group-model-picker__summary {
    max-width: 150px;
  }

  .group-model-picker__summary > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-mode-switch a {
    height: 29px;
    gap: 4px;
    padding: 0 8px;
    font-size: 9px;
  }

  .group-chat-conversation {
    padding: 34px 12px 18px;
  }

  .group-chat-welcome,
  .group-chat-rounds {
    margin-top: 36px;
  }

  .group-chat-welcome h1 {
    font-size: 22px;
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

  .chat-suggestions {
    grid-template-columns: 1fr 1fr;
  }

  .group-chat-round__responses {
    grid-template-columns: 1fr;
    padding-left: 0;
  }

  .group-chat-round__retry {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .group-model-picker__summary > span {
    display: none;
  }

  .group-model-picker__avatars i {
    width: 23px;
    height: 23px;
  }

  .group-model-picker__panel {
    left: -8px;
  }

  .chat-suggestions {
    grid-template-columns: 1fr;
  }

  .chat-chart-types {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
