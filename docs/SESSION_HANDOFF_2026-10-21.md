# 2026-10-21 会话存档：智能体预设参数落地 + 精选层扩充 + 超级智能体页视觉调整

本文是 **2026-10-20 晚 ~ 2026-10-21 上午**这段会话（WorkBuddy / Step-5-Preview 执行轨道）的可续接存档，用于把工作交接给下一个模型（主对话 DeepSeek-V4.1-Flash）。逐步过程另见 `docs/M3_WORKLOG.md`、`CHANGELOG.md` 的 2026-10-20 / 10-21 条目。

> 事实优先级以 `docs/PROJECT_CONTEXT.md` 第 2 节为准，本文件是补充，不是决策来源。

## 0. 一句话现状

**功能层三批全部完成并自测通过**（智能体预设参数：数据层 → 链路 → 预填与真实联调），精选智能体 27→74，`/agents` 字号阶梯与智能体详情页「智能体信息」面板已落地；**但用户对视觉结果明确不认可**（原话「算了，依旧效果不理想」），UI 这部分需要换思路重做。**全部改动已于 2026-10-21 提交并推送**（见第 8 节），可直接接力。

## 1. 环境与运行方式

| 项                   | 值                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 工作目录             | `C:\Users\Administrator\Desktop\project2`                                                                                          |
| 分支 / 最近提交      | `main` / `59bdf84 docs(decisions): record D-042 for dev tool switchover to workbuddy`                                              |
| 前端                 | Vite `http://127.0.0.1:5173`（**当前 200，正在运行**）                                                                             |
| 后端                 | Nest `http://127.0.0.1:3001`（**当前 502，未运行**）                                                                               |
| 依赖中间件           | **Docker Desktop 未启动** → 5432 / 6379 均无监听                                                                                   |
| 本地测试账号         | `dev@aurora.local`（本轮联调前余额 142，两次请求后 140）                                                                           |
| 密钥来源             | `本地密钥文件`，项目 `.env` 已配 6 组（**只读，不入库、不入日志、不进仓库**）                                         |
| 验收口径             | 桌面 `1440x1000`；移动端自 2026-10-20 起暂停                                                                                       |
| 测试基线（本轮结束） | **Web 22 文件 120 项通过**（2026-10-21 10:12 实测）；**API 27 文件 123 项**（2026-10-20 晚 DB 可用时实测，当前环境无法复验，见下） |

**当前环境异常（接手第一件事）**：Docker Desktop 未运行，PostgreSQL / Redis 未监听，API e2e 全套会红（`PrismaClientKnownRequestError`，错误点在各 e2e 的 `beforeAll` 初始化），**这不是代码回归**。（2026-10-21 10:17 起 Docker 已启动、API 已恢复，API e2e 27 文件 123 项实测全绿。）恢复顺序：

```bash
# 1. 手动启动 Docker Desktop，等容器 healthy
docker ps --format "{{.Names}}\t{{.Status}}"     # 期望看到 postgres / redis healthy

# 2. 重建 API（不要用 nest build，会清 dist 并被沙箱拦截）
cd apps/api && node node_modules/typescript/bin/tsc -p tsconfig.build.json && node dist/main.js

# 3. 探活
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/v1/health
```

沙箱老坑（沿用，已验证）：`pnpm` 不在 PATH → `npx --yes pnpm@11.25.0`；`/api/v1/image-tasks` 需大写 `Idempotency-Key`；长驻进程会被宿主回收，判断服务死活只看端口不看任务状态。

**推送 GitHub（2026-10-21 实测可用写法）**：默认 schannel 后端在本机会报 `schannel: failed to receive handshake` 或 `Failed to connect to github.com:443`，**换成 OpenSSL 后端即可**；同时要清掉环境里注入的代理变量（`https_proxy=127.0.0.1:57214` 是工具自身的出口代理，不代理 GitHub）：

```bash
http_proxy= https_proxy= git -c http.sslBackend=openssl push origin main
```

`ls-remote` 偶发 21s 超时属线路抖动，重试一次通常可过；判断是否已推送成功看 push 输出的 `旧..新  main -> main`，以及 `git status -sb` 是否显示 `## main...origin/main`（无 ahead/behind）。

**前端全量测试偶发「少一个文件」**：2026-10-21 上午同一份代码连跑两次，一次报 `21 文件 / 111 项`、一次报 `22 文件 / 120 项`。`vitest list` 显示收集到 22 个文件，说明是 worker 掉队而非漏收集。**判断标准看文件数是否为 22**，若是 21 就重跑一次，不要据此认为有测试丢失。

