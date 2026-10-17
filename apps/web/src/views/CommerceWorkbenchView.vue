<script setup lang="ts">
import {
  AppstoreOutlined,
  BgColorsOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileImageOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  SwapOutlined,
  ThunderboltFilled,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { FileAsset } from '@/app/api';
import GalleryArtwork from '@/components/GalleryArtwork.vue';
import {
  IMAGE_TASK_POINTS_COST,
  useDrawWorkspaceStore,
  type DrawWorkStatus,
} from '@/stores/draw-workspace';
import { useModelCatalogStore } from '@/stores/model-catalog';
import { useSessionStore } from '@/stores/session';

type CommerceForm = 'background' | 'pattern' | 'placeholder' | 'replace' | 'retouch' | 'try-on';
type UploadRole = 'background' | 'clothing' | 'model' | 'pattern' | 'product' | 'replacement';
type PreviewSide = 'after' | 'before';

interface CatalogGroup {
  items: CommerceTool[];
  label: string;
}

interface CommerceTool {
  accent: string;
  description: string;
  form: CommerceForm;
  glyph: string;
  icon: Component;
  label: string;
  previewAfterVariant: number;
  previewBeforeVariant: number;
  prompt: string;
  value: string;
}

interface UploadState {
  assetId: string;
  name: string;
  url: string;
}

interface UploadMeta {
  description: string;
  icon: Component;
  label: string;
}

const catalogGroups: CatalogGroup[] = [
  {
    label: '商品替换',
    items: [
      {
        accent: '#f07a38',
        description: '替换展示台座与商品陈列环境。',
        form: 'background',
        glyph: '台',
        icon: AppstoreOutlined,
        label: '展示台座替换大师',
        previewAfterVariant: 5,
        previewBeforeVariant: 1,
        prompt: '替换商品展示台座，并保持商品材质和品牌信息不变。',
        value: 'display-stand-replace',
      },
      {
        accent: '#9c61d9',
        description: '识别服饰结构并替换图案、花型和纹理。',
        form: 'pattern',
        glyph: '纹',
        icon: AppstoreOutlined,
        label: '服饰图案替换设计师',
        previewAfterVariant: 6,
        previewBeforeVariant: 2,
        prompt:
          '精准识别服饰轮廓与褶皱，将指定图案自然融合到面料表面，保持原服饰版型、光影和材质细节。',
        value: 'pattern-replace',
      },
      {
        accent: '#3678e8',
        description: '智能识别并融合商品与目标背景。',
        form: 'background',
        glyph: '景',
        icon: BgColorsOutlined,
        label: '智能背景融合',
        previewAfterVariant: 0,
        previewBeforeVariant: 1,
        prompt:
          '智能识别商品主体并替换为指定背景，统一透视、光线、阴影和色温，保持商品边缘自然且细节完整。',
        value: 'background-blend',
      },
      {
        accent: '#4e9b78',
        description: '替换场景道具并匹配真实透视关系。',
        form: 'background',
        glyph: '道',
        icon: AppstoreOutlined,
        label: '场景道具替换器',
        previewAfterVariant: 4,
        previewBeforeVariant: 1,
        prompt: '替换商品场景中的道具，并匹配原有透视、材质和光线。',
        value: 'scene-prop-replace',
      },
      {
        accent: '#bd8a36',
        description: '根据季节氛围重建商品环境。',
        form: 'background',
        glyph: '季',
        icon: AppstoreOutlined,
        label: '季节氛围替换大师',
        previewAfterVariant: 3,
        previewBeforeVariant: 5,
        prompt: '为商品替换季节氛围背景，并保持商品色彩和细节准确。',
        value: 'season-atmosphere',
      },
      {
        accent: '#2b96ab',
        description: '迁移商品到新的商业场景。',
        form: 'background',
        glyph: '迁',
        icon: AppstoreOutlined,
        label: '商品场景迁移大师',
        previewAfterVariant: 4,
        previewBeforeVariant: 2,
        prompt: '将商品迁移到新的商业场景，保持原商品形态和比例。',
        value: 'scene-migration',
      },
      {
        accent: '#d95d81',
        description: '生成自然的手持商品展示效果。',
        form: 'try-on',
        glyph: '手',
        icon: UserOutlined,
        label: '手持模特替换专家',
        previewAfterVariant: 2,
        previewBeforeVariant: 1,
        prompt: '生成自然手持商品的展示画面，保持手部结构和商品外观准确。',
        value: 'hand-model-replace',
      },
      {
        accent: '#ee8b32',
        description: '替换商品包装并保留品牌标识。',
        form: 'replace',
        glyph: '包',
        icon: AppstoreOutlined,
        label: '产品包装替换器',
        previewAfterVariant: 5,
        previewBeforeVariant: 1,
        prompt: '替换商品包装设计，保持标签、结构和使用场景自然。',
        value: 'package-replace',
      },
      {
        accent: '#c8524e',
        description: '替换指定商品部件和配件。',
        form: 'replace',
        glyph: '件',
        icon: AppstoreOutlined,
        label: '产品部件替换工具',
        previewAfterVariant: 7,
        previewBeforeVariant: 5,
        prompt: '替换商品指定部件，保持连接关系、透视和材质一致。',
        value: 'component-replace',
      },
      {
        accent: '#8a7657',
        description: '替换商品材质并保留外形结构。',
        form: 'replace',
        glyph: '材',
        icon: AppstoreOutlined,
        label: '商品材质替换器',
        previewAfterVariant: 5,
        previewBeforeVariant: 2,
        prompt: '替换商品表面材质，保留原始轮廓、结构和文字信息。',
        value: 'material-replace',
      },
      {
        accent: '#7287d8',
        description: '生成模特试穿和佩戴效果。',
        form: 'try-on',
        glyph: '模',
        icon: UserOutlined,
        label: '虚拟模特试穿',
        previewAfterVariant: 2,
        previewBeforeVariant: 1,
        prompt: '生成自然模特试穿效果，保持商品版型、颜色和材质准确。',
        value: 'virtual-model',
      },
      {
        accent: '#2e9ed1',
        description: '一键抠图并替换新的商品背景。',
        form: 'background',
        glyph: '换',
        icon: BgColorsOutlined,
        label: '一键商品换背景',
        previewAfterVariant: 0,
        previewBeforeVariant: 1,
        prompt: '一键识别商品并替换背景，保持边缘和阴影自然。',
        value: 'one-click-background',
      },
    ],
  },
  {
    label: '商品换背景',
    items: [
      {
        accent: '#518fd1',
        description: '校正背景光影与透视关系。',
        form: 'background',
        glyph: '光',
        icon: BgColorsOutlined,
        label: '光影透视校正大师',
        previewAfterVariant: 0,
        previewBeforeVariant: 1,
        prompt: '校正商品背景的光影、透视和色温，使画面真实自然。',
        value: 'light-perspective',
      },
      {
        accent: '#7664d9',
        description: '生成具有艺术感的背景画面。',
        form: 'background',
        glyph: '艺',
        icon: AppstoreOutlined,
        label: '艺术创意背景画板',
        previewAfterVariant: 6,
        previewBeforeVariant: 2,
        prompt: '为商品生成具有品牌质感的艺术背景。',
        value: 'artistic-background',
      },
      {
        accent: '#43a073',
        description: '统一处理多张商品背景。',
        form: 'background',
        glyph: '批',
        icon: AppstoreOutlined,
        label: '批量背景统一处理',
        previewAfterVariant: 3,
        previewBeforeVariant: 5,
        prompt: '批量统一商品背景风格、尺寸与光线。',
        value: 'batch-background',
      },
      {
        accent: '#b78345',
        description: '生成家居生活场景背景。',
        form: 'background',
        glyph: '家',
        icon: AppstoreOutlined,
        label: '家居环境智能融合',
        previewAfterVariant: 1,
        previewBeforeVariant: 5,
        prompt: '生成真实的家居环境并融合商品。',
        value: 'home-background',
      },
      {
        accent: '#3d97bc',
        description: '生成数码科技质感背景。',
        form: 'background',
        glyph: '科',
        icon: AppstoreOutlined,
        label: '数码科技背景设计',
        previewAfterVariant: 6,
        previewBeforeVariant: 1,
        prompt: '生成具有科技感的商品背景，保持商品主体清晰。',
        value: 'tech-background',
      },
      {
        accent: '#d57e4f',
        description: '生成美食氛围和陈列背景。',
        form: 'background',
        glyph: '食',
        icon: AppstoreOutlined,
        label: '美食场景背景搭配',
        previewAfterVariant: 5,
        previewBeforeVariant: 2,
        prompt: '为食品商品生成自然诱人的陈列背景。',
        value: 'food-background',
      },
      {
        accent: '#d75f8d',
        description: '生成美妆产品的高级质感背景。',
        form: 'background',
        glyph: '美',
        icon: AppstoreOutlined,
        label: '美妆质感背景大师',
        previewAfterVariant: 0,
        previewBeforeVariant: 1,
        prompt: '生成适合美妆产品的高级商业背景。',
        value: 'beauty-background',
      },
      {
        accent: '#8755b8',
        description: '生成服饰风格化的背景环境。',
        form: 'background',
        glyph: '衣',
        icon: AppstoreOutlined,
        label: '服饰风格背景定制',
        previewAfterVariant: 2,
        previewBeforeVariant: 1,
        prompt: '为服饰商品生成风格统一的展示背景。',
        value: 'fashion-background',
      },
    ],
  },
  {
    label: '编辑与增强',
    items: [
      {
        accent: '#397be5',
        description: '一键去除背景，保留商品主体。',
        form: 'retouch',
        glyph: '抠',
        icon: PictureOutlined,
        label: '商品抠图',
        previewAfterVariant: 1,
        previewBeforeVariant: 5,
        prompt: '精准识别商品边缘并去除背景。',
        value: 'image-cutout',
      },
      {
        accent: '#9a57d7',
        description: '将商品图转换为不同艺术风格。',
        form: 'retouch',
        glyph: '风',
        icon: AppstoreOutlined,
        label: '风格转换',
        previewAfterVariant: 6,
        previewBeforeVariant: 1,
        prompt: '转换商品图片艺术风格，同时保持商品主体一致。',
        value: 'style-transfer',
      },
      {
        accent: '#23a56e',
        description: 'AI 无损放大，提升图片清晰度。',
        form: 'retouch',
        glyph: '放',
        icon: PictureOutlined,
        label: '图片放大',
        previewAfterVariant: 4,
        previewBeforeVariant: 1,
        prompt: '无损放大商品图片并提升细节清晰度。',
        value: 'image-upscale',
      },
    ],
  },
];

const commerceTools = catalogGroups.flatMap((group) => group.items);
const backgroundCategories = [
  '服饰箱包',
  '美妆护肤',
  '食品饮料',
  '家居生活',
  '数码电器',
  '母婴玩具',
  '运动户外',
  '珠宝配饰',
  '汽车配件',
  '办公用品',
  '图书音像',
  '健康保健',
];
const fusionModes = ['自然融合', '光影匹配', '边缘强化', '商品优先'];
const backgroundResolutions = ['1K', '2K', '4K'];
const patternApplications = ['胸前图案', '满版印花', '局部贴图', '披肩纹理'];
const clothingCategories = [
  'T 恤',
  '连衣裙',
  '衬衫',
  '卫衣',
  '帆布包',
  '牛仔外套',
  '针织衫',
  '运动服',
  '帽子',
  '裤子',
  '裙子',
  '休闲装',
];
const patternStrengths = ['自然贴合', '保持纹理', '强化图案'];
const patternResolutions = ['1K', '2K', '4K'];
const replacementModesByTool: Record<string, string[]> = {
  'package-replace': ['包装整体', '正面标签', '盒型结构', '封口细节'],
  'component-replace': ['指定部件', '连接配件', '结构细节', '品牌饰件'],
  'material-replace': ['表面材质', '核心部件材质', '局部纹理', '金属玻璃布料质感'],
};
const replacementScopes = ['自动识别', '主体区域', '指定局部', '保留边缘光'];
const replacementResolutions = ['1K', '2K', '4K'];
const replacementUploadProfiles: Record<string, UploadMeta & { previewLabel: string }> = {
  'package-replace': {
    description: '上传希望替换成的包装、标签或盒型参考图',
    icon: AppstoreOutlined,
    label: '上传包装参考图',
    previewLabel: '包装参考',
  },
  'component-replace': {
    description: '上传目标部件、配件或结构参考图',
    icon: AppstoreOutlined,
    label: '上传部件参考图',
    previewLabel: '部件参考',
  },
  'material-replace': {
    description: '上传希望替换成的材质、纹理或表面参考图',
    icon: PictureOutlined,
    label: '上传材质参考图',
    previewLabel: '材质参考',
  },
};
const retouchModes = ['一键抠图', '商品精修', '高清放大', '背景净化和补光'];
const retouchResolutions = ['1K', '2K', '4K'];
const tryOnPoses = ['正面站姿', '自然走姿', '半身展示', '坐姿展示'];
const tryOnScenes = ['纯色棚拍', '生活方式', '都市街景', '家居空间'];
const tryOnResolutions = ['1K', '2K', '4K'];
const ratios = ['1:1', '4:5', '3:4', '16:9', '9:16'];
const amounts = [1, 2, 3, 4];
const promptPresets = ['保持光线方向一致', '边缘融合自然', '突出商品材质', '留出文案空间'];

const uploadMeta: Record<UploadRole, UploadMeta> = {
  product: {
    description: '点击或拖拽上传，支持 JPG、PNG、WebP，不超过 10MB',
    icon: ShoppingCartOutlined,
    label: '上传商品图片',
  },
  background: {
    description: '上传希望替换到的目标背景图',
    icon: BgColorsOutlined,
    label: '上传目标背景图',
  },
  clothing: {
    description: '上传需要替换图案的基础服饰图片',
    icon: PictureOutlined,
    label: '上传基础服饰图片',
  },
  pattern: {
    description: '上传花型、纹理或设计图案素材',
    icon: FileImageOutlined,
    label: '上传图案素材',
  },
  replacement: {
    description: '上传需要替换成的包装、部件或材质参考图',
    icon: FileImageOutlined,
    label: '上传替换参考素材',
  },
  model: {
    description: '可选上传人物或模特参考图',
    icon: UserOutlined,
    label: '上传模特参考图',
  },
};

const workspace = useDrawWorkspaceStore();
const modelCatalog = useModelCatalogStore();
const sessionStore = useSessionStore();

const searchQuery = ref('');
const selectedToolKey = ref('background-blend');
const previewSide = ref<PreviewSide>('after');
const historyOpen = ref(false);
const helpOpen = ref(false);
const prompt = ref('');
const uploadError = ref('');
const uploadingRole = ref<UploadRole | null>(null);
const selectedImageModel = computed(() => modelCatalog.modelsFor('image')[0] ?? null);
const pendingUploadRole = ref<UploadRole | null>(null);
const uploadInput = ref<HTMLInputElement | null>(null);
const backgroundCategory = ref(backgroundCategories[0] ?? '服饰箱包');
const fusionMode = ref(fusionModes[0] ?? '自然融合');
const backgroundResolution = ref('2K');
const patternApplication = ref(patternApplications[0] ?? '胸前图案');
const clothingCategory = ref(clothingCategories[0] ?? 'T 恤');
const patternStrength = ref(patternStrengths[0] ?? '自然贴合');
const patternResolution = ref('2K');
const replacementMode = ref(replacementModesByTool['package-replace']?.[0] ?? '包装整体');
const replacementScope = ref(replacementScopes[0] ?? '自动识别');
const replacementResolution = ref('2K');
const retouchMode = ref(retouchModes[0] ?? '一键抠图');
const retouchResolution = ref('2K');
const tryOnPose = ref(tryOnPoses[0] ?? '正面站姿');
const tryOnScene = ref(tryOnScenes[0] ?? '纯色棚拍');
const tryOnResolution = ref('2K');
const selectedRatio = ref('1:1');
const selectedAmount = ref(1);
const imageUploads = ref<Record<UploadRole, UploadState | null>>({
  background: null,
  clothing: null,
  model: null,
  pattern: null,
  product: null,
  replacement: null,
});

const activeTool = computed<CommerceTool>(
  () => commerceTools.find((tool) => tool.value === selectedToolKey.value) ?? commerceTools[0]!,
);
const filteredGroups = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();

  if (!keyword) {
    return catalogGroups;
  }

  return catalogGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword),
      ),
    }))
    .filter((group) => group.items.length > 0);
});
const filteredToolCount = computed(() =>
  filteredGroups.value.reduce((count, group) => count + group.items.length, 0),
);
const isAvailableTool = computed(() => activeTool.value.form !== 'placeholder');
const isBackgroundTool = computed(() => activeTool.value.form === 'background');
const isPatternTool = computed(() => activeTool.value.form === 'pattern');
const isReplaceTool = computed(() => activeTool.value.form === 'replace');
const isRetouchTool = computed(() => activeTool.value.form === 'retouch');
const isTryOnTool = computed(() => activeTool.value.form === 'try-on');
const activeReplacementModes = computed(
  () =>
    replacementModesByTool[activeTool.value.value] ?? replacementModesByTool['package-replace']!,
);
const activeReplacementProfile = computed(
  () =>
    replacementUploadProfiles[activeTool.value.value] ??
    replacementUploadProfiles['package-replace']!,
);
const requiredUploads = computed<UploadRole[]>(() => {
  if (isBackgroundTool.value) {
    return ['product', 'background'];
  }

  if (isPatternTool.value) {
    return ['clothing', 'pattern'];
  }

  if (isReplaceTool.value) {
    return ['product', 'replacement'];
  }

  if (isRetouchTool.value) {
    return ['product'];
  }

  if (isTryOnTool.value) {
    return ['clothing', 'model'];
  }

  return [];
});
const missingUploadLabels = computed(() =>
  requiredUploads.value
    .filter((role) => !imageUploads.value[role])
    .map((role) => uploadMeta[role].label.replace('上传', '')),
);
const previewImage = computed(() => {
  if (isBackgroundTool.value) {
    return previewSide.value === 'before'
      ? imageUploads.value.product?.url
      : imageUploads.value.background?.url;
  }

  if (isPatternTool.value) {
    return previewSide.value === 'before'
      ? imageUploads.value.clothing?.url
      : imageUploads.value.pattern?.url;
  }

  if (isReplaceTool.value) {
    return previewSide.value === 'before'
      ? imageUploads.value.product?.url
      : imageUploads.value.replacement?.url;
  }

  if (isRetouchTool.value) {
    return imageUploads.value.product?.url;
  }

  if (isTryOnTool.value) {
    return previewSide.value === 'before'
      ? imageUploads.value.clothing?.url
      : imageUploads.value.model?.url;
  }

  return undefined;
});
const previewVariant = computed(() =>
  previewSide.value === 'before'
    ? activeTool.value.previewBeforeVariant
    : activeTool.value.previewAfterVariant,
);
const previewSideLabel = computed(() => (previewSide.value === 'before' ? 'BEFORE' : 'AFTER'));
const previewTitle = computed(() =>
  previewSide.value === 'before' ? '原始素材' : `${activeTool.value.label}效果展示`,
);
const previewDescription = computed(() => {
  if (isBackgroundTool.value) {
    return previewSide.value === 'before'
      ? '上传需要处理的商品原图'
      : '融合目标背景，并统一光影、透视和商品边缘';
  }

  if (isPatternTool.value) {
    return previewSide.value === 'before'
      ? '上传需要替换图案的基础服饰'
      : '图案自然贴合面料，同时保留服饰版型和褶皱';
  }

  if (isReplaceTool.value) {
    return previewSide.value === 'before'
      ? '上传需要替换包装、部件或材质的商品原图'
      : `${activeReplacementProfile.value.previewLabel}会先被分析，再匹配商品结构与光影`;
  }

  if (isRetouchTool.value) {
    return previewSide.value === 'before'
      ? '上传需要处理的商品原图'
      : `${retouchMode.value}会保留商品主体并优化细节`;
  }

  if (isTryOnTool.value) {
    return previewSide.value === 'before'
      ? '上传需要上身的服饰或商品素材'
      : '虚拟模特试穿会匹配版型、姿态和场景光线';
  }

  return activeTool.value.description;
});
const generationCost = computed(() => selectedAmount.value * IMAGE_TASK_POINTS_COST);
const submitting = computed(() => workspace.submitting || uploadingRole.value !== null);
const canSubmit = computed(
  () => isAvailableTool.value && missingUploadLabels.value.length === 0 && !submitting.value,
);
const visibleWorks = computed(() => workspace.works.filter((work) => work.tool === 'commerce'));
const toolSteps = computed(() => {
  if (isBackgroundTool.value) {
    return [
      '上传包含原商品的图片',
      '上传希望替换到的目标背景图',
      '选择商品类目和融合模式',
      '点击开始处理，等待 AI 完成融合',
    ];
  }

  if (isPatternTool.value) {
    return [
      '上传需要替换图案的基础服饰图',
      '上传新的图案或纹理素材',
      '选择服饰类目和图案融合度',
      '点击开始处理，等待 AI 完成替换',
    ];
  }

  if (isReplaceTool.value) {
    return [
      '上传包含完整结构的商品原图',
      `上传${activeReplacementProfile.value.previewLabel}`,
      '选择替换类型、替换范围和输出分辨率',
      '点击开始处理，等待 AI 完成结构匹配',
    ];
  }

  if (isRetouchTool.value) {
    return [
      '上传需要处理的商品图片',
      '选择抠图、精修、放大或补光方式',
      '选择输出分辨率并补充额外要求',
      '点击开始处理，等待 AI 返回结果',
    ];
  }

  if (isTryOnTool.value) {
    return [
      '上传需要试穿的服饰或商品素材',
      '上传模特姿态参考图',
      '选择展示姿态、场景和输出分辨率',
      '点击开始处理，生成自然试穿效果',
    ];
  }

  return ['先选择左侧可用工具', '按面板提示上传素材', '调整参数后开始处理'];
});
const toolTips = computed(() => {
  if (isBackgroundTool.value) {
    return [
      '确保原图和目标背景的商品方向一致',
      '高分辨率商品图会保留更多材质细节',
      '目标背景的光照方向与商品越接近越自然',
    ];
  }

  if (isPatternTool.value) {
    return [
      '图案分辨率越高，面料纹理越清晰',
      '服饰主体不要被大面积遮挡',
      '复杂褶皱会由 AI 自动匹配图案透视',
    ];
  }

  if (isReplaceTool.value) {
    return [
      '原图主体完整、边缘清晰时结构识别更准确',
      `${activeReplacementProfile.value.previewLabel}与目标区域方向一致会更自然`,
      '复杂材质和透明区域建议补充额外要求',
    ];
  }

  if (isRetouchTool.value) {
    return [
      '商品主体越完整，边缘处理越准确',
      '高分辨率原图能保留更多材质细节',
      '复杂透明材质建议补充额外要求',
    ];
  }

  if (isTryOnTool.value) {
    return [
      '服饰图尽量使用正面平铺或无遮挡商品图',
      '模特参考图与目标姿态越接近，结果越自然',
      '场景选择会影响光影和整体商品氛围',
    ];
  }

  return ['尚未开放的工具会保留和参考产品一致的入口位置'];
});

