<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { CODE_COPY_BUTTON_CLASS, readCodeBlockText, renderSafeMarkdown } from '@/utils/markdown';

const props = withDefaults(
  defineProps<{
    content: string;
    streaming?: boolean;
  }>(),
  {
    streaming: false,
  },
);

const container = ref<HTMLElement | null>(null);
let resetTimer: number | undefined;

const renderedContent = computed(() => renderSafeMarkdown(props.content));

async function handleClick(event: MouseEvent): Promise<void> {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest<HTMLButtonElement>(`.${CODE_COPY_BUTTON_CLASS}`);

  if (!button || !container.value?.contains(button)) {
    return;
  }

  const code = readCodeBlockText(container.value, button);

  if (!code) {
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
  } catch {
    return;
  }

  button.textContent = '已复制';
  button.dataset.copied = 'true';

  if (resetTimer) {
    window.clearTimeout(resetTimer);
  }

  resetTimer = window.setTimeout(() => {
    if (button.isConnected) {
      button.textContent = '复制';
      delete button.dataset.copied;
    }
  }, 1_500);
}

onBeforeUnmount(() => {
  if (resetTimer) {
    window.clearTimeout(resetTimer);
  }
});
</script>

<template>
  <div
    ref="container"
    class="markdown-message"
    :class="{ 'markdown-message--streaming': streaming }"
    @click="handleClick"
  >
    <div class="markdown-message__content" v-html="renderedContent" />
    <i v-if="streaming" class="markdown-message__cursor" />
  </div>
</template>

<style scoped>
.markdown-message {
  min-width: 0;
}

.markdown-message__content {
  min-width: 0;
  overflow-wrap: anywhere;
}

.markdown-message__content :deep(> :first-child) {
  margin-top: 0;
}

.markdown-message__content :deep(> :last-child) {
  margin-bottom: 0;
}

.markdown-message__content :deep(p) {
  margin: 0 0 10px;
}

.markdown-message__content :deep(h1),
.markdown-message__content :deep(h2),
.markdown-message__content :deep(h3),
.markdown-message__content :deep(h4),
.markdown-message__content :deep(h5),
.markdown-message__content :deep(h6) {
  margin: 18px 0 8px;
  color: #252c37;
  font-weight: 800;
  line-height: 1.45;
}

.markdown-message__content :deep(h1) {
  font-size: 20px;
}

.markdown-message__content :deep(h2) {
  font-size: 17px;
}

.markdown-message__content :deep(h3) {
  font-size: 15px;
}

.markdown-message__content :deep(h4),
.markdown-message__content :deep(h5),
.markdown-message__content :deep(h6) {
  font-size: 13px;
}

.markdown-message__content :deep(ul),
.markdown-message__content :deep(ol) {
  margin: 8px 0 12px;
  padding-left: 22px;
}

.markdown-message__content :deep(li + li) {
  margin-top: 4px;
}

.markdown-message__content :deep(blockquote) {
  margin: 11px 0;
  padding: 8px 12px;
  border-left: 3px solid #9dbcf8;
  background: #f1f5ff;
  color: #546072;
}

.markdown-message__content :deep(a) {
  color: #316fdf;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: #adc8ff;
  text-underline-offset: 3px;
}

.markdown-message__content :deep(code) {
  padding: 2px 5px;
  border-radius: 5px;
  background: #e8edf5;
  color: #bf3d58;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 0.9em;
}

.markdown-message__content :deep(pre) {
  position: relative;
  margin: 12px 0;
  overflow-x: auto;
  padding: 35px 13px 13px;
  border: 1px solid #28364b;
  border-radius: 9px;
  background: #172233;
  color: #dbe8f8;
  line-height: 1.65;
}

.markdown-message__content :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: 11px;
  white-space: pre;
}

.markdown-message__content :deep(.markdown-code-copy) {
  position: absolute;
  top: 7px;
  right: 7px;
  height: 23px;
  padding: 0 8px;
  border: 1px solid #41536d;
  border-radius: 6px;
  background: #223149;
  color: #c9d8eb;
  font-size: 9px;
  cursor: pointer;
}

.markdown-message__content :deep(.markdown-code-copy:hover),
.markdown-message__content :deep(.markdown-code-copy[data-copied='true']) {
  border-color: #648ff0;
  color: #fff;
}

.markdown-message__content :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
  font-size: 11px;
}

.markdown-message__content :deep(th),
.markdown-message__content :deep(td) {
  padding: 8px 9px;
  border: 1px solid #dfe5ee;
  text-align: left;
}

.markdown-message__content :deep(th) {
  background: #f1f4f8;
  color: #3c4655;
  font-weight: 750;
}

.markdown-message__content :deep(hr) {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid #e5e9f0;
}

.markdown-message__cursor {
  display: inline-block;
  width: 6px;
  height: 14px;
  margin-left: 3px;
  vertical-align: -2px;
  background: #4c84ff;
  animation: markdown-cursor-blink 900ms steps(2, jump-none) infinite;
}

@keyframes markdown-cursor-blink {
  50% {
    opacity: 0;
  }
}
</style>
