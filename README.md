# 极光AI

极光AI 是一个自研的 AI 工具平台，信息架构与交互参考业内主流产品，代码、品牌与素材均为独立实现。

当前仓库是全新实现，不直接复用参考产品的打包代码、品牌素材、企业信息、用户评价或法律模板。

## 仓库信息

- 本地目录：`C:\Users\Administrator\Desktop\project2`
- 远端仓库：`https://github.com/sweetvivi/web-ai-design-clone-b`（public）
- 默认分支：`main`

## 技术栈

- 前端：Vue 3 + TypeScript + Vite + Ant Design Vue `4.2.6` + UnoCSS + Pinia + Vue Router + TanStack Query
- 后端：NestJS + Prisma `7.10.0` + PostgreSQL + Redis + BullMQ
- 远端 GitHub：`https://github.com/sweetvivi/web-ai-design-clone-b`

## 当前状态

项目已完成 M0 工程基础、M1 核心业务闭环、M2 工具套件首版和 M3 管理后台首版，当前继续打磨六个优先模块的视觉、交互和真实任务链路，并深化 AI 画布与电商工具。

已完成：

- M0：pnpm workspace、Vue 3 前端、NestJS 后端、PostgreSQL、Redis、Prisma、五套 Shell 和 GitHub Actions CI
- M1：邮箱与开发登录、刷新令牌、积分账本、流式模型对话、会话历史、文件上传和图片任务异步状态机
- 模型对话：8 个公开模型别名、DeepSeek/Qwen/GPT Provider 路由、SSE 增量、停止生成、会话恢复、错误退款，以及参考产品式欢迎语、内嵌输入框、能力入口、示例提示词和图表卡片；助手回复支持安全 Markdown、表格、代码块复制和安全外链；支持最多 3 张图片附件、视觉模型校验、历史缩略图恢复和重新生成保留附件
- 超级对话：`/chat/groups` 支持同时选择最多 10 个模型并发提问，每个模型独立流式展示、状态反馈、停止生成、整轮或单模型重试；工作区按用户保存最近 20 轮，刷新后恢复模型选择和每个模型自己的会话，并通过受 12k 字符限制的临时上下文读取其他模型已完成回答，同时保持独立计费、失败隔离和历史隔离
- 模型对话图表空态现包含 29 类真实 SVG 缩略图，并在桌面端和移动端保持两行/多列响应式网格，不自动发送或创建任务
- AI 绘画：新版智能生图独立页、7 个分类和 17 个效果模板、旧生成页、批量作品、详情层、跨模块编辑入口、下载、收藏、删除和重试；`/draw` 内层侧栏已按参考产品拆分模型、核心功能、编辑与优化、创意实验室三级目录，支持搜索和桌面折叠；`/newdraw` 的“旧文生图”回到旧生成页，“新版修图”进入智能修图
- 超级智能体：参考产品式首页创建双卡、预置与自建智能体、6358 条官方目录、18 类筛选、搜索、收藏、分页、创建器、能力选择、服务端持久化、编辑已创建智能体、真实 SSE 对话和历史记录抽屉
- 智能修图：画布式工作台、处理方式快捷切换、原图/结果对比、最多 30 步撤销/恢复、任务记录和真实图片任务链路
- 图片生成：参考产品式作品历史、宽版分类栏、高级设置、存储天数、效果示例和底部固定创作栏
- 视频生成：按参考产品行为从主平台独立打开 `/video`，使用自带深色工具栏和工作区；支持文生视频、单图参考、参考视频、4000 字提示词、任务轮询、取消、重试、下载和播放；Seedance 1.0/1.5/2.x/2.5 的能力约束按官方插件校准，逐模型开放首尾帧、音频和参考视频能力，参考视频会上传为受控文件并随任务、幂等和重试完整恢复，Grok 等不支持模型会禁用对应选项，未知 Seedance endpoint 使用保守的宽能力回退，极速模式继续明确标记
- AI 画布：节点增删、多选拖拽、连线校验、缩放平移、图片/输出/视频节点、从节点派生文本/图像/视频任务、3D 视角控制、素材库、组合分组、右键菜单、自动布局、工作流 JSON 导入导出、批量生成队列、历史、灵感面板、本地备份、服务端持久化和云端工作流库；工作流库支持新建、打开、重命名和删除非当前画布。空图片节点可直接上传并进入图生图/图生视频，工作流与历史面板支持最大化，底部创作区可展开，节点工具栏和网格状态已按参考产品交互收口
- 画布节点派生任务：图片或输出节点的「从该节点生成 - 文本生成」会把该节点图片作为多模态输入提交到 `/api/v1/chat/stream`，模型回复按 SSE 增量写入新建的「文案生成」节点并显示生成中/完成/失败状态；「图像生成」沿用真实图生图链路（`/images/edits` multipart 携带原图），「视频生成」当前只创建待填写参数的视频节点，不会自动提交任务
- 电商工具：四栏工作台、商品换背景、服饰图案替换、产品包装/部件/材质替换、商品抠图、放大、风格转换、虚拟模特试穿和手持模特替换；鞋履行走、服装平铺、白底主图与批量商品图已改为单商品图精修流程，并补齐专属处理方式和仅保存在浏览器本地的建议箱
- 运行时模型目录：绘画、画布、修图、图片生成、电商和视频工作台统一读取后台已启用模型；后台保存或导入后即时刷新，API 不可用时回退到内置兼容模型
- Provider 动态路由：图片和视频任务会按模型的厂商代码、Base URL 和上游模型识别 OpenAI-compatible、Seedream 或 Seedance 协议；显式 `mock`/旧 Provider 模式仍可覆盖，自动模式缺少对应 Key 时回退 Mock，不会因新增路由改变本地演示行为
- M3 管理后台：管理员路由守卫、总览、用户管理、积分调整、厂商管理、模型管理，以及数据库优先的运行时模型注册表
- 模块展示管理：后台可配置模块名称、导航说明、图标、封面、分组、路由、排序、角标和显隐；主侧栏使用参考产品式“模块名 + 灰色说明”两行导航，封面支持受控本地上传、外部 URL、预览和清除，主侧栏、移动底栏、首页快捷入口、精选工具和分类会统一读取同一份模块目录
- 模块位置预留：主侧栏已按参考产品补齐股票分析、AI配音2.0、图片处理、AI教育、免费工具、3D建模、超级AI搜索和论文助手等后续模块入口，先保留名称、说明、图标、分组和路由，功能按优先级逐步补齐
- 厂商模型探测：后台可输入瞬态 Key 或服务端 Key 引用，检测 OpenAI-compatible `/models`，预览能力标签并批量导入所选模型；瞬态 Key 不落库、不回显、不写日志
- 图片任务按模型能力校验参考图、清晰度、组图和图层拆分；GPT Image 最多 10 张输入，Seedream 4.x/5 Lite 最多 14 张。主图和参考图会写入任务参数并参与幂等、恢复和 Provider 多图输入
- 桌面端 `1440x1000` 和移动端 `390x844` 的本地 Playwright 验收脚本位于 `outputs/ui-reference/`

