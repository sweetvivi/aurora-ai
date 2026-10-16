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
- 2026-10-16：完成 M0-2 后端基础，包括 NestJS 引导、Zod 环境校验、请求 ID、统一响应与异常结构、健康检查、Prisma 与 Redis 生命周期封装、模型注册表和 OpenAI 兼容 provider 骨架。
- 2026-10-16：新增后端配置模板、Prisma schema、Vitest 配置，以及环境、SSE 解析和健康检查测试。
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

### Fixed

- 2026-10-16：空字符串 `LLM_API_KEY` 按未配置处理，复制 `.env.example` 后不会因占位空值阻止应用启动。
- 2026-10-16：补齐 Nest `ValidationPipe` 所需的 `class-validator` 和 `class-transformer` 运行时依赖。

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
