<script setup lang="ts">
import {
  ArrowUpOutlined,
  CloseOutlined,
  DownOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  StopOutlined,
  ThunderboltFilled,
} from '@ant-design/icons-vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import { uploadImageFile, type FileAsset } from '@/app/api';
import type { ChatAttachment } from '@/stores/chat-workspace';

const MAX_ATTACHMENTS = 3;

interface ComposerError {
  code: string;
  message: string;
  recoverable: boolean;
}

interface LocalAttachment {
  error?: string;
  file?: FileAsset;
  id: string;
  name: string;
  previewUrl: string;
  status: 'error' | 'ready' | 'uploading';
}

const props = withDefaults(
  defineProps<{
    attachmentEnabled?: boolean;
    canSend: boolean;
    error?: ComposerError | null;
    modelName?: string;
    placeholder?: string;
    placement?: 'docked' | 'welcome';
    streaming: boolean;
  }>(),
  {
    attachmentEnabled: true,
    error: null,
    modelName: '智能模式',
    placeholder: '输入问题，粘贴材料，或描述你希望完成的任务',
    placement: 'docked',
  },
);

const emit = defineEmits<{
  retry: [];
  send: [payload: { fileIds: string[] }];
  stop: [];
}>();

const prompt = defineModel<string>({ required: true });
const attachments = ref<LocalAttachment[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const input = ref<HTMLTextAreaElement | null>(null);
const hasUploadingAttachment = computed(() =>
  attachments.value.some((attachment) => attachment.status === 'uploading'),
);
const sendDisabled = computed(
  () => !props.canSend || props.streaming || hasUploadingAttachment.value,
);

function openFilePicker(): void {
  if (props.streaming || !props.attachmentEnabled || attachments.value.length >= MAX_ATTACHMENTS) {
    return;
  }

  fileInput.value?.click();
}

async function handleFileInput(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []).slice(0, MAX_ATTACHMENTS - attachments.value.length);

  target.value = '';

  for (const file of files) {
    const id = createAttachmentId();
    const previewUrl = URL.createObjectURL(file);
    const attachment: LocalAttachment = {
      id,
      name: file.name,
      previewUrl,
      status: 'uploading',
    };

    attachments.value.push(attachment);
    const reactiveAttachment = attachments.value.at(-1);

    if (!reactiveAttachment) {
      continue;
    }

    try {
      reactiveAttachment.file = await uploadImageFile(file);
      reactiveAttachment.status = 'ready';
    } catch (error) {
      reactiveAttachment.error = error instanceof Error ? error.message : '图片上传失败';
      reactiveAttachment.status = 'error';
    }
  }
}

function removeAttachment(attachmentId: string): void {
  const attachment = attachments.value.find((item) => item.id === attachmentId);

  if (attachment) {
    URL.revokeObjectURL(attachment.previewUrl);
  }

  attachments.value = attachments.value.filter((item) => item.id !== attachmentId);
}

function clearAttachments(): void {
  for (const attachment of attachments.value) {
    URL.revokeObjectURL(attachment.previewUrl);
  }

  attachments.value = [];
}

function getReadyAttachments(): ChatAttachment[] {
  return attachments.value
    .filter(
      (
        attachment,
      ): attachment is LocalAttachment & {
        file: FileAsset;
      } => attachment.status === 'ready' && Boolean(attachment.file),
    )
    .map((attachment, sortOrder) => ({
      file: attachment.file,
      fileId: attachment.file.id,
      id: `local-${attachment.id}`,
      previewUrl: attachment.previewUrl,
      sortOrder,
    }));
}

function takeReadyAttachments(): ChatAttachment[] {
  const readyAttachments = getReadyAttachments();
  const readyIds = new Set(readyAttachments.map((attachment) => attachment.id));

  attachments.value = attachments.value.filter(
    (attachment) => !readyIds.has(`local-${attachment.id}`),
  );

  return readyAttachments;
}

function handleSend(): void {
  if (sendDisabled.value) {
    return;
  }

  emit('send', {
    fileIds: attachments.value
      .filter((attachment) => attachment.status === 'ready' && attachment.file)
      .map((attachment) => attachment.file?.id as string),
  });
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    handleSend();
  }
}

function focus(): void {
  input.value?.focus();
}

defineExpose({ clearAttachments, focus, getReadyAttachments, takeReadyAttachments });

onBeforeUnmount(() => {
  clearAttachments();
});

function createAttachmentId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}
</script>

