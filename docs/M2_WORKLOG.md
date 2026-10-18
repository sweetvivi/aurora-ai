# M2 工具套件工作日志

更新时间：2026-10-18

## 1. 当前分支和基线

- 工作目录：`C:\Users\Administrator\Desktop\project2`
- 分支：`main`
- 分支起始提交：`5ced005 docs: mark m1 synchronization complete`
- 视频链路批次基线：`19af73a feat: connect media workflows and agent history`
- 当前批次基线：`e3a71ad fix: keep mobile canvas controls above bottom nav`
- 画布增强批次基线：`60f470d feat: complete commerce replacement tools`
- 画布交互批次基线：`d82616f feat: align commerce catalog with reference`
- 运行时模型目录批次基线：`136e1f5 feat: add configurable platform modules`
- 超级对话批次基线：`d87fefd feat: expand newdraw template studio`
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

### AI 画布浮动导航与节点剪贴板

- 页面：`apps/web/src/views/CanvasStudioView.vue`
- 左侧浮动导航顺序收敛为参考产品式“添加、工作流、素材、历史、批量生成、账户”，账户入口继续复用右侧灵感画板开关；移除顶栏重复的“画布帮助”按钮，保留保存、新建和网格切换
- “添加”菜单末项改为“粘贴”，新增项目内节点剪贴板，不读取或写入系统敏感剪贴板；支持 `Ctrl/Cmd+C` 复制选中节点和 `Ctrl/Cmd+V` 粘贴
- 复制会保留选中节点之间的连线与有效分组，粘贴时创建新节点、连线和分组 ID，按粘贴次数递增偏移并写入撤销栈；随机粘贴不会覆盖原节点
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`node outputs/ui-reference/verify-canvas-studio.mjs`、`node outputs/ui-reference/verify-canvas-workflow-library.mjs`
- 浏览器验收覆盖粘贴按钮初始禁用、`Ctrl+C`、`Ctrl+V`、新节点计数、工作流库和桌面 `1440x1000`、移动端 `390x844` 无横向溢出与无页面脚本错误
- 本批只修改前端画布与本地验收脚本，不调用真实 Provider，不读取、输出或提交 Key

### 模型能力约束与动态工作台

- 后端模型注册表新增公开的 `profile` 元数据，按 `gpt-image`、`seedream`、`seedance` 和 `grok` 模型族推导产品级能力，只向前端返回尺寸预设、参考图上限、最大时长、分辨率、首尾帧、音频和视频输入等约束；`baseUrl`、`keyRef`、厂商代码和上游模型 ID 继续保持服务端字段
- AI 绘画页按当前模型动态提供清晰度选项和参考图上限；切换模型时会先校正已选清晰度，并移除超出新上限的参考图。视频页按模型动态提供时长、分辨率和首尾帧模式，模型目录刷新后也会重新校正当前参数
- 图片任务在积分冻结前校验输入图片总数、尺寸、组图和图层拆分；视频任务同样校验时长、分辨率、首尾帧、音频和视频输入，错误以明确的 `409` 能力错误码返回。未知模型没有 profile，继续沿旧行为，不因新增规则被误限制
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 浏览器验收通过：`verify-draw-editor.mjs`、`verify-image-generation.mjs`、`verify-image-workbench-detail.mjs`、`verify-video-tasks.mjs`、`verify-video-studio.mjs`、`verify-video-preview.mjs`；桌面端 `1440x1000` 和移动端 `390x844` 均无横向溢出或页面脚本错误
- 本批不调用真实 Provider，不读取、输出或提交任何 Key

### 视频首尾帧与 AI 音效能力闭环

- Seedance 模型能力 profile 补充 `supportsAudio: true`；视频工作台现在按当前模型动态启用或禁用首帧、尾帧和 AI 音效，Grok 显示“模型不支持”，未知能力显示“能力待确认”，不再把未声明能力误当作可用
- 创建视频任务时仅在 AI 音效开启时发送 `parameters.generate_audio: true`，关闭时省略该字段；从任务参数恢复或重试时继续保留音效设置
- 模型目录的布尔能力合并改为三态：任一记录为 `true` 则结果为 `true`，没有 `true` 但存在 `false` 则为 `false`，两侧都未知时保持 `undefined`；已应用于音效、尾帧、视频输入、图层拆分和连续生成
- 新增 `video-workspace.spec.ts` 与模型目录断言，覆盖请求参数、重试恢复、显式 `false` 保留和未知能力
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`；全量结果为 Web 18 个文件 76 项、API 25 个文件 97 项
- 浏览器验收通过：`verify-video-capabilities.mjs`、`verify-video-studio.mjs`、`verify-video-tasks.mjs`、`verify-model-capability-options.mjs`、`verify-m2-routes.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出或页面脚本错误
- 本批仍使用 Mock 与 Playwright 路由拦截，不调用真实视频接口，不读取、输出或提交任何 Key

### 智能体首页推荐卡密度对齐

- 页面：`apps/web/src/views/AgentsView.vue`
- 桌面端推荐区从 3 列改为参考产品式 4 列，`1100px` 以下回落为 3 列、`860px` 以下回落为 2 列；每个场景由 6 张推荐卡扩展到 8 张，并补充品牌设计、数据分析、产品评审、文档编辑、翻译、写作和社媒等场景助手
- 卡片高度、预览区比例、图标、标题、描述和标签字号重新收紧；四个全局标题组件与工具地图中的负字距统一改为 0
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm --filter @aurora/web typecheck`
- 浏览器验收通过：`verify-agent-home.mjs`、`verify-m2-routes.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 均为 8 张推荐卡，8 个主路由无横向溢出和页面脚本错误
- 本批只调整前端视觉和文档，不调用真实 Provider，不读取、输出或提交 Key

### 对话与绘画视觉密度收口

- 页面：`apps/web/src/views/ChatView.vue`、`apps/web/src/views/DrawStudioView.vue`
- 模型对话顶部工具栏从 70px 收紧到 62px，缩短欢迎区上方留白，并压缩示例提示词卡、图表类型网格的间距和卡片高度，保持推荐卡、模型切换、历史抽屉和消息逻辑不变
- AI 绘画内层侧栏、模型行、工具分组、章节标题和内容卡片同步收紧垂直间距；主内容区域保持两级侧栏和参考产品式工作台结构，绘画标题字距改为 0
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm --filter @aurora/web typecheck`、`pnpm test`、`pnpm build`
- 浏览器验收通过：`verify-m2-routes.mjs`、`verify-m2-interactions.mjs`、`verify-chat-message-layout.mjs`、`verify-draw-editor.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出和页面脚本错误
- 本批仅调整前端样式和文档，不调用真实 Provider，不读取、输出或提交 Key

### AI 画布移动端底部避让

- 页面：`apps/web/src/views/CanvasStudioView.vue`
- 移动端画布高度扣除平台顶栏、面包屑和 `62px` 移动导航后改为 `calc(100dvh - 164px)`，避免底部创作条和缩放控件被固定导航遮挡
- `verify-canvas-studio.mjs` 新增几何断言，要求创作条、缩放控件与移动导航之间至少保留 `8px` 间距
- 验证通过：`pnpm exec prettier --write apps/web/src/views/CanvasStudioView.vue`、`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`node outputs/ui-reference/verify-canvas-studio.mjs`、`node outputs/ui-reference/verify-canvas-workflow-library.mjs`
- 实测创作条与导航间距约 `60px`，缩放控件与导航间距约 `18px`；桌面端和移动端均无横向溢出或页面脚本错误
- 本批仅修改前端样式和本地验收脚本，不调用真实 Provider，不读取、输出或提交 Key

### AI 画布交互与空节点上传闭环

- 页面：`apps/web/src/views/CanvasStudioView.vue`
- 默认视口缩放统一为 `100%`，新建、导入、重置视角和服务端恢复缺省值保持一致，避免不同入口产生画布比例跳变
- 空图片/输出节点显示上传引导，提供“图生图”和“图生视频”快捷动作；文件保存成功后自动进入对应生成流程，文件无效或上传失败时会清理待执行动作并显示错误
- 节点工具栏调整为调整视角、上传、编辑、下载、网格和更多操作；复制、连接、组合与删除统一收进“更多操作”，网格按钮显示当前启用状态
- 工作流与历史面板支持最大化/还原，底部创作区支持展开/收起；移动端同步调整浮层、生成菜单和更多操作菜单宽度，避免遮挡节点或产生横向溢出
- 修复节点“更多操作”点击后立即关闭的问题，并为空图片节点快捷按钮补充稳定 `aria-label`，避免图标辅助名称影响浏览器验收
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 浏览器验收通过：`node outputs/ui-reference/verify-canvas-studio.mjs`、`node outputs/ui-reference/verify-canvas-workflow-library.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出或页面脚本错误
- 本批使用 Mock 和 Playwright 路由拦截，不调用真实 Provider，不读取、输出或提交任何 Key

### 电商工具移动端底部避让

- 验收脚本：`outputs/ui-reference/verify-commerce-studio.mjs`
- 滚动到移动端页面末尾后新增 `.commerce-info__support` 与固定移动导航的几何断言，要求至少保留 `8px` 间距，防止后续参数或卡片增高再次造成遮挡
- 验证通过：`node outputs/ui-reference/verify-commerce-studio.mjs`；实测末尾内容底边约 `671px`、移动导航顶边约 `782px`，间距约 `111px`
- 本批仅修改本地验收脚本，不调用真实 Provider，不读取、输出或提交 Key

### 首页发现工作台

