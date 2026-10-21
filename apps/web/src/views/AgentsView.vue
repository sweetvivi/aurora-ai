<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CodeOutlined,
  CoffeeOutlined,
  EditOutlined,
  FileTextOutlined,
  HighlightOutlined,
  HistoryOutlined,
  LayoutOutlined,
  LeftOutlined,
  MessageOutlined,
  PictureOutlined,
  PlusOutlined,
  ReadOutlined,
  RightOutlined,
  RobotOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SoundOutlined,
  StarFilled,
  StarOutlined,
  TeamOutlined,
  ThunderboltFilled,
  TranslationOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { agentCatalog, type AgentCatalogItem } from '@/data/agents';
import { useAgentWorkspaceStore, type AgentSession } from '@/stores/agent-workspace';

type CatalogTab = 'created' | 'favorites' | 'official';

interface CategoryItem {
  count: number;
  icon: Component;
  label: string;
}

interface LandingTemplate {
  id: string;
  prompt: string;
  targetId: string;
  title: string;
}

const router = useRouter();
const workspace = useAgentWorkspaceStore();
const activeTab = ref<CatalogTab>('official');
const selectedCategory = ref('全部');
const search = ref('');
const currentPage = ref(1);
const catalogOpen = ref(true);
const historyOpen = ref(false);
const historyQuery = ref('');
const landingPrompt = ref('');
const landingCategory = ref('探索');
const resultsHeading = ref<HTMLElement | null>(null);
const pageSize = 24;

const hotSearches = ['AI写作助手', '代码生成器', '数据分析', '图像处理', '翻译助手'];
const landingTabs = [
  '探索',
  '做报告',
  '写文档',
  '简历制作',
  '自媒体创作',
  '市场调研',
  '教学设计',
  '学习研究',
  '营销策划',
  '做播客',
];

const landingTaskTypes: { icon: Component; label: string; prompt: string; targetId: string }[] = [
  {
    icon: EditOutlined,
    label: '写作',
    prompt: '帮我完成一份结构清晰、可以直接使用的写作任务。',
    targetId: 'document-editor',
  },
  {
    icon: LayoutOutlined,
    label: 'PPT',
    prompt: '帮我规划一份演示文稿的大纲、每页要点和讲述顺序。',
    targetId: 'official-05-0001',
  },
  {
    icon: HighlightOutlined,
    label: '设计',
    prompt: '帮我梳理视觉方向，并生成一套可执行的创意方案。',
    targetId: 'brand-designer',
  },
  {
    icon: BarChartOutlined,
    label: 'Excel',
    prompt: '帮我设计数据指标、表格结构、公式和分析步骤。',
    targetId: 'data-analyst',
  },
  {
    icon: SearchOutlined,
    label: '网页',
    prompt: '帮我规划一个网页或轻量应用的信息架构和交互流程。',
    targetId: 'product-designer',
  },
];

const landingAgentMap: Record<string, string[]> = {
  探索: [
    'code-mentor',
    'document-editor',
    'study-planner',
    'visual-prompt',
    'growth-copywriter',
    'meeting-notes',
    'brand-designer',
    'data-analyst',
  ],
  做报告: [
    'research-scout',
    'data-analyst',
    'document-editor',
    'official-05-0001',
    'official-06-0001',
    'official-10-0001',
    'product-reviewer',
    'product-designer',
  ],
  写文档: [
    'document-editor',
    'meeting-notes',
    'professional-translator',
    'growth-copywriter',
    'official-05-0001',
    'official-11-0001',
    'general-assistant',
    'legal-writing-coach',
  ],
  简历制作: [
    'career-copywriter',
    'document-editor',
    'professional-translator',
    'official-12-0001',
    'official-14-0001',
    'official-05-0001',
    'general-assistant',
    'social-media-editor',
  ],
  自媒体创作: [
    'growth-copywriter',
    'social-media-editor',
    'visual-prompt',
    'official-15-0001',
    'official-09-0001',
    'official-03-0001',
    'story-world-builder',
    'brand-designer',
  ],
  市场调研: [
    'research-scout',
    'data-analyst',
    'product-reviewer',
    'product-designer',
    'official-07-0001',
    'official-17-0001',
    'research-mentor',
    'legal-writing-coach',
  ],
  教学设计: [
    'classroom-designer',
    'study-planner',
    'research-mentor',
    'official-01-0001',
    'official-02-0001',
    'official-10-0001',
    'professional-translator',
    'document-editor',
  ],
  学习研究: [
    'study-planner',
    'research-mentor',
    'code-mentor',
    'research-scout',
    'official-10-0001',
    'official-01-0001',
    'professional-translator',
    'icpc-coach',
  ],
  营销策划: [
    'growth-copywriter',
    'brand-designer',
    'data-analyst',
    'social-media-editor',
    'official-09-0001',
    'official-17-0001',
    'story-world-builder',
    'product-designer',
  ],
  做播客: [
    'social-media-editor',
    'growth-copywriter',
    'research-scout',
    'document-editor',
    'official-15-0001',
    'official-09-0001',
    'story-world-builder',
    'professional-translator',
  ],
};

