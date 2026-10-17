# 决策记录

状态定义：

- `Accepted`：已确认，后续实现必须遵守
- `Proposed`：建议方案，尚未确认
- `Superseded`：已被新决策替代
- `Rejected`：明确不采用

## Accepted

### D-001 产品名称

- 状态：Accepted
- 决策：产品中文名为“极光AI”
- 原因：用户明确要求替换原页面名称

### D-003 实现边界

- 状态：Accepted
- 决策：参考页面结构、产品流程和交互，不直接复制原页面代码、品牌素材、用户评价、企业信息、法律模板和受保护内容

### D-004 上下文交接

- 状态：Accepted
- 决策：所有模型切换都必须通过仓库文档续接，并持续维护 `CHANGELOG.md`

### D-005 Git 提交身份

- 状态：Accepted
- 决策：当前仓库的提交身份使用 `sweetvivi <2020532166@qq.com>`
- 作用范围：仅 `project2` 本地仓库，不修改其他仓库
- 凭据用户名：`sweetvivi`

### D-006 远端认证

- 状态：Superseded by D-032
- 原决策：远端认证使用 Gitea Token，并通过 Windows Credential Manager 保存
- 原作用范围：`http://182.92.154.206:3000`
- 安全要求仍适用：任何 Token 都不得写入仓库、文档、提交记录或普通配置文件

### D-007 演示优先、商用可升级

- 状态：Accepted
- 决策：当前按演示阶段实施，但 API、数据模型和 provider 抽象必须为未来正式商用保留升级路径
- 约束：临时逻辑只能存在于 adapter、配置和测试环境，不得固化到公开契约和业务数据模型

### D-008 首发定位

- 状态：Accepted
- 决策：首发定位为演示优先，后续效果良好时可进入内测，最终保留正式商用升级路径
- 说明：重申 D-007

### D-009 首发产品线

- 状态：Accepted
- 决策：首发覆盖页面壳层、登录、模型对话和绘图；其他产品线先保留占位

### D-010 语言地区

- 状态：Accepted
- 决策：首发中文优先，仅支持中国中文；其他语言安排在 M5 之后

### D-011 视觉策略（修订）

- 状态：Accepted
- 决策：布局、栅格、间距、组件形态、颜色体系、圆角、阴影、交互流程、动效尽可能接近参考产品
- 决策：Logo、品牌名、版权图片、素材、用户评价、企业信息、备案号、法律文本全部原创或替换
- 决策：不使用原页面打包的 CSS、JS、图片资源，全部重新实现
- 判定标准：用户能用极光AI 完成相同任务，且视觉第一印象接近参考产品

### D-012 敏感功能

- 状态：Accepted
- 决策：股票功能作为独立系统安排在 M5；彩票和命理功能砍掉

### D-013 登录方式

- 状态：Accepted
- 决策：M0 只做开发登录；M1 加入邮箱登录；微信和手机号登录安排在 M4

### D-014 管理后台

- 状态：Accepted
- 决策：M0 不做管理后台；M3 实现最小后台，覆盖用户、模型和订单

### D-015 文件存储

- 状态：Accepted
- 决策：一期使用本地磁盘；M5 切换到 MinIO 或 OSS

### D-016 模型别名与回退

- 状态：Accepted
- 决策：前后端使用统一模型别名；首期单供应商运行，暂不自动回退；M2 加入第二家供应商

### D-017 上游错误提示

- 状态：Accepted
- 决策：前端采用分类提示，至少覆盖参数错误、额度不足、请求超时和服务不可用

### D-018 部署

- 状态：Accepted
- 决策：本机使用 Docker Compose；上云部署方案待后续确定

### D-019 许可证

- 状态：Accepted
- 决策：仓库保持 Private，暂不添加 LICENSE；确定开源意向后再补充 MIT 许可证

### D-020 模型别名规范