- 页面：`apps/web/src/views/HomeView.vue`、`apps/web/src/views/ChatView.vue`
- 组件：`apps/web/src/components/HomeDiscovery.vue`
- 首页不再使用独立营销落地页，改为参考产品式“发现区 + 模型对话”组合首屏；保留原有对话工具栏、模型选择、空态提示词和图表模板
- 发现区包含四张横排推荐卡、可横向滚动并支持左右按钮的模型卡，以及模型对话、图片生成、AI 绘画、智能修图、超级智能体、视频生成、电商工具、AI 画布和 AI 音乐九个带图标分类入口
- 首页模型卡可直接切换当前对话模型；发送第一条消息后自动收起发现区，避免挤压真实对话内容
- `/video` 保持新标签页打开，其余分类入口使用站内路由；首页、`/chat` 和顶部“模型对话”模式切换地址保持一致
- `verify-home-discovery.mjs` 使用 Playwright 路由拦截，在桌面端 `1440x1000` 与移动端 `390x844` 覆盖推荐卡、模型卡、九个分类入口、Mock 对话请求、无横向溢出和无页面脚本错误

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
- 详情和创建页顶部栏：`/agents` 路由按参考产品隐藏顶部品牌区，左侧从“下载客户端”开始，避免压缩品牌文字时出现截断
- 详情空态：移除参考产品没有的推荐问题胶囊，保留欢迎语、会话左栏和底部“新建对话 / 历史记录”操作
- 创建页预览：未填写名称时只显示右侧空态，填写名称后再出现调试输入框
- 请求契约：`streamChat` 新增可选 `systemPrompt`
- 能力：智能体详情页使用与模型对话相同的 SSE 链路，支持流式增量、停止生成、错误状态、积分同步、会话 ID 和模型别名持久化
- 角色隔离：智能体名称、分类、描述、instructions 和标签会组合成临时 system message；该消息不写入会话历史，也不改变共享聊天接口的存储结构
- 恢复策略：应用重启后，持久化中的 `PENDING`/`STREAMING` 消息会恢复为 `FAILED`，没有内容时显示“生成已中断”
- 自建智能体：创建流程保存的 `instructions` 会在后续会话中生效
- 创建器结构：标签改为多选下拉，“界面定制”和“对话配置”支持同时展开，并新增参考示例上传占位
- 模块能力：新增 AI 绘画、AI 视频、AI 修图、联网搜索、代码、PPT、数学、图片分析、OCR、图片搜索、图表、网页生成、小游戏、网页读取、PDF 报告、学术搜索和网页可视化共 17 项复选能力
- 能力生效：选中的模块能力会保存到智能体草稿，并拼入后续真实会话的临时系统提示词

### 运行时模型目录

- Store：`apps/web/src/stores/model-catalog.ts`
- 能力过滤：按后台模型的 `chat`、`image`、`video` 能力返回可用项，拉取失败时回退到现有内置默认项
- 数据收敛：空别名或空展示名会被忽略；重复别名会合并能力并采用较新的展示名称
- 后台联动：管理员保存单个模型或批量导入后强制刷新目录，不需要刷新页面即可同步到前台工作台
- 工作台接入：AI 绘画、AI 画布、智能修图、图片生成、电商工具和视频生成均使用真实模型别名创建任务
- 记录恢复：图片和视频工作记录新增独立 `modelAlias`；旧记录缺少该字段时继续从任务参数或默认别名恢复
- 兼容边界：旧调用未传 `modelAlias` 时仍使用原默认别名，避免影响既有测试和 Mock 链路

### AI 绘画

- 页面：`apps/web/src/views/DrawStudioView.vue`
- 生成页精修：模型、尺寸和数量选中态统一为参考产品紫色体系；底部“立即生成”吸附在参数栏，作品区使用白底和更宽的作品卡最小宽度
- 新版智能生图：独立路由 `/newdraw`；`/draw?view=templates` 继续兼容旧入口
- 旧版生成页：`/draw?view=generate`
- 效果模板：7 个分类、17 个效果模板，覆盖人像美化、场景优化、创意设计、风格迁移、图片修复和 AI 绘画；每项包含真实图片、说明、步骤、提示词和创作模式
- 模板能力：分类筛选、模板选择、真实图片原图/效果图对照弹窗、操作步骤、效果回填、画面比例、1K/2K/4K、1/3/7 天存储、生成数量和固定底部生成栏
- 顶部跳转：`旧文生图` 进入 `/draw?view=generate`；`新版修图` 进入 `/retouch`，与参考产品实际路由分发保持一致
- 输入边界：新版模板和旧生成页都支持最多 10 张输入图片，第一张作为主图，其余最多 9 张作为参考图；任务请求、API DTO 和 Provider 多图输入使用同一上限
- 作品广场：新增全部、写实、人物、头像、动漫、3D、国风、风景、建筑和其他筛选，并按提示词和模型标签做本地分类
- 作品操作：完成态卡片支持使用提示词、收藏、下载和删除；390px 移动端按钮采用 2x2 排列
- 我的作品：按参考产品改为单列大卡，卡片顶部展示模型、时间、作品 ID、下载、收藏和删除；主体展示提示词、结果图、参数、修改提示词输入和八项编辑快捷操作
- 视频上下文：作品卡第 8 项“视频”和详情页“生成视频”会打开独立 `/video` 工作台，自动切换图生视频模式并携带原提示词和 `sourceWork`；视频工作台读取对应绘画结果后直接上传为参考帧，避免用户重复选择和上传
- 修改作品：卡片和作品详情均可提交修改提示词；前端沿用当前创作参数，并把原作品文件作为 `sourceFileId` 创建新的真实重绘任务，只有用户点击提交时才进入任务创建
- 内层目录：绘画模型列表前置，图片创作工具按“核心功能 / 编辑与优化 / 创意实验室”三级分组展示；顶部搜索会同时过滤模型和工具，桌面端侧栏可折叠到 64px
- 跨模块入口：顶部新增“做视频”，AI 视频创作卡和视频标签进入 `/video`；“一键抠图 / 图片放大 / 扩图 / 重绘”进入对应修图工作台；商品场景图进入电商工具，商品套图进入图片任务工作台
- 验证脚本：新增 `outputs/ui-reference/verify-draw-navigation.mjs`，覆盖侧栏折叠、搜索过滤、工具路由、顶部视频入口、卡片标签跳转以及桌面端和移动端无横向溢出
- 边界：模板只回填表单参数，不会在上传图片或选择模板时自动创建付费任务

### 智能修图

- 路由：`/retouch`
- 兼容旧入口：`/image-tools`
- 页面：`apps/web/src/views/ImageToolWorkbenchView.vue`
- 能力：原图上传、画质增强、超清放大、一键抠图、智能擦除、背景替换、风格调整、处理强度、任务记录、收藏、下载、删除和重试
- 默认界面：深色无限画布、顶部“我的创作”、底部缩放/撤销/恢复工具条和右侧对话式修图面板
- 交互：上传原图、切换处理方式、输入补充指令、选择修图模型、提交真实图片任务、点击最近作品切换画布内容
- 画布历史：示例选择、原图上传、历史作品切换、删除原图和缩放会写入最多 30 步撤销栈；恢复栈支持逐步重做，上传图片的 Blob URL 在历史栈仍被引用时不会提前释放
- 空态示例：换个发型、换个穿搭、换个背景和一键抠图使用真实项目资产；点击后仅更新画布预览和处理方式，不上传文件、不创建任务、不消耗积分
- 状态隔离：上传原图、删除原图和切换最近作品时会清除示例预览，避免示例状态覆盖用户素材或真实结果
- 兼容：点击“返回旧版”可回到原有白绿色表单工作台；`/image-generation` 继续使用原工作台，不受本次重构影响

### 图片生成

- 路由：`/image-generation`
- 页面：`apps/web/src/views/ImageToolWorkbenchView.vue`
- 默认界面：轻量网格画布、按月份整理的作品记录、完成态作品卡片和底部固定提示词创作栏
- 能力：模型选择、提示词、参考图上传、画面比例、输出清晰度、生成数量、任务记录、收藏、下载、复制提示词、删除和重试
- 创作栏：补齐高级设置、风格强度、随机种子、提示词优化、1/7/30 天存储选择和 6 张效果示例；示例可一键回填提示词，高级参数随任务一并提交
- 示例素材：人像精修、服饰换装、场景延展、商品摄影、概念海报和图片修复接入 6 张真实项目资产，分类筛选、原图/效果图对照和提示词回填保持一致
- 兼容：点击“旧文生图”可回到原有表单式工作台；`/retouch` 的智能修图新界面不受影响

### 视频生成

- 路由：`/video`
- 页面：`apps/web/src/views/VideoStudioView.vue`
- 默认界面：全宽深色视频工作台，顶部创作工具切换、左侧模型轨道、中间参数面板和右侧作品广场
- 能力：文生视频、图生视频、首尾帧、镜头描述、提示词预设、模型、比例、时长、清晰度、任务轮询、取消、重试、收藏、视频下载和再创作
- 作品区：创意广场与我的作品切换，示例和完成态作品支持参考产品式预览、复制提示词、用于创作和手动刷新
- 响应式：移动端模型轨道横向排列，控制面板和作品区顺序堆叠，窄屏作品改为单列
- 后端：`apps/api/src/video-tasks/`
- 数据模型：`VideoTask` 保存输入参数、状态、结果文件、Provider 请求 ID、错误分类、冻结记录和幂等键
- Provider 路由：`VIDEO_PROVIDER=auto|mock|xai`；`auto` 在配置视频 Key 时使用真实 xAI Provider，无 Key 时使用确定性 Mock
- 真实模型：`xai-grok-imagine-video`、`xai-grok-imagine-video-1.5`
- 真实 Provider 能力：支持文生视频和单张参考图；首尾帧模式只保留 Mock，真实模式会返回明确的不支持错误，不消耗生成额度
- 任务闭环：创建时冻结积分，Provider 完成后下载并校验视频结果，成功结算、失败或取消退回；应用重启后恢复中断任务
- 幂等边界：相同幂等键会复用原任务；PostgreSQL JSONB 重排对象键后仍使用深度相等比较，不会误判为参数相同
- 结果边界：支持 MP4/WebM 原生播放，限制结果大小并校验视频文件头；Mock 结果使用 SVG 演示预览
- 上游边界：不接入或消耗真实 Seedance 额度；4 号测试 Key 当前识别为 Grok/xAI。真实视频验收必须通过受控开关手动启用，自动测试使用 Mock 或 Playwright 路由拦截。

