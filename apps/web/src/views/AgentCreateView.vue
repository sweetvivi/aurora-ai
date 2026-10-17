<script setup lang="ts">
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DownOutlined,
  MessageOutlined,
  PlusOutlined,
  RocketOutlined,
  SaveOutlined,
  SendOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { agentCapabilityOptions, type AgentCapabilityId } from '@/data/agents';
import { type AgentDraft, useAgentWorkspaceStore } from '@/stores/agent-workspace';

const route = useRoute();
const router = useRouter();
const workspace = useAgentWorkspaceStore();
const uiPanelOpen = ref(true);
const dialogPanelOpen = ref(true);
const tagMenuOpen = ref(false);
const published = ref(false);
const saved = ref(false);
const savedSignature = ref('');
const saving = ref(false);
const publishing = ref(false);
const loadingDraft = ref(false);
const dialogMode = ref('normal');
const previewPrompt = ref('');
const previewReply = ref('');
const editingId = computed(() =>
  typeof route.query.edit === 'string' ? route.query.edit.trim() : '',
);
const isEditing = computed(() => Boolean(editingId.value));
const draft = reactive<AgentDraft>({
  capabilities: [],
  description: '',
  id: makeDraftId(),
  instructions: '',
  name: '',
  opening: '',
  published: false,
  starterPrompts: ['', '', ''],
  tags: [] as string[],
});

const baseTagOptions = ['办公效率', '内容创作', '编程开发', '学习研究', '营销增长', '生活助手'];
const tagOptions = computed(() => [...new Set([...baseTagOptions, ...draft.tags])].filter(Boolean));

const canPublish = computed(
  () =>
    draft.name.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    draft.instructions.trim().length > 0,
);
const draftSignature = computed(() =>
  JSON.stringify({
    capabilities: draft.capabilities,
    description: draft.description,
    instructions: draft.instructions,
    name: draft.name,
    opening: draft.opening,
    starterPrompts: draft.starterPrompts,
    tags: draft.tags,
  }),
);
const hasUnsavedChanges = computed(
  () => saved.value && savedSignature.value !== draftSignature.value,
);
const actionError = computed(() => workspace.error);

const previewLines = computed(() => {
  if (!draft.name.trim()) {
    return ['请先在左侧输入配置信息，描述你想要的应用'];
  }

  return [
    draft.opening.trim() || `你好，我是${draft.name.trim()}`,
    draft.description.trim() || '一个由极光AI创建的专属智能体',
  ];
});

function makeDraftId(): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `custom-agent-${Date.now().toString(36)}-${randomPart}`;
}

function resetDraft(): void {
  draft.capabilities = [];
  draft.description = '';
  draft.id = makeDraftId();
  draft.instructions = '';
  draft.name = '';
  draft.opening = '';
  draft.published = false;
  draft.starterPrompts = ['', '', ''];
  draft.tags = [];
  uiPanelOpen.value = true;
  dialogPanelOpen.value = true;
  tagMenuOpen.value = false;
  published.value = false;
  saved.value = false;
  savedSignature.value = '';
  previewPrompt.value = '';
  previewReply.value = '';
  workspace.error = '';
}

async function loadDraftFromRoute(): Promise<void> {
  const agentId = editingId.value;

  if (!agentId) {
    resetDraft();
    return;
  }

  loadingDraft.value = true;
  workspace.error = '';

  try {
    await workspace.initialize();
    const agent = workspace.customAgents.find((item) => item.id === agentId);

    if (!agent) {
      resetDraft();
      workspace.error = '未找到可编辑的智能体，可能已被删除或不属于当前账号。';
      return;
    }

    const storedDraft = workspace.drafts.find((item) => item.id === agentId);
    const starterPrompts = [...agent.starterPrompts].slice(0, 3);

    while (starterPrompts.length < 3) {
      starterPrompts.push('');
    }

    draft.capabilities = [...(agent.capabilities ?? [])];
    draft.description = agent.description;
    draft.id = agent.id;
    draft.instructions = agent.instructions ?? '';
    draft.name = agent.name;
    draft.opening = agent.opening;
    draft.published = storedDraft?.published ?? false;
    draft.starterPrompts = starterPrompts;
    draft.tags = [...agent.tags];
    published.value = draft.published;
    saved.value = true;
    savedSignature.value = draftSignature.value;
    previewPrompt.value = '';
    previewReply.value = '';
  } catch (error) {
    workspace.error = error instanceof Error ? error.message : '智能体加载失败，请稍后重试';
  } finally {
    loadingDraft.value = false;
  }
}

