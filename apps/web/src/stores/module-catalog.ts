import {
  AppstoreOutlined,
  ApartmentOutlined,
  AudioOutlined,
  BgColorsOutlined,
  BookOutlined,
  CommentOutlined,
  CompassOutlined,
  DeploymentUnitOutlined,
  EditOutlined,
  FileTextOutlined,
  HighlightOutlined,
  HomeOutlined,
  LineChartOutlined,
  PictureOutlined,
  ReadOutlined,
  RobotOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { defineStore } from 'pinia';
import type { Component } from 'vue';
import {
  fetchModuleDisplayConfigs,
  type ModuleDisplayConfig,
  type ModuleDisplayGroup,
} from '@/app/api';

export interface ModulePresentation {
  category: boolean;
  color: string;
  description: string;
  featured: boolean;
  homeTab: boolean;
  soft: string;
}

export interface ModuleCatalogItem extends ModuleDisplayConfig {
  presentation: ModulePresentation;
}

interface ModuleCatalogState {
  error: string | null;
  items: ModuleDisplayConfig[];
  loaded: boolean;
  loading: boolean;
  source: 'database' | 'defaults';
}

const fallbackItems: ModuleDisplayConfig[] = [
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'home',
    key: 'home',
    name: '首页',
    route: '/',
    sortOrder: 10,
    subtitle: null,
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'chat',
    key: 'chat',
    name: '模型对话',
    route: '/newchat',
    sortOrder: 20,
    subtitle: '100+大模型',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'draw',
    key: 'draw',
    name: 'AI绘画',
    route: '/draw',
    sortOrder: 30,
    subtitle: '绘图 / 修图 / 图片创作',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'agents',
    key: 'agents',
    name: '超级智能体',
    route: '/agents',
    sortOrder: 40,
    subtitle: '1000+功能',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'retouch',
    key: 'retouch',
    name: '智能修图',
    route: '/retouch',
    sortOrder: 50,
    subtitle: '抠图、一键PS',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'image-generation',
    key: 'image-generation',
    name: '图片生成',
    route: '/image-generation',
    sortOrder: 60,
    subtitle: '3D手办、文生图',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'stocks',
    key: 'stocks',
    name: '股票分析',
    route: '/stocks',
    sortOrder: 70,
    subtitle: '行情、预测',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'voice',
    key: 'voice',
    name: 'AI配音2.0',
    route: '/voice',
    sortOrder: 80,
    subtitle: '真人、克隆',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'canvas',
    key: 'canvas',
    name: 'AI画布',
    route: '/canvas',
    sortOrder: 90,
    subtitle: '画布生图 / 画布视频',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'image-processing',
    key: 'image-processing',
    name: '图片处理',
    route: '/image-processing',
    sortOrder: 100,
    subtitle: '色彩、降噪',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'commerce',
    key: 'commerce',
    name: '电商工具',
    route: '/commerce',
    sortOrder: 110,
    subtitle: '试衣、换背景',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'education',
    key: 'education',
    name: 'AI教育',
    route: '/education',
    sortOrder: 120,
    subtitle: '备课、批改',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'free-tools',
    key: 'free-tools',
    name: '免费工具',
    route: '/free-tools',
    sortOrder: 130,
    subtitle: '免费、在线',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'modeling-3d',
    key: 'modeling-3d',
    name: '3D建模',
    route: '/modeling-3d',
    sortOrder: 140,
    subtitle: '图生3D、文生3D',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'video',
    key: 'video',
    name: '视频生成3.0',
    route: '/video',
    sortOrder: 150,
    subtitle: 'Seedance2.0',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'music',
    key: 'music',
    name: 'Sound音乐',
    route: '/music',
    sortOrder: 160,
    subtitle: '原创、伴奏',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'creation-office',
    icon: 'workbench',
    key: 'workbench',
    name: '文档处理',
    route: '/workbench',
    sortOrder: 170,
    subtitle: '写作、表格、汇报',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'creation-office',
    icon: 'map',
    key: 'map',
    name: '工具地图',
    route: '/map',
    sortOrder: 180,
    subtitle: '全部能力一览',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'creation-office',
    icon: 'all-tools',
    key: 'all-tools',
    name: '全部工具',
    route: '/map',
    sortOrder: 190,
    subtitle: '更多功能',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'creation-office',
    icon: 'ai-search',
    key: 'ai-search',
    name: '超级AI搜索',
    route: '/ai-search',
    sortOrder: 200,
    subtitle: '资源、arxiv',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    coverSource: null,
    customized: false,
    group: 'creation-office',
    icon: 'thesis',
    key: 'thesis',
    name: '论文助手',
    route: '/thesis',
    sortOrder: 210,
    subtitle: '毕业、报告',
    visible: true,
  },
];

const defaultPresentation: ModulePresentation = {
  category: false,
  color: '#7251eb',
  description: '',
  featured: false,
  homeTab: false,
  soft: '#f1edff',
};

