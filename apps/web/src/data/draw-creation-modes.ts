export const DRAW_CREATION_MODES = ['文生图', '参考图重绘', '局部编辑', '商品图处理'] as const;

export type DrawCreationMode = (typeof DRAW_CREATION_MODES)[number];

export interface DrawCreationModeConfig {
  description: string;
  mode: DrawCreationMode;
  promptPlaceholder: string;
  referenceDescription: string;
  referenceLabel: string;
  requiresReference: boolean;
  submitLabel: string;
}

const MODE_CONFIGS: Record<DrawCreationMode, DrawCreationModeConfig> = {
  文生图: {
    description: '从文字描述直接生成画面，参考图为可选项。',
    mode: '文生图',
    promptPlaceholder: '描述画面，可 Ctrl+V 粘贴图片或拖拽上传',
    referenceDescription: '可选，用参考图辅助锁定主体、构图或风格。',
    referenceLabel: '参考图（可选）',
    requiresReference: false,
    submitLabel: '立即生成',
  },
  参考图重绘: {
    description: '保留参考图主体或构图，根据描述重新绘制画面。',
    mode: '参考图重绘',
    promptPlaceholder: '描述希望如何重绘，例如：保留人物姿态，改为海边日落背景，电影感光线',
    referenceDescription: '至少上传 1 张图片，支持多张参考图重绘。',
    referenceLabel: '参考图（必填）',
    requiresReference: true,
    submitLabel: '开始重绘',
  },
  局部编辑: {
    description: '针对局部区域进行修改，当前使用 1 张原图配合描述完成编辑。',
    mode: '局部编辑',
    promptPlaceholder: '描述需要修改的区域与效果，例如：把左侧花朵改成白色，其他区域保持不变',
    referenceDescription: '需要 1 张原图，描述修改区域和期望效果。',
    referenceLabel: '原图（必填）',
    requiresReference: true,
    submitLabel: '提交局部编辑',
  },
  商品图处理: {
    description: '为商品图替换背景、补充场景并生成商业展示素材。',
    mode: '商品图处理',
    promptPlaceholder: '描述商品图处理目标，例如：保留产品主体，替换为明亮家居场景，突出材质细节',
    referenceDescription: '至少上传 1 张商品图，可继续添加多张素材。',
    referenceLabel: '商品图（必填）',
    requiresReference: true,
    submitLabel: '处理商品图',
  },
};

export function isDrawCreationMode(value: unknown): value is DrawCreationMode {
  return typeof value === 'string' && DRAW_CREATION_MODES.includes(value as DrawCreationMode);
}

export function getDrawCreationModeConfig(mode: DrawCreationMode): DrawCreationModeConfig {
  return MODE_CONFIGS[mode];
}

export function validateDrawCreationInput(input: {
  mode: DrawCreationMode;
  prompt: string;
  referenceCount: number;
}): string {
  if (MODE_CONFIGS[input.mode].requiresReference && input.referenceCount === 0) {
    return MODE_CONFIGS[input.mode].referenceDescription;
  }

  if (!input.prompt.trim()) {
    return '请先填写创作描述';
  }

  return '';
}
