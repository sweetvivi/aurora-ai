<script setup lang="ts">
import { Button } from 'ant-design-vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const legacyTools = [
  { description: '面向旧版内容结构的只读预览', glyph: 'PDF', title: 'PDF 工具' },
  { description: '保留低成熟度页面的兼容入口', glyph: '板', title: '白板' },
  { description: '为旧任务预留的后台迁移路径', glyph: '3D', title: '3D 建模' },
];
</script>

<template>
  <div class="legacy-tools">
    <PageHeader
      eyebrow="Compatibility layer"
      title="兼容工具"
      description="保留低成熟度产品入口，统一通过适配层迁移，不复制旧站实现。"
    >
      <template #actions>
        <Button>迁移记录</Button>
      </template>
    </PageHeader>

    <section class="legacy-notice">
      <StatusBadge tone="warning">Legacy shell</StatusBadge>
      <p>本页仅提供 M0 路由和布局占位，正式功能将在对应里程碑确认范围后开发。</p>
    </section>

    <section class="legacy-grid">
      <article v-for="tool in legacyTools" :key="tool.title" class="legacy-card">
        <span class="legacy-card__glyph" aria-hidden="true">{{ tool.glyph }}</span>
        <strong>{{ tool.title }}</strong>
        <p>{{ tool.description }}</p>
        <button type="button">查看状态</button>
      </article>
    </section>
  </div>
</template>

<style scoped>
.legacy-tools {
  display: grid;
  gap: 24px;
}

.legacy-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #ded5c4;
  border-radius: 7px;
  background: #fffaf1;
}

.legacy-notice p {
  margin: 0;
  color: #6d604e;
  font-size: 12px;
}

.legacy-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.legacy-card {
  display: grid;
  min-height: 190px;
  align-content: start;
  padding: 17px;
  border: 1px solid #ddd7ca;
  border-radius: 7px;
  background: #fffdf8;
}

.legacy-card__glyph {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid #c9bfab;
  border-radius: 7px;
  color: #6d604e;
  font-size: 11px;
  font-weight: 760;
}

.legacy-card strong {
  margin-top: 24px;
  color: #3f382e;
  font-size: 15px;
}

.legacy-card p {
  margin: 7px 0 0;
  color: #7b7163;
  font-size: 12px;
  line-height: 1.65;
}

.legacy-card button {
  width: fit-content;
  margin-top: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #8a5d20;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 760px) {
  .legacy-grid {
    grid-template-columns: 1fr;
  }

  .legacy-notice {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