function setTool(tool: CommerceTool): void {
  selectedToolKey.value = tool.value;
  if (tool.form === 'replace') {
    replacementMode.value = replacementModesByTool[tool.value]?.[0] ?? '包装整体';
  }
  prompt.value = '';
  previewSide.value = 'after';
  uploadError.value = '';
}

function setPromptPreset(value: string): void {
  prompt.value = prompt.value.trim() ? `${prompt.value.trim()}；${value}` : value;
}

function openUpload(role: UploadRole): void {
  pendingUploadRole.value = role;
  uploadInput.value?.click();
}

async function uploadFile(role: UploadRole, file: File): Promise<void> {
  uploadingRole.value = role;
  uploadError.value = '';

  try {
    const asset: FileAsset = await workspace.uploadReference(file);
    const previous = imageUploads.value[role];

    if (previous) {
      URL.revokeObjectURL(previous.url);
    }

    imageUploads.value = {
      ...imageUploads.value,
      [role]: {
        assetId: asset.id,
        name: asset.originalName,
        url: URL.createObjectURL(file),
      },
    };
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : '素材上传失败，请重试';
  } finally {
    uploadingRole.value = null;
    pendingUploadRole.value = null;
  }
}

function handleUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const role = pendingUploadRole.value;

  if (file && role) {
    void uploadFile(role, file);
  } else {
    pendingUploadRole.value = null;
  }

  input.value = '';
}