const presentationByKey: Record<string, ModulePresentation> = {
  chat: {
    category: true,
    color: '#4c84ff',
    description: '多模型问答、推理与智能体协作',
    featured: true,
    homeTab: true,
    soft: '#edf3ff',
  },
  draw: {
    category: true,
    color: '#7758f4',
    description: '文生图、参考图与创意图像设计',
    featured: true,
    homeTab: true,
    soft: '#f1edff',
  },
  agents: {
    category: true,
    color: '#258b70',
    description: '预设助手与专业工作流',
    featured: true,
    homeTab: true,
    soft: '#eaf7f2',
  },
  retouch: {
    category: true,
    color: '#2b9b9a',
    description: '增强、抠图、擦除与背景替换',
    featured: false,
    homeTab: true,
    soft: '#e9f8f7',
  },
  'image-generation': {
    category: true,
    color: '#d97722',
    description: '按描述生成商业视觉与创意图片',
    featured: true,
    homeTab: true,
    soft: '#fff4e7',
  },
  video: {
    category: true,
    color: '#4c74d9',
    description: '文生视频、图生视频与首尾帧',
    featured: false,
    homeTab: true,
    soft: '#edf3ff',
  },
  canvas: {
    category: true,
    color: '#7057d8',
    description: '节点编排与多步骤工作流',
    featured: false,
    homeTab: true,
    soft: '#f2efff',
  },
  commerce: {
    category: true,
    color: '#d05f76',
    description: '商品图、试衣与营销视觉',
    featured: false,
    homeTab: true,
    soft: '#fff0f3',
  },
  stocks: {
    category: false,
    color: '#c0532b',
    description: '行情看板、财务解读与走势预测',
    featured: false,
    homeTab: false,
    soft: '#fdf1ec',
  },
  voice: {
    category: false,
    color: '#3f7fb8',
    description: '真人音色还原与声音克隆配音',
    featured: false,
    homeTab: false,
    soft: '#edf4fb',
  },
  'image-processing': {
    category: false,
    color: '#6a7f3f',
    description: '照片调色、降噪与批量处理',
    featured: false,
    homeTab: false,
    soft: '#f3f7ea',
  },
  education: {
    category: false,
    color: '#8a5cc4',
    description: '备课、出题与作业批改',
    featured: false,
    homeTab: false,
    soft: '#f4effc',
  },
  'free-tools': {
    category: false,
    color: '#2f8f8a',
    description: '免登录可用的在线小工具集',
    featured: false,
    homeTab: false,
    soft: '#eaf7f6',
  },
  'modeling-3d': {
    category: false,
    color: '#5f6dc4',
    description: '图片或文字生成可导出的 3D 模型',
    featured: false,
    homeTab: false,
    soft: '#eef0fb',
  },
  'ai-search': {
    category: false,
    color: '#3d7a5f',
    description: '资料检索与 arXiv 论文聚合',
    featured: false,
    homeTab: false,
    soft: '#ecf6f1',
  },
  thesis: {
    category: false,
    color: '#a2603a',
    description: '开题、写作与答辩材料整理',
    featured: false,
    homeTab: false,
    soft: '#fbf1ea',
  },
};

const iconComponents: Record<string, Component> = {
  agents: RobotOutlined,
  'ai-search': CompassOutlined,
  'all-tools': AppstoreOutlined,
  canvas: ApartmentOutlined,
  chat: CommentOutlined,
  commerce: ShoppingCartOutlined,
  draw: HighlightOutlined,
  education: ReadOutlined,
  'free-tools': ThunderboltOutlined,
  home: HomeOutlined,
  'image-processing': BgColorsOutlined,
  'image-generation': PictureOutlined,
  map: SearchOutlined,
  'modeling-3d': DeploymentUnitOutlined,
  music: AudioOutlined,
  retouch: EditOutlined,
  stocks: LineChartOutlined,
  thesis: BookOutlined,
  video: VideoCameraOutlined,
  voice: SoundOutlined,
  workbench: FileTextOutlined,
};

let loadPromise: Promise<void> | null = null;

export const useModuleCatalogStore = defineStore('module-catalog', {
  state: (): ModuleCatalogState => ({
    error: null,
    items: fallbackItems.map((item) => ({ ...item })),
    loaded: false,
    loading: false,
    source: 'defaults',
  }),
  getters: {
    visibleModules: (state): ModuleDisplayConfig[] =>
      state.items.filter((item) => item.visible).sort(compareModuleItems),
    catalogItems(): ModuleCatalogItem[] {
      return this.visibleModules.map((item) => ({
        ...item,
        presentation: getModulePresentation(item.key),
      }));
    },
  },
  actions: {
    async load(force = false): Promise<void> {
      if (this.loaded && !force) {
        return;
      }

      if (loadPromise) {
        return loadPromise;
      }

      loadPromise = this.fetchConfigs();
      return loadPromise;
    },
    async fetchConfigs(): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        const result = await fetchModuleDisplayConfigs();
        const items = normalizeModuleItems(result.items);

        this.items = items.length > 0 ? items : fallbackItems.map((item) => ({ ...item }));
        this.source = result.source;
        this.loaded = true;
      } catch (error) {
        this.items = fallbackItems.map((item) => ({ ...item }));
        this.source = 'defaults';
        this.loaded = true;
        this.error = error instanceof Error ? error.message : '模块配置加载失败';
      } finally {
        this.loading = false;
        loadPromise = null;
      }
    },
  },
});

export function getModulePresentation(key: string): ModulePresentation {
  return presentationByKey[key] ?? defaultPresentation;
}

export function resolveModuleIcon(icon: string): Component {
  return iconComponents[icon] ?? ThunderboltOutlined;
}

export function getFallbackModuleItems(): ModuleDisplayConfig[] {
  return fallbackItems.map((item) => ({ ...item }));
}

function normalizeModuleItems(items: ModuleDisplayConfig[]): ModuleDisplayConfig[] {
  const seen = new Set<string>();

  return items
    .filter((item) => {
      if (!item.key || seen.has(item.key)) {
        return false;
      }

      seen.add(item.key);
      return true;
    })
    .map((item) => ({
      ...item,
      group: normalizeGroup(item.group),
    }))
    .sort(compareModuleItems);
}

function normalizeGroup(group: ModuleDisplayGroup): ModuleDisplayGroup {
  return group === 'creation-office' ? group : 'primary';
}

function compareModuleItems(left: ModuleDisplayConfig, right: ModuleDisplayConfig): number {
  return left.sortOrder - right.sortOrder || left.key.localeCompare(right.key);
}
