<script setup lang="ts">
import {
  ArrowUpOutlined,
  BarChartOutlined,
  FileTextOutlined,
  FormOutlined,
  HistoryOutlined,
  LayoutOutlined,
  LinkOutlined,
  PlusOutlined,
  ReadOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import GalleryArtwork from '@/components/GalleryArtwork.vue';
import { useAgentWorkspaceStore } from '@/stores/agent-workspace';

interface QuickMode {
  agentId: string;
  icon: Component;
  label: string;
  prompt: string;
}

interface ScenarioTab {
  agentId: string;
  label: string;
  value: string;
}

interface AgentCase {
  agentId: string;
  category: string;
  description: string;
  tags: string[];
  title: string;
  variants: number[];
}

const router = useRouter();
const workspace = useAgentWorkspaceStore();
const prompt = ref('');
const activeTab = ref('explore');
const selectedAgentId = ref('document-editor');

const quickModes: QuickMode[] = [
  {
    agentId: 'growth-copywriter',
    icon: FormOutlined,
    label: '写作',
    prompt: '帮我策划一篇结构清晰、适合目标读者的文章。',
  },
  {
    agentId: 'document-editor',
    icon: FileTextOutlined,
    label: '报告',
    prompt: '根据主题整理研究框架，并生成一份专业报告。',
  },
  {
    agentId: 'brand-designer',
    icon: LayoutOutlined,
    label: '设计',
    prompt: '为品牌活动设计一套视觉方向，并说明设计依据。',
  },
  {
    agentId: 'data-analyst',
    icon: TableOutlined,
    label: '表格',
    prompt: '分析这份业务数据，输出关键结论和图表建议。',
  },
  {
    agentId: 'visual-prompt',
    icon: LinkOutlined,
    label: '网页',
    prompt: '把一个产品想法整理成可演示的网页方案。',
  },
];

const scenarioTabs: ScenarioTab[] = [
  { agentId: 'document-editor', label: '探索', value: 'explore' },
  { agentId: 'document-editor', label: '做报告', value: 'report' },
  { agentId: 'document-editor', label: '写文档', value: 'document' },
  { agentId: 'research-mentor', label: '简历制作', value: 'resume' },
  { agentId: 'growth-copywriter', label: '自媒体创作', value: 'media' },
  { agentId: 'research-mentor', label: '市场调研', value: 'research' },
  { agentId: 'study-planner', label: '教学设计', value: 'teaching' },
  { agentId: 'study-planner', label: '学习研究', value: 'study' },
  { agentId: 'growth-copywriter', label: '营销策划', value: 'marketing' },
  { agentId: 'document-editor', label: '做播客', value: 'podcast' },
];

const agentCases: AgentCase[] = [
  {
    agentId: 'growth-copywriter',
    category: '内容策划',
    description: '从受众痛点和平台语境出发，生成完整图文指南。',
    tags: ['旅行', '图文', '选题'],
    title: '城市周末漫游图文指南',
    variants: [0, 4],
  },
  {
    agentId: 'document-editor',
    category: '商业写作',
    description: '搭建世界观与人物线，输出可继续扩写的章节结构。',
    tags: ['小说', '人物', '世界观'],
    title: '未来科技题材融合爽文情节',
    variants: [6, 1],
  },
  {
    agentId: 'meeting-notes',
    category: '运营增长',
    description: '把产品卖点、受众和渠道整理成多版本内容脚本。',
    tags: ['饮食', '文案', '带货'],
    title: '轻食品牌内容带货方案',
    variants: [3, 5],
  },
  {
    agentId: 'brand-designer',
    category: '市场策略',
    description: '拆解用户决策路径，形成渠道投放与转化建议。',
    tags: ['家电', '洞察', '转化'],
    title: '智能家电达人营销设计',
    variants: [7, 2],
  },
  {
    agentId: 'study-planner',
    category: '学习成长',
    description: '将知识主题拆成阶段练习和可复盘的学习路线。',
    tags: ['学习方法', '笔记', '复盘'],
    title: '创作学习方法对比与练习',
    variants: [1, 4],
  },
  {
    agentId: 'data-analyst',
    category: '效率生活',
    description: '结合预算、时间和营养目标规划一周日常菜单。',
    tags: ['早餐', '预算', '清单'],
    title: '一周低成本早餐计划',
    variants: [5, 3],
  },
  {
    agentId: 'research-mentor',
    category: '职场研究',
    description: '围绕岗位场景设计需求清单、功能优先级和验收标准。',
    tags: ['职场', '产品', '调研'],
    title: '新人办公软件需求调研',
    variants: [2, 0],
  },
  {
    agentId: 'professional-translator',
    category: '行业报告',
    description: '聚合技术、用户和竞争信息，形成结构化市场判断。',
    tags: ['机器人', '市场', '趋势'],
    title: '家用智能机器人市场研究',
    variants: [4, 7],
  },
];

const visibleCases = computed(() => {
  if (activeTab.value === 'explore') {
    return agentCases;
  }

  const index = Math.max(
    0,
    scenarioTabs.findIndex((tab) => tab.value === activeTab.value),
  );

  return [...agentCases.slice(index), ...agentCases.slice(0, index)].slice(0, 4);
});

function useMode(mode: QuickMode): void {
  prompt.value = mode.prompt;
  selectedAgentId.value = mode.agentId;
}

function selectScenario(tab: ScenarioTab): void {
  activeTab.value = tab.value;
  selectedAgentId.value = tab.agentId;
}

function startTask(): void {
  if (!prompt.value.trim()) {
    return;
  }

  void router.push({
    name: 'agent-detail',
    params: {
      id: selectedAgentId.value,
    },
    query: {
      prompt: prompt.value.trim(),
      start: Date.now().toString(),
    },
  });
}

function openLatestSession(): void {
  const latest = workspace.sessions[0];

  if (!latest) {
    return;
  }

  void router.push({
    name: 'agent-detail',
    params: {
      id: latest.agentId,
    },
    query: {
      session: latest.id,
    },
  });
}
</script>

<template>
  <div class="agents-hub">
    <header class="agents-hub__utility">
      <div>
        <span>Agent 工作台</span>
        <small>从一句目标开始，自动拆解任务与产出</small>
      </div>
      <button type="button" @click="openLatestSession">
        <HistoryOutlined />
        历史记录
      </button>
    </header>

    <section class="agents-hero">
      <div class="agents-hero__heading">
        <h1>你好，我是 <em>Agent 助手</em></h1>
        <p>描述一个目标，我会自动选择合适的智能体，完成调研、写作、设计与演示。</p>
      </div>

      <div class="agents-quick-modes">
        <button v-for="mode in quickModes" :key="mode.label" type="button" @click="useMode(mode)">
          <component :is="mode.icon" />
          {{ mode.label }}
        </button>
      </div>

      <form class="agents-prompt" @submit.prevent="startTask">
        <label class="agents-prompt__field">
          <SearchOutlined />
          <textarea
            v-model="prompt"
            rows="3"
            placeholder="输入你的需求，例如：整理一份新手旅行计划，并生成可分享的网页。"
          />
        </label>

        <div class="agents-prompt__footer">
          <div class="agents-prompt__tools">
            <button type="button" aria-label="添加文件">
              <FileTextOutlined />
            </button>
            <button type="button" aria-label="添加链接">
              <LinkOutlined />
            </button>
          </div>
          <button
            class="agents-prompt__submit"
            type="submit"
            :disabled="!prompt.trim()"
            aria-label="开始任务"
          >
            <ArrowUpOutlined />
          </button>
        </div>
      </form>
    </section>

    <nav class="agents-scenarios" aria-label="智能体场景">
      <button
        v-for="tab in scenarioTabs"
        :key="tab.value"
        type="button"
        :class="{ active: activeTab === tab.value }"
        @click="selectScenario(tab)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="workspace.customAgents.length > 0" class="agents-custom-section">
      <header class="agents-case-section__heading">
        <div>
          <h2>我的智能体</h2>
          <p>已发布的本地草稿会出现在这里，可以继续对话和调试。</p>
        </div>
        <button type="button" @click="router.push('/agents/create')">
          <PlusOutlined />
          再创建一个
        </button>
      </header>
      <div class="agents-custom-grid">
        <button
          v-for="item in workspace.customAgents"
          :key="item.id"
          type="button"
          class="agents-custom-card"
          @click="router.push(`/agents/${item.id}`)"
        >
          <span :style="{ background: item.color }">{{ item.glyph }}</span>
          <span>
            <strong>{{ item.name }}</strong>
            <small>{{ item.description }}</small>
          </span>
          <em>{{ item.tags.slice(0, 2).join(' · ') }}</em>
        </button>
      </div>
    </section>

    <section class="agents-case-section">
      <header class="agents-case-section__heading">
        <div>
          <h2>
            {{
              activeTab === 'explore'
                ? '精选智能体场景'
                : `${scenarioTabs.find((tab) => tab.value === activeTab)?.label}案例`
            }}
          </h2>
          <p>选择一个场景直接开始，也可以进入智能体查看完整能力。</p>
        </div>
        <button type="button" @click="router.push('/agents/create')">
          <PlusOutlined />
          创建智能体
        </button>
      </header>

      <div class="agents-case-grid">
        <article
          v-for="item in visibleCases"
          :key="item.title"
          class="agents-case-card"
          @click="router.push(`/agents/${item.agentId}`)"
        >
          <div class="agents-case-card__visual">
            <GalleryArtwork :variant="item.variants[0] ?? 0" :title="item.title" />
            <span class="agents-case-card__sheet agents-case-card__sheet--back">
              <i v-for="line in 5" :key="line" />
            </span>
            <span class="agents-case-card__sheet agents-case-card__sheet--front">
              <b />
              <i v-for="line in 6" :key="line" />
              <em />
            </span>
          </div>

          <div class="agents-case-card__body">
            <span class="agents-case-card__category">
              <ReadOutlined />
              {{ item.category }}
            </span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <footer>
              <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </footer>
          </div>
        </article>
      </div>
    </section>

    <section class="agents-builder-banner">
      <div class="agents-builder-banner__mark">
        <BarChartOutlined />
      </div>
      <div>
        <span>搭建自己的智能工作流</span>
        <h2>把重复任务交给专属 Agent</h2>
        <p>组合提示词、知识库和工具能力，创建适合团队或个人使用的智能体。</p>
      </div>
      <button type="button" @click="router.push('/agents/create')">
        开始创建
        <ArrowUpOutlined />
      </button>
    </section>
  </div>
</template>

<style scoped>
.agents-hub {
  width: min(100%, 1220px);
  margin: 0 auto;
  padding: 10px 28px 42px;
  background: #fff;
}

.agents-hub__utility {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.agents-hub__utility > div {
  display: grid;
  gap: 3px;
}

.agents-hub__utility span {
  color: #252c37;
  font-size: 12px;
  font-weight: 800;
}

.agents-hub__utility small {
  color: #9aa2af;
  font-size: 10px;
}

.agents-hub__utility button,
.agents-case-section__heading > button,
.agents-builder-banner > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  font-weight: 750;
  cursor: pointer;
}

.agents-hub__utility button {
  height: 34px;
  padding: 0 12px;
  border: 1px solid #dfe4ec;
  background: #fff;
  color: #586273;
  font-size: 11px;
}

.agents-hero {
  position: relative;
  overflow: hidden;
  padding: 34px 12px 18px;
  border: 0;
  border-radius: 0;
  background: #fff;
}

.agents-hero::after {
  position: absolute;
  top: -150px;
  right: -96px;
  width: 330px;
  height: 330px;
  border: 46px solid rgb(94 142 255 / 5%);
  border-radius: 50%;
  content: '';
}

.agents-hero__heading,
.agents-prompt,
.agents-quick-modes {
  position: relative;
  z-index: 1;
}

.agents-hero__heading {
  text-align: center;
}

.agents-hero__heading h1 {
  margin: 0;
  color: #202632;
  font-size: 38px;
  font-weight: 880;
  letter-spacing: -0.035em;
}

.agents-hero__heading h1 em {
  color: #3f78ed;
  font-style: normal;
}

.agents-hero__heading p {
  margin: 10px 0 0;
  color: #7d8797;
  font-size: 12px;
}

.agents-prompt {
  max-width: 900px;
  margin: 18px auto 0;
  padding: 14px 15px 12px;
  border: 1px solid #d9e2f0;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 14px 38px rgb(54 81 124 / 9%);
}

.agents-prompt__field {
  display: grid;
  align-items: start;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
  color: #a1a9b6;
}

.agents-prompt__field :deep(svg) {
  margin-top: 4px;
  font-size: 14px;
}

.agents-prompt__field textarea {
  width: 100%;
  min-height: 74px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #343b48;
  font-size: 12px;
  line-height: 1.75;
  resize: none;
}

.agents-prompt__field textarea::placeholder {
  color: #a4abb7;
}

.agents-prompt__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 7px;
}

