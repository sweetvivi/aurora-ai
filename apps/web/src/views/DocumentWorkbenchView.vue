<script setup lang="ts">
import {
  BoldOutlined,
  CheckCircleFilled,
  DownloadOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RobotOutlined,
  TableOutlined,
  ThunderboltOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue';
import { Button, Input, Select } from 'ant-design-vue';
import type { Component } from 'vue';
import { computed, ref } from 'vue';
import StatusBadge from '@/components/StatusBadge.vue';

interface FormatButton {
  icon: Component;
  label: string;
}

const TextArea = Input.TextArea;
const title = ref('未命名文档');
const content = ref('');

const modelOptions = [
  { label: 'Aurora Chat 2.6', value: 'aurora-chat-2-6' },
  { label: 'Aurora Reason', value: 'aurora-reason' },
];
const styleOptions = [
  { label: '简洁专业', value: 'professional' },
  { label: '清晰直接', value: 'direct' },
  { label: '深度分析', value: 'analytical' },
];
const lengthOptions = [
  { label: '标准篇幅', value: 'standard' },
  { label: '精炼摘要', value: 'brief' },
  { label: '深度长文', value: 'long' },
];

const formatButtons: FormatButton[] = [
  { icon: BoldOutlined, label: '加粗' },
  { icon: ItalicOutlined, label: '斜体' },
  { icon: UnderlineOutlined, label: '下划线' },
  { icon: UnorderedListOutlined, label: '无序列表' },
  { icon: OrderedListOutlined, label: '有序列表' },
  { icon: LinkOutlined, label: '插入链接' },
  { icon: PictureOutlined, label: '插入图片' },
  { icon: TableOutlined, label: '插入表格' },
];

const wordCount = computed(() => content.value.replace(/\s+/g, '').length);
</script>

<template>
  <div class="document-workbench">
    <header class="document-workbench__header">
      <div class="document-workbench__heading">
        <div class="document-workbench__breadcrumb">
          <span>我的文档</span>
          <i>/</i>
          <span>新建文档</span>
        </div>
        <div class="document-workbench__title-row">
          <FileTextOutlined />
          <input v-model="title" aria-label="文档标题" />
          <StatusBadge tone="brand">草稿</StatusBadge>
        </div>
      </div>

      <div class="document-workbench__actions">
        <span class="document-workbench__saved">
          <CheckCircleFilled />
          已自动保存
        </span>
        <Button>
          <HistoryOutlined />
          历史版本
        </Button>
        <Button>
          <DownloadOutlined />
          导出
        </Button>
        <Button type="primary">
          <ThunderboltOutlined />
          生成草稿
        </Button>
      </div>
    </header>

    <section class="document-workbench__settings">
      <div class="document-workbench__setting">
        <span>模型</span>
        <Select :options="modelOptions" value="aurora-chat-2-6" />
      </div>
      <div class="document-workbench__setting">
        <span>表达风格</span>
        <Select :options="styleOptions" value="professional" />
      </div>
      <div class="document-workbench__setting">
        <span>篇幅</span>
        <Select :options="lengthOptions" value="standard" />
      </div>
      <div class="document-workbench__setting document-workbench__setting--source">
        <span>参考资料</span>
        <button type="button">添加资料或链接</button>
      </div>
    </section>

    <section class="document-workbench__canvas">
      <div class="document-workbench__paper">
        <div class="document-workbench__format-bar">
          <div>
            <button
              v-for="formatButton in formatButtons"
              :key="formatButton.label"
              type="button"
              :aria-label="formatButton.label"
              :title="formatButton.label"
            >
              <component :is="formatButton.icon" />
            </button>
          </div>
          <button class="document-workbench__ai-button" type="button">
            <RobotOutlined />
            AI 续写
          </button>
        </div>

        <div class="document-workbench__page">
          <div class="document-workbench__page-heading">
            <span>正文</span>
            <small>自动保存将在 M1 接入云端</small>
          </div>
          <TextArea
            v-model:value="content"
            :auto-size="{ minRows: 18, maxRows: 28 }"
            placeholder="输入主题、粘贴大纲或提供参考资料，AI 将在这里继续完善文档。"
          />
          <footer class="document-workbench__page-footer">
            <span>{{ wordCount }} 字</span>
            <span>支持 Markdown 与常用快捷键</span>
          </footer>
        </div>
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
  min-height: 82px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.document-workbench__heading {
  min-width: 0;
}

.document-workbench__breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9aa2ae;
  font-size: 9px;
}