const landingTemplateCatalog: Record<string, LandingTemplate[]> = {
  探索: [
    {
      id: 'weekend-guide',
      prompt: '制作一份城市青年周末微度假图文指南，包含路线、预算、拍照点和注意事项。',
      targetId: 'social-media-editor',
      title: '城市青年周末微度假图文指南',
    },
    {
      id: 'sci-fi-romance',
      prompt: '创作一部未来科技小说，融合爽文节奏和浪漫情感线。',
      targetId: 'story-world-builder',
      title: '未来科技小说融合爽文言情',
    },
    {
      id: 'diet-copy',
      prompt: '写一篇减肥饮食干货文案，并给出可直接执行的食谱结构。',
      targetId: 'growth-copywriter',
      title: '写减肥饮食干货文案引领食谱',
    },
    {
      id: 'appliance-marketing',
      prompt: '为数码家电达人设计一套营销方案，包含内容选题、节奏和转化路径。',
      targetId: 'growth-copywriter',
      title: '数码家电达人营销方案设计',
    },
    {
      id: 'study-note',
      prompt: '创作一篇学习方法对比小红书笔记，突出真实体验和可执行建议。',
      targetId: 'social-media-editor',
      title: '创作学习方法对比小红书笔记',
    },
    {
      id: 'breakfast-note',
      prompt: '写一篇30元一周早餐小红书笔记，包含采购清单、做法和配图建议。',
      targetId: 'social-media-editor',
      title: '写30元一周早餐小红书笔记',
    },
    {
      id: 'office-software-research',
      prompt: '调研2025年职场新人对办公软件的需求，并输出结构化研究报告。',
      targetId: 'research-scout',
      title: '2025 年职场新人办公软件需求调研',
    },
    {
      id: 'home-robot-research',
      prompt: '调研家用智能机器人市场，整理主要产品、用户需求和竞争格局。',
      targetId: 'research-scout',
      title: '家用智能机器人市场调研',
    },
    {
      id: 'fitness-market-research',
      prompt: '整理2021-2025线上健身市场数据，形成趋势、竞争和机会分析。',
      targetId: 'data-analyst',
      title: '2021-2025线上健身市场调研',
    },
    {
      id: 'senior-care-opportunity',
      prompt: '调研智能化养老服务市场机遇，输出结论、证据和商业建议。',
      targetId: 'research-scout',
      title: '调研智能化养老服务市场机遇',
    },
    {
      id: 'douyin-ai-monetization',
      prompt: '调研抖音AI赛道博主变现方式，比较门槛、收益和可复制性。',
      targetId: 'research-scout',
      title: '抖音AI赛道博主变现调研',
    },
    {
      id: 'xiaohongshu-trend-web',
      prompt: '调研小红书热点赛道，并将调研结果制作成一个可浏览网页。',
      targetId: 'product-designer',
      title: '小红书热点赛道调研及网页制作',
    },
    {
      id: 'guochao-apparel',
      prompt: '完成国潮服装市场调研与报告，包含用户画像、产品和渠道分析。',
      targetId: 'research-scout',
      title: '国潮服装市场调研与报告',
    },
    {
      id: 'metaverse-consumption',
      prompt: '调研元宇宙消费模式，并整理市场机会、风险和案例。',
      targetId: 'research-scout',
      title: '元宇宙消费模式调研及报告',
    },
    {
      id: 'trend-toy-web',
      prompt: '撰写中国潮玩市场调研报告，并制作配套的专题网页。',
      targetId: 'product-designer',
      title: '撰写中国潮玩市场调研报告并制网页',
    },
    {
      id: 'duolingo-analysis',
      prompt: '完成多邻国深度分析，并输出结构清晰、证据完整的研究报告。',
      targetId: 'product-reviewer',
      title: '多邻国深度分析结构化报告',
    },
    {
      id: 'trigonometry-summary',
      prompt: '撰写高中三角函数教学总结，梳理重点、难点和典型例题。',
      targetId: 'classroom-designer',
      title: '高中三角函数教学总结撰写',
    },
    {
      id: 'onboarding-plan',
      prompt: '规划一份新员工入职培训方案，包含课程、导师和验收机制。',
      targetId: 'document-editor',
      title: '规划新员工入职培训方案',
    },
  ],
  做报告: [
    {
      id: 'industry-report',
      prompt: '围绕指定行业完成一份可交付的市场研究报告。',
      targetId: 'research-scout',
      title: '行业趋势与竞争格局研究报告',
    },
    {
      id: 'user-insight-report',
      prompt: '整理用户访谈和问卷信息，输出用户洞察报告。',
      targetId: 'data-analyst',
      title: '用户需求洞察与画像分析报告',
    },
    {
      id: 'weekly-report',
      prompt: '把本周工作记录整理成结构清晰的管理周报。',
      targetId: 'document-editor',
      title: '项目进展与风险汇报周报',
    },
    {
      id: 'competitor-teardown',
      prompt: '分析主要竞品的功能、定位、增长策略和差异化机会。',
      targetId: 'product-reviewer',
      title: '核心竞品深度拆解分析',
    },
    {
      id: 'ppt-outline',
      prompt: '根据主题生成一份完整演示文稿大纲和逐页内容。',
      targetId: 'official-05-0001',
      title: '商业汇报 PPT 大纲与讲稿',
    },
  ],
  写文档: [
    {
      id: 'product-prd',
      prompt: '撰写一份完整的产品需求文档，覆盖目标、流程、规则和验收标准。',
      targetId: 'document-editor',
      title: '产品需求文档与验收标准',
    },
    {
      id: 'meeting-minutes',
      prompt: '把会议记录整理为结论、负责人、截止时间和风险清单。',
      targetId: 'meeting-notes',
      title: '会议纪要、行动项与风险清单',
    },
    {
      id: 'project-plan',
      prompt: '制定一份项目执行计划，包含里程碑、依赖、人员和风险预案。',
      targetId: 'document-editor',
      title: '项目执行计划与里程碑安排',
    },
    {
      id: 'policy-writing',
      prompt: '起草一份规范、清晰、可直接发布的内部制度文档。',
      targetId: 'legal-writing-coach',
      title: '企业制度与流程规范文档',
    },
  ],
  简历制作: [
    {
      id: 'resume-optimize',
      prompt: '根据目标岗位优化简历，强化成果、量化指标和岗位匹配度。',
      targetId: 'career-copywriter',
      title: '目标岗位简历优化与亮点提炼',
    },
    {
      id: 'interview-plan',
      prompt: '生成面试准备清单、常见问题和针对性回答框架。',
      targetId: 'career-copywriter',
      title: '面试问题预测与回答框架',
    },
    {
      id: 'career-switch',
      prompt: '分析转岗可行性，并制定能力补齐和求职行动方案。',
      targetId: 'career-copywriter',
      title: '跨行业转岗求职行动方案',
    },
  ],
  自媒体创作: [
    {
      id: 'xiaohongshu-series',
      prompt: '围绕垂直主题规划一个月的小红书内容选题和发布节奏。',
      targetId: 'social-media-editor',
      title: '小红书月度选题与发布计划',
    },
    {
      id: 'short-video-script',
      prompt: '创作一条短视频脚本，包含钩子、分镜、口播和行动号召。',
      targetId: 'social-media-editor',
      title: '爆款短视频脚本与分镜设计',
    },
    {
      id: 'account-positioning',
      prompt: '梳理账号定位、受众、内容支柱和差异化表达方式。',
      targetId: 'growth-copywriter',
      title: '个人账号定位与内容策略',
    },
    {
      id: 'hot-topic-plan',
      prompt: '结合近期热点策划一组可连续发布的内容选题。',
      targetId: 'growth-copywriter',
      title: '热点借势内容选题策划',
    },
  ],
  市场调研: [
    {
      id: 'market-entry',
      prompt: '评估目标市场进入机会，分析规模、竞争、渠道和风险。',
      targetId: 'research-scout',
      title: '新市场进入机会调研',
    },
    {
      id: 'consumer-survey',
      prompt: '设计消费者调研问卷，并输出分析框架和关键结论模板。',
      targetId: 'data-analyst',
      title: '消费者需求调研与分析',
    },
    {
      id: 'pricing-research',
      prompt: '分析竞品价格、价值锚点和用户支付意愿，形成定价建议。',
      targetId: 'data-analyst',
      title: '竞品价格与用户支付意愿调研',
    },
  ],
  教学设计: [
    {
      id: 'lesson-plan',
      prompt: '围绕教学目标设计一节课的完整教案和课堂活动。',
      targetId: 'classroom-designer',
      title: '单节课教学设计与课堂活动',
    },
    {
      id: 'training-plan',
      prompt: '设计一套企业培训方案，包含课程、练习、考核和反馈机制。',
      targetId: 'classroom-designer',
      title: '企业培训课程与考核方案',
    },
    {
      id: 'study-assessment',
      prompt: '根据知识点设计分层练习、评测题和学习反馈方案。',
      targetId: 'study-planner',
      title: '分层练习与学习效果评估',
    },
  ],
  学习研究: [
    {
      id: 'study-roadmap',
      prompt: '根据目标制定可执行的学习路线、阶段任务和复盘节奏。',
      targetId: 'study-planner',
      title: '系统学习路线与阶段计划',
    },
    {
      id: 'paper-reading',
      prompt: '提炼论文的核心问题、方法、实验、结论和局限。',
      targetId: 'research-mentor',
      title: '论文精读与核心观点提炼',
    },
    {
      id: 'knowledge-map',
      prompt: '把复杂知识整理成结构清晰、便于复习的知识图谱。',
      targetId: 'research-mentor',
      title: '复杂知识图谱与复习提纲',
    },
  ],
  营销策划: [
    {
      id: 'campaign-plan',
      prompt: '制定完整营销活动方案，包含目标、人群、创意、渠道和预算。',
      targetId: 'growth-copywriter',
      title: '整合营销活动全案策划',
    },
    {
      id: 'brand-positioning',
      prompt: '梳理品牌定位、核心价值、传播主张和视觉方向。',
      targetId: 'brand-designer',
      title: '品牌定位与传播策略',
    },
    {
      id: 'launch-plan',
      prompt: '为新产品制定上市节奏、传播内容和效果复盘指标。',
      targetId: 'growth-copywriter',
      title: '新产品上市推广计划',
    },
  ],
  做播客: [
    {
      id: 'podcast-outline',
      prompt: '围绕主题设计一期播客的节目结构、问题和嘉宾提纲。',
      targetId: 'social-media-editor',
      title: '播客单期提纲与访谈问题',
    },
    {
      id: 'podcast-series',
      prompt: '规划一季播客的定位、选题、嘉宾和更新节奏。',
      targetId: 'social-media-editor',
      title: '播客栏目策划与选题排期',
    },
    {
      id: 'podcast-copy',
      prompt: '撰写节目标题、简介、shownotes 和多平台推广文案。',
      targetId: 'growth-copywriter',
      title: '播客节目文案与多平台推广',
    },
  ],
};

const catalogById = new Map(
  [...agentCatalog, ...workspace.customAgents].map((agent) => [agent.id, agent]),
);

const categoryDefinitions: { icon: Component; label: string }[] = [
  { icon: ReadOutlined, label: 'AI教育' },
  { icon: ReadOutlined, label: '教育与培训' },
  { icon: PictureOutlined, label: 'AI视觉创作' },
  { icon: HighlightOutlined, label: '图形与图像处理' },
  { icon: FileTextOutlined, label: '办公文档生成' },
  { icon: BarChartOutlined, label: '数据计算与分析' },
  { icon: SearchOutlined, label: '知识检索与信息获取' },
  { icon: CodeOutlined, label: '编程与软件开发' },
  { icon: BulbOutlined, label: '创意营销与内容策划' },
  { icon: ReadOutlined, label: '学术与研究辅助' },
  { icon: TranslationOutlined, label: '语言与文字处理' },
  { icon: TeamOutlined, label: '商务与运营支持' },
  { icon: CoffeeOutlined, label: '生活与娱乐' },
  { icon: LayoutOutlined, label: '产品与UI设计' },
  { icon: SoundOutlined, label: '媒体与传播' },
  { icon: AppstoreOutlined, label: '综合工具（多模态）' },
  { icon: ShoppingCartOutlined, label: 'AI电商' },
  { icon: PictureOutlined, label: 'AI图片' },
  { icon: UserOutlined, label: '我的智能体' },
];

const tabs: { icon: Component; label: string; value: CatalogTab }[] = [
  { icon: StarFilled, label: '官方智能体', value: 'official' },
  { icon: UserOutlined, label: '我创建的', value: 'created' },
  { icon: StarOutlined, label: '我收藏的', value: 'favorites' },
];

const activeCollection = computed<AgentCatalogItem[]>(() => {
  if (activeTab.value === 'created') {
    return workspace.customAgents;
  }

  if (activeTab.value === 'favorites') {
    return [...agentCatalog, ...workspace.customAgents].filter((agent) =>
      workspace.favoriteAgentIds.includes(agent.id),
    );
  }

  return agentCatalog;
});

const categories = computed<CategoryItem[]>(() => {
  const countByCategory = new Map<string, number>();

  for (const agent of activeCollection.value) {
    countByCategory.set(agent.category, (countByCategory.get(agent.category) ?? 0) + 1);
  }

  return categoryDefinitions
    .filter((category) => (countByCategory.get(category.label) ?? 0) > 0)
    .map((category) => ({
      ...category,
      count: countByCategory.get(category.label) ?? 0,
    }));
});

const filteredAgents = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return activeCollection.value.filter((agent) => {
    const matchesCategory =
      selectedCategory.value === '全部' || agent.category === selectedCategory.value;

    if (!matchesCategory) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [agent.name, agent.description, agent.tags.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAgents.value.length / pageSize)));

const visibleAgents = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredAgents.value.slice(start, start + pageSize);
});

const landingAgents = computed(() =>
  (landingAgentMap[landingCategory.value] ?? landingAgentMap['探索'] ?? [])
    .map((id) => catalogById.get(id))
    .filter((agent): agent is AgentCatalogItem => Boolean(agent)),
);

const visibleLandingTemplates = computed<LandingTemplate[]>(() => {
  const configured = landingTemplateCatalog[landingCategory.value];

  if (configured?.length) {
    return configured;
  }

  return landingAgents.value.map((agent) => ({
    id: `${landingCategory.value}-${agent.id}`,
    prompt: `使用${agent.name}完成一个${landingCategory.value}任务。`,
    targetId: agent.id,
    title: `${landingCategory.value}：${agent.name}`,
  }));
});

const visibleHistorySessions = computed(() => {
  const query = historyQuery.value.trim().toLowerCase();

  return workspace.sessions
    .filter((session) => {
      const agent = catalogById.get(session.agentId);
      const searchable = [session.title, agent?.name ?? '', agent?.category ?? '']
        .join(' ')
        .toLowerCase();

      return !query || searchable.includes(query);
    })
    .sort((left, right) => right.updatedAt - left.updatedAt);
});

