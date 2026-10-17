<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { fetchFileBlob } from '@/app/api';
import type { ChatAttachment } from '@/stores/chat-workspace';

const props = defineProps<{
  attachments: ChatAttachment[];
}>();

const previewUrls = ref<Record<string, string>>({});
const failedFileIds = ref<Set<string>>(new Set());
const objectUrls = new Set<string>();
let loadVersion = 0;

watch(
  () => props.attachments,
  async (attachments) => {
    const version = ++loadVersion;
    const nextUrls: Record<string, string> = {};
    const nextFailures = new Set<string>();

    for (const attachment of attachments) {
      if (attachment.previewUrl) {
        nextUrls[attachment.fileId] = attachment.previewUrl;
        continue;
      }

      try {
        const blob = await fetchFileBlob(attachment.fileId);
        const objectUrl = URL.createObjectURL(blob);

        objectUrls.add(objectUrl);
        nextUrls[attachment.fileId] = objectUrl;
      } catch {
        nextFailures.add(attachment.fileId);
      }
    }

    if (version !== loadVersion) {
      return;
    }

    clearFetchedUrls();
    previewUrls.value = nextUrls;
    failedFileIds.value = nextFailures;
  },
  { deep: true, immediate: true },
);

onBeforeUnmount(() => {
  loadVersion += 1;
  clearFetchedUrls();
});

function clearFetchedUrls(): void {
  for (const objectUrl of objectUrls) {
    URL.revokeObjectURL(objectUrl);
  }

  objectUrls.clear();
}
</script>

<template>
  <div v-if="attachments.length > 0" class="message-attachments">
    <figure v-for="attachment in attachments" :key="attachment.id">
      <img
        v-if="previewUrls[attachment.fileId]"
        :alt="attachment.file.originalName"
        :src="previewUrls[attachment.fileId]"
      />
      <span v-else class="message-attachments__fallback">
        {{ failedFileIds.has(attachment.fileId) ? '图片不可用' : '加载图片…' }}
      </span>
      <figcaption>{{ attachment.file.originalName }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.message-attachments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 110px));
  gap: 8px;
  margin-top: 9px;
}

.message-attachments figure {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid #dce3ed;
  border-radius: 9px;
  background: #f7f9fc;
}

.message-attachments img,
.message-attachments__fallback {
  display: flex;
  width: 100%;
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  object-fit: cover;
}

.message-attachments__fallback {
  padding: 8px;
  color: #8d96a4;
  font-size: 9px;
  text-align: center;
}

.message-attachments figcaption {
  overflow: hidden;
  padding: 5px 6px;
  color: #717b89;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .message-attachments {
    grid-template-columns: repeat(3, minmax(0, 88px));
  }
}
</style>