<template>
  <div class="chat-composer" :class="`chat-composer--${placement}`">
    <div v-if="error" class="chat-error">
      <span>
        <strong>{{ error.code === 'INSUFFICIENT_POINTS' ? '积分不足' : '生成未完成' }}</strong>
        {{ error.message }}
      </span>
      <button v-if="error.recoverable" type="button" @click="emit('retry')">
        <ReloadOutlined />
        重试
      </button>
    </div>

    <div class="chat-composer__inner">
      <div v-if="attachments.length > 0" class="chat-composer__attachments">
        <div
          v-for="attachment in attachments"
          :key="attachment.id"
          class="chat-composer__attachment"
          :class="{ 'chat-composer__attachment--error': attachment.status === 'error' }"
        >
          <img :alt="attachment.name" :src="attachment.previewUrl" />
          <span>
            <strong>{{ attachment.name }}</strong>
            <small v-if="attachment.status === 'uploading'">
              <LoadingOutlined spin />
              上传中
            </small>
            <small v-else-if="attachment.status === 'error'">
              {{ attachment.error || '上传失败' }}
            </small>
            <small v-else>已就绪</small>
          </span>
          <button
            type="button"
            :aria-label="`移除 ${attachment.name}`"
            :disabled="streaming"
            @click="removeAttachment(attachment.id)"
          >
            <CloseOutlined />
          </button>
        </div>
      </div>
      <textarea
        ref="input"
        v-model="prompt"
        rows="3"
        :disabled="streaming"
        :placeholder="placeholder"
        @keydown="handleKeydown"
      />
      <div class="chat-composer__footer">
        <div>
          <input
            ref="fileInput"
            class="chat-composer__file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            @change="handleFileInput"
          />
          <button
            type="button"
            aria-label="上传图片"
            :disabled="streaming || !attachmentEnabled || attachments.length >= MAX_ATTACHMENTS"
            :title="
              attachments.length >= MAX_ATTACHMENTS
                ? `每条消息最多上传 ${MAX_ATTACHMENTS} 张图片`
                : '上传图片'
            "
            @click="openFilePicker"
          >
            <PaperClipOutlined />
          </button>
          <button type="button">
            <ThunderboltFilled />
            {{ modelName }}
            <DownOutlined />
          </button>
        </div>
        <button
          v-if="streaming"
          class="chat-composer__send chat-composer__send--stop"
          type="button"
          aria-label="停止生成"
          @click="emit('stop')"
        >
          <StopOutlined />
        </button>
        <button
          v-else
          class="chat-composer__send"
          type="button"
          :disabled="sendDisabled"
          aria-label="发送消息"
          @click="handleSend"
        >
          <ArrowUpOutlined />
        </button>
      </div>
    </div>
    <small v-if="placement === 'docked'">内容由 AI 生成，请注意核验重要信息</small>
  </div>
</template>

<style scoped>
.chat-composer {
  display: grid;
  justify-items: center;
}

.chat-composer--docked {
  padding: 12px 24px 20px;
}

.chat-composer--welcome {
  width: 100%;
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
  padding: 12px 14px 10px;
  border: 1px solid #dce1e8;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 14px 34px rgb(36 54 86 / 8%);
}

.chat-composer__attachments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf0f4;
}

.chat-composer__attachment {
  display: grid;
  min-width: 0;
  grid-template-columns: 42px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 7px;
  padding: 6px;
  border: 1px solid #e1e6ee;
  border-radius: 9px;
  background: #f8fafc;
}

.chat-composer__attachment--error {
  border-color: #f0cfcc;
  background: #fff8f7;
}

.chat-composer__attachment img {
  width: 42px;
  height: 42px;
  border-radius: 7px;
  object-fit: cover;
}

.chat-composer__attachment > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.chat-composer__attachment strong {
  overflow: hidden;
  color: #495362;
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-composer__attachment small {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: #8c95a3;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-composer__attachment--error small {
  color: #a75b55;
}

.chat-composer__attachment > button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #8993a2;
  cursor: pointer;
}

.chat-composer__attachment > button:hover {
  background: #e9edf3;
  color: #4d5868;
}

.chat-composer__file-input {
  display: none;
}

.chat-composer--welcome .chat-composer__inner {
  min-height: 132px;
}

.chat-composer textarea {
  display: block;
  width: 100%;
  min-height: 62px;
  padding: 2px 2px 8px;
  border: 0;
  outline: 0;
  color: #2f3540;
  font-size: 13px;
  line-height: 1.7;
  resize: none;
}

.chat-composer--welcome textarea {
  min-height: 76px;
}

.chat-composer textarea::placeholder {
  color: #a0a8b6;
}

.chat-composer textarea:disabled {
  color: #858d9a;
  cursor: wait;
}

.chat-composer__footer {
  display: flex;
  min-height: 34px;
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
  height: 31px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: #f5f6f8;
  color: #687180;
  font-size: 10px;
  cursor: pointer;
}

.chat-composer__footer button:disabled {
  color: #aeb6c2;
  cursor: not-allowed;
}

.chat-composer__footer > div button:first-child {
  width: 31px;
  padding: 0;
}

.chat-composer__footer .chat-composer__send {
  width: 34px;
  height: 34px;
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

@media (max-width: 720px) {
  .chat-composer--docked {
    padding: 10px 12px 16px;
  }

  .chat-composer--welcome .chat-composer__inner {
    min-height: 118px;
  }

  .chat-composer__inner {
    padding: 11px 12px 9px;
  }

  .chat-composer__attachments {
    grid-template-columns: 1fr;
  }

  .chat-composer__footer button {
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-error {
    align-items: flex-start;
  }
}
</style>