## 2. 本轮工作全景

| #   | 主题                | 需求 / 现象                                                      | 处理                                                                                                                                        | 验证                                                    | 状态                           |
| --- | ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------ |
| 1   | 项目通读            | 用户要求「整体看一看，不要改代码」                               | 通读前端/后端/12 篇文档/数据模型/Provider 层，输出架构画像                                                                                  | —                                                       | 完成（只读）                   |
| 2   | 方案对比            | 「配置各类型智能体 + 预设参数给 key 模型」是否可行、有无参考项目 | 结论：方向正确且项目已实现大半；参考 LibreChat（agent 配置 schema）、LobeChat（市场+provider 分层）、Mastra（工具调用循环）；不引入整套平台 | —                                                       | 完成（未动代码）               |
| 3   | Batch 1 数据层      | 预设参数要进入 agent 配置                                        | `AgentCatalogItem`/`CustomAgent` 加 `modelAlias`/`temperature`/`maxTokens`/`inputMode`（全部可空）+ 迁移 + DTO 校验 + service 映射          | 迁移纯 ADD COLUMN，库内旧行复验无损                     | ✅                             |
| 4   | Batch 2 链路贯通    | 预设要真送到上游                                                 | DTO → chat.service → llm-provider → `openai-compatible` 的 `max_tokens`（仅设置时才写 payload）；store 新增 `resolveAgentModelAlias`        | provider 单测、chat e2e 断言、store 测试                | ✅                             |
| 5   | Batch 3 预填 + 联调 | 让 74 个精选真生效                                               | 18 个类目蓝图 + 74 个精选填入别名/温度；避开 429 的 `deepseek-v4-pro-0813`                                                                  | 真实上游两次请求：预设模型路由 + `maxTokens:512` 硬截断 | ✅                             |
| 6   | 精选层扩充          | 用户拍板「按推荐（60–80），先把精选补到位」                      | 27 → **74**（新增 47、回填 27），每个带真 `instructions`/预设/`inputMode`/`capabilities`；新增 `agents.spec.ts` 质量守卫                    | 新增 9 项守护测试                                       | ✅                             |
| 7   | `/agents` 可读性    | 用户反馈「板块文字太小，太费眼」                                 | 只改 `AgentsView.vue` scoped 样式：类目 9→14px、卡片名 12.5→15px、描述 10→12.5px、标签 6/7→10/11px 等；补齐缺失的 `.agents-pagination` 样式 | 探针实测字号 + 无溢出                                   | ✅ 实现完成，**❌ 用户不认可** |
| 8   | 智能体信息面板      | 用户指出参考产品「收藏/评论与数字拉太开、收藏按钮出框」            | 详情页新增面板：统计 `center`+`gap:5px` 紧排、头部收藏按钮走正常文档流（结构上不可能出框）、localStorage 持久化                             | 探针：按钮右边界余量 78px、收藏联动、刷新保持           | ✅ 实现完成，**❌ 用户不认可** |

## 3. 本轮确立的可复用口径

### 3.1 智能体预设参数（D-045）

- agent 配置**只存模型别名**（`modelAlias`），key 继续走 provider group → `keyRef` 自动路由；不得在 agent 里硬编码 key（D-020 / D-026 / D-041）。
- **预设即生效**：agent 设了 `modelAlias` 就优先用它，无需用户在会话里再选模型（详情页当前也没有模型选择器）。
- **失效静默回退**：预设别名不在可用模型列表里时回退到会话/全局选择；模型列表加载失败时不做前端判定，交后端注册表终裁。**不允许因为预设失效让整个对话失败。**
- `maxTokens` / `temperature` **只在设置了才下发**，不设置时上游 payload 不带该字段（保持既有请求形态不变）。
- `inputMode`（`chat` / `form` / `wizard`）本批**只建字段不建 UI**，避免二次迁移。

### 3.2 精选层质量底线（D-046）

`apps/web/src/data/agents.spec.ts` 是长期护栏，当前断言：精选 ≥60；每类目 ≥3；指令非空且 ≥20 字；`modelAlias` 合规；`temperature` 0–2 / `maxTokens` 256–32768；**`inputMode` 必填且合法**；**每个精选至少 1 个能力标签**；能力 id 必须在 17 个已声明枚举内；全目录 6358 条 **id 与 name 均唯一**。

### 3.3 样式改动的边界约定

用户明确「不用改全局，只改做的超级智能体一部分」。本轮所有视觉改动限定在 `AgentsView.vue` / `AgentDetailView.vue` 的 scoped 样式内，未动全局样式、未动模板结构以外的逻辑。

