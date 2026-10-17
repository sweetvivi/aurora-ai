import type { ModuleCatalogItem } from '@/stores/module-catalog';

export interface GlobalSearchEntry {
  aliases: string[];
  category: string;
  description: string;
  iconKey: string;
  id: string;
  route: string;
  searchOrder: number;
  standalone: boolean;
  title: string;
}

const moduleAliases: Record<string, string[]> = {
  agents: ['智能体', '助手', '机器人', '角色', '写作助手', '代码助手'],
  'all-tools': ['工具', '工具库', '搜索工具', '全部能力'],
  canvas: ['画布', '工作流', '节点', '分镜', '流程编排'],
  chat: ['大模型', 'AI 聊天', '问答', '对话', '推理', 'DeepSeek', 'GPT'],
  commerce: ['商品图', '电商', '服装', '试衣', '图案替换', '背景融合', '营销图'],
  draw: ['绘画', '文生图', 'AI 生图', '图片创作', '艺术', '作画'],
  home: ['工作台', '开始页', '首页工具'],
  'image-generation': ['生图', '图片创作', '商业视觉', '海报', '商品摄影'],
  map: ['发现', '找工具', '搜索工具', '能力地图'],
  music: ['音乐', '歌曲', '音频', '配乐', '声音'],
  retouch: ['修图', '抠图', '擦除', '去水印', '消除', '背景替换', '图片增强'],
  video: ['视频', '做视频', '文生视频', '图生视频', 'AI 视频', '视频特效'],
  workbench: ['文档', 'PDF', 'PPT', '报告', '论文', '写作'],
};

const supplementalEntries: GlobalSearchEntry[] = [
  {
    aliases: ['多模型对话', '模型群聊', '多个模型', '对比回答'],
    category: '快捷入口',
    description: '让多个模型分别回答同一轮问题',
    iconKey: 'chat',
    id: 'supplement-group-chat',
    route: '/chat/groups',
    searchOrder: 21,
    standalone: false,
    title: '超级对话',
  },
  {
    aliases: ['新建智能体', '自定义助手', '角色创建'],
    category: '快捷入口',
    description: '创建并配置专属智能体',
    iconKey: 'agents',
    id: 'supplement-agent-create',
    route: '/agents/create',
    searchOrder: 41,
    standalone: false,
    title: '创建智能体',
  },
];

export function buildGlobalSearchEntries(items: ModuleCatalogItem[]): GlobalSearchEntry[] {
  const moduleEntries = items.map<GlobalSearchEntry>((item) => ({
    aliases: moduleAliases[item.key] ?? [],
    category: item.group === 'creation-office' ? '创作与办公' : '核心工具',
    description: item.presentation.description,
    iconKey: item.icon,
    id: `module-${item.key}`,
    route: item.route,
    searchOrder: item.sortOrder,
    standalone: item.route === '/video',
    title: item.name,
  }));

  return [...moduleEntries, ...supplementalEntries].sort(
    (left, right) =>
      left.searchOrder - right.searchOrder || left.title.localeCompare(right.title, 'zh-CN'),
  );
}

export function searchGlobalEntries(
  entries: GlobalSearchEntry[],
  query: string,
): GlobalSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return entries;
  }

  return entries
    .map((entry) => ({
      entry,
      score: getMatchScore(entry, normalizedQuery),
    }))
    .filter((item): item is { entry: GlobalSearchEntry; score: number } => item.score < Infinity)
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.entry.searchOrder - right.entry.searchOrder ||
        left.entry.title.localeCompare(right.entry.title, 'zh-CN'),
    )
    .map((item) => item.entry);
}

function getMatchScore(entry: GlobalSearchEntry, normalizedQuery: string): number {
  const title = normalizeSearchText(entry.title);
  const aliases = entry.aliases.map(normalizeSearchText);
  const description = normalizeSearchText(entry.description);

  if (title === normalizedQuery) {
    return 0;
  }

  if (title.startsWith(normalizedQuery)) {
    return 1;
  }

  if (title.includes(normalizedQuery)) {
    return 2;
  }

  if (aliases.some((alias) => alias === normalizedQuery)) {
    return 3;
  }

  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
    return 4;
  }

  if (aliases.some((alias) => alias.includes(normalizedQuery))) {
    return 5;
  }

  if (description.includes(normalizedQuery)) {
    return 6;
  }

  return Infinity;
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN').replace(/\s+/g, '');
}