.agents-prompt__tools {
  display: flex;
  gap: 7px;
}

.agents-prompt__tools button,
.agents-prompt__submit {
  display: grid;
  place-items: center;
  border: 0;
  cursor: pointer;
}

.agents-prompt__tools button {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #f5f7fa;
  color: #737d8d;
}

.agents-prompt__submit {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3979ed;
  color: #fff;
  font-size: 14px;
}

.agents-prompt__submit:disabled {
  background: #d8dde5;
  cursor: not-allowed;
}

.agents-quick-modes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 10px;
}

.agents-quick-modes button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 6px;
  padding: 0 17px;
  border: 1px solid #dce3ec;
  border-radius: 999px;
  background: rgb(255 255 255 / 90%);
  color: #616b7b;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.agents-quick-modes button:hover {
  border-color: #b8cdf8;
  color: #3e72d8;
}

.agents-quick-modes :deep(svg) {
  color: #4f7de0;
}

.agents-scenarios {
  display: flex;
  overflow-x: auto;
  gap: 6px;
  margin: 12px 0 16px;
  padding: 6px;
  border: 1px solid #e5e9f0;
  border-radius: 11px;
  background: #fff;
  scrollbar-width: none;
}

.agents-scenarios::-webkit-scrollbar {
  display: none;
}