function snapshotDraft(): AgentDraft {
  return {
    ...draft,
    capabilities: [...draft.capabilities],
    starterPrompts: [...draft.starterPrompts],
    tags: [...draft.tags],
  };
}

async function saveDraft(): Promise<void> {
  if (saving.value || publishing.value) {
    return;
  }

  saving.value = true;
  workspace.error = '';

  try {
    const savedDraft = await workspace.saveDraft(snapshotDraft());
    Object.assign(draft, savedDraft);
    saved.value = true;
    savedSignature.value = draftSignature.value;
    published.value = savedDraft.published;
  } catch {
    saved.value = false;
  } finally {
    saving.value = false;
  }
}

async function publish(): Promise<void> {
  if (!canPublish.value || saving.value || publishing.value) {
    return;
  }

  publishing.value = true;
  workspace.error = '';

  try {
    const customAgent = await workspace.publishDraft(snapshotDraft());
    draft.name = customAgent.name;
    draft.description = customAgent.description;
    draft.instructions = customAgent.instructions ?? draft.instructions;
    draft.opening = customAgent.opening;
    draft.tags = [...customAgent.tags];
    draft.published = true;
    saved.value = true;
    savedSignature.value = draftSignature.value;
    published.value = true;
    await router.push(`/agents/${customAgent.id}`);
  } catch {
    published.value = false;
  } finally {
    publishing.value = false;
  }
}

function toggleTag(tag: string): void {
  if (draft.tags.includes(tag)) {
    draft.tags = draft.tags.filter((item) => item !== tag);
  } else {
    draft.tags = [...draft.tags, tag];
  }

  saved.value = false;
}

function toggleCapability(capabilityId: AgentCapabilityId): void {
  if (draft.capabilities.includes(capabilityId)) {
    draft.capabilities = draft.capabilities.filter((item) => item !== capabilityId);
  } else {
    draft.capabilities = [...draft.capabilities, capabilityId];
  }

  saved.value = false;
}

function sendPreview(): void {
  const content = previewPrompt.value.trim();

  if (!content) {
    return;
  }

  previewReply.value = [
    `${draft.name.trim() || '智能体'}已收到：${content}`,
    '',
    draft.instructions.trim() ||
      '当前还没有配置工作说明。补充角色、目标和回复方式后，预览会更接近正式效果。',
  ].join('\n');
  previewPrompt.value = '';
}

