# AI 助手交接说明

本文面向后续接手本项目的对话助手，用于在对话变长、切换模型或恢复工作时快速找回上下文。这里记录协作方式和当前进度；已确认决策及待确认问题以对应文档为准。

## 项目

- 项目：极光AI，参考 `https://参考产品/` 的产品结构和交互重新实现。
- 本地目录：`C:\Users\Administrator\Desktop\project2`
- GitHub 远端：[https://github.com/sweetvivi/web-ai-design-clone-b](https://github.com/sweetvivi/web-ai-design-clone-b)（Private）
- 当前阶段：M0 本地实现和验收已完成，等待用户确认后推送 `feature/m0-foundation`。
- 实现边界：按 D-011 修订后的策略，界面结构、视觉和交互尽可能接近参考产品；品牌与受保护内容必须替换，原页面打包资源不得复用。
- 主开发工具：按 D-033，Codex 作为主要开发工具；除非用户明确决定切换，否则不再按换模型流程重置方向。

## 用户情况

- 技术水平：前端内容能看懂，后端是新手。
- 沟通语言：中文。
- 常用工具：VS Code、Codex（GPT-6 Astra）、CC Switch。
- 偏好：分阶段推进，先验证再进入下一步；遇到不确定事项先询问，不擅自扩大范围。

## 分工

- 对话助手：梳理需求、制定计划、准备清晰的执行指令并验收结果。
- Codex：按照已确认的范围执行代码和命令，汇报实际修改和验证结果。
- 用户：作出产品和技术决策；按协作安排运行命令并贴回结果。

## 已确认决策

完整决策及编号见 [`DECISIONS.md`](DECISIONS.md)。不要在本交接文档重复维护决策内容；发生冲突时以用户最新明确答复及决策文档中的 Accepted 决策为准。

## 当前进度

- 已完成：研究和文档阶段；GitHub 远端已设置；M0 实施计划和 D-033 已落档；workspace、NestJS 后端、Vue 3 前端、五套 Shell、本地 PostgreSQL、Redis、Prisma 初始迁移、健康检查和最小 CI 均已实现并完成本地验证。
- 本地验证：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过；API 健康接口返回数据库和 Redis 为 `up`；桌面端和移动端五套 Shell 已用无头浏览器检查。
- 下一步：用户验收 M0 后，先说明远端、分支和提交范围，再等待确认推送；随后进入 M1 首条垂直切片。
- Git 续接：从 `main` 的 `7a75622` 建立 `feature/m0-foundation` 分支。每次接手用 `git status --short --branch` 和 `git log --oneline -8` 核验最新状态。

## 本轮新增注意事项

- D-011 的修订内容以 `docs/DECISIONS.md` 为准：可以尽可能接近参考产品的布局、组件、视觉体系和交互，但 Logo、品牌、版权素材、企业信息、法律文本及原页面打包资源必须原创或替换。
- 模型前端只使用别名；M0 先登记 `openai-gpt-6-astra`。数据库字段约定和完整规范见 D-020，不要在实现中直接暴露上游真实模型名。
- Gitea 旧仓库只归档不删除，归档由用户在网页手动完成；目前未确认网页归档已完成。命令行只使用 GitHub remote，不能向旧仓库 push。
- 原页面公开检查发现会员中心路由 `/console/vip` 和部分公开脚本字段。用户虽已在浏览器登录，但当前命令行无法读取浏览器登录 Cookie；未获得截图前，不得把价格单位、完整权益、有效期或档位写成确定事实。详细记录见 `docs/OPEN_QUESTIONS.md`。
- 后续新增的重要注意事项、决策、待确认问题和协作规则，都要同步更新本文件，并按项目规则更新 `CHANGELOG.md`。
- M0 执行按 [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) 的三档规则进行：自动执行范围内直接做；安装依赖、项目配置、额外服务和本地数据库先说明；删除、密钥、部署、公网暴露和普通推送等红线先确认。
- 本地 PostgreSQL 和 Redis 虽由 Docker Compose 管理，但当前 `compose.yaml` 使用第三方镜像代理 `dockerproxy.net`。演示阶段可用，正式部署前必须重新评估官方或公司内部镜像源。

## 待确认问题

最新问题及各阶段归口见 [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)。不要在本交接文档复制问题列表。用户即将继续回答问题；收到答复后，应更新问题状态，并按需更新 [`DECISIONS.md`](DECISIONS.md)。

## 沟通约定

- 长任务按“方案 → 用户确认 → 分批执行 → 每批验收”的节奏推进。
- 每批结束后提供实际变更、验证结果和遗留事项；验收后再进入下一批。
- 涉及删除、推送（push）或密钥处理时，先向用户确认；不得将密钥写入仓库、日志或普通配置，也不要要求用户把密钥粘贴到对话中。
- 用户已经明确授权的具体操作无需重复询问；若操作范围或目标发生变化，再确认新的范围。
- 用户明确授权开始 M0 后，按实施计划分批推进；用户要求暂停或只做文档时立即停止后续工程动作。
- 工作目录固定为 `C:\Users\Administrator\Desktop\project2`；不得修改 `Desktop/project` 和 `Desktop/project/ai-workbench-api`。
- 模型切换交接完成后，下一模型必须先读取交接文件和项目核心文档、检查 Git 状态并输出摘要，等待用户下一步指令。

## 更新时机

- 里程碑完成或当前进度发生变化时。
- Accepted 决策变化时；同时更新 [`DECISIONS.md`](DECISIONS.md)。
- 用户回答待确认问题时；同时更新 [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)，必要时更新 [`DECISIONS.md`](DECISIONS.md)。
- 切换 AI 模型或对话上下文需要交接时。
- 有效文档或代码变更完成后，按项目规则更新 [`../CHANGELOG.md`](../CHANGELOG.md)。