### 3.4 用户对视觉结果的判定（本轮最重要的一条）

连续两轮 UI 调整（`/agents` 字号阶梯、详情页信息面板）**均未获用户认可**，原话「算了，依旧效果不理想」。因此：

- **不要再沿着「按参考产品截图微调字号/间距」这条路继续加码**，三轮同类尝试已证明收益递减。
- 接手模型应先和用户确认不满意的**具体层次**（是字号仍偏小？层次不清？留白/灰度不对？还是信息面板本身多余？），**或直接索取期望效果截图**，再动手。
- 建议改流程：**先出静态对比稿（同一屏的「现状 / 方案 A / 方案 B」并排图或 HTML 小样）→ 用户选 → 再改代码**，不要直接改 `.vue` 再让用户验收。

## 4. 代码改动清单

### 后端（`apps/api`）

| 文件                                                                 | 改动                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                               | `CustomAgent` 新增 `modelAlias String?`、`temperature Float?`、`maxTokens Int?`、`inputMode String @default("chat")`                              |
| `prisma/migrations/20261020092005_add_agent_preset_params/`          | **新增**，纯 `ADD COLUMN`，对既有数据零风险（已复验库内旧行）                                                                                     |
| `src/agents/dto/create-agent.dto.ts`                                 | 新增 4 字段校验（别名 `^[a-zA-Z0-9._-]*$` ≤64、temperature 0–2、maxTokens 256–32768、inputMode 枚举）；**空串 = 清除预设**，故正则为 `*` 而非 `+` |
| `src/agents/dto/update-agent.dto.ts`                                 | 同上，`undefined` = 不触碰                                                                                                                        |
| `src/agents/agents.service.ts`                                       | `CustomAgentView` + `toCreateData` / `toUpdateData` / `toView` 处理新字段                                                                         |
| `src/chat/dto/stream-chat.dto.ts`                                    | 新增 `maxTokens` 校验（256–32768）                                                                                                                |
| `src/chat/chat.service.ts`                                           | `StreamChatInput` / `PreparedChat` 透传 `maxTokens` 到 provider                                                                                   |
| `src/providers/llm-provider.ts`                                      | `StreamChatRequest` 加 `maxTokens?`                                                                                                               |
| `src/providers/openai-compatible/openai-compatible.provider.ts`      | 上游 payload **仅当设置时**写 `max_tokens`                                                                                                        |
| `src/providers/openai-compatible/openai-compatible.provider.spec.ts` | 新增「不设则无 `max_tokens`、设了才下发」单测（注意：需 `mockImplementation` 每次造新流，`mockResolvedValue` 会二次消费同一 body 而失败）         |
| `src/providers/provider-router.spec.ts`                              | **机械补齐历史遗留**：`ImageProviderRouter` 已加第 5 个构造参数（xai 生图），spec 未同步导致全仓 typecheck 报红；只补参数，未改断言语义           |
| `test/agents.e2e-spec.ts`                                            | 新增预设参数创建/更新/默认值/校验断言（+1 项）                                                                                                    |
| `test/chat-stream-provider.e2e-spec.ts`                              | 断言上游收到 `max_tokens: 2048`                                                                                                                   |

### 前端（`apps/web`）

