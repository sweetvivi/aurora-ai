<script setup lang="ts">
import { Button, Input, Select } from 'ant-design-vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const TextArea = Input.TextArea;

const modelOptions = [
  {
    label: 'openai-gpt-6-astra',
    value: 'openai-gpt-6-astra',
  },
];
</script>

<template>
  <div class="chat-view">
    <PageHeader
      eyebrow="Conversation workspace"
      title="模型对话"
      description="统一模型别名、会话历史和流式响应将在 M1 接入真实供应商。"
    >
      <template #actions>
        <Button>新建会话</Button>
      </template>
    </PageHeader>

    <section class="chat-workspace">
      <aside class="chat-workspace__history">
        <div class="chat-workspace__history-heading">
          <span class="muted-label">History</span>
          <StatusBadge>0 条</StatusBadge>
        </div>
        <div class="chat-workspace__empty-history">
          <strong>暂无会话</strong>
          <span>消息历史将在 M1 持久化</span>
        </div>
      </aside>

      <div class="chat-workspace__main">
        <div class="chat-workspace__toolbar">
          <Select
            :options="modelOptions"
            value="openai-gpt-6-astra"
            class="chat-workspace__model"
          />
          <StatusBadge tone="brand">SSE ready</StatusBadge>
          <StatusBadge>基础思考</StatusBadge>
        </div>

        <div class="conversation">
          <div class="conversation__mark" aria-hidden="true">极</div>
          <h2>从一条清晰的任务开始</h2>
          <p>输入问题、粘贴材料，或描述希望得到的结构化结果。</p>

          <div class="conversation__suggestions">
            <button type="button">分析一段产品需求</button>
            <button type="button">整理会议要点</button>
            <button type="button">生成实现步骤</button>
          </div>
        </div>

        <div class="composer">
          <TextArea
            :auto-size="{ minRows: 3, maxRows: 7 }"
            placeholder="输入消息"
            class="composer__input"
          />
          <div class="composer__footer">
            <span>流式接口尚未启用</span>
            <Button type="primary" disabled>发送</Button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chat-view {
  display: grid;
  gap: 24px;
}

.chat-workspace {
  display: grid;
  min-height: 650px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  grid-template-columns: 230px minmax(0, 1fr);
}

.chat-workspace__history {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 16px;
  border-right: 1px solid var(--line);
  background: #f8fafb;
}

.chat-workspace__history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-workspace__empty-history {
  display: grid;
  place-items: center;
  gap: 5px;
  padding: 28px 12px;
  border: 1px dashed #cfd7dd;
  border-radius: 6px;
  color: var(--muted);
  text-align: center;
}

.chat-workspace__empty-history strong {
  color: #536070;
  font-size: 12px;
}

.chat-workspace__empty-history span {
  font-size: 10px;
}

.chat-workspace__main {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.chat-workspace__toolbar {
  display: flex;
  min-height: 57px;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
}

.chat-workspace__model {
  width: min(100%, 260px);
}

.conversation {
  display: grid;
  align-content: center;
  justify-items: center;
  padding: 54px 18px;
  text-align: center;
}

.conversation__mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 10px;
  background: #172033;
  color: #fff;
  font-size: 20px;
  font-weight: 760;
  box-shadow: 0 16px 32px rgb(23 32 51 / 14%);
}

.conversation h2 {
  margin: 18px 0 0;
  color: var(--ink);
  font-size: 22px;
}

.conversation p {
  margin: 9px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.conversation__suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 22px;
}

.conversation__suggestions button {
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
  color: #536070;
  font-size: 11px;
  cursor: pointer;
}

.conversation__suggestions button:hover {
  border-color: #aeb9c4;
  color: var(--ink);
}

.composer {
  padding: 12px;
  border-top: 1px solid var(--line);
}

.composer__input :deep(textarea) {
  border: 0;
  border-radius: 6px;
  background: #f5f7f8;
  box-shadow: none;
  resize: none;
}

.composer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
}

.composer__footer span {
  color: #8994a2;
  font-size: 10px;
}

@media (max-width: 800px) {
  .chat-workspace {
    min-height: 600px;
    grid-template-columns: 1fr;
  }

  .chat-workspace__history {
    display: none;
  }
}
</style>
