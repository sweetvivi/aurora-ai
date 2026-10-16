import type { RouteRecordRaw } from 'vue-router';

const PlatformShell = () => import('@/layouts/PlatformShell.vue');
const DiscoveryShell = () => import('@/layouts/DiscoveryShell.vue');
const WorkbenchShell = () => import('@/layouts/WorkbenchShell.vue');
const MediaStudioShell = () => import('@/layouts/MediaStudioShell.vue');
const LegacyShell = () => import('@/layouts/LegacyShell.vue');

export const appRoutes: RouteRecordRaw[] = [
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
        path: 'chat',
        name: 'chat',
        component: () => import('@/views/ChatView.vue'),
        meta: {
          title: '模型对话',
        },
      },
    ],
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
          title: '工具地图',
        },
      },
    ],
  },
  {
    path: '/draw',
    component: MediaStudioShell,
    meta: {
      shell: 'media',
    },
    children: [
      {
        path: '',
        name: 'draw',
        component: () => import('@/views/DrawStudioView.vue'),
        meta: {
          title: 'AI 绘画',
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
