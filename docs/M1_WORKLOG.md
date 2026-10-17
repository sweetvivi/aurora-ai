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
- 测试凭据用途：1、3 号 Key 用于生图；2 号 DeepSeek Key 用于模型对话；4 号 Seedance Key 保留给后续视频生成，M1 生图阶段不使用

## 执行批次

- [x] M1-1 数据模型：用户、刷新会话、积分账本、冻结记录、会话、消息、聊天请求、文件资产、图片任务
- [x] M1-2 认证：开发登录、邮箱注册/登录、Access Token、Refresh Token、用户上下文
- [x] M1-3 积分：注册赠送、冻结、结算、失败退回和幂等键
- [x] M1-4 对话：模型列表、会话创建/查询、消息持久化、SSE 流式对话
- [x] M1-5 媒体基础：本地文件 adapter、上传接口、Mock 图片异步任务
- [x] M1-6 前端：登录状态、积分展示、真实对话、历史会话和错误分类
- [x] M1-7 验收：单元/集成/E2E、桌面与移动检查、文档和提交推送

## 当前状态

- 2026-10-16：已创建 `feature/m1-vertical-slice` 分支；本地 PostgreSQL 和 Redis 健康。
- 2026-10-16：`C:\Users\Administrator\Desktop\本地密钥目录` 已建立，后续已放入 4 个测试 Key；M1 自动化验收仍使用 Mock provider，不消耗真实额度。
- 2026-10-16：M1-1 已完成，新增 2 个迁移，Prisma 数据库状态为最新。
- 2026-10-16：M1-2 已完成，包含开发登录、邮箱注册/登录、Access Token、Refresh Token 轮换、退出和当前用户上下文。
- 2026-10-16：注册用户默认获得 100 积分，并同步写入 `user_signup` 积分账本。
- 2026-10-16：M1-3 已完成，积分冻结会先扣减可用余额并写入 `HOLD` 账本；结算保留扣减并写入 `SETTLE`，失败退回恢复余额并写入 `REFUND`。
- 2026-10-16：积分冻结支持幂等键、并发重复请求、余额不足、账号停用、非法金额和重复结算/退回校验。
- 2026-10-16：修正同一用户并发创建不同冻结点数时的账本余额快照，并补充并发集成测试。
- 2026-10-16：M1-4 已完成，新增模型别名列表、会话创建/查询、消息历史和 POST SSE 流式对话接口。
- 2026-10-16：流式对话会先冻结积分，供应商完成后结算；上游失败、返回空内容或客户端中断时标记失败并退回积分。
- 2026-10-16：模型别名只对外暴露 `openai-gpt-6-astra`，上游真实模型名 `gpt-6-astra` 仅由后端注册表在调用 provider 时映射。
- 2026-10-16：新增 `LLM_MOCK_MODE` 本地流式回退，支持无真实 Key 时演示对话；真实 provider 请求增加超时控制。
- 2026-10-16：真实 provider 测试不需要读取或写入 Edge Cookie/Token；测试凭据只通过后端环境变量引用。
- 2026-10-16：M1-5 已完成，新增按用户隔离的本地存储 adapter、图片上传/列表/元数据/内容接口，以及 JPEG、PNG、WebP、GIF 文件头校验。
- 2026-10-16：新增 `volc-seedream-5` 图片模型别名、确定性的 Mock 图片 provider、可配置生成延迟，以及图片任务异步状态机。
- 2026-10-16：图片任务支持积分冻结、成功结算、失败退回、幂等键、服务重启遗留任务重试和中途任务自动退回。
- 2026-10-16：图片任务的 `SUCCEEDED/FAILED` 终态、结果文件和积分结算/退回已收敛到同一个数据库事务，消除 API 可观测到的短暂不一致窗口。
- 2026-10-16：M1-5 已完成本地验证但尚未提交；此前 M1-4 提交 `5a11222` 因 GitHub 连接超时仍待推送。
- 2026-10-17：M1-6 已完成登录/注册面板、Refresh Token 会话恢复、真实积分同步、模型列表、会话历史和 POST SSE 流式对话前端接入。
- 2026-10-17：聊天工作台支持会话新建/切换/搜索、流式增量、停止生成、失败分类、重试入口和积分退回后的余额同步。
- 2026-10-17：新增 Session bootstrap 并发、聊天 SSE 状态映射和用户中止生成后的积分恢复测试；Web 测试为 10/10 通过。
- 2026-10-17：使用 Edge 完成桌面成功流和 390px 移动端错误流页面联调，未请求真实模型或消耗 Key；两档均无横向溢出。
- 2026-10-17：M1-6 完整 workspace 验证通过并提交为 `7a7483f`。
- 2026-10-17：M1-7 已完成绘画工作台真实后端接入：参考图上传、批量创建任务、幂等键、任务轮询、成功结果加载、失败退款同步、重试、下载、收藏和删除。
- 2026-10-17：生图前端统一使用后端别名 `volc-seedream-5`，单张任务成本 5 积分；本地 M1 仍使用确定性 Mock provider，不读取真实生图 Key。
- 2026-10-17：绘图验收脚本改为直接进入生成页，避免经首页提交造成重复任务；桌面两张参考图批量生成和 390px 移动端单张生成均通过，下载文件名、PNG 渲染、余额结算和无横向溢出均符合预期。
- 2026-10-17：M1-7 完整验证通过，API 29/29、Web 16/16；`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过；当前等待用户确认普通推送。
- 2026-10-17：核对 GitHub Actions 失败邮件后确认两项环境问题：根级 `storage/` 忽略规则误伤后端存储源码，且 CI 在 Typecheck 前未生成 Prisma Client；现已修正忽略边界、补交源码并增加 CI 生成步骤。

## 中断后恢复步骤

1. 在 `C:\Users\Administrator\Desktop\project2` 执行 `git status --short --branch`。
2. 阅读本文件，找到第一个未完成批次。
3. 执行 `pnpm infra:status`，确认 PostgreSQL 和 Redis 为健康。
4. 继续实现前先运行 `pnpm format:check`、`pnpm lint` 和 `pnpm --filter @aurora/api typecheck`，区分既有问题与本次改动。
5. 不要重复执行已经记录为通过的迁移或验证；先检查迁移目录和最新提交。

## 验证记录

- 2026-10-16：`pnpm --filter @aurora/api exec prisma migrate status` 通过，数据库 schema 与 2 个迁移一致。
- 2026-10-16：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过。
- 2026-10-16：测试共通过 26 项：API 24 项、Web 2 项。M1-2 覆盖注册赠分、重复邮箱、错误密码、受保护接口、刷新令牌轮换、开发登录和 Access Token 过期；M1-3 覆盖冻结幂等、余额不足、结算、退回、并发幂等、并发非幂等账本快照和非法金额；M1-4 覆盖模型别名、会话历史、SSE 成功/失败、积分结算/退回和重复请求。
- 2026-10-16：验证过程中发现并修复控制器漏注入 Express `Request`、`LogoutDto` 校验缺失和 `express.d.ts` 非法声明问题。
- 2026-10-16：M1-4 定向测试 3/3 通过，覆盖模型列表和会话 CRUD、SSE 成功结算、重复幂等请求拦截、provider 失败退回。
- 2026-10-16：M1-5 定向测试 4/4 通过，覆盖上传和用户隔离、非法/超限文件、成功图片任务结算与结果读取、provider 失败退回。
- 2026-10-16：M1-5 完整验证再次通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。测试共通过 31 项：API 29 项、Web 2 项。
- 2026-10-17：M1-6 定向验证通过：`pnpm format:check`、`pnpm --filter @aurora/web typecheck`、`pnpm --filter @aurora/web test`（10/10）。
- 2026-10-17：`node outputs/ui-reference/verify-chat-m1.mjs` 通过；桌面成功流无页面错误和横向溢出，移动端错误流积分从 99 退回 100，均无横向溢出。
- 2026-10-17：M1-6 完整验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。测试共通过 39 项：API 29 项、Web 10 项；构建仅保留既有的大 chunk 警告。
- 2026-10-17：`node outputs/ui-reference/verify-draw.mjs` 通过；桌面完成参考图上传、两张批量生成、真实 Mock PNG 渲染、下载、收藏、删除和 10 积分结算，390px 移动端完成单张生成、95 积分结算和无横向溢出检查。
- 2026-10-17：M1-7 完整验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。测试共通过 45 项：API 29 项、Web 16 项；构建仅保留既有的大 chunk 警告。

## 下一步

1. 检查 M1-7 差异和内嵌敏感信息后提交。
2. 普通推送前再次说明远端、分支、提交范围和提交哈希，等待用户确认。
3. 推送后关闭 M1，再按参考产品优先顺序规划智能体、图片和视频工作台的后续闭环；4 号 Seedance 测试 Key 只用于后续视频，不用于 M1 生图。