- 状态：Accepted
- 决策：模型别名格式为 `{厂商}-{模型}-{版本}`，全小写，用 `-` 连接
- 示例：`openai-gpt-6-astra`、`zhipu-glm-4-plus`、`moonshot-kimi-k2`、`volc-seedream-5`
- 决策：前端只使用模型别名，不识别上游真实模型名
- 数据库 `model_configs` 表：`alias` 字段存别名，`provider_model` 字段存上游真实名
- 决策：更换供应商时只修改 `provider_model`，前端零改动
- M0 首先登记：`openai-gpt-6-astra`

### D-021 旧仓库归档

- 状态：Accepted
- 决策：Gitea 仓库 `http://182.92.154.206:3000/sweetvivi/web-ai-design-clone` 归档，不删除
- 决策：归档后只读，不再 push
- 决策：本地 remote 已切到 GitHub，不会误推
- 归档操作由用户在 Gitea 网页手动完成，不通过命令

### D-022 首批模型供应商

- 状态：Accepted
- 决策：首批接入使用公司 Key 的真实模型供应商
- 决策：Mock provider 只用于测试和受控兜底，不作为唯一主流程
- 当前容忍项：上游模型可能报错；应记录错误、保护积分并给用户可重试反馈，不因上游不稳定阻塞开发

### D-023 支付沙箱

- 状态：Accepted
- 决策：当前支付采用沙箱订单模拟，未来可以替换为真实支付
- 约束：订单状态、签名、幂等和结果查询从一开始就按真实支付结构设计
- 禁止：前端不能直接调用“设为已支付”或自行修改订单金额和状态

### D-024 前端框架

- 状态：Accepted
- 决策：Vue 3 + TypeScript + Vite + Ant Design Vue + UnoCSS + Pinia + Vue Router + TanStack Query (Vue)
- 明确：不使用 React
- 版本修正：2026-10-16 核验 npm 时 Ant Design Vue 没有 5.x 稳定版，当前使用最新稳定版 `4.2.6`
- 升级约束：后续如果发布 5.x，先单独评估兼容、样式和构建影响，不自动跨大版本升级

### D-025 不复用旧后端

- 状态：Accepted
- 决策：不复用 `Desktop/project/ai-workbench-api`
- 决策：旧项目冻结，仅作为逻辑和实现参考，不搬运代码
- 原因：路由数量、数据库和鉴权契约都需要重新设计

### D-026 模型 Key 注入

- 状态：Accepted
- 决策：后端通过环境变量注入模型 Key，不把明文写入数据库或仓库
- 环境变量：`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_DEFAULT_MODEL`
- 数据库：`provider_configs` 只存元数据，使用 `key_ref` 引用环境变量名
- 生产：使用 Docker Secret 或 Kubernetes Secret
- 隔离：Codex 使用的 Key 与后端使用的 Key 分开，便于独立限额

### D-027 首批模型

- 状态：Accepted
- 决策：首批统一使用极光 GPT Key 中转站和 OpenAI 兼容适配器
- Base URL：`https://api.example.com/v1`
- 默认对话模型：`gpt-6-astra`
- 生图：先 Mock；真实测试固定使用 1、3 号图像 Key，不使用 Seedance
- 视频：先 Mock，M4 接入
- 修订 2026-10-17：2 号 DeepSeek Key 用于模型对话；4 号 Seedance Key 只用于后续视频生成
- Embedding：暂不做
- 后续备用模型：GLM、Kimi、DeepSeek

### D-028 支付沙箱

- 状态：Accepted
- 决策：一期不接真实支付，只实现接口、订单表和状态机
- 状态：`pending → paid / failed / refunded / cancelled`
- 幂等：每个订单有唯一 `idempotency_key`
- 抽象：`PaymentProvider`，一期实现 `SandboxProvider`
- 前端：只能发起订单，不能直接设置已支付
- 充值：注册送 100 积分，后台支持手动充值
- 真实通道：微信、支付宝、Stripe 放到 M7

### D-029 分支策略

- 状态：Accepted
- 决策：一个人开发，使用 `main + feature/xxx + fix/xxx`
- 约束：不使用长期 `dev` 分支，不强制 PR 流程
- 发布：重要节点打 Tag，例如 `v0.1.0`

### D-030 CI

