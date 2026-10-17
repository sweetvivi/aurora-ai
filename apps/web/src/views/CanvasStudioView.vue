<script setup lang="ts">
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BgColorsOutlined,
  BulbOutlined,
  CheckOutlined,
  CloseOutlined,
  CloudSyncOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExpandOutlined,
  FileImageOutlined,
  HistoryOutlined,
  LinkOutlined,
  LoadingOutlined,
  MoreOutlined,
  NodeIndexOutlined,
  PaperClipOutlined,
  PictureOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  SaveOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltFilled,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
  GlobalOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchFileBlob } from '@/app/api';
import GalleryArtwork from '@/components/GalleryArtwork.vue';
import {
  IMAGE_TASK_POINTS_COST,
  useDrawWorkspaceStore,
  type DrawWork,
  type DrawWorkStatus,
} from '@/stores/draw-workspace';
import { useModelCatalogStore } from '@/stores/model-catalog';

type CanvasNodeKind = 'image' | 'output' | 'prompt' | 'video';
type CanvasNodeStatus = 'done' | 'failed' | 'generating' | 'idle' | 'queued';
type CanvasAssetCategory = 'all' | 'character' | 'item' | 'other' | 'scene' | 'sound' | 'style';
type HistoryTab = 'image' | 'video';
type NodeGenerationAction = 'angle' | 'image' | 'local-image' | 'local-video' | 'text' | 'video';
type BatchFilter = 'all' | 'failed' | 'pending';

interface CanvasNode {
  createdAt: number;
  generationMode?: string;
  height: number;
  id: string;
  kind: CanvasNodeKind;
  previewUrl?: string;
  prompt: string;
  resultFileId?: string;
  sourceFileId?: string;
  status?: CanvasNodeStatus;
  title: string;
  width: number;
  workId?: string;
  x: number;
  y: number;
}

interface CanvasEdge {
  from: string;
  id: string;
  to: string;
}

interface CanvasGroup {
  color: string;
  id: string;
  nodeIds: string[];
  title: string;
}

interface CanvasAsset {
  category: Exclude<CanvasAssetCategory, 'all'>;
  createdAt: number;
  fileId?: string;
  id: string;
  name: string;
  previewUrl?: string;
}

interface CanvasWorkflow {
  description: string;
  id: string;
  name: string;
  nodes: number;
  updatedAt: string;
}

interface CanvasSnapshot {
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  nodes: CanvasNode[];
}

interface CanvasContextMenu {
  kind: 'canvas' | 'node';
  nodeId?: string;
  x: number;
  y: number;
}

interface CanvasWorkflowDocument {
  edges: CanvasEdge[];
  groups?: CanvasGroup[];
  nodes: CanvasNode[];
  title: string;
  version: 1;
  viewport?: {
    scale: number;
    x: number;
    y: number;
  };
}

interface Point {
  x: number;
  y: number;
}

interface RailAction {
  icon: Component;
  label: string;
  value: 'add' | 'assets' | 'batch' | 'history' | 'inspiration' | 'workflow';
}

interface GenerationModel {
  label: string;
  value: string;
}

const CANVAS_STORAGE_KEY = 'aurora-canvas-workflows-v1';
const CANVAS_ASSET_STORAGE_KEY = 'aurora-canvas-assets-v1';
const WORLD_WIDTH = 3400;
const WORLD_HEIGHT = 2200;

const railActions: RailAction[] = [
  { icon: PlusOutlined, label: '添加', value: 'add' },
  { icon: AppstoreOutlined, label: '素材', value: 'assets' },
  { icon: HistoryOutlined, label: '历史', value: 'history' },
  { icon: ThunderboltFilled, label: '批量生成', value: 'batch' },
  { icon: BulbOutlined, label: '灵感', value: 'inspiration' },
  { icon: NodeIndexOutlined, label: '工作流', value: 'workflow' },
  { icon: UserOutlined, label: '账户', value: 'inspiration' },
];

const assetCategories: { label: string; value: CanvasAssetCategory }[] = [
  { label: '全部', value: 'all' },
  { label: '角色', value: 'character' },
  { label: '场景', value: 'scene' },
  { label: '物品', value: 'item' },
  { label: '风格', value: 'style' },
  { label: '音效', value: 'sound' },
  { label: '其他', value: 'other' },
];

const categoryLabels: Record<Exclude<CanvasAssetCategory, 'all'>, string> = {
  character: '角色',
  item: '物品',
  other: '其他',
  scene: '场景',
  sound: '音效',
  style: '风格',
};

const batchFilters: { label: string; value: BatchFilter }[] = [
  { label: '未生成', value: 'pending' },
  { label: '失败', value: 'failed' },
  { label: '全部', value: 'all' },
];

const workflowTemplates: CanvasWorkflow[] = [
  {
    description: '从提示词到图片节点，适合快速探索视觉方向',
    id: 'blank',
    name: '自由创作画布',
    nodes: 3,
    updatedAt: '刚刚',
  },
  {
    description: '商品主体、场景素材和输出节点组合',
    id: 'commerce',
    name: '商品视觉流程',
    nodes: 5,
    updatedAt: '今天',
  },
  {
    description: '角色素材与分镜输出串联，便于连续创作',
    id: 'storyboard',
    name: '分镜生成器',
    nodes: 6,
    updatedAt: '昨天',
  },
];

const workspace = useDrawWorkspaceStore();
const modelCatalog = useModelCatalogStore();
const nodes = ref<CanvasNode[]>([]);
const edges = ref<CanvasEdge[]>([]);
const groups = ref<CanvasGroup[]>([]);
const assets = ref<CanvasAsset[]>([]);
const activeRailMenu = ref<RailAction['value'] | null>(null);
const activeAssetCategory = ref<CanvasAssetCategory>('all');
const activeHistoryTab = ref<HistoryTab>('image');
const activeWorkflowTab = ref<'mine' | 'samples'>('mine');
const activeBatchFilter = ref<BatchFilter>('pending');
const canvasTitle = ref('新建画布');
const selectedNodeId = ref('');
const selectedNodeIds = ref<string[]>([]);
const nodeMenuNodeId = ref('');
const connectionFromId = ref('');
const contextMenu = ref<CanvasContextMenu | null>(null);
const canvasNotice = ref('');
const inspirationOpen = ref(true);
const inspirationMessage = ref('');
const composerPrompt = ref('');
const composerSourceNodeId = ref('');
const composerTargetNodeId = ref('');
const selectedModel = ref(modelCatalog.resolveAlias('image'));
const selectedRatio = ref('16:9');
const selectedSize = ref('1K');
const uploadCategory = ref<Exclude<CanvasAssetCategory, 'all'>>('other');
const uploadingAssets = ref(false);
const assetError = ref('');
const batchSelectedIds = ref<string[]>([]);
const batchRunning = ref(false);
const batchCancelRequested = ref(false);
const saveState = ref<'idle' | 'saved' | 'saving'>('saved');
const lastSavedAt = ref('10:30');
const viewport = ref({
  scale: 0.9,
  x: 28,
  y: 52,
});
const workspaceElement = ref<HTMLElement | null>(null);
const nodeUploadInput = ref<HTMLInputElement | null>(null);
const assetUploadInput = ref<HTMLInputElement | null>(null);
const workflowImportInput = ref<HTMLInputElement | null>(null);
const fileUrls = ref<Record<string, string>>({});
const undoStack = ref<CanvasSnapshot[]>([]);
const redoStack = ref<CanvasSnapshot[]>([]);
const angleDialogOpen = ref(false);
const angleDialogNodeId = ref('');
const angleRotation = ref(24);
const angleTilt = ref(12);
const angleGenerating = ref(false);
const angleError = ref('');
const loadedFileIds = new Set<string>();
const objectUrls = new Set<string>();
let dragState:
  | {
      origins: Map<string, { x: number; y: number }>;
      pointerX: number;
      pointerY: number;
    }
  | undefined;
let panState:
  | {
      originX: number;
      originY: number;
      pointerX: number;
      pointerY: number;
    }
  | undefined;
let saveTimer: number | undefined;
let noticeTimer: number | undefined;
let hydrated = false;

const generationModels = computed<GenerationModel[]>(() =>
  modelCatalog.modelsFor('image').map((model) => ({
    label: model.displayName,
    value: model.alias,
  })),
);

const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value));
const selectedNodeCount = computed(() => selectedNodeIds.value.length);
const angleDialogNode = computed(() =>
  nodes.value.find((node) => node.id === angleDialogNodeId.value),
);
const anglePreviewLabel = computed(
  () =>
    `Rotate ${angleRotation.value >= 0 ? '+' : ''}${angleRotation.value}° · Tilt ${
      angleTilt.value >= 0 ? '+' : ''
    }${angleTilt.value}°`,
);
const selectedModelLabel = computed(
  () =>
    generationModels.value.find((model) => model.value === selectedModel.value)?.label ??
    generationModels.value[0]?.label ??
    '画布模型',
);
const generatedWorks = computed(() =>
  workspace.works.filter((work) => work.status === 'done' && Boolean(work.artworkUrl)),
);
const filteredAssets = computed(() => {
  if (activeAssetCategory.value === 'all') {
    return assets.value;
  }

  return assets.value.filter((asset) => asset.category === activeAssetCategory.value);
});
const imageHistory = computed(() => workspace.works.filter((work) => work.status === 'done'));
const visibleHistory = computed(() =>
  activeHistoryTab.value === 'image' ? imageHistory.value : [],
);
const batchCandidates = computed(() => {
  const candidates = nodes.value.filter(
    (node) => node.kind === 'image' || node.kind === 'output' || node.kind === 'video',
  );

  if (activeBatchFilter.value === 'all') {
    return candidates;
  }

  if (activeBatchFilter.value === 'failed') {
    return candidates.filter((node) => nodeStatus(node) === 'failed');
  }

  return candidates.filter((node) => nodeStatus(node) !== 'done');
});
const selectedBatchNodes = computed(() =>
  nodes.value.filter(
    (node) => batchSelectedIds.value.includes(node.id) && nodeStatus(node) !== 'done',
  ),
);
const batchCost = computed(() => selectedBatchNodes.value.length * IMAGE_TASK_POINTS_COST);
const composerCost = IMAGE_TASK_POINTS_COST;
const submitting = computed(() => workspace.submitting);
const canvasTransform = computed(
  () =>
    `translate3d(${viewport.value.x}px, ${viewport.value.y}px, 0) scale(${viewport.value.scale})`,
);

