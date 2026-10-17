<script setup lang="ts">
import {
  ArrowUpOutlined,
  DownOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  StopOutlined,
  ThunderboltFilled,
} from '@ant-design/icons-vue';
import { ref } from 'vue';

interface ComposerError {
  code: string;
  message: string;
  recoverable: boolean;
}

withDefaults(
  defineProps<{
    canSend: boolean;
    error?: ComposerError | null;
    modelName?: string;
    placeholder?: string;
    placement?: 'docked' | 'welcome';
    streaming: boolean;
  }>(),
  {
    error: null,
    modelName: '智能模式',
    placeholder: '输入问题，粘贴材料，或描述你希望完成的任务',
    placement: 'docked',
  },
);

const emit = defineEmits<{
  retry: [];
  send: [];
  stop: [];
}>();

const prompt = defineModel<string>({ required: true });
const input = ref<HTMLTextAreaElement | null>(null);

function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    emit('send');
  }
}

function focus(): void {
  input.value?.focus();
}

defineExpose({ focus });
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
          <button type="button" aria-label="上传附件">
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
          :disabled="!canSend"
          aria-label="发送消息"
          @click="emit('send')"
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
