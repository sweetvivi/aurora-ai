# M2 工具套件工作日志

更新时间：2026-10-17

## 1. 当前分支和基线

- 工作目录：`C:\Users\Administrator\Desktop\project2`
- 分支：`main`
- 分支起始提交：`5ced005 docs: mark m1 synchronization complete`
- 视频链路批次基线：`19af73a feat: connect media workflows and agent history`
- 当前阶段：M2 工具套件闭环收尾；智能体、图片和视频优先链路已打通

## 2. 本批范围

按用户确认的优先级，以下模块进入本批：

1. 模型对话
2. AI 绘画
3. 超级智能体
4. 智能修图
5. 图片生成
6. 视频生成
7. AI 画布
8. 电商工具

参考产品其他板块继续保留位置，不进入本批实现。

## 3. 已实现内容

### 真实图片 Provider

- 后端模块：`apps/api/src/providers/openai-image/`
- 能力：接入 OpenAI 兼容的 `/images/generations` 和 `/images/edits`，支持文生图和原图编辑
- 模型：前端别名 `jiguang-gpt-image-2.5`，上游模型 `gpt-image-2.5`
- 运行模式：`IMAGE_PROVIDER=auto` 在配置 Key 时使用真实 Provider，无 Key 时使用 Mock；`mock` 和 `openai` 可强制指定
- 鉴权：支持主 Key 和备用 Key；只在 `401/403` 鉴权失败时尝试备用 Key，普通错误不会重复消费额度
- 结果处理：支持 `b64_json` 和远程 URL，限制 30 MB，校验 PNG/JPEG/WebP/GIF 文件头
- 错误处理：超时、限流、服务不可用、无效响应、下载失败和结果过大都会进入图片任务失败状态并退回积分
- 本地低成本验收：1 张图片、`low` 质量、约 26 秒完成，结果 `1254x1254`，积分从 100 结算为 95；未读取或输出任何 Key

### 智能体真实流式对话

- 页面：`apps/web/src/views/AgentDetailView.vue`
- Store：`apps/web/src/stores/agent-workspace.ts`
- 后端：`apps/api/src/chat/chat.service.ts`
- 请求契约：`streamChat` 新增可选 `systemPrompt`
- 能力：智能体详情页使用与模型对话相同的 SSE 链路，支持流式增量、停止生成、错误状态、积分同步、会话 ID 和模型别名持久化
- 角色隔离：智能体名称、分类、描述、instructions 和标签会组合成临时 system message；该消息不写入会话历史，也不改变共享聊天接口的存储结构
- 恢复策略：应用重启后，持久化中的 `PENDING`/`STREAMING` 消息会恢复为 `FAILED`，没有内容时显示“生成已中断”
- 自建智能体：创建流程保存的 `instructions` 会在后续会话中生效
- 创建器结构：标签改为多选下拉，“界面定制”和“对话配置”支持同时展开，并新增参考示例上传占位
- 模块能力：新增 AI 绘画、AI 视频、AI 修图、联网搜索、代码、PPT、数学、图片分析、OCR、图片搜索、图表、网页生成、小游戏、网页读取、PDF 报告、学术搜索和网页可视化共 17 项复选能力
- 能力生效：选中的模块能力会保存到智能体草稿，并拼入后续真实会话的临时系统提示词

### AI 绘画

- 页面：`apps/web/src/views/DrawStudioView.vue`
- 新版智能生图：`/draw?view=templates`
- 旧版生成页：`/draw?view=generate`
- 效果模板：发型变换、服装换装、天空替换、商品场景、动漫风格和老照片修复
- 模板能力：分类筛选、原图/效果图示意、操作步骤、效果选择、提示词和创作模式回填、固定底部生成栏
- 作品广场：新增全部、写实、人物、头像、动漫、3D、国风、风景、建筑和其他筛选，并按提示词和模型标签做本地分类
- 作品操作：完成态卡片支持使用提示词、收藏、下载和删除；390px 移动端按钮采用 2x2 排列
- 边界：模板只回填表单参数，不会在上传图片或选择模板时自动创建付费任务

### 智能修图

- 路由：`/retouch`
- 兼容旧入口：`/image-tools`
- 页面：`apps/web/src/views/ImageToolWorkbenchView.vue`
- 能力：原图上传、画质增强、超清放大、一键抠图、智能擦除、背景替换、风格调整、处理强度、任务记录、收藏、下载、删除和重试
- 默认界面：深色无限画布、顶部“我的创作”、底部缩放/撤销/恢复工具条和右侧对话式修图面板
- 交互：上传原图、切换处理方式、输入补充指令、选择修图模型、提交真实图片任务、点击最近作品切换画布内容
- 兼容：点击“返回旧版”可回到原有白绿色表单工作台；`/image-generation` 继续使用原工作台，不受本次重构影响

