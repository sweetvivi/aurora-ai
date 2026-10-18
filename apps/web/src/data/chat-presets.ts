import {
  AppstoreOutlined,
  BarChartOutlined,
  BulbOutlined,
  CodeOutlined,
  FilePptOutlined,
  FileTextOutlined,
  MoreOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import type { Component } from 'vue';

export interface ChatCapabilityPreset {
  icon: Component;
  label: string;
  prompt: string;
}

export interface ChatSuggestionPreset {
  description: string;
  icon: Component;
  label: string;
  prompt: string;
}

export interface ChatChartPreset {
  label: string;
  preview: string;
  prompt: string;
}

export const chatSuggestions: ChatSuggestionPreset[] = [
  {
    description: '拆解目标并生成可执行步骤',
    icon: BulbOutlined,
    label: '制定工作计划',
    prompt: '帮我拆解本周的工作目标，并整理成可执行的优先级清单。',
  },
  {
    description: '分析需求、风险和验收标准',
    icon: AppstoreOutlined,
    label: '分析产品需求',
    prompt: '请帮我分析这份产品需求中的目标、用户场景、风险和验收标准。',
  },
  {
    description: '优化结构、语气和表达',
    icon: FileTextOutlined,
    label: '润色一段文字',
    prompt: '请把下面的文字改写得更加清晰、专业，并保留原意。',
  },
  {
    description: '解释、调试或生成代码',
    icon: CodeOutlined,
    label: '解决代码问题',
    prompt: '我有一个代码问题，需要你帮助定位原因并给出修复方案。',
  },
];

export const chatCapabilities: ChatCapabilityPreset[] = [
  {
    icon: BarChartOutlined,
    label: '图表报告',
    prompt: '请根据我提供的数据生成一份图表报告，包含关键结论、图表建议和执行摘要。',
  },
  {
    icon: FilePptOutlined,
    label: '制作 PPT',
    prompt: '请帮我规划一份结构清晰、重点突出的演示 PPT，并给出每页标题和要点。',
  },
  {
    icon: AppstoreOutlined,
    label: '应用创作',
    prompt: '请帮我把一个想法梳理成可落地的应用方案，包含页面、流程和数据结构。',
  },
  {
    icon: PictureOutlined,
    label: '生图 / 设计',
    prompt: '请根据产品定位设计一组视觉方向，并给出可用于 AI 生图的详细提示词。',
  },
  {
    icon: VideoCameraOutlined,
    label: '创意视频',
    prompt: '请为一段 30 秒创意视频设计分镜、画面描述、字幕和镜头时长。',
  },
  {
    icon: MoreOutlined,
    label: '更多',
    prompt: '请询问我的具体任务目标，然后给出最合适的工作流程和步骤。',
  },
];

export const chatChartTemplates: ChatChartPreset[] = [
  {
    label: '折线图',
    prompt: '请把下面的数据整理成折线图分析，说明趋势、拐点和异常值。',
    preview: 'line',
  },
  {
    label: '柱状图',
    prompt: '请把下面的数据整理成柱状图分析，对比类别差异并给出结论。',
    preview: 'bar',
  },
  {
    label: '饼图',
    prompt: '请把下面的数据整理成占比分析，说明主要构成和变化原因。',
    preview: 'pie',
  },
  {
    label: '散点图',
    prompt: '请把下面的数据整理成散点图分析，识别相关性和离群点。',
    preview: 'scatter',
  },
  {
    label: '热力图',
    prompt: '请把下面的数据整理成热力图分析，识别高峰、低谷和明显聚集区域。',
    preview: 'heat',
  },
  {
    label: '词云',
    prompt: '请把下面的文本整理成词云分析，提炼高频主题、关键词和语义关联。',
    preview: 'word',
  },
  {
    label: '桑基图',
    prompt: '请把下面的数据整理成桑基图分析，说明不同节点之间的流向和转化关系。',
    preview: 'sankey',
  },
  {
    label: '主题河流图',
    prompt: '请把下面的数据整理成主题河流图分析，展示多个主题随时间的占比变化。',
    preview: 'stream',
  },
  {
    label: '雷达图',
    prompt: '请把下面的数据整理成雷达图分析，对比各维度优势、短板和综合表现。',
    preview: 'radar',
  },
  {
    label: '堆积柱状图',
    prompt: '请把下面的数据整理成堆积柱状图分析，说明总量和各组成部分的变化。',
    preview: 'stack',
  },
  {
    label: '象形柱图',
    prompt: '请把下面的数据整理成象形柱图，用直观图形对比各类别的数量和规模。',
    preview: 'pictorial-bar',
  },
  {
    label: '气泡图',
    prompt: '请把下面的数据整理成气泡图分析，同时比较数值、规模和分布关系。',
    preview: 'bubble',
  },
  {
    label: '旭日图',
    prompt: '请把下面的数据整理成旭日图分析，展示多层级分类的组成和占比关系。',
    preview: 'sunburst',
  },
  {
    label: '面积图',
    prompt: '请把下面的数据整理成面积图分析，展示总体变化趋势和累计规模。',
    preview: 'area',
  },
  {
    label: '漏斗图',
    prompt: '请把下面的数据整理成漏斗图分析，说明各阶段的转化和流失情况。',
    preview: 'funnel',
  },
  {
    label: '矩形树图',
    prompt: '请把下面的数据整理成矩形树图分析，比较各类别的规模占比和层级结构。',
    preview: 'treemap',
  },
  {
    label: 'K线图',
    prompt: '请把下面的数据整理成 K 线图分析，说明开盘、收盘、最高和最低价的走势。',
    preview: 'candlestick',
  },
  {
    label: '流程图',
    prompt: '请把下面的信息整理成流程图，明确步骤、判断分支和流转方向。',
    preview: 'flow',
  },
  {
    label: '甘特图',
    prompt: '请把下面的任务整理成甘特图分析，展示时间范围、依赖关系和关键路径。',
    preview: 'gantt',
  },
  {
    label: '地理坐标/地图',
    prompt: '请把下面的数据整理成地图分析，展示地域分布、差异和热点区域。',
    preview: 'map',
  },
  {
    label: '盒须图',
    prompt: '请把下面的数据整理成盒须图分析，比较中位数、四分位范围和异常值。',
    preview: 'box',
  },
  {
    label: '关系图',
    prompt: '请把下面的数据整理成关系图分析，说明节点之间的联系、强度和群体结构。',
    preview: 'graph',
  },
  {
    label: '路径图',
    prompt: '请把下面的信息整理成路径图，展示用户行为顺序、节点跳转和关键路径。',
    preview: 'path',
  },
  {
    label: '树状图',
    prompt: '请把下面的数据结构整理成树状图，展示父子关系、层级和分支。',
    preview: 'tree',
  },
  {
    label: '平行坐标系',
    prompt: '请把下面的多指标数据整理成平行坐标图，比较不同样本在各维度上的表现。',
    preview: 'parallel',
  },
  {
    label: '仪表盘',
    prompt: '请把下面的指标整理成仪表盘分析，展示当前值、目标值和健康区间。',
    preview: 'gauge',
  },
  {
    label: '日历坐标系',
    prompt: '请把下面的数据整理成日历热力分析，展示周期规律、峰值日期和异常波动。',
    preview: 'calendar',
  },
  {
    label: '矩阵坐标系',
    prompt: '请把下面的数据整理成矩阵图分析，比较两个维度组合下的分布和强弱关系。',
    preview: 'matrix',
  },
  {
    label: '和弦图',
    prompt: '请把下面的关系数据整理成和弦图，展示类别之间的双向联系和联系强度。',
    preview: 'chord',
  },
];