- 状态：Accepted
- 决策：Gitea 1.15.9 不支持 Actions，CI 切换到 GitHub Actions
- 远端：`https://github.com/sweetvivi/web-ai-design-clone-b`（private）
- 触发：`push` 和 `pull_request`
- 步骤：`pnpm install`、`pnpm -r build`、`pnpm -r test`
- Runner：GitHub Hosted Runner
- M0：只写最小 CI，不写部署流水线

### D-031 DeepSeek 方案基线

- 状态：Accepted
- 决策：采纳 DeepSeek 方案的总体方向
- 约束：执行时必须采用 `SESSION_HANDOFF_2026-10-16.md` 中的修正项
- 重点修正：真实 provider 优先、密钥不落库明文、鉴权头收敛、不同能力使用不同超时和重试策略、支付订单早期抽象

### D-032 GitHub 远端仓库

- 状态：Accepted
- 决策：代码统一推送到 `https://github.com/sweetvivi/web-ai-design-clone-b`（private）
- 默认分支：`main`
- 原 Gitea 仓库保留历史，不再作为当前远端

### D-033 主开发工具与执行规则

- 状态：Accepted
- 决策：Codex 作为项目的主要开发工具，除非用户明确决定切换，否则不再按模型切换流程重置项目方向
- 决策：项目操作分为自动执行、先说明再做、单独确认三档
- 红线：递归删除或批量移动、系统级修改、全局安装、停止他人进程、清库或破坏性迁移、部署、DNS、支付、外部上传、密钥读写、强制推送和公网暴露必须先获得用户明确确认
- 约束：普通推送也必须先说明远端、分支和提交范围
- 约束：该规则是行为约束，不替代操作系统权限和安全隔离

### D-034 TypeScript 构建工具版本

- 状态：Accepted
- 决策：M0 起全 workspace 使用 TypeScript `5.9.3`
- 原因：Nest CLI 12 构建依赖 TypeScript programmatic compiler API，TypeScript 7.0.2 当前不提供该 API，且 TypeScript 6 尚无稳定版
- 约束：不使用 TypeScript 6 beta 作为基础工程依赖
- 复核：NestJS 或 TypeScript 发布兼容稳定版本后，再单独评估升级影响

### D-035 测试 Key 能力分工

- 状态：Accepted
- 决策：1、3 号 Key 固定用于生图；2 号 DeepSeek Key 用于模型对话；4 号 Seedance Key 只用于后续视频生成
- 约束：Seedance 不作为生图备用 Key，也不在 M1 生图阶段消耗额度
- 约束：真实密钥只通过后端环境变量注入，不进入 Git、日志、普通文档和回复

### D-038 真实图片 Provider

- 状态：Accepted
- 决策：图片任务支持 `IMAGE_PROVIDER=auto|mock|openai`；`auto` 在配置图片 Key 时使用真实 Provider，无 Key 时使用确定性 Mock
- 决策：首期真实图片 Provider 使用 OpenAI 兼容的 `/images/generations` 和 `/images/edits`
- 决策：前端固定使用别名 `jiguang-gpt-image-2.5`，上游真实模型为 `gpt-image-2.5`
- 决策：图片结果同时支持 Base64 和远程 URL，并由后端统一做大小、MIME 和文件头校验
- 约束：备用图片 Key 只在主 Key 返回 `401/403` 时使用；限流、服务不可用和普通请求错误不重复扣费或重复提交
- 约束：真实图片错误必须写入任务失败状态并退回积分，不把上游响应正文或密钥写入日志
- 约束：视频生成继续使用本地演示，不调用 Seedance；真实视频 Provider 进入后续阶段后再单独确认

### D-039 智能体临时系统提示词

- 状态：Accepted
- 决策：智能体详情复用现有 POST SSE 聊天接口，通过可选 `systemPrompt` 注入角色、分类、说明、工作规则和能力标签
- 决策：`systemPrompt` 只在单次上游模型请求中作为临时 system message 使用，不写入消息表和用户会话历史
- 决策：请求中的 `conversationId` 和 `modelAlias` 继续复用聊天会话契约，不新增智能体专用会话表
- 约束：本地模拟回复全部退出智能体会话主流程，测试使用 Mock Provider 或 Mock API，不自动消耗真实对话额度
- 约束：应用重启时，未完成的流式消息必须恢复为失败或中断状态，避免界面长期显示正在生成