### 图片生成

- 路由：`/image-generation`
- 页面：`apps/web/src/views/ImageToolWorkbenchView.vue`
- 默认界面：轻量网格画布、按月份整理的作品记录、完成态作品卡片和底部固定提示词创作栏
- 能力：模型选择、提示词、参考图上传、画面比例、输出清晰度、生成数量、任务记录、收藏、下载、复制提示词、删除和重试
- 兼容：点击“旧文生图”可回到原有表单式工作台；`/retouch` 的智能修图新界面不受影响

### 视频生成

- 路由：`/video`
- 页面：`apps/web/src/views/VideoStudioView.vue`
- 默认界面：全宽深色视频工作台，顶部创作工具切换、左侧模型轨道、中间参数面板和右侧作品广场
- 能力：文生视频、图生视频、首尾帧、镜头描述、提示词预设、模型、比例、时长、清晰度、任务轮询、取消、重试、收藏、视频下载和再创作
- 作品区：创意广场与我的作品切换，示例作品支持一键复制提示词并回填参数
- 响应式：移动端模型轨道横向排列，控制面板和作品区顺序堆叠，窄屏作品改为单列
- 后端：`apps/api/src/video-tasks/`
- 数据模型：`VideoTask` 保存输入参数、状态、结果文件、Provider 请求 ID、错误分类、冻结记录和幂等键
- Provider 路由：`VIDEO_PROVIDER=auto|mock|xai`；`auto` 在配置视频 Key 时使用真实 xAI Provider，无 Key 时使用确定性 Mock
- 真实模型：`xai-grok-imagine-video`、`xai-grok-imagine-video-1.5`
- 真实 Provider 能力：支持文生视频和单张参考图；首尾帧模式只保留 Mock，真实模式会返回明确的不支持错误，不消耗生成额度
- 任务闭环：创建时冻结积分，Provider 完成后下载并校验视频结果，成功结算、失败或取消退回；应用重启后恢复中断任务
- 幂等边界：相同幂等键会复用原任务；PostgreSQL JSONB 重排对象键后仍使用深度相等比较，不会误判为参数相同
- 结果边界：支持 MP4/WebM 原生播放，限制结果大小并校验视频文件头；Mock 结果使用 SVG 演示预览
- 上游边界：不接入或消耗 Seedance；真实视频验收必须通过受控开关手动启用，自动测试使用 Mock 或 Playwright 路由拦截

### AI 画布

- 路由：`/canvas`
- 页面：`apps/web/src/views/CanvasStudioView.vue`
- 能力：节点添加、选择、拖拽、删除、复制和连线，图片/输出/提示词节点，画布平移缩放，工作流面板、素材库、图片/视频历史、灵感面板、底部生成区和本地持久化
- 素材分类：全部、角色、场景、物品、风格、声音、其他
- 默认界面：纯黑点阵无限画布、悬浮图片节点、左侧窄工具栏、顶部保存/新建操作、底部创作输入框和右下灵感入口
- 弹层结构：加号菜单、我的工作流/示例工作流、素材库、图片历史/视频历史均保持深色半透明悬浮面板
- 交互边界：灵感画板默认关闭，可点击左侧灵感按钮或右下圆钮打开；继续保留节点、连线、历史、工作流和本地任务能力

### 电商工具

- 路由：`/commerce`
- 页面：`apps/web/src/views/CommerceWorkbenchView.vue`
- 结构：按参考产品改为左侧工具目录、中间操作面板、效果展示和右侧功能说明四栏；移动端隐藏目录栏并切换为顶部工具选择器
- 优先工具：智能背景融合、服饰图案替换设计师已提供独立表单、上传素材、参数选择、效果示例和任务提交入口
- 工具目录：商品替换与商品换背景分组保留参考产品同类入口，暂未接入完整流程的工具标记“即将开放”
- 操作能力：商品/服饰与目标素材上传、类目和融合参数、快捷描述、重置/清除、历史记录、帮助弹层、收藏、下载、删除和重试
- 任务隔离：复用共享图片任务状态机，使用 `commerce` 工具键隔离记录，不创建页面加载或素材上传阶段的付费任务

### 导航和入口

- `apps/web/src/layouts/PlatformShell.vue`
- `apps/web/src/views/HomeView.vue`
- `apps/web/src/views/FeaturePlaceholderView.vue`

主侧栏和首页按六个优先模块排序；AI 画布、电商工具进入导航并加载独立工作台。

### 跨模块闭环和智能体历史