.document-workbench__breadcrumb i {
  font-style: normal;
}

.document-workbench__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

.document-workbench__title-row > :deep(svg) {
  color: var(--brand);
  font-size: 15px;
}

.document-workbench__title-row input {
  width: min(360px, 34vw);
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #22272f;
  font-size: 20px;
  font-weight: 800;
}

.document-workbench__actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.document-workbench__actions :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.document-workbench__saved {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 4px;
  color: #78a38f;
  font-size: 9px;
  white-space: nowrap;
}

.document-workbench__saved :deep(svg) {
  color: #24a36a;
}

.document-workbench__settings {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 10px;
  padding: 9px 18px;
  border-bottom: 1px solid var(--line);
  background: #fbfcfd;
}

.document-workbench__setting {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.document-workbench__setting > span {
  color: #9aa2ad;
  font-size: 8px;
  font-weight: 700;
}

.document-workbench__setting :deep(.ant-select) {
  width: 166px;
}

.document-workbench__setting :deep(.ant-select-selector) {
  height: 30px !important;
  padding: 0 9px !important;
  background: #fff !important;
}

.document-workbench__setting :deep(.ant-select-selection-item) {
  line-height: 28px !important;
}

.document-workbench__setting--source {
  margin-left: auto;
}

.document-workbench__setting--source button {
  height: 30px;
  padding: 0 11px;
  border: 1px dashed #cbd0d8;
  border-radius: 7px;
  background: #fff;
  color: #667080;
  font-size: 10px;
  cursor: pointer;
}

.document-workbench__canvas {
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
  background:
    linear-gradient(rgb(255 255 255 / 36%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 36%) 1px, transparent 1px), #eef1f5;
  background-size: 18px 18px;
}

.document-workbench__paper {
  width: min(100%, 860px);
  min-height: 700px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #d9dee5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 46px rgb(25 34 50 / 9%);
}

.document-workbench__format-bar {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 12px;
  border-bottom: 1px solid #eceef2;
  background: #fafbfc;
}

.document-workbench__format-bar > div {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.document-workbench__format-bar button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6d7786;
  cursor: pointer;
}

.document-workbench__format-bar button:hover {
  background: #eef1f4;
  color: #35404e;
}

.document-workbench__format-bar .document-workbench__ai-button {
  display: inline-flex;
  width: auto;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  background: var(--brand-soft);
  color: var(--brand-strong);
  font-size: 9px;
  font-weight: 750;
}

.document-workbench__page {
  min-height: 650px;
  padding: 30px 46px 22px;
}

.document-workbench__page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f1f4;
}

.document-workbench__page-heading span {
  color: #606a78;
  font-size: 10px;
  font-weight: 750;
}

.document-workbench__page-heading small {
  color: #9ba3ae;
  font-size: 8px;
}

.document-workbench__page :deep(textarea) {
  min-height: 470px !important;
  padding: 22px 0 !important;
  border: 0 !important;
  box-shadow: none !important;
  color: #2d3747 !important;
  font-size: 14px !important;
  line-height: 1.9 !important;
  resize: none !important;
}

.document-workbench__page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f1f4;
  color: #a1a8b2;
  font-size: 8px;
}

@media (max-width: 900px) {
  .document-workbench__header {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px 12px;
  }

  .document-workbench__title-row input {
    width: min(100%, 320px);
  }

  .document-workbench__actions {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .document-workbench__saved {
    display: none;
  }

  .document-workbench__settings {
    overflow-x: auto;
    padding: 9px 12px;
  }

  .document-workbench__setting {
    flex: 0 0 auto;
  }

  .document-workbench__setting--source {
    margin-left: 0;
  }

  .document-workbench__canvas {
    padding: 12px;
  }
}

@media (max-width: 620px) {
  .document-workbench__setting :deep(.ant-select) {
    width: 145px;
  }

  .document-workbench__paper {
    min-height: 600px;
  }

  .document-workbench__format-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .document-workbench__format-bar > div {
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  .document-workbench__format-bar button {
    flex: 0 0 auto;
  }

  .document-workbench__format-bar .document-workbench__ai-button {
    width: 100%;
    justify-content: center;
  }

  .document-workbench__page {
    min-height: 560px;
    padding: 24px 20px 18px;
  }

  .document-workbench__page :deep(textarea) {
    min-height: 400px !important;
  }
}
</style>