当前批次验证结果：

- `pnpm format:check`、`pnpm lint`、`pnpm typecheck` 通过
- `pnpm test`：API 27 个文件 115 项，Web 20 个文件 89 项
- `pnpm build` 通过
- `node outputs/ui-reference/verify-image-generation.mjs`、`verify-image-workbench-detail.mjs`、`verify-canvas-studio.mjs`、`verify-video-tasks.mjs`、`verify-m2-interactions.mjs`、`verify-m2-routes.mjs` 和 `verify-admin-modules.mjs` 全部通过
- `node outputs/ui-reference/verify-m2-routes.mjs` 当前覆盖 18 个主路由；新增占位模块在桌面端与移动端均可加载，侧栏激活态正确，无横向溢出或页面脚本错误
- `node outputs/ui-reference/verify-admin-modules.mjs` 通过，模块改名、导航说明、角标、排序和显隐会同步刷新共享目录；桌面端和移动端无横向溢出、无页面脚本错误
- `node outputs/ui-reference/verify-admin-provider-probe.mjs` 通过，桌面端和移动端无横向溢出，探测 Key 未出现在页面、响应或控制台
- `node outputs/ui-reference/verify-canvas-studio.mjs` 通过，画布批量面板、右键菜单、组合分组、节点生成菜单、云端恢复、自动保存和失败回退在桌面端与移动端无脚本错误或横向溢出
- `node outputs/ui-reference/verify-canvas-workflow-library.mjs` 通过，云端工作流的列表、新建、重命名、删除非当前画布和重新打开在桌面端与移动端均正常
- `node outputs/ui-reference/verify-canvas-interactions.mjs` 通过，多图上传、比例保持、滚轮/拖拽平移、`Ctrl + 滚轮`缩放、拖拽连线、连线选中与删除，以及节点「文本生成」的 SSE 流式写入均正常；窄屏 `390x844` 首次进入画布时默认工作流自动落在可视区内
- `node outputs/ui-reference/verify-chat-m1.mjs` 通过，对话空态、桌面成功流和移动端错误流保持正常
- `node outputs/ui-reference/verify-chat-markdown.mjs` 通过，Markdown 标题、列表、表格、代码块复制、安全外链和脚本清理在桌面端与移动端均正常
- `node outputs/ui-reference/verify-chat-attachments.mjs` 通过，图片上传、预览、发送、消息展示和历史恢复在桌面端与移动端均正常；验收使用 Mock，不调用真实 Provider
- `node outputs/ui-reference/verify-chat-message-layout.mjs` 通过，用户蓝色内容宽度气泡、助手无气泡正文、消息操作栏、继续追问、点赞、重新生成和无横向溢出在桌面端与移动端均正常
- `node outputs/ui-reference/verify-group-chat.mjs` 通过，超级对话的 3 模型并发、10 模型上限、停止生成、跨模型共享上下文、自回答去重、单模型重试、桌面端与移动端响应式布局均正常；验收使用 Playwright 路由拦截，不调用真实 Provider
- `node outputs/ui-reference/verify-catalog-charts.mjs` 通过，6358 条智能体目录、分页/空态、29 类图表、无错误状态和无横向溢出在桌面端与移动端均正常
- `node outputs/ui-reference/verify-agent-create.mjs` 和 `verify-agent-edit.mjs` 通过，智能体创建、服务端持久化数据回填、编辑保存和桌面/移动端布局均正常
- `node outputs/ui-reference/verify-agent-home.mjs` 通过，智能体首页的跨会话历史恢复、场景化推荐、PPT 任务直达、关键词路由和桌面/移动端布局均正常
- `node outputs/ui-reference/verify-newdraw-templates.mjs` 通过，`/newdraw` 的 7 分类、17 模板、筛选、回填、示例弹窗、高级设置和顶部跳转在桌面端与移动端均正常；390px 移动端固定创作栏与底部导航保持至少 8px 间距
- `node outputs/ui-reference/verify-showcase-assets.mjs` 通过，`/newdraw` 的 34 张预览图和图片生成页的 12 张示例图全部加载，无横向溢出
- `node outputs/ui-reference/verify-commerce-studio.mjs` 通过，电商工具的空状态、必填参数、素材上传、替换/试穿/精修任务、本地建议箱和桌面/移动端布局均正常
- `node outputs/ui-reference/verify-draw-navigation.mjs` 通过，`/draw` 的三级工具目录、模型/工具搜索、侧栏折叠、工具路由、顶部视频入口和卡片跳转在桌面端与移动端均正常；创作类型卡已恢复 AI 视频入口并会打开独立 `/video` 窗口
- `node outputs/ui-reference/verify-draw.mjs` 通过，`/draw` 参考图上传、两张 Mock 批量生成、结果展示、下载、收藏、删除和积分结算在桌面端与移动端均正常
- `node outputs/ui-reference/verify-draw-modes.mjs` 通过，`/draw` 的文生图、参考图重绘、局部编辑和商品图处理模式可在当前工作台切换，参考图要求、提示词、URL 参数和任务参数会同步更新，桌面端与移动端无脚本错误或横向溢出
- `node outputs/ui-reference/verify-draw-navigation.mjs` 和 `verify-m2-interactions.mjs` 已覆盖视频新窗口，校验 `/video` 独立路由和视频工作台首屏渲染
- `node outputs/ui-reference/verify-retouch-history.mjs` 通过，示例选择、原图上传、撤销/恢复和缩放历史在桌面端与移动端均正常；验收使用 Mock，不调用真实 Provider
- `node outputs/ui-reference/verify-video-studio.mjs`、`verify-video-preview.mjs` 和 `verify-video-tasks.mjs` 通过，视频工作台、预览层、任务轮询、取消/重试和桌面/移动端布局均正常
- `node outputs/ui-reference/verify-video-capabilities.mjs` 通过，Grok 首尾帧与音效禁用、Seedance 首尾帧上传和音效提交参数、重试恢复及桌面/移动端布局均正常；验收使用 Mock 和 Playwright 路由拦截，不调用真实视频接口
- `node outputs/ui-reference/verify-video-capabilities.mjs` 同步覆盖 Seedance 1.0 拒绝参考视频、Seedance 2.0 上传参考视频并提交、任务恢复和桌面/移动端布局；50 MB 视频上传仅接受 MP4/WebM/MOV 文件头，自动化验收不调用真实视频接口
- `node outputs/ui-reference/verify-image-generation.mjs`、`verify-image-workbench-detail.mjs`、`verify-video-tasks.mjs`、`verify-video-studio.mjs`、`verify-video-preview.mjs` 和 `verify-m2-routes.mjs` 已在本轮 Provider 路由改动后通过；全部测试使用 Mock 或 Playwright 路由拦截，不调用真实付费接口
- 图片任务 E2E 覆盖十张输入、第十一张拒绝、越权文件拒绝和自由参数注入防护

