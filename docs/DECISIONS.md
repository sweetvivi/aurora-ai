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

- 状态：Superseded by D-018
- 原决策：远端认证使用 Gitea Token，并通过 Windows Credential Manager 保存
- 原作用范围：`http://182.92.154.206:3000`
- 安全要求仍适用：任何 Token 都不得写入仓库、文档、提交记录或普通配置文件

### D-007 演示优先、商用可升级

- 状态：Accepted
- 决策：当前按演示阶段实施，但 API、数据模型和 provider 抽象必须为未来正式商用保留升级路径
- 约束：临时逻辑只能存在于 adapter、配置和测试环境，不得固化到公开契约和业务数据模型

### D-008 首批模型供应商

- 状态：Accepted
- 决策：首批接入使用公司 Key 的真实模型供应商
- 决策：Mock provider 只用于测试和受控兜底，不作为唯一主流程
- 当前容忍项：上游模型可能报错；应记录错误、保护积分并给用户可重试反馈，不因上游不稳定阻塞开发

### D-009 支付沙箱

- 状态：Accepted
- 决策：当前支付采用沙箱订单模拟，未来可以替换为真实支付
- 约束：订单状态、签名、幂等和结果查询从一开始就按真实支付结构设计
- 禁止：前端不能直接调用“设为已支付”或自行修改订单金额和状态

### D-010 前端框架

- 状态：Accepted
- 决策：Vue 3 + TypeScript + Vite + Ant Design Vue 5 + UnoCSS + Pinia + Vue Router + TanStack Query (Vue)
- 明确：不使用 React

### D-011 不复用旧后端

- 状态：Accepted
- 决策：不复用 `Desktop/project/ai-workbench-api`
- 决策：旧项目冻结，仅作为逻辑和实现参考，不搬运代码
- 原因：路由数量、数据库和鉴权契约都需要重新设计

### D-012 模型 Key 注入

- 状态：Accepted
- 决策：后端通过环境变量注入模型 Key，不把明文写入数据库或仓库
- 环境变量：`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_DEFAULT_MODEL`
- 数据库：`provider_configs` 只存元数据，使用 `key_ref` 引用环境变量名
- 生产：使用 Docker Secret 或 Kubernetes Secret
- 隔离：Codex 使用的 Key 与后端使用的 Key 分开，便于独立限额

### D-013 首批模型

- 状态：Accepted
- 决策：首批统一使用极光 GPT Key 中转站和 OpenAI 兼容适配器
- Base URL：`https://api.example.com/v1`
- 默认对话模型：`gpt-6-astra`
- 生图：先 Mock，M1 尾期接 Seedance
- 视频：先 Mock，M4 接入
- Embedding：暂不做
- 后续备用模型：GLM、Kimi、DeepSeek

### D-014 支付沙箱

- 状态：Accepted
- 决策：一期不接真实支付，只实现接口、订单表和状态机
- 状态：`pending → paid / failed / refunded / cancelled`
- 幂等：每个订单有唯一 `idempotency_key`
- 抽象：`PaymentProvider`，一期实现 `SandboxProvider`
- 前端：只能发起订单，不能直接设置已支付
- 充值：注册送 100 积分，后台支持手动充值
- 真实通道：微信、支付宝、Stripe 放到 M7

### D-015 分支策略

- 状态：Accepted
- 决策：一个人开发，使用 `main + feature/xxx + fix/xxx`
- 约束：不使用长期 `dev` 分支，不强制 PR 流程
- 发布：重要节点打 Tag，例如 `v0.1.0`

### D-016 CI

- 状态：Accepted
- 决策：Gitea 1.15.9 不支持 Actions，CI 切换到 GitHub Actions
- 远端：`https://github.com/sweetvivi/web-ai-design-clone-b`（private）
- 触发：`push` 和 `pull_request`
- 步骤：`pnpm install`、`pnpm -r build`、`pnpm -r test`
- Runner：GitHub Hosted Runner
- M0：只写最小 CI，不写部署流水线

### D-017 DeepSeek 方案基线

- 状态：Accepted
- 决策：采纳 DeepSeek 方案的总体方向
- 约束：执行时必须采用 `SESSION_HANDOFF_2026-10-16.md` 中的修正项
- 重点修正：真实 provider 优先、密钥不落库明文、鉴权头收敛、不同能力使用不同超时和重试策略、支付订单早期抽象

### D-018 GitHub 远端仓库

- 状态：Accepted
- 决策：代码统一推送到 `https://github.com/sweetvivi/web-ai-design-clone-b`（private）
- 默认分支：`main`
- 原 Gitea 仓库保留历史，不再作为当前远端

## Proposed

### P-001 前端技术栈

- 状态：Superseded by D-010
- 建议：React 19、TypeScript、Vite、React Router、Ant Design 5、Tailwind CSS、Zustand、TanStack Query
- 待确认：如果团队更希望复用现有 Vue 代码，可改为 Vue 3、Pinia、Vue Router、UnoCSS
- 状态说明：已被 D-010 替代

### P-002 后端技术栈

- 状态：Superseded by D-011
- 建议：NestJS、Prisma、PostgreSQL、Redis、BullMQ
- 备选：复用现有 `ai-workbench-api`
- 待确认：是否从零实现，是否保留现有 Prisma 模型
- 状态说明：已被 D-011 替代

### P-003 页面架构

- 状态：Superseded by D-017
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

- 状态：Proposed
- 建议：全局壳层、账户积分、对话、Agent、绘画、图片处理、PPT、翻译

### P-008 DeepSeek 实施方案

- 状态：Superseded by D-017
- 建议：将 DeepSeek 方案的总体方向作为 M0/M1 基线，但采用 `SESSION_HANDOFF_2026-10-16.md` 中的修正项
- 主要修正：真实 provider 优先、密钥不落库明文、鉴权头收敛、不同能力使用不同超时和重试策略、支付订单早期抽象
- 状态说明：已升级为 D-017

## Superseded

### D-002 原 Gitea 远端仓库

- 状态：Superseded by D-018
- 原决策：代码统一推送到 `http://182.92.154.206:3000/sweetvivi/web-ai-design-clone.git`
- 原因：Gitea 1.15.9 不支持 Actions，改用私有 GitHub 仓库

## Rejected

暂无。

## 更新规则

- 每次用户做出新选择，都要新增或更新决策。
- 修改已确认决策时，不覆盖历史原因，应标记旧决策为 `Superseded` 并引用新决策编号。
- 未确认建议不能写成产品事实。
