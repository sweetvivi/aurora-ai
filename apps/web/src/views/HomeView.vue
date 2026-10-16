<script setup lang="ts">
import { Button, Input } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const router = useRouter();
const TextArea = Input.TextArea;

const quickPrompts = ['整理一份周报', '生成图片构图', '拆解竞品页面', '规划产品路线'];

const products = [
  {
    description: '多模型对话、任务模式与历史会话',
    glyph: '聊',
    status: 'M1',
    title: '模型对话',
    to: '/chat',
  },
  {
    description: '生成、编辑与批量处理视觉内容',
    glyph: '绘',
    status: 'M1',
    title: 'AI 绘画',
    to: '/draw',
  },
  {
    description: '长文撰写、结构化编辑与导出',
    glyph: '文',
    status: 'M1',
    title: '文档工作台',
    to: '/workbench',
  },
  {
    description: '视频、音频、语音与音乐任务',
    glyph: '媒',
    status: 'M4',
    title: '媒体工作室',
    to: '/studio',
  },
];

function openChat(): void {
  void router.push('/chat');
}
</script>

<template>
  <div class="home-view">
    <PageHeader
      eyebrow="Aurora production workspace"
      title="今天要完成什么？"
      description="从一个统一工作台进入对话、绘画、文档和媒体生产流程。"
    >
      <template #actions>
        <Button type="primary" size="large" @click="openChat">进入对话</Button>
      </template>
    </PageHeader>

    <section class="command-panel">
      <div class="command-panel__toolbar">
        <StatusBadge tone="brand">openai-gpt-6-astra</StatusBadge>
        <StatusBadge>标准任务</StatusBadge>
        <StatusBadge>基础思考</StatusBadge>
      </div>
      <TextArea
        :auto-size="{ minRows: 4, maxRows: 7 }"
        placeholder="描述目标、已有材料或希望生成的结果"
        class="command-panel__input"
      />
      <div class="command-panel__footer">
        <div class="command-panel__quick-prompts">
          <button
            v-for="prompt in quickPrompts"
            :key="prompt"
            type="button"
            class="quick-prompt"
            @click="router.push('/chat')"
          >
            {{ prompt }}
          </button>
        </div>
        <Button type="primary" @click="openChat">开始</Button>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <div>
          <span class="muted-label">Product lanes</span>
          <h2>产品入口</h2>
        </div>
        <RouterLink class="section-link" to="/map">查看全部工具</RouterLink>
      </div>

      <div class="product-grid">
        <RouterLink
          v-for="product in products"
          :key="product.title"
          :to="product.to"
          class="product-card"
        >
          <div class="product-card__topline">
            <span class="product-card__glyph" aria-hidden="true">{{ product.glyph }}</span>
            <StatusBadge :tone="product.status === 'M1' ? 'accent' : 'neutral'">
              {{ product.status }}
            </StatusBadge>
          </div>
          <strong>{{ product.title }}</strong>
          <p>{{ product.description }}</p>
          <span class="product-card__action">打开工作台</span>
        </RouterLink>
      </div>
    </section>

    <section class="foundation-grid">
      <article class="foundation-panel">
        <span class="muted-label">M0 foundation</span>
        <strong>工程骨架已连接</strong>
        <p>Vue、Router、Pinia、TanStack Query、NestJS、PostgreSQL 和 Redis 使用同一工作区。</p>
        <div class="foundation-panel__meter">
          <span style="width: 82%" />
        </div>
      </article>
      <article class="foundation-panel foundation-panel--dark">
        <span class="muted-label">Next milestone</span>
        <strong>首条真实对话闭环</strong>
        <p>登录、模型别名、流式响应、积分冻结结算和历史消息将在 M1 接通。</p>
        <RouterLink to="/chat">查看对话骨架</RouterLink>
      </article>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  display: grid;
  gap: 30px;
}

.command-panel {
  padding: 16px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 52px rgb(23 32 51 / 8%);
}

.command-panel__toolbar,
.command-panel__footer,
.command-panel__quick-prompts {
  display: flex;
  align-items: center;
  gap: 8px;
}

.command-panel__toolbar {
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.command-panel__input :deep(textarea) {
  padding: 14px;
  border: 0;
  border-radius: 6px;
  background: #f5f7f8;
  box-shadow: none;
  color: var(--ink);
  font-size: 15px;
  line-height: 1.7;
  resize: none;
}

.command-panel__input :deep(textarea:focus) {
  background: #fff;
  box-shadow: 0 0 0 1px #0f766e;
}

.command-panel__footer {
  justify-content: space-between;
  margin-top: 12px;
}

.command-panel__quick-prompts {
  min-width: 0;
  flex-wrap: wrap;
}

.quick-prompt {
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
  color: #536070;
  font-size: 11px;
  cursor: pointer;
}

.quick-prompt:hover {
  border-color: #aeb9c4;
  color: var(--ink);
}

.home-section {
  display: grid;
  gap: 14px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.section-heading h2 {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 20px;
}

.section-link {
  color: #0b685f;
  font-size: 12px;
  font-weight: 680;
  text-decoration: none;
}

.product-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.product-card {
  display: grid;
  min-height: 176px;
  align-content: start;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.product-card:hover {
  border-color: #afbdca;
  box-shadow: 0 14px 32px rgb(23 32 51 / 8%);
  transform: translateY(-2px);
}

.product-card__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.product-card__glyph {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 7px;
  background: #e8f3f1;
  color: #0b685f;
  font-size: 13px;
  font-weight: 760;
}

.product-card strong {
  margin-top: 22px;
  color: var(--ink);
  font-size: 15px;
}

.product-card p {
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.65;
}

.product-card__action {
  margin-top: auto;
  padding-top: 18px;
  color: #0b685f;
  font-size: 11px;
  font-weight: 680;
}

.foundation-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.foundation-panel {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
}

.foundation-panel strong {
  margin-top: 6px;
  color: var(--ink);
  font-size: 17px;
}

.foundation-panel p {
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.foundation-panel__meter {
  height: 5px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7ecef;
}

.foundation-panel__meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0f766e;
}

.foundation-panel--dark {
  background: #172033;
}

.foundation-panel--dark strong {
  color: #fff;
}

.foundation-panel--dark p {
  color: #b3bdcb;
}

.foundation-panel--dark :deep(.muted-label) {
  color: #7dd3c8;
}

.foundation-panel--dark a {
  width: fit-content;
  margin-top: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 680;
  text-decoration: none;
}

@media (max-width: 1100px) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .command-panel__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .command-panel__footer :deep(.ant-btn) {
    width: 100%;
  }

  .product-grid,
  .foundation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
