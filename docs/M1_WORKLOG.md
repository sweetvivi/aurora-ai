# M1 工作日志

本文用于 M1 长时间执行期间记录进度、验证结果和中断后的续接点。真实密钥、Token、Cookie 和用户密码不得写入本文件。

## 目标

完成第一条真实垂直切片：登录、模型选择、真实 OpenAI 兼容流式对话、积分冻结与结算、失败退回、会话历史、文件上传基础、图片异步任务状态机和 Mock 生图。

## 固定信息

- 项目目录：`C:\Users\Administrator\Desktop\project2`
- 分支：`feature/m1-vertical-slice`
- M0 基线提交：`05b9235`
- API：`http://127.0.0.1:3001/api/v1`
- Web：`http://127.0.0.1:5173`，当前并行开发服务可能占用 `5174`
- PostgreSQL：`127.0.0.1:5432`
- Redis：`127.0.0.1:6379`
- 密钥目录：`C:\Users\Administrator\Desktop\本地密钥目录`
- 密钥约束：只在运行真实集成测试时读取；不得进入 Git、日志或普通回复

## 执行批次

- [x] M1-1 数据模型：用户、刷新会话、积分账本、冻结记录、会话、消息、聊天请求、文件资产、图片任务
- [x] M1-2 认证：开发登录、邮箱注册/登录、Access Token、Refresh Token、用户上下文
- [ ] M1-3 积分：注册赠送、冻结、结算、失败退回和幂等键
- [ ] M1-4 对话：模型列表、会话创建/查询、消息持久化、SSE 流式对话
- [ ] M1-5 媒体基础：本地文件 adapter、上传接口、Mock 图片异步任务
- [ ] M1-6 前端：登录状态、积分展示、真实对话、历史会话和错误分类
- [ ] M1-7 验收：单元/集成/E2E、桌面与移动检查、文档和提交推送

## 当前状态

- 2026-10-16：已创建 `feature/m1-vertical-slice` 分支；本地 PostgreSQL 和 Redis 健康。
- 2026-10-16：`C:\Users\Administrator\Desktop\本地密钥目录` 已存在但为空，真实 provider 测试暂时无法执行。
- 2026-10-16：M1-1 已完成，新增 2 个迁移，Prisma 数据库状态为最新。
- 2026-10-16：M1-2 已完成，包含开发登录、邮箱注册/登录、Access Token、Refresh Token 轮换、退出和当前用户上下文。
- 2026-10-16：注册用户默认获得 100 积分，并同步写入 `user_signup` 积分账本。
- 2026-10-16：真实 provider 测试仍等待 `C:\Users\Administrator\Desktop\本地密钥目录` 中的凭据，不需要读取或写入 Edge Cookie/Token。

## 中断后恢复步骤

1. 在 `C:\Users\Administrator\Desktop\project2` 执行 `git status --short --branch`。
2. 阅读本文件，找到第一个未完成批次。
3. 执行 `pnpm infra:status`，确认 PostgreSQL 和 Redis 为健康。
4. 继续实现前先运行 `pnpm format:check`、`pnpm lint` 和 `pnpm --filter @aurora/api typecheck`，区分既有问题与本次改动。
5. 不要重复执行已经记录为通过的迁移或验证；先检查迁移目录和最新提交。

## 验证记录

- 2026-10-16：`pnpm --filter @aurora/api exec prisma migrate status` 通过，数据库 schema 与 2 个迁移一致。
- 2026-10-16：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过。
- 2026-10-16：测试共通过 15 项：API 13 项、Web 2 项。M1-2 覆盖注册赠分、重复邮箱、错误密码、受保护接口、刷新令牌轮换、开发登录和 Access Token 过期。
- 2026-10-16：验证过程中发现并修复控制器漏注入 Express `Request`、`LogoutDto` 校验缺失和 `express.d.ts` 非法声明问题。
