import type { AgentCapabilityId, AgentCatalogItem } from './agents';

interface AgentCategoryBlueprint {
  actions: string[];
  capabilities: AgentCapabilityId[];
  category: string;
  colors: string[];
  glyphs: string[];
  shortTag: string;
  targetCount: number;
  topics: string[];
}

const categoryBlueprints: AgentCategoryBlueprint[] = [
  {
    actions: ['制定学习计划', '拆解知识难点', '设计练习路径', '生成测验题', '复盘薄弱环节', '讲解核心概念'],
    capabilities: ['document-report', 'web-research'],
    category: '教育与培训',
    colors: ['#f08a45', '#ee6a62', '#d7669a', '#4e91d8', '#3d9f7b'],
    glyphs: ['学', '教', '习', '知', '课', '练'],
    shortTag: '教育',
    targetCount: 603,
    topics: ['K12 学习', '大学课程', '英语备考', '编程入门', '职业技能', '考研复习', '课堂设计', '成人自学'],
  },
  {
    actions: ['生成视觉方向', '优化画面提示词', '设计角色设定', '拆解摄影镜头', '匹配品牌气质', '扩展创意草图'],
    capabilities: ['ai-drawing', 'image-analysis', 'smart-chart'],
    category: 'AI 视觉创作',
    colors: ['#8a64ed', '#d65aa9', '#f06f72', '#3f8ed7', '#e0a23e'],
    glyphs: ['绘', '影', '色', '艺', '景', '创'],
    shortTag: '视觉',
    targetCount: 370,
    topics: ['文生图', '品牌海报', '电商视觉', '角色插画', '产品摄影', '概念场景', '漫画分镜', '三维渲染'],
  },
  {
    actions: ['给出处理流程', '检查画质问题', '规划抠图步骤', '整理调色方案', '分析构图光线', '生成修图参数'],
    capabilities: ['ai-retouch', 'image-analysis', 'image-ocr'],
    category: '图形与图像处理',
    colors: ['#3b9b86', '#4c83d8', '#a968d6', '#e37957', '#78a63f'],
    glyphs: ['修', '图', '像', '形', '色', '质'],
    shortTag: '图像',
    targetCount: 375,
    topics: ['人像精修', '商品抠图', '老照片修复', '海报排版', '图片扩图', '背景替换', '批量水印', '清晰度增强'],
  },
  {
    actions: ['整理文档结构', '提取关键结论', '改写专业表达', '生成周报月报', '检查材料完整性', '制作汇报摘要'],
    capabilities: ['document-report', 'ppt', 'web-reading'],
    category: '办公文档生成',
    colors: ['#4f84d8', '#2fa87a', '#7468d7', '#e18b42', '#d35d7f'],
    glyphs: ['文', '办', '报', '稿', '汇', '档'],
    shortTag: '办公',
    targetCount: 560,
    topics: ['会议纪要', '周报月报', '产品需求', '招投标文件', '项目复盘', '公文写作', '汇报材料', '合同摘要'],
  },
  {
    actions: ['设计分析指标', '解释数据变化', '生成图表建议', '检查统计口径', '整理 SQL 思路', '提炼业务结论'],
    capabilities: ['smart-chart', 'math', 'web-visualization'],
    category: '数据计算与分析',
    colors: ['#258866', '#477ed9', '#8966d1', '#d69b32', '#d96568'],
    glyphs: ['数', '析', '算', '图', '表', '统'],
    shortTag: '数据',
    targetCount: 610,
    topics: ['经营分析', '用户增长', '销售漏斗', '留存分析', '库存预测', '财务报表', '实验评估', '指标体系'],
  },
  {
    actions: ['整理检索路径', '核验信息来源', '提取核心观点', '建立资料清单', '比较多方观点', '输出研究摘要'],
    capabilities: ['web-search', 'web-reading', 'web-research'],
    category: '知识检索与信息获取',
    colors: ['#2c8ea9', '#536fd1', '#368f75', '#ad6ab8', '#dc824c'],
    glyphs: ['检', '索', '知', '讯', '源', '查'],
    shortTag: '检索',
    targetCount: 475,
    topics: ['行业调研', '竞品资料', '政策查询', '论文检索', '新闻核查', '知识地图', '来源比对', '专题资料'],
  },
  {
    actions: ['定位代码问题', '解释执行流程', '设计重构方案', '生成单元测试', '检查接口边界', '整理发布步骤'],
    capabilities: ['code', 'web-search'],
    category: '编程与软件开发',
    colors: ['#5278e8', '#268fd0', '#2d9f75', '#705bd4', '#d26075'],
    glyphs: ['码', '编', '栈', '测', '构', '云'],
    shortTag: '代码',
    targetCount: 240,
    topics: ['前端开发', '后端服务', '数据库', 'API 设计', '自动化测试', '性能优化', 'DevOps', '代码审查'],
  },
  {
    actions: ['生成内容策略', '扩写营销文案', '拆解受众需求', '设计传播节奏', '优化标题卖点', '生成活动方案'],
    capabilities: ['document-report', 'web-search', 'small-game'],
    category: '创意营销与内容策划',
    colors: ['#ed5c76', '#e77f42', '#835ed7', '#358fc9', '#36a473'],
    glyphs: ['营', '创', '策', '文', '播', '秀'],
    shortTag: '营销',
    targetCount: 365,
    topics: ['新品发布', '社媒运营', '短视频脚本', '品牌故事', '活动策划', '直播话术', '用户增长', '内容日历'],
  },
  {
    actions: ['梳理研究框架', '分析文献结构', '检查论证逻辑', '提炼研究方法', '整理引用关系', '生成开题提纲'],
    capabilities: ['web-research', 'document-report', 'web-reading'],
    category: '学术与研究辅助',
    colors: ['#6d72c7', '#4c86ca', '#3d9b83', '#a864b1', '#d17c49'],
    glyphs: ['研', '论', '学', '证', '引', '思'],
    shortTag: '学术',
    targetCount: 255,
    topics: ['论文选题', '文献综述', '研究方法', '实验设计', '学术表达', '开题报告', '数据分析', '投稿检查'],
  },
  {
    actions: ['优化语言表达', '统一术语翻译', '校对语法与标点', '改写不同语气', '提取文本摘要', '整理双语版本'],
    capabilities: ['document-report', 'web-reading'],
    category: '语言与文字处理',
    colors: ['#dd6b52', '#d4557d', '#7a63d4', '#368fc4', '#3d9d77'],
    glyphs: ['译', '语', '文', '词', '校', '写'],
    shortTag: '语言',
    targetCount: 450,
    topics: ['商务翻译', '学术润色', '英语学习', '日语学习', '多语客服', '公文校对', '内容改写', '术语统一'],
  },
  {
    actions: ['整理沟通要点', '设计运营流程', '生成客户回复', '检查合规边界', '拆解项目任务', '输出执行清单'],
    capabilities: ['document-report', 'web-search', 'math'],
    category: '商务与运营支持',
    colors: ['#a96b31', '#4d79bd', '#368d72', '#9b63af', '#cb5f70'],
    glyphs: ['商', '运', '法', '客', '项', '管'],
    shortTag: '商务',
    targetCount: 330,
    topics: ['客户沟通', '合同摘要', '项目管理', '团队协作', '供应链', '招聘面试', '运营复盘', '商务提案'],
  },
  {
    actions: ['制定行动安排', '整理生活清单', '生成路线方案', '推荐娱乐内容', '分析兴趣爱好', '提供实用建议'],
    capabilities: ['web-search', 'smart-chart'],
    category: '生活与娱乐',
    colors: ['#2fa9a0', '#e48b4d', '#4d82d1', '#d85f8a', '#6e9d45'],
    glyphs: ['旅', '练', '食', '玩', '家', '趣'],
    shortTag: '生活',
    targetCount: 280,
    topics: ['旅行规划', '健身训练', '健康饮食', '家居整理', '影视推荐', '亲子活动', '宠物照护', '兴趣学习'],
  },
  {
    actions: ['检查用户体验', '梳理信息架构', '生成交互流程', '评审界面层级', '整理设计规范', '输出验收清单'],
    capabilities: ['web-generation', 'image-analysis', 'small-game'],
    category: '产品与 UI 设计',
    colors: ['#3e83d4', '#765fcf', '#2f9a82', '#d26a86', '#d89043'],
    glyphs: ['品', '设', '界', '交', '验', '构'],
    shortTag: '产品',
    targetCount: 265,
    topics: ['移动应用', '后台系统', '落地页', '交互原型', '设计系统', '用户研究', '可用性测试', '数据看板'],
  },
  {
    actions: ['改写传播内容', '设计栏目结构', '生成短视频脚本', '优化标题摘要', '整理发布节奏', '提炼受众话题'],
    capabilities: ['ai-video', 'document-report', 'web-search'],
    category: '媒体与传播',
    colors: ['#d65c86', '#ce6b4e', '#596fc5', '#348ba6', '#409774'],
    glyphs: ['媒', '播', '闻', '稿', '镜', '声'],
    shortTag: '媒体',
    targetCount: 245,
    topics: ['新媒体编辑', '短视频策划', '新闻摘要', '播客提纲', '栏目规划', '社交传播', '视频号运营', '舆情整理'],
  },
  {
    actions: ['拆解多步任务', '切换处理方式', '汇总多源材料', '制定综合方案', '检查输出结构', '协调多种能力'],
    capabilities: [
      'code',
      'document-report',
      'image-analysis',
      'smart-chart',
      'web-search',
      'web-visualization',
    ],
    category: '综合工具（多模态）',
    colors: ['#536fcd', '#3f8db5', '#2e9a7e', '#8b62c3', '#d2764d'],
    glyphs: ['通', '全', '合', '智', '多', '集'],
    shortTag: '综合',
    targetCount: 410,
    topics: ['综合分析', '项目助手', '学习工作流', '内容工作流', '数据工作流', '个人知识库', '跨工具协作', '复杂任务'],
  },
  {
    actions: ['生成商品卖点', '优化详情页文案', '分析用户评价', '设计活动机制', '比较竞品信息', '整理客服话术'],
    capabilities: ['ai-drawing', 'document-report', 'web-search'],
    category: 'AI 电商',
    colors: ['#dfa12f', '#df6b53', '#4b84c8', '#3c997a', '#a65da7'],
    glyphs: ['商', '评', '货', '店', '客', '营'],
    shortTag: '电商',
    targetCount: 250,
    topics: ['商品标题', '详情页', '用户评价', '客服话术', '活动运营', '竞品分析', '选品建议', '直播带货'],
  },
  {
    actions: ['分析图片内容', '生成修图建议', '提取画面文字', '设计生图提示词', '匹配视觉风格', '检查图片用途'],
    capabilities: ['ai-drawing', 'ai-retouch', 'image-analysis', 'image-ocr', 'image-search'],
    category: 'AI 图片',
    colors: ['#168b75', '#3e7fc7', '#8e61c9', '#d3678a', '#de9141'],
    glyphs: ['图', '像', '绘', '色', '视', '审'],
    shortTag: '图片',
    targetCount: 275,
    topics: ['图片分析', '图片搜索', 'OCR 识别', '视觉提示词', '商品图优化', '人像美化', '图片分类', '风格迁移'],
  },
];