function createId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart}`;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function setSelection(ids: string[], primaryId = ''): void {
  selectedNodeIds.value = uniqueIds(ids);
  selectedNodeId.value =
    primaryId && selectedNodeIds.value.includes(primaryId)
      ? primaryId
      : (selectedNodeIds.value.at(-1) ?? '');
}

function clearSelection(): void {
  selectedNodeIds.value = [];
  selectedNodeId.value = '';
}

function isNodeSelected(nodeId: string): boolean {
  return selectedNodeIds.value.includes(nodeId);
}

function toggleNodeSelection(nodeId: string): void {
  if (isNodeSelected(nodeId)) {
    setSelection(
      selectedNodeIds.value.filter((id) => id !== nodeId),
      selectedNodeId.value === nodeId ? '' : selectedNodeId.value,
    );
    return;
  }

  setSelection([...selectedNodeIds.value, nodeId], nodeId);
}

function showCanvasNotice(message: string): void {
  canvasNotice.value = message;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    canvasNotice.value = '';
  }, 2600);
}

function createSeedCanvas(): CanvasSnapshot {
  const firstId = 'node-seed-image';
  const secondId = 'node-seed-detail';
  const promptId = 'node-seed-prompt';
  const outputId = 'node-seed-output';

  return {
    edges: [
      { from: firstId, id: 'edge-seed-one', to: outputId },
      { from: secondId, id: 'edge-seed-two', to: outputId },
    ],
    groups: [],
    nodes: [
      {
        createdAt: Date.now() - 240_000,
        height: 218,
        id: firstId,
        kind: 'image',
        prompt: '清晨自然光下的品牌主视觉，主体清晰，留出标题空间',
        status: 'done',
        title: '主视觉素材',
        width: 330,
        x: 240,
        y: 145,
      },
      {
        createdAt: Date.now() - 180_000,
        height: 205,
        id: secondId,
        kind: 'image',
        prompt: '柔和渐变与中性色背景，适合素材叠加与版式实验',
        status: 'done',
        title: '背景素材',
        width: 300,
        x: 500,
        y: 420,
      },
      {
        createdAt: Date.now() - 150_000,
        height: 132,
        id: promptId,
        kind: 'prompt',
        prompt: '保持主体结构，融合两枚素材的光线与色调，生成一张干净的商业主图',
        status: 'idle',
        title: '融合指令',
        width: 310,
        x: 230,
        y: 505,
      },
      {
        createdAt: Date.now() - 120_000,
        height: 225,
        id: outputId,
        kind: 'output',
        prompt: '融合后的商业主图',
        status: 'done',
        title: '输出结果',
        width: 330,
        x: 590,
        y: 175,
      },
    ],
  };
}

function cloneSnapshot(): CanvasSnapshot {
  return {
    edges: edges.value.map((edge) => ({ ...edge })),
    groups: groups.value.map((group) => ({ ...group, nodeIds: [...group.nodeIds] })),
    nodes: nodes.value.map((node) => ({ ...node })),
  };
}

function replaceSnapshot(snapshot: CanvasSnapshot): void {
  nodes.value = snapshot.nodes.map((node) => ({ ...node }));
  edges.value = snapshot.edges.map((edge) => ({ ...edge }));
  groups.value = (snapshot.groups ?? []).map((group) => ({
    ...group,
    nodeIds: [...group.nodeIds],
  }));
  clearSelection();
  nodeMenuNodeId.value = '';
  contextMenu.value = null;
  composerTargetNodeId.value = '';
  composerSourceNodeId.value = '';
}

function commitHistory(): void {
  undoStack.value = [...undoStack.value.slice(-29), cloneSnapshot()];
  redoStack.value = [];
}

function undo(): void {
  const snapshot = undoStack.value.at(-1);

  if (!snapshot) {
    return;
  }

  redoStack.value = [...redoStack.value, cloneSnapshot()];
  undoStack.value = undoStack.value.slice(0, -1);
  replaceSnapshot(snapshot);
}

function redo(): void {
  const snapshot = redoStack.value.at(-1);

  if (!snapshot) {
    return;
  }

  undoStack.value = [...undoStack.value, cloneSnapshot()];
  redoStack.value = redoStack.value.slice(0, -1);
  replaceSnapshot(snapshot);
}

function loadCanvas(): void {
  const saved = readJson<{
    edges?: CanvasEdge[];
    groups?: CanvasGroup[];
    nodes?: CanvasNode[];
    title?: string;
    viewport?: typeof viewport.value;
  }>(CANVAS_STORAGE_KEY);

  if (saved?.nodes?.length) {
    nodes.value = saved.nodes;
    edges.value = Array.isArray(saved.edges) ? saved.edges : [];
    groups.value = Array.isArray(saved.groups)
      ? saved.groups.map((group) => ({ ...group, nodeIds: [...group.nodeIds] }))
      : [];
    canvasTitle.value = saved.title || '新建画布';
    viewport.value = saved.viewport || viewport.value;
  } else {
    const seed = createSeedCanvas();
    nodes.value = seed.nodes;
    edges.value = seed.edges;
    groups.value = seed.groups;
  }

  assets.value =
    readJson<CanvasAsset[]>(CANVAS_ASSET_STORAGE_KEY)?.filter((asset) => Boolean(asset.fileId)) ??
    [];
  hydrated = true;
}

function persistCanvas(): void {
  saveState.value = 'saving';
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(
        CANVAS_STORAGE_KEY,
        JSON.stringify({
          edges: edges.value,
          groups: groups.value,
          nodes: nodes.value.map((node) => ({
            ...node,
            previewUrl: undefined,
          })),
          title: canvasTitle.value,
          viewport: viewport.value,
        }),
      );
      window.localStorage.setItem(
        CANVAS_ASSET_STORAGE_KEY,
        JSON.stringify(assets.value.filter((asset) => Boolean(asset.fileId))),
      );
      saveState.value = 'saved';
      lastSavedAt.value = new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(Date.now());
    } catch {
      saveState.value = 'idle';
    }
  }, 420);
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);

    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function openRail(action: RailAction['value']): void {
  nodeMenuNodeId.value = '';
  contextMenu.value = null;

  if (action === 'inspiration') {
    activeRailMenu.value = null;
    inspirationOpen.value = !inspirationOpen.value;
    return;
  }

  if (action === 'batch') {
    batchSelectedIds.value = batchCandidates.value
      .filter((node) => nodeStatus(node) !== 'done')
      .map((node) => node.id);
  }

  activeRailMenu.value = activeRailMenu.value === action ? null : action;
}

function closeRailMenu(): void {
  activeRailMenu.value = null;
  nodeMenuNodeId.value = '';
  contextMenu.value = null;
}

function createCanvas(): void {
  commitHistory();
  const seed = createSeedCanvas();

  canvasTitle.value = '新建画布';
  nodes.value = seed.nodes;
  edges.value = seed.edges;
  groups.value = seed.groups;
  clearSelection();
  nodeMenuNodeId.value = '';
  contextMenu.value = null;
  batchSelectedIds.value = [];
  composerTargetNodeId.value = '';
  composerSourceNodeId.value = '';
  connectionFromId.value = '';
  viewport.value = { scale: 0.9, x: 28, y: 52 };
  persistCanvas();
}

function loadWorkflow(workflow: CanvasWorkflow): void {
  commitHistory();
  const seed = createSeedCanvas();

  canvasTitle.value = workflow.name;
  nodes.value = seed.nodes.slice(0, Math.min(workflow.nodes, seed.nodes.length));
  edges.value = seed.edges.filter(
    (edge) =>
      nodes.value.some((node) => node.id === edge.from) &&
      nodes.value.some((node) => node.id === edge.to),
  );
  groups.value = [];
  clearSelection();
  nodeMenuNodeId.value = '';
  contextMenu.value = null;
  batchSelectedIds.value = [];
  composerTargetNodeId.value = '';
  composerSourceNodeId.value = '';
  activeRailMenu.value = null;
  persistCanvas();
}

function addPromptNode(prompt = '描述当前节点需要生成或处理的内容'): CanvasNode {
  const node: CanvasNode = {
    createdAt: Date.now(),
    height: 132,
    id: createId('prompt'),
    kind: 'prompt',
    prompt,
    status: 'idle',
    title: '创作指令',
    width: 310,
    x: Math.round(430 - viewport.value.x / viewport.value.scale + nodes.value.length * 18),
    y: Math.round(350 - viewport.value.y / viewport.value.scale + nodes.value.length * 12),
  };

  commitHistory();
  nodes.value = [...nodes.value, node];
  setSelection([node.id], node.id);
  return node;
}

function addImageNodeFromAsset(asset: CanvasAsset): void {
  const node: CanvasNode = {
    createdAt: Date.now(),
    height: 218,
    id: createId('image'),
    kind: 'image',
    previewUrl: asset.previewUrl,
    prompt: asset.name,
    sourceFileId: asset.fileId,
    status: 'done',
    title: asset.name,
    width: 330,
    x: Math.round(390 - viewport.value.x / viewport.value.scale + nodes.value.length * 20),
    y: Math.round(190 - viewport.value.y / viewport.value.scale + nodes.value.length * 16),
  };

  commitHistory();
  nodes.value = [...nodes.value, node];
  setSelection([node.id], node.id);
  activeRailMenu.value = null;
}

function addImageNodeFromWork(work: DrawWork): void {
  const node: CanvasNode = {
    createdAt: Date.now(),
    height: 218,
    id: createId('output'),
    kind: 'output',
    prompt: work.prompt,
    resultFileId: work.resultFileId,
    status: 'done',
    title: work.modelLabel,
    width: 330,
    workId: work.id,
    x: Math.round(430 - viewport.value.x / viewport.value.scale + nodes.value.length * 20),
    y: Math.round(200 - viewport.value.y / viewport.value.scale + nodes.value.length * 16),
  };

  commitHistory();
  nodes.value = [...nodes.value, node];
  setSelection([node.id], node.id);
  activeRailMenu.value = null;
}

function deleteSelectedNode(): void {
  const nodeIds = [...selectedNodeIds.value];

  if (nodeIds.length === 0) {
    return;
  }

  commitHistory();
  nodes.value = nodes.value.filter((node) => !nodeIds.includes(node.id));
  edges.value = edges.value.filter(
    (edge) => !nodeIds.includes(edge.from) && !nodeIds.includes(edge.to),
  );
  groups.value = groups.value
    .map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((id) => !nodeIds.includes(id)),
    }))
    .filter((group) => group.nodeIds.length >= 2);
  batchSelectedIds.value = batchSelectedIds.value.filter((id) => !nodeIds.includes(id));
  clearSelection();
  nodeMenuNodeId.value = '';
  contextMenu.value = null;
  composerTargetNodeId.value = nodeIds.includes(composerTargetNodeId.value)
    ? ''
    : composerTargetNodeId.value;
  composerSourceNodeId.value = nodeIds.includes(composerSourceNodeId.value)
    ? ''
    : composerSourceNodeId.value;
  connectionFromId.value = '';
}

function duplicateSelectedNode(): void {
  const sourceNodes = nodes.value.filter((node) => isNodeSelected(node.id));

  if (sourceNodes.length === 0) {
    return;
  }

  const idMap = new Map<string, string>();
  const duplicates = sourceNodes.map((node) => {
    const id = createId(node.kind);
    idMap.set(node.id, id);

    return {
      ...node,
      createdAt: Date.now(),
      id,
      title: `${node.title} 副本`,
      x: node.x + 34,
      y: node.y + 34,
    };
  });
  const duplicateEdges = edges.value
    .filter((edge) => idMap.has(edge.from) && idMap.has(edge.to))
    .map((edge) => ({
      from: idMap.get(edge.from) ?? edge.from,
      id: createId('edge'),
      to: idMap.get(edge.to) ?? edge.to,
    }));

  commitHistory();
  nodes.value = [...nodes.value, ...duplicates];
  edges.value = [...edges.value, ...duplicateEdges];
  setSelection(
    duplicates.map((node) => node.id),
    duplicates.at(-1)?.id,
  );
  contextMenu.value = null;
}

function startConnection(nodeId: string): void {
  connectionFromId.value = connectionFromId.value === nodeId ? '' : nodeId;
}

function canConnectNodes(source: CanvasNode, target: CanvasNode): boolean {
  if (source.id === target.id || target.kind === 'prompt') {
    return false;
  }

  if (source.kind === 'prompt') {
    return target.kind === 'image' || target.kind === 'output' || target.kind === 'video';
  }

  if (source.kind === 'image' || source.kind === 'output' || source.kind === 'video') {
    return target.kind === 'image' || target.kind === 'output' || target.kind === 'video';
  }

  return false;
}

function wouldCreateCycle(sourceId: string, targetId: string): boolean {
  const visited = new Set<string>();
  const stack = [targetId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    if (current === sourceId) {
      return true;
    }

    visited.add(current);
    stack.push(...edges.value.filter((edge) => edge.from === current).map((edge) => edge.to));
  }

  return false;
}

function connectNode(targetId: string): void {
  const sourceId = connectionFromId.value;

  if (!sourceId || sourceId === targetId) {
    setSelection([targetId], targetId);
    connectionFromId.value = '';
    return;
  }

  const source = nodes.value.find((node) => node.id === sourceId);
  const target = nodes.value.find((node) => node.id === targetId);

  if (!source || !target || !canConnectNodes(source, target)) {
    showCanvasNotice('节点类型不支持这样连接');
    connectionFromId.value = '';
    return;
  }

  if (wouldCreateCycle(sourceId, targetId)) {
    showCanvasNotice('不能连接成循环工作流');
    connectionFromId.value = '';
    return;
  }

  const alreadyConnected = edges.value.some(
    (edge) => edge.from === sourceId && edge.to === targetId,
  );

  if (!alreadyConnected) {
    commitHistory();
    edges.value = [
      ...edges.value,
      {
        from: sourceId,
        id: createId('edge'),
        to: targetId,
      },
    ];
  }

  connectionFromId.value = '';
  setSelection([targetId], targetId);
  nodeMenuNodeId.value = '';
}

function handleNodePointerDown(event: PointerEvent, node: CanvasNode): void {
  if (event.button !== 0) {
    return;
  }

  event.stopPropagation();

  if (connectionFromId.value) {
    connectNode(node.id);
    return;
  }

  if (event.shiftKey || event.ctrlKey || event.metaKey) {
    toggleNodeSelection(node.id);

    if (!isNodeSelected(node.id)) {
      return;
    }
  } else if (!isNodeSelected(node.id)) {
    setSelection([node.id], node.id);
  } else {
    selectedNodeId.value = node.id;
  }

  nodeMenuNodeId.value = '';
  contextMenu.value = null;
  commitHistory();
  const dragIds = isNodeSelected(node.id) ? selectedNodeIds.value : [node.id];

  dragState = {
    origins: new Map(
      nodes.value
        .filter((item) => dragIds.includes(item.id))
        .map((item) => [item.id, { x: item.x, y: item.y }]),
    ),
    pointerX: event.clientX,
    pointerY: event.clientY,
  };
}

function handleCanvasPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || event.target !== event.currentTarget) {
    return;
  }

  clearSelection();
  connectionFromId.value = '';
  activeRailMenu.value = null;
  nodeMenuNodeId.value = '';
  contextMenu.value = null;
  panState = {
    originX: viewport.value.x,
    originY: viewport.value.y,
    pointerX: event.clientX,
    pointerY: event.clientY,
  };
}

function handlePointerMove(event: PointerEvent): void {
  if (dragState) {
    for (const [id, origin] of dragState.origins) {
      const node = nodes.value.find((item) => item.id === id);

      if (!node) {
        continue;
      }

      node.x = Math.round(origin.x + (event.clientX - dragState.pointerX) / viewport.value.scale);
      node.y = Math.round(origin.y + (event.clientY - dragState.pointerY) / viewport.value.scale);
    }
  }

  if (panState) {
    viewport.value.x = Math.round(panState.originX + event.clientX - panState.pointerX);
    viewport.value.y = Math.round(panState.originY + event.clientY - panState.pointerY);
  }
}

function finishPointerAction(): void {
  dragState = undefined;
  panState = undefined;
}

function changeZoom(delta: number): void {
  viewport.value.scale = Math.min(
    1.55,
    Math.max(0.42, Number((viewport.value.scale + delta).toFixed(2))),
  );
}

function setZoom(value: number): void {
  viewport.value.scale = Number(value);
}

function resetViewport(): void {
  viewport.value = { scale: 0.88, x: 28, y: 32 };
}

function handleWheel(event: WheelEvent): void {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  event.preventDefault();
  changeZoom(event.deltaY > 0 ? -0.06 : 0.06);
}

function nodeImageUrl(node: CanvasNode): string {
  if (node.workId) {
    const work = workspace.works.find((item) => item.id === node.workId);

    if (work?.artworkUrl) {
      return work.artworkUrl;
    }
  }

  if (node.sourceFileId) {
    const sourceUrl = fileUrls.value[node.sourceFileId];

    if (sourceUrl) {
      return sourceUrl;
    }

    void loadFileUrl(node.sourceFileId);
  }

  if (node.resultFileId) {
    const resultUrl = fileUrls.value[node.resultFileId];

    if (resultUrl) {
      return resultUrl;
    }

    void loadFileUrl(node.resultFileId);
  }

  return node.previewUrl ?? '';
}

async function loadFileUrl(fileId: string): Promise<void> {
  if (loadedFileIds.has(fileId)) {
    return;
  }

  loadedFileIds.add(fileId);

  try {
    const blob = await fetchFileBlob(fileId);
    const url = URL.createObjectURL(blob);

    objectUrls.add(url);
    fileUrls.value = {
      ...fileUrls.value,
      [fileId]: url,
    };
  } catch {
    loadedFileIds.delete(fileId);
  }
}

function nodeWork(node: CanvasNode): DrawWork | undefined {
  return node.workId ? workspace.works.find((work) => work.id === node.workId) : undefined;
}

function nodeStatus(node: CanvasNode): CanvasNodeStatus {
  return nodeWork(node)?.status ?? node.status ?? 'idle';
}

function nodeError(node: CanvasNode): string {
  return nodeWork(node)?.errorMessage ?? '';
}

function statusLabel(status: CanvasNodeStatus): string {
  const labels: Record<CanvasNodeStatus, string> = {
    done: '已完成',
    failed: '生成失败',
    generating: '生成中',
    idle: '待处理',
    queued: '排队中',
  };

  return labels[status];
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(timestamp);
}

function historyDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(timestamp);
}

function replaceNodeImage(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const node = selectedNode.value;

  if (!file || !node) {
    input.value = '';
    return;
  }

  const previewUrl = URL.createObjectURL(file);

  objectUrls.add(previewUrl);
  commitHistory();
  Object.assign(node, {
    kind: 'image',
    previewUrl,
    prompt: file.name,
    status: 'done',
    title: file.name,
  });
  input.value = '';

  void workspace
    .uploadReference(file)
    .then((asset) => {
      node.sourceFileId = asset.id;
      void loadFileUrl(asset.id);
      persistCanvas();
    })
    .catch((error: unknown) => {
      assetError.value = error instanceof Error ? error.message : '图片保存失败';
    });
}

function downloadSelectedNode(): void {
  const node = selectedNode.value;

  if (!node) {
    return;
  }

  if (node.workId) {
    void workspace.downloadWork(node.workId);
    return;
  }

  const url = nodeImageUrl(node);

  if (!url) {
    return;
  }

  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${node.title || 'canvas-image'}.png`;
  anchor.click();
}

function editSelectedNode(): void {
  if (selectedNode.value?.prompt) {
    composerPrompt.value = selectedNode.value.prompt;
    composerTargetNodeId.value = selectedNode.value.id;
    composerSourceNodeId.value =
      selectedNode.value.kind === 'image' || selectedNode.value.kind === 'output'
        ? selectedNode.value.id
        : '';
  }

  closeRailMenu();
}

function closeNodeGenerationMenu(): void {
  nodeMenuNodeId.value = '';
}

function toggleNodeGenerationMenu(nodeId: string): void {
  setSelection([nodeId], nodeId);
  contextMenu.value = null;
  nodeMenuNodeId.value = nodeMenuNodeId.value === nodeId ? '' : nodeId;
}

function nodeSourceFileId(node: CanvasNode | undefined): string | undefined {
  return node?.sourceFileId ?? node?.resultFileId;
}

function appendNodeWithEdge(
  node: CanvasNode,
  sourceNode?: CanvasNode,
  options: { commit?: boolean } = {},
): void {
  if (options.commit !== false) {
    commitHistory();
  }

  nodes.value = [...nodes.value, node];
  setSelection([node.id], node.id);
  nodeMenuNodeId.value = '';

  if (sourceNode) {
    edges.value = [
      ...edges.value,
      {
        from: sourceNode.id,
        id: createId('edge'),
        to: node.id,
      },
    ];
  }
}

function createOutputNodeFromSource(
  sourceNode: CanvasNode | undefined,
  options: {
    prompt: string;
    status?: CanvasNodeStatus;
    title: string;
  },
): CanvasNode {
  const sourceX = sourceNode?.x ?? 430 - viewport.value.x / viewport.value.scale;
  const sourceY = sourceNode?.y ?? 200 - viewport.value.y / viewport.value.scale;

  return {
    createdAt: Date.now(),
    generationMode: 'source-image',
    height: 225,
    id: createId('output'),
    kind: 'output',
    prompt: options.prompt,
    sourceFileId: nodeSourceFileId(sourceNode),
    status: options.status ?? 'idle',
    title: options.title,
    width: 330,
    x: Math.round(sourceX + 390),
    y: Math.round(sourceY - 18),
  };
}

function prepareImageNodeGeneration(sourceNode: CanvasNode, title = '图像生成'): void {
  const outputNode = createOutputNodeFromSource(sourceNode, {
    prompt: sourceNode.prompt,
    title,
  });

  appendNodeWithEdge(outputNode, sourceNode);
  composerPrompt.value = sourceNode.prompt;
  composerSourceNodeId.value = sourceNode.id;
  composerTargetNodeId.value = outputNode.id;
}

function createTextGenerationNode(sourceNode: CanvasNode): void {
  const promptNode = addPromptNode(
    `围绕“${sourceNode.prompt.slice(0, 80)}”提炼文案方向和可延展的表达。`,
  );

  composerPrompt.value = promptNode.prompt;
  composerSourceNodeId.value = sourceNode.id;
  composerTargetNodeId.value = '';
  edges.value = [
    ...edges.value,
    {
      from: sourceNode.id,
      id: createId('edge'),
      to: promptNode.id,
    },
  ];
  closeNodeGenerationMenu();
}

