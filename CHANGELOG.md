# Changelog

本文件记录项目所有有效改动。每次完成一项可验证的工作后都要追加记录，不能只依赖对话上下文。

格式参考 Keep a Changelog：

- `Added`：新增功能、页面、文档或配置
- `Changed`：行为、结构、文案或依赖变更
- `Fixed`：修复问题
- `Removed`：删除功能或文件
- `Security`：安全、权限、密钥或数据处理变更

## [Unreleased]

### Added

- 2026-10-16：建立 pnpm workspace，新增根级脚本、共享 TypeScript 和格式化配置，以及 `apps/web`、`apps/api` 包清单。
- 2026-10-16：生成 `pnpm-lock.yaml`，固定前端、后端和测试依赖版本。
- 2026-10-16：新增 `docs/IMPLEMENTATION_PLAN.md`，固化 M0-M7 方向、三档执行规则、实施批次和验收标准。
- 2026-10-16：从 `main` 建立本地分支 `feature/m0-foundation`，开始 M0 工程基础。
- 2026-10-16：新增 `docs/SESSION_HANDOFF_2026-10-16-v2.md`，记录切换到 `deepseek-4.1-flash-260910` 前的阶段、决策、问题、Git 状态和下一模型首要动作。
- 2026-10-16：新增 `docs/AI_HANDOFF.md`，集中记录对话助手续接所需的用户协作偏好、分工和项目进度，并指向决策与待确认问题文档。
- 2026-10-16：新增智能体列表、智能体详情、智能体创建、原创作品插画和全局顶栏组件，并补充 `/agents` 相关路由。
- 2026-10-16：完成 AI 绘画工作台主链路，包括创作入口、模型与参数选择、参考图、生成状态、作品记录、收藏、下载和删除；新增 `/image-tools`、`/video`、`/music` 独立占位入口。
- 2026-10-16：完成 M0-2 后端基础，包括 NestJS 引导、Zod 环境校验、请求 ID、统一响应与异常结构、健康检查、Prisma 与 Redis 生命周期封装、模型注册表和 OpenAI 兼容 provider 骨架。
- 2026-10-16：新增后端配置模板、Prisma schema、Vitest 配置，以及环境、SSE 解析和健康检查测试。
- 2026-10-16：新增 M0 本地基础设施建设，包括 PostgreSQL 17、Redis 7.4、健康检查、命名卷、`127.0.0.1` 端口绑定和根级 `infra:*` 脚本。
- 2026-10-16：新增 Prisma 初始迁移，创建 `provider_configs` 和 `model_configs`，并验证数据库和 Redis 健康状态可由 API 健康接口读取。
- 2026-10-16：完成 M0-3 前端基础，包括 Vue 3、Vite、TypeScript、Ant Design Vue、UnoCSS、Pinia、Vue Router 和 TanStack Query，以及五套 Shell、基础导航、404 页和 API 健康状态组件。
- 2026-10-16：新增最小 GitHub Actions CI，执行冻结安装、格式检查、lint、类型检查、构建和测试。
- 2026-10-16：新增路由注册测试，并完成桌面端与移动端五套 Shell 的无头浏览器截图检查。
- 初始化 `project2` 本地 Git 仓库，默认分支为 `main`。
- 添加项目总览、研究基线、模型续接、决策记录和待确认问题文档。
- 添加变更日志和基础 `.gitignore`。
- 添加 `.gitattributes`，统一文本和二进制文件的换行处理。
- 2026-10-16：添加完整会话交接和 DeepSeek 实施方案评审文档。

### Changed