const historyGroups = computed(() => {
  const groups = new Map<string, AgentSession[]>();

  for (const session of visibleHistorySessions.value) {
    const label = historyGroupLabel(session.updatedAt);
    const items = groups.get(label) ?? [];
    items.push(session);
    groups.set(label, items);
  }

  return [...groups.entries()].map(([label, items]) => ({ items, label }));
});

const paginationItems = computed<Array<number | 'left-ellipsis' | 'right-ellipsis'>>(() => {
  const pages = totalPages.value;

  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  const items: Array<number | 'left-ellipsis' | 'right-ellipsis'> = [1];
  const start = Math.max(2, currentPage.value - 1);
  const end = Math.min(pages - 1, currentPage.value + 1);

  if (start > 2) {
    items.push('left-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < pages - 1) {
    items.push('right-ellipsis');
  }

  items.push(pages);
  return items;
});

const collectionLabel = computed(() => {
  if (activeTab.value === 'created') {
    return '我创建的智能体';
  }

  if (activeTab.value === 'favorites') {
    return '我收藏的智能体';
  }

  return '全部智能体';
});

const emptyTitle = computed(() => {
  if (search.value.trim()) {
    return '没有找到匹配的智能体';
  }

  if (activeTab.value === 'created') {
    return '还没有创建智能体';
  }

  if (activeTab.value === 'favorites') {
    return '还没有收藏智能体';
  }

  return '当前分类暂无智能体';
});

watch([activeTab, selectedCategory, search], () => {
  currentPage.value = 1;
});

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});

onMounted(() => {
  void workspace.initialize();
});

function openAgent(agentId: string): void {
  void router.push(`/agents/${agentId}`);
}

function resolveLandingTarget(prompt: string): AgentCatalogItem | undefined {
  const normalized = prompt.toLowerCase();
  const keywordTargets: Array<{ keywords: string[]; targetId: string }> = [
    { keywords: ['代码', '编程', '开发', 'bug', '接口'], targetId: 'code-mentor' },
    { keywords: ['ppt', '演示', '汇报', '幻灯片'], targetId: 'official-05-0001' },
    { keywords: ['excel', '表格', '公式', '数据', '指标'], targetId: 'data-analyst' },
    { keywords: ['简历', '求职', '面试', '竞聘'], targetId: 'career-copywriter' },
    { keywords: ['网页', '网站', 'app', '应用', '产品'], targetId: 'product-designer' },
    { keywords: ['海报', '设计', '视觉', '图片', '插画'], targetId: 'visual-prompt' },
    { keywords: ['视频', '脚本', '自媒体', '播客', '直播'], targetId: 'social-media-editor' },
    { keywords: ['学习', '课程', '教学', '考试'], targetId: 'study-planner' },
    { keywords: ['调研', '研究', '资料', '文献'], targetId: 'research-scout' },
    { keywords: ['营销', '文案', '推广', '品牌'], targetId: 'growth-copywriter' },
    { keywords: ['文档', '报告', '纪要', '总结'], targetId: 'document-editor' },
  ];
  const matchedTarget = keywordTargets.find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword)),
  )?.targetId;

  if (matchedTarget) {
    const catalogTarget = agentCatalog.find((agent) => agent.id === matchedTarget);

    if (catalogTarget) {
      return catalogTarget;
    }
  }

  return landingAgents.value[0] ?? agentCatalog[0];
}

function startLandingPrompt(): void {
  const prompt = landingPrompt.value.trim();
  const target = resolveLandingTarget(prompt);

  if (!target) {
    return;
  }

  void router.push({
    path: `/agents/${target.id}`,
    query: prompt
      ? {
          prompt,
        }
      : undefined,
  });
}

function openLandingTask(targetId: string, prompt: string): void {
  openLandingAgent(targetId, prompt);
}

function openLandingTemplate(template: LandingTemplate): void {
  openLandingAgent(template.targetId, template.prompt);
}

function openLandingAgent(agentId: string, prompt?: string): void {
  void router.push({
    path: `/agents/${agentId}`,
    query: prompt
      ? {
          prompt,
        }
      : undefined,
  });
}

function openAgentSession(session: AgentSession): void {
  historyOpen.value = false;
  void router.push({
    path: `/agents/${session.agentId}`,
    query: {
      session: session.id,
    },
  });
}

function agentForSession(session: AgentSession): AgentCatalogItem | undefined {
  return [...agentCatalog, ...workspace.customAgents].find((agent) => agent.id === session.agentId);
}

function historyGroupLabel(timestamp: number): string {
  const target = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday) {
    return '今天';
  }

  if (timestamp >= startOfYesterday) {
    return '昨天';
  }

  return `${target.getMonth() + 1} 月 ${target.getDate()} 日`;
}

function formatHistoryTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function sessionPreview(session: AgentSession): string {
  const lastMessage = session.messages[session.messages.length - 1];

  if (!lastMessage?.content.trim()) {
    return '尚未开始对话';
  }

  return lastMessage.content.replace(/\s+/g, ' ').trim();
}

function openHistory(): void {
  historyOpen.value = true;
  void workspace.initialize();
}