function createVideoNodeFromSource(sourceNode: CanvasNode, local = false): void {
  const videoNode: CanvasNode = {
    createdAt: Date.now(),
    generationMode: local ? 'local-video' : 'image-to-video',
    height: 225,
    id: createId('video'),
    kind: 'video',
    prompt: sourceNode.prompt,
    sourceFileId: nodeSourceFileId(sourceNode),
    status: 'idle',
    title: local ? '本地视频模型' : '图生视频',
    width: 330,
    x: sourceNode.x + 390,
    y: sourceNode.y + 62,
  };

  appendNodeWithEdge(videoNode, sourceNode);
}

function openAngleDialog(sourceNode: CanvasNode): void {
  angleDialogNodeId.value = sourceNode.id;
  angleRotation.value = 24;
  angleTilt.value = 12;
  angleError.value = '';
  angleDialogOpen.value = true;
  closeNodeGenerationMenu();
}

function closeAngleDialog(): void {
  if (angleGenerating.value) {
    return;
  }

  angleDialogOpen.value = false;
  angleDialogNodeId.value = '';
  angleError.value = '';
}

function runNodeGenerationAction(action: NodeGenerationAction, sourceNode: CanvasNode): void {
  if (action === 'text') {
    createTextGenerationNode(sourceNode);
    return;
  }

  if (action === 'video') {
    createVideoNodeFromSource(sourceNode);
    return;
  }

  if (action === 'local-video') {
    createVideoNodeFromSource(sourceNode, true);
    return;
  }

  if (action === 'angle') {
    openAngleDialog(sourceNode);
    return;
  }

  prepareImageNodeGeneration(
    sourceNode,
    action === 'local-image' ? '本地图像模型' : '从该节点生成',
  );
}

async function generateAngleView(): Promise<void> {
  const sourceNode = angleDialogNode.value;

  if (!sourceNode || angleGenerating.value) {
    return;
  }

  const sourceFileId = nodeSourceFileId(sourceNode);

  if (!sourceFileId) {
    angleError.value = '当前节点没有可用于生成新视角的图片，请先上传或生成图片。';
    return;
  }

  angleGenerating.value = true;
  angleError.value = '';

  const prompt = `${sourceNode.prompt}；将镜头水平旋转 ${angleRotation.value} 度，垂直俯仰 ${angleTilt.value} 度，生成同一主体和场景的新视角，保持材质、光线和身份一致。`;
  const outputNode = createOutputNodeFromSource(sourceNode, {
    prompt,
    status: 'queued',
    title: '新视角',
  });

  outputNode.generationMode = 'angle';
  appendNodeWithEdge(outputNode, sourceNode);

  try {
    await workspace.initialize();

    const createdWorks = await workspace.createGenerationWorks({
      amount: 1,
      extraParameters: {
        canvasNodeId: outputNode.id,
        mode: 'canvas-angle',
        rotation: angleRotation.value,
        tilt: angleTilt.value,
      },
      model: selectedModel.value,
      modelAlias: selectedModel.value,
      modelLabel: '3D 视角控制',
      prompt,
      ratio: selectedRatio.value,
      size: selectedSize.value,
      sourceFileId,
      toolKey: 'canvas',
    });
    const createdWork = createdWorks[0];

    if (!createdWork) {
      throw new Error('任务提交失败，请稍后重试');
    }

    outputNode.workId = createdWork.id;
    outputNode.resultFileId = createdWork.resultFileId;
    outputNode.status = 'queued';
    angleDialogOpen.value = false;
    angleDialogNodeId.value = '';
    persistCanvas();
  } catch (error) {
    outputNode.status = 'failed';
    angleError.value = error instanceof Error ? error.message : '新视角生成失败';
  } finally {
    angleGenerating.value = false;
  }
}

async function uploadAssetFiles(
  files: File[],
  category: Exclude<CanvasAssetCategory, 'all'>,
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  uploadingAssets.value = true;
  assetError.value = '';

  for (const file of files) {
    const previewUrl = URL.createObjectURL(file);
    const asset: CanvasAsset = {
      category,
      createdAt: Date.now(),
      id: createId('asset'),
      name: file.name,
      previewUrl,
    };

    objectUrls.add(previewUrl);
    assets.value = [asset, ...assets.value];

    try {
      const uploaded = await workspace.uploadReference(file);

      asset.fileId = uploaded.id;
      void loadFileUrl(uploaded.id);
    } catch (error) {
      assetError.value = error instanceof Error ? error.message : '素材上传失败';
    }
  }

  uploadingAssets.value = false;
  persistCanvas();
}

function handleAssetUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  void uploadAssetFiles(files, uploadCategory.value);
  input.value = '';
}

function handleNodeUpload(event: Event): void {
  replaceNodeImage(event);
}

async function submitComposer(): Promise<void> {
  const prompt = composerPrompt.value.trim();

  if (!prompt || submitting.value) {
    return;
  }

  const sourceNode =
    nodes.value.find((node) => node.id === composerSourceNodeId.value) ??
    (selectedNode.value?.kind === 'image' || selectedNode.value?.kind === 'output'
      ? selectedNode.value
      : undefined);
  const preparedTarget = nodes.value.find(
    (node) => node.id === composerTargetNodeId.value && node.kind === 'output',
  );
  let outputNode = preparedTarget;

  if (outputNode) {
    commitHistory();
    Object.assign(outputNode, {
      prompt,
      sourceFileId: outputNode.sourceFileId ?? nodeSourceFileId(sourceNode),
      status: 'queued',
      title: selectedModelLabel.value,
    });
    setSelection([outputNode.id], outputNode.id);
  } else {
    const promptNode = addPromptNode(prompt);

    outputNode = {
      createdAt: Date.now(),
      height: 225,
      id: createId('output'),
      kind: 'output',
      prompt,
      sourceFileId: nodeSourceFileId(sourceNode),
      status: 'queued',
      title: selectedModelLabel.value,
      width: 330,
      x: promptNode.x + 420,
      y: promptNode.y - 70,
    };
    appendNodeWithEdge(outputNode, promptNode, { commit: false });
  }

  await workspace.initialize();

  const createdWorks = await workspace.createGenerationWorks({
    amount: 1,
    extraParameters: {
      canvasNodeId: outputNode.id,
      mode: 'canvas',
    },
    model: selectedModel.value,
    modelAlias: selectedModel.value,
    modelLabel: selectedModelLabel.value,
    prompt,
    ratio: selectedRatio.value,
    size: selectedSize.value,
    sourceFileId: nodeSourceFileId(sourceNode),
    toolKey: 'canvas',
  });
  const createdWork = createdWorks[0];

  if (createdWork) {
    outputNode.workId = createdWork.id;
    outputNode.status = 'queued';
    outputNode.resultFileId = createdWork.resultFileId;
    composerPrompt.value = '';
    composerSourceNodeId.value = '';
    composerTargetNodeId.value = '';
  } else {
    outputNode.status = 'failed';
  }

  persistCanvas();
}

function sendInspiration(): void {
  const prompt = inspirationMessage.value.trim();

  if (!prompt) {
    return;
  }

  addPromptNode(prompt);
  composerPrompt.value = prompt;
  inspirationMessage.value = '';
}

function workflowForAsset(): CanvasWorkflow[] {
  return workflowTemplates;
}

function chooseAsset(asset: CanvasAsset): void {
  if (asset.previewUrl || asset.fileId) {
    addImageNodeFromAsset(asset);
  }
}

function chooseGeneratedWork(work: DrawWork): void {
  addImageNodeFromWork(work);
}

function assetPreviewUrl(asset: CanvasAsset): string {
  return asset.previewUrl || (asset.fileId ? fileUrls.value[asset.fileId] || '' : '');
}

function groupBounds(group: CanvasGroup): {
  height: number;
  width: number;
  x: number;
  y: number;
} {
  const groupNodes = nodes.value.filter((node) => group.nodeIds.includes(node.id));

  if (groupNodes.length === 0) {
    return { height: 0, width: 0, x: 0, y: 0 };
  }

  const minX = Math.min(...groupNodes.map((node) => node.x));
  const minY = Math.min(...groupNodes.map((node) => node.y));
  const maxX = Math.max(...groupNodes.map((node) => node.x + node.width));
  const maxY = Math.max(...groupNodes.map((node) => node.y + node.height));

  return {
    height: maxY - minY + 84,
    width: maxX - minX + 72,
    x: minX - 36,
    y: minY - 56,
  };
}

function createGroupFromSelection(): void {
  const nodeIds = [...selectedNodeIds.value];

  if (nodeIds.length < 2) {
    showCanvasNotice('至少选择两个节点才能创建分组');
    return;
  }

  const palette = ['#647dff', '#8a72f6', '#43a68b', '#d18b48', '#d06480'];
  const group: CanvasGroup = {
    color: palette[groups.value.length % palette.length] ?? '#647dff',
    id: createId('group'),
    nodeIds,
    title: `分组 ${groups.value.length + 1}`,
  };

  commitHistory();
  groups.value = [
    ...groups.value
      .map((item) => ({
        ...item,
        nodeIds: item.nodeIds.filter((id) => !nodeIds.includes(id)),
      }))
      .filter((item) => item.nodeIds.length >= 2),
    group,
  ];
  contextMenu.value = null;
  persistCanvas();
}

function ungroupSelection(): void {
  const nodeIds = selectedNodeIds.value;

  if (nodeIds.length === 0) {
    return;
  }

  const nextGroups = groups.value.filter(
    (group) => !group.nodeIds.some((nodeId) => nodeIds.includes(nodeId)),
  );

  if (nextGroups.length === groups.value.length) {
    return;
  }

  commitHistory();
  groups.value = nextGroups;
  contextMenu.value = null;
  persistCanvas();
}

function removeGroup(groupId: string): void {
  commitHistory();
  groups.value = groups.value.filter((group) => group.id !== groupId);
  persistCanvas();
}