下一步：

- 继续按参考产品精修模型对话、AI 绘画、超级智能体、智能修图、图片生成和视频生成，再依次推进 AI 画布、电商工具及后续占位模块
- 评估超级对话批量后端接口，降低多模型分别建会话带来的状态分散，同时保持现有独立计费、失败隔离和临时共享上下文语义
- 深化 AI 画布和电商工具工作流，并与参考产品实际跳转行为保持一致
- 继续完善后台模块展示配置的封面尺寸校验、站内路由校验和资源迁移策略；真实 Key 仍只从服务端环境变量读取，若要改为后台持久化必须单独评审加密、轮换、审计和备份方案
- 继续将支持视觉的模型标记和后台自动探测作为模型配置的一部分；对未验证的上游模型别名先保守标记，真实低额度调用前重新核对用途和费用
- 在真实低额度验收前，先补充异常分支、响应式布局和跨模块恢复测试
- 持续复查 `本地密钥目录` 和桌面的参考产品截图目录

## 本地基础设施

```powershell
pnpm infra:up
pnpm infra:status
pnpm infra:down
```

默认只绑定本机回环地址：

- PostgreSQL：`127.0.0.1:5432`
- Redis：`127.0.0.1:6379`
- API：`http://127.0.0.1:3001/api/v1/health`

