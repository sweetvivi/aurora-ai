import type { RouteRecordRaw } from 'vue-router';

const PlatformShell = () => import('@/layouts/PlatformShell.vue');
const DiscoveryShell = () => import('@/layouts/DiscoveryShell.vue');
const WorkbenchShell = () => import('@/layouts/WorkbenchShell.vue');
const MediaStudioShell = () => import('@/layouts/MediaStudioShell.vue');
const LegacyShell = () => import('@/layouts/LegacyShell.vue');

export const appRoutes: RouteRecordRaw[] = [
  // The reference platform keeps a few legacy entry points alive by bouncing
  // them to the model chat. Mirror those jumps so bookmarked reference URLs do
  // not land on the not-found page.
  {
    path: '/draw/text2image',
    redirect: { name: 'chat' },
  },
  {
    path: '/aiSearch/searchByhome',
    redirect: { name: 'chat' },
  },
  {
    path: '/',
    component: PlatformShell,
    meta: {
      shell: 'platform',
    },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: {
          title: '工作台',
        },
      },
      {
        path: 'newchat',
        alias: ['/chat'],
        name: 'chat',
        component: () => import('@/views/ChatView.vue'),
        meta: {
          title: '模型对话',
        },
      },
      {
        path: 'newchat/groups',
        alias: ['/chat/groups'],
        name: 'group-chat',
        component: () => import('@/views/GroupChatView.vue'),
        meta: {
          title: '超级对话',
        },
      },
      {
        path: 'agents',
        name: 'agents',
        component: () => import('@/views/AgentsView.vue'),
        meta: {
          title: '超级智能体',
        },
      },
      {
        path: 'agents/create',
        name: 'agent-create',
        component: () => import('@/views/AgentCreateView.vue'),
        meta: {
          title: '创建智能体',
        },
      },
      {
        path: 'draw',
        name: 'draw',
        component: () => import('@/views/DrawStudioView.vue'),
        meta: {
          title: 'AI 绘画',
        },
      },
      {
        path: 'newdraw',
        name: 'newdraw',
        component: () => import('@/views/DrawStudioView.vue'),
        meta: {
          title: '极光 AI 智能生图',
        },
      },
      {
        path: 'retouch',
        alias: ['image-tools'],
        name: 'smart-retouch',
        component: () => import('@/views/ImageToolWorkbenchView.vue'),
        meta: {
          title: '智能修图',
        },
      },
      {
        path: 'image-generation',
        name: 'image-generation',
        component: () => import('@/views/ImageToolWorkbenchView.vue'),
        meta: {
          title: '图片生成',
        },
      },
      {
        path: 'canvas',
        name: 'ai-canvas',
        component: () => import('@/views/CanvasStudioView.vue'),
        meta: {
          title: 'AI 画布',
        },
      },
      {
        path: 'commerce',
        name: 'commerce-tools',
        component: () => import('@/views/CommerceWorkbenchView.vue'),
        meta: {
          title: '电商工具',
        },
      },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/views/AdminView.vue'),
        meta: {
          requiresAdmin: true,
          title: '管理后台',
        },
      },
      {
        path: 'stocks',
        name: 'stocks',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: '股票分析',
        },
      },
      {
        path: 'voice',
        name: 'voice',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: 'AI 配音',
        },
      },
      {
        path: 'image-processing',
        name: 'image-processing',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: '图片处理',
        },
      },
      {
        path: 'education',
        name: 'education',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: 'AI 教育',
        },
      },
      {
        path: 'free-tools',
        name: 'free-tools',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: '免费工具',
        },
      },
      {
        path: 'modeling-3d',
        name: 'modeling-3d',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: '3D 建模',
        },
      },
      {
        path: 'ai-search',
        name: 'ai-search',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: '超级 AI 搜索',
        },
      },
      {
        path: 'thesis',
        name: 'thesis',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: '论文助手',
        },
      },
      {
        path: 'music',
        name: 'music',
        component: () => import('@/views/FeaturePlaceholderView.vue'),
        meta: {
          title: 'Sound 音乐',
        },
      },
    ],
  },
  {
    path: '/video',
    name: 'video',
    component: () => import('@/views/VideoStudioView.vue'),
    meta: {
      shell: 'standalone',
      title: 'AI 视频',
    },
  },
  {
    path: '/map',
    component: DiscoveryShell,
    meta: {
      shell: 'discovery',
    },
    children: [
      {
        path: '',
        name: 'tool-map',
        component: () => import('@/views/ToolMapView.vue'),
        meta: {
          title: '发现',
        },
      },
    ],
  },
  {
    path: '/agents/:id',
    component: MediaStudioShell,
    meta: {
      shell: 'media',
    },
    children: [
      {
        path: '',
        name: 'agent-detail',
        component: () => import('@/views/AgentDetailView.vue'),
        meta: {
          title: '智能体对话',
        },
      },
    ],
  },
  {
    path: '/studio',
    component: MediaStudioShell,
    meta: {
      shell: 'media',
    },
    children: [
      {
        path: '',
        name: 'media-studio',
        component: () => import('@/views/MediaStudioView.vue'),
        meta: {
          title: '媒体工作室',
        },
      },
    ],
  },
  {
    path: '/workbench',
    component: WorkbenchShell,
    meta: {
      shell: 'workbench',
    },
    children: [
      {
        path: '',
        name: 'document-workbench',
        component: () => import('@/views/DocumentWorkbenchView.vue'),
        meta: {
          title: '文档工作台',
        },
      },
    ],
  },
  {
    path: '/legacy',
    component: LegacyShell,
    meta: {
      shell: 'legacy',
    },
    children: [
      {
        path: '',
        name: 'legacy-tools',
        component: () => import('@/views/LegacyToolsView.vue'),
        meta: {
          title: '兼容工具',
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: PlatformShell,
    meta: {
      shell: 'platform',
    },
    children: [
      {
        path: '',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
        meta: {
          title: '页面不存在',
        },
      },
    ],
  },
];