### D-036 M2 工具套件范围重排

- 状态：Accepted
- 决策：M2 先实现参考产品工具套件首版，顺序为模型对话、AI 绘画、超级智能体、智能修图、图片生成、视频生成
- 决策：智能修图和图片生成复用图片任务的异步状态机与后端契约，但必须通过 `tool` 和工具参数区分记录、重试和展示
- 决策：视频生成首版先完成本地演示工作流，不调用 Seedance；接入真实视频 provider 前单独说明额度和外部调用影响
- 决策：AI 画布和电商工具在 M2 先保留导航入口与明确占位；该范围已由 D-037 扩展
- 决策：原 M2 中的第二模型供应商、支付沙箱和订单完善顺延到后续里程碑，不与工具套件首版抢占实现顺序

### D-037 AI 画布与电商工具首版扩展

- 状态：Accepted
- 决策：在六个优先工具之后继续实现 AI 画布与电商工具，不再停留在占位页
- 决策：AI 画布采用节点画布结构，覆盖节点、连线、素材库、工作流、历史、灵感面板和本地持久化
- 决策：电商工具采用商品主图、换背景、模特试穿、多比例商拍流程，复用图片任务 Store
- 约束：AI 画布和电商工具分别使用 `canvas`、`commerce` 工具键隔离历史、重试参数和显示记录
- 约束：首版验证只检查上传、表单、路由和布局，不触发付费生成；真实 provider 接入仍需单独说明额度和回退策略

## Proposed

### P-001 前端技术栈

- 状态：Superseded by D-024
- 建议：React 19、TypeScript、Vite、React Router、Ant Design 5、Tailwind CSS、Zustand、TanStack Query
- 待确认：如果团队更希望复用现有 Vue 代码，可改为 Vue 3、Pinia、Vue Router、UnoCSS
- 状态说明：已被 D-024 替代

### P-002 后端技术栈

- 状态：Superseded by D-025
- 建议：NestJS、Prisma、PostgreSQL、Redis、BullMQ
- 备选：复用现有 `ai-workbench-api`
- 待确认：是否从零实现，是否保留现有 Prisma 模型
- 状态说明：已被 D-025 替代

### P-003 页面架构

- 状态：Superseded by D-031
- 建议：五套壳层加工具注册表和工作台引擎
- 原因：参考产品页面数量大，逐页独立开发不可控

### P-004 文件存储

- 状态：Proposed
- 建议：S3 兼容对象存储或 MinIO，前端只使用临时签名 URL

### P-005 异步生成

- 状态：Proposed
- 建议：Redis 加 BullMQ，统一管理对话、绘画、视频、音频、PPT 和文档任务

### P-006 积分结算

- 状态：Proposed
- 建议：预扣、执行、结算、失败退回，所有变更写积分账本

### P-007 首发范围

- 状态：Superseded by D-009
- 建议：全局壳层、账户积分、对话、Agent、绘画、图片处理、PPT、翻译
- 状态说明：已由 D-009 重新确定首发产品线

### P-008 DeepSeek 实施方案

- 状态：Superseded by D-031
- 建议：将 DeepSeek 方案的总体方向作为 M0/M1 基线，但采用 `SESSION_HANDOFF_2026-10-16.md` 中的修正项
- 主要修正：真实 provider 优先、密钥不落库明文、鉴权头收敛、不同能力使用不同超时和重试策略、支付订单早期抽象
- 状态说明：已升级为 D-031

## Superseded

### D-002 原 Gitea 远端仓库

- 状态：Superseded by D-032
- 原决策：代码统一推送到 `http://182.92.154.206:3000/sweetvivi/web-ai-design-clone.git`
- 原因：Gitea 1.15.9 不支持 Actions，改用私有 GitHub 仓库

## Rejected

暂无。

## 更新规则

- 每次用户做出新选择，都要新增或更新决策。
- 修改已确认决策时，不覆盖历史原因，应标记旧决策为 `Superseded` 并引用新决策编号。
- 未确认建议不能写成产品事实。