const namePrefixes = [
  '小极',
  '青云',
  '星火',
  '知行',
  '灵感',
  '数智',
  '轻舟',
  '万象',
  '灵犀',
  '墨川',
  '晨星',
  '云帆',
  '问渠',
  '微光',
  '一格',
  '远山',
  '聚点',
  '拾光',
  '拓野',
  '明窗',
];

const nameSuffixes = ['助手', '教练', '管家', '专家', '工作台', '研究员', '策划师', '分析师', '创作家', '顾问'];

export function buildGeneratedAgentCatalog(
  existingCatalog: AgentCatalogItem[],
  targetTotal = 6358,
): AgentCatalogItem[] {
  const catalog = [...existingCatalog];

  for (const blueprint of categoryBlueprints) {
    const existingCount = catalog.filter((agent) => agent.category === blueprint.category).length;
    const quota = Math.max(0, blueprint.targetCount - existingCount);
    const categoryKey = categoryBlueprints.indexOf(blueprint) + 1;

    for (let index = 0; index < quota; index += 1) {
      const prefix = namePrefixes[index % namePrefixes.length] ?? '智能';
      const topic =
        blueprint.topics[Math.floor(index / namePrefixes.length) % blueprint.topics.length] ?? '综合';
      const suffix =
        nameSuffixes[
          Math.floor(index / (namePrefixes.length * blueprint.topics.length)) % nameSuffixes.length
        ] ?? '助手';
      const action = blueprint.actions[(index * 5 + categoryKey) % blueprint.actions.length] ?? '完成分析';
      const glyph = blueprint.glyphs[(index * 3 + categoryKey) % blueprint.glyphs.length] ?? '智';
      const color = blueprint.colors[(index * 7 + categoryKey) % blueprint.colors.length] ?? '#5b7cfa';

      catalog.push({
        capabilities: blueprint.capabilities,
        category: blueprint.category,
        color,
        description: `面向${topic}场景，帮助你${action}，并输出清晰、可执行的结果。`,
        glyph,
        id: `official-${String(categoryKey).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`,
        name: `${prefix}${topic}${suffix}`,
        opening: `告诉我你的${topic}目标和已有材料，我会围绕“${action}”逐步梳理并给出可执行结果。`,
        rating: Number((4.1 + ((index * 7 + categoryKey) % 9) / 10).toFixed(1)),
        starterPrompts: [
          `帮我处理一个${topic}任务`,
          `给我一套${action}的步骤`,
          `检查我的${topic}方案是否完整`,
        ],
        tags: [topic, action, blueprint.shortTag],
        usage: 60 + ((index * 137 + categoryKey * 317) % 5200),
      });
    }
  }

  if (catalog.length < targetTotal) {
    const fallback = catalog[catalog.length - 1];
    if (!fallback) {
      return catalog;
    }

    while (catalog.length < targetTotal) {
      const index = catalog.length;
      catalog.push({
        ...fallback,
        id: `official-extra-${String(index + 1).padStart(4, '0')}`,
        name: `${namePrefixes[index % namePrefixes.length] ?? '智能'}综合${
          nameSuffixes[index % nameSuffixes.length] ?? '助手'
        }`,
        usage: fallback.usage + index,
      });
    }
  }

  return catalog.slice(0, targetTotal);
}
