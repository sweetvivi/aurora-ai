# 极光AI

极光AI是参考 `https://参考产品/` 的产品结构、视觉语言和核心交互重新设计的 AI 工具平台。

当前仓库是全新实现，不直接复用参考产品的打包代码、品牌素材、企业信息、用户评价或法律模板。

## 仓库信息

- 本地目录：`C:\Users\Administrator\Desktop\project2`
- 远端仓库：`https://github.com/sweetvivi/web-ai-design-clone-b`（private）
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
- 模型对话图表空态现包含 29 类真实 SVG 缩略图，并在桌面端和移动端保持两行/多列响应式网格，不自动发送或创建任务
- AI 绘画：新版智能生图模板、旧生成页、批量作品、详情层、跨模块编辑入口、下载、收藏、删除和重试
- 超级智能体：预置与自建智能体、6358 条官方目录、18 类筛选、搜索、收藏、分页、创建器、能力选择、真实 SSE 对话和历史记录抽屉
- 智能修图：画布式工作台、处理方式快捷切换、原图/结果对比、任务记录和真实图片任务链路
- 图片生成：参考产品式作品历史、高级设置、存储天数、效果示例和底部固定创作栏
- 视频生成：参考产品式深色工作台、文生视频、单图参考、任务轮询、取消、重试、下载和播放
- AI 画布：节点增删、多选拖拽、连线校验、缩放平移、图片/输出/视频节点、从节点派生文本/图像/视频任务、3D 视角控制、素材库、组合分组、右键菜单、自动布局、工作流 JSON 导入导出、批量生成队列、历史、灵感面板和本地持久化
- 电商工具：四栏工作台、商品换背景、服饰图案替换、产品包装/部件/材质替换、商品抠图、放大、风格转换、虚拟模特试穿和手持模特替换
- 运行时模型目录：绘画、画布、修图、图片生成、电商和视频工作台统一读取后台已启用模型；后台保存或导入后即时刷新，API 不可用时回退到内置兼容模型
- M3 管理后台：管理员路由守卫、总览、用户管理、积分调整、厂商管理、模型管理，以及数据库优先的运行时模型注册表
- 模块展示管理：后台可配置模块名称、图标、封面、分组、路由、排序、角标和显隐；主侧栏、移动底栏、首页快捷入口、精选工具和分类会统一读取同一份模块目录
- 厂商模型探测：后台可输入瞬态 Key 或服务端 Key 引用，检测 OpenAI-compatible `/models`，预览能力标签并批量导入所选模型；瞬态 Key 不落库、不回显、不写日志
- 图片任务支持最多 3 张已授权参考图；主图和参考图会写入任务参数并参与幂等、恢复和 Provider 多图输入
- 桌面端 `1440x1000` 和移动端 `390x844` 的本地 Playwright 验收脚本位于 `outputs/ui-reference/`

当前批次验证结果：

- `pnpm format:check`、`pnpm lint`、`pnpm typecheck` 通过
- `pnpm test`：API 18 个文件 73 项，Web 11 个文件 40 项
- `pnpm build` 通过
- `node outputs/ui-reference/verify-image-generation.mjs`、`verify-image-workbench-detail.mjs`、`verify-canvas-studio.mjs`、`verify-video-tasks.mjs`、`verify-m2-interactions.mjs`、`verify-m2-routes.mjs` 和 `verify-admin-modules.mjs` 全部通过
- `node outputs/ui-reference/verify-admin-modules.mjs` 通过，模块改名、角标、排序和显隐会同步刷新共享目录；桌面端和移动端无横向溢出、无页面脚本错误
- `node outputs/ui-reference/verify-admin-provider-probe.mjs` 通过，桌面端和移动端无横向溢出，探测 Key 未出现在页面、响应或控制台
- `node outputs/ui-reference/verify-canvas-studio.mjs` 通过，画布批量面板、右键菜单、组合分组和节点生成菜单在桌面端与移动端无脚本错误或横向溢出
- `node outputs/ui-reference/verify-chat-m1.mjs` 通过，对话空态、桌面成功流和移动端错误流保持正常
- `node outputs/ui-reference/verify-chat-markdown.mjs` 通过，Markdown 标题、列表、表格、代码块复制、安全外链和脚本清理在桌面端与移动端均正常
- `node outputs/ui-reference/verify-chat-attachments.mjs` 通过，图片上传、预览、发送、消息展示和历史恢复在桌面端与移动端均正常；验收使用 Mock，不调用真实 Provider
- `node outputs/ui-reference/verify-catalog-charts.mjs` 通过，6358 条智能体目录、分页/空态、29 类图表、无错误状态和无横向溢出在桌面端与移动端均正常
- 图片任务 E2E 覆盖多参考图、越权文件拒绝和自由参数注入防护

下一步：

- 继续按参考产品精修模型对话、AI 绘画、超级智能体、智能修图、图片生成和视频生成
- 深化 AI 画布和电商工具工作流，并与参考产品实际跳转行为保持一致
- 继续完善后台模块展示配置的封面上传和资源校验；真实 Key 仍只从服务端环境变量读取，若要改为后台持久化必须单独评审加密、轮换、审计和备份方案
- 继续将支持视觉的模型标记和后台自动探测作为模型配置的一部分；对未验证的上游模型别名先保守标记，真实低额度调用前重新核对用途和费用
- 在真实低额度验收前，先补充异常分支、响应式布局和跨模块恢复测试
- 持续复查 `C:\Users\Administrator\Desktop\本地密钥目录` 和桌面的参考产品截图目录

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

`infra:down` 保留数据卷。不要在未确认数据备份和影响范围前执行 `docker compose down -v`。

## 开始工作前必须阅读

按顺序阅读：

1. `docs/PROJECT_CONTEXT.md`
2. `docs/RESEARCH_BASELINE.md`
3. `docs/SESSION_HANDOFF_2026-10-16.md`
4. `docs/MODEL_CONTINUITY.md`
5. `docs/DECISIONS.md`
6. `docs/OPEN_QUESTIONS.md`
7. `docs/IMPLEMENTATION_PLAN.md`

任何模型或开发者继续接管前，都必须先阅读以上文档，不得根据旧对话自行重置产品方向。

## 主要文档

- `docs/PROJECT_CONTEXT.md`：项目事实、边界和事实优先级
- `docs/RESEARCH_BASELINE.md`：参考产品研究基线
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
