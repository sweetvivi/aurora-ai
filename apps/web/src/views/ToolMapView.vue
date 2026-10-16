<script setup lang="ts">
import { Input, Select } from 'ant-design-vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const SearchInput = Input.Search;

const categories = [
  { label: '全部工具', value: 'all' },
  { label: '对话与 Agent', value: 'chat' },
  { label: '视觉与设计', value: 'visual' },
  { label: '文档与办公', value: 'office' },
  { label: '媒体与音频', value: 'media' },
];

const tools = [
  { category: '对话', description: '多模型对话与任务执行', glyph: '聊', title: '模型对话' },
  { category: '发现', description: '工具、模型和智能体索引', glyph: '索', title: '工具地图' },
  { category: '视觉', description: '从提示词生成视觉作品', glyph: '绘', title: 'AI 绘画' },
  { category: '视觉', description: '图片修复、放大和分离', glyph: '修', title: '图片处理' },
  { category: '办公', description: '结构化长文和演示内容', glyph: '文', title: '文档工作台' },
  { category: '办公', description: '基于模板生成演示文稿', glyph: '稿', title: 'PPT 生成' },
  { category: '媒体', description: '视频生成和素材组织', glyph: '影', title: '视频工作台' },
  { category: '媒体', description: '文本转语音与声音任务', glyph: '声', title: '语音工作室' },
];
</script>

<template>
  <div class="tool-map">
    <PageHeader
      eyebrow="Discovery"
      title="工具地图"
      description="按任务类型浏览平台能力，后续将由工具注册表驱动完整目录。"
    />

    <section class="tool-map__controls">
      <SearchInput placeholder="搜索工具" class="tool-map__search" />
      <Select :options="categories" value="all" class="tool-map__category" />
    </section>

    <section class="tool-map__grid">
      <article v-for="tool in tools" :key="tool.title" class="tool-card">
        <div class="tool-card__heading">
          <span class="tool-card__glyph" aria-hidden="true">{{ tool.glyph }}</span>
          <StatusBadge>{{ tool.category }}</StatusBadge>
        </div>
        <strong>{{ tool.title }}</strong>
        <p>{{ tool.description }}</p>
        <button type="button">查看入口</button>
      </article>
    </section>
  </div>
</template>

<style scoped>
.tool-map {
  display: grid;
  gap: 26px;
}

.tool-map__controls {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 210px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 16px 36px rgb(23 32 51 / 6%);
}

.tool-map__search,
.tool-map__category {
  width: 100%;
}

.tool-map__grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.tool-card {
  display: grid;
  min-height: 190px;
  align-content: start;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.tool-card:hover {
  border-color: #adbec2;
  box-shadow: 0 16px 36px rgb(23 32 51 / 8%);
  transform: translateY(-2px);
}

.tool-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.tool-card__glyph {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #b8d8d3;
  border-radius: 7px;
  background: #e8f3f1;
  color: #0b685f;
  font-size: 12px;
  font-weight: 760;
}

.tool-card strong {
  margin-top: 22px;
  color: var(--ink);
  font-size: 15px;
}

.tool-card p {
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.65;
}

.tool-card button {
  width: fit-content;
  margin-top: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #0b685f;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .tool-map__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .tool-map__controls,
  .tool-map__grid {
    grid-template-columns: 1fr;
  }
}
</style>
