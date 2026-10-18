import {
  AppstoreOutlined,
  ApartmentOutlined,
  AudioOutlined,
  CommentOutlined,
  EditOutlined,
  FileTextOutlined,
  HighlightOutlined,
  HomeOutlined,
  PictureOutlined,
  RobotOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
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
    visible: true,
  },
  {
    badge: '100+',
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'chat',
    key: 'chat',
    name: '模型对话',
    route: '/chat',
    sortOrder: 20,
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
    name: 'AI 绘画',
    route: '/draw',
    sortOrder: 30,
    visible: true,
  },
  {
    badge: '6000+',
    cover: null,
    coverSource: null,
    customized: false,
    group: 'primary',
    icon: 'agents',
    key: 'agents',
    name: '超级智能体',
    route: '/agents',
    sortOrder: 40,
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
    name: '视频生成',
    route: '/video',
    sortOrder: 70,
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
    name: 'AI 画布',
    route: '/canvas',
    sortOrder: 80,
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
    sortOrder: 90,
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
    name: 'AI 音乐',
    route: '/music',
    sortOrder: 100,
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
    sortOrder: 110,
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
    sortOrder: 120,
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
    sortOrder: 130,
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
};

const iconComponents: Record<string, Component> = {
  agents: RobotOutlined,
  'all-tools': AppstoreOutlined,
  canvas: ApartmentOutlined,
  chat: CommentOutlined,
  commerce: ShoppingCartOutlined,
  draw: HighlightOutlined,
  home: HomeOutlined,
  'image-generation': PictureOutlined,
  map: SearchOutlined,
  music: AudioOutlined,
  retouch: EditOutlined,
  video: VideoCameraOutlined,
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