.agents-scenarios button {
  min-width: max-content;
  height: 34px;
  padding: 0 16px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #677181;
  font-size: 11px;
  font-weight: 720;
  cursor: pointer;
}

.agents-scenarios button.active {
  background: #edf4ff;
  color: #3973df;
}

.agents-case-section {
  padding: 6px 0 18px;
  border: 0;
  border-radius: 0;
  background: #fff;
}

.agents-case-section__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 15px;
}

.agents-case-section__heading h2 {
  margin: 0;
  color: #252b35;
  font-size: 18px;
}

.agents-case-section__heading p {
  margin: 5px 0 0;
  color: #8e97a4;
  font-size: 10px;
}

.agents-case-section__heading > button {
  height: 34px;
  padding: 0 13px;
  border: 0;
  background: #3979ed;
  color: #fff;
  font-size: 11px;
}

.agents-case-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agents-case-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.agents-case-card:hover {
  border-color: #bfd0ee;
  box-shadow: 0 12px 26px rgb(43 73 123 / 9%);
  transform: translateY(-2px);
}

.agents-case-card__visual {
  position: relative;
  height: 118px;
  overflow: hidden;
  background: #eef3f9;
}

.agents-case-card__visual > :deep(.gallery-artwork) {
  position: absolute;
  inset: 0;
  opacity: 0.34;
}