### AI 画布

- 路由：`/canvas`
- 页面：`apps/web/src/views/CanvasStudioView.vue`
- 能力：节点添加、选择、拖拽、删除、复制和连线，图片/输出/提示词/视频节点，画布平移缩放，工作流面板、素材库、图片/视频历史、灵感面板、底部生成区、本地备份和服务端持久化
- 多选和分组：支持 `Shift/Ctrl/Cmd` 多选、`Ctrl+A` 全选、多节点同步拖动、复制、删除、组合和批量解散；分组边界和成员会随撤销重做与本地存储保存
- 画布快捷操作：节点右键菜单支持从节点生成、复制、组合、解散和删除；画布右键菜单支持添加创作指令、自动整理布局、适应全部节点和导出工作流
- 工作流迁移：支持把节点、连线、分组和视口导出为 JSON，并在校验节点类型、重复 ID、悬空连线和分组成员后导入；导入过程不会自动创建付费任务
- 批量生成：按未生成、失败和全部筛选图片、输出和视频节点，支持选择全部、预计积分、单线程顺序提交和停止后续任务；自动验收只检查面板，不点击开始生成
- 连接约束：按节点类型限制输入输出，阻止自连和循环连接
- 素材分类：全部、角色、场景、物品、风格、声音、其他
- 默认界面：纯黑点阵无限画布、悬浮图片节点、左侧窄工具栏、顶部保存/新建操作、底部创作输入框和默认展开的“灵感画板”
- 弹层结构：加号菜单、我的工作流/示例工作流、素材库、图片历史/视频历史均保持深色半透明悬浮面板
- 灵感画板：桌面端宽 360px、窄屏宽 330px；采用“你好，Creator / 在找灵感吗？”、真实示例图、说明文案和“我知道了”按钮，空历史不占用面板；底部保留素材、浏览、设置和发送入口
- 画布布局：左侧工具栏按视口垂直居中，默认缩放为 100%，种子节点重新排布并避免被灵感画板遮挡
- 交互边界：可点击左侧灵感按钮或右下圆钮关闭/重新打开；继续保留节点、连线、历史、工作流和本地任务能力
- 云端持久化：启动时并行读取本地备份和当前用户的最近画布，云端版本较新时优先加载；编辑后自动写入服务端，同时保留本地版本化副本
- 失败回退：云端加载或保存不可用时不会丢节点，界面显示“云端加载失败”或“仅本地保存”；并发保存合并为队列，避免较旧请求覆盖新编辑
- 数据校验：服务端只接受包含 `nodes` 和 `edges` 数组的 JSON 文档，限制文档大小为 2 MB、标题 80 字和版本范围，并拒绝跨用户覆盖画布
- 验收：`verify-canvas-studio.mjs` 覆盖桌面端 `1440x1000`、移动端 `390x844`、远端画布恢复、自动保存和 `503` 回退；验收产物保存在忽略目录 `outputs/ui-reference/`

### 电商工具

- 路由：`/commerce`
- 页面：`apps/web/src/views/CommerceWorkbenchView.vue`
- 结构：按参考产品改为左侧工具目录、中间操作面板、效果展示和右侧功能说明四栏；移动端隐藏目录栏并切换为顶部工具选择器
- 优先工具：智能背景融合、服饰图案替换设计师、商品抠图/风格转换/图片放大、虚拟模特试穿及手持模特替换已提供独立表单、上传素材、参数选择、效果示例和任务提交入口
- 背景类工具统一进入背景融合表单；试穿类工具统一进入姿态、场景和模特参考图表单；修图类工具统一进入处理方式和分辨率表单
- 操作能力：商品/服饰与目标素材上传、类目和融合参数、快捷描述、重置/清除、历史记录、帮助弹层、收藏、下载、删除和重试
- 多参考图：任务请求支持最多 10 张输入图片，后端创建和恢复处理时都会校验文件归属，并依次把主图和参考图传给图片 Provider
- 任务隔离：复用共享图片任务状态机，使用 `commerce` 工具键隔离记录，不创建页面加载或素材上传阶段的付费任务
- 初始状态：按参考产品不再默认选择工具，中间操作面板显示“请选择智能体”，面包屑显示“全部 > 请选择智能体”；点击工具后显示对应表单，点击“全部”返回空状态

### 管理后台厂商模型探测

- 路由：`/admin` 的“模型厂商”页
- 后端：`apps/api/src/admin/provider-probe.service.ts`
- 接口：`POST /providers/probe`、`POST /providers/:providerId/probe`、`POST /models/import-discovered`
- 能力：读取 OpenAI-compatible `/models`，按模型 ID 推断对话、图片、视频和向量能力，管理员可全选、清空和批量导入
- Key 边界：瞬态 Key 只进入当前探测请求，不持久化、不回显、不写日志；后台持久字段仍为 `keyRef`
- 验收：`verify-admin-provider-probe.mjs` 覆盖桌面和移动端，无横向溢出且测试 Key 不出现在页面、响应和控制台

### 导航和入口

- `apps/web/src/layouts/PlatformShell.vue`
- `apps/web/src/views/HomeView.vue`
- `apps/web/src/views/FeaturePlaceholderView.vue`

主侧栏和首页按六个优先模块排序；AI 画布、电商工具进入导航并加载独立工作台。

### 跨模块闭环和智能体历史

- AI 绘画完成态作品可打开详情层，查看作品信息并执行下载、收藏、复用提示词、重新生成、编辑、抠图、裁剪扩图、擦除和重绘
- 作品详情进入智能修图时会通过 `operation`、`prompt` 和 `sourceWork` 带回处理方式、提示词和真实原图文件
- 视频生成仍可从独立 `/video` 模块进入，并通过 `image-to-video` 查询参数接收作品提示词和参考帧
- 智能修图、视频生成都会在读取原作品成功后创建本地 Blob URL；原作品不可用时会显示错误，不会自动创建付费任务
- 超级智能体详情新增历史记录抽屉，按“今天 / 昨天 / 最近 7 天 / 日期”分组，点击会话后关闭抽屉并切换会话
- 智能体详情左侧会话卡片补齐头像、标题、最后消息摘要和更新时间；顶部展示 `1 积分/次`，历史抽屉标题与当前智能体保持一致
- 桌面端历史抽屉为右侧覆盖面板，移动端为全屏面板；左侧“所有会话”列表继续保留

### 共享图片任务

- `apps/web/src/stores/draw-workspace.ts`
- `apps/web/src/stores/draw-workspace.spec.ts`

图片任务记录新增 `tool` 和 `parameters`，绘画、智能修图和图片生成共享后端异步任务状态机，同时按工具隔离记录、重试参数和页面显示。

AI 画布和电商工具复用同一异步图片任务 Store，并分别使用 `canvas` 和 `commerce` 工具键隔离记录。

- 重试恢复：失败任务会按原模型、工具参数、主图和最多 9 张参考图重建任务；参考图 ID 会过滤非法值、去重并限制上限
- 上传前置校验：共享上传入口只接受 JPG、PNG、WebP、GIF，单文件上限 10 MB，无效文件不会请求后端
- 新增单测覆盖多参考图重试恢复、工具参数保留、非法参考图清洗、不支持格式和超限文件拒绝

### 多模型对话路由

- 注册表：`apps/api/src/models/model-registry.service.ts`
- Provider：`apps/api/src/providers/openai-compatible/openai-compatible.provider.ts`
- 模型：`openai-gpt-6-astra`、`openai-gpt-6-sol`、`deepseek-v4-pro-0813`、`deepseek-v4-1-flash-0910`、`qwen-3-8-max`、`qwen-3-8-flash`、`qwen-3-8-27b`、`qwen-3-8-max-0902`
- 路由：模型别名携带独立 `providerCode`，对话服务按 Provider 组解析凭证，不再让 DeepSeek 或 Qwen 缺 Key 时回退到默认 GPT 组
- 配置：新增 `LLM_DEEPSEEK_BASE_URL`、`LLM_DEEPSEEK_API_KEY`、`LLM_QWEN_BASE_URL`、`LLM_QWEN_API_KEY`
- 公开边界：模型列表只返回别名、显示名和能力，不暴露上游模型 ID 或任何 Key
- 真实联调：通过本地 API 和 `http://127.0.0.1:5173/chat` 选择 `Qwen 3.8 Max` 完成一次真实 SSE 对话，浏览器收到 `OK`，无页面错误或横向溢出
- 可用性：GPT 和 DeepSeek 组当前受上游服务影响分别返回不可用或限流并自动退款；千问组已验证 4 个模型均可返回 `OK`

### 多模型超级对话