function autoLayoutCanvas(): void {
  if (nodes.value.length === 0) {
    return;
  }

  const depths = new Map(nodes.value.map((node) => [node.id, 0]));

  for (let pass = 0; pass < nodes.value.length; pass += 1) {
    let changed = false;

    for (const edge of edges.value) {
      const sourceDepth = depths.get(edge.from);
      const targetDepth = depths.get(edge.to);

      if (sourceDepth === undefined || targetDepth === undefined) {
        continue;
      }

      const nextDepth = sourceDepth + 1;

      if (nextDepth > targetDepth) {
        depths.set(edge.to, nextDepth);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  const columns = new Map<number, CanvasNode[]>();

  for (const node of nodes.value) {
    const depth = depths.get(node.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  }

  const orderedDepth = [...columns.keys()].sort((left, right) => left - right);
  const columnWidths = orderedDepth.map((depth) =>
    Math.max(...(columns.get(depth) ?? []).map((node) => node.width), 320),
  );
  const columnOffsets = new Map<number, number>();
  let offset = 170;

  for (const depth of orderedDepth) {
    columnOffsets.set(depth, offset);
    offset += (columnWidths.shift() ?? 320) + 150;
  }

  commitHistory();
  nodes.value = nodes.value.map((node) => {
    const depth = depths.get(node.id) ?? 0;
    const column = columns.get(depth) ?? [];
    const index = column.findIndex((item) => item.id === node.id);

    return {
      ...node,
      x: columnOffsets.get(depth) ?? 170,
      y: 150 + Math.max(index, 0) * 280,
    };
  });
  contextMenu.value = null;
  persistCanvas();
  fitCanvasView();
}

function fitCanvasView(): void {
  if (nodes.value.length === 0 || !workspaceElement.value) {
    resetViewport();
    return;
  }

  const minX = Math.min(...nodes.value.map((node) => node.x));
  const minY = Math.min(...nodes.value.map((node) => node.y));
  const maxX = Math.max(...nodes.value.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.value.map((node) => node.y + node.height));
  const contentWidth = Math.max(maxX - minX, 600);
  const contentHeight = Math.max(maxY - minY, 420);
  const availableWidth = Math.max(workspaceElement.value.clientWidth - 190, 320);
  const availableHeight = Math.max(workspaceElement.value.clientHeight - 230, 280);
  const scale = Math.min(
    1.15,
    Math.max(0.42, Math.min(availableWidth / contentWidth, availableHeight / contentHeight)),
  );

  viewport.value = {
    scale: Number(scale.toFixed(2)),
    x: Math.round((workspaceElement.value.clientWidth - contentWidth * scale) / 2 - minX * scale),
    y: Math.round(110 - minY * scale),
  };
}

function clampContextMenuPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(10, Math.min(x, window.innerWidth - 238)),
    y: Math.max(10, Math.min(y, window.innerHeight - 330)),
  };
}

function openCanvasContextMenu(event: MouseEvent): void {
  const position = clampContextMenuPosition(event.clientX, event.clientY);

  contextMenu.value = {
    ...position,
    kind: 'canvas',
  };
}

function openNodeContextMenu(event: MouseEvent, node: CanvasNode): void {
  if (!isNodeSelected(node.id)) {
    setSelection([node.id], node.id);
  } else {
    selectedNodeId.value = node.id;
  }

  const position = clampContextMenuPosition(event.clientX, event.clientY);

  nodeMenuNodeId.value = '';
  contextMenu.value = {
    ...position,
    kind: 'node',
    nodeId: node.id,
  };
}

function openContextNodeGeneration(): void {
  const node = nodes.value.find((item) => item.id === contextMenu.value?.nodeId);

  if (!node) {
    return;
  }

  setSelection([node.id], node.id);
  contextMenu.value = null;
  nodeMenuNodeId.value = node.id;
}

function addPromptNodeFromContextMenu(): void {
  addPromptNode();
  contextMenu.value = null;
}

function toggleBatchNodeSelection(nodeId: string): void {
  batchSelectedIds.value = batchSelectedIds.value.includes(nodeId)
    ? batchSelectedIds.value.filter((id) => id !== nodeId)
    : [...batchSelectedIds.value, nodeId];
}

function selectAllBatchNodes(): void {
  const selectableIds = batchCandidates.value
    .filter((node) => nodeStatus(node) !== 'done')
    .map((node) => node.id);

  batchSelectedIds.value =
    selectableIds.length > 0 && selectableIds.every((id) => batchSelectedIds.value.includes(id))
      ? []
      : selectableIds;
}

async function runBatchGeneration(): Promise<void> {
  const targets = [...selectedBatchNodes.value];

  if (targets.length === 0 || batchRunning.value) {
    return;
  }

  batchRunning.value = true;
  batchCancelRequested.value = false;
  let queuedCount = 0;

  try {
    await workspace.initialize();

    for (const node of targets) {
      if (batchCancelRequested.value) {
        break;
      }

      const current = nodes.value.find((item) => item.id === node.id);

      if (!current || nodeStatus(current) === 'done') {
        continue;
      }

      current.status = 'generating';
      const createdWorks = await workspace.createGenerationWorks({
        amount: 1,
        extraParameters: {
          canvasBatch: true,
          canvasNodeId: current.id,
          mode: 'canvas-batch',
        },
        model: selectedModel.value,
        modelAlias: selectedModel.value,
        modelLabel: selectedModelLabel.value,
        prompt: current.prompt,
        ratio: selectedRatio.value,
        size: selectedSize.value,
        sourceFileId: nodeSourceFileId(current),
        toolKey: 'canvas',
      });
      const createdWork = createdWorks[0];

      if (createdWork) {
        current.workId = createdWork.id;
        current.resultFileId = createdWork.resultFileId;
        current.status = 'queued';
        queuedCount += 1;
      } else {
        current.status = 'failed';
      }
    }
  } catch (error) {
    showCanvasNotice(error instanceof Error ? error.message : '批量生成提交失败');
  } finally {
    batchRunning.value = false;
    batchSelectedIds.value = [];
    persistCanvas();
  }

  if (queuedCount > 0) {
    showCanvasNotice(`已提交 ${queuedCount} 个任务`);
  }
}

async function importWorkflow(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';

  if (!file) {
    return;
  }

  try {
    const parsed = JSON.parse(await file.text()) as Partial<CanvasWorkflowDocument>;
    const validKinds = new Set<CanvasNodeKind>(['image', 'output', 'prompt', 'video']);
    const nodeIds = new Set<string>();
    const importedNodes = (Array.isArray(parsed.nodes) ? parsed.nodes : [])
      .filter(
        (node) =>
          typeof node?.id === 'string' &&
          typeof node?.prompt === 'string' &&
          validKinds.has(node.kind),
      )
      .filter((node) => {
        if (nodeIds.has(node.id)) {
          return false;
        }

        nodeIds.add(node.id);
        return true;
      })
      .map((node) => ({
        createdAt: Number.isFinite(node.createdAt) ? node.createdAt : Date.now(),
        generationMode: node.generationMode,
        height: Math.max(120, Number(node.height) || 220),
        id: node.id,
        kind: node.kind,
        prompt: node.prompt,
        resultFileId: node.resultFileId,
        sourceFileId: node.sourceFileId,
        status: node.status ?? 'idle',
        title: node.title || '导入节点',
        width: Math.max(220, Number(node.width) || 330),
        workId: node.workId,
        x: Number.isFinite(node.x) ? node.x : 160,
        y: Number.isFinite(node.y) ? node.y : 160,
      }));

    if (importedNodes.length === 0) {
      throw new Error('文件里没有可用的画布节点');
    }

    const importedEdges = (Array.isArray(parsed.edges) ? parsed.edges : [])
      .filter(
        (edge) =>
          typeof edge?.id === 'string' &&
          nodeIds.has(edge.from) &&
          nodeIds.has(edge.to) &&
          edge.from !== edge.to,
      )
      .map((edge) => ({ from: edge.from, id: edge.id, to: edge.to }));
    const importedGroups = (Array.isArray(parsed.groups) ? parsed.groups : [])
      .filter((group) => typeof group?.id === 'string' && Array.isArray(group.nodeIds))
      .map((group) => ({
        color: group.color || '#647dff',
        id: group.id,
        nodeIds: group.nodeIds.filter((id) => nodeIds.has(id)),
        title: group.title || '导入分组',
      }))
      .filter((group) => group.nodeIds.length >= 2);

    commitHistory();
    nodes.value = importedNodes;
    edges.value = importedEdges;
    groups.value = importedGroups;
    canvasTitle.value = parsed.title?.trim() || file.name.replace(/\.json$/i, '') || '导入画布';
    viewport.value = parsed.viewport ?? { scale: 0.88, x: 28, y: 32 };
    clearSelection();
    batchSelectedIds.value = [];
    closeRailMenu();
    persistCanvas();
    showCanvasNotice(`已导入 ${importedNodes.length} 个节点`);
  } catch (error) {
    showCanvasNotice(error instanceof Error ? error.message : '工作流文件无法导入');
  }
}

function exportWorkflow(): void {
  const document: CanvasWorkflowDocument = {
    edges: edges.value.map((edge) => ({ ...edge })),
    groups: groups.value.map((group) => ({ ...group, nodeIds: [...group.nodeIds] })),
    nodes: nodes.value.map((node) => ({ ...node, previewUrl: undefined })),
    title: canvasTitle.value,
    version: 1,
    viewport: { ...viewport.value },
  };
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');

  anchor.href = url;
  anchor.download = `${canvasTitle.value || 'aurora-canvas'}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showCanvasNotice('工作流已导出');
}

function handleKeyboard(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  const isEditing =
    target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

  if (event.key === 'Escape') {
    if (angleDialogOpen.value) {
      closeAngleDialog();
    } else if (contextMenu.value) {
      contextMenu.value = null;
    } else if (nodeMenuNodeId.value) {
      closeNodeGenerationMenu();
    } else {
      closeRailMenu();
    }
    return;
  }

  if (isEditing) {
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateSelectedNode();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault();
    setSelection(
      nodes.value.map((node) => node.id),
      nodes.value.at(-1)?.id,
    );
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
    event.preventDefault();
    if (event.shiftKey) {
      ungroupSelection();
    } else {
      createGroupFromSelection();
    }
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    deleteSelectedNode();
  }
}

function edgeLine(edge: CanvasEdge): {
  endX: number;
  endY: number;
  startX: number;
  startY: number;
} {
  const source = nodes.value.find((node) => node.id === edge.from);
  const target = nodes.value.find((node) => node.id === edge.to);

  if (!source || !target) {
    return { endX: 0, endY: 0, startX: 0, startY: 0 };
  }

  return {
    endX: target.x,
    endY: target.y + target.height / 2,
    startX: source.x + source.width,
    startY: source.y + source.height / 2,
  };
}

watch(
  [nodes, edges, canvasTitle, viewport],
  () => {
    if (hydrated) {
      persistCanvas();
    }
  },
  { deep: true },
);

watch(
  () =>
    modelCatalog
      .modelsFor('image')
      .map((model) => model.alias)
      .join('|'),
  () => {
    selectedModel.value = modelCatalog.resolveAlias('image', selectedModel.value);
  },
  { immediate: true },
);

onMounted(() => {
  loadCanvas();
  void modelCatalog.load();
  void workspace.initialize();
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', finishPointerAction);
  window.addEventListener('keydown', handleKeyboard);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', finishPointerAction);
  window.removeEventListener('keydown', handleKeyboard);
  window.clearTimeout(saveTimer);
  window.clearTimeout(noticeTimer);

  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
});
</script>

<template>
  <section
    class="canvas-studio"
    :class="{ 'canvas-studio--without-inspiration': !inspirationOpen }"
  >
    <main
      ref="workspaceElement"
      class="canvas-workspace"
      :class="{ 'canvas-workspace--plain': activeRailMenu === 'inspiration' }"
      @pointerdown="handleCanvasPointerDown"
      @contextmenu.prevent="openCanvasContextMenu"
      @wheel="handleWheel"
    >
      <header class="canvas-topbar">
        <div class="canvas-topbar__title">
          <span class="canvas-topbar__mark">
            <NodeIndexOutlined />
          </span>
          <div>
            <strong>{{ canvasTitle }}</strong>
          </div>
        </div>

        <div class="canvas-topbar__actions">
          <span class="canvas-save-state" :class="`canvas-save-state--${saveState}`">
            <CloudSyncOutlined v-if="saveState === 'saving'" />
            <CheckOutlined v-else />
            {{ saveState === 'saving' ? '保存中' : `已自动保存 ${lastSavedAt}` }}
          </span>
          <button type="button" class="canvas-topbar__button" @click="persistCanvas">
            <SaveOutlined />
            保存
          </button>
          <button type="button" class="canvas-topbar__button" @click="createCanvas">
            <PlusOutlined />
            新建
          </button>
          <button
            type="button"
            class="canvas-topbar__icon-button"
            aria-label="画布帮助"
            @click="activeRailMenu = activeRailMenu === 'workflow' ? null : 'workflow'"
          >
            <QuestionCircleOutlined />
          </button>
          <button
            type="button"
            class="canvas-topbar__icon-button"
            aria-label="切换网格"
            @click="activeRailMenu = activeRailMenu === 'inspiration' ? null : 'inspiration'"
          >
            <BgColorsOutlined />
          </button>
        </div>
      </header>

      <aside class="canvas-rail" aria-label="画布工具栏">
        <button
          v-for="action in railActions"
          :key="action.label"
          type="button"
          :class="{ active: activeRailMenu === action.value }"
          :aria-label="action.label"
          @click.stop="openRail(action.value)"
        >
          <component :is="action.icon" />
        </button>
      </aside>

      <Transition name="canvas-pop">
        <div v-if="activeRailMenu === 'add'" class="canvas-rail-menu" @pointerdown.stop>
          <input
            ref="nodeUploadInput"
            type="file"
            accept="image/*"
            hidden
            @change="handleNodeUpload"
          />
          <button type="button" @click="nodeUploadInput?.click()">
            <UploadOutlined />
            <span>上传图片节点</span>
          </button>
          <button
            type="button"
            @click="
              activeRailMenu = 'assets';
              uploadCategory = 'other';
            "
          >
            <AppstoreOutlined />
            <span>添加素材</span>
            <ArrowRightOutlined />
          </button>
          <button type="button" @click="addPromptNode()">
            <PlusOutlined />
            <span>添加节点</span>
            <ArrowRightOutlined />
          </button>
          <i />
          <button type="button" :disabled="undoStack.length === 0" @click="undo">
            <UndoOutlined />
            <span>撤销</span>
            <small>Ctrl Z</small>
          </button>
          <button type="button" :disabled="redoStack.length === 0" @click="redo">
            <RedoOutlined />
            <span>重做</span>
            <small>Shift Ctrl Z</small>
          </button>
          <i />
          <button type="button" :disabled="!selectedNode" @click="duplicateSelectedNode">
            <CopyOutlined />
            <span>复制节点</span>
            <small>Ctrl D</small>
          </button>
          <button type="button" :disabled="selectedNodeCount < 2" @click="createGroupFromSelection">
            <AppstoreOutlined />
            <span>组合选中</span>
            <small>Ctrl G</small>
          </button>
          <button type="button" :disabled="selectedNodeCount === 0" @click="ungroupSelection">
            <CloseOutlined />
            <span>解散分组</span>
            <small>Shift Ctrl G</small>
          </button>
        </div>
      </Transition>

      <Transition name="canvas-pop">
        <section
          v-if="activeRailMenu === 'workflow'"
          class="canvas-floating-panel canvas-workflow-panel"
        >
          <header>
            <div>
              <button
                type="button"
                :class="{ active: activeWorkflowTab === 'mine' }"
                @click="activeWorkflowTab = 'mine'"
              >
                我的工作流
              </button>
              <button
                type="button"
                :class="{ active: activeWorkflowTab === 'samples' }"
                @click="activeWorkflowTab = 'samples'"
              >
                示例工作流
              </button>
            </div>
            <input
              ref="workflowImportInput"
              type="file"
              accept="application/json,.json"
              hidden
              @change="importWorkflow"
            />
            <button type="button" aria-label="导入工作流" @click="workflowImportInput?.click()">
              <UploadOutlined />
            </button>
            <button type="button" aria-label="导出工作流" @click="exportWorkflow">
              <DownloadOutlined />
            </button>
            <button type="button" aria-label="关闭工作流" @click="closeRailMenu">
              <CloseOutlined />
            </button>
          </header>
          <p>
            <BulbOutlined />
            工作流保存在本机，清理浏览器缓存会丢失，请注意备份。
          </p>
          <div class="canvas-workflow-grid">
            <button
              v-for="workflow in workflowForAsset()"
              :key="workflow.id"
              type="button"
              @click="loadWorkflow(workflow)"
            >
              <span>
                <NodeIndexOutlined />
              </span>
              <strong>{{ workflow.name }}</strong>
              <small>{{ workflow.nodes }} 个节点 · {{ workflow.updatedAt }}</small>
              <em>{{ workflow.description }}</em>
            </button>
          </div>
        </section>
      </Transition>

      <Transition name="canvas-pop">
        <section
          v-if="activeRailMenu === 'assets'"
          class="canvas-floating-panel canvas-asset-panel"
        >
          <header>
            <div>
              <strong>素材库</strong>
              <span>{{ assets.length + generatedWorks.length }} 项素材</span>
            </div>
            <button type="button" aria-label="关闭素材库" @click="closeRailMenu">
              <CloseOutlined />
            </button>
          </header>
          <nav>
            <button
              v-for="category in assetCategories"
              :key="category.value"
              type="button"
              :class="{ active: activeAssetCategory === category.value }"
              @click="activeAssetCategory = category.value"
            >
              {{ category.label }}
            </button>
          </nav>
          <div class="canvas-asset-upload-row">
            <select v-model="uploadCategory">
              <option
                v-for="category in assetCategories.filter((item) => item.value !== 'all')"
                :key="category.value"
                :value="category.value"
              >
                上传到{{ category.label }}
              </option>
            </select>
            <input
              ref="assetUploadInput"
              type="file"
              accept="image/*"
              multiple
              hidden
              @change="handleAssetUpload"
            />
            <button type="button" :disabled="uploadingAssets" @click="assetUploadInput?.click()">
              <LoadingOutlined v-if="uploadingAssets" />
              <UploadOutlined v-else />
              {{ uploadingAssets ? '上传中' : '上传素材' }}
            </button>
          </div>
          <p v-if="assetError" class="canvas-panel-error">{{ assetError }}</p>
          <div v-if="filteredAssets.length > 0" class="canvas-asset-grid">
            <button
              v-for="asset in filteredAssets"
              :key="asset.id"
              type="button"
              @click="chooseAsset(asset)"
            >
              <img
                v-if="asset.previewUrl || (asset.fileId && fileUrls[asset.fileId])"
                :src="assetPreviewUrl(asset)"
                :alt="asset.name"
              />
              <span v-else>
                <FileImageOutlined />
              </span>
              <strong>{{ asset.name }}</strong>
              <small>{{ categoryLabels[asset.category] }}</small>
            </button>
          </div>
          <div v-if="filteredAssets.length === 0" class="canvas-panel-empty">
            <FileImageOutlined />
            <strong>这个分类还没有素材</strong>
            <small>上传后会自动加入当前分类，也可以直接使用生成结果。</small>
          </div>
          <div v-if="generatedWorks.length > 0" class="canvas-generated-assets">
            <header>
              <strong>生成结果</strong>
              <span>点击添加到画布</span>
            </header>
            <div>
              <button
                v-for="work in generatedWorks"
                :key="work.id"
                type="button"
                @click="chooseGeneratedWork(work)"
              >
                <img :src="work.artworkUrl" :alt="work.prompt" />
                <span>{{ work.modelLabel }}</span>
              </button>
            </div>
          </div>
        </section>
      </Transition>

      <Transition name="canvas-pop">
        <section
          v-if="activeRailMenu === 'history'"
          class="canvas-floating-panel canvas-history-panel"
        >
          <header>
            <div>
              <button
                type="button"
                :class="{ active: activeHistoryTab === 'image' }"
                @click="activeHistoryTab = 'image'"
              >
                <PictureOutlined />
                图片历史
                <span>{{ imageHistory.length }}</span>
              </button>
              <button
                type="button"
                :class="{ active: activeHistoryTab === 'video' }"
                @click="activeHistoryTab = 'video'"
              >
                <VideoCameraOutlined />
                视频历史
                <span>0</span>
              </button>
            </div>
            <button type="button" aria-label="关闭历史" @click="closeRailMenu">
              <CloseOutlined />
            </button>
          </header>
          <div v-if="visibleHistory.length > 0" class="canvas-history-groups">
            <section>
              <h3>{{ historyDate(visibleHistory[0]?.createdAt ?? Date.now()) }}</h3>
              <div>
                <button
                  v-for="work in visibleHistory"
                  :key="work.id"
                  type="button"
                  @click="chooseGeneratedWork(work)"
                >
                  <span>
                    <img :src="work.artworkUrl" :alt="work.prompt" />
                  </span>
                  <strong>{{ work.prompt }}</strong>
                  <small>{{ formatTime(work.createdAt) }}</small>
                </button>
              </div>
            </section>
          </div>
          <div v-else class="canvas-panel-empty">
            <HistoryOutlined />
            <strong>{{
              activeHistoryTab === 'image' ? '还没有图片历史' : '还没有视频历史'
            }}</strong>
            <small>完成的创作结果会自动出现在这里。</small>
          </div>
        </section>
      </Transition>

      <Transition name="canvas-pop">
        <section
          v-if="activeRailMenu === 'batch'"
          class="canvas-floating-panel canvas-batch-panel"
          aria-label="批量生成"
        >
          <header>
            <div>
              <strong>批量生成</strong>
              <span>{{ selectedBatchNodes.length }} 项待处理</span>
            </div>
            <button type="button" aria-label="关闭批量生成" @click="closeRailMenu">
              <CloseOutlined />
            </button>
          </header>
          <nav>
            <button
              v-for="filter in batchFilters"
              :key="filter.value"
              type="button"
              :class="{ active: activeBatchFilter === filter.value }"
              @click="
                activeBatchFilter = filter.value;
                batchSelectedIds = [];
              "
            >
              {{ filter.label }}
              <span>
                {{
                  filter.value === 'all'
                    ? nodes.filter(
                        (node) =>
                          node.kind === 'image' || node.kind === 'output' || node.kind === 'video',
                      ).length
                    : filter.value === 'failed'
                      ? nodes.filter((node) => nodeStatus(node) === 'failed').length
                      : nodes.filter(
                          (node) =>
                            nodeStatus(node) !== 'done' &&
                            (node.kind === 'image' ||
                              node.kind === 'output' ||
                              node.kind === 'video'),
                        ).length
                }}
              </span>
            </button>
          </nav>
          <div class="canvas-batch-toolbar">
            <button type="button" @click="selectAllBatchNodes">
              {{ batchSelectedIds.length > 0 ? '清空选择' : '选择全部' }}
            </button>
            <span>单线程队列，避免重复计费</span>
          </div>
          <div v-if="batchCandidates.length > 0" class="canvas-batch-list">
            <label
              v-for="node in batchCandidates"
              :key="node.id"
              :class="{ selected: batchSelectedIds.includes(node.id) }"
            >
              <input
                type="checkbox"
                :checked="batchSelectedIds.includes(node.id)"
                :disabled="nodeStatus(node) === 'done' || batchRunning"
                @change="toggleBatchNodeSelection(node.id)"
              />
              <span>
                <strong>{{ node.title }}</strong>
                <small>{{ node.prompt || '未填写生成描述' }}</small>
              </span>
              <em :class="`status-${nodeStatus(node)}`">{{ statusLabel(nodeStatus(node)) }}</em>
            </label>
          </div>
          <div v-else class="canvas-panel-empty">
            <ThunderboltFilled />
            <strong>没有符合条件的节点</strong>
            <small>从图片节点生成图片、视频或本地模型任务后，可在统一队列里提交。</small>
          </div>
          <footer>
            <span>
              <ThunderboltFilled />
              预计 {{ batchCost }} 积分
            </span>
            <button
              v-if="batchRunning"
              type="button"
              class="danger"
              @click="batchCancelRequested = true"
            >
              停止后续任务
            </button>
            <button
              v-else
              type="button"
              class="primary"
              :disabled="selectedBatchNodes.length === 0"
              @click="runBatchGeneration"
            >
              开始生成
            </button>
          </footer>
        </section>
      </Transition>

      <div
        class="canvas-world"
        :style="{
          height: `${WORLD_HEIGHT}px`,
          transform: canvasTransform,
          width: `${WORLD_WIDTH}px`,
        }"
      >
        <svg
          class="canvas-edges"
          :height="WORLD_HEIGHT"
          :viewBox="`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`"
          :width="WORLD_WIDTH"
        >
          <defs>
            <linearGradient id="canvas-edge-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stop-color="#4b7ef4" />
              <stop offset="1" stop-color="#7a6cf4" />
            </linearGradient>
          </defs>
          <path
            v-for="edge in edges"
            :key="edge.id"
            :d="`M ${edgeLine(edge).startX} ${edgeLine(edge).startY} C ${
              edgeLine(edge).startX + 110
            } ${edgeLine(edge).startY}, ${edgeLine(edge).endX - 110} ${
              edgeLine(edge).endY
            }, ${edgeLine(edge).endX} ${edgeLine(edge).endY}`"
            fill="none"
            stroke="url(#canvas-edge-gradient)"
            stroke-linecap="round"
            stroke-width="2"
          />
        </svg>

        <section
          v-for="group in groups"
          :key="group.id"
          class="canvas-node-group"
          :style="{
            height: `${groupBounds(group).height}px`,
            left: `${groupBounds(group).x}px`,
            top: `${groupBounds(group).y}px`,
            width: `${groupBounds(group).width}px`,
            '--group-color': group.color,
          }"
        >
          <header @pointerdown.stop>
            <span>
              <AppstoreOutlined />
              {{ group.title }}
              <small>{{ group.nodeIds.length }} 个节点</small>
            </span>
            <button type="button" aria-label="解散分组" @click="removeGroup(group.id)">
              <CloseOutlined />
            </button>
          </header>
        </section>

        <article
          v-for="node in nodes"
          :key="node.id"
          class="canvas-node"
          :class="[
            `canvas-node--${node.kind}`,
            {
              'canvas-node--connecting': connectionFromId === node.id,
              'canvas-node--menu-open': nodeMenuNodeId === node.id,
              'canvas-node--selected': isNodeSelected(node.id),
            },
          ]"
          :style="{
            height: `${node.height}px`,
            left: `${node.x}px`,
            top: `${node.y}px`,
            width: `${node.width}px`,
          }"
          @pointerdown="handleNodePointerDown($event, node)"
          @contextmenu.prevent.stop="openNodeContextMenu($event, node)"
        >
          <div v-if="selectedNodeId === node.id" class="canvas-node__toolbar" @pointerdown.stop>
            <span v-if="selectedNodeCount > 1" class="canvas-node__selection-count">
              已选 {{ selectedNodeCount }} 项
            </span>
            <button
              type="button"
              class="canvas-node__toolbar-generate"
              aria-label="从该节点生成"
              @click="toggleNodeGenerationMenu(node.id)"
            >
              <ThunderboltFilled />
              <span>从该节点生成</span>
            </button>
            <button type="button" aria-label="调整视角" @click="resetViewport">
              <ExpandOutlined />
              <span>调整视角</span>
            </button>
            <button type="button" aria-label="上传替换图片" @click="nodeUploadInput?.click()">
              <UploadOutlined />
              <span>上传</span>
            </button>
            <button type="button" aria-label="编辑节点" @click="editSelectedNode">
              <EditOutlined />
            </button>
            <button type="button" aria-label="下载节点" @click="downloadSelectedNode">
              <DownloadOutlined />
            </button>
            <button type="button" aria-label="复制节点" @click="duplicateSelectedNode">
              <CopyOutlined />
            </button>
            <button type="button" aria-label="连接节点" @click="startConnection(node.id)">
              <LinkOutlined />
            </button>
            <button type="button" aria-label="更多操作" @click="deleteSelectedNode">
              <MoreOutlined />
            </button>
          </div>

          <Transition name="canvas-pop">
            <section
              v-if="nodeMenuNodeId === node.id"
              class="canvas-node__generate-menu"
              aria-label="从该节点生成"
              @pointerdown.stop
            >
              <header>
                <strong>从该节点生成</strong>
                <button type="button" aria-label="关闭生成菜单" @click="closeNodeGenerationMenu">
                  <CloseOutlined />
                </button>
              </header>

              <div class="canvas-node__generate-group">
                <button type="button" @click="runNodeGenerationAction('text', node)">
                  <span><EditOutlined /></span>
                  <span>
                    <strong>文本生成</strong>
                    <small>提炼文案、广告语与品牌表达</small>
                  </span>
                </button>
                <button type="button" @click="runNodeGenerationAction('image', node)">
                  <span><PictureOutlined /></span>
                  <span>
                    <strong>图像生成</strong>
                    <small>基于当前图片继续创作</small>
                  </span>
                </button>
                <button type="button" @click="runNodeGenerationAction('video', node)">
                  <span><VideoCameraOutlined /></span>
                  <span>
                    <strong>视频生成</strong>
                    <small>将当前画面延展为视频任务</small>
                  </span>
                </button>
              </div>

              <h4>本地模型（开源）</h4>
              <div class="canvas-node__generate-group">
                <button type="button" @click="runNodeGenerationAction('local-image', node)">
                  <span><FileImageOutlined /></span>
                  <span>
                    <strong>本地图像模型</strong>
                    <small>使用本地部署的图像模型</small>
                  </span>
                  <em>新</em>
                </button>
                <button type="button" @click="runNodeGenerationAction('local-video', node)">
                  <span><VideoCameraOutlined /></span>
                  <span>
                    <strong>本地视频模型</strong>
                    <small>本地动画与视频生成流程</small>
                  </span>
                  <em>新</em>
                </button>
              </div>

              <div
                v-if="node.kind === 'image' || node.kind === 'output'"
                class="canvas-node__generate-angle"
              >
                <button type="button" @click="runNodeGenerationAction('angle', node)">
                  <span><ExpandOutlined /></span>
                  <span>
                    <strong>调整角度</strong>
                    <small>通过 3D 视角控制生成新视角</small>
                  </span>
                </button>
              </div>
            </section>
          </Transition>

          <button
            class="canvas-node__port canvas-node__port--in"
            type="button"
            aria-label="输入连接点"
            @pointerdown.stop
            @click.stop="connectNode(node.id)"
          />
          <button
            class="canvas-node__port canvas-node__port--out"
            type="button"
            aria-label="从该节点生成"
            @pointerdown.stop
            @click.stop="toggleNodeGenerationMenu(node.id)"
          >
            <PlusOutlined />
          </button>

          <header v-if="node.kind !== 'prompt'" class="canvas-node__header">
            <span>{{ node.title }}</span>
            <em v-if="nodeStatus(node) !== 'idle'" :class="nodeStatus(node)">
              {{ statusLabel(nodeStatus(node)) }}
            </em>
            <button
              type="button"
              aria-label="删除节点"
              @pointerdown.stop
              @click.stop="deleteSelectedNode"
            >
              <CloseOutlined />
            </button>
          </header>

          <div
            v-if="node.kind === 'prompt'"
            class="canvas-node__prompt"
            @dblclick.stop="editSelectedNode"
          >
            <span>
              <BulbOutlined />
              创作指令
            </span>
            <p>{{ node.prompt }}</p>
            <footer>
              <small>{{ formatTime(node.createdAt) }}</small>
              <button type="button" @pointerdown.stop @click.stop="editSelectedNode">编辑</button>
            </footer>
          </div>

          <div v-else class="canvas-node__visual">
            <video
              v-if="node.kind === 'video' && nodeStatus(node) === 'done' && node.previewUrl"
              :src="node.previewUrl"
              controls
              muted
            />
            <img
              v-else-if="nodeImageUrl(node) && nodeStatus(node) === 'done'"
              :src="nodeImageUrl(node)"
              :alt="node.prompt"
              draggable="false"
            />
            <GalleryArtwork
              v-else-if="nodeStatus(node) === 'done'"
              :title="node.prompt"
              :variant="node.id.length % 8"
            />
            <div
              v-else-if="nodeStatus(node) === 'failed'"
              class="canvas-node__state canvas-node__state--failed"
            >
              <CloseOutlined />
              <strong>生成失败</strong>
              <small>{{ nodeError(node) || '请调整参数后重试' }}</small>
            </div>
            <div
              v-else-if="node.kind === 'video'"
              class="canvas-node__state canvas-node__state--video"
            >
              <VideoCameraOutlined />
              <strong>{{ node.title }}</strong>
              <small>等待视频任务生成</small>
            </div>
            <div v-else class="canvas-node__state canvas-node__state--loading">
              <LoadingOutlined />
              <strong>{{ statusLabel(nodeStatus(node)) }}</strong>
              <small>正在同步画布结果</small>
            </div>
          </div>

          <footer v-if="node.kind !== 'prompt'" class="canvas-node__meta">
            <span>{{ node.kind === 'video' ? 'Video' : 'Image' }}</span>
            <small>{{ node.width }} × {{ node.height }}</small>
          </footer>
        </article>
      </div>

      <div class="canvas-zoom-control">
        <span>Zoom</span>
        <input
          type="range"
          min="42"
          max="155"
          :value="Math.round(viewport.scale * 100)"
          @input="setZoom(Number(($event.target as HTMLInputElement).value) / 100)"
        />
        <strong>{{ Math.round(viewport.scale * 100) }}%</strong>
        <button type="button" aria-label="缩小画布" @click="changeZoom(-0.08)">
          <ZoomOutOutlined />
        </button>
        <button type="button" aria-label="放大画布" @click="changeZoom(0.08)">
          <ZoomInOutlined />
        </button>
      </div>

      <div class="canvas-composer" @pointerdown.stop>
        <textarea
          v-model="composerPrompt"
          maxlength="1000"
          placeholder="描述你想生成的内容..."
          @keydown.ctrl.enter="submitComposer"
        />
        <small>{{ composerPrompt.length }} / 1000</small>
        <footer>
          <label>
            <select v-model="selectedModel">
              <option v-for="model in generationModels" :key="model.value" :value="model.value">
                {{ model.label }}
              </option>
            </select>
          </label>
          <label>
            <select v-model="selectedRatio">
              <option v-for="ratio in ['16:9', '9:16', '1:1', '4:3', '3:4']" :key="ratio">
                {{ ratio }}
              </option>
            </select>
          </label>
          <label>
            <select v-model="selectedSize">
              <option v-for="size in ['1K', '2K', '4K']" :key="size">
                {{ size }}
              </option>
            </select>
          </label>
          <span>
            <ThunderboltFilled />
            {{ composerCost }}
          </span>
          <button
            type="button"
            :disabled="!composerPrompt.trim() || submitting"
            @click="submitComposer"
          >
            <LoadingOutlined v-if="submitting" />
            <ArrowRightOutlined v-else />
          </button>
        </footer>
      </div>

      <Transition name="canvas-pop">
        <div
          v-if="contextMenu"
          class="canvas-context-menu"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          @pointerdown.stop
          @contextmenu.prevent
        >
          <header>
            <strong>{{ contextMenu.kind === 'node' ? '节点操作' : '画布操作' }}</strong>
            <small>{{ contextMenu.kind === 'node' ? '右键快捷菜单' : '自动布局与编辑' }}</small>
          </header>
          <template v-if="contextMenu.kind === 'node'">
            <button type="button" @click="openContextNodeGeneration">
              <ThunderboltFilled />
              <span>从该节点生成</span>
            </button>
            <button type="button" @click="duplicateSelectedNode">
              <CopyOutlined />
              <span>复制节点</span>
            </button>
            <button
              type="button"
              :disabled="selectedNodeCount < 2"
              @click="createGroupFromSelection"
            >
              <AppstoreOutlined />
              <span>组合选中</span>
            </button>
            <button type="button" @click="ungroupSelection">
              <CloseOutlined />
              <span>解散所在分组</span>
            </button>
            <i />
            <button type="button" class="danger" @click="deleteSelectedNode">
              <DeleteOutlined />
              <span>删除{{ selectedNodeCount > 1 ? ` ${selectedNodeCount} 个节点` : '节点' }}</span>
            </button>
          </template>
          <template v-else>
            <button type="button" @click="addPromptNodeFromContextMenu">
              <PlusOutlined />
              <span>添加创作指令</span>
            </button>
            <button type="button" @click="autoLayoutCanvas">
              <AppstoreOutlined />
              <span>自动整理布局</span>
            </button>
            <button type="button" @click="fitCanvasView">
              <ExpandOutlined />
              <span>适应全部节点</span>
            </button>
            <button type="button" @click="exportWorkflow">
              <DownloadOutlined />
              <span>导出当前工作流</span>
            </button>
          </template>
        </div>
      </Transition>

      <div v-if="canvasNotice" class="canvas-notice" role="status">
        <CheckOutlined />
        {{ canvasNotice }}
      </div>

      <div v-if="workspace.error" class="canvas-error" role="alert">
        <span>{{ workspace.error.message }}</span>
        <button type="button" @click="workspace.clearError">关闭</button>
      </div>
    </main>

    <aside v-if="inspirationOpen" class="canvas-inspiration" @pointerdown.stop>
      <header>
        <strong>灵感画板</strong>
        <div>
          <button type="button" aria-label="历史" @click="activeRailMenu = 'history'">
            <HistoryOutlined />
          </button>
          <button type="button" aria-label="关闭灵感画板" @click="inspirationOpen = false">
            <CloseOutlined />
          </button>
        </div>
      </header>

      <section class="canvas-inspiration__intro">
        <h2>你好，Creator</h2>
        <strong class="canvas-inspiration__eyebrow">在找灵感吗？</strong>
        <div>
          <span class="canvas-inspiration__preview">
            <img src="/showcase/concept-v1.png" alt="灵感画板示例" />
          </span>
          <p>
            将图片或视频节点拖入聊天框，可解锁高级功能：基于节点内容生成提示词，为你的创作提供更多灵感~
          </p>
        </div>
        <button type="button" @click="addPromptNode()">我知道了</button>
      </section>

      <section v-if="generatedWorks.length > 0" class="canvas-inspiration__history">
        <header>
          <strong>最近创作</strong>
          <button type="button" @click="activeRailMenu = 'history'">全部</button>
        </header>
        <div v-if="generatedWorks.length > 0">
          <button
            v-for="work in generatedWorks.slice(0, 3)"
            :key="work.id"
            type="button"
            @click="chooseGeneratedWork(work)"
          >
            <img :src="work.artworkUrl" :alt="work.prompt" />
            <span>{{ work.prompt }}</span>
          </button>
        </div>
        <p v-else>完成图片或视频任务后，作品会出现在这里。</p>
      </section>

      <label class="canvas-inspiration__composer">
        <textarea
          v-model="inspirationMessage"
          placeholder="开始你的灵感之旅..."
          @keydown.ctrl.enter="sendInspiration"
        />
        <footer>
          <button type="button" aria-label="添加素材" @click="activeRailMenu = 'assets'">
            <PaperClipOutlined />
          </button>
          <button type="button" aria-label="浏览素材" @click="activeRailMenu = 'assets'">
            <GlobalOutlined />
          </button>
          <button type="button" aria-label="画布设置" @click="resetViewport">
            <SettingOutlined />
          </button>
          <button type="button" aria-label="发送" @click="sendInspiration">
            <SendOutlined />
          </button>
        </footer>
      </label>
    </aside>

    <button
      v-if="!inspirationOpen"
      type="button"
      class="canvas-inspiration-toggle"
      aria-label="打开灵感画板"
      @click="inspirationOpen = true"
    >
      <BulbOutlined />
    </button>

    <Transition name="canvas-fade">
      <div
        v-if="angleDialogOpen"
        class="canvas-angle-backdrop"
        @pointerdown.self="closeAngleDialog"
      >
        <section
          class="canvas-angle-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="canvas-angle-title"
          @pointerdown.stop
        >
          <header>
            <div>
              <strong id="canvas-angle-title">3D 视角控制</strong>
              <small>调整镜头位置，生成同一主体的新视角</small>
            </div>
            <div>
              <button
                type="button"
                :disabled="angleGenerating"
                @click="
                  angleRotation = 24;
                  angleTilt = 12;
                "
              >
                重置
              </button>
              <button
                type="button"
                aria-label="关闭 3D 视角控制"
                :disabled="angleGenerating"
                @click="closeAngleDialog"
              >
                <CloseOutlined />
              </button>
            </div>
          </header>

          <div class="canvas-angle-dialog__legend">
            <span><i class="rotation" />Rotation (+/-)</span>
            <span><i class="tilt" />Vertical Tilt (+/-)</span>
          </div>

          <div class="canvas-angle-stage">
            <div class="canvas-angle-stage__grid" />
            <span class="canvas-angle-stage__orbit canvas-angle-stage__orbit--pink" />
            <span class="canvas-angle-stage__orbit canvas-angle-stage__orbit--green" />
            <span
              class="canvas-angle-stage__camera"
              :style="{
                transform: `translate(-50%, -50%) rotate(${angleRotation}deg) translateX(102px) rotate(${-angleRotation}deg) translateY(${angleTilt * 0.45}px)`,
              }"
            >
              <i />
            </span>
            <span class="canvas-angle-stage__axis canvas-angle-stage__axis--x" />
            <span class="canvas-angle-stage__axis canvas-angle-stage__axis--y" />
            <span class="canvas-angle-stage__axis canvas-angle-stage__axis--z" />
            <span class="canvas-angle-stage__subject">
              <PictureOutlined />
              <i />
            </span>
            <span class="canvas-angle-stage__target" />
            <output>{{ anglePreviewLabel }}</output>
          </div>

          <div class="canvas-angle-dialog__controls">
            <label>
              <span>横向旋转</span>
              <input
                v-model.number="angleRotation"
                type="range"
                min="-90"
                max="90"
                step="1"
                :disabled="angleGenerating"
              />
              <strong>{{ angleRotation >= 0 ? '+' : '' }}{{ angleRotation }}°</strong>
            </label>
            <label>
              <span>垂直俯仰</span>
              <input
                v-model.number="angleTilt"
                type="range"
                min="-45"
                max="45"
                step="1"
                :disabled="angleGenerating"
              />
              <strong>{{ angleTilt >= 0 ? '+' : '' }}{{ angleTilt }}°</strong>
            </label>
          </div>

          <p v-if="angleError" class="canvas-angle-dialog__error" role="alert">
            {{ angleError }}
          </p>

          <button
            type="button"
            class="canvas-angle-dialog__submit"
            :disabled="angleGenerating"
            @click="generateAngleView"
          >
            <LoadingOutlined v-if="angleGenerating" />
            <ExpandOutlined v-else />
            {{ angleGenerating ? '正在提交新视角' : '生成新视角' }}
          </button>
        </section>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.canvas-studio {
  --canvas-accent: #6b4cff;
  display: grid;
  height: calc(100vh - 56px);
  min-height: 680px;
  grid-template-columns: minmax(0, 1fr) 360px;
  overflow: hidden;
  background: #050506;
  color: #f4f5f8;
}

.canvas-studio--without-inspiration {
  grid-template-columns: minmax(0, 1fr);
}

.canvas-workspace {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background-color: #050506;
  background-image: radial-gradient(circle, rgb(96 98 108 / 70%) 1px, transparent 1px);
  background-size: 22px 22px;
  cursor: grab;
  user-select: none;
}

.canvas-workspace:active {
  cursor: grabbing;
}

.canvas-workspace--plain {
  background-image:
    radial-gradient(circle, rgb(96 98 108 / 56%) 1px, transparent 1px),
    radial-gradient(circle at 42% 35%, rgb(92 68 208 / 7%), transparent 360px);
}

.canvas-topbar {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 30;
  display: flex;
  height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 15px 0 18px;
  background: linear-gradient(180deg, rgb(5 5 6 / 88%), rgb(5 5 6 / 0%));
  pointer-events: none;
}

.canvas-topbar > * {
  pointer-events: auto;
}

.canvas-topbar__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.canvas-topbar__mark {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 8px;
  background: linear-gradient(145deg, #8b71ff, #5b36ee);
  box-shadow: 0 7px 20px rgb(92 55 237 / 30%);
  color: #fff;
  font-size: 15px;
}

.canvas-topbar__title > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.canvas-topbar__title strong {
  overflow: hidden;
  color: #f6f7fb;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-topbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.canvas-save-state,
.canvas-topbar__button,
.canvas-topbar__icon-button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: rgb(30 31 36 / 92%);
  color: #d5d7dd;
  font-size: 8px;
  font-weight: 700;
  backdrop-filter: blur(12px);
}

.canvas-save-state {
  padding: 0 10px;
  color: #818793;
}

.canvas-save-state--saving {
  color: #9d8cff;
}

.canvas-topbar__button {
  padding: 0 12px;
  cursor: pointer;
}

.canvas-topbar__button:hover,
.canvas-topbar__icon-button:hover {
  border-color: rgb(255 255 255 / 18%);
  background: #292a31;
  color: #fff;
}

.canvas-topbar__icon-button {
  width: 34px;
  padding: 0;
  cursor: pointer;
}

.canvas-topbar__icon-button:last-child {
  border-color: rgb(245 180 71 / 30%);
  background: rgb(55 41 21 / 72%);
  color: #f2b552;
  font-size: 15px;
}

.canvas-rail {
  position: absolute;
  top: 31%;
  left: 18px;
  z-index: 31;
  display: grid;
  width: 40px;
  gap: 3px;
  padding: 4px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 14px;
  background: rgb(24 25 29 / 96%);
  box-shadow: 0 16px 36px rgb(0 0 0 / 30%);
  backdrop-filter: blur(14px);
}

.canvas-rail button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #a7abb5;
  font-size: 14px;
  cursor: pointer;
}

.canvas-rail button:hover,
.canvas-rail button.active {
  background: #303138;
  color: #fff;
}

.canvas-rail button:first-child {
  width: 32px;
  height: 32px;
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 999px;
  background: #f2f3f5;
  color: #1d1e23;
  box-shadow: 0 5px 14px rgb(0 0 0 / 28%);
  font-size: 17px;
}

.canvas-rail button:first-child.active,
.canvas-rail button:first-child:hover {
  background: #fff;
}

.canvas-rail button:last-child {
  border-top: 1px solid rgb(255 255 255 / 7%);
  border-radius: 8px;
}

.canvas-rail-menu {
  position: absolute;
  top: calc(31% - 4px);
  left: 68px;
  z-index: 36;
  display: grid;
  width: 226px;
  gap: 3px;
  padding: 9px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 10px;
  background: rgb(29 30 34 / 98%);
  box-shadow: 0 22px 50px rgb(0 0 0 / 42%);
  backdrop-filter: blur(16px);
}

.canvas-rail-menu > i {
  height: 1px;
  margin: 4px 0;
  background: rgb(255 255 255 / 7%);
}

.canvas-rail-menu button {
  display: grid;
  min-height: 38px;
  align-items: center;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #d9dbe1;
  font-size: 10px;
  text-align: left;
  cursor: pointer;
}

.canvas-rail-menu button:hover:not(:disabled) {
  background: #2a2b31;
  color: #fff;
}

.canvas-rail-menu button:disabled {
  color: #5f636e;
  cursor: default;
}

.canvas-rail-menu button :deep(svg) {
  color: #a7abb6;
}

.canvas-rail-menu button small {
  color: #727783;
  font-size: 7px;
}

.canvas-floating-panel {
  position: absolute;
  z-index: 38;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 11px;
  background: rgb(30 31 35 / 98%);
  box-shadow: 0 24px 58px rgb(0 0 0 / 45%);
  backdrop-filter: blur(18px);
}

.canvas-floating-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.canvas-floating-panel > header button {
  border: 0;
  background: transparent;
  color: #a0a5b0;
  cursor: pointer;
}

.canvas-workflow-panel {
  top: 190px;
  left: 68px;
  width: min(680px, calc(100% - 96px));
  padding: 15px;
}

.canvas-workflow-panel > header > div {
  display: flex;
  gap: 18px;
}

.canvas-workflow-panel > header > div button {
  position: relative;
  height: 26px;
  padding: 0;
  color: #777d89;
  font-size: 11px;
  font-weight: 740;
}

.canvas-workflow-panel > header > div button.active {
  color: #fff;
}

.canvas-workflow-panel > header > div button.active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 999px;
  background: #fff;
  content: '';
}

.canvas-workflow-panel > header > button,
.canvas-asset-panel > header > button,
.canvas-history-panel > header > button,
.canvas-batch-panel > header > button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 6px;
}

.canvas-workflow-panel > header > button:hover,
.canvas-asset-panel > header > button:hover,
.canvas-history-panel > header > button:hover,
.canvas-batch-panel > header > button:hover {
  background: #34353b;
  color: #fff;
}

.canvas-workflow-panel > p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 9px 0 14px;
  color: #777d89;
  font-size: 8px;
}

.canvas-workflow-grid {
  display: grid;
  gap: 9px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.canvas-workflow-grid > button {
  display: grid;
  min-width: 0;
  min-height: 138px;
  justify-items: start;
  padding: 13px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: #292a30;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.canvas-workflow-grid > button:hover {
  border-color: rgb(124 100 255 / 62%);
  background: #303138;
}

.canvas-workflow-grid > button > span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 9px;
  background: linear-gradient(145deg, #7357ef, #4e39ba);
  color: #fff;
}

.canvas-workflow-grid strong {
  font-size: 10px;
}

.canvas-workflow-grid small {
  margin-top: 4px;
  color: #858a96;
  font-size: 7px;
}

.canvas-workflow-grid em {
  margin-top: 9px;
  color: #737985;
  font-size: 7px;
  font-style: normal;
  line-height: 1.5;
}

.canvas-asset-panel {
  top: 114px;
  left: 68px;
  width: min(590px, calc(100% - 96px));
  max-height: min(650px, calc(100% - 136px));
  overflow: auto;
  padding: 15px;
  scrollbar-width: thin;
}

.canvas-asset-panel > header > div {
  display: grid;
  gap: 3px;
}

.canvas-asset-panel > header strong {
  color: #fff;
  font-size: 12px;
}

.canvas-asset-panel > header span {
  color: #737985;
  font-size: 7px;
}

.canvas-asset-panel > nav {
  display: flex;
  gap: 5px;
  margin: 14px 0 12px;
}

.canvas-asset-panel > nav button {
  height: 27px;
  padding: 0 9px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 6px;
  background: #27282e;
  color: #9297a2;
  font-size: 8px;
  cursor: pointer;
}

.canvas-asset-panel > nav button.active {
  border-color: rgb(114 91 255 / 60%);
  background: #36304f;
  color: #c9bcff;
}

.canvas-asset-upload-row {
  display: grid;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-bottom: 12px;
}

.canvas-asset-upload-row select,
.canvas-asset-upload-row button {
  height: 33px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 7px;
  background: #24252a;
  color: #c3c6ce;
  font-size: 8px;
}

.canvas-asset-upload-row select {
  padding: 0 9px;
}

.canvas-asset-upload-row button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  cursor: pointer;
}

.canvas-panel-error {
  margin: 0 0 10px;
  color: #ef8d85;
  font-size: 8px;
}

.canvas-asset-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.canvas-asset-grid > button {
  display: grid;
  min-width: 0;
  overflow: hidden;
  padding: 0 0 8px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: #27282e;
  color: #e7e8ec;
  text-align: left;
  cursor: pointer;
}

.canvas-asset-grid > button:hover {
  border-color: rgb(114 91 255 / 60%);
}

.canvas-asset-grid img,
.canvas-asset-grid > button > span {
  display: grid;
  width: 100%;
  aspect-ratio: 1 / 0.74;
  place-items: center;
  background: #1b1c21;
  color: #6e7480;
  object-fit: cover;
}

.canvas-asset-grid strong {
  overflow: hidden;
  margin: 7px 8px 0;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-asset-grid small {
  margin: 3px 8px 0;
  color: #777d89;
  font-size: 7px;
}

.canvas-panel-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 7px;
  border: 1px dashed rgb(255 255 255 / 10%);
  border-radius: 8px;
  color: #707682;
  text-align: center;
}

.canvas-panel-empty :deep(svg) {
  font-size: 20px;
}

.canvas-panel-empty strong {
  color: #b9bdc6;
  font-size: 9px;
}

.canvas-panel-empty small {
  max-width: 240px;
  font-size: 7px;
  line-height: 1.5;
}

.canvas-generated-assets {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgb(255 255 255 / 8%);
}

.canvas-generated-assets > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.canvas-generated-assets > header strong {
  font-size: 9px;
}

.canvas-generated-assets > header span {
  color: #737985;
  font-size: 7px;
}

.canvas-generated-assets > div {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.canvas-generated-assets button {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 7px;
  background: #1b1c21;
  cursor: pointer;
}

.canvas-generated-assets img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.canvas-generated-assets button span {
  position: absolute;
  right: 3px;
  bottom: 3px;
  left: 3px;
  overflow: hidden;
  padding: 3px 4px;
  border-radius: 4px;
  background: rgb(8 9 12 / 72%);
  color: #fff;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-history-panel {
  top: 230px;
  left: 68px;
  width: min(820px, calc(100% - 96px));
  max-height: min(560px, calc(100% - 260px));
  overflow: auto;
  padding: 15px;
  scrollbar-width: thin;
}

.canvas-history-panel > header > div {
  display: flex;
  align-items: center;
  gap: 16px;
}

.canvas-history-panel > header > div button {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0;
  color: #858b96;
  font-size: 10px;
  font-weight: 720;
}

.canvas-history-panel > header > div button.active {
  color: #fff;
}

.canvas-history-panel > header > div button span {
  padding: 1px 5px;
  border-radius: 999px;
  background: #36373d;
  color: #8f949f;
  font-size: 7px;
}

.canvas-history-groups h3 {
  margin: 14px 0 9px;
  color: #858b96;
  font-size: 9px;
  font-weight: 600;
}

.canvas-history-groups > section > div {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.canvas-history-groups button {
  display: grid;
  min-width: 0;
  overflow: hidden;
  padding: 0 0 8px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: #28292f;
  color: #e7e8ec;
  text-align: left;
  cursor: pointer;
}

.canvas-history-groups button > span {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 0.7;
  overflow: hidden;
  background: #1b1c21;
}

.canvas-history-groups img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.canvas-history-groups strong {
  display: -webkit-box;
  overflow: hidden;
  margin: 7px 8px 0;
  font-size: 7px;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.canvas-history-groups small {
  margin: 4px 8px 0;
  color: #777d89;
  font-size: 7px;
}

.canvas-batch-panel {
  top: 206px;
  left: 68px;
  display: grid;
  width: min(540px, calc(100% - 96px));
  max-height: min(620px, calc(100% - 236px));
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  overflow: hidden;
  padding: 15px;
}

.canvas-batch-panel > header > div {
  display: grid;
  gap: 3px;
}

.canvas-batch-panel > header strong {
  color: #fff;
  font-size: 12px;
}

.canvas-batch-panel > header span,
.canvas-batch-toolbar span,
.canvas-batch-panel > footer > span {
  color: #878d99;
  font-size: 8px;
}

.canvas-batch-panel > nav {
  display: flex;
  gap: 5px;
  margin: 13px 0 9px;
}

.canvas-batch-panel > nav button {
  display: inline-flex;
  height: 29px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 7px;
  background: #26272d;
  color: #969ba6;
  font-size: 8px;
  cursor: pointer;
}

.canvas-batch-panel > nav button.active {
  border-color: rgb(111 91 234 / 68%);
  background: #36304f;
  color: #d5ccff;
}

.canvas-batch-panel > nav button span {
  min-width: 16px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgb(255 255 255 / 7%);
  font-size: 7px;
  text-align: center;
}

.canvas-batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 34px;
  padding: 0 2px 9px;
  border-bottom: 1px solid rgb(255 255 255 / 7%);
}

.canvas-batch-toolbar button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #a596ff;
  font-size: 8px;
  font-weight: 720;
  cursor: pointer;
}

.canvas-batch-list {
  display: grid;
  align-content: start;
  gap: 5px;
  min-height: 132px;
  margin-top: 9px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.canvas-batch-list label {
  display: grid;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  gap: 9px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 7px 9px;
  border: 1px solid rgb(255 255 255 / 7%);
  border-radius: 8px;
  background: #27282e;
  cursor: pointer;
}

.canvas-batch-list label:hover,
.canvas-batch-list label.selected {
  border-color: rgb(111 91 234 / 58%);
  background: #302d3d;
}

.canvas-batch-list input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #6d5de8;
}

.canvas-batch-list label > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.canvas-batch-list strong,
.canvas-batch-list small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-batch-list strong {
  color: #e9eaf0;
  font-size: 9px;
}

.canvas-batch-list small {
  color: #7f8591;
  font-size: 7px;
}

.canvas-batch-list em {
  padding: 3px 6px;
  border-radius: 999px;
  background: #383a41;
  color: #aeb3bd;
  font-size: 7px;
  font-style: normal;
}

.canvas-batch-list em.status-done {
  background: #21372f;
  color: #70d0ab;
}

.canvas-batch-list em.status-failed {
  background: #45272a;
  color: #f0958e;
}

.canvas-batch-list em.status-generating,
.canvas-batch-list em.status-queued {
  background: #283754;
  color: #8eafff;
}

.canvas-batch-panel > footer {
  display: flex;
  min-height: 42px;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid rgb(255 255 255 / 7%);
}

.canvas-batch-panel > footer > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: auto;
  color: #f1b654;
}

.canvas-batch-panel > footer > button {
  height: 32px;
  padding: 0 14px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 7px;
  background: #33353c;
  color: #e7e8ec;
  font-size: 8px;
  font-weight: 720;
  cursor: pointer;
}

.canvas-batch-panel > footer > button.primary {
  border-color: transparent;
  background: linear-gradient(145deg, #227ce8, #6551ed);
  color: #fff;
}

.canvas-batch-panel > footer > button.danger {
  border-color: rgb(235 105 96 / 34%);
  background: #49282b;
  color: #f3a29b;
}

.canvas-batch-panel > footer > button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.canvas-world {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  transform-origin: 0 0;
}

.canvas-edges {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.canvas-node-group {
  position: absolute;
  z-index: 1;
  border: 1px dashed color-mix(in srgb, var(--group-color) 58%, transparent);
  border-radius: 16px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--group-color) 8%, transparent),
    transparent 58%
  );
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 2%);
  pointer-events: none;
}

.canvas-node-group > header {
  position: absolute;
  top: -29px;
  left: 14px;
  display: flex;
  height: 25px;
  align-items: center;
  gap: 8px;
  padding: 0 5px 0 9px;
  border: 1px solid color-mix(in srgb, var(--group-color) 54%, transparent);
  border-radius: 8px;
  background: rgb(31 32 37 / 96%);
  box-shadow: 0 10px 24px rgb(0 0 0 / 24%);
  color: #e8e9ee;
  pointer-events: auto;
}

.canvas-node-group > header > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  font-weight: 720;
}

.canvas-node-group > header :deep(svg) {
  color: var(--group-color);
}

.canvas-node-group > header small {
  color: #878d98;
  font-size: 7px;
  font-weight: 500;
}

.canvas-node-group > header button {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #8c929d;
  cursor: pointer;
}

.canvas-node-group > header button:hover {
  background: #3b3c43;
  color: #fff;
}

.canvas-node {
  position: absolute;
  z-index: 3;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 10px;
  background: #111216;
  box-shadow: 0 18px 42px rgb(0 0 0 / 34%);
  cursor: move;
}

.canvas-node--image,
.canvas-node--output,
.canvas-node--video {
  border: 0;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
}

.canvas-node--image .canvas-node__header,
.canvas-node--output .canvas-node__header,
.canvas-node--video .canvas-node__header {
  display: none;
}

.canvas-node--image .canvas-node__visual,
.canvas-node--output .canvas-node__visual,
.canvas-node--video .canvas-node__visual {
  height: 100%;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 8px;
  background: #15161a;
  box-shadow: 0 14px 34px rgb(0 0 0 / 34%);
}

.canvas-node--image.canvas-node--selected .canvas-node__visual,
.canvas-node--output.canvas-node--selected .canvas-node__visual,
.canvas-node--video.canvas-node--selected .canvas-node__visual,
.canvas-node--image.canvas-node--connecting .canvas-node__visual,
.canvas-node--output.canvas-node--connecting .canvas-node__visual,
.canvas-node--video.canvas-node--connecting .canvas-node__visual {
  border-color: #4b82ff;
  box-shadow:
    0 0 0 1px #4b82ff,
    0 14px 34px rgb(0 0 0 / 38%);
}

.canvas-node--image.canvas-node--connecting .canvas-node__visual,
.canvas-node--output.canvas-node--connecting .canvas-node__visual,
.canvas-node--video.canvas-node--connecting .canvas-node__visual {
  border-color: #8f6fff;
  box-shadow:
    0 0 0 1px #8f6fff,
    0 0 22px rgb(111 77 255 / 28%);
}

.canvas-node--image .canvas-node__toolbar,
.canvas-node--output .canvas-node__toolbar,
.canvas-node--video .canvas-node__toolbar {
  top: -43px;
}

.canvas-node--selected,
.canvas-node--connecting {
  z-index: 5;
  border-color: #4b82ff;
  box-shadow:
    0 0 0 1px #4b82ff,
    0 20px 50px rgb(0 0 0 / 42%);
}

.canvas-node--menu-open {
  z-index: 20;
}

.canvas-node--connecting {
  border-color: #8f6fff;
  box-shadow:
    0 0 0 1px #8f6fff,
    0 0 22px rgb(111 77 255 / 28%);
}

.canvas-node__header {
  display: grid;
  height: 34px;
  align-items: center;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  padding: 0 9px 0 10px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.canvas-node__header > span {
  overflow: hidden;
  color: #dfe1e6;
  font-size: 8px;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-node__header em {
  padding: 2px 5px;
  border-radius: 999px;
  background: #262e43;
  color: #83a6ff;
  font-size: 6px;
  font-style: normal;
}

.canvas-node__header em.done {
  background: #1f332d;
  color: #76d5b5;
}

.canvas-node__header em.failed {
  background: #3a2426;
  color: #ee8d87;
}

.canvas-node__header button {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #656b77;
  font-size: 9px;
  cursor: pointer;
}

.canvas-node__header button:hover {
  background: #2d2f36;
  color: #fff;
}

.canvas-node__visual {
  position: relative;
  height: calc(100% - 56px);
  min-height: 0;
  overflow: hidden;
  border-radius: 0 0 9px 9px;
  background: #191a20;
}

.canvas-node__visual > img,
.canvas-node__visual > video,
.canvas-node__visual > :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.canvas-node__state {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
}

.canvas-node__state :deep(svg) {
  font-size: 20px;
}

.canvas-node__state strong {
  font-size: 8px;
}

.canvas-node__state small {
  max-width: 80%;
  color: rgb(255 255 255 / 72%);
  font-size: 7px;
}

.canvas-node__state--loading {
  background:
    linear-gradient(
      115deg,
      rgb(255 255 255 / 0%) 30%,
      rgb(255 255 255 / 23%) 48%,
      rgb(255 255 255 / 0%) 65%
    ),
    linear-gradient(145deg, #4f40a7, #6a56dc 55%, #8a6ff1);
  background-size:
    230% 100%,
    100% 100%;
  color: #fff;
  animation: canvas-node-loading 1.8s ease-in-out infinite;
}

.canvas-node__state--failed {
  background: linear-gradient(145deg, #282127, #3c2529);
  color: #f1a29c;
}

.canvas-node__state--video {
  background:
    radial-gradient(circle at 50% 22%, rgb(81 120 255 / 30%), transparent 42%),
    linear-gradient(145deg, #151a29, #20233b 58%, #171a29);
  color: #d8e1ff;
}

.canvas-node__state--video :deep(svg) {
  color: #87a4ff;
  font-size: 24px;
}

@keyframes canvas-node-loading {
  0% {
    background-position: 130% 0;
  }

  100% {
    background-position: -130% 0;
  }
}

.canvas-node__meta {
  position: absolute;
  right: 8px;
  bottom: 6px;
  left: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.canvas-node--image .canvas-node__meta,
.canvas-node--output .canvas-node__meta,
.canvas-node--video .canvas-node__meta {
  top: 9px;
  right: auto;
  bottom: auto;
  left: -64px;
  width: 58px;
  height: 18px;
  justify-content: flex-end;
}

.canvas-node--image .canvas-node__meta span,
.canvas-node--output .canvas-node__meta span,
.canvas-node--video .canvas-node__meta span {
  padding: 0;
  background: transparent;
  color: #8c929e;
  font-size: 11px;
  backdrop-filter: none;
}

.canvas-node--image .canvas-node__meta small,
.canvas-node--output .canvas-node__meta small,
.canvas-node--video .canvas-node__meta small {
  display: none;
}

.canvas-node__meta span,
.canvas-node__meta small {
  padding: 2px 5px;
  border-radius: 4px;
  background: rgb(8 9 12 / 62%);
  color: rgb(255 255 255 / 68%);
  font-size: 6px;
  backdrop-filter: blur(8px);
}

.canvas-node__prompt {
  display: grid;
  height: 100%;
  align-content: start;
  padding: 12px;
  border-radius: 9px;
  background: linear-gradient(145deg, #191820, #111216);
}

.canvas-node__prompt > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #ab96ff;
  font-size: 8px;
  font-weight: 740;
}

.canvas-node__prompt p {
  margin: 13px 0 0;
  color: #d2d4db;
  font-size: 10px;
  line-height: 1.6;
}

.canvas-node__prompt footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.canvas-node__prompt small {
  color: #686e7a;
  font-size: 7px;
}

.canvas-node__prompt footer button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #9080e6;
  font-size: 8px;
  cursor: pointer;
}

.canvas-node__toolbar {
  position: absolute;
  top: -42px;
  left: 0;
  z-index: 6;
  display: flex;
  height: 34px;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 9px;
  background: rgb(37 38 43 / 98%);
  box-shadow: 0 12px 28px rgb(0 0 0 / 32%);
  white-space: nowrap;
}

.canvas-node__toolbar button {
  display: inline-flex;
  height: 26px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #c8cbd2;
  font-size: 7px;
  cursor: pointer;
}

.canvas-node__toolbar button:hover,
.canvas-node__toolbar button:nth-last-child(2) {
  background: #33353c;
  color: #fff;
}

.canvas-node__toolbar button:nth-last-child(2) {
  background: #2384e8;
}

.canvas-node__selection-count {
  display: inline-flex;
  height: 21px;
  align-items: center;
  padding: 0 7px;
  border-radius: 5px;
  background: #394aa0;
  color: #e8ecff;
  font-size: 7px;
  font-weight: 720;
}

.canvas-node__toolbar .canvas-node__toolbar-generate {
  padding-right: 9px;
  background: #2c2e35;
  color: #f3f4f7;
}

.canvas-node__toolbar .canvas-node__toolbar-generate :deep(svg) {
  color: #9481ff;
}

.canvas-node__toolbar .canvas-node__toolbar-generate:hover {
  background: #3b3d45;
}

.canvas-node__generate-menu {
  position: absolute;
  top: 50%;
  left: calc(100% + 29px);
  z-index: 18;
  display: grid;
  width: 276px;
  max-height: min(520px, calc(100vh - 150px));
  gap: 8px;
  padding: 10px;
  overflow-y: auto;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 11px;
  background: rgb(37 38 43 / 99%);
  box-shadow: 0 24px 64px rgb(0 0 0 / 48%);
  color: #f2f3f6;
  cursor: default;
  transform: translateY(-50%);
}

.canvas-node__generate-menu > header {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 6px 7px;
  border-bottom: 1px solid rgb(255 255 255 / 7%);
}

.canvas-node__generate-menu > header strong {
  font-size: 11px;
  font-weight: 760;
}

.canvas-node__generate-menu > header button {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #8d929d;
  cursor: pointer;
}

.canvas-node__generate-menu > header button:hover {
  background: #393b43;
  color: #fff;
}

.canvas-node__generate-menu h4 {
  margin: 3px 7px -1px;
  color: #8a8f9a;
  font-size: 9px;
  font-weight: 600;
}

.canvas-node__generate-group {
  display: grid;
  gap: 3px;
}

.canvas-node__generate-group button,
.canvas-node__generate-angle button {
  position: relative;
  display: grid;
  min-height: 55px;
  align-items: center;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  padding: 7px 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #f0f1f5;
  text-align: left;
  cursor: pointer;
}

.canvas-node__generate-group button:hover,
.canvas-node__generate-angle button:hover {
  background: #34363d;
}

.canvas-node__generate-group button > span:first-child,
.canvas-node__generate-angle button > span:first-child {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 7px;
  background: #202126;
  color: #f4f5f8;
  font-size: 15px;
}

.canvas-node__generate-group button > span:nth-child(2),
.canvas-node__generate-angle button > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.canvas-node__generate-group strong,
.canvas-node__generate-angle strong {
  overflow: hidden;
  font-size: 10px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-node__generate-group small,
.canvas-node__generate-angle small {
  overflow: hidden;
  color: #7f8490;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-node__generate-group em {
  padding: 2px 5px;
  border-radius: 4px;
  background: #33353b;
  color: #b6bac4;
  font-size: 7px;
  font-style: normal;
}

.canvas-node__generate-angle {
  padding-top: 4px;
  border-top: 1px solid rgb(255 255 255 / 7%);
}

.canvas-node__generate-angle button > span:first-child {
  color: #c9b9ff;
}

.canvas-node__port {
  position: absolute;
  top: 50%;
  z-index: 7;
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 34%);
  border-radius: 999px;
  background: #282a30;
  color: #b9bdc6;
  font-size: 9px;
  transform: translateY(-50%);
  cursor: crosshair;
}

.canvas-node__port--in {
  left: -13px;
}

.canvas-node__port--out {
  right: -13px;
}

.canvas-node__port:hover,
.canvas-node--connecting .canvas-node__port--out {
  border-color: #7d8fff;
  background: #4a65e1;
  color: #fff;
}

.canvas-zoom-control {
  position: absolute;
  bottom: 18px;
  left: 18px;
  z-index: 25;
  display: flex;
  height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 6px 0 11px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 999px;
  background: rgb(31 32 37 / 92%);
  color: #aeb2bc;
  font-size: 7px;
  backdrop-filter: blur(12px);
}

.canvas-zoom-control input {
  width: 108px;
  accent-color: #4a72f2;
}

.canvas-zoom-control strong {
  min-width: 31px;
  color: #d7d9df;
  font-size: 7px;
  text-align: right;
}

.canvas-zoom-control button {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #9fa4af;
  cursor: pointer;
}

.canvas-zoom-control button:hover {
  background: #3a3b42;
  color: #fff;
}

.canvas-composer {
  position: absolute;
  bottom: 68px;
  left: 18px;
  z-index: 24;
  display: grid;
  width: min(620px, calc(100% - 76px));
  min-height: 168px;
  padding: 14px 15px 11px;
  border: 1px solid rgb(255 255 255 / 11%);
  border-radius: 13px;
  background: rgb(35 36 41 / 88%);
  box-shadow: 0 22px 55px rgb(0 0 0 / 38%);
  backdrop-filter: blur(18px);
}

.canvas-composer textarea {
  width: 100%;
  min-height: 82px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e7e8ec;
  font-size: 11px;
  line-height: 1.6;
  resize: none;
}

.canvas-composer textarea::placeholder {
  color: #737985;
}

.canvas-composer > small {
  position: absolute;
  right: 15px;
  bottom: 49px;
  color: #666c78;
  font-size: 7px;
}

.canvas-composer footer {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
}

.canvas-composer label {
  position: relative;
  display: block;
  min-width: 0;
}

.canvas-composer select {
  max-width: 145px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 7px;
  outline: 0;
  background: #2b2c32;
  color: #c7cad2;
  font-size: 8px;
}

.canvas-composer label:nth-of-type(2) select,
.canvas-composer label:nth-of-type(3) select {
  max-width: 78px;
}

.canvas-composer footer > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  color: #f0b74e;
  font-size: 8px;
}

.canvas-composer footer > button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(145deg, #168bdc, #2975ec);
  color: #fff;
  cursor: pointer;
}

.canvas-composer footer > button:disabled {
  background: #4c5058;
  color: #838792;
  cursor: not-allowed;
}

.canvas-context-menu {
  position: fixed;
  z-index: 70;
  display: grid;
  width: 228px;
  gap: 3px;
  padding: 7px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 10px;
  background: rgb(37 38 43 / 99%);
  box-shadow: 0 22px 58px rgb(0 0 0 / 48%);
  color: #f1f2f5;
  backdrop-filter: blur(18px);
}

.canvas-context-menu > header {
  display: grid;
  gap: 2px;
  padding: 4px 7px 8px;
  border-bottom: 1px solid rgb(255 255 255 / 7%);
}

.canvas-context-menu > header strong {
  font-size: 10px;
}

.canvas-context-menu > header small {
  color: #7c828e;
  font-size: 7px;
}

.canvas-context-menu > button {
  display: grid;
  min-height: 34px;
  align-items: center;
  gap: 9px;
  grid-template-columns: 18px minmax(0, 1fr);
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #d9dbe1;
  font-size: 8px;
  text-align: left;
  cursor: pointer;
}

.canvas-context-menu > button:hover:not(:disabled) {
  background: #373941;
  color: #fff;
}

.canvas-context-menu > button:disabled {
  color: #5e636d;
  cursor: default;
}

.canvas-context-menu > button.danger {
  color: #ef9a93;
}

.canvas-context-menu > button.danger:hover {
  background: #48272a;
  color: #ffb2ab;
}

.canvas-context-menu > i {
  height: 1px;
  margin: 4px 3px;
  background: rgb(255 255 255 / 7%);
}

.canvas-notice {
  position: fixed;
  bottom: 28px;
  left: 50%;
  z-index: 80;
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid rgb(110 205 170 / 24%);
  border-radius: 9px;
  background: rgb(28 46 40 / 96%);
  box-shadow: 0 16px 44px rgb(0 0 0 / 40%);
  color: #9ce1c5;
  font-size: 8px;
  transform: translateX(-50%);
  backdrop-filter: blur(16px);
}

.canvas-error {
  position: absolute;
  top: 70px;
  right: 18px;
  z-index: 50;
  display: flex;
  max-width: 360px;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 1px solid rgb(238 113 103 / 30%);
  border-radius: 8px;
  background: rgb(59 31 33 / 94%);
  color: #f1a49e;
  font-size: 8px;
  backdrop-filter: blur(12px);
}

.canvas-error button {
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 8px;
  font-weight: 740;
  cursor: pointer;
}

.canvas-inspiration {
  position: relative;
  z-index: 28;
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  border-left: 1px solid rgb(255 255 255 / 7%);
  background: #101114;
}

.canvas-inspiration > header {
  display: flex;
  height: 58px;
  align-items: center;
  justify-content: space-between;
  padding: 0 13px 0 16px;
  border-bottom: 1px solid rgb(255 255 255 / 7%);
}

.canvas-inspiration > header strong {
  font-size: 11px;
}

.canvas-inspiration > header > div {
  display: flex;
  gap: 3px;
}

.canvas-inspiration > header button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #737985;
  cursor: pointer;
}

.canvas-inspiration > header button:hover {
  background: #25262b;
  color: #fff;
}

.canvas-inspiration__intro {
  overflow-y: auto;
  padding: 28px 20px 18px;
  scrollbar-width: thin;
}

.canvas-inspiration__intro h2 {
  margin: 0;
  color: #f1f2f5;
  font-size: 25px;
  line-height: 1.1;
}

.canvas-inspiration__eyebrow {
  display: block;
  margin-top: 8px;
  color: #56c8ee;
  font-size: 12px;
  font-weight: 730;
}

.canvas-inspiration__intro > div {
  margin-top: 25px;
  padding: 11px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 12px;
  background: #f3f3f1;
  box-shadow: 0 18px 42px rgb(0 0 0 / 18%);
}

.canvas-inspiration__preview {
  position: relative;
  display: block;
  height: 168px;
  overflow: hidden;
  border-radius: 7px;
  background: #0e0f13;
}

.canvas-inspiration__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.canvas-inspiration__intro > div > p {
  margin: 10px 1px 0;
  color: #4e596a;
  font-size: 9px;
  line-height: 1.6;
}

.canvas-inspiration__intro > button {
  display: block;
  min-width: 76px;
  height: 31px;
  margin: 13px 0 0 auto;
  padding: 0 12px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 7px;
  background: #3a3b40;
  color: #f4f5f7;
  font-size: 10px;
  cursor: pointer;
}

.canvas-inspiration__history {
  margin: 0 16px 14px;
  padding-top: 14px;
  border-top: 1px solid rgb(255 255 255 / 7%);
}

.canvas-inspiration__history > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.canvas-inspiration__history > header strong {
  font-size: 9px;
}

.canvas-inspiration__history > header button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #777d89;
  font-size: 7px;
  cursor: pointer;
}

.canvas-inspiration__history > div {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.canvas-inspiration__history > div button {
  display: grid;
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 7px;
  background: #191a1f;
  cursor: pointer;
}

.canvas-inspiration__history img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.canvas-inspiration__history button span {
  overflow: hidden;
  padding: 5px 6px;
  color: #969ba6;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-inspiration__history > p {
  margin: 0;
  color: #666c78;
  font-size: 8px;
}

.canvas-inspiration__composer {
  display: grid;
  min-height: 108px;
  margin: 11px;
  padding: 12px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 11px;
  background: #1a1b20;
}

.canvas-inspiration__composer textarea {
  width: 100%;
  min-height: 54px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #dfe1e6;
  font-size: 9px;
  resize: none;
}

.canvas-inspiration__composer footer {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: auto;
}

.canvas-inspiration__composer button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #7f8591;
  cursor: pointer;
}

.canvas-inspiration__composer button:last-child {
  margin-left: auto;
  background: #1384d8;
  color: #fff;
}

.canvas-inspiration-toggle {
  position: absolute;
  right: 18px;
  bottom: 62px;
  z-index: 28;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 999px;
  background: linear-gradient(145deg, #2694dc, #2473e8);
  box-shadow: 0 12px 34px rgb(24 112 209 / 34%);
  color: #fff;
  font-size: 19px;
  cursor: pointer;
}

.canvas-angle-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(3 4 7 / 64%);
  backdrop-filter: blur(5px);
}

.canvas-angle-dialog {
  display: grid;
  width: min(420px, calc(100vw - 32px));
  gap: 12px;
  padding: 15px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 14px;
  background: #28292e;
  box-shadow: 0 34px 90px rgb(0 0 0 / 64%);
  color: #f3f4f7;
}

.canvas-angle-dialog > header {
  display: flex;
  min-height: 40px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.canvas-angle-dialog > header > div:first-child {
  display: grid;
  gap: 3px;
}

.canvas-angle-dialog > header strong {
  font-size: 13px;
}

.canvas-angle-dialog > header small {
  color: #9297a2;
  font-size: 8px;
}

.canvas-angle-dialog > header > div:last-child {
  display: flex;
  align-items: center;
  gap: 4px;
}

.canvas-angle-dialog > header button {
  display: inline-grid;
  min-width: 27px;
  height: 27px;
  place-items: center;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9ea3ae;
  font-size: 8px;
  cursor: pointer;
}

.canvas-angle-dialog > header button:hover:not(:disabled) {
  background: #3b3d45;
  color: #fff;
}

.canvas-angle-dialog > header button:disabled {
  opacity: 0.45;
  cursor: default;
}

.canvas-angle-dialog__legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  color: #c7cad2;
  font-size: 8px;
}

.canvas-angle-dialog__legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.canvas-angle-dialog__legend i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  box-shadow: 0 0 10px currentcolor;
}

.canvas-angle-dialog__legend i.rotation {
  background: #ff4aa5;
  color: #ff4aa5;
}

.canvas-angle-dialog__legend i.tilt {
  background: #35e59d;
  color: #35e59d;
}

.canvas-angle-stage {
  position: relative;
  height: 268px;
  overflow: hidden;
  border: 1px solid rgb(118 101 255 / 18%);
  border-radius: 10px;
  background:
    radial-gradient(circle at 50% 45%, rgb(92 68 208 / 18%), transparent 46%),
    linear-gradient(145deg, #272a54, #202243 58%, #20203d);
  perspective: 760px;
}

.canvas-angle-stage__grid {
  position: absolute;
  inset: 31% 16% 15%;
  transform: rotateX(62deg);
  transform-style: preserve-3d;
  background-image:
    linear-gradient(rgb(96 104 183 / 16%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(96 104 183 / 16%) 1px, transparent 1px);
  background-size: 28px 28px;
}

.canvas-angle-stage__orbit {
  position: absolute;
  top: 49%;
  left: 50%;
  border: 2px solid;
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-11deg);
}

.canvas-angle-stage__orbit--pink {
  width: 214px;
  height: 133px;
  border-color: #ff42a2;
  box-shadow: 0 0 18px rgb(255 66 162 / 20%);
}

.canvas-angle-stage__orbit--green {
  width: 258px;
  height: 85px;
  border-color: #39dc9c;
  transform: translate(-50%, -50%) rotate(12deg);
  box-shadow: 0 0 18px rgb(57 220 156 / 16%);
}

.canvas-angle-stage__camera {
  position: absolute;
  top: 49%;
  left: 50%;
  z-index: 4;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 50%;
  background: #58d5f2;
  box-shadow:
    0 0 0 4px rgb(88 213 242 / 15%),
    0 0 18px rgb(88 213 242 / 55%);
  transform-origin: center;
}

.canvas-angle-stage__camera i {
  width: 11px;
  height: 7px;
  border: 2px solid #173350;
  border-radius: 2px;
}

.canvas-angle-stage__camera i::after {
  display: block;
  width: 3px;
  height: 3px;
  margin: -5px 0 0 2px;
  border: 1px solid #173350;
  border-radius: 50%;
  content: '';
}

.canvas-angle-stage__axis {
  position: absolute;
  top: 49%;
  left: 50%;
  width: 1px;
  height: 178px;
  background: linear-gradient(transparent, rgb(153 164 236 / 43%), transparent);
  transform-origin: 50% 50%;
}

.canvas-angle-stage__axis--x {
  transform: translate(-50%, -50%) rotate(90deg);
}

.canvas-angle-stage__axis--y {
  transform: translate(-50%, -50%);
}

.canvas-angle-stage__axis--z {
  height: 132px;
  transform: translate(-50%, -50%) rotate(38deg);
}

.canvas-angle-stage__subject {
  position: absolute;
  top: 43%;
  left: 50%;
  z-index: 3;
  display: grid;
  width: 42px;
  height: 64px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 6px;
  background: linear-gradient(145deg, rgb(255 255 255 / 18%), rgb(139 121 255 / 26%));
  box-shadow: 0 13px 28px rgb(0 0 0 / 34%);
  color: #eff0ff;
  font-size: 18px;
  transform: translate(-50%, -50%);
}

.canvas-angle-stage__subject i {
  position: absolute;
  right: 5px;
  bottom: 5px;
  left: 5px;
  height: 2px;
  border-radius: 999px;
  background: rgb(255 255 255 / 45%);
}

.canvas-angle-stage__target {
  position: absolute;
  top: 34%;
  left: 50%;
  z-index: 2;
  width: 30px;
  height: 18px;
  border-radius: 3px;
  background: #191a20;
  box-shadow: 0 7px 18px rgb(0 0 0 / 34%);
  transform: translate(-50%, -50%) rotate(-8deg);
}

.canvas-angle-stage output {
  position: absolute;
  bottom: 12px;
  left: 50%;
  min-width: 224px;
  padding: 8px 13px;
  border: 1px solid rgb(126 110 255 / 54%);
  border-radius: 7px;
  background: rgb(38 41 72 / 88%);
  color: #9db4ff;
  font-size: 9px;
  text-align: center;
  transform: translateX(-50%);
}

.canvas-angle-dialog__controls {
  display: grid;
  gap: 8px;
}

.canvas-angle-dialog__controls label {
  display: grid;
  align-items: center;
  gap: 9px;
  grid-template-columns: 62px minmax(0, 1fr) 42px;
  color: #adb1bb;
  font-size: 8px;
}

.canvas-angle-dialog__controls input {
  width: 100%;
  accent-color: #7c65ff;
}

.canvas-angle-dialog__controls strong {
  color: #eff0f4;
  font-size: 8px;
  font-weight: 650;
  text-align: right;
}

.canvas-angle-dialog__error {
  margin: -2px 0 0;
  padding: 8px 10px;
  border-radius: 7px;
  background: rgb(117 44 49 / 34%);
  color: #f2adb0;
  font-size: 8px;
  line-height: 1.5;
}

.canvas-angle-dialog__submit {
  display: inline-flex;
  width: 100%;
  height: 39px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 9px;
  background: #f0f1f4;
  color: #1e2026;
  font-size: 10px;
  font-weight: 740;
  cursor: pointer;
}

.canvas-angle-dialog__submit:hover:not(:disabled) {
  background: #fff;
}

.canvas-angle-dialog__submit:disabled {
  opacity: 0.62;
  cursor: default;
}

.canvas-fade-enter-active,
.canvas-fade-leave-active {
  transition: opacity 150ms ease;
}

.canvas-fade-enter-from,
.canvas-fade-leave-to {
  opacity: 0;
}

.canvas-pop-enter-active,
.canvas-pop-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.canvas-pop-enter-from,
.canvas-pop-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.985);
}

@media (max-width: 1180px) {
  .canvas-studio {
    grid-template-columns: minmax(0, 1fr) 330px;
  }

  .canvas-composer {
    width: min(560px, calc(100% - 76px));
  }
}

@media (max-width: 980px) {
  .canvas-studio {
    height: auto;
    min-height: calc(100vh - 56px);
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .canvas-workspace {
    min-height: calc(100vh - 118px);
  }

  .canvas-inspiration {
    display: none;
  }

  .canvas-inspiration-toggle {
    display: none;
  }

  .canvas-asset-panel,
  .canvas-workflow-panel,
  .canvas-history-panel,
  .canvas-batch-panel {
    left: 62px;
  }
}

@media (max-width: 680px) {
  .canvas-topbar {
    padding-right: 10px;
    padding-left: 10px;
  }

  .canvas-save-state {
    display: none;
  }

  .canvas-topbar__button {
    width: 34px;
    padding: 0;
    font-size: 0;
  }

  .canvas-topbar__button :deep(svg) {
    font-size: 12px;
  }

  .canvas-topbar__actions {
    gap: 5px;
  }

  .canvas-rail {
    top: 65px;
    left: 9px;
  }

  .canvas-rail-menu,
  .canvas-workflow-panel,
  .canvas-asset-panel,
  .canvas-history-panel,
  .canvas-batch-panel {
    top: 105px;
    left: 58px;
    width: calc(100% - 68px);
  }

  .canvas-workflow-grid,
  .canvas-asset-grid,
  .canvas-history-groups > section > div {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .canvas-batch-panel {
    max-height: calc(100% - 115px);
  }

  .canvas-batch-panel > nav {
    overflow-x: auto;
  }

  .canvas-batch-panel > nav button {
    flex: 0 0 auto;
  }

  .canvas-batch-toolbar span {
    display: none;
  }

  .canvas-node-group > header {
    left: 7px;
  }

  .canvas-context-menu {
    width: min(228px, calc(100vw - 20px));
  }

  .canvas-notice {
    bottom: 58px;
    max-width: calc(100vw - 28px);
  }

  .canvas-composer {
    right: 10px;
    bottom: 52px;
    left: 10px;
    width: auto;
    min-height: 154px;
  }

  .canvas-composer footer {
    flex-wrap: wrap;
  }

  .canvas-composer select {
    max-width: 112px;
  }

  .canvas-zoom-control {
    right: auto;
    bottom: 10px;
    left: 10px;
  }

  .canvas-zoom-control input,
  .canvas-zoom-control strong {
    display: none;
  }

  .canvas-node__generate-menu {
    top: calc(50% + 46px);
    right: -14px;
    left: auto;
    width: min(276px, calc(100vw - 82px));
    max-height: min(470px, calc(100vh - 150px));
    transform: none;
  }

  .canvas-angle-backdrop {
    align-items: end;
    padding: 10px;
  }

  .canvas-angle-dialog {
    width: 100%;
    max-height: calc(100vh - 20px);
    overflow-y: auto;
    border-radius: 14px;
  }

  .canvas-angle-stage {
    height: 238px;
  }
}
</style>