- 2026-10-16：修正 D-024 的 Ant Design Vue 版本事实，采用发布渠道可用的稳定版 `4.2.6`。
- 2026-10-16：依赖安装按 pnpm 供应链策略显式允许 Prisma、Vue 兼容层构建脚本，禁用不需要的本机脚本执行。
- 2026-10-16：新增 D-033，确认 Codex 为主要开发工具，并固化自动执行、先说明再做、单独确认三档操作规则。
- 2026-10-16：更新 `README.md`、`docs/PROJECT_CONTEXT.md`、`docs/AI_HANDOFF.md`、`docs/MODEL_CONTINUITY.md`，并将 `docs/SESSION_HANDOFF_2026-10-16-v2.md` 标记为历史交接，统一切换到 M0 工程基础阶段。
- 2026-10-16：更新 `docs/AI_HANDOFF.md` 的提交后进度，修正遗留的差异化视觉描述；记录已完成推送并要求续接时实时核验 Git 状态，补充目录边界和 Gitea 归档待确认状态。
- 2026-10-16：修订 D-011 视觉策略，新增 D-020 模型别名规范和 D-021 Gitea 归档策略；补充原页面公开会员脚本字段及截图确认边界，并同步更新 `docs/AI_HANDOFF.md`。
- 将 `origin` 设置为 `http://182.92.154.206:3000/sweetvivi/web-ai-design-clone.git`。
- 已验证远端可访问且当前没有分支；因本机尚未配置 Git 提交邮箱，暂未创建初始提交。
- 配置当前仓库的 Git 提交身份为 `sweetvivi <2020532166@qq.com>`，凭据用户名使用 `sweetvivi`。
- 2026-10-16：根据用户确认，将项目状态更新为演示优先、未来商用可升级；首批模型使用公司 Key；支付采用沙箱订单。
- 2026-10-16：最终确认 Vue 3 前端、独立 NestJS 后端、环境变量注入公司 Key、首批 `gpt-6-astra`、支付沙箱、简单分支和 GitHub Actions。
- 2026-10-16：远端从原 Gitea 仓库切换到 private GitHub 仓库 `https://github.com/sweetvivi/web-ai-design-clone-b`。
- 2026-10-16：全 workspace 将 TypeScript 固定为 `5.9.3`，避让 Nest CLI 12 尚不支持的 TypeScript 7 programmatic compiler API。
- 2026-10-16：Vitest 后端配置改用 `.mts`，消除 CommonJS 包加载 ESM 配置时的告警。
- 2026-10-16：修正 README 和项目上下文中的 Ant Design Vue 版本事实，并同步更新当前 M0 状态、本地基础设施命令和风险说明。
- 2026-10-16：将本地截图目录 `outputs/` 加入忽略规则，避免检查产物进入 Git 提交。
- 2026-10-16：同步 README、项目上下文和交接文档中的 M0 完成状态、验证结果与下一阶段入口。
- 2026-10-16：按参考产品信息结构和视觉密度重构首页、工具地图与文档工作台；品牌、模型别名、文案和视觉素材保持原创或替换。
  - 文件：`apps/web/src/views/HomeView.vue`、`ToolMapView.vue`、`DocumentWorkbenchView.vue`、`apps/web/src/layouts/WorkbenchShell.vue`
  - 验证：桌面端与 390px 移动端 Edge 截图检查无整页横向溢出；`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过
  - 遗留：当前改动尚未提交或推送；`outputs/` 中的截图仅作本地验收，不进入 Git
- 2026-10-16：将首页视频模型横幅和绘画工作区视频入口统一指向 `/video`，避免不同侧栏入口共用 `/studio` 造成多重高亮。
- 2026-10-16：提交 M0 本地重构基线 `05b9235` 并推送到 `feature/m0-foundation`；从该基线建立 `feature/m1-vertical-slice` 分支。
- 2026-10-16：新增 [`docs/M1_WORKLOG.md`](docs/M1_WORKLOG.md)，记录 M1 批次、固定环境、密钥边界和中断恢复步骤。
- 2026-10-16：完成 M1-1 数据模型，新增用户、刷新会话、积分账本、冻结记录、会话、消息、聊天请求、文件资产和图片任务模型及迁移。
- 2026-10-16：完成 M1-2 认证主链路，支持开发登录、邮箱注册/登录、Access Token、Refresh Token 轮换、退出和受保护路由用户上下文；注册默认赠送 100 积分并写入账本。
- 2026-10-16：新增认证端到端测试和 Token 单元测试，覆盖注册赠分、重复邮箱、错误密码、鉴权、刷新令牌轮换、开发登录和过期 Token。

### Fixed

- 2026-10-16：空字符串 `LLM_API_KEY` 按未配置处理，复制 `.env.example` 后不会因占位空值阻止应用启动。
- 2026-10-16：补齐 Nest `ValidationPipe` 所需的 `class-validator` 和 `class-transformer` 运行时依赖。
- 2026-10-16：修正前端路由 meta 类型声明和绘画比例字段类型，使 Vue TypeScript 构建稳定通过。
- 2026-10-16：修正认证控制器未注入 Express 请求导致注册和登录返回 500 的问题；新增独立 `LogoutDto`，避免退出接口绕过白名单验证。

### Removed

- 无。

### Security

- 明确禁止将 API Key、Token、Cookie、账号密码和支付信息写入仓库。
- 初始提交 `5a087cc` 已创建；推送因远端要求认证且当前没有可用凭据而暂停，未保存任何密码或 Token。
- 2026-10-15：HTTP 账号密码认证被远端拒绝并返回 `Unauthorized`，已从 Windows Credential Manager 删除该无效凭据。后续需要有效 Gitea Token，或确认账号激活和登录策略。
- 2026-10-15：使用 Gitea Token 完成认证，`main` 分支首次推送成功并建立 `origin/main` 跟踪关系。Token 仅保存在 Windows Credential Manager，未写入仓库。

## 记录规则

每条记录应尽量包含：

- 日期
- 变更目的
- 主要文件或模块
- 验证方式
- 遗留风险和后续动作

示例：

```text
### Added

- 2026-10-16：新增对话工作台首页，支持模型选择和流式消息。
  - 文件：`apps/web/src/views/chat/`
  - 验证：`pnpm test`、Playwright 桌面端和移动端冒烟测试
  - 遗留：真实模型调用仍依赖供应商 API Key
```