- 路由：`/chat/groups`，参考产品对应 `/newchat/groups`
- 页面：`apps/web/src/views/GroupChatView.vue`
- Store：`apps/web/src/stores/group-chat-workspace.ts`
- 入口：模型对话和视频创作顶部的“超级对话”统一进入 `/chat/groups`
- 模型选择：按模型分组展示，支持最多选择 10 个、全选、清空和取消选择，并在切换页面后保留可用模型选择
- 请求方式：对每个选中模型并发调用现有 `/api/v1/chat/stream`，每个回答独立展示增量内容、完成、失败、取消和复制状态
- 控制能力：支持统一停止全部生成、按轮次重新生成全部回答，以及只重试失败或取消的单个模型；单模型重试复用原轮次内容和该模型自己的会话，不替换其他模型的成功结果
- 积分同步：每个模型按现有对话计费链路独立冻结和结算，收到 `meta`、`done` 或 `error` 后同步服务端余额；模型选择区明确提示“将独立计费 N 次”，回答卡记录并展示单次积分成本
- 界面：空态复用模型对话的能力入口、示例提示词和图表类型；进入会话后按轮次展示用户问题与多模型回答卡片
- 响应式：桌面端多列回答卡，移动端切换为单列；模型选择面板和顶部模式切换在 `390x844` 下无横向溢出
- 当前边界：每个模型分别创建会话，不共享 `conversationId` 和上下文；多选模型会按模型数量分别消耗积分
- 历史边界：超级对话工作区按用户保存在浏览器本地，最多恢复 20 轮、模型选择和每个模型自己的 `conversationId`；页面刷新后可继续向同一模型会话追问，但附件预览 URL 不持久化，跨模型上下文仍不共享
- 用户隔离：同一浏览器切换账号时会清空上一位用户的多模型轮次和模型选择，只恢复当前用户自己的本地工作区

### 智能体助手消息操作

- 页面：`apps/web/src/views/AgentDetailView.vue`
- Store：`apps/web/src/stores/agent-workspace.ts`
- 能力：助手完成态消息支持复制、继续追问、重新生成、有帮助和需改进反馈
- 重新生成：复用当前会话最后一条用户消息，先移除旧的后续消息，再通过原有 SSE 链路生成；不会重复追加用户消息或新建会话
- 状态边界：流式生成期间禁用重新生成；没有用户消息或会话不属于当前智能体时保持原状态
- 验收：`verify-agent-detail-actions.mjs` 覆盖 `1440x1000` 桌面端和 `390x844` 移动端，确认操作按钮、重新生成内容、请求次数、消息数量和横向溢出；整个验收使用 Playwright 路由拦截，不调用真实 Provider

### 对话页视觉对齐

- 页面：`apps/web/src/views/ChatView.vue`
- 输入组件：`apps/web/src/components/ChatComposer.vue`
- 顶部结构改为参考产品同类的“模型选择 / 模型对话与超级对话切换 / 服务状态”三段布局
- 空态顺序改为“欢迎语 / 输入框 / 能力入口 / 示例提示词 / 图表类型”，移除大尺寸品牌标志，使首屏更接近参考产品
- 输入区抽成空态内嵌和消息态底部固定两种布局；发送、停止、重试、模型标识和附件入口共用同一组件，避免两套状态漂移
- 空态新增图表报告、制作 PPT、应用创作、生图/设计、创意视频和更多能力入口；点击只回填提示词，不自动发送
- 空态新增 12 类真实 SVG 图表缩略图：折线图、柱状图、饼图、散点图、热力图、气泡图、词云、桑基图、主题河流图、雷达图、堆积柱状图和旭日图，并保留原有示例提示词
- 图表缩略图按参考产品采用两行六列，小屏幕切换为四列；点击仍只回填提示词，不自动发送或创建请求
- 移动端压缩能力入口和图表网格，保持输入区、模型选择和模式切换可用且无横向溢出
- 2026-10-17 复核：`1440x1000` 与 `390x844` 下空态结构正常，输入框位于能力条上方，页面无横向溢出；输入成功流和移动端错误流继续通过 `verify-chat-m1.mjs`

### 对话输入区任务模式与思考等级

- 页面：`apps/web/src/views/ChatView.vue`
- 输入组件：`apps/web/src/components/ChatComposer.vue`
- Store：`apps/web/src/stores/chat-workspace.ts`
- 后端契约：`apps/api/src/chat/dto/stream-chat.dto.ts`
- 后端处理：`apps/api/src/chat/chat.service.ts`
- Provider：`apps/api/src/providers/openai-compatible/openai-compatible.provider.ts`
- 输入区左下新增“任务模式”，右下新增“思考 · 低/中/高”菜单；附件和发送/停止按钮保持原位置
- 任务模式会生成临时 system prompt，可与智能体已有角色提示词合并，但不会写入用户会话历史
- 思考等级只允许 `low`、`medium`、`high`；默认界面显示低档，未主动选择时不发送 `reasoningEffort`
- Provider 仅在收到思考等级时写入 `reasoning_effort`，不影响无该参数的既有模型和 Mock 链路
- 验收：`verify-chat-composer-controls.mjs` 在 `1440x1000` 和 `390x844` 下确认控件状态、请求参数、消息态保留状态和无横向溢出；使用 Playwright 路由拦截，不调用真实 Provider

### 安全 Markdown 对话渲染

- 组件：`apps/web/src/components/MarkdownMessage.vue`
- 工具：`apps/web/src/utils/markdown.ts`
- 范围：模型对话和超级智能体的助手回答统一使用安全 Markdown；用户消息继续按纯文本显示
- 结构：支持标题、列表、引用、表格、行内代码、代码块、分隔线和外部链接
- 代码块：每个代码块自动增加复制按钮，复制成功后短暂显示“已复制”
- 安全：使用 `marked` 解析、DOMPurify 白名单净化；只允许基础结构标签，移除脚本、表单、SVG、事件属性和危险 URL
- 链接：外部链接统一设置 `target="_blank"` 和 `rel="noopener noreferrer"`
- 流式状态：增量内容可实时重绘，生成中保留光标，完成后保持同一渲染结构
- 验收：`verify-chat-markdown.mjs` 在 `1440x1000` 和 `390x844` 下验证 Markdown 结构、复制按钮、外链属性、脚本不执行和整页无横向溢出

### 参考产品交互修正

- 图片生成的商品摄影示例归类修正为“创意设计”，确保会出现在唯一对应的分类筛选中
- 视频创作顶部“AI 绘画 / 超级对话 / AI 音乐”按参考产品特殊行为改为新标签页跳转；当前“AI 视频”仍留在本页

### 图片生成空态与智能体密度

- 图片生成创作栏在无生成记录时保持普通文档流，避免遮挡效果示例；存在作品后才使用吸底定位
- 智能体列表桌面端保持 4 列，`980px` 以下改为 3 列、`760px` 以下改为 2 列、`520px` 以下改为 1 列
- 卡片间距收紧为 10px，最小高度调整为 164px，保持参考产品的列表密度

### 电商替换工具

- 产品包装替换器、产品部件替换工具和商品材质替换器从占位入口升级为可提交工作流
- 每个工具包含商品原图、替换参考图、替换类型、替换范围、输出分辨率、快捷要求和额外需求
- 图片任务会把商品原图作为 `sourceFileId`，替换参考图作为 `referenceFileIds`
- `extraParameters` 写入 `replacementFileId`、`replacementMode`、`replacementResolution`、`replacementScope`、`mode` 和 `outputResolution`
- 保留背景融合、图案替换、商品修图、抠图和试穿工具的原有提交流程

### 对话图片附件与视觉模型

- 数据模型：新增 `MessageAttachment` 和 `VISION` 能力，用户消息通过附件关联复用已有 `FileAsset`，不复制临时文件
- 后端：`ChatService` 在积分冻结前校验附件归属、就绪状态、图片类型、每次最多 3 张和模型视觉能力；当前消息与最近 6 张历史图片会转换为 OpenAI-compatible 多模态 content parts
- 历史恢复：会话详情只返回展示所需的文件元数据；前端用户消息显示最多 3 张缩略图，重新生成会携带原附件和文件 ID
- 前端：`ChatComposer` 支持图片选择、预览、上传中、失败、移除和上传期间禁用发送；`MessageAttachments` 负责历史图片按需加载和 Object URL 释放
- 响应式修复：上传完成的文件对象改为通过 Vue 响应式数组条目更新，避免界面一直显示“上传中”
- 后台：模型能力选择新增“视觉”，模型能力标签在管理页面统一显示
- 验收：`node outputs/ui-reference/verify-chat-attachments.mjs` 覆盖桌面端 `1440x1000` 和移动端 `390x844`，使用 Playwright Mock，不调用真实 Provider、不读取或输出 Key

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

- Web：16 个测试文件，66 项通过
- API：20 个测试文件，79 项通过

页面验收脚本：

```text
outputs/ui-reference/verify-m2-routes.mjs
outputs/ui-reference/verify-chat-markdown.mjs
outputs/ui-reference/verify-chat-attachments.mjs
outputs/ui-reference/verify-group-chat.mjs
outputs/ui-reference/verify-agent-detail-actions.mjs
```

超级智能体会话页完成态已按参考产品截图复核：助手正文不再使用灰色气泡，用户气泡按内容收缩，复制/继续追问/重新生成/反馈操作恢复为可见图标，积分消耗提示和规则展开保持可访问；历史抽屉使用日期分组紧凑列表。`verify-agent-detail-actions.mjs` 同时检查桌面端和移动端用户气泡最大宽度、重新生成请求次数与页面横向溢出。