watch(
  editingId,
  () => {
    void loadDraftFromRoute();
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <div class="agent-create">
    <header class="agent-create__topbar">
      <button
        type="button"
        :aria-label="isEditing ? '返回智能体详情' : '返回智能体广场'"
        @click="router.push(isEditing ? `/agents/${draft.id}` : '/agents')"
      >
        <ArrowLeftOutlined />
      </button>
      <span class="agent-create__identity">
        <span class="agent-create__avatar">{{ draft.name.slice(0, 1) || '智' }}</span>
        <span>
          <strong>{{ draft.name.trim() || '未命名智能体' }}</strong>
          <small>{{ draft.description.trim() || '暂无描述' }}</small>
        </span>
      </span>
      <div class="agent-create__actions">
        <button type="button" :disabled="saving || publishing" @click="saveDraft">
          <SaveOutlined />
          {{
            saving
              ? '保存中'
              : saved && !hasUnsavedChanges
                ? '已保存'
                : isEditing
                  ? '保存更改'
                  : '保存草稿'
          }}
        </button>
        <button
          class="agent-create__publish"
          type="button"
          :disabled="!canPublish || saving || publishing"
          @click="publish"
        >
          <CheckOutlined v-if="published" />
          <RocketOutlined v-else />
          {{ publishing ? '发布中' : published ? '已发布' : '发布' }}
        </button>
      </div>
    </header>

    <div class="agent-create__layout">
      <section class="agent-create__form">
        <div v-if="actionError" class="agent-create__error" role="alert">
          {{ actionError }}
        </div>
        <h1>{{ isEditing ? '编辑智能体' : '配置智能体' }}</h1>
        <p v-if="loadingDraft" class="agent-create__loading">正在加载智能体配置...</p>

        <div class="agent-section-title">• 基本配置信息 <span>（必填）</span></div>

        <div class="agent-avatar-picker">
          <span>{{ draft.name.slice(0, 1) || '智' }}</span>
          <button type="button" aria-label="上传头像">
            <PlusOutlined />
          </button>
        </div>

        <label class="agent-field">
          <strong><i>*</i> 名称</strong>
          <span class="agent-input">
            <input v-model="draft.name" maxlength="20" placeholder="请输入智能体名称" />
            <small>{{ draft.name.length }} / 20</small>
          </span>
        </label>

        <label class="agent-field">
          <strong><i>*</i> 简介</strong>
          <span class="agent-input">
            <input v-model="draft.description" maxlength="100" placeholder="一句话介绍这个智能体" />
            <small>{{ draft.description.length }} / 100</small>
          </span>
        </label>

        <label class="agent-field">
          <strong><i>*</i> 配置信息</strong>
          <textarea
            v-model="draft.instructions"
            rows="8"
            placeholder="请详细描述智能体的角色、目标、工作流程和回复方式"
          />
        </label>

        <div class="agent-field">
          <strong>标签</strong>
          <div class="agent-tag-select">
            <button
              class="agent-tag-select__control"
              type="button"
              :aria-expanded="tagMenuOpen"
              @click="tagMenuOpen = !tagMenuOpen"
            >
              <span v-if="draft.tags.length === 0" class="agent-tag-select__placeholder">
                请选择标签
              </span>
              <span v-for="tag in draft.tags" :key="tag" class="agent-tag-select__value">
                {{ tag }}
              </span>
              <DownOutlined :class="{ open: tagMenuOpen }" />
            </button>
            <div v-if="tagMenuOpen" class="agent-tag-select__menu">
              <label v-for="tag in tagOptions" :key="tag">
                <input
                  type="checkbox"
                  :checked="draft.tags.includes(tag)"
                  @change="toggleTag(tag)"
                />
                <span>{{ tag }}</span>
              </label>
            </div>
          </div>
        </div>

        <section class="agent-collapse">
          <button type="button" @click="uiPanelOpen = !uiPanelOpen">
            <span>界面定制</span>
            <DownOutlined :class="{ open: uiPanelOpen }" />
          </button>
          <div v-if="uiPanelOpen" class="agent-collapse__body">
            <strong>对话模式</strong>
            <label>
              <input v-model="dialogMode" type="radio" value="normal" />
              普通对话模式
            </label>
            <label>
              <input v-model="dialogMode" type="radio" value="custom" />
              自定义 UI 组件
            </label>
          </div>
        </section>

        <section class="agent-collapse">
          <button type="button" @click="dialogPanelOpen = !dialogPanelOpen">
            <span>对话配置</span>
            <DownOutlined :class="{ open: dialogPanelOpen }" />
          </button>
          <div v-if="dialogPanelOpen" class="agent-collapse__body agent-collapse__body--dialog">
            <p>对话模式已选择普通对话，可以继续配置开场白和推荐问题。</p>
            <label class="agent-field">
              <strong>开场白</strong>
              <input v-model="draft.opening" maxlength="50" placeholder="你好，我可以帮你..." />
            </label>
            <div class="agent-field">
              <strong>预置问题</strong>
              <input
                v-model="draft.starterPrompts[0]"
                maxlength="50"
                placeholder="请输入第一个推荐问题"
              />
              <input
                v-model="draft.starterPrompts[1]"
                maxlength="50"
                placeholder="请输入第二个推荐问题"
              />
              <input
                v-model="draft.starterPrompts[2]"
                maxlength="50"
                placeholder="请输入第三个推荐问题"
              />
            </div>
            <div class="agent-field">
              <strong>参考示例</strong>
              <div class="agent-upload">
                <UploadOutlined />
                <span>上传</span>
              </div>
            </div>
            <div class="agent-field">
              <strong>模块能力 <small>（可多选）</small></strong>
              <div class="agent-capability-grid">
                <label
                  v-for="capability in agentCapabilityOptions"
                  :key="capability.id"
                  :class="{ active: draft.capabilities.includes(capability.id) }"
                >
                  <input
                    type="checkbox"
                    :checked="draft.capabilities.includes(capability.id)"
                    @change="toggleCapability(capability.id)"
                  />
                  <span class="agent-capability-grid__check">
                    <CheckOutlined v-if="draft.capabilities.includes(capability.id)" />
                  </span>
                  {{ capability.label }}
                </label>
              </div>
            </div>
          </div>
        </section>

        <section class="agent-collapse agent-collapse--static">
          <button type="button">
            <span>能力配置</span>
            <em>待开放</em>
          </button>
        </section>

        <section class="agent-collapse agent-collapse--static">
          <button type="button">
            <span>知识库配置</span>
            <em>待开放</em>
          </button>
        </section>
      </section>

      <aside class="agent-create__preview">
        <h2>调试和预览</h2>
        <div class="agent-preview-empty">
          <span class="agent-preview-empty__mark">极</span>
          <strong>{{ previewLines[0] }}</strong>
          <p>{{ previewLines[1] }}</p>
          <div v-if="previewReply" class="agent-preview-reply">
            <MessageOutlined />
            <p>{{ previewReply }}</p>
          </div>
          <div v-if="draft.name.trim()" class="agent-preview-composer">
            <input
              v-model="previewPrompt"
              placeholder="输入一句话调试当前智能体"
              @keydown.enter.prevent="sendPreview"
            />
            <button type="button" :disabled="!previewPrompt.trim()" @click="sendPreview">
              <SendOutlined />
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.agent-create {
  min-height: calc(100vh - 56px);
  background: #fff;
  color: #252a31;
}

.agent-create__topbar {
  display: flex;
  height: 72px;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  border-bottom: 1px solid #eceff3;
}

.agent-create__topbar > button:first-child {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #596273;
  cursor: pointer;
}

.agent-create__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.agent-create__avatar {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border: 1px solid #d6d9e0;
  border-radius: 50%;
  background: linear-gradient(145deg, #f6f7f9, #e3e6ec);
  color: #596273;
  font-size: 16px;
  font-weight: 800;
}

.agent-create__identity > span:last-child {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.agent-create__identity strong {
  font-size: 14px;
}

.agent-create__identity small {
  overflow: hidden;
  color: #9aa1ae;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-create__actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.agent-create__actions > button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  border: 1px solid #dfe2e8;
  border-radius: 7px;
  background: #fff;
  color: #626b7a;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.agent-create__actions > button:first-child:hover {
  border-color: #b9cef7;
  color: #3979ed;
}

.agent-create__actions > button:disabled {
  color: #c3c8d0;
  cursor: not-allowed;
}

.agent-create__publish:not(:disabled):hover {
  border-color: #9ddab8;
  color: #168952;
}

.agent-create__layout {
  display: grid;
  min-height: calc(100vh - 128px);
  grid-template-columns: minmax(620px, 58%) minmax(360px, 42%);
}

.agent-create__form {
  max-width: 760px;
  width: 100%;
  justify-self: end;
  padding: 16px 24px 72px;
}

.agent-create__form h1 {
  margin: 0 0 18px;
  font-size: 20px;
}

.agent-create__error {
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid #f1c7c7;
  border-radius: 7px;
  background: #fff5f5;
  color: #b34040;
  font-size: 12px;
  line-height: 1.55;
}

.agent-create__loading {
  margin: -8px 0 14px;
  padding: 9px 12px;
  border: 1px solid #d9e7ff;
  border-radius: 7px;
  background: #f5f9ff;
  color: #4c76bd;
  font-size: 11px;
}

.agent-section-title {
  margin-bottom: 18px;
  padding: 9px 12px;
  border-radius: 6px;
  background: #f5f6f8;
  font-size: 13px;
  font-weight: 750;
}

.agent-section-title span {
  color: #777f8d;
  font-size: 12px;
  font-weight: 500;
}

.agent-avatar-picker {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 22px;
}

.agent-avatar-picker > span {
  display: grid;
  width: 60px;
  height: 60px;
  place-items: center;
  border: 1px solid #dde1e7;
  border-radius: 50%;
  background: #f0f1f4;
  color: #6c7584;
  font-size: 20px;
  font-weight: 800;
}

.agent-avatar-picker button {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  width: 21px;
  height: 21px;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #4c84ff;
  color: #fff;
  cursor: pointer;
}

.agent-avatar-picker button :deep(svg) {
  width: 10px;
  height: 10px;
}

.agent-field {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.agent-field > strong {
  font-size: 12px;
  font-weight: 700;
}

.agent-field > strong small {
  color: #98a0ad;
  font-size: 10px;
  font-weight: 500;
}

.agent-field > strong i {
  margin-right: 2px;
  color: #f05b5b;
  font-style: normal;
}

.agent-field input,
.agent-field textarea,
.agent-select {
  width: 100%;
  border: 1px solid #dfe2e8;
  border-radius: 6px;
  background: #fff;
  color: #2f3540;
  font-size: 12px;
  outline: 0;
}

.agent-field input {
  height: 38px;
  padding: 0 12px;
}

.agent-field textarea {
  min-height: 150px;
  padding: 12px;
  line-height: 1.75;
  resize: vertical;
}

.agent-field input:focus,
.agent-field textarea:focus {
  border-color: #7faeff;
  box-shadow: 0 0 0 2px rgb(76 132 255 / 10%);
}

.agent-input,
.agent-select {
  position: relative;
  display: flex;
  align-items: center;
}

.agent-input input {
  padding-right: 60px;
  border: 0;
  box-shadow: none !important;
}

.agent-input small {
  position: absolute;
  right: 11px;
  color: #abb1bc;
  font-size: 10px;
}

.agent-tag-select {
  position: relative;
}

.agent-tag-select__control {
  display: flex;
  width: 100%;
  min-height: 38px;
  align-items: center;
  gap: 6px;
  padding: 5px 36px 5px 11px;
  border: 1px solid #dfe2e8;
  border-radius: 6px;
  background: #fff;
  color: #596273;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}

.agent-tag-select__control > svg {
  position: absolute;
  right: 12px;
  color: #9aa2ae;
  font-size: 10px;
  transition: transform 160ms ease;
}

.agent-tag-select__control > svg.open {
  transform: rotate(180deg);
}

.agent-tag-select__placeholder {
  color: #b1b7c1;
}

.agent-tag-select__value {
  padding: 3px 7px;
  border-radius: 4px;
  background: #edf4ff;
  color: #3979ed;
  white-space: nowrap;
}

.agent-tag-select__menu {
  position: absolute;
  z-index: 12;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  display: grid;
  gap: 2px;
  padding: 6px;
  border: 1px solid #dfe4eb;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 14px 34px rgb(42 58 84 / 14%);
}

.agent-tag-select__menu label {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border-radius: 5px;
  color: #596273;
  font-size: 11px;
  cursor: pointer;
}

.agent-tag-select__menu label:hover {
  background: #f5f8fc;
}

.agent-tag-select__menu input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #3979ed;
}

.agent-select {
  height: 38px;
  padding: 0 12px;
  color: #9ca3af;
}

.agent-select input {
  height: 100%;
  border: 0;
  box-shadow: none !important;
}

.agent-collapse {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid #ebeef2;
  border-radius: 7px;
}

.agent-collapse > button {
  display: flex;
  width: 100%;
  height: 46px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border: 0;
  background: #f5f6f8;
  color: #303640;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.agent-collapse > button svg {
  color: #8e96a3;
  transition: transform 160ms ease;
}

.agent-collapse > button svg.open {
  transform: rotate(180deg);
}

.agent-collapse__body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  padding: 14px;
  border-top: 1px solid #ebeef2;
  font-size: 12px;
}

.agent-collapse__body strong {
  flex-basis: 100%;
}

.agent-collapse__body label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5f6877;
}

.agent-collapse__body--dialog {
  display: grid;
  gap: 16px;
}

.agent-collapse__body--dialog > p {
  margin: 0;
  padding: 10px 12px;
  border-radius: 5px;
  background: #f6f7f9;
  color: #717a89;
  font-size: 11px;
}

.agent-collapse__body--dialog .agent-field {
  margin: 0;
}

.agent-upload {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  align-content: center;
  gap: 4px;
  border: 1px dashed #ced3da;
  border-radius: 7px;
  color: #808997;
  font-size: 10px;
  cursor: pointer;
}

.agent-capability-grid {
  display: grid;
  gap: 9px 18px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.agent-capability-grid label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: #717a89;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.agent-capability-grid input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.agent-capability-grid__check {
  display: grid;
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  place-items: center;
  border: 1px solid #cfd5dd;
  border-radius: 3px;
  background: #fff;
  color: #fff;
}

.agent-capability-grid__check :deep(svg) {
  width: 8px;
  height: 8px;
}

.agent-capability-grid label.active {
  color: #3979ed;
}

.agent-capability-grid label.active .agent-capability-grid__check {
  border-color: #3979ed;
  background: #3979ed;
}

.agent-collapse--static > button {
  cursor: default;
}

.agent-collapse--static em {
  padding: 2px 6px;
  border-radius: 4px;
  background: #eceff3;
  color: #8a93a1;
  font-size: 9px;
  font-style: normal;
}

.agent-create__preview {
  min-height: 600px;
  padding: 16px 24px;
  border-left: 1px solid #eceff3;
}

.agent-create__preview h2 {
  margin: 0 0 20px;
  font-size: 17px;
}

.agent-preview-empty {
  display: grid;
  min-height: 520px;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
}

.agent-preview-empty__mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #43c985, #129a5a);
  color: #fff;
  font-size: 14px;
  font-weight: 850;
}

.agent-preview-empty strong {
  color: #707887;
  font-size: 12px;
}

.agent-preview-empty p {
  margin: 0;
  color: #a0a7b3;
  font-size: 10px;
}

.agent-preview-reply {
  display: grid;
  width: min(100%, 360px);
  justify-items: start;
  gap: 7px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #e3e8ef;
  border-radius: 9px;
  background: #f8fafc;
  color: #6d7786;
  text-align: left;
}

.agent-preview-reply > svg {
  color: #3979ed;
}

.agent-preview-reply p {
  color: #596273;
  font-size: 10px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.agent-preview-composer {
  display: grid;
  width: min(100%, 360px);
  align-items: center;
  gap: 6px;
  grid-template-columns: minmax(0, 1fr) 32px;
  margin-top: 14px;
  padding: 6px 7px 6px 11px;
  border: 1px solid #dce2ea;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 24px rgb(45 68 105 / 7%);
}

.agent-preview-composer input {
  min-width: 0;
  height: 26px;
  border: 0;
  outline: 0;
  color: #343b46;
  font-size: 10px;
}

.agent-preview-composer button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #3979ed;
  color: #fff;
  cursor: pointer;
}

.agent-preview-composer button:disabled {
  background: #d5dae2;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .agent-create__layout {
    grid-template-columns: 1fr;
  }

  .agent-create__form {
    max-width: none;
  }

  .agent-create__preview {
    display: none;
  }

  .agent-capability-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .agent-create__topbar {
    padding: 0 12px;
  }

  .agent-create__form {
    padding: 14px 12px 54px;
  }

  .agent-capability-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
