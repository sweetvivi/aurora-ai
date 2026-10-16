<script setup lang="ts">
import { Button, Input, Select } from 'ant-design-vue';
import StatusBadge from '@/components/StatusBadge.vue';

const TextArea = Input.TextArea;
const modelOptions = [{ label: 'openai-gpt-6-astra', value: 'openai-gpt-6-astra' }];
</script>

<template>
  <div class="document-workbench">
    <header class="document-workbench__header">
      <div>
        <span class="muted-label">Untitled document</span>
        <h1>新建文档</h1>
      </div>
      <div class="document-workbench__actions">
        <StatusBadge tone="accent">M1</StatusBadge>
        <Button>历史版本</Button>
        <Button type="primary">生成草稿</Button>
      </div>
    </header>

    <div class="document-workbench__settings">
      <Select :options="modelOptions" value="openai-gpt-6-astra" />
      <Select
        :options="[
          { label: '简洁专业', value: 'professional' },
          { label: '清晰直接', value: 'direct' },
        ]"
        value="professional"
      />
    </div>

    <section class="document-workbench__editor">
      <div class="document-workbench__paper">
        <div class="document-workbench__paper-heading">
          <span>文档标题</span>
          <small>自动保存将在 M1 启用</small>
        </div>
        <TextArea
          :auto-size="{ minRows: 18, maxRows: 28 }"
          placeholder="输入主题、粘贴大纲或提供参考资料"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.document-workbench {
  display: grid;
  min-height: 100%;
  grid-template-rows: auto auto minmax(0, 1fr);
}

.document-workbench__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--line);
}

.document-workbench__header h1 {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 24px;
}

.document-workbench__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.document-workbench__settings {
  display: flex;
  gap: 9px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--line);
  background: #f8fafb;
}

.document-workbench__settings :deep(.ant-select) {
  width: 190px;
}

.document-workbench__editor {
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
  background: #edf0f2;
}

.document-workbench__paper {
  width: min(100%, 860px);
  min-height: 680px;
  margin: 0 auto;
  padding: 32px;
  border: 1px solid #d5dce1;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 18px 42px rgb(23 32 51 / 8%);
}

.document-workbench__paper-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.document-workbench__paper-heading span {
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
}

.document-workbench__paper-heading small {
  color: #8b96a3;
  font-size: 10px;
}

.document-workbench__paper :deep(textarea) {
  padding: 0;
  border: 0;
  box-shadow: none;
  color: #2d3747;
  font-size: 14px;
  line-height: 1.9;
  resize: none;
}

@media (max-width: 700px) {
  .document-workbench__header {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px 14px 14px;
  }

  .document-workbench__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .document-workbench__settings {
    padding: 10px 14px;
  }

  .document-workbench__settings :deep(.ant-select) {
    width: 100%;
  }

  .document-workbench__editor {
    padding: 12px;
  }

  .document-workbench__paper {
    min-height: 560px;
    padding: 20px;
  }
}
</style>