使用本地开发服务器 `http://127.0.0.1:5173/` 检查了以下路由的 `1440x1000` 桌面端和 `390x844` 移动端：

- `/chat`
- `/chat/groups`
- `/draw`
- `/agents`
- `/retouch`
- `/image-generation`
- `/video`
- `/canvas`
- `/commerce`

结果：全部页面无横向溢出、无页面脚本错误；截图保存在本地忽略目录 `outputs/ui-reference/`。

智能修图新版在 `1440x1000` 和 `390x844` 下完成单独截图检查：桌面端保持左右画布结构，移动端按画布、对话面板顺序堆叠；无横向溢出和页面脚本错误。

智能修图真实示例补充验证：

```text
pnpm --filter @aurora/web typecheck
pnpm exec prettier --check apps/web/src/views/ImageToolWorkbenchView.vue
node outputs/ui-reference/verify-m2-routes.mjs
```

- 4 张真实示例素材均能正确渲染；点击示例会更新画布和处理方式，但不会调用上传或生成接口
- 桌面端和 `390x844` 移动端均无横向溢出、无页面脚本错误
- 截图保存在本地忽略目录 `outputs/ui-reference/m2-retouch-desktop.png` 和 `outputs/ui-reference/m2-retouch-mobile.png`

智能修图撤销/恢复补充验证：

```text
pnpm exec prettier --check apps/web/src/views/ImageToolWorkbenchView.vue outputs/ui-reference/verify-retouch-history.mjs
pnpm --filter @aurora/web typecheck
pnpm --filter @aurora/web test
node outputs/ui-reference/verify-retouch-history.mjs
```