`pnpm dev:web` 默认把 `/api` 代理到 `http://127.0.0.1:3001`。如果本机 API 跑在其他端口（例如已有旧实例占着 3001），在 `apps/web/.env.local` 里写 `WEB_API_PROXY_TARGET=http://127.0.0.1:3006` 即可切换代理目标；该文件已被 `.gitignore` 忽略，仓库默认行为不变。

`infra:down` 保留数据卷。不要在未确认数据备份和影响范围前执行 `docker compose down -v`。

## 开始工作前必须阅读

按顺序阅读：

1. `docs/AI_HANDOFF.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/RESEARCH_BASELINE.md`
4. `docs/MODEL_CONTINUITY.md`
5. `docs/DECISIONS.md`
6. `docs/OPEN_QUESTIONS.md`
7. `docs/IMPLEMENTATION_PLAN.md`
8. `docs/M1_WORKLOG.md`
9. `docs/M2_WORKLOG.md`
10. `docs/M3_WORKLOG.md`
11. `docs/SESSION_HANDOFF_2026-10-21.md`
12. `docs/SESSION_HANDOFF_2026-10-20.md`
13. `docs/SESSION_HANDOFF_2026-10-16.md`

任何模型或开发者继续接管前，都必须先阅读以上文档，不得根据旧对话自行重置产品方向。

## 主要文档

- `docs/PROJECT_CONTEXT.md`：项目事实、边界和事实优先级
- `docs/RESEARCH_BASELINE.md`：参考产品研究基线
- `docs/SESSION_HANDOFF_2026-10-21.md`：最近一轮（智能体预设参数 + 精选层扩充 + 超智页视觉调整）存档：口径、改动清单、能力边界、**视觉未获认可的记录**、接手自检清单
- `docs/SESSION_HANDOFF_2026-10-20.md`：上一轮（AI 画布深度精修 + 真实模型接入）存档：工作区清单、行为口径、能力边界、接手自检清单
- `docs/SESSION_HANDOFF_2026-10-16.md`：完整会话交接、DeepSeek 方案评审和修正建议
- `docs/MODEL_CONTINUITY.md`：换模型后的续接和防止思路漂移规则
- `docs/DECISIONS.md`：已确认和待确认的技术决策
- `docs/OPEN_QUESTIONS.md`：等待用户回答的问题
- `docs/IMPLEMENTATION_PLAN.md`：M0-M7 实施方向、批次和验收标准
- `docs/M2_WORKLOG.md`：M2 当前实现、验证结果、风险和续接步骤
- `docs/M3_WORKLOG.md`：M3 管理后台、运行时模型配置、验证结果和续接步骤
- `CHANGELOG.md`：所有有效改动的持续记录

## 工作规则

- 用户最新指令优先级最高。
- 已确认决策不得被后续模型静默覆盖。
- 新模型必须先总结当前状态，再开始改代码。
- 每完成一组有效改动，必须更新 `CHANGELOG.md`。
- 改变栈、目录、架构、品牌或数据模型时，必须同步更新 `docs/DECISIONS.md`。
- API Key、Token、Cookie、账号密码和支付信息不得写入仓库。