| 文件                                 | 改动                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/agents.ts`                 | `AgentInputMode` 类型 + 取值边界常量；`AgentCatalogItem` 加 4 个可选字段；**精选 27 → 74**（新增 47 条 + 回填 27 条的 `instructions`/`capabilities`/`inputMode`） |
| `src/data/agent-directory.ts`        | 类目蓝图支持透传预设字段；**修生成器重名 bug**（兜底 22 条用 `index%20` 选前缀、`index%10` 选后缀导致 2 组重名，改为后缀 `floor(index/20)%10`）                   |
| `src/data/agent-directory.spec.ts`   | 断言升级为「6358 条 name 全唯一」+ 生成目录携带合法预设                                                                                                           |
| `src/data/agents.spec.ts`            | **新增**，9 项质量守卫（见 3.2）                                                                                                                                  |
| `src/app/api.ts`                     | `PersistedAgent`/`SaveAgentInput` 扩展；`streamChat` 入参加 `maxTokens`                                                                                           |
| `src/stores/agent-workspace.ts`      | 映射函数透传新字段；新增 `availableModelAliases` 缓存 + 纯函数 `resolveAgentModelAlias`；`sendMessage` 按预设下发                                                 |
| `src/stores/agent-workspace.spec.ts` | 新增解析纯函数 4 项 + 预设下发/失效回退 2 项（+6 项）                                                                                                             |
| `src/utils/agent-info-prefs.ts`      | **新增**，收藏/置顶偏好纯逻辑（localStorage `aurora:agent-info-prefs:v1`，解析容错、去重、存储不可用静默降级）                                                    |
| `src/utils/agent-info-prefs.spec.ts` | **新增**，9 项单测                                                                                                                                                |
| `src/views/AgentsView.vue`           | 只改 scoped 样式：字号阶梯放大 + 补齐 `.agents-pagination`（原样式表完全缺失，分页渲染为浏览器默认按钮）                                                          |
| `src/views/AgentDetailView.vue`      | 头部加收藏 pill + ⓘ 信息按钮；右侧抽屉「智能体信息」面板 + 全套样式（约 +411 行）                                                                                 |

### 文档

`CHANGELOG.md`（2026-10-20 三条 + 2026-10-21 两条）、`docs/DECISIONS.md`（**D-045 智能体预设参数**、**D-046 精选层质量底线**）、`.workbuddy/memory/2026-10-20.md` 与 `2026-10-21.md`。

## 5. 新增脚本与产物

| 路径                                              | 用途                                                               | 复跑方式                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `outputs/runtime/fill-agent-presets.mjs`          | 为 18 个蓝图 + 27 个精选批量写预设字段（锚点严格唯一命中）         | `node outputs/runtime/fill-agent-presets.mjs`            |
| `outputs/runtime/backfill-agent-instructions.mjs` | 为 27 个既有精选回填指令/能力/输入形态                             | `node outputs/runtime/backfill-agent-instructions.mjs`   |
| `outputs/runtime/_agent-preset-probe.mjs`         | 真实上游联调探针（登录 → 预设模型请求 → `maxTokens:512` 截断验证） | 需 API 3001 在跑；**会消耗 2 积分**                      |
| `outputs/ui-reference/_agents-typo-probe.mjs`     | `/agents` 字号实测 + 整页截图 + 溢出/截断检查（mock 登录）         | `node outputs/ui-reference/_agents-typo-probe.mjs <tag>` |
| `outputs/ui-reference/_agent-info-probe.mjs`      | 详情页信息面板：收藏联动 / 刷新持久化 / 计算样式 / 出框断言        | `node outputs/ui-reference/_agent-info-probe.mjs <tag>`  |

截图产物：`_agents-typo-before.png`、`_agents-typo-after.png`、`_agent-info-v1-{panel,favorited,persisted,detail}.png`（均在 `outputs/ui-reference/`，该目录被 git 忽略）。

## 6. 真实上游可用性快照（2026-10-20/21 实测）

| 模型别名                   | 状态        | 备注                                         |
| -------------------------- | ----------- | -------------------------------------------- |
| `qwen-3-8-max`             | ✅ 可用     | 走 Qwen 组密钥；本轮真实调用成功             |
| `deepseek-v4-1-flash-0910` | ✅ 可用     | 检索/生活类 agent 预设使用                   |
| `openai-gpt-6-astra`       | ✅ 可用     | 视觉/营销/媒体/产品类预设使用                |
| `deepseek-v4-pro-0813`     | ❌ 429 限流 | **本轮所有预设已避开**，不要把它设成默认别名 |

- `maxTokens: 512` 实测**硬截断生效**：要求写 800 字，输出停在约 548 字符（结尾断在句中），证明 `max_tokens` 真的到达上游。
- 积分：`dev@aurora.local` 联调前 142 → 两次请求后 140（每次 1 积分），说明预扣/结算链路正常。

## 7. 已知能力边界（别当成已完成）

1. **`capabilities` 仍只是 prompt 里的标签**：全仓 grep `tool_calls` / `function_call` / `web_search` **零命中**，不存在真实 function calling。所谓「超级」目前靠系统提示词驱动，不真联网、不生 PPT、不生图。
2. **`inputMode` 只有数据层**：14 个 `form` + 6 个 `wizard` 候选**没有任何表单/向导 UI**，点进去仍是自由对话。
3. **`instructions` 是手写提示词**，无 RAG、无工具、无工作流编排；差异化靠提示词质量而非能力差异。
4. **收藏/评论是本地演示**：`agent-info-prefs.ts` 走 localStorage，无后端表；评论数固定为 0，分享降级为复制链接。
5. **API e2e 依赖 Docker**：容器不起则 27 个文件里凡触及 DB 的全红，属环境性失败。
6. **生成目录是模板克隆**：6358 条中 6284 条由蓝图程序化生成，描述与指令同质（这是目录规模的实现方式，不是缺陷，但别指望它们行为不同）。

## 8. 工作区状态（2026-10-21 已提交并推送）

用户要求「推一次，方便同事接力」，本会话改动已提交为 `1fe95f7 feat(agents): add preset params and expand curated agent catalog to 74`（22 个文件），含迁移 `20261020092005_add_agent_preset_params`、`agents.spec.ts`、`agent-info-prefs.ts(.spec)`。

- 同一批推送共三个提交：`7aced5d`（2026-10-20 的画布 / 视频 / 真实模型接入）→ `1fe95f7`（本文件主题）→ 本次文档提交
- 共享文件 `apps/web/src/app/api.ts` 同时含两批字段，归入 `7aced5d`（纯新增，不影响编译）
- 原先标记「属于用户既有 WIP、不要动」的文件（`CanvasStudioView.vue` 等）已随 `7aced5d` 一并提交
- `.workbuddy/` 已加入 `.gitignore`（本地记忆目录，不入库也不要删）
- 校验：`video-tasks.e2e-spec.ts` 里那条 oxlint 未使用变量 warning 已修（补了 provider 入参断言），现在 `oxlint --deny-warnings` 为 0 warning

## 9. 下一步待办（建议顺序）

1. **视觉返工（最高优先，用户明确不满意）**：先问清「不满意的是哪一层」，或直接要期望截图；按 3.4 的建议改为「先出并排对比稿 → 用户选 → 再改代码」。
2. **提交本轮改动**：需用户确认范围（D-033），且必须把本会话改动与用户画布 WIP 分开提交，不要一锅端。
3. `AgentCreateView` 预设参数编辑 UI：数据层、DTO、校验都已就绪，只差表单。
4. `inputMode` 表单/向导 UI：已有 20 个候选（form 14 / wizard 6）。
5. 真实工具调用：把 17 个 `capabilities` 变成 ToolRegistry + `tools[]` 循环（可评估 Mastra 作 agent runtime，或自研最小实现）。
6. 恢复 API e2e 前先起 Docker；确认 123 项回归无异常。

## 10. 接手自检清单

```bash
cd /c/Users/Administrator/Desktop/project2
git status --short --branch          # 确认 59 项变更仍在，勿误提交用户 WIP
git log --oneline -5                 # 确认 HEAD 仍是 59bdf84
docker ps                            # 未运行则先启动 Docker Desktop
curl -s -o /dev/null -w "vite:%{http_code}\n" http://127.0.0.1:5173/
curl -s -o /dev/null -w "api:%{http_code}\n" http://127.0.0.1:3001/api/v1/health