function openCatalog(): void {
  catalogOpen.value = true;
  activeTab.value = 'official';
  void nextTick(() => {
    resultsHeading.value?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

function editAgent(agentId: string): void {
  void router.push({
    path: '/agents/create',
    query: {
      edit: agentId,
    },
  });
}

function toggleFavorite(agentId: string): void {
  workspace.toggleFavorite(agentId);
}

function applyHotSearch(keyword: string): void {
  search.value = keyword;
  activeTab.value = 'official';
  selectedCategory.value = '全部';
}

function goToPage(page: number): void {
  currentPage.value = Math.min(totalPages.value, Math.max(1, page));
  void nextTick(() => {
    resultsHeading.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
</script>

<template>
  <div class="agents-catalog-page">
    <section class="agent-home">
      <button class="agent-home__history" type="button" @click="openHistory">
        <HistoryOutlined />
        <span>历史记录</span>
      </button>

      <header class="agent-home__heading">
        <h1>超级智能体，创建你的 APP 或助手</h1>
        <p>释放 AI 的潜能，通过自定义模型、提示词和界面，打造属于你的智能应用。</p>
      </header>

      <section class="agent-home__builders" aria-label="智能体创建方式">
        <article class="agent-builder-card agent-builder-card--primary">
          <div class="agent-builder-preview" aria-hidden="true">
            <div class="agent-builder-preview__window">
              <span class="agent-builder-preview__eyebrow">智能体提示词（Prompt）</span>
              <i />
              <i />
              <i />
              <button type="button" tabindex="-1">AI 优化提示词</button>
            </div>
          </div>
          <div class="agent-builder-card__copy">
            <span>创建智能体</span>
            <h2>适用于轻量灵活、自然语言驱动的场景</h2>
            <ul>
              <li>支持自定义界面</li>
              <li>多模型选择</li>
            </ul>
            <button type="button" @click="router.push('/agents/create')">
              <PlusOutlined />
              立即创建
            </button>
          </div>
        </article>

        <article class="agent-builder-card agent-builder-card--soon">
          <div class="agent-builder-preview agent-builder-preview--graph" aria-hidden="true">
            <span class="agent-builder-preview__node agent-builder-preview__node--start">开始</span>
            <span class="agent-builder-preview__node">规划</span>
            <span class="agent-builder-preview__node">执行</span>
            <span class="agent-builder-preview__node">汇总</span>
            <i class="agent-builder-preview__line agent-builder-preview__line--one" />
            <i class="agent-builder-preview__line agent-builder-preview__line--two" />
            <i class="agent-builder-preview__line agent-builder-preview__line--three" />
          </div>
          <div class="agent-builder-card__copy">
            <span>创建多智能体蜂群</span>
            <h2>适用于多个工具或智能体联动的场景</h2>
            <ul>
              <li>任务自动拆解</li>
              <li>多角色协同执行</li>
            </ul>
            <button type="button" class="agent-builder-card__soon-button" disabled>
              <ClockCircleOutlined />
              敬请期待
            </button>
          </div>
        </article>
      </section>
    </section>

    <section class="agent-home agent-home--quickstart">
      <div class="agent-home__quick-label">
        <span>快速开始</span>
        <i />
      </div>

      <nav class="agent-home__tasks" aria-label="智能体任务类型">
        <button
          v-for="item in landingTaskTypes"
          :key="item.label"
          type="button"
          @click="openLandingTask(item.targetId, item.prompt)"
        >
          <component :is="item.icon" />
          {{ item.label }}
        </button>
      </nav>

      <form class="agent-home__composer" @submit.prevent="startLandingPrompt">
        <textarea
          v-model="landingPrompt"
          aria-label="描述你希望智能体完成的任务"
          placeholder="输入你的需求（如研究一个主题、制作旅行攻略、PPT 等），生成可视化网页、APP、数据报告。"
        />
        <footer>
          <span class="agent-home__tools" aria-hidden="true">
            <i />
            <i />
          </span>
          <button type="submit" aria-label="开始任务">
            <ArrowRightOutlined />
          </button>
        </footer>
      </form>

      <nav class="agent-home__tabs" aria-label="智能体场景">
        <button
          v-for="tab in landingTabs"
          :key="tab"
          type="button"
          :class="{ active: landingCategory === tab }"
          @click="landingCategory = tab"
        >
          {{ tab }}
        </button>
      </nav>
    </section>

    <section class="agent-showcase">
      <header class="agent-showcase__heading">
        <strong class="agent-showcase__sr-title">
          {{ landingCategory === '探索' ? '选择一个助手开始' : `${landingCategory} · 推荐助手` }}
        </strong>
        <button type="button" @click="openCatalog">
          全部智能体
          <ArrowRightOutlined />
        </button>
      </header>

      <div class="agent-showcase__grid">
        <article
          v-for="(template, index) in visibleLandingTemplates"
          :key="template.id"
          class="agent-showcase-card"
          tabindex="0"
          @click="openLandingTemplate(template)"
          @keydown.enter="openLandingTemplate(template)"
        >
          <div class="agent-showcase-card__copy">
            <strong>{{ template.title }}</strong>
            <button type="button" @click.stop="openLandingTemplate(template)">
              做同款
              <ArrowRightOutlined />
            </button>
          </div>
          <div
            class="agent-showcase-card__preview"
            :class="`agent-showcase-card__preview--${index % 6}`"
            aria-hidden="true"
          >
            <div class="agent-template-preview">
              <header>
                <i />
                <span />
                <em />
              </header>
              <div class="agent-template-preview__hero">
                <span />
                <i />
              </div>
              <div class="agent-template-preview__columns">
                <span />
                <span />
                <span />
              </div>
              <div class="agent-template-preview__chart">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="catalogOpen" class="agents-catalog agents-catalog--expanded">
      <header class="agents-catalog__toolbar">
        <nav class="agents-tabs" aria-label="智能体资源库">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            <component :is="tab.icon" />
            {{ tab.label }}
            <span v-if="tab.value === 'created' && workspace.customAgents.length">
              {{ workspace.customAgents.length }}
            </span>
            <span v-if="tab.value === 'favorites' && workspace.favoriteAgentIds.length">
              {{ workspace.favoriteAgentIds.length }}
            </span>
          </button>
        </nav>

        <label class="agents-search">
          <SearchOutlined />
          <input v-model="search" placeholder="搜索智能体..." />
          <kbd>Ctrl K</kbd>
        </label>

        <button class="agents-mobile-create" type="button" @click="router.push('/agents/create')">
          <PlusOutlined />
          创建智能体
        </button>

        <div class="agents-hot-search">
          <span>热门搜索：</span>
          <button
            v-for="keyword in hotSearches"
            :key="keyword"
            type="button"
            @click="applyHotSearch(keyword)"
          >
            {{ keyword }}
          </button>
        </div>
      </header>

      <div class="agents-catalog__body">
        <aside class="agents-categories">
          <header>
            <strong>分类</strong>
            <span>{{ activeCollection.length }}</span>
          </header>
          <nav aria-label="智能体分类">
            <button
              type="button"
              :class="{ active: selectedCategory === '全部' }"
              @click="selectedCategory = '全部'"
            >
              <span>
                <AppstoreOutlined />
                全部
              </span>
              <em>{{ activeCollection.length }}</em>
            </button>
            <button
              v-for="category in categories"
              :key="category.label"
              type="button"
              :class="{ active: selectedCategory === category.label }"
              @click="selectedCategory = category.label"
            >
              <span>
                <component :is="category.icon" />
                {{ category.label }}
              </span>
              <em>{{ category.count }}</em>
            </button>
          </nav>
        </aside>

        <main class="agents-results">
          <header ref="resultsHeading" class="agents-results__heading">
            <div>
              <h2>{{ collectionLabel }}</h2>
              <p>选择智能体即可进入对话，也可以先收藏常用能力。</p>
            </div>
            <span>{{ filteredAgents.length }} 个结果</span>
          </header>

          <template v-if="filteredAgents.length > 0">
            <div class="agents-grid">
              <article
                v-for="agent in visibleAgents"
                :key="agent.id"
                class="agent-card"
                tabindex="0"
                @click="openAgent(agent.id)"
                @keydown.enter="openAgent(agent.id)"
              >
                <header class="agent-card__header">
                  <span class="agent-card__avatar" :style="{ background: agent.color }">
                    {{ agent.glyph }}
                  </span>
                  <div>
                    <strong>{{ agent.name }}</strong>
                    <span v-if="activeTab === 'created'">我创建的</span>
                    <span v-else>AI 助手</span>
                  </div>
                  <span class="agent-card__actions">
                    <button
                      v-if="activeTab === 'created'"
                      type="button"
                      class="agent-card__edit"
                      aria-label="编辑智能体"
                      @click.stop="editAgent(agent.id)"
                    >
                      <EditOutlined />
                    </button>
                    <button
                      type="button"
                      class="agent-card__favorite"
                      :class="{ active: workspace.favoriteAgentIds.includes(agent.id) }"
                      :aria-label="
                        workspace.favoriteAgentIds.includes(agent.id) ? '取消收藏' : '收藏智能体'
                      "
                      @click.stop="toggleFavorite(agent.id)"
                    >
                      <StarFilled v-if="workspace.favoriteAgentIds.includes(agent.id)" />
                      <StarOutlined v-else />
                    </button>
                  </span>
                </header>

                <div class="agent-card__metrics">
                  <span>
                    <StarFilled />
                    {{ agent.rating.toFixed(1) }}
                  </span>
                  <span>
                    <MessageOutlined />
                    {{ agent.usage }}
                  </span>
                </div>

                <p>{{ agent.description }}</p>

                <footer>
                  <span v-for="tag in agent.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
                </footer>
              </article>
            </div>

            <nav
              v-if="filteredAgents.length > pageSize"
              class="agents-pagination"
              aria-label="智能体分页"
            >
              <button
                type="button"
                aria-label="上一页"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                <LeftOutlined />
              </button>
              <template v-for="(page, index) in paginationItems" :key="`${page}-${index}`">
                <span v-if="typeof page !== 'number'">...</span>
                <button
                  v-else
                  type="button"
                  :class="{ active: currentPage === page }"
                  :aria-current="currentPage === page ? 'page' : undefined"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </template>
              <button
                type="button"
                aria-label="下一页"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                <RightOutlined />
              </button>
            </nav>
          </template>

          <div v-else class="agents-empty">
            <span>
              <RobotOutlined />
            </span>
            <strong>{{ emptyTitle }}</strong>
            <p>
              {{
                activeTab === 'created'
                  ? '创建后可以继续添加提示词、知识库和工具能力。'
                  : '调整关键词或切换分类后再试。'
              }}
            </p>
            <button
              v-if="activeTab === 'created'"
              type="button"
              @click="router.push('/agents/create')"
            >
              <PlusOutlined />
              创建智能体
            </button>
          </div>
        </main>
      </div>
    </section>

    <section v-if="catalogOpen" class="agents-callout">
      <span>
        <ThunderboltFilled />
      </span>
      <div>
        <strong>没有找到合适的智能体？</strong>
        <p>把提示词、知识边界和输出格式组合起来，创建一个真正符合你工作习惯的助手。</p>
      </div>
      <button type="button" @click="router.push('/agents/create')">
        开始创建
        <ArrowRightOutlined />
      </button>
    </section>
  </div>

  <Teleport to="body">
    <div
      v-if="historyOpen"
      class="agent-home-history-layer"
      role="presentation"
      @click.self="historyOpen = false"
    >
      <aside class="agent-home-history" role="dialog" aria-modal="true" aria-label="智能体历史记录">
        <header class="agent-home-history__header">
          <div>
            <span>
              <HistoryOutlined />
            </span>
            <div>
              <strong>历史记录</strong>
              <p>继续最近与智能体的对话</p>
            </div>
          </div>
          <button type="button" aria-label="关闭历史记录" @click="historyOpen = false">
            <CloseOutlined />
          </button>
        </header>

        <label class="agent-home-history__search">
          <SearchOutlined />
          <input v-model="historyQuery" type="search" placeholder="搜索会话或智能体" />
          <span>{{ visibleHistorySessions.length }}</span>
        </label>

        <div
          v-if="historyGroups.length > 0"
          class="agent-home-history__groups"
          aria-label="历史会话"
        >
          <section v-for="group in historyGroups" :key="group.label">
            <h3>{{ group.label }}</h3>
            <button
              v-for="session in group.items"
              :key="session.id"
              type="button"
              class="agent-home-history__item"
              @click="openAgentSession(session)"
            >
              <span
                class="agent-home-history__avatar"
                :style="{ background: agentForSession(session)?.color || '#5b7cfa' }"
              >
                {{ agentForSession(session)?.glyph || '智' }}
              </span>
              <span class="agent-home-history__copy">
                <strong>{{ session.title }}</strong>
                <em>{{ agentForSession(session)?.name || '智能体' }}</em>
                <p>{{ sessionPreview(session) }}</p>
              </span>
              <span class="agent-home-history__meta">
                <time>{{ formatHistoryTimestamp(session.updatedAt) }}</time>
                <ArrowRightOutlined />
              </span>
            </button>
          </section>
        </div>

        <div v-else class="agent-home-history__empty">
          <span>
            <MessageOutlined />
          </span>
          <strong>{{ historyQuery.trim() ? '没有匹配的历史会话' : '还没有历史记录' }}</strong>
          <p>
            {{
              historyQuery.trim()
                ? '换一个智能体名称或会话关键词再试。'
                : '开始一次智能体对话后，会话会保存在这里。'
            }}
          </p>
          <button v-if="historyQuery.trim()" type="button" @click="historyQuery = ''">
            清除搜索
          </button>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.agents-catalog-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 56px);
  padding: 30px 12px 58px;
  background:
    radial-gradient(circle at 50% 0, rgb(61 202 136 / 8%), transparent 440px),
    linear-gradient(180deg, #f7fcf9 0, #fff 430px);
}

/* 参考产品把智能体资源库紧接在创建卡片下方，快速开始与模板推荐后置保留 */
.agent-home {
  order: 1;
}

.agents-catalog {
  order: 2;
}

.agent-home--quickstart {
  order: 3;
}

.agent-showcase {
  order: 4;
}

.agents-callout {
  order: 5;
}

.agents-hero,
.agents-catalog,
.agents-callout {
  width: min(100%, 1158px);
  margin: 0 auto;
}

.agents-hero__heading {
  display: grid;
  justify-items: center;
  text-align: center;
}

.agents-hero__heading > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #1ca96d;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.agents-hero__heading h1 {
  margin: 9px 0 0;
  color: #169f67;
  font-size: clamp(25px, 2.2vw, 34px);
  font-weight: 900;
  letter-spacing: 0;
}

.agents-hero__heading p {
  margin: 9px 0 0;
  color: #6d7882;
  font-size: 11px;
  line-height: 1.7;
}

.agents-hero__cards {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 25px;
}

.agents-builder-card {
  display: grid;
  min-height: 184px;
  overflow: hidden;
  grid-template-columns: minmax(240px, 0.92fr) minmax(260px, 1fr);
  border: 1px solid #e4ebe7;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 38px rgb(33 78 59 / 6%);
}

.agents-builder-card--disabled {
  opacity: 0.72;
}

.agents-builder-card__visual {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgb(63 172 126 / 6%) 1px, transparent 1px),
    linear-gradient(rgb(63 172 126 / 6%) 1px, transparent 1px), #edf8f3;
  background-size: 28px 28px;
}

.agents-builder-card__visual--chat::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgb(255 255 255 / 72%), transparent 65%);
  content: '';
}

.agent-window {
  position: absolute;
  top: 25px;
  right: 26px;
  bottom: 24px;
  left: 26px;
  display: grid;
  align-content: start;
  gap: 9px;
  padding: 14px;
  border: 1px solid #cfe1d9;
  border-radius: 8px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 14px 30px rgb(41 96 74 / 10%);
}

.agent-window header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 2px;
  color: #5e6d67;
  font-size: 8px;
  font-weight: 750;
}