function handleDrop(role: UploadRole, event: DragEvent): void {
  const file = event.dataTransfer?.files[0];

  if (file) {
    void uploadFile(role, file);
  }
}

function removeUpload(role: UploadRole): void {
  const target = imageUploads.value[role];

  if (target) {
    URL.revokeObjectURL(target.url);
  }

  imageUploads.value = {
    ...imageUploads.value,
    [role]: null,
  };
}

function isUploading(role: UploadRole): boolean {
  return uploadingRole.value === role;
}

function buildPrompt(): string {
  const parts = [activeTool.value.prompt];

  if (isBackgroundTool.value) {
    parts.push(
      `商品类目：${backgroundCategory.value}。`,
      `融合模式：${fusionMode.value}。`,
      `输出分辨率：${backgroundResolution.value}。`,
      '保持商品主体、品牌标识、材质和颜色准确。',
    );
  }

  if (isPatternTool.value) {
    parts.push(
      `图案应用方式：${patternApplication.value}。`,
      `服饰类目：${clothingCategory.value}。`,
      `图案融合度：${patternStrength.value}。`,
      `输出分辨率：${patternResolution.value}。`,
      '保持服饰版型、褶皱、阴影和原始轮廓不变。',
    );
  }

  if (isReplaceTool.value) {
    parts.push(
      `替换类型：${replacementMode.value}。`,
      `替换范围：${replacementScope.value}。`,
      `输出分辨率：${replacementResolution.value}。`,
      '保持商品原有轮廓、结构关系、品牌信息和透视，替换区域边缘与材质过渡自然。',
    );
  }

  if (isRetouchTool.value) {
    parts.push(
      `处理方式：${retouchMode.value}。`,
      `输出分辨率：${retouchResolution.value}。`,
      '保持商品主体、品牌文字、材质和原始颜色准确。',
    );
  }

  if (isTryOnTool.value) {
    parts.push(
      `展示姿态：${tryOnPose.value}。`,
      `目标场景：${tryOnScene.value}。`,
      `输出分辨率：${tryOnResolution.value}。`,
      '保持服饰版型、图案、材质和商品细节准确，手部和身体结构自然。',
    );
  }

  if (prompt.value.trim()) {
    parts.push(`额外需求：${prompt.value.trim()}。`);
  }

  return parts.join('\n');
}

function sourceRole(): UploadRole | null {
  if (isBackgroundTool.value) {
    return 'product';
  }

  if (isPatternTool.value) {
    return 'clothing';
  }

  if (isReplaceTool.value) {
    return 'product';
  }

  if (isRetouchTool.value) {
    return 'product';
  }

  if (isTryOnTool.value) {
    return 'clothing';
  }

  return null;
}

async function submitTask(): Promise<void> {
  if (!isAvailableTool.value) {
    return;
  }

  if (missingUploadLabels.value.length > 0) {
    uploadError.value = `请先上传${missingUploadLabels.value.join('和')}`;
    return;
  }

  const primaryRole = sourceRole();
  const primaryImage = primaryRole ? imageUploads.value[primaryRole] : null;
  const referenceFileId = isBackgroundTool.value
    ? imageUploads.value.background?.assetId
    : isPatternTool.value
      ? imageUploads.value.pattern?.assetId
      : isReplaceTool.value
        ? imageUploads.value.replacement?.assetId
        : imageUploads.value.model?.assetId;

  if (!primaryRole || !primaryImage) {
    uploadError.value = '缺少主素材，请重新上传';
    return;
  }

  await workspace.initialize();

  const createdWorks = await workspace.createGenerationWorks({
    amount: selectedAmount.value,
    extraParameters: {
      backgroundCategory: isBackgroundTool.value ? backgroundCategory.value : undefined,
      backgroundFileId: imageUploads.value.background?.assetId,
      clothingCategory: isPatternTool.value ? clothingCategory.value : undefined,
      fusionMode: isBackgroundTool.value ? fusionMode.value : undefined,
      mode: activeTool.value.value,
      outputResolution: isBackgroundTool.value
        ? backgroundResolution.value
        : isPatternTool.value
          ? patternResolution.value
          : isReplaceTool.value
            ? replacementResolution.value
            : retouchResolution.value,
      patternApplication: isPatternTool.value ? patternApplication.value : undefined,
      patternFileId: imageUploads.value.pattern?.assetId,
      patternStrength: isPatternTool.value ? patternStrength.value : undefined,
      replacementFileId: isReplaceTool.value ? imageUploads.value.replacement?.assetId : undefined,
      replacementMode: isReplaceTool.value ? replacementMode.value : undefined,
      replacementResolution: isReplaceTool.value ? replacementResolution.value : undefined,
      replacementScope: isReplaceTool.value ? replacementScope.value : undefined,
      retouchMode: isRetouchTool.value ? retouchMode.value : undefined,
      retouchResolution: isRetouchTool.value ? retouchResolution.value : undefined,
      sourceRole: primaryRole,
      tryOnPose: isTryOnTool.value ? tryOnPose.value : undefined,
      tryOnScene: isTryOnTool.value ? tryOnScene.value : undefined,
      tryOnResolution: isTryOnTool.value ? tryOnResolution.value : undefined,
    },
    model: selectedImageModel.value?.alias ?? '',
    modelAlias: selectedImageModel.value?.alias ?? '',
    modelLabel: selectedImageModel.value?.displayName ?? activeTool.value.label,
    prompt: buildPrompt(),
    ratio: selectedRatio.value,
    referenceFileIds: referenceFileId ? [referenceFileId] : undefined,
    size: isBackgroundTool.value
      ? backgroundResolution.value
      : isPatternTool.value
        ? patternResolution.value
        : isReplaceTool.value
          ? replacementResolution.value
          : isRetouchTool.value
            ? retouchResolution.value
            : tryOnResolution.value,
    sourceFileId: primaryImage.assetId,
    toolKey: 'commerce',
  });

  if (createdWorks.length > 0) {
    historyOpen.value = true;
    prompt.value = '';
  }
}

function resetForm(): void {
  for (const role of Object.keys(imageUploads.value) as UploadRole[]) {
    const target = imageUploads.value[role];

    if (target) {
      URL.revokeObjectURL(target.url);
    }
  }

  imageUploads.value = {
    background: null,
    clothing: null,
    model: null,
    pattern: null,
    product: null,
    replacement: null,
  };
  prompt.value = '';
  uploadError.value = '';
  previewSide.value = 'after';
  backgroundCategory.value = backgroundCategories[0] ?? '服饰箱包';
  fusionMode.value = fusionModes[0] ?? '自然融合';
  backgroundResolution.value = '2K';
  patternApplication.value = patternApplications[0] ?? '胸前图案';
  clothingCategory.value = clothingCategories[0] ?? 'T 恤';
  patternStrength.value = patternStrengths[0] ?? '自然贴合';
  patternResolution.value = '2K';
  replacementMode.value = replacementModesByTool['package-replace']?.[0] ?? '包装整体';
  replacementScope.value = replacementScopes[0] ?? '自动识别';
  replacementResolution.value = '2K';
  retouchMode.value = retouchModes[0] ?? '一键抠图';
  retouchResolution.value = '2K';
  tryOnPose.value = tryOnPoses[0] ?? '正面站姿';
  tryOnScene.value = tryOnScenes[0] ?? '纯色棚拍';
  tryOnResolution.value = '2K';
  selectedRatio.value = '1:1';
  selectedAmount.value = 1;
}

function formatWorkTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(timestamp);
}

function workStatusLabel(status: DrawWorkStatus): string {
  const labels: Record<DrawWorkStatus, string> = {
    done: '已完成',
    failed: '生成失败',
    generating: '处理中',
    queued: '排队中',
  };

  return labels[status];
}

onMounted(() => {
  void modelCatalog.load();
  void workspace.initialize();
});