# 前端全量（不依赖 DB，可随时跑）
cd apps/web && node node_modules/vitest/vitest.mjs run        # 期望 22 文件 120 项
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit

# 后端（需 DB）
cd ../api && DBURL=$(grep '^DATABASE_URL=' ../../.env | cut -d= -f2- | tr -d '"')
DATABASE_URL="$DBURL" node node_modules/vitest/vitest.mjs run  # 期望 27 文件 123 项
node node_modules/typescript/bin/tsc --noEmit

# 格式与静态检查
cd ../.. && node node_modules/prettier/bin/prettier.cjs --check <改动文件>
node_modules/.bin/oxlint --deny-warnings apps/web/src apps/api/src apps/api/test
```

读文档顺序：`PROJECT_CONTEXT.md` → `DECISIONS.md`（重点 D-020/026/039/041/045/046）→ 本文件 → `SESSION_HANDOFF_2026-10-20.md`（画布口径仍在生效）。

## 11. 文档索引

| 文档                                 | 作用                                             |
| ------------------------------------ | ------------------------------------------------ |
| `docs/PROJECT_CONTEXT.md`            | 事实优先级、阶段、实现边界                       |
| `docs/DECISIONS.md`                  | 全部已确认决策（本轮新增 D-045、D-046）          |
| `docs/SESSION_HANDOFF_2026-10-21.md` | **本文件**：预设参数 + 精选扩充 + 视觉调整       |
| `docs/SESSION_HANDOFF_2026-10-20.md` | 画布连线语义、视频能力位、跨媒体降级（继续有效） |
| `docs/M3_WORKLOG.md`                 | 逐节过程记录                                     |
| `docs/OPEN_QUESTIONS.md`             | 未决问题与上游可用性实测                         |
| `docs/MODEL_CONTINUITY.md`           | 模型切换与续接约定                               |
| `CHANGELOG.md`                       | 按日变更流水                                     |