- 初始撤销/恢复均禁用；选择示例、上传图片、撤销回示例、恢复上传图和缩放历史均按预期工作
- 画布缩放覆盖 `100% -> 110% -> 100% -> 110%`，撤销/恢复按钮状态与栈内容同步
- 桌面端 `1440x1000` 和移动端 `390x844` 均无横向溢出、无页面脚本错误；验收使用 Mock 路由，不调用真实 Provider，不读取或输出 Key
- 截图保存在本地忽略目录 `outputs/ui-reference/retouch-history-desktop.png` 和 `outputs/ui-reference/retouch-history-mobile.png`

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
node outputs/ui-reference/verify-video-preview.mjs
```

- 桌面端 `1440x1000`：保持模型轨道、参数面板和作品广场三栏结构，无横向溢出和页面脚本错误
- 移动端 `390x844`：模型轨道转为横向，控制面板与作品广场顺序堆叠，无横向溢出和页面脚本错误
- 示例作品“复制”会写入正确的提示词并显示结果提示；“用于创作”会回填提示词、比例、时长和对应视频模型，并切回生成区，不创建付费任务
- 预览层支持放大按钮打开、点击遮罩或按 `Escape` 关闭，桌面端和 `390x844` 移动端均无横向溢出
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

AI 画布节点生成菜单补充验证：

```text
node outputs/ui-reference/verify-canvas-studio.mjs
```

- 图片节点工具栏和右侧加号均可打开“从该节点生成”菜单，菜单包含文本、图像、视频、本地图像模型、本地视频模型和调整角度
- “文本生成”会创建提示词节点，“视频生成”会创建视频节点，“调整角度”会打开 3D 视角控制弹窗
- 3D 弹窗支持横向旋转和垂直俯仰滑杆、实时预览标签、`Escape` 和关闭按钮，提交按钮只在用户显式点击时创建任务
- 桌面端 `1440x1000` 与移动端 `390x844` 均通过，无页面脚本错误和横向溢出
- 本批只用本地节点交互和 Playwright 页面验证，不调用真实图片、视频或对话接口

AI 画布批量生成和编辑交互补充验证：

```text
node outputs/ui-reference/verify-canvas-studio.mjs
```

- 桌面端 `1440x1000`：节点右键菜单可复制节点，批量生成面板可按未生成筛选并显示单线程队列说明，多选两个图片节点后可创建分组并通过撤销恢复
- 桌面端画布右键菜单可打开画布操作并支持 `Escape` 关闭
- 移动端 `390x844`：侧栏、节点生成菜单和底部创作区仍可操作，无横向溢出和页面脚本错误
- 验收不点击批量“开始生成”，不创建真实任务，不读取或输出 Key

电商工具视觉精修补充验证：

```text
node outputs/ui-reference/verify-commerce-studio.mjs
```

- 桌面端 `1440x1000`：四栏结构正常，可切换智能背景融合和服饰图案替换设计师，上传区、历史抽屉和帮助弹层可用
- 移动端 `390x844`：顶部工具选择器可切换图案替换工具，历史和帮助弹层可用，无横向溢出和页面脚本错误
- 三个替换工具均可切换到对应表单，并断言 `package-replace`、`component-replace`、`material-replace` 会进入任务参数
- 验收覆盖虚拟模特试穿和商品抠图表单，实际上传主服饰与第二张模特参考图，并断言创建任务请求包含 `sourceFileId` 和对应的 `referenceFileIds`
- API 测试覆盖主图加背景图解析、多重参考图 Provider 字段、其他用户参考图拒绝，以及自由参数注入 `referenceFileIds` 时被忽略
- 验收使用拦截后的本地图片上传与任务响应，不调用真实生成，不读取或输出 Key

图片生成空态与智能体密度补充验证：

```text
pnpm --filter @aurora/web typecheck
pnpm --filter @aurora/web test
node outputs/ui-reference/verify-commerce-studio.mjs
```

- Web 测试 6 个文件、24 项通过
- 电商替换工作台在桌面端 `1440x1000` 和移动端 `390x844` 下无横向溢出
- 本批不调用真实生成接口，不读取或输出 Key

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

图片生成和 AI 绘画示例素材补充验证：

```text
node outputs/ui-reference/verify-showcase-assets.mjs
```

- 桌面端 `1440x1000` 和移动端 `390x844` 均加载 12 张示例图片（6 张资产分别用于原图与效果图）
- 图片生成和 AI 绘画模板页无横向溢出、无失败图片请求、无页面脚本错误
- 本轮只使用项目内已有资产，不调用图片 Provider，不读取或输出 Key

图片生成和智能修图工作台细节补充验证：

```text
node outputs/ui-reference/verify-image-workbench-detail.mjs
```

- 桌面端 `1440x1000`：高级设置展开正常，效果示例固定为 6 张，智能修图右栏宽度为 350px，六项处理方式全部同排且无文字截断
- 移动端 `390x844`：高级设置、存储选择和效果示例可用，页面无横向溢出；处理方式在右栏内横向排列
- 验收不创建真实生成任务，不读取或输出 Key

多模型超级对话补充验证：

```text
node outputs/ui-reference/verify-group-chat.mjs
```

- 桌面端 `1440x1000`：选择 3 个模型并发提问，确认每个回答独立流式展示、完成态和复制入口
- 移动端 `390x844`：确认模型选择面板、模式切换、回答单列布局和无横向溢出
- 验证 10 个模型上限、全选、清空、停止生成、单次成本展示和目标模型单独重试；重试确认只提交一条请求、复用失败模型自己的 `conversationId`，其他模型回答对象保持不变
- 验收全程使用 Playwright 路由拦截，不调用真实对话 Provider、不读取或输出 Key

运行时模型目录补充验证：

```text
pnpm --filter @aurora/web test
pnpm --filter @aurora/web typecheck
pnpm format:check
pnpm lint
pnpm test
pnpm build
node outputs/ui-reference/verify-image-generation.mjs
node outputs/ui-reference/verify-image-workbench-detail.mjs
node outputs/ui-reference/verify-canvas-studio.mjs
node outputs/ui-reference/verify-video-tasks.mjs
node outputs/ui-reference/verify-m2-interactions.mjs
node outputs/ui-reference/verify-m2-routes.mjs
node outputs/ui-reference/verify-admin-modules.mjs
```

- Web 单元测试为 8 个文件 32 项，新增模型目录去重、缓存、强制刷新、能力过滤、别名替换和 API 不可用回退覆盖
- API 单元与端到端测试保持 18 个文件 68 项，API 与 Web 构建均通过
- 图片生成、图片工作台细节、画布、视频任务、跨模块交互、8 个优先路由和后台模块管理浏览器验收全部通过
- `1440x1000` 桌面端和 `390x844` 移动端均无横向溢出和页面脚本错误
- 自动验收全部使用 Mock 或 Playwright 路由拦截，没有调用真实图片、视频或对话 Provider

对话页视觉对齐和参考产品交互修正补充验证：

```text
node outputs/ui-reference/verify-chat-m1.mjs
node outputs/ui-reference/verify-image-generation.mjs
node outputs/ui-reference/verify-m2-routes.mjs
```

- 对话桌面成功流和 `390x844` 移动端错误流通过，能力入口与图表卡片不会自动发起请求
- 图片生成桌面端和移动端通过，分类筛选可正确显示 4 张示例卡片
- 8 个优先模块在 `1440x1000` 桌面端和 `390x844` 移动端均无横向溢出或页面脚本错误
- 视频顶部跨模块入口已按参考产品行为修改，自动验证不触发真实视频、图片或对话接口
- 模型对话会话栏按参考产品改为默认收起的覆盖式抽屉，空态主区铺满可用宽度；桌面端和移动端均保留新对话、搜索、会话切换、遮罩关闭和 `Escape` 行为
- `verify-chat-m1.mjs` 与 `verify-m2-routes.mjs` 已通过，确认对话成功/错误流、会话抽屉切换和 8 个模块的桌面/移动端无横向溢出

智能体目录与图表空态补充验证：

```text
pnpm --filter @aurora/web test -- agent-directory.spec.ts
node outputs/ui-reference/verify-catalog-charts.mjs
```

- 官方智能体目录扩展到 6358 条、18 个分类，第一页固定显示 24 条，分类、搜索、收藏和分页空态均已覆盖
- 模型对话图表空态扩展到 29 类 SVG 缩略图，桌面端和移动端均无横向溢出、无页面脚本错误、无错误状态
- 智能体验收使用 Mock 会话、模型和模块接口，不读取或输出 Key，不调用真实 Provider
- 新增 `apps/web/src/data/agent-directory.spec.ts`，验证 6358 条唯一 ID、分类计数、确定性和小目标裁剪

图片生成空态与创作栏对齐补充验证：

```text
pnpm lint
pnpm format:check
pnpm --filter @aurora/web test
pnpm --filter @aurora/web typecheck
pnpm build
node outputs/ui-reference/verify-image-generation.mjs
node outputs/ui-reference/verify-image-workbench-detail.mjs
node outputs/ui-reference/verify-m2-routes.mjs
```

- 图片生成空态隐藏“全部时间 / 批量操作”，存在作品时恢复日期和批量操作栏
- 七个分类按钮补齐图标，底部创作栏新增独立上传图块，上传后切换为原参考图预览
- 桌面端 `1440x1000` 和移动端 `390x844` 均无横向溢出、按钮文字截断或页面脚本错误
- Web 测试 11 个文件、40 项通过，lint、格式检查、类型检查和前后端构建通过
- 图片生成、工作台细节和 8 个优先模块路由验收通过；全部使用 Mock 或 Playwright 路由拦截，不调用真实 Provider，不读取或输出 Key
- `node outputs/ui-reference/verify-newdraw-templates.mjs` 通过：`/newdraw` 的 7 个分类、17 张模板卡、筛选、模板回填、示例弹窗、高级设置和顶部跳转在桌面端与移动端均正常
- `node outputs/ui-reference/verify-showcase-assets.mjs` 通过：`/newdraw` 的 34 张预览图全部加载，图片生成页的 12 张示例图全部加载，无横向溢出
- 多图任务 E2E 覆盖 1 张主图加 9 张参考图的成功创建，以及第 11 张输入被拒绝；自动验收不调用真实生成接口

电商工具初始空状态补充验证：

```text
pnpm format:check
pnpm lint
pnpm --filter @aurora/web typecheck
pnpm --filter @aurora/web test
pnpm test
pnpm build
node outputs/ui-reference/verify-commerce-studio.mjs
```

- 默认不选择任何工具，桌面端和移动端面包屑均显示“全部 > 请选择智能体”
- 点击工具后才渲染操作表单；点击“全部”恢复空状态，已保留素材上传、试穿、替换任务和移动端选择器行为
- 桌面端 `1440x1000` 和移动端 `390x844` 均无横向溢出或页面脚本错误
- 自动验收使用 Mock 路由，不调用真实 Provider，不读取或输出 Key

AI 画布参考产品布局补充验证：

```text
pnpm format:check
pnpm lint
pnpm --filter @aurora/web typecheck
pnpm --filter @aurora/web test
pnpm test
pnpm build
node outputs/ui-reference/verify-canvas-studio.mjs
```

- 灵感画板默认展开，桌面端宽度 360px，窄屏 330px；空历史隐藏，真实示例图和“我知道了”入口正常展示
- 左侧工具栏、默认缩放和种子节点位置完成对齐，节点不会被侧栏或右下灵感入口遮挡
- 桌面端 `1440x1000`、移动端 `390x844` 均无横向溢出或页面脚本错误；验收使用本地状态，不调用真实 Provider、不读取或输出 Key
- Web 测试为 13 个文件 53 项，API 测试为 18 个文件 74 项；格式检查、lint、类型检查和构建均通过

电商工具参数校验与参考图修正：

```text
pnpm format:check
pnpm lint
pnpm --filter @aurora/web typecheck
pnpm --filter @aurora/web test
pnpm test
pnpm build
node outputs/ui-reference/verify-commerce-studio.mjs
```

- 背景融合、图案替换、产品替换、商品抠图和虚拟模特试穿的必填参数默认保持空值，必须由用户明确选择后按钮才可用
- 缺少选项或上传素材时显示对应提示，文案覆盖商品类目、融合模式、图案应用方式、服饰类目、图案融合度、替换类型、替换范围、处理方式、展示姿态、目标场景和输出分辨率
- 服饰图案工具字段顺序调整为参考产品顺序：图案应用方式、服饰类目、图案融合度、额外需求、图片分辨率；服饰类目保持两列布局
- 未选择工具时展示“选择智能体后开始处理”和禁用的“请先选择智能体”，不会再因为默认工具状态误判为可用
- 效果展示接入真实项目图片；完成任务的 AFTER 优先使用当前工具的真实结果图，没有结果时才回退到示例图
- 电商验收覆盖空状态、占位值、两列分类、字段顺序、示例图、必填参数、素材上传和任务请求；桌面端 `1440x1000`、移动端 `390x844` 均无横向溢出或页面脚本错误
- Web 测试为 13 个文件 53 项，API 测试为 18 个文件 74 项；格式检查、lint、类型检查、测试和构建全部通过

视频创作页参考产品布局补充验证：

```text
pnpm format:check
pnpm lint
pnpm --filter @aurora/web typecheck
pnpm --filter @aurora/web test
pnpm --filter @aurora/api test -- --runInBand
pnpm build
node outputs/ui-reference/verify-video-studio.mjs
node outputs/ui-reference/verify-video-preview.mjs
node outputs/ui-reference/verify-video-tasks.mjs
```

- `/image-generation`、`/retouch`、`/image-tools` 和 `/video` 在桌面端启用约 80px 的参考产品式紧凑主侧栏，图标与文字纵向排列，分组间距和激活态同步收紧
- 视频工作台列宽调整为 `78px + 322px + 剩余宽度`，提示词上限从 800 字扩展到 4000 字，API DTO 同步校验
- 新增 AI 音效、极速模式和自适应增强项；未接入能力标记“待接入”，自适应标记“本地生效”
- 首尾帧当前未接入，改为禁用并显示提示；真实视频 Provider 继续只支持文生视频和单张参考图
- 完成作品卡补齐复制提示词和收藏入口标题，移动端操作栏不截断
- 桌面端 `1440x1000` 和移动端 `390x844` 均无横向溢出、无页面脚本错误；视频任务 Mock 轮询两次后成功
- Web 测试为 13 个文件 53 项，API 测试为 18 个文件 74 项；格式检查、lint、类型检查、测试和构建全部通过
- 自动验收全部使用 Mock 或 Playwright 路由拦截，不调用真实图片、视频或对话 Provider，不读取或输出 Key

移动端底部导航遮挡修复：

```text
node outputs/ui-reference/verify-newdraw-templates.mjs
```

- `/newdraw` 固定创作栏从 `bottom: 10px` 调整为 `bottom: calc(72px + safe-area)`，移动导航保持 `62px` 高度，两者实测保留 `10px` 净间距
- `/newdraw` 页面尾部留白提升到 `286px + safe-area`，最后一张效果卡可完整滚动到创作栏和导航上方
- 390px 移动端滚底审计覆盖 `/chat`、`/draw`、`/newdraw`、`/agents`、`/retouch`、`/image-generation`、`/video`、`/canvas`、`/commerce`，未发现固定或 sticky 创作区与移动导航重叠
- `verify-newdraw-templates.mjs` 已加入创作栏与导航至少 `8px` 间距的断言，防止后续样式调整回归

视频独立窗口修正：

```text
node outputs/ui-reference/verify-draw-navigation.mjs
node outputs/ui-reference/verify-m2-interactions.mjs
node outputs/ui-reference/verify-draw.mjs
```

- 参考截图确认视频生成会脱离主平台边栏，在独立窗口中使用自己的深色工具栏；`/video` 现已从 `PlatformShell` 移出并改为顶层 `standalone` 路由
- 主侧栏、移动底栏、首页活动卡、首页精选工具、AI 绘画顶部“做视频”和“AI 视频”卡片均统一在新窗口打开视频工作台
- 视频工作台移除主平台 56px 顶栏和横向内边距假设，首屏高度改为完整视口
- `verify-draw-navigation.mjs` 和 `verify-m2-interactions.mjs` 改为捕获 popup，并校验 `/video` 路径和 `.video-studio` 渲染
- `verify-draw.mjs` 的参考图数量断言同步到“已上传 1 / 10 张”，桌面端与移动端 Mock 批量生成链路继续通过
- 本批仍使用 Mock 或请求拦截，不调用真实图片、视频和对话 Provider

全局搜索补充验证：

```text
pnpm --filter @aurora/web test
pnpm --filter @aurora/web typecheck
node outputs/ui-reference/verify-global-search.mjs
```

- 顶栏搜索接入全部模块目录，并增加“文生图”“抠图”“做视频”“商品图”“工作流”等常用别名和快捷入口
- 支持 `Ctrl+K` / `Cmd+K`、方向键、`Enter`、`Escape`、精确标题优先、空查询快速入口和未知词空状态
- 视频搜索结果通过独立窗口打开 `/video`，当前窗口保持原路由；修正了带 `noopener` 时 `window.open()` 返回空导致重复跳转的兼容问题
- Edge 自动验收覆盖桌面端 `1440x1000` 与移动端 `390x844`：别名搜索结果正确、`/retouch` 跳转正确、`/video` 弹窗正确、无横向溢出和无页面脚本错误
- Web 测试扩展为 15 个文件 58 项；定向测试、类型检查和浏览器验收通过
- 自动验收使用 Playwright 路由拦截，不调用真实 Provider，不读取或输出 Key

自定义智能体服务端持久化：

```text
pnpm format:check
pnpm lint
pnpm --filter @aurora/api typecheck
pnpm --filter @aurora/web typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-agent-create.mjs
```

- 新增 Prisma `CustomAgentStatus` 枚举和 `CustomAgent` 表，迁移 `20261018120000_add_custom_agents` 已在本机执行成功，只新增表和索引，不删除或改动现有业务数据
- 新增 `/api/v1/agents` 列表与保存、`/api/v1/agents/:agentId` 更新、`/api/v1/agents/:agentId/publish` 发布接口；全部受全局认证保护，并按当前用户隔离数据
- 前端智能体工作区初始化时并行加载模型和服务端智能体；旧 `localStorage.customAgents` 会按 ID 幂等迁移，服务端失败时保留本地缓存并显示错误
- 保存和发布改为真实异步请求；创建页会显示保存中、发布中和服务端错误，发布成功后才进入详情页
- 新增 API E2E 与 Store 测试，覆盖草稿、列表、更新、发布、用户隔离、旧数据迁移、API 失败回退；API 为 19 个文件 76 项，Web 为 15 个文件 60 项
- 格式检查、lint、API/Web 类型检查、全量测试、构建和 `verify-agent-create.mjs` 桌面端与移动端验收全部通过
- 本地 Web `http://127.0.0.1:5173/`、API 健康检查、PostgreSQL 和 Redis 均保持运行；自动验收使用 Playwright 路由 Mock，不调用真实对话或图片 Provider，不读取或输出 Key