.agents-case-card__sheet {
  position: absolute;
  display: grid;
  align-content: start;
  gap: 5px;
  padding: 10px;
  border: 1px solid #e2e6ec;
  border-radius: 5px;
  background: rgb(255 255 255 / 95%);
  box-shadow: 0 8px 20px rgb(43 57 80 / 10%);
}

.agents-case-card__sheet--back {
  top: 16px;
  right: 20px;
  width: 42%;
  height: 86px;
  opacity: 0.7;
  transform: rotate(4deg);
}

.agents-case-card__sheet--front {
  top: 20px;
  right: 35px;
  width: 48%;
  height: 92px;
}

.agents-case-card__sheet i {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: #dce2e9;
}

.agents-case-card__sheet i:nth-child(2n) {
  width: 72%;
}

.agents-case-card__sheet b {
  display: block;
  width: 58%;
  height: 7px;
  border-radius: 999px;
  background: #9cb8e5;
}

.agents-case-card__sheet em {
  display: block;
  height: 20px;
  border-radius: 4px;
  background: #eaf1fb;
}

.agents-case-card__body {
  padding: 13px;
}

.agents-case-card__category {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #4e79ce;
  font-size: 9px;
  font-weight: 780;
}

.agents-case-card__category :deep(svg) {
  font-size: 10px;
}