.agent-window header i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: #69c9a3;
}

.agent-window p {
  height: 7px;
  margin: 0;
  border-radius: 999px;
  background: #e3e9e6;
}

.agent-window p:nth-of-type(2) {
  width: 82%;
}

.agent-window p:nth-of-type(3) {
  width: 92%;
}

.agent-window p:nth-of-type(4) {
  width: 68%;
}

.agent-window button {
  justify-self: end;
  height: 23px;
  margin-top: 2px;
  padding: 0 9px;
  border: 0;
  border-radius: 5px;
  background: #55b98f;
  color: #fff;
  font-size: 7px;
}

.agents-builder-card__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 28px;
}

.agents-builder-card__tag {
  color: #1ca96d;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.agents-builder-card__content h2 {
  margin: 7px 0 0;
  color: #26302c;
  font-size: 19px;
  font-weight: 850;
}

.agents-builder-card__content > p {
  margin: 8px 0 0;
  color: #7c8882;
  font-size: 10px;
  line-height: 1.65;
}

.agents-builder-card__content ul {
  display: grid;
  gap: 4px;
  margin: 10px 0 0;
  padding: 0;
  color: #69756f;
  font-size: 9px;
  list-style: none;
}

.agents-builder-card__content li::before {
  margin-right: 6px;
  color: #1ca96d;
  content: '✓';
  font-weight: 900;
}

.agents-builder-card__content > button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: #159c66;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.agents-builder-card__soon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 17px;
  color: #8d9691;
  font-size: 9px;
}

.agents-builder-card__soon i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef9141;
}

.agents-builder-card__visual--flow {
  background:
    linear-gradient(90deg, rgb(68 130 226 / 6%) 1px, transparent 1px),
    linear-gradient(rgb(68 130 226 / 6%) 1px, transparent 1px), #eff5fc;
  background-size: 28px 28px;
}

.flow-node {
  position: absolute;
  z-index: 2;
  padding: 7px 9px;
  border: 1px solid #d5e3f5;
  border-radius: 5px;
  background: #fff;
  color: #5e7087;
  font-size: 7px;
  box-shadow: 0 7px 16px rgb(54 86 128 / 8%);
}

.flow-node--one {
  top: 41px;
  left: 32px;
}

.flow-node--two {
  top: 94px;
  left: 66px;
}

.flow-node--three {
  top: 50px;
  right: 48px;
}

.flow-node--four {
  right: 31px;
  bottom: 32px;
}

.flow-line {
  position: absolute;
  z-index: 1;
  width: 62px;
  height: 1px;
  background: #9ebce5;
  transform-origin: left center;
}

.flow-line--one {
  top: 69px;
  left: 77px;
  transform: rotate(28deg);
}

.flow-line--two {
  top: 79px;
  left: 130px;
  transform: rotate(-15deg);
}

.flow-line--three {
  top: 95px;
  right: 78px;
  transform: rotate(34deg);
}

.agents-catalog {
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid #e4ebe7;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 14px 40px rgb(33 78 59 / 5%);
}

.agents-catalog__toolbar {
  display: grid;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  grid-template-columns: auto minmax(280px, 540px) minmax(0, 1fr);
  padding: 12px 16px;
  border-bottom: 1px solid #edf1ef;
}

.agents-tabs {
  display: flex;
  min-width: 0;
  padding: 3px;
  border-radius: 8px;
  background: #f3f5f4;
}

.agents-tabs button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 13px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #68726d;
  font-size: 13px;
  font-weight: 760;
  white-space: nowrap;
  cursor: pointer;
}

.agents-tabs button.active {
  background: #fff;
  color: #169c66;
  box-shadow: 0 3px 12px rgb(35 67 53 / 8%);
}

.agents-tabs button span {
  min-width: 18px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #e5f5ee;
  color: #169c66;
  font-size: 11px;
}

.agents-search {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid #dde4e0;
  border-radius: 8px;
  color: #98a19c;
}

.agents-search:focus-within {
  border-color: #85c9ad;
  box-shadow: 0 0 0 3px rgb(28 169 109 / 8%);
}

.agents-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #39423e;
  font-size: 13px;
}

.agents-search input::placeholder {
  color: #a4aca8;
}

.agents-search kbd {
  flex: 0 0 auto;
  padding: 2px 5px;
  border: 1px solid #e2e7e4;
  border-radius: 4px;
  background: #f7f9f8;
  color: #9aa29e;
  font-size: 10px;
}

.agents-hot-search {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  overflow: hidden;
  white-space: nowrap;
}

.agents-mobile-create {
  display: none;
}

.agents-hot-search span {
  flex: 0 0 auto;
  color: #929b96;
  font-size: 11px;
}

.agents-hot-search button {
  overflow: hidden;
  padding: 0;
  border: 0;
  background: transparent;
  color: #3267d8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.agents-hot-search button:hover {
  text-decoration: underline;
}

.agents-catalog__body {
  display: grid;
  align-items: start;
  gap: 14px;
  grid-template-columns: 270px minmax(0, 1fr);
  padding: 14px;
}

.agents-categories {
  position: sticky;
  top: 74px;
  overflow: hidden;
  border: 1px solid #edf1ef;
  border-radius: 9px;
  background: #fbfcfc;
}

.agents-categories > header {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid #edf1ef;
}

.agents-categories > header strong {
  color: #46504b;
  font-size: 14px;
}

.agents-categories > header span {
  color: #9ca49f;
  font-size: 11px;
}

.agents-categories nav {
  display: grid;
  gap: 6px;
  padding: 10px;
}

.agents-categories nav button {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #68726d;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.agents-categories nav button:hover {
  background: #f0f6f3;
}

.agents-categories nav button.active {
  background: linear-gradient(90deg, #18ad72, #28bd80);
  color: #fff;
  box-shadow: 0 8px 18px rgb(24 173 114 / 18%);
}

.agents-categories nav button > span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agents-categories nav button :deep(svg) {
  flex: 0 0 auto;
  font-size: 15px;
}

.agents-categories nav button em {
  flex: 0 0 auto;
  color: #9ba39f;
  font-size: 12px;
  font-style: normal;
}

.agents-categories nav button.active em {
  color: rgb(255 255 255 / 82%);
}

.agents-results {
  min-width: 0;
}

.agents-results__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}

.agents-results__heading h2 {
  margin: 0;
  color: #29332e;
  font-size: 18px;
}

.agents-results__heading p {
  margin: 5px 0 0;
  color: #8d9691;
  font-size: 11px;
}

.agents-results__heading > span {
  flex: 0 0 auto;
  color: #8e9792;
  font-size: 11px;
}