自定义智能体编辑流程：

```text
pnpm format:check
pnpm lint
pnpm --filter @aurora/api typecheck
pnpm --filter @aurora/web typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-agent-create.mjs
node outputs/ui-reference/verify-agent-edit.mjs
```

- 详情页对服务端自建智能体显示“编辑”入口，“我创建的”卡片也提供独立编辑按钮
- 编辑页通过 `/agents/create?edit=<agentId>` 加载服务端数据，并完整回填名称、简介、配置、标签、能力、开场白和预置问题
- 修改过程中复用原有草稿保存接口；按钮会区分“保存草稿 / 保存更改”，保存后正确显示“已保存”，重新修改后恢复未保存状态
- 返回按钮会根据编辑状态回到对应智能体详情或智能体广场；创建新智能体时仍生成唯一草稿 ID，避免重复覆盖
- `verify-agent-edit.mjs` 使用 Playwright 和 API 路由 Mock，覆盖桌面端 `1440x1000` 与移动端 `390x844` 的编辑入口、参数回填、保存请求、原 `agentId` 和横向溢出
- 格式检查、lint、前后端类型检查、全量测试、生产构建和创建/编辑验收全部通过；API 为 19 个文件 76 项，Web 为 15 个文件 60 项

云端画布工作流库：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-canvas-workflow-library.mjs
node outputs/ui-reference/verify-canvas-studio.mjs
```

- 在单画布云端持久化基础上新增工作流列表，支持新建、打开、重命名和删除非当前工作流；删除接口同时按工作流 ID 和用户 ID 匹配，避免越权删除
- 新建、导入和示例模板会生成新的画布 ID，不再覆盖已保存工作流；本地备份存在时优先恢复对应云端记录，旧格式本地数据不再错误覆盖云端画布
- 当前画布不能直接删除，需要先新建或切换到其他工作流；云端失败时继续保留本地副本和降级提示
- `verify-canvas-workflow-library.mjs` 使用 Playwright 路由 Mock 覆盖两个云端工作流、重命名请求、新建请求、删除非当前工作流和重新打开，桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出或页面脚本错误
- 定向 API 测试 20 个文件 79 项、Web 测试 16 个文件 63 项、格式检查、lint、类型检查和生产构建通过；本批不调用真实 Provider、不读取或输出 Key

模型对话会话管理：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-chat-conversation-actions.mjs
```

- 新增 `PATCH /api/v1/conversations/:conversationId` 和 `DELETE /api/v1/conversations/:conversationId`，两条接口都会先按当前用户和会话 ID 校验归属，越权统一返回 `CONVERSATION_NOT_FOUND`
- 会话标题会在服务端去除首尾空白，要求非空且最多 80 个字符；删除会话沿用 Prisma 级联关系清理消息、附件关联和聊天请求
- 历史抽屉新增内联重命名、保存/取消、删除确认和操作错误回传；桌面端操作按钮按 hover、focus、active 显示，触屏设备常显
- 删除当前打开的会话会停止流式请求、清空当前会话 ID、消息和错误状态，并回到“今天有什么我可以帮你的吗”新对话空态
- `verify-chat-conversation-actions.mjs` 使用 Edge 和 API 路由 Mock，覆盖打开历史、重命名请求、标题刷新、删除确认、保留其他会话和当前线程清空；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出或页面脚本错误
- 全量验证通过：API 20 个文件 83 项、Web 16 个文件 66 项，格式检查、lint、前后端类型检查和生产构建均通过；验收不调用真实 Provider、不读取或输出 Key

超级对话跨模型共享上下文：

```text
pnpm --filter @aurora/web typecheck
pnpm --filter @aurora/web exec vitest run src/stores/group-chat-workspace.spec.ts
node outputs/ui-reference/verify-group-chat.mjs
```

- 每个模型继续使用自己的 `conversationId` 和独立请求，不合并会话、不改变冻结/结算/退款状态机，也不会把其他模型的回答写入当前模型的服务端历史
- 后续轮次会把其他模型已经完成的回答作为临时 `systemPrompt` 注入，并明确说明这些内容是参考数据而不是系统指令，减少提示注入风险
- 共享上下文会排除当前模型自己的历史回答、失败和取消内容；截断时优先保留最近轮次，总体不超过 12k 字符
- 单模型重试会读取同一轮中其他已经成功的回答，同时继续复用该模型原来的 `conversationId`
- Store 单测覆盖首轮不注入、刷新续接、单模型重试、自身回答去重和失败内容隔离；`verify-group-chat.mjs` 在 Edge 桌面端 `1440x1000` 与移动端 `390x844` 下验证实际请求载荷、无横向溢出和无页面脚本错误
- 本轮自动验收全部使用 Mock 和 Playwright 路由拦截，不调用真实 Provider，不读取或输出 Key

模型对话消息布局：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-chat-message-layout.mjs
```

- 消息区最大宽度扩展为 940px，用户消息改为右侧蓝色内容宽度气泡，助手消息改为左侧无背景正文，消息操作栏收为正文下方右侧的紧凑图标
- 修正用户消息纯文本被通用 `.chat-message p` 规则覆盖的问题，用户 Markdown 与纯文本均保持蓝色气泡和白色正文
- `verify-chat-message-layout.mjs` 使用 Edge、SSE Mock 和 API 路由拦截，覆盖桌面端 `1440x1000` 与移动端 `390x844` 的气泡颜色、内容宽度、助手透明背景、五个操作按钮尺寸、继续追问回填、点赞状态、重新生成请求次数和无横向溢出
- 全量验证通过：API 20 个文件 83 项、Web 16 个文件 66 项，格式检查、lint、前后端类型检查和生产构建均通过；验收不调用真实 Provider、不读取或输出 Key

模型对话历史与设置：

```text
pnpm exec prettier --write apps/web/src/views/ChatView.vue
pnpm lint
pnpm typecheck
node outputs/ui-reference/verify-chat-conversation-actions.mjs
```

- 历史面板从左侧“所有会话”改为参考产品式右侧“历史记录”，顶部提供关闭、刷新和清空，清空必须经过二次确认；筛选支持按模型标签过滤，底部显示六个月保留提示，并继续保留搜索、重命名、删除和新建对话能力
- 对话模式切换右侧新增齿轮设置，使用参考产品式浮层控制“显示AI模型图标”；设置写入 `aurora.chat.showModelIcons`，刷新后恢复，并在有模型时展示参考产品式模型系列标签
- `verify-chat-conversation-actions.mjs` 同步验证抽屉从右侧展开、设置持久化、模型筛选、清空确认取消、会话重命名与删除；桌面端 `1440x1000` 和移动端 `390x844` 均无横向溢出和页面脚本错误
- 本批使用 Mock 会话接口，不调用真实 Provider，不读取或输出 Key

Provider 动态路由：

```text
pnpm --filter @aurora/api test -- src/providers/provider-router.spec.ts src/providers/provider-protocol.spec.ts
node outputs/ui-reference/verify-image-generation.mjs
node outputs/ui-reference/verify-image-workbench-detail.mjs
node outputs/ui-reference/verify-video-tasks.mjs
node outputs/ui-reference/verify-video-studio.mjs
node outputs/ui-reference/verify-video-preview.mjs
node outputs/ui-reference/verify-m2-routes.mjs
```

- 新增 `ImageProviderRouter` 和 `VideoProviderRouter`，根据 `providerCode`、上游模型和 Base URL 识别 OpenAI-compatible、Seedream、xAI 或 Seedance 协议
- 新增 Ark 兼容的 `SeedreamImageProvider` 和 `SeedanceVideoProvider`；图片任务传递 `providerCode`，视频创建、轮询和首尾帧能力判断传递完整模型元数据
- `IMAGE_PROVIDER`、`VIDEO_PROVIDER` 的显式 `mock`/旧 Provider 模式始终优先；`auto` 仅在匹配协议且存在对应 Key 时使用新 Provider，否则保留原 Provider 或 Mock
- Key 解析顺序保持为后台 `providerKeyRef`、专用 Seedream/Seedance Key、通用图片/视频 Key；本轮未调用真实付费接口，也未读取、输出或提交任何真实 Key
- 新增 Provider 路由、协议和两个适配器单测；本轮图片、视频工作台及八个主路由的桌面端/移动端 Mock 浏览器验收全部通过

超级智能体首页任务分流与历史抽屉：

```text
pnpm --filter @aurora/web typecheck
node outputs/ui-reference/verify-agent-home.mjs
node outputs/ui-reference/verify-agent-create.mjs
node outputs/ui-reference/verify-agent-edit.mjs
node outputs/ui-reference/verify-agent-detail-actions.mjs
node outputs/ui-reference/verify-m2-interactions.mjs
```

- 首页“历史记录”不再打开资源库，而是从右侧打开跨智能体会话抽屉；按今天、昨天和具体日期分组，支持搜索会话标题、智能体名称和分类，点击后恢复对应智能体的指定会话
- 首页“写作 / PPT / 设计 / Excel / 网页”任务标签改为按意图进入对应智能体，并携带可直接执行的首轮提示词
- 场景标签会切换推荐助手集合；“做报告、写文档、简历制作、自媒体创作、市场调研、教学设计、学习研究、营销策划、做播客”不再复用同一组推荐卡
- 首页输入框新增关键词意图识别，PPT、Excel、简历、网页、图片、视频、学习、调研、营销和文档等任务会进入对应智能体；无法识别时沿用当前场景的第一推荐助手
- 新增 `verify-agent-home.mjs`，覆盖桌面端 `1440x1000` 与移动端 `390x844` 的历史抽屉宽度和内容、两组推荐卡切换、PPT 任务直达、关键词路由、无横向溢出和无页面脚本错误
- 智能体创建、编辑、详情消息操作和绘画到修图的既有验收同步复跑通过；本批仅使用本地持久化和 Playwright 路由拦截，不调用真实 Provider，不读取或输出 Key

电商工具功能纠偏与视觉收口：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-commerce-studio.mjs
```