- AI 绘画完成态作品可打开详情层，查看作品信息并执行下载、收藏、复用提示词、重新生成、编辑、视频、抠图、裁剪扩图、擦除和重绘
- 作品详情进入智能修图时会通过 `operation`、`prompt` 和 `sourceWork` 带回处理方式、提示词和真实原图文件
- 作品详情进入视频生成时会切换到图生视频、带回提示词，并加载原作品作为参考帧
- 智能修图、视频生成都会在读取原作品成功后创建本地 Blob URL；原作品不可用时会显示错误，不会自动创建付费任务
- 超级智能体详情新增历史记录抽屉，按“今天 / 昨天 / 最近 7 天 / 日期”分组，点击会话后关闭抽屉并切换会话
- 桌面端历史抽屉为右侧覆盖面板，移动端为全屏面板；左侧“所有会话”列表继续保留

### 共享图片任务

- `apps/web/src/stores/draw-workspace.ts`
- `apps/web/src/stores/draw-workspace.spec.ts`

图片任务记录新增 `tool` 和 `parameters`，绘画、智能修图和图片生成共享后端异步任务状态机，同时按工具隔离记录、重试参数和页面显示。

AI 画布和电商工具复用同一异步图片任务 Store，并分别使用 `canvas` 和 `commerce` 工具键隔离记录。

### 多模型对话路由

- 注册表：`apps/api/src/models/model-registry.service.ts`
- Provider：`apps/api/src/providers/openai-compatible/openai-compatible.provider.ts`
- 模型：`openai-gpt-6-astra`、`openai-gpt-6-sol`、`deepseek-v4-pro-0813`、`deepseek-v4-1-flash-0910`、`qwen-3-8-max`、`qwen-3-8-flash`、`qwen-3-8-27b`、`qwen-3-8-max-0902`
- 路由：模型别名携带独立 `providerCode`，对话服务按 Provider 组解析凭证，不再让 DeepSeek 或 Qwen 缺 Key 时回退到默认 GPT 组
- 配置：新增 `LLM_DEEPSEEK_BASE_URL`、`LLM_DEEPSEEK_API_KEY`、`LLM_QWEN_BASE_URL`、`LLM_QWEN_API_KEY`
- 公开边界：模型列表只返回别名、显示名和能力，不暴露上游模型 ID 或任何 Key
- 真实联调：通过本地 API 和 `http://127.0.0.1:5173/chat` 选择 `Qwen 3.8 Max` 完成一次真实 SSE 对话，浏览器收到 `OK`，无页面错误或横向溢出
- 可用性：GPT 和 DeepSeek 组当前受上游服务影响分别返回不可用或限流并自动退款；千问组已验证 4 个模型均可返回 `OK`

## 4. 验证记录

以下命令已通过：

```text
pnpm --filter @aurora/web test
pnpm --filter @aurora/web typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
```

测试规模：

- Web：6 个测试文件，23 项通过
- API：14 个测试文件，42 项通过

页面验收脚本：

```text
outputs/ui-reference/verify-m2-routes.mjs
```

使用本地开发服务器 `http://127.0.0.1:5173/` 检查了以下路由的 `1440x1000` 桌面端和 `390x844` 移动端：

- `/chat`
- `/draw`
- `/agents`
- `/retouch`
- `/image-generation`
- `/video`
- `/canvas`
- `/commerce`

结果：全部页面无横向溢出、无页面脚本错误；截图保存在本地忽略目录 `outputs/ui-reference/`。

智能修图新版在 `1440x1000` 和 `390x844` 下完成单独截图检查：桌面端保持左右画布结构，移动端按画布、对话面板顺序堆叠；无横向溢出和页面脚本错误。