.agents-case-card h3 {
  min-height: 36px;
  margin: 8px 0 0;
  color: #2b313b;
  font-size: 13px;
  line-height: 1.45;
}

.agents-case-card p {
  min-height: 34px;
  margin: 6px 0 0;
  color: #858e9b;
  font-size: 9px;
  line-height: 1.65;
}

.agents-case-card footer {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 10px;
}

.agents-case-card footer span {
  padding: 3px 6px;
  border-radius: 5px;
  background: #f2f4f7;
  color: #727c8a;
  font-size: 8px;
}

.agents-custom-section {
  margin: 8px 0 18px;
  padding: 17px;
  border: 1px solid #dce7fa;
  border-radius: 12px;
  background: #f8fbff;
}

.agents-custom-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.agents-custom-card {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 4px 10px;
  grid-template-columns: 38px minmax(0, 1fr);
  padding: 12px;
  border: 1px solid #e1e8f3;
  border-radius: 9px;
  background: #fff;
  color: #303844;
  text-align: left;
  cursor: pointer;
}

.agents-custom-card:hover {
  border-color: #b9cfef;
  box-shadow: 0 9px 22px rgb(43 73 123 / 8%);
}

.agents-custom-card > span:first-child {
  display: grid;
  width: 38px;
  height: 38px;
  grid-row: span 2;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 850;
}

.agents-custom-card > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.agents-custom-card strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agents-custom-card small {
  overflow: hidden;
  color: #818b99;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agents-custom-card em {
  overflow: hidden;
  grid-column: 2;
  color: #5580cf;
  font-size: 8px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agents-builder-banner {
  display: grid;
  align-items: center;
  gap: 16px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-top: 8px;
  padding: 20px 22px;
  border: 1px solid #dce7fa;
  border-radius: 13px;
  background: #f6f9ff;
}

.agents-builder-banner__mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 12px;
  background: #3979ed;
  color: #fff;
  font-size: 19px;
}

.agents-builder-banner span {
  color: #4a78d5;
  font-size: 9px;
  font-weight: 800;
}

.agents-builder-banner h2 {
  margin: 4px 0 0;
  color: #27303c;
  font-size: 17px;
}

.agents-builder-banner p {
  margin: 5px 0 0;
  color: #858f9d;
  font-size: 10px;
}

.agents-builder-banner > button {
  height: 36px;
  padding: 0 15px;
  border: 0;
  background: #3979ed;
  color: #fff;
  font-size: 11px;
}

.agents-builder-banner > button :deep(svg) {
  transform: rotate(45deg);
}

@media (max-width: 1100px) {
  .agents-case-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agents-custom-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .agents-hub {
    padding: 10px 12px 30px;
  }

  .agents-hub__utility {
    min-height: 42px;
  }

  .agents-hero {
    padding: 24px 4px 14px;
  }

  .agents-hero__heading h1 {
    font-size: 28px;
  }

  .agents-hero__heading p {
    line-height: 1.65;
  }

  .agents-prompt {
    margin-top: 18px;
  }

  .agents-quick-modes {
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .agents-quick-modes::-webkit-scrollbar {
    display: none;
  }

  .agents-quick-modes button {
    min-width: max-content;
  }

  .agents-case-section {
    padding: 14px;
  }

  .agents-case-section__heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .agents-case-grid {
    grid-template-columns: 1fr;
  }

  .agents-custom-grid {
    grid-template-columns: 1fr;
  }

  .agents-builder-banner {
    align-items: start;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .agents-builder-banner > button {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