- 鞋履行走展示、服装平铺搭配、白底主图生成和批量商品图处理不再错误要求“目标背景图”，统一进入商品图精修提交流程
- 四个工具分别补充侧面/动态行走、上下装/叠穿平铺、纯白/浅灰主图和统一背景/尺寸/光线等专属处理方式；批量入口明确当前按单图任务处理，避免伪造多文件上传能力
- 新增本地建议箱，支持 4 至 600 字校验、保存成功提示和 `localStorage` 恢复；内容不会自动上传服务器，移动端首页也保留“提交想法”入口
- 四栏工作台按参考图进一步调整到工具库约 `245px`、操作面板约 `215px`、效果展示优先和右侧说明约 `285px`，并提升导航、表单、说明正文和标题字号，保持原有卡片密度
- `verify-commerce-studio.mjs` 覆盖四类纠偏工具的单素材提交、专属处理方式、建议箱校验与保存、移动端入口，以及桌面端 `1440x1000` 和移动端 `390x844` 无横向溢出、无页面脚本错误
- 全量验证通过：Web 18 个文件 77 项、API 25 个文件 97 项，格式、lint、类型检查、生产构建和电商浏览器验收均成功；未读取、输出或调用真实 Key

## 5. 密钥和外部调用边界

- 已完成一次真实图片链路低成本验收；验收通过本地 API 和前端完成，没有读取、输出或截图真实密钥
- 视频生成支持真实 xAI Provider 和确定性 Mock；自动测试与页面验收固定使用 Mock 或路由拦截，不调用真实生成接口
- 智能修图、图片生成、AI 画布和电商工具共享现有图片任务链路；配置图片 Key 后统一走真实图片 Provider
- 图片 Key 分工保持为 1、3 号生图，2 号对话，4 号只留给后续视频；本轮不调用真实视频生成
- 真实视频 provider 已采用 xAI 兼容链路；Base URL、真实模型、积分冻结/结算、失败退款和 Mock 回退均写入配置与任务状态机
- 后续若切换或补充视频供应商，需要先单独说明 Base URL、模型、额度影响、失败处理和回退方式
- 密钥只允许通过后端环境变量注入，不进入 Git、日志、普通文档和回复

## 6. 已知遗留

- 真实视频 Provider 已完成单元、端到端和浏览器 Mock 验收，但尚未做真实视频低额度人工验收
- Seedance 的真实视频链路已完成协议实现和单位测试，但尚未做真实低额度人工验收；在提供合规的 Seedance Key 与 Base URL 前，不把它当作已验证可用
- xAI 真实视频 Provider 暂不支持首尾帧；Seedance 已声明支持首尾帧，但仍需真实接口验证后再对外确认
- 真实图片 Provider 已完成主链路验收，但尚未覆盖所有异常分支、批量数量和所有图片尺寸的长期稳定性
- 参考产品仍有未排期板块，当前只保留入口位置
- 本批已完成本地验证，提交和推送状态以 Git 日志为准
- 智能体真实流式链路的自动化验收目前使用 Mock；需要在后续联调阶段再决定是否做一次最低成本真实对话验收
- 超级对话当前每个模型使用独立会话，已通过临时 `systemPrompt` 共享其他模型已完成回答，但尚未实现统一批量服务端请求；浏览器本地已支持按用户恢复最近 20 轮并续接各模型会话
- 超级对话会按选中模型数量分别计费，发起前已显示模型数量与费用关系；后续若继续扩展批量接口，仍需保持逐模型成本、失败隔离和会话恢复语义

首页发现工作台本批验证：

```text
pnpm lint
pnpm typecheck
pnpm --filter @aurora/web test
node outputs/ui-reference/verify-home-discovery.mjs
node outputs/ui-reference/verify-chat-conversation-actions.mjs
```

- 桌面端 `1440x1000` 与移动端 `390x844` 均通过：4 张推荐卡、3 张模型卡、9 个分类入口、1 次 Mock 对话请求、无页面脚本错误、无横向溢出
- 验收只使用 Mock 和 Playwright 路由拦截，不调用真实 Provider，不读取或输出 Key

图片生成创作条参考产品对齐：

```text
pnpm exec prettier --check apps/web/src/views/ImageToolWorkbenchView.vue
node outputs/ui-reference/verify-image-generation.mjs
node outputs/ui-reference/verify-image-workbench-detail.mjs
```

- 桌面端创作条从页面末尾的普通网格行改为固定在主内容区底部，覆盖样例卡底部；在 `1440x1000` 下测得 `x=267, y=823, 宽=1146, 高=161`，与参考图位置和尺寸接近
- 创作条内部改为 `88px` 上传列、两行输入/操作列；上传块固定为 `82px` 高，避免被两行网格拉伸，设置行和提交按钮保持同一行
- 样例卡预览图提升到约 `16 / 8.55`，页脚最小高度增加到 `88px`，让卡片整体纵向比例更接近参考产品
- 移动端恢复到文档流布局，避免固定创作条遮挡长表单；桌面、平板和移动端均无横向溢出
- 现有图片生成与工作台细节验收全部通过；验收使用已 Mock 的现有页面数据，没有读取、输出或调用真实 Key

AI 绘画作品广场与生成参数对齐：

```text
pnpm exec prettier --write apps/web/src/views/DrawStudioView.vue
pnpm --filter @aurora/web typecheck
pnpm lint
node outputs/ui-reference/verify-draw-editor.mjs
node outputs/ui-reference/verify-draw.mjs
node outputs/ui-reference/verify-draw-navigation.mjs
node outputs/ui-reference/verify-newdraw-templates.mjs
node outputs/ui-reference/capture-draw-generator.mjs
```

- 作品广场在无真实作品时显示 12 张参考产品式灵感卡，支持分类过滤、提示词搜索、尺寸和比例展示；桌面端使用四列紧凑网格，移动端保持两列
- “使用该提示词”只回填左侧绘画描述，不再自动切换“我的作品”，符合参考产品当前交互
- 绘画描述上限扩展为 2000 字，并补齐 AI 优化、清空、字数提示和高级设置；高级设置可调整图片比例与作品保存时间
- 移动端参数区增加固定底栏安全间距，桌面端 `1440x1000` 和移动端 `390x844` 均无横向溢出，作品区搜索和卡片操作可用
- 类型检查、lint、四组绘画浏览器验收和截图审计全部通过；验收仅使用 Mock 与路由拦截，不调用真实 Provider，不读取或输出 Key

图片尺寸选项与模型能力对齐：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-model-capability-options.mjs
```

- 图片生成、旧版智能修图、AI 画布和电商工具改为从当前图片模型的公开能力 profile 读取尺寸预设；切换模型时会自动保留受支持尺寸，遇到不支持的旧值则收敛到首个可用尺寸
- 无能力 profile 或预设为空时继续回退 `1K / 2K / 4K`；旧版智能修图补回模型选择区，避免只能看到尺寸按钮却无法切换模型
- 新增 `model-capabilities.ts` 单测，覆盖默认值、去重、大小写归一、保留当前值和不支持值收敛
- `verify-model-capability-options.mjs` 使用两个 Mock 图片模型完成桌面端与移动端验收：图片生成、旧版智能修图、AI 画布和电商工具均通过，页面无脚本错误、无静态资源失败、无横向溢出
- 全量验证通过：Web 17 个文件 70 项、API 25 个文件 97 项，格式、lint、类型检查和生产构建全部成功；未读取、输出或调用真实 Key

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