补充验证：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-m2-routes.mjs
```

视频生成新版完成单独截图检查：

```text
node outputs/ui-reference/verify-video-studio.mjs
node outputs/ui-reference/verify-video-tasks.mjs
```

- 桌面端 `1440x1000`：保持模型轨道、参数面板和作品广场三栏结构，无横向溢出和页面脚本错误
- 移动端 `390x844`：模型轨道转为横向，控制面板与作品广场顺序堆叠，无横向溢出和页面脚本错误
- 示例作品“复制”会回填提示词、比例、时长和对应视频模型，不创建付费任务
- 任务验收覆盖创建、轮询、完成态视频渲染、取消、重试、下载和结果 Blob；桌面端与 `390x844` 移动端均通过
- 任务验收使用 Playwright 路由拦截，没有调用真实视频、图片或对话接口

AI 画布和电商工具页面已人工检查，桌面端和移动端保持同一工具信息层级，未触发真实生成任务。

AI 画布视觉精修补充验证：

```text
node outputs/ui-reference/verify-canvas-studio.mjs
```

- 桌面端 `1440x1000`：默认无右侧灵感栏，图片节点为悬浮素材结构，加号、工作流、历史和灵感入口均可打开
- 移动端 `390x844`：工具栏、加号菜单和底部创作区可用，无横向溢出和页面脚本错误
- 验证脚本不创建真实生成任务，不读取或输出 Key

电商工具视觉精修补充验证：

```text
node outputs/ui-reference/verify-commerce-studio.mjs
```

- 桌面端 `1440x1000`：四栏结构正常，可切换智能背景融合和服饰图案替换设计师，上传区、历史抽屉和帮助弹层可用
- 移动端 `390x844`：顶部工具选择器可切换图案替换工具，历史和帮助弹层可用，无横向溢出和页面脚本错误
- 验收使用拦截后的本地图片上传响应，不调用真实生成，不读取或输出 Key

智能体流式对话补充验证使用 Mock API 完成：

- 验证 `systemPrompt`、`conversationId` 和 `modelAlias` 请求字段
- 验证 `meta`、`delta`、`done`、`error` 对消息、会话、积分和状态的影响
- 验证停止生成和重启恢复
- 不触发真实对话 Key，不消耗参考产品或上游额度

多模型真实对话补充验证：

```text
node outputs/ui-reference/verify-live-qwen-chat.mjs
```

- `1440x1000` 桌面端打开 `/chat` 后，模型下拉实际显示 8 个模型
- 选择 `Qwen 3.8 Max` 发起“只回复 OK”，SSE 返回 `meta`、`delta`、`done`，页面完成态显示 `OK`
- 验证过程不读取或输出 Key，不调用参考产品生成接口；上游对话按项目积分规则正常结算

跨模块交互补充验证：

```text
node outputs/ui-reference/verify-m2-interactions.mjs
```

- 桌面端 `1440x1000` 和移动端 `390x844` 均通过
- 验证 AI 绘画详情进入智能修图后，处理方式为“一键抠图”、原图保留文件名并显示为 Blob URL
- 验证 AI 绘画详情进入视频生成后，模式为“图生视频”、提示词一致并显示原作品参考帧
- 验证智能体历史抽屉的日期分组、会话标题、面板宽度、选择会话和关闭行为
- 验证过程使用 Playwright 路由拦截，不创建真实生成任务，不读取或输出 Key

AI 绘画完成态补充验证使用 Playwright 请求拦截和合成任务完成：

```text
node outputs/ui-reference/verify-draw-completion.mjs
```

- 桌面端 `1440x1000`：4 张完成态作品、无横向溢出、按钮无文字截断
- 移动端 `390x844`：4 张完成态作品、无横向溢出、四按钮按 2x2 排列
- “动漫”筛选只保留匹配作品
- 不启动真实 API，不读取或输出 Key，不消耗图片额度

## 5. 密钥和外部调用边界

- 已完成一次真实图片链路低成本验收；验收通过本地 API 和前端完成，没有读取、输出或截图真实密钥
- 视频生成支持真实 xAI Provider 和确定性 Mock；自动测试与页面验收固定使用 Mock 或路由拦截，不调用真实生成接口
- 智能修图、图片生成、AI 画布和电商工具共享现有图片任务链路；配置图片 Key 后统一走真实图片 Provider
- 图片 Key 分工保持为 1、3 号生图，2 号对话，4 号只留给后续视频；本轮不调用 Seedance
- 真实视频 provider 已采用 xAI 兼容链路；Base URL、真实模型、积分冻结/结算、失败退款和 Mock 回退均写入配置与任务状态机
- 后续若切换或补充视频供应商，需要先单独说明 Base URL、模型、额度影响、失败处理和回退方式
- 密钥只允许通过后端环境变量注入，不进入 Git、日志、普通文档和回复

## 6. 已知遗留

- 真实视频 Provider 已完成单元、端到端和浏览器 Mock 验收，但尚未做真实视频低额度人工验收
- 真实视频 Provider 暂不支持首尾帧；真实模式当前限制为文生视频或单张参考图
- 真实图片 Provider 已完成主链路验收，但尚未覆盖所有异常分支、批量数量和所有图片尺寸的长期稳定性
- 参考产品仍有未排期板块，当前只保留入口位置
- 本批已完成本地验证，提交和推送状态以 Git 日志为准
- 智能体真实流式链路的自动化验收目前使用 Mock；需要在后续联调阶段再决定是否做一次最低成本真实对话验收

## 7. 中断恢复

恢复工作时依次执行：

```text
git status --short --branch
git log --oneline --decorate -8
Get-Content -Raw docs/M2_WORKLOG.md
pnpm --filter @aurora/web test
pnpm --filter @aurora/web typecheck
pnpm test
```

如果本地开发服务器仍在运行，先访问 `http://127.0.0.1:5173/` 检查页面，不要无故停止其他进程。需要重新启动时只使用项目脚本和可用端口。