.agents-grid {
  display: grid;
  gap: 12px 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agent-card {
  display: grid;
  min-width: 0;
  min-height: 258px;
  align-content: space-between;
  padding: 15px 16px 16px;
  border: 1px solid #e3e9e6;
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.agent-card:hover,
.agent-card:focus-visible {
  border-color: #a9d8c3;
  outline: 0;
  box-shadow: 0 13px 28px rgb(37 91 67 / 9%);
  transform: translateY(-2px);
}

.agent-card__header {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 9px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
}

.agent-card__avatar {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  font-weight: 850;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 18%);
}

.agent-card__header > div {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.agent-card__header strong {
  overflow: hidden;
  color: #2e3732;
  font-size: 15px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-card__header > div > span {
  width: max-content;
  padding: 3px 7px;
  border-radius: 4px;
  background: #e8f7f0;
  color: #1ca96d;
  font-size: 10px;
  font-weight: 800;
}

.agent-card__actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.agent-card__edit,
.agent-card__favorite {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: #f5f7f6;
  color: #a3aaa6;
  font-size: 11px;
  cursor: pointer;
}

.agent-card__edit:hover {
  background: #eef4ff;
  color: #3979ed;
}

.agent-card__favorite.active {
  background: #fff7e6;
  color: #e9a226;
}

.agent-card__metrics {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  color: #8b9490;
  font-size: 12px;
}

.agent-card__metrics span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.agent-card__metrics span:first-child {
  min-width: 56px;
}

.agent-card__metrics span:last-child {
  min-width: 64px;
}

.agent-card__metrics :deep(svg:first-child) {
  color: #f1a02b;
}

.agent-card > p {
  display: -webkit-box;
  min-height: 62px;
  overflow: hidden;
  margin: 14px 0 0;
  color: #77817c;
  font-size: 12.5px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.agent-card > footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.agent-card > footer span {
  padding: 3px 8px;
  border-radius: 4px;
  background: #f3f5f4;
  color: #848d88;
  font-size: 11px;
}

.agents-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
}

.agents-pagination button {
  display: grid;
  min-width: 34px;
  height: 34px;
  place-items: center;
  padding: 0 9px;
  border: 1px solid #e3e9e6;
  border-radius: 7px;
  background: #fff;
  color: #68726d;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    color 150ms ease,
    background 150ms ease;
}

.agents-pagination button:hover:not(:disabled):not(.active) {
  border-color: #a9d8c3;
  color: #169c66;
}

.agents-pagination button.active {
  border-color: #19a96e;
  background: #19a96e;
  color: #fff;
}

.agents-pagination button:disabled {
  color: #c3cbc7;
  cursor: not-allowed;
}

.agents-pagination > span {
  padding: 0 2px;
  color: #9ca49f;
  font-size: 13px;
}

.agents-empty {
  display: grid;
  min-height: 370px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed #dce5e0;
  border-radius: 9px;
  background:
    linear-gradient(90deg, rgb(28 169 109 / 3%) 1px, transparent 1px),
    linear-gradient(rgb(28 169 109 / 3%) 1px, transparent 1px), #fbfdfc;
  background-size: 32px 32px;
  text-align: center;
}

.agents-empty > span {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 14px;
  background: #eaf8f2;
  color: #1ca96d;
  font-size: 20px;
}

.agents-empty strong {
  color: #46504b;
  font-size: 14px;
}

.agents-empty p {
  max-width: 320px;
  margin: 0;
  color: #929b96;
  font-size: 12px;
  line-height: 1.65;
}

.agents-empty button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding: 0 13px;
  border: 0;
  border-radius: 7px;
  background: #159c66;
  color: #fff;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

.agents-callout {
  display: grid;
  align-items: center;
  gap: 14px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-top: 16px;
  padding: 17px 20px;
  border: 1px solid #dcebe4;
  border-radius: 10px;
  background: #f5fbf8;
}

.agents-callout > span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 11px;
  background: #159c66;
  color: #fff;
  font-size: 16px;
}

.agents-callout strong {
  color: #35413b;
  font-size: 14px;
}

.agents-callout p {
  margin: 5px 0 0;
  color: #7f8a84;
  font-size: 12px;
}

.agents-callout button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid #9fd3bc;
  border-radius: 7px;
  background: #fff;
  color: #168d5f;
  font-size: 12px;
  font-weight: 780;
  cursor: pointer;
}

@media (max-width: 1240px) {
  .agents-catalog__toolbar {
    grid-template-columns: auto minmax(260px, 1fr);
  }

  .agents-hot-search {
    display: none;
  }
}

@media (max-width: 980px) {
  .agents-catalog-page {
    padding: 24px 18px 48px;
  }

  .agents-hero__cards {
    grid-template-columns: 1fr;
  }

  .agents-catalog__body {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .agents-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .agents-catalog-page {
    padding: 18px 12px 38px;
  }

  .agents-hero__heading h1 {
    font-size: 20px;
  }

  .agents-hero__cards {
    margin-top: 18px;
  }

  .agents-builder-card {
    min-height: 160px;
    grid-template-columns: 118px minmax(0, 1fr);
  }

  .agents-builder-card__visual {
    min-height: 160px;
  }

  .agents-builder-card__content {
    padding: 15px 14px;
  }

  .agents-builder-card__content h2 {
    margin-top: 5px;
    font-size: 15px;
  }

  .agents-builder-card__content > p {
    margin-top: 6px;
    font-size: 8px;
    line-height: 1.55;
  }

  .agents-builder-card__content ul {
    display: grid;
    gap: 3px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 8px;
    font-size: 7px;
    white-space: nowrap;
  }

  .agents-builder-card__content li::before {
    margin-right: 4px;
  }

  .agents-builder-card__content > button {
    height: 30px;
    margin-top: 10px;
    padding: 0 10px;
    font-size: 9px;
  }

  .agent-window {
    top: 20px;
    right: 16px;
    bottom: 20px;
    left: 16px;
    padding: 11px;
  }

  .flow-node {
    padding: 5px 6px;
    font-size: 6px;
  }

  .flow-node--one {
    top: 34px;
    left: 12px;
  }

  .flow-node--two {
    top: 82px;
    left: 18px;
  }

  .flow-node--three {
    top: 40px;
    right: 10px;
  }

  .flow-node--four {
    right: 8px;
    bottom: 28px;
  }

  .flow-line {
    width: 38px;
  }

  .flow-line--one {
    top: 58px;
    left: 35px;
  }

  .flow-line--two {
    top: 72px;
    left: 56px;
  }

  .flow-line--three {
    top: 88px;
    right: 32px;
  }

  .agents-catalog__toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 11px;
  }

  .agents-tabs {
    grid-column: 1 / -1;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .agents-tabs::-webkit-scrollbar {
    display: none;
  }

  .agents-tabs button {
    flex: 1 0 auto;
  }

  .agents-search kbd {
    display: none;
  }

  .agents-mobile-create {
    display: inline-flex;
    height: 38px;
    align-items: center;
    gap: 5px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: #19a96e;
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
  }

  .agents-catalog__body {
    display: block;
    padding: 12px;
  }

  .agents-categories {
    position: static;
    margin-bottom: 14px;
  }

  .agents-categories > header {
    display: none;
  }

  .agents-categories nav {
    display: flex;
    gap: 7px;
    padding: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .agents-categories nav::-webkit-scrollbar {
    display: none;
  }

  .agents-categories nav button {
    min-width: max-content;
    min-height: 35px;
    gap: 7px;
    padding: 0 11px;
    border: 1px solid #e4ebe7;
    border-radius: 8px;
    background: #fff;
  }

  .agents-categories nav button em {
    display: none;
  }

  .agents-results__heading {
    align-items: flex-start;
  }

  .agents-results__heading p {
    display: none;
  }

  .agents-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agents-callout {
    align-items: start;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .agents-callout button {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 520px) {
  .agents-grid {
    grid-template-columns: 1fr;
  }

  .agent-card {
    min-height: 168px;
    padding: 13px;
  }
}

.agent-home {
  position: relative;
  width: min(100%, 1158px);
  margin: 0 auto;
  padding-top: 16px;
}

.agent-home__history {
  position: absolute;
  top: 48px;
  right: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 0;
  border: 0;
  background: transparent;
  color: #66736d;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.agent-home__history :deep(svg) {
  color: #95b8ff;
  font-size: 18px;
}

.agent-home__heading {
  display: grid;
  justify-items: center;
  text-align: center;
}

.agent-home__heading h1 {
  margin: 0;
  color: #1f2925;
  font-size: clamp(30px, 2.5vw, 36px);
  font-weight: 900;
  letter-spacing: 0;
}

.agent-home__heading p {
  margin: 10px 0 0;
  color: #79847f;
  font-size: 13px;
  line-height: 1.7;
}

.agent-home__heading h1 {
  background: linear-gradient(96deg, #18a86d 0%, #20b678 45%, #283b33 100%);
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
}

.agent-home__builders {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 42px;
}

.agent-builder-card {
  display: grid;
  min-height: 264px;
  overflow: hidden;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  border: 1px solid #e3ebe7;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 30px rgb(33 78 59 / 6%);
}

.agent-builder-preview {
  position: relative;
  display: grid;
  min-height: 264px;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  border-right: 1px solid #edf2ef;
  background: linear-gradient(135deg, rgb(255 255 255 / 58%), transparent 56%), #eef5ff;
}

.agent-builder-preview::before {
  position: absolute;
  width: 170px;
  height: 170px;
  border: 1px solid rgb(86 151 232 / 14%);
  border-radius: 50%;
  content: '';
}

.agent-builder-preview__window {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(100%, 220px);
  min-height: 140px;
  align-content: start;
  gap: 10px;
  padding: 16px;
  border: 1px solid #d9e5f4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 30px rgb(59 94 136 / 13%);
}

.agent-builder-preview__eyebrow {
  color: #42556c;
  font-size: 11px;
  font-weight: 780;
}

.agent-builder-preview__window > i {
  display: block;
  height: 7px;
  border-radius: 999px;
  background: #edf1f6;
}

.agent-builder-preview__window > i:nth-of-type(1) {
  width: 88%;
}

.agent-builder-preview__window > i:nth-of-type(2) {
  width: 68%;
}

.agent-builder-preview__window > i:nth-of-type(3) {
  width: 78%;
}

.agent-builder-preview__window > button {
  min-height: 28px;
  margin-top: 3px;
  border: 0;
  border-radius: 6px;
  background: linear-gradient(90deg, #4f9cf7, #72b8ff);
  color: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
}

.agent-builder-card__copy {
  display: flex;
  min-width: 0;
  align-content: start;
  flex-direction: column;
  justify-content: center;
  padding: 26px 24px;
}

.agent-builder-card__copy > span {
  color: #232c28;
  font-size: 22px;
  font-weight: 880;
}

.agent-builder-card__copy h2 {
  max-width: 260px;
  margin: 10px 0 0;
  color: #69746e;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.75;
}

.agent-builder-card__copy ul {
  display: grid;
  gap: 6px;
  margin: 14px 0 0;
  padding: 0;
  color: #5b6862;
  font-size: 12.5px;
  list-style: none;
}

.agent-builder-card__copy li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-builder-card__copy li::before {
  width: 11px;
  height: 6px;
  border-bottom: 2px solid #3a9a58;
  border-left: 2px solid #3a9a58;
  content: '';
  transform: rotate(-45deg) translateY(-1px);
}

.agent-builder-card__copy > button {
  display: inline-flex;
  width: fit-content;
  min-height: 40px;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  padding: 0 18px;
  border: 1px solid #25a466;
  border-radius: 7px;
  background: #28b574;
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 7px 16px rgb(39 173 112 / 18%);
  transition:
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.agent-builder-card__copy > button:hover,
.agent-builder-card__copy > button:focus-visible {
  background: #1b9c61;
  outline: 0;
  box-shadow: 0 10px 22px rgb(39 173 112 / 24%);
  transform: translateY(-1px);
}

.agent-builder-card--soon .agent-builder-preview {
  background: linear-gradient(135deg, rgb(255 255 255 / 64%), transparent 58%), #eef8ff;
}

.agent-builder-card__soon-button {
  border-color: #e5e9e7 !important;
  background: #fff !important;
  color: #87918c !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
}

.agent-builder-card__soon-button:hover {
  transform: none !important;
}

.agent-builder-preview--graph {
  background: linear-gradient(135deg, rgb(255 255 255 / 64%), transparent 58%), #edf8ff;
}

.agent-builder-preview--graph::before {
  width: 138px;
  height: 104px;
  border: 1px solid rgb(82 158 221 / 15%);
  border-radius: 18px;
}

.agent-builder-preview__node {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 72px;
  min-height: 36px;
  place-items: center;
  border: 1px solid #d8e8f5;
  border-radius: 6px;
  background: #fff;
  color: #3f5b70;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 6px 14px rgb(58 113 156 / 10%);
}

.agent-builder-preview__node--start {
  top: 50%;
  left: 16px;
  border-color: #a9d9c4;
  color: #1b9b64;
  transform: translateY(-50%);
}

.agent-builder-preview__node:nth-of-type(2) {
  top: 26px;
  right: 48px;
}

.agent-builder-preview__node:nth-of-type(3) {
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
}

.agent-builder-preview__node:nth-of-type(4) {
  right: 48px;
  bottom: 26px;
}

.agent-builder-preview__line {
  position: absolute;
  z-index: 1;
  height: 1px;
  background: #b7d4e7;
  transform-origin: left center;
}

.agent-builder-preview__line--one {
  top: 50%;
  left: 83px;
  width: 70px;
  transform: rotate(-27deg);
}

.agent-builder-preview__line--two {
  top: 50%;
  left: 82px;
  width: 86px;
}

.agent-builder-preview__line--three {
  top: 50%;
  left: 83px;
  width: 70px;
  transform: rotate(27deg);
}

.agent-home__quick-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 24px 0 10px;
  color: #6f7c75;
  font-size: 12px;
  font-weight: 780;
}

.agent-home__quick-label i {
  height: 1px;
  flex: 1;
  background: #edf1ef;
}

.agent-home__tasks {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  flex-wrap: wrap;
}

.agent-home__tasks button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border: 1px solid #e5e9e7;
  border-radius: 999px;
  background: rgb(255 255 255 / 78%);
  color: #59655f;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.agent-home__tasks button:hover,
.agent-home__tasks button:focus-visible {
  border-color: #a9d9c4;
  color: #168d5f;
  transform: translateY(-1px);
}

.agent-home__tasks :deep(svg) {
  color: #1ea46d;
}

.agent-home__composer {
  display: grid;
  width: min(100%, 768px);
  min-height: 142px;
  box-sizing: border-box;
  grid-template-rows: minmax(72px, 1fr) auto;
  margin: 18px auto 0;
  padding: 16px 18px 12px;
  border: 1px solid #e5ebe8;
  border-radius: 14px;
  background: #fff;
  box-shadow:
    0 16px 42px rgb(36 71 55 / 7%),
    0 2px 8px rgb(36 71 55 / 4%);
}

.agent-home__composer textarea {
  width: 100%;
  min-height: 72px;
  box-sizing: border-box;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: #27312d;
  font: inherit;
  font-size: 13px;
  line-height: 1.75;
}

.agent-home__composer textarea::placeholder {
  color: #a0aaa5;
}

.agent-home__composer footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.agent-home__tools {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.agent-home__tools i {
  position: relative;
  display: inline-block;
  width: 22px;
  height: 22px;
  border: 1px solid #ecefed;
  border-radius: 7px;
  background: #fbfcfc;
}

.agent-home__tools i::before,
.agent-home__tools i::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 1px;
  background: #69756f;
  content: '';
  transform: translate(-50%, -50%);
}

.agent-home__tools i::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

.agent-home__composer footer > button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #e8ecea;
  color: #fff;
  cursor: pointer;
  transition:
    background 160ms ease,
    transform 160ms ease;
}

.agent-home__composer footer > button:hover,
.agent-home__composer footer > button:focus-visible {
  background: #1ca96d;
  transform: translateX(2px);
}

.agent-home__tabs {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf1ef;
  overflow-x: auto;
  scrollbar-width: none;
}

.agent-home__tabs::-webkit-scrollbar {
  display: none;
}

.agent-home__tabs button {
  position: relative;
  flex: 0 0 auto;
  padding: 8px 14px 11px;
  border: 0;
  background: transparent;
  color: #53605a;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.agent-home__tabs button::after {
  position: absolute;
  right: 10px;
  bottom: -1px;
  left: 10px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
  content: '';
}

.agent-home__tabs button.active {
  color: #168d5f;
  font-weight: 800;
}

.agent-home__tabs button.active::after {
  background: #19a96e;
}

.agent-home-history-layer {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgb(22 30 26 / 28%);
  backdrop-filter: blur(2px);
  animation: agent-history-fade-in 160ms ease-out both;
}

.agent-home-history {
  display: grid;
  width: min(430px, 100vw);
  height: 100dvh;
  box-sizing: border-box;
  grid-template-rows: auto auto minmax(0, 1fr);
  border-left: 1px solid #e3ebe7;
  background: #fbfdfc;
  box-shadow: -20px 0 48px rgb(24 48 37 / 14%);
  animation: agent-history-slide-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.agent-home-history__header {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid #edf2ef;
  background: rgb(255 255 255 / 92%);
}

.agent-home-history__header > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.agent-home-history__header > div > span {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: #edf4ff;
  color: #6f96e8;
  font-size: 17px;
}

.agent-home-history__header strong {
  display: block;
  color: #27322d;
  font-size: 14px;
}

.agent-home-history__header p {
  margin: 4px 0 0;
  color: #8b9691;
  font-size: 11px;
}

.agent-home-history__header > button {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #e5ebe8;
  border-radius: 8px;
  background: #fff;
  color: #68756f;
  font-size: 13px;
  cursor: pointer;
}

.agent-home-history__header > button:hover,
.agent-home-history__header > button:focus-visible {
  border-color: #c8ddd3;
  color: #159c66;
  outline: 0;
}

.agent-home-history__search {
  display: flex;
  height: 42px;
  align-items: center;
  gap: 8px;
  margin: 14px 18px 4px;
  padding: 0 11px;
  border: 1px solid #e0e8e4;
  border-radius: 9px;
  background: #fff;
  color: #94a09a;
}

.agent-home-history__search:focus-within {
  border-color: #8ecbb0;
  box-shadow: 0 0 0 3px rgb(24 169 109 / 8%);
}

.agent-home-history__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #344039;
  font: inherit;
  font-size: 13px;
}

.agent-home-history__search input::placeholder {
  color: #a4ada9;
}

.agent-home-history__search > span {
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #f0f4f2;
  color: #87928c;
  font-size: 10px;
  text-align: center;
}

.agent-home-history__groups {
  overflow-y: auto;
  padding: 8px 18px 28px;
  scrollbar-color: #d8e2dc transparent;
  scrollbar-width: thin;
}

.agent-home-history__groups section + section {
  margin-top: 16px;
}

.agent-home-history__groups h3 {
  margin: 10px 0 7px;
  color: #909b95;
  font-size: 11px;
  font-weight: 760;
}

.agent-home-history__item {
  display: grid;
  width: 100%;
  min-height: 78px;
  box-sizing: border-box;
  align-items: center;
  gap: 10px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  padding: 11px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
}

.agent-home-history__item:hover,
.agent-home-history__item:focus-visible {
  border-color: #dbe9e2;
  outline: 0;
  background: #fff;
  transform: translateX(-2px);
}

.agent-home-history__avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 850;
  box-shadow: 0 7px 16px rgb(43 70 57 / 12%);
}

.agent-home-history__copy {
  display: block;
  min-width: 0;
}

.agent-home-history__copy strong,
.agent-home-history__copy em,
.agent-home-history__copy p {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-home-history__copy strong {
  color: #303a35;
  font-size: 13px;
}

.agent-home-history__copy em {
  margin-top: 3px;
  color: #168d5f;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
}

.agent-home-history__copy p {
  margin: 4px 0 0;
  color: #8c9691;
  font-size: 11px;
}

.agent-home-history__meta {
  display: grid;
  justify-items: end;
  gap: 6px;
  color: #a2aba6;
}

.agent-home-history__meta time {
  font-size: 10px;
}

.agent-home-history__meta :deep(svg) {
  color: #b4bdb8;
  font-size: 9px;
}

.agent-home-history__empty {
  display: grid;
  align-content: center;
  justify-items: center;
  padding: 44px 28px;
  text-align: center;
}

.agent-home-history__empty > span {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 14px;
  background: #eef7f2;
  color: #28aa73;
  font-size: 21px;
}

.agent-home-history__empty strong {
  margin-top: 14px;
  color: #35413b;
  font-size: 14px;
}

.agent-home-history__empty p {
  max-width: 260px;
  margin: 7px 0 0;
  color: #8d9892;
  font-size: 11px;
  line-height: 1.7;
}

.agent-home-history__empty button {
  height: 32px;
  margin-top: 12px;
  padding: 0 13px;
  border: 1px solid #dce8e2;
  border-radius: 7px;
  background: #fff;
  color: #168d5f;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

@keyframes agent-history-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes agent-history-slide-in {
  from {
    transform: translateX(34px);
  }
}

.agent-showcase {
  width: min(100%, 1380px);
  margin: 14px auto 0;
}

.agent-showcase__heading {
  display: flex;
  min-height: 26px;
  align-items: center;
  justify-content: flex-end;
  gap: 18px;
  margin-bottom: 8px;
}

.agent-showcase__sr-title {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.agent-showcase__heading > button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #168d5f;
  font: inherit;
  font-size: 11px;
  font-weight: 780;
  cursor: pointer;
}

.agent-showcase__grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agent-showcase-card {
  display: grid;
  min-height: 170px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) minmax(108px, 1.06fr);
  border: 1px solid #e5ebe8;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(33 78 59 / 4%);
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.agent-showcase-card:hover,
.agent-showcase-card:focus-visible {
  border-color: #bfe2d2;
  box-shadow: 0 14px 32px rgb(33 78 59 / 9%);
  outline: 0;
  transform: translateY(-2px);
}

.agent-showcase-card__copy {
  display: grid;
  min-width: 0;
  align-content: space-between;
  gap: 12px;
  padding: 14px 13px 12px;
}

.agent-showcase-card__copy strong {
  display: -webkit-box;
  overflow: hidden;
  color: #343d39;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.52;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.agent-showcase-card__copy button {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6b7771;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}

.agent-showcase-card__copy button:hover,
.agent-showcase-card__copy button:focus-visible {
  color: #169c66;
}

.agent-showcase-card__preview {
  position: relative;
  overflow: hidden;
  background: #eff6f2;
}

.agent-template-preview {
  position: absolute;
  inset: 8px 7px 8px 0;
  display: grid;
  align-content: start;
  gap: 5px;
  overflow: hidden;
  padding: 8px;
  border: 1px solid #dfe9e4;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 5px 14px rgb(42 77 62 / 8%);
}

.agent-template-preview > header {
  display: grid;
  height: 13px;
  align-items: center;
  gap: 4px;
  grid-template-columns: 8px minmax(0, 1fr) 15px;
}

.agent-template-preview > header i {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #86c9a9;
}

.agent-template-preview > header span {
  height: 3px;
  border-radius: 999px;
  background: #dce7e2;
}

.agent-template-preview > header em {
  height: 7px;
  border-radius: 999px;
  background: #eef3f1;
}

.agent-template-preview__hero {
  display: grid;
  min-height: 43px;
  overflow: hidden;
  grid-template-columns: 1.1fr 0.9fr;
  border-radius: 4px;
  background: #e9f4ee;
}

.agent-template-preview__hero span {
  align-self: center;
  height: 5px;
  margin: 0 7px;
  border-radius: 999px;
  background: #bcdfcf;
}

.agent-template-preview__hero i {
  background:
    linear-gradient(135deg, rgb(255 255 255 / 35%), transparent),
    linear-gradient(160deg, #9ac9b3, #dceee5);
}

.agent-template-preview__columns {
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.agent-template-preview__columns span {
  height: 3px;
  border-radius: 999px;
  background: #e4ebe8;
}

.agent-template-preview__chart {
  display: flex;
  height: 20px;
  align-items: flex-end;
  gap: 3px;
}

.agent-template-preview__chart i {
  width: 10px;
  border-radius: 2px 2px 0 0;
  background: #a9d5c0;
}

.agent-template-preview__chart i:nth-child(1) {
  height: 8px;
}

.agent-template-preview__chart i:nth-child(2) {
  height: 15px;
}

.agent-template-preview__chart i:nth-child(3) {
  height: 11px;
}

.agent-template-preview__chart i:nth-child(4) {
  height: 18px;
}

.agent-showcase-card__preview--1 {
  background: #eff4fb;
}

.agent-showcase-card__preview--1 .agent-template-preview__hero {
  background: #e8effa;
}

.agent-showcase-card__preview--1 .agent-template-preview__hero i {
  background:
    linear-gradient(135deg, rgb(255 255 255 / 35%), transparent),
    linear-gradient(160deg, #9db8de, #dbe7f7);
}

.agent-showcase-card__preview--1 .agent-template-preview > header i,
.agent-showcase-card__preview--1 .agent-template-preview__chart i {
  background: #9bb6df;
}

.agent-showcase-card__preview--2 {
  background: #f5f0fb;
}

.agent-showcase-card__preview--2 .agent-template-preview__hero {
  background: #eee7f7;
}

.agent-showcase-card__preview--2 .agent-template-preview__hero i {
  background:
    linear-gradient(135deg, rgb(255 255 255 / 35%), transparent),
    linear-gradient(160deg, #b7a2d8, #e7def3);
}

.agent-showcase-card__preview--2 .agent-template-preview > header i,
.agent-showcase-card__preview--2 .agent-template-preview__chart i {
  background: #b6a2d9;
}

.agent-showcase-card__preview--3 {
  background: #fbf3eb;
}

.agent-showcase-card__preview--3 .agent-template-preview__hero {
  background: #f7eadc;
}

.agent-showcase-card__preview--3 .agent-template-preview__hero i {
  background:
    linear-gradient(135deg, rgb(255 255 255 / 35%), transparent),
    linear-gradient(160deg, #d7ad83, #f0dfce);
}

.agent-showcase-card__preview--3 .agent-template-preview > header i,
.agent-showcase-card__preview--3 .agent-template-preview__chart i {
  background: #daa979;
}

.agent-showcase-card__preview--4 {
  background: #fbf0f2;
}

.agent-showcase-card__preview--4 .agent-template-preview__hero {
  background: #f8e7eb;
}

.agent-showcase-card__preview--4 .agent-template-preview__hero i {
  background:
    linear-gradient(135deg, rgb(255 255 255 / 35%), transparent),
    linear-gradient(160deg, #dca1ae, #f2d9df);
}

.agent-showcase-card__preview--4 .agent-template-preview > header i,
.agent-showcase-card__preview--4 .agent-template-preview__chart i {
  background: #dca0ad;
}

.agent-showcase-card__preview--5 {
  background: #edf7f7;
}

.agent-showcase-card__preview--5 .agent-template-preview__hero {
  background: #e3f2f1;
}

.agent-showcase-card__preview--5 .agent-template-preview__hero i {
  background:
    linear-gradient(135deg, rgb(255 255 255 / 35%), transparent),
    linear-gradient(160deg, #92c5c2, #d7ecea);
}

.agent-showcase-card__preview--5 .agent-template-preview > header i,
.agent-showcase-card__preview--5 .agent-template-preview__chart i {
  background: #91c6c2;
}

.agents-catalog--expanded {
  scroll-margin-top: 72px;
}

@media (max-width: 1100px) {
  .agent-home__builders {
    gap: 14px;
  }

  .agent-builder-card {
    grid-template-columns: minmax(0, 0.84fr) minmax(0, 1.16fr);
  }

  .agent-builder-card__copy {
    padding: 22px 18px;
  }

  .agent-showcase__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .agent-home__builders {
    grid-template-columns: 1fr;
  }

  .agent-builder-card {
    min-height: 208px;
  }

  .agent-builder-preview {
    min-height: 208px;
  }

  .agent-showcase__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .agent-home-history {
    width: 100%;
  }

  .agent-home-history__header {
    min-height: 68px;
    padding: 11px 14px;
  }

  .agent-home-history__search {
    margin: 11px 14px 2px;
  }

  .agent-home-history__groups {
    padding: 7px 14px calc(24px + env(safe-area-inset-bottom));
  }

  .agent-home-history__item {
    min-height: 74px;
    padding: 10px 8px;
  }

  .agent-home {
    padding-top: 6px;
  }

  .agent-home__history {
    top: 4px;
    right: 2px;
  }

  .agent-home__heading h1 {
    margin-top: 28px;
    font-size: 26px;
    line-height: 1.25;
  }

  .agent-home__heading p {
    max-width: 340px;
    margin-top: 7px;
    font-size: 10px;
  }

  .agent-home__builders {
    gap: 10px;
    margin-top: 18px;
  }

  .agent-builder-card {
    min-height: 0;
    grid-template-columns: 1fr;
  }

  .agent-builder-preview {
    min-height: 158px;
    padding: 18px;
    border-right: 0;
    border-bottom: 1px solid #edf2ef;
  }

  .agent-builder-preview__window {
    min-height: 122px;
  }

  .agent-builder-card__copy {
    padding: 18px 16px;
  }

  .agent-builder-card__copy > span {
    font-size: 16px;
  }

  .agent-builder-card__copy h2 {
    max-width: none;
    margin-top: 7px;
    font-size: 10px;
  }

  .agent-builder-card__copy ul {
    margin-top: 10px;
    gap: 4px;
    font-size: 9px;
  }

  .agent-builder-card__copy > button {
    min-height: 34px;
    margin-top: 13px;
    font-size: 10px;
  }

  .agent-home__quick-label {
    margin-top: 18px;
  }

  .agent-home__tasks {
    justify-content: flex-start;
    margin-top: 0;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .agent-home__tasks::-webkit-scrollbar {
    display: none;
  }

  .agent-home__tasks button {
    min-width: max-content;
    min-height: 31px;
    padding: 0 11px;
    font-size: 10px;
  }

  .agent-home__composer {
    min-height: 142px;
    margin-top: 13px;
    padding: 14px 14px 11px;
    border-radius: 12px;
  }

  .agent-home__composer textarea {
    min-height: 78px;
    font-size: 11px;
  }

  .agent-home__tabs {
    justify-content: flex-start;
    gap: 1px;
    margin-top: 16px;
    padding-bottom: 7px;
  }

  .agent-home__tabs button {
    padding: 7px 10px 10px;
    font-size: 9px;
  }

  .agent-showcase {
    margin-top: 18px;
  }

  .agent-showcase__heading {
    align-items: center;
  }

  .agent-showcase__heading p {
    display: none;
  }

  .agent-showcase__grid {
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-showcase-card {
    min-height: 146px;
    grid-template-columns: minmax(0, 0.92fr) minmax(72px, 1.08fr);
  }

  .agent-showcase-card__copy {
    gap: 8px;
    padding: 10px 8px 9px;
  }

  .agent-showcase-card__copy strong {
    font-size: 11px;
    line-height: 1.45;
    -webkit-line-clamp: 5;
  }

  .agent-showcase-card__copy button {
    font-size: 8px;
  }

  .agent-template-preview {
    inset: 7px 5px 7px 0;
    padding: 6px;
  }

  .agent-template-preview__hero {
    min-height: 38px;
  }
}
</style>