onBeforeUnmount(() => {
  for (const target of Object.values(imageUploads.value)) {
    if (target) {
      URL.revokeObjectURL(target.url);
    }
  }
});
</script>

<template>
  <section class="commerce-workbench">
    <header class="commerce-workbench__header">
      <div class="commerce-workbench__brand">
        <span>
          <ShoppingCartOutlined />
        </span>
        <div>
          <strong>边界 AI 平台电商工具</strong>
          <small>商品图、换景、试衣与视觉增强</small>
        </div>
      </div>

      <nav class="commerce-workbench__breadcrumb" aria-label="当前位置">
        <span>全部</span>
        <RightOutlined />
        <span>{{ activeTool.form === 'background' ? '商品换背景' : '商品替换' }}</span>
        <RightOutlined />
        <strong>{{ activeTool.label }}</strong>
      </nav>

      <div class="commerce-workbench__actions">
        <button type="button" @click="historyOpen = true">
          <HistoryOutlined />
          历史记录
        </button>
        <button type="button" @click="helpOpen = true">
          <QuestionCircleOutlined />
          帮助
        </button>
      </div>
    </header>

    <label class="commerce-mobile-picker">
      <span>选择电商工具</span>
      <select v-model="selectedToolKey">
        <option v-for="tool in commerceTools" :key="tool.value" :value="tool.value">
          {{ tool.label }}
        </option>
      </select>
    </label>

    <div class="commerce-workbench__body">
      <aside class="commerce-catalog commerce-panel">
        <label class="commerce-catalog__search">
          <SearchOutlined />
          <input v-model="searchQuery" type="search" placeholder="搜索工具（50+ 智能体）" />
          <button type="button" aria-label="刷新工具列表" @click="searchQuery = ''">
            <ReloadOutlined />
          </button>
        </label>

        <button
          type="button"
          class="commerce-catalog__all"
          :class="{ active: selectedToolKey === '' }"
          @click="searchQuery = ''"
        >
          <span>
            <AppstoreOutlined />
          </span>
          <strong>全部</strong>
          <small>{{ commerceTools.length }}</small>
          <RightOutlined />
        </button>

        <div class="commerce-catalog__groups">
          <section v-for="group in filteredGroups" :key="group.label">
            <header>
              <span>
                <AppstoreOutlined />
                {{ group.label }}
              </span>
              <RightOutlined />
            </header>
            <button
              v-for="tool in group.items"
              :key="tool.value"
              type="button"
              class="commerce-catalog__item"
              :class="{
                active: selectedToolKey === tool.value,
                muted: tool.form === 'placeholder',
              }"
              @click="setTool(tool)"
            >
              <i :style="{ '--tool-accent': tool.accent }">
                <component :is="tool.icon" />
              </i>
              <span>{{ tool.label }}</span>
              <em v-if="tool.form === 'placeholder'">即将开放</em>
              <RightOutlined />
            </button>
          </section>

          <div v-if="filteredToolCount === 0" class="commerce-catalog__empty">
            <SearchOutlined />
            <strong>没有找到匹配工具</strong>
            <span>尝试缩短关键词</span>
          </div>
        </div>

        <div class="commerce-catalog__idea">
          <span>
            <BulbOutlined />
          </span>
          <div>
            <strong>有想法？</strong>
            <small>分享你的商品视觉需求</small>
          </div>
          <button type="button" disabled>提交想法</button>
        </div>
      </aside>

      <main class="commerce-editor commerce-panel">
        <header class="commerce-panel__header">
          <div>
            <ExperimentOutlined />
            <strong>操作面板</strong>
          </div>
          <div class="commerce-editor__tools">
            <button type="button" @click="resetForm">
              <ReloadOutlined />
              重置
            </button>
            <button type="button" @click="resetForm">
              <CloseOutlined />
              清除
            </button>
          </div>
        </header>

        <div v-if="isBackgroundTool" class="commerce-editor__content">
          <section class="commerce-field">
            <label>商品类目 <em>*</em></label>
            <div class="commerce-choice-grid">
              <button
                v-for="category in backgroundCategories"
                :key="category"
                type="button"
                :class="{ active: backgroundCategory === category }"
                @click="backgroundCategory = category"
              >
                {{ category }}
              </button>
            </div>
          </section>

          <label class="commerce-field">
            <span>融合模式 <em>*</em></span>
            <select v-model="fusionMode">
              <option v-for="mode in fusionModes" :key="mode" :value="mode">{{ mode }}</option>
            </select>
          </label>

          <label class="commerce-field">
            <span>输出分辨率</span>
            <select v-model="backgroundResolution">
              <option
                v-for="resolution in backgroundResolutions"
                :key="resolution"
                :value="resolution"
              >
                {{ resolution }}
              </option>
            </select>
          </label>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.product }"
            @dragover.prevent
            @drop.prevent="handleDrop('product', $event)"
          >
            <div v-if="imageUploads.product" class="commerce-upload__preview">
              <img :src="imageUploads.product.url" :alt="imageUploads.product.name" />
              <button type="button" aria-label="移除商品图片" @click="removeUpload('product')">
                <CloseOutlined />
              </button>
              <span>商品原图</span>
            </div>
            <button v-else type="button" @click="openUpload('product')">
              <LoadingOutlined v-if="isUploading('product')" />
              <UploadOutlined v-else />
              <strong>{{ isUploading('product') ? '正在上传' : uploadMeta.product.label }}</strong>
              <small>{{ uploadMeta.product.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.background }"
            @dragover.prevent
            @drop.prevent="handleDrop('background', $event)"
          >
            <div v-if="imageUploads.background" class="commerce-upload__preview">
              <img :src="imageUploads.background.url" :alt="imageUploads.background.name" />
              <button type="button" aria-label="移除目标背景图" @click="removeUpload('background')">
                <CloseOutlined />
              </button>
              <span>目标背景</span>
            </div>
            <button v-else type="button" @click="openUpload('background')">
              <LoadingOutlined v-if="isUploading('background')" />
              <UploadOutlined v-else />
              <strong>{{
                isUploading('background') ? '正在上传' : uploadMeta.background.label
              }}</strong>
              <small>{{ uploadMeta.background.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <label class="commerce-field">
            <span>额外需求</span>
            <textarea
              v-model="prompt"
              maxlength="600"
              placeholder="例如：背景保持简洁，商品下方增加自然投影"
            />
          </label>

          <div class="commerce-presets">
            <span>快捷要求</span>
            <div>
              <button
                v-for="preset in promptPresets"
                :key="preset"
                type="button"
                @click="setPromptPreset(preset)"
              >
                <PlusOutlined />
                {{ preset }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="isPatternTool" class="commerce-editor__content">
          <label class="commerce-field">
            <span>图案应用方式 <em>*</em></span>
            <select v-model="patternApplication">
              <option
                v-for="application in patternApplications"
                :key="application"
                :value="application"
              >
                {{ application }}
              </option>
            </select>
          </label>

          <section class="commerce-field">
            <label>服饰类目 <em>*</em></label>
            <div class="commerce-choice-grid commerce-choice-grid--clothing">
              <button
                v-for="category in clothingCategories"
                :key="category"
                type="button"
                :class="{ active: clothingCategory === category }"
                @click="clothingCategory = category"
              >
                {{ category }}
              </button>
            </div>
          </section>

          <label class="commerce-field">
            <span>图案融合度 <em>*</em></span>
            <select v-model="patternStrength">
              <option v-for="strength in patternStrengths" :key="strength" :value="strength">
                {{ strength }}
              </option>
            </select>
          </label>

          <label class="commerce-field">
            <span>图片分辨率</span>
            <select v-model="patternResolution">
              <option
                v-for="resolution in patternResolutions"
                :key="resolution"
                :value="resolution"
              >
                {{ resolution }}
              </option>
            </select>
          </label>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.clothing }"
            @dragover.prevent
            @drop.prevent="handleDrop('clothing', $event)"
          >
            <div v-if="imageUploads.clothing" class="commerce-upload__preview">
              <img :src="imageUploads.clothing.url" :alt="imageUploads.clothing.name" />
              <button type="button" aria-label="移除基础服饰图片" @click="removeUpload('clothing')">
                <CloseOutlined />
              </button>
              <span>基础服饰</span>
            </div>
            <button v-else type="button" @click="openUpload('clothing')">
              <LoadingOutlined v-if="isUploading('clothing')" />
              <UploadOutlined v-else />
              <strong>{{
                isUploading('clothing') ? '正在上传' : uploadMeta.clothing.label
              }}</strong>
              <small>{{ uploadMeta.clothing.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.pattern }"
            @dragover.prevent
            @drop.prevent="handleDrop('pattern', $event)"
          >
            <div v-if="imageUploads.pattern" class="commerce-upload__preview">
              <img :src="imageUploads.pattern.url" :alt="imageUploads.pattern.name" />
              <button type="button" aria-label="移除图案素材" @click="removeUpload('pattern')">
                <CloseOutlined />
              </button>
              <span>图案素材</span>
            </div>
            <button v-else type="button" @click="openUpload('pattern')">
              <LoadingOutlined v-if="isUploading('pattern')" />
              <UploadOutlined v-else />
              <strong>{{ isUploading('pattern') ? '正在上传' : uploadMeta.pattern.label }}</strong>
              <small>{{ uploadMeta.pattern.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <label class="commerce-field">
            <span>额外需求</span>
            <textarea
              v-model="prompt"
              maxlength="600"
              placeholder="例如：图案颜色降低一点，保留面料褶皱"
            />
          </label>
        </div>

        <div v-else-if="isReplaceTool" class="commerce-editor__content">
          <label class="commerce-field">
            <span>替换类型 <em>*</em></span>
            <select v-model="replacementMode">
              <option v-for="mode in activeReplacementModes" :key="mode" :value="mode">
                {{ mode }}
              </option>
            </select>
          </label>

          <label class="commerce-field">
            <span>替换范围 <em>*</em></span>
            <select v-model="replacementScope">
              <option v-for="scope in replacementScopes" :key="scope" :value="scope">
                {{ scope }}
              </option>
            </select>
          </label>

          <label class="commerce-field">
            <span>输出分辨率</span>
            <select v-model="replacementResolution">
              <option
                v-for="resolution in replacementResolutions"
                :key="resolution"
                :value="resolution"
              >
                {{ resolution }}
              </option>
            </select>
          </label>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.product }"
            @dragover.prevent
            @drop.prevent="handleDrop('product', $event)"
          >
            <div v-if="imageUploads.product" class="commerce-upload__preview">
              <img :src="imageUploads.product.url" :alt="imageUploads.product.name" />
              <button type="button" aria-label="移除商品图片" @click="removeUpload('product')">
                <CloseOutlined />
              </button>
              <span>商品原图</span>
            </div>
            <button v-else type="button" @click="openUpload('product')">
              <LoadingOutlined v-if="isUploading('product')" />
              <UploadOutlined v-else />
              <strong>{{ isUploading('product') ? '正在上传' : uploadMeta.product.label }}</strong>
              <small>{{ uploadMeta.product.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.replacement }"
            @dragover.prevent
            @drop.prevent="handleDrop('replacement', $event)"
          >
            <div v-if="imageUploads.replacement" class="commerce-upload__preview">
              <img :src="imageUploads.replacement.url" :alt="imageUploads.replacement.name" />
              <button
                type="button"
                :aria-label="`移除${activeReplacementProfile.previewLabel}`"
                @click="removeUpload('replacement')"
              >
                <CloseOutlined />
              </button>
              <span>{{ activeReplacementProfile.previewLabel }}</span>
            </div>
            <button v-else type="button" @click="openUpload('replacement')">
              <LoadingOutlined v-if="isUploading('replacement')" />
              <UploadOutlined v-else />
              <strong>{{
                isUploading('replacement') ? '正在上传' : activeReplacementProfile.label
              }}</strong>
              <small>{{ activeReplacementProfile.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <label class="commerce-field">
            <span>额外需求</span>
            <textarea
              v-model="prompt"
              maxlength="600"
              placeholder="例如：保留包装文字和结构，只替换正面视觉"
            />
          </label>

          <div class="commerce-presets">
            <span>快捷要求</span>
            <div>
              <button
                v-for="preset in promptPresets"
                :key="preset"
                type="button"
                @click="setPromptPreset(preset)"
              >
                <PlusOutlined />
                {{ preset }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="isRetouchTool" class="commerce-editor__content">
          <label class="commerce-field">
            <span>处理方式 <em>*</em></span>
            <select v-model="retouchMode">
              <option v-for="mode in retouchModes" :key="mode" :value="mode">{{ mode }}</option>
            </select>
          </label>

          <label class="commerce-field">
            <span>输出分辨率</span>
            <select v-model="retouchResolution">
              <option
                v-for="resolution in retouchResolutions"
                :key="resolution"
                :value="resolution"
              >
                {{ resolution }}
              </option>
            </select>
          </label>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.product }"
            @dragover.prevent
            @drop.prevent="handleDrop('product', $event)"
          >
            <div v-if="imageUploads.product" class="commerce-upload__preview">
              <img :src="imageUploads.product.url" :alt="imageUploads.product.name" />
              <button type="button" aria-label="移除商品图片" @click="removeUpload('product')">
                <CloseOutlined />
              </button>
              <span>商品原图</span>
            </div>
            <button v-else type="button" @click="openUpload('product')">
              <LoadingOutlined v-if="isUploading('product')" />
              <UploadOutlined v-else />
              <strong>{{ isUploading('product') ? '正在上传' : uploadMeta.product.label }}</strong>
              <small>{{ uploadMeta.product.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <label class="commerce-field">
            <span>额外需求</span>
            <textarea
              v-model="prompt"
              maxlength="600"
              placeholder="例如：保留商品边缘细节，背景改为纯白"
            />
          </label>

          <div class="commerce-presets">
            <span>快捷要求</span>
            <div>
              <button
                v-for="preset in promptPresets"
                :key="preset"
                type="button"
                @click="setPromptPreset(preset)"
              >
                <PlusOutlined />
                {{ preset }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="isTryOnTool" class="commerce-editor__content">
          <label class="commerce-field">
            <span>展示姿态 <em>*</em></span>
            <select v-model="tryOnPose">
              <option v-for="pose in tryOnPoses" :key="pose" :value="pose">{{ pose }}</option>
            </select>
          </label>

          <label class="commerce-field">
            <span>目标场景 <em>*</em></span>
            <select v-model="tryOnScene">
              <option v-for="scene in tryOnScenes" :key="scene" :value="scene">{{ scene }}</option>
            </select>
          </label>

          <label class="commerce-field">
            <span>输出分辨率</span>
            <select v-model="tryOnResolution">
              <option v-for="resolution in tryOnResolutions" :key="resolution" :value="resolution">
                {{ resolution }}
              </option>
            </select>
          </label>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.clothing }"
            @dragover.prevent
            @drop.prevent="handleDrop('clothing', $event)"
          >
            <div v-if="imageUploads.clothing" class="commerce-upload__preview">
              <img :src="imageUploads.clothing.url" :alt="imageUploads.clothing.name" />
              <button type="button" aria-label="移除服饰图片" @click="removeUpload('clothing')">
                <CloseOutlined />
              </button>
              <span>服饰素材</span>
            </div>
            <button v-else type="button" @click="openUpload('clothing')">
              <LoadingOutlined v-if="isUploading('clothing')" />
              <UploadOutlined v-else />
              <strong>{{
                isUploading('clothing') ? '正在上传' : uploadMeta.clothing.label
              }}</strong>
              <small>{{ uploadMeta.clothing.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <div
            class="commerce-upload"
            :class="{ filled: imageUploads.model }"
            @dragover.prevent
            @drop.prevent="handleDrop('model', $event)"
          >
            <div v-if="imageUploads.model" class="commerce-upload__preview">
              <img :src="imageUploads.model.url" :alt="imageUploads.model.name" />
              <button type="button" aria-label="移除模特参考图" @click="removeUpload('model')">
                <CloseOutlined />
              </button>
              <span>模特参考</span>
            </div>
            <button v-else type="button" @click="openUpload('model')">
              <LoadingOutlined v-if="isUploading('model')" />
              <UploadOutlined v-else />
              <strong>{{ isUploading('model') ? '正在上传' : uploadMeta.model.label }}</strong>
              <small>{{ uploadMeta.model.description }}</small>
              <em>0 / 1</em>
            </button>
          </div>

          <label class="commerce-field">
            <span>额外需求</span>
            <textarea
              v-model="prompt"
              maxlength="600"
              placeholder="例如：保持服饰图案和版型，姿势自然放松"
            />
          </label>

          <div class="commerce-presets">
            <span>快捷要求</span>
            <div>
              <button
                v-for="preset in promptPresets"
                :key="preset"
                type="button"
                @click="setPromptPreset(preset)"
              >
                <PlusOutlined />
                {{ preset }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="commerce-editor__placeholder">
          <span>
            <ExperimentOutlined />
          </span>
          <strong>{{ activeTool.label }}</strong>
          <p>{{ activeTool.description }}</p>
          <small>该功能入口已保留，将在后续模块中接入完整流程。</small>
        </div>

        <div v-if="uploadError" class="commerce-editor__error" role="alert">
          <span>{{ uploadError }}</span>
          <button type="button" @click="uploadError = ''">
            <CloseOutlined />
          </button>
        </div>

        <footer v-if="isAvailableTool" class="commerce-editor__footer">
          <div>
            <ThunderboltFilled />
            <span>
              <strong>本次预计消耗 {{ generationCost }} 积分</strong>
              <small>当前余额 {{ sessionStore.points }} 积分</small>
            </span>
          </div>
          <button type="button" :disabled="!canSubmit" @click="submitTask">
            <LoadingOutlined v-if="submitting" />
            <SwapOutlined v-else />
            {{ submitting ? '正在提交...' : '开始处理' }}
          </button>
        </footer>

        <input ref="uploadInput" type="file" accept="image/*" hidden @change="handleUpload" />
      </main>

      <section class="commerce-preview commerce-panel">
        <header class="commerce-panel__header">
          <div>
            <EyeOutlined />
            <strong>效果展示</strong>
          </div>
          <span>{{ previewSide === 'before' ? '1 / 2' : '2 / 2' }}</span>
        </header>

        <div class="commerce-preview__canvas">
          <button
            type="button"
            class="commerce-preview__arrow commerce-preview__arrow--left"
            aria-label="查看原始素材"
            @click="previewSide = 'before'"
          >
            <RightOutlined />
          </button>

          <div class="commerce-preview__visual" :class="`is-${previewSide}`">
            <img v-if="previewImage" :src="previewImage" :alt="previewTitle" />
            <GalleryArtwork v-else :title="previewTitle" :variant="previewVariant" />
            <span class="commerce-preview__before-label">BEFORE</span>
            <span class="commerce-preview__after-label">AFTER</span>
            <div class="commerce-preview__caption">
              <strong>{{ previewTitle }}</strong>
              <span>{{ previewDescription }}</span>
            </div>
          </div>

          <button
            type="button"
            class="commerce-preview__arrow commerce-preview__arrow--right"
            aria-label="查看处理效果"
            @click="previewSide = 'after'"
          >
            <RightOutlined />
          </button>
        </div>

        <div class="commerce-preview__status">
          <span>
            <CheckCircleOutlined />
            {{ previewSideLabel }}
          </span>
          <strong>{{ activeTool.label }}</strong>
          <small>{{ isAvailableTool ? '支持上传素材实时预览' : '示例效果预览' }}</small>
        </div>

        <section class="commerce-recommended">
          <header>
            <span>
              <StarOutlined />
              推荐工具
            </span>
          </header>
          <div>
            <button type="button" @click="selectedToolKey = 'image-cutout'">
              <span class="is-blue">
                <PictureOutlined />
              </span>
              <strong>商品抠图</strong>
              <small>一键去除背景，保留商品主体</small>
            </button>
            <button type="button" @click="selectedToolKey = 'style-transfer'">
              <span class="is-purple">
                <AppstoreOutlined />
              </span>
              <strong>风格转换</strong>
              <small>将商品图转换为不同艺术风格</small>
            </button>
            <button type="button" @click="selectedToolKey = 'image-upscale'">
              <span class="is-green">
                <ExperimentOutlined />
              </span>
              <strong>图片放大</strong>
              <small>AI 无损放大，提升图片清晰度</small>
            </button>
          </div>
        </section>
      </section>

      <aside class="commerce-info commerce-panel">
        <div class="commerce-info__title">
          <span>
            <component :is="activeTool.icon" />
          </span>
          <strong>{{ activeTool.label }}</strong>
        </div>

        <section>
          <h2>功能介绍</h2>
          <p>{{ activeTool.description }}支持多种商品类型，适用于电商展示和营销素材制作。</p>
        </section>

        <section>
          <h2>使用步骤</h2>
          <ol>
            <li v-for="(step, index) in toolSteps" :key="step">
              <span>{{ index + 1 }}</span>
              {{ step }}
            </li>
          </ol>
        </section>

        <section>
          <h2>使用技巧</h2>
          <ul>
            <li v-for="tip in toolTips" :key="tip">
              <CheckCircleOutlined />
              {{ tip }}
            </li>
          </ul>
        </section>

        <section class="commerce-info__notice">
          <InfoCircleOutlined />
          <span>
            <strong>积分消耗说明</strong>
            <small>生成一张图片需要 {{ IMAGE_TASK_POINTS_COST }} 积分</small>
          </span>
        </section>

        <div class="commerce-info__support">
          <span>
            <ClockCircleOutlined />
          </span>
          <div>
            <strong>需要帮助？</strong>
            <small>可先使用历史记录查看处理状态。</small>
          </div>
          <button type="button" @click="helpOpen = true">联系支持</button>
        </div>
      </aside>
    </div>

    <div v-if="historyOpen" class="commerce-overlay" @click.self="historyOpen = false">
      <aside class="commerce-drawer" aria-label="历史记录">
        <header>
          <div>
            <HistoryOutlined />
            <span>
              <strong>历史记录</strong>
              <small>{{ visibleWorks.length }} 个电商任务</small>
            </span>
          </div>
          <button type="button" aria-label="关闭历史记录" @click="historyOpen = false">
            <CloseOutlined />
          </button>
        </header>

        <div v-if="workspace.error" class="commerce-drawer__error">
          <span>{{ workspace.error.message }}</span>
          <button type="button" @click="workspace.clearError">关闭</button>
        </div>

        <div v-if="visibleWorks.length > 0" class="commerce-history-list">
          <article v-for="work in visibleWorks" :key="work.id">
            <div>
              <img
                v-if="work.status === 'done' && work.artworkUrl"
                :src="work.artworkUrl"
                :alt="work.prompt"
              />
              <div v-else-if="work.status === 'failed'" class="is-failed">
                <CloseOutlined />
                <span>处理失败</span>
              </div>
              <div v-else class="is-loading">
                <LoadingOutlined />
                <span>{{ work.status === 'queued' ? '等待处理' : '生成中' }}</span>
              </div>
            </div>
            <section>
              <header>
                <strong>{{ work.modelLabel }}</strong>
                <small>{{ formatWorkTime(work.createdAt) }}</small>
              </header>
              <p>{{ work.prompt }}</p>
              <div>
                <span>{{ work.ratio }}</span>
                <span>{{ work.size }}</span>
                <em :class="work.status">{{ workStatusLabel(work.status) }}</em>
              </div>
              <footer v-if="work.status === 'done'">
                <button type="button" @click="workspace.toggleFavorite(work.id)">
                  <StarOutlined />
                  {{ work.favorite ? '已收藏' : '收藏' }}
                </button>
                <button type="button" @click="workspace.downloadWork(work.id)">
                  <DownloadOutlined />
                  下载
                </button>
                <button type="button" @click="workspace.removeWork(work.id)">
                  <DeleteOutlined />
                  删除
                </button>
              </footer>
              <footer v-else-if="work.status === 'failed'">
                <button type="button" @click="workspace.retryWork(work.id)">
                  <ReloadOutlined />
                  重试
                </button>
                <button type="button" @click="workspace.removeWork(work.id)">
                  <DeleteOutlined />
                  删除
                </button>
              </footer>
            </section>
          </article>
        </div>

        <div v-else class="commerce-drawer__empty">
          <span>
            <ShoppingCartOutlined />
          </span>
          <strong>还没有电商生成记录</strong>
          <p>完成一次背景融合或图案替换后，结果会显示在这里。</p>
        </div>
      </aside>
    </div>

    <div
      v-if="helpOpen"
      class="commerce-overlay commerce-overlay--center"
      @click.self="helpOpen = false"
    >
      <section class="commerce-help" role="dialog" aria-modal="true" aria-label="电商工具帮助">
        <header>
          <div>
            <QuestionCircleOutlined />
            <strong>电商工具帮助</strong>
          </div>
          <button type="button" aria-label="关闭帮助" @click="helpOpen = false">
            <CloseOutlined />
          </button>
        </header>
        <div>
          <article>
            <span>01</span>
            <div>
              <strong>先选择左侧工具</strong>
              <p>当前优先开放智能背景融合和服饰图案替换设计师，其余入口暂时保留。</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>准备清晰素材</strong>
              <p>商品主体、服饰边缘和图案分辨率越清晰，处理结果越稳定。</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>提交后查看历史记录</strong>
              <p>任务会在后台处理，完成后可收藏、下载、删除或对失败任务重试。</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.commerce-workbench {
  --commerce-blue: #2c76f0;
  --commerce-border: #e4e8ed;
  --commerce-muted: #8d98a6;
  min-height: 760px;
  padding: 12px 20px 38px;
  background:
    linear-gradient(90deg, rgb(64 83 106 / 2%) 1px, transparent 1px),
    linear-gradient(rgb(64 83 106 / 2%) 1px, transparent 1px), #fbfcfd;
  background-size: 42px 42px;
}

.commerce-workbench__header {
  display: grid;
  min-height: 58px;
  align-items: center;
  gap: 18px;
  grid-template-columns: minmax(220px, auto) minmax(0, 1fr) auto;
  margin-bottom: 10px;
  padding: 9px 13px;
  border: 1px solid var(--commerce-border);
  border-radius: 10px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 8px 24px rgb(38 54 74 / 4%);
}

.commerce-workbench__brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.commerce-workbench__brand > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #2c76f0;
  color: #fff;
  font-size: 17px;
}

.commerce-workbench__brand > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.commerce-workbench__brand strong {
  overflow: hidden;
  color: #202b38;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-workbench__brand small {
  overflow: hidden;
  color: #8c97a3;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-workbench__breadcrumb {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: #8b96a4;
  font-size: 9px;
}

.commerce-workbench__breadcrumb :deep(svg) {
  flex: 0 0 auto;
  font-size: 6px;
}

.commerce-workbench__breadcrumb strong {
  overflow: hidden;
  color: #4d5967;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-workbench__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.commerce-workbench__actions button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #6f7b89;
  font-size: 9px;
  cursor: pointer;
}

.commerce-workbench__actions button:hover {
  border-color: #dfe5ec;
  background: #f7f9fb;
  color: #2c76f0;
}

.commerce-mobile-picker {
  display: none;
}

.commerce-workbench__body {
  display: grid;
  align-items: start;
  gap: 10px;
  grid-template-columns:
    minmax(190px, 0.82fr) minmax(285px, 1.18fr) minmax(380px, 1.72fr)
    minmax(190px, 0.78fr);
}

.commerce-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--commerce-border);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 28px rgb(35 51 71 / 5%);
}

.commerce-panel__header {
  display: flex;
  min-height: 51px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 13px;
  border-bottom: 1px solid #edf0f3;
}

.commerce-panel__header > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: #455363;
}

.commerce-panel__header > div :deep(svg) {
  color: #2c76f0;
  font-size: 12px;
}

.commerce-panel__header strong {
  font-size: 11px;
}

.commerce-panel__header > span {
  color: #9aa4af;
  font-size: 8px;
}

.commerce-catalog {
  position: sticky;
  top: 10px;
  display: grid;
  max-height: calc(100vh - 40px);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
}

.commerce-catalog__search {
  display: grid;
  align-items: center;
  gap: 6px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin: 11px 11px 8px;
  padding: 0 8px;
  border: 1px solid #e5e9ee;
  border-radius: 7px;
  background: #f9fafc;
}

.commerce-catalog__search :deep(svg) {
  color: #9aa5b1;
  font-size: 10px;
}

.commerce-catalog__search input {
  min-width: 0;
  height: 30px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #4d5967;
  font-size: 8px;
}

.commerce-catalog__search input::placeholder {
  color: #a9b1ba;
}

.commerce-catalog__search button {
  display: grid;
  width: 21px;
  height: 21px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #93a0ad;
  cursor: pointer;
}

.commerce-catalog__all,
.commerce-catalog__item {
  display: grid;
  width: 100%;
  min-width: 0;
  align-items: center;
  border: 0;
  background: transparent;
  color: #596676;
  text-align: left;
  cursor: pointer;
}

.commerce-catalog__all {
  grid-template-columns: 24px minmax(0, 1fr) auto auto;
  gap: 7px;
  min-height: 37px;
  padding: 0 12px;
  border-bottom: 1px solid #eef1f4;
}

.commerce-catalog__all > span {
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  border-radius: 6px;
  background: #eef4ff;
  color: #2c76f0;
  font-size: 10px;
}

.commerce-catalog__all strong {
  font-size: 9px;
}

.commerce-catalog__all small {
  color: #9aa5b1;
  font-size: 7px;
}

.commerce-catalog__all :deep(svg:last-child),
.commerce-catalog__item > :deep(svg:last-child) {
  color: #a7b0ba;
  font-size: 6px;
}

.commerce-catalog__groups {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 8px 10px;
  scrollbar-color: #d8dee5 transparent;
  scrollbar-width: thin;
}

.commerce-catalog__groups > section {
  padding-top: 8px;
}

.commerce-catalog__groups > section > header {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  color: #768291;
  font-size: 8px;
}

.commerce-catalog__groups > section > header > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 750;
}

.commerce-catalog__groups > section > header :deep(svg) {
  color: #8e9aa7;
  font-size: 8px;
}

.commerce-catalog__item {
  position: relative;
  min-height: 35px;
  gap: 7px;
  grid-template-columns: 23px minmax(0, 1fr) auto auto;
  padding: 4px 7px;
  border-radius: 6px;
}

.commerce-catalog__item:hover {
  background: #f6f8fb;
}

.commerce-catalog__item.active {
  background: #eef4ff;
  color: #2368dc;
  font-weight: 760;
}

.commerce-catalog__item.active::before {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: #2c76f0;
  content: '';
}

.commerce-catalog__item.muted {
  color: #7f8a97;
}

.commerce-catalog__item > i {
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--tool-accent) 11%, white);
  color: var(--tool-accent);
  font-size: 9px;
}

.commerce-catalog__item > span {
  overflow: hidden;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-catalog__item > em {
  padding: 2px 4px;
  border-radius: 3px;
  background: #f1f3f5;
  color: #9aa3ad;
  font-size: 6px;
  font-style: normal;
  white-space: nowrap;
}

.commerce-catalog__empty {
  display: grid;
  place-items: center;
  gap: 5px;
  padding: 36px 12px;
  color: #97a2ae;
  text-align: center;
}

.commerce-catalog__empty :deep(svg) {
  font-size: 18px;
}

.commerce-catalog__empty strong {
  color: #697584;
  font-size: 9px;
}

.commerce-catalog__empty span {
  font-size: 7px;
}

.commerce-catalog__idea {
  display: grid;
  align-items: center;
  gap: 7px;
  grid-template-columns: 27px minmax(0, 1fr);
  margin: 9px;
  padding: 9px;
  border: 1px solid #dce7fa;
  border-radius: 8px;
  background: #f5f8ff;
}

.commerce-catalog__idea > span {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 7px;
  background: #2c76f0;
  color: #fff;
}

.commerce-catalog__idea > div {
  display: grid;
  gap: 2px;
}

.commerce-catalog__idea strong {
  color: #425166;
  font-size: 8px;
}

.commerce-catalog__idea small {
  color: #8a96a5;
  font-size: 7px;
}

.commerce-catalog__idea button {
  grid-column: 1 / -1;
  height: 27px;
  border: 0;
  border-radius: 5px;
  background: #2c76f0;
  color: #fff;
  font-size: 8px;
}

.commerce-catalog__idea button:disabled {
  background: #c7d2e3;
}

.commerce-editor {
  display: grid;
  min-height: 720px;
  align-content: start;
}

.commerce-editor__tools {
  display: flex;
  gap: 4px;
}

.commerce-editor__tools button {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 3px;
  padding: 0 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #87929e;
  font-size: 7px;
  cursor: pointer;
}

.commerce-editor__tools button:hover {
  background: #f3f6fa;
  color: #2c76f0;
}

.commerce-editor__content {
  display: grid;
  gap: 12px;
  padding: 13px;
}

.commerce-field {
  display: grid;
  gap: 6px;
}

.commerce-field > label,
.commerce-field > span {
  color: #4d5967;
  font-size: 9px;
  font-weight: 720;
}

.commerce-field em {
  color: #f04f4f;
  font-style: normal;
}

.commerce-field input,
.commerce-field select,
.commerce-field textarea {
  width: 100%;
  border: 1px solid #dfe4ea;
  border-radius: 6px;
  outline: 0;
  background: #fff;
  color: #4c5866;
  font-size: 9px;
}

.commerce-field select {
  height: 34px;
  padding: 0 9px;
}

.commerce-field textarea {
  min-height: 74px;
  padding: 9px;
  line-height: 1.6;
  resize: vertical;
}

.commerce-field input:focus,
.commerce-field select:focus,
.commerce-field textarea:focus {
  border-color: #9dbef7;
  box-shadow: 0 0 0 3px rgb(44 118 240 / 7%);
}

.commerce-choice-grid {
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.commerce-choice-grid button {
  min-width: 0;
  height: 29px;
  padding: 0 5px;
  overflow: hidden;
  border: 1px solid #dfe4ea;
  border-radius: 5px;
  background: #fff;
  color: #627080;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.commerce-choice-grid button:hover {
  border-color: #a9c4f3;
}

.commerce-choice-grid button.active {
  border-color: #2c76f0;
  background: #eef4ff;
  color: #2368dc;
  font-weight: 750;
}

.commerce-choice-grid--clothing {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.commerce-upload {
  min-width: 0;
}

.commerce-upload > button {
  display: grid;
  width: 100%;
  min-height: 104px;
  place-items: center;
  align-content: center;
  gap: 5px;
  padding: 12px;
  border: 1px dashed #ccd4de;
  border-radius: 7px;
  background: #fafbfd;
  color: #6d7a89;
  cursor: pointer;
}

.commerce-upload > button:hover {
  border-color: #8fb2ef;
  background: #f7faff;
}

.commerce-upload > button :deep(svg) {
  color: #2c76f0;
  font-size: 18px;
}

.commerce-upload > button strong {
  font-size: 9px;
}

.commerce-upload > button small {
  max-width: 220px;
  color: #9ba5b0;
  font-size: 7px;
  line-height: 1.5;
  text-align: center;
}

.commerce-upload > button em {
  color: #a8b1bb;
  font-size: 7px;
  font-style: normal;
}

.commerce-upload__preview {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid #dfe4ea;
  border-radius: 7px;
  background: #f2f5f8;
}

.commerce-upload__preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.commerce-upload__preview button {
  position: absolute;
  top: 7px;
  right: 7px;
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: rgb(34 45 58 / 75%);
  color: #fff;
  cursor: pointer;
}

.commerce-upload__preview > span {
  position: absolute;
  bottom: 7px;
  left: 7px;
  padding: 3px 6px;
  border-radius: 4px;
  background: rgb(255 255 255 / 88%);
  color: #657281;
  font-size: 7px;
}

.commerce-presets {
  display: grid;
  gap: 6px;
}

.commerce-presets > span {
  color: #788491;
  font-size: 8px;
}

.commerce-presets > div {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.commerce-presets button {
  display: inline-flex;
  min-height: 25px;
  align-items: center;
  gap: 3px;
  padding: 0 7px;
  border: 1px solid #dfe4ea;
  border-radius: 5px;
  background: #fff;
  color: #687584;
  font-size: 7px;
  cursor: pointer;
}

.commerce-presets button:hover {
  border-color: #9dbcf4;
  color: #2c76f0;
}

.commerce-editor__placeholder {
  display: grid;
  min-height: 500px;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 30px;
  color: #8f9aa6;
  text-align: center;
}

.commerce-editor__placeholder > span {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 14px;
  background: #eef4ff;
  color: #2c76f0;
  font-size: 23px;
}

.commerce-editor__placeholder strong {
  color: #4a5664;
  font-size: 12px;
}

.commerce-editor__placeholder p {
  max-width: 280px;
  margin: 0;
  font-size: 8px;
  line-height: 1.6;
}

.commerce-editor__placeholder small {
  color: #a1abb5;
  font-size: 7px;
}

.commerce-editor__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 13px 10px;
  padding: 8px 9px;
  border: 1px solid #f1c8c4;
  border-radius: 6px;
  background: #fff5f4;
  color: #a74239;
  font-size: 8px;
}

.commerce-editor__error button {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.commerce-editor__footer {
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding: 12px 13px;
  border-top: 1px solid #edf0f3;
  background: #fafbfd;
}

.commerce-editor__footer > div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #c07c22;
}

.commerce-editor__footer > div :deep(svg) {
  font-size: 13px;
}

.commerce-editor__footer > div span {
  display: grid;
  gap: 2px;
}

.commerce-editor__footer strong {
  color: #6f5327;
  font-size: 8px;
}

.commerce-editor__footer small {
  color: #9a8a72;
  font-size: 7px;
}

.commerce-editor__footer > button {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 7px;
  background: #2c76f0;
  color: #fff;
  font-size: 10px;
  font-weight: 780;
  cursor: pointer;
}

.commerce-editor__footer > button:hover {
  background: #2368dc;
}

.commerce-editor__footer > button:disabled {
  background: #d7dde5;
  cursor: not-allowed;
}

.commerce-preview {
  display: grid;
  min-height: 720px;
  align-content: start;
}

.commerce-preview__canvas {
  position: relative;
  min-height: 520px;
  padding: 25px 42px 20px;
}

.commerce-preview__visual {
  position: relative;
  height: 470px;
  overflow: hidden;
  border-radius: 8px;
  background: #edf1f5;
}

.commerce-preview__visual::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 42%, rgb(20 29 40 / 65%) 100%);
  content: '';
  pointer-events: none;
}

.commerce-preview__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.commerce-preview__visual :deep(.gallery-artwork) {
  width: 100%;
  height: 100%;
}

.commerce-preview__visual.is-before {
  filter: saturate(0.75);
}

.commerce-preview__before-label,
.commerce-preview__after-label {
  position: absolute;
  bottom: 86px;
  z-index: 2;
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.03em;
}

.commerce-preview__before-label {
  left: 22px;
}

.commerce-preview__after-label {
  right: 22px;
}

.commerce-preview__visual.is-before .commerce-preview__before-label,
.commerce-preview__visual.is-after .commerce-preview__after-label {
  text-shadow: 0 2px 12px rgb(0 0 0 / 30%);
}

.commerce-preview__visual.is-before .commerce-preview__after-label,
.commerce-preview__visual.is-after .commerce-preview__before-label {
  opacity: 0.38;
}

.commerce-preview__caption {
  position: absolute;
  right: 20px;
  bottom: 18px;
  left: 20px;
  z-index: 2;
  display: grid;
  gap: 4px;
  color: #fff;
}

.commerce-preview__caption strong {
  font-size: 15px;
  font-weight: 900;
}

.commerce-preview__caption span {
  color: rgb(255 255 255 / 80%);
  font-size: 8px;
  line-height: 1.5;
}

.commerce-preview__arrow {
  position: absolute;
  top: 50%;
  z-index: 4;
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgb(96 105 116 / 52%);
  color: #fff;
  cursor: pointer;
  transform: translateY(-50%);
}

.commerce-preview__arrow:hover {
  background: rgb(70 82 95 / 78%);
}

.commerce-preview__arrow--left {
  left: 15px;
}

.commerce-preview__arrow--left :deep(svg) {
  transform: rotate(180deg);
}

.commerce-preview__arrow--right {
  right: 15px;
}

.commerce-preview__status {
  display: grid;
  align-items: center;
  gap: 5px 8px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin: 0 14px 13px;
  padding: 9px 10px;
  border: 1px solid #edf0f3;
  border-radius: 7px;
  background: #fafbfd;
}

.commerce-preview__status > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #2a9b6b;
  font-size: 7px;
  font-weight: 800;
}

.commerce-preview__status strong {
  overflow: hidden;
  color: #52606f;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-preview__status small {
  color: #9aa4af;
  font-size: 7px;
}

.commerce-recommended {
  padding: 0 14px 14px;
}

.commerce-recommended > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #596676;
  font-size: 9px;
  font-weight: 760;
}

.commerce-recommended > header span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.commerce-recommended > header :deep(svg) {
  color: #2c76f0;
}

.commerce-recommended > div {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.commerce-recommended button {
  display: grid;
  min-width: 0;
  justify-items: start;
  gap: 5px;
  padding: 9px;
  border: 1px solid #e6e9ed;
  border-radius: 7px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.commerce-recommended button:hover {
  border-color: #b9ccf0;
}

.commerce-recommended button > span {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 6px;
}

.commerce-recommended button > span.is-blue {
  background: #e9f1ff;
  color: #2c76f0;
}

.commerce-recommended button > span.is-purple {
  background: #f0eaff;
  color: #8c55d7;
}

.commerce-recommended button > span.is-green {
  background: #e7f8ef;
  color: #24875f;
}

.commerce-recommended strong {
  overflow: hidden;
  color: #4e5b69;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-recommended small {
  display: -webkit-box;
  overflow: hidden;
  color: #929ca7;
  font-size: 7px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.commerce-info {
  display: grid;
  align-content: start;
}

.commerce-info__title {
  display: grid;
  min-height: 58px;
  align-items: center;
  gap: 8px;
  grid-template-columns: 31px minmax(0, 1fr);
  padding: 0 12px;
  border-bottom: 1px solid #edf0f3;
}

.commerce-info__title > span {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 8px;
  background: #eef4ff;
  color: #2c76f0;
  font-size: 14px;
}

.commerce-info__title strong {
  overflow: hidden;
  color: #354351;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-info section {
  padding: 13px 12px;
  border-bottom: 1px solid #edf0f3;
}

.commerce-info section h2 {
  margin: 0 0 8px;
  color: #455362;
  font-size: 10px;
}

.commerce-info section p {
  margin: 0;
  color: #737f8d;
  font-size: 8px;
  line-height: 1.75;
}

.commerce-info section ol,
.commerce-info section ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.commerce-info section li {
  display: grid;
  align-items: start;
  gap: 7px;
  grid-template-columns: 20px minmax(0, 1fr);
  color: #6f7b89;
  font-size: 8px;
  line-height: 1.5;
}

.commerce-info section ol li > span {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  background: #eef4ff;
  color: #2c76f0;
  font-size: 7px;
  font-weight: 800;
}

.commerce-info section ul li {
  display: flex;
  gap: 5px;
}

.commerce-info section ul li :deep(svg) {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #2ba36f;
  font-size: 8px;
}

.commerce-info__notice {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 11px;
  padding: 9px;
  border: 1px solid #dce7fa;
  border-radius: 7px;
  background: #f5f8ff;
}

.commerce-info__notice :deep(svg) {
  color: #2c76f0;
}

.commerce-info__notice span {
  display: grid;
  gap: 2px;
}

.commerce-info__notice strong {
  color: #4c5c71;
  font-size: 8px;
}

.commerce-info__notice small {
  color: #8492a5;
  font-size: 7px;
}

.commerce-info__support {
  display: grid;
  align-items: center;
  gap: 7px;
  grid-template-columns: 27px minmax(0, 1fr);
  margin: 0 11px 11px;
  padding: 9px;
  border: 1px solid #e5e9ee;
  border-radius: 7px;
}

.commerce-info__support > span {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 7px;
  background: #f2f5f8;
  color: #778594;
}

.commerce-info__support > div {
  display: grid;
  gap: 2px;
}

.commerce-info__support strong {
  color: #4e5b69;
  font-size: 8px;
}

.commerce-info__support small {
  color: #929ca7;
  font-size: 7px;
}

.commerce-info__support button {
  grid-column: 1 / -1;
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: #2c76f0;
  color: #fff;
  font-size: 8px;
  cursor: pointer;
}

.commerce-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  background: rgb(22 30 40 / 26%);
  backdrop-filter: blur(2px);
}

.commerce-overlay--center {
  align-items: center;
  justify-content: center;
}

.commerce-drawer {
  display: grid;
  width: min(440px, 94vw);
  height: 100%;
  grid-template-rows: auto auto minmax(0, 1fr);
  background: #fff;
  box-shadow: -18px 0 45px rgb(23 33 45 / 15%);
}

.commerce-drawer > header,
.commerce-help > header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 15px;
  border-bottom: 1px solid #edf0f3;
}

.commerce-drawer > header > div,
.commerce-help > header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.commerce-drawer > header > div > :deep(svg),
.commerce-help > header > div > :deep(svg) {
  color: #2c76f0;
  font-size: 16px;
}

.commerce-drawer > header span {
  display: grid;
  gap: 2px;
}

.commerce-drawer > header strong,
.commerce-help > header strong {
  color: #374553;
  font-size: 12px;
}

.commerce-drawer > header small {
  color: #98a2ad;
  font-size: 8px;
}

.commerce-drawer > header button,
.commerce-help > header button {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 1px solid #e2e7ec;
  border-radius: 6px;
  background: #fff;
  color: #73808f;
  cursor: pointer;
}

.commerce-drawer__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 11px 11px 0;
  padding: 8px;
  border: 1px solid #f1c8c4;
  border-radius: 6px;
  background: #fff5f4;
  color: #a74239;
  font-size: 8px;
}

.commerce-drawer__error button {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 8px;
  cursor: pointer;
}

.commerce-history-list {
  display: grid;
  min-height: 0;
  align-content: start;
  gap: 10px;
  overflow-y: auto;
  padding: 12px;
}

.commerce-history-list article {
  display: grid;
  overflow: hidden;
  grid-template-columns: 118px minmax(0, 1fr);
  border: 1px solid #e2e7ec;
  border-radius: 8px;
}

.commerce-history-list article > div {
  min-height: 154px;
  overflow: hidden;
  background: #eef2f5;
}

.commerce-history-list article > div img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.commerce-history-list article > div.is-failed,
.commerce-history-list article > div.is-loading {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  color: #b45249;
  font-size: 18px;
}

.commerce-history-list article > div.is-failed span,
.commerce-history-list article > div.is-loading span {
  font-size: 8px;
}

.commerce-history-list article > div.is-loading {
  color: #f3f7fd;
  background:
    linear-gradient(
      115deg,
      rgb(255 255 255 / 0%) 32%,
      rgb(255 255 255 / 55%) 47%,
      rgb(255 255 255 / 0%) 62%
    ),
    #8ea8d6;
  background-size:
    240% 100%,
    100% 100%;
  animation: commerce-loading 1.8s ease-in-out infinite;
}

@keyframes commerce-loading {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -120% 0;
  }
}

.commerce-history-list article > section {
  display: grid;
  min-width: 0;
  align-content: start;
  padding: 10px;
}

.commerce-history-list article > section > header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.commerce-history-list article > section > header strong {
  overflow: hidden;
  color: #4a5765;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-history-list article > section > header small {
  color: #99a3ae;
  font-size: 7px;
  white-space: nowrap;
}

.commerce-history-list article p {
  display: -webkit-box;
  overflow: hidden;
  margin: 7px 0;
  color: #707c89;
  font-size: 7px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.commerce-history-list article section > div {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.commerce-history-list article section > div span,
.commerce-history-list article section > div em {
  padding: 2px 5px;
  border-radius: 4px;
  background: #f1f3f5;
  color: #838e99;
  font-size: 7px;
  font-style: normal;
}

.commerce-history-list article section > div em.done {
  background: #e8f7f0;
  color: #24835f;
}

.commerce-history-list article section > div em.failed {
  background: #fff0ee;
  color: #b84b42;
}

.commerce-history-list article footer {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}

.commerce-history-list article footer button {
  display: inline-flex;
  min-height: 27px;
  align-items: center;
  gap: 4px;
  padding: 0 7px;
  border: 1px solid #e1e6eb;
  border-radius: 5px;
  background: #fff;
  color: #677483;
  font-size: 7px;
  cursor: pointer;
}

.commerce-drawer__empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 30px;
  text-align: center;
}

.commerce-drawer__empty > span {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 14px;
  background: #eef4ff;
  color: #2c76f0;
  font-size: 22px;
}

.commerce-drawer__empty strong {
  color: #495664;
  font-size: 11px;
}

.commerce-drawer__empty p {
  max-width: 230px;
  margin: 0;
  color: #949faa;
  font-size: 8px;
  line-height: 1.6;
}

.commerce-help {
  width: min(520px, calc(100vw - 28px));
  overflow: hidden;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 24px 70px rgb(23 33 45 / 24%);
}

.commerce-help > div {
  display: grid;
  gap: 9px;
  padding: 14px;
}

.commerce-help article {
  display: grid;
  align-items: start;
  gap: 9px;
  grid-template-columns: 29px minmax(0, 1fr);
  padding: 11px;
  border: 1px solid #e6eaee;
  border-radius: 8px;
  background: #fbfcfd;
}

.commerce-help article > span {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border-radius: 7px;
  background: #eef4ff;
  color: #2c76f0;
  font-size: 8px;
  font-weight: 800;
}

.commerce-help article > div {
  display: grid;
  gap: 4px;
}

.commerce-help article strong {
  color: #4a5765;
  font-size: 9px;
}

.commerce-help article p {
  margin: 0;
  color: #7d8996;
  font-size: 8px;
  line-height: 1.6;
}

@media (max-width: 1380px) {
  .commerce-workbench {
    padding-right: 14px;
    padding-left: 14px;
  }

  .commerce-workbench__body {
    grid-template-columns:
      minmax(185px, 0.78fr) minmax(275px, 1.14fr) minmax(350px, 1.62fr)
      minmax(180px, 0.74fr);
  }

  .commerce-preview__canvas {
    padding-right: 34px;
    padding-left: 34px;
  }
}

@media (max-width: 1180px) {
  .commerce-workbench__body {
    grid-template-columns: 205px 290px minmax(0, 1fr);
  }

  .commerce-info {
    grid-column: 2 / 4;
  }

  .commerce-info section {
    padding-top: 11px;
    padding-bottom: 11px;
  }

  .commerce-info section ol {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .commerce-info__notice,
  .commerce-info__support {
    align-self: start;
  }
}

@media (max-width: 920px) {
  .commerce-workbench__header {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .commerce-workbench__breadcrumb {
    display: none;
  }

  .commerce-mobile-picker {
    display: grid;
    gap: 6px;
    margin-bottom: 10px;
    padding: 11px;
    border: 1px solid var(--commerce-border);
    border-radius: 9px;
    background: #fff;
  }

  .commerce-mobile-picker > span {
    color: #5c6978;
    font-size: 9px;
    font-weight: 740;
  }

  .commerce-mobile-picker select {
    width: 100%;
    height: 36px;
    padding: 0 9px;
    border: 1px solid #dfe4ea;
    border-radius: 7px;
    outline: 0;
    background: #fff;
    color: #4e5b69;
    font-size: 9px;
  }

  .commerce-workbench__body {
    grid-template-columns: 1fr;
  }

  .commerce-catalog {
    display: none;
  }

  .commerce-editor,
  .commerce-preview,
  .commerce-info {
    grid-column: auto;
  }

  .commerce-editor,
  .commerce-preview {
    min-height: 0;
  }

  .commerce-preview__canvas {
    min-height: 430px;
  }

  .commerce-preview__visual {
    height: 390px;
  }
}

@media (max-width: 640px) {
  .commerce-workbench {
    padding: 9px 9px 96px;
  }

  .commerce-workbench__header {
    min-height: 54px;
    gap: 8px;
    padding: 8px 9px;
  }

  .commerce-workbench__brand > span {
    width: 31px;
    height: 31px;
  }

  .commerce-workbench__brand strong {
    font-size: 11px;
  }

  .commerce-workbench__brand small {
    max-width: 156px;
  }

  .commerce-workbench__actions button {
    width: 29px;
    height: 29px;
    justify-content: center;
    padding: 0;
    font-size: 0;
  }

  .commerce-workbench__actions button :deep(svg) {
    font-size: 13px;
  }

  .commerce-choice-grid--clothing {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .commerce-preview__canvas {
    min-height: 330px;
    padding: 20px 31px 15px;
  }

  .commerce-preview__visual {
    height: 300px;
  }

  .commerce-preview__caption strong {
    font-size: 12px;
  }

  .commerce-preview__caption span {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .commerce-preview__before-label,
  .commerce-preview__after-label {
    bottom: 78px;
    font-size: 13px;
  }

  .commerce-preview__arrow {
    width: 28px;
    height: 28px;
  }

  .commerce-preview__arrow--left {
    left: 6px;
  }

  .commerce-preview__arrow--right {
    right: 6px;
  }

  .commerce-recommended > div {
    grid-template-columns: 1fr;
  }

  .commerce-info section ol {
    grid-template-columns: 1fr;
  }

  .commerce-history-list article {
    grid-template-columns: 92px minmax(0, 1fr);
  }
}
</style>
