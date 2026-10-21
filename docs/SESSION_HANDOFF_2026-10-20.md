# 2026-10-20 会话存档：AI 画布深度精修 + 真实模型接入

本文是 2026-10-20 当天（上午 DeepSeek-V4.1-Flash、下午 MiniMax-M3.1-Flash 两段会话）的**可续接存档**，用于防止上下文丢失。详细逐步记录见 `docs/M3_WORKLOG.md` 第 51-63 节；本文件只做归纳与接手指引。

> 事实优先级仍以 `docs/PROJECT_CONTEXT.md` 第 2 节为准：本文件是补充，不是决策来源。

## 0. 一句话现状

AI 画布从「能跑通」推进到「链路语义正确」：素材严格取自直接来源节点的产物、视频可转文案、文案可直接生视频、生成结果有历史可查；后端同时接通了 Grok 生图与两个 Grok 视频模型，并按能力位在全站过滤模型。**所有改动仍未提交**（32 个已跟踪文件 + 4 个未跟踪项（行数以 `git diff --shortstat` 为准））。

## 1. 环境与运行方式

| 项              | 值                                                                                    |
| --------------- | ------------------------------------------------------------------------------------- |
| 工作目录        | `C:\Users\Administrator\Desktop\project2`                                             |
| 分支 / 最近提交 | `main` / `59bdf84 docs(decisions): record D-042 for dev tool switchover to workbuddy` |
| 前端            | Vite `http://127.0.0.1:5173`（dev server 已起，HMR 生效）                             |
| 后端            | Nest `http://127.0.0.1:3001`（`node dist/main.js` 运行中）                            |
| 依赖中间件      | postgres / redis 容器（healthy）                                                      |
| 本地测试账号    | `dev@aurora.local`（当天把积分补到 200，够画布实测）                                  |
| 密钥来源        | `本地密钥文件`（**只读不入库、不入日志、不进仓库**）                                  |
| 测试口径        | 桌面 `1440x1000`；移动端自 2026-10-20 起暂停（见 M3_WORKLOG 第 54 节）                |
| 本轮测试        | API 27 文件 121 项、Web 20 文件 94 项，全部通过；`vue-tsc`、`oxlint`、`prettier` 通过 |

沙箱注意事项（沿用）：`wsl.exe` 在黑名单，Docker Desktop 需手动开启；`nest build`/`nest start` 会清 `dist` 被拦截，改用 `node node_modules/typescript/bin/tsc -p tsconfig.build.json` + `node dist/main.js`；`pnpm` 不在 PATH，用 `npx --yes pnpm@11.25.0`；`/api/v1/image-tasks` 需要大写 `Idempotency-Key`。

**长驻进程会被宿主回收**：2026-10-20 17:42，跑了约 6 小时的 API 后台进程（`node dist/main.js`）被终止，**日志里没有任何错误或堆栈**，最后一条业务日志停在 15:01 的视频任务完成。Vite 进程同样可能长时间运行后消失。判断「服务是否还在」不要看任务状态，直接探端口：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/v1/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/
```

恢复方式（不要用 `nest build`）：`node node_modules/typescript/bin/tsc -p tsconfig.build.json` 重新构建，再以后台方式跑 `node dist/main.js`。重建后务必用真实登录拉一次 `/api/v1/models` 确认模型清单数量（当天为 13 个：8 对话 + 3 生图 + 2 视频），确认 provider 注册没丢。

## 2. 本轮工作全景

| #   | 主题               | 现象 / 需求                                     | 处理                                                                                    | 验证                            | 详细  |
| --- | ------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------- | ----- |
| 1   | 画布输入区不常驻   | 参考产品左下角没有常驻输入框                    | 输入框改为点素材才出现，吸附在素材下方并跟随拖动                                        | 页面实测                        | 52    |
| 2   | 视口深度           | 输入框超出屏幕被夹回；画布不够大；zoom 最小 10% | 垂直方向不再 clamp，随素材下沉；世界坐标 8000×6000；`clampCanvasZoom` 下限 0.1          | 页面实测                        | 53    |
| 3   | 移动端             | —                                               | 整体暂停并记录恢复清单                                                                  | 文档                            | 54    |
| 4   | 真实上游联调       | 需要用真 Key 跑通                               | 打通对话 / `gpt-image-2.5` 图生图 / `grok-imagine-video` 视频                           | 真实任务                        | 55-57 |
| 5   | 画布图生视频       | 图生视频要能接上；素材传不过去                  | 定位为旧密钥分组拒绝内联图片 + 拒绝 `resolution`；换第 7 组密钥、删字段重试             | 真实视频 SUCCEEDED              | 57    |
| 6   | Grok 生图接入      | 需要第二个生图通道                              | 新增 `XaiImageProvider`，固定 `b64_json`（`imgen.x.ai` DNS 被污染）                     | 真实生图成功                    | 58    |
| 7   | 模型按能力区分     | 不能图生视频的 Key 不该出现在图生视频下拉       | 新增能力档案与 `imageModelsFor` / `videoModelsFor`，全站四类入口按模式过滤              | 6 处断言更新                    | 58    |
| 8   | 节点说明与进度     | 节点左上角要有简要说明；视频要有加载动画        | `nodeCaption` 显示创作说明；视频节点 `LoadingOutlined` + 进度条                         | 页面实测                        | 59    |
| 9   | **画布连线语义**   | 图生图后再图生视频，视频仍走原图                | 素材改为取直接来源节点的**产物**；输入框按「有无产物」分流；文本节点不传素材            | 探针 `_chain-probe.mjs`         | 60    |
| 10  | 视频转文案         | 视频节点做文本生成报「仅支持图片附件」          | 抽 2%/50%/98% 三张关键帧当图片上传；指令标注同源关键帧                                  | 探针 `_video-text-probe.mjs`    | 61    |
| 11  | 文案转视频         | 想要「图生文本 + 客户需求 → 视频」              | 画布补齐文生视频（`generationMode: 'text-to-video'`，无首帧）；文案输出加「画面描述」段 | 同上探针                        | 61    |
| 12  | 视频历史           | 历史记录里看不到已生成视频                      | 视频确实已落盘，是历史面板视频标签是空壳；改为按需拉 `listVideoTasks`                   | 探针 `_video-history-probe.mjs` | 62    |
| 13  | 文案节点下的框     | 那个框到底干嘛；`**` 之类很丑                   | 明确为**编辑器**（只回写文字）；`stripMarkdown()` 清洗记号                              | 探针 `_prompt-edit-probe.mjs`   | 62    |
| 14  | 刷新后视频裂图     | 刷新后视频变裂图 + 跟着一段文本                 | `nodeVideoUrl()` 取 blob URL；`nodeImageUrl()` 对视频返回空                             | 探针 `_video-refresh-probe.mjs` | 63    |
| 15  | 点空白输入框不消失 | 输入框一直钉在节点下                            | 点画布空白时清 `composerSource/Target`                                                  | 同上探针                        | 63    |

## 3. 本轮确立的可复用口径

这些是**行为规则**，写代码时按此执行，不要重新发明。

### 3.1 画布连线与素材语义

- 每个生成节点的素材 = **它的直接来源节点的产物**（`resultFileId` 优先，`sourceFileId` 兜底），不沿链穿透。
- 连线是依赖关系的可视化：新建结果节点会同时画「文本依赖」和「素材依赖」两条边。
- 文本（`prompt`）节点只贡献提示词，**不携带图片**；`图 → 文 → 图` 默认是文生图，要延续主体必须把图片节点也连到生成节点。
- 多条入边时取**最后连上**的那条，用户手动改接素材后不会继续沿用旧素材。
- 节点的输入框有两种语义：**已有产物** = 以它为素材继续创作（提交时新建下游节点）；**尚无产物** = 填充它本身。
- 创作区顶部「参考素材」标签把这次实际使用的素材写出来。

### 3.2 视频模型的三个能力位（别搞混）

| 字段                 | 管什么                           | Grok 两个视频模型 |
| -------------------- | -------------------------------- | ----------------- |
| `supportsImageInput` | 首帧图 → 图生视频                | true              |
| `supportsLastFrame`  | 尾帧图 → 首尾帧模式              | **false**         |
| `supportsVideoInput` | 视频文件 → 参考视频 / 视频生视频 | **false**         |

`supportsLastFrame: false` 只表示不收尾帧；「不支持视频生视频」对应的是 `supportsVideoInput: false`，两者是不同的事。

### 3.3 跨媒体降级策略

- 视频 → 图片：浏览器截**首帧**当普通素材上传，行为等同一次普通图生图。
- 视频 → 文案：抽 2%/50%/98% 三张关键帧，以多图形式送 vision 模型，并声明「同源关键帧」。
- 视频 → 视频：**没有通道**，点菜单直接提示，不创建注定失败的节点。
- 画布已补齐**文生视频**（文案节点派生，无首帧）。

### 3.4 文案节点的语义

- 文案节点下方的框是**编辑器**：只回写节点文字，不触发生成；编辑时隐藏模型/比例/尺寸与积分角标，发送键换成对勾。
- 想用文案出图或出视频，走节点菜单的「图像生成 / 视频生成」。
- 模型返回的 Markdown 记号统一由 `stripMarkdown()` 清理后落库与展示。

## 4. 代码改动清单

### 后端（`apps/api`）

| 文件                                                                                      | 改动                                                                                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/providers/xai-image/`（新增目录）                                                    | Grok 生图通道：固定 `b64_json`，参考图 sharp 压缩后以 data URL 传入                                                        |
| `src/providers/xai-video/xai-video.provider.ts`                                           | 绝对地址解析、结果下载带 Bearer、首帧 sharp 压缩、422 去 `resolution` 重试、错误原文透传                                   |
| `src/providers/provider-protocol.ts` / `image-provider-router.ts` / `providers.module.ts` | 新增图片协议 `xai` 与路由分支                                                                                              |
| `src/models/model-registry.service.ts`                                                    | 移除 3 个豆包模型；新增 2 个 Grok 生图 + 2 个 Grok 视频；`resolveImageCapabilityProfile` / `resolveVideoCapabilityProfile` |
| `src/models/model-capability.constraints.ts`                                              | 新增 `IMAGE_EDIT_UNSUPPORTED`、`VIDEO_IMAGE_INPUT_UNSUPPORTED`                                                             |
| `src/config/env.ts`                                                                       | 登记 `IMAGE_GROK_BASE_URL` / `IMAGE_GROK_API_KEY` / `IMAGE_GROK_DEFAULT_MODEL`（zod 白名单不登记会被剥掉）                 |
| `src/video-tasks/video-tasks.service.ts`                                                  | 文生视频路径与首尾帧/参考视频校验                                                                                          |
| `scripts/inspect-video-tasks.mjs`（新增）                                                 | 查库确认视频任务与文件落盘（Prisma 7 需 `PrismaPg` adapter）                                                               |

### 前端（`apps/web`）

| 文件                                                                                  | 改动                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/views/CanvasStudioView.vue`（+1590 行，本轮主战场）                              | 画布视口与输入区行为、节点说明、视频进度、连线与素材语义、视频→图片/文案降级、文生视频、视频历史、Markdown 清洗、刷新后视频渲染、点空白收起输入区 |
| `src/stores/model-catalog.ts`                                                         | `ImageModelMode` / `VideoModelMode`、`imageModelsFor` / `videoModelsFor`、别名解析                                                                |
| `src/utils/markdown.ts`                                                               | 新增 `stripMarkdown()`                                                                                                                            |
| `src/app/api.ts`                                                                      | `listVideoTasks` 等接口导出                                                                                                                       |
| `src/views/DrawStudioView.vue` / `ImageToolWorkbenchView.vue` / `VideoStudioView.vue` | 各入口模型列表按能力过滤；首尾帧/参考视频无模型时标注「暂无可用模型」                                                                             |

## 5. 新增脚本与产物

| 脚本                                            | 用途                                                         |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `outputs/ui-reference/_chain-probe.mjs`         | 画布链路归属：点结果节点 / 点空视频节点的参考素材            |
| `outputs/ui-reference/_video-text-probe.mjs`    | 视频→文案（3 关键帧）与文案→文生视频（`sourceFileId: null`） |
| `outputs/ui-reference/_video-history-probe.mjs` | 视频历史面板（真实后端 + 真实 dev 账号）                     |
| `outputs/ui-reference/_prompt-edit-probe.mjs`   | 文案编辑模式与 Markdown 清洗                                 |
| `outputs/ui-reference/_video-refresh-probe.mjs` | 刷新后视频渲染 + 点空白收起输入区                            |
| `apps/api/scripts/inspect-video-tasks.mjs`      | 查库看视频任务与结果文件                                     |

探针统一用 playwright-core + 本机 Edge（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`），`VERIFY_BASE_URL` 可覆盖地址。截图产物在 `outputs/ui-reference/`。

## 6. 真实上游可用性快照（2026-10-20）

- 对话：`gpt-6-astra`、`qwen3.8-max` 可用；`deepseek-v4-pro-0813` 上游 **429 限流**（同 Key 的 `deepseek-v4.1-flash` 正常）。
- 生图：`gpt-image-2.5` 文生图与图生图（`/images/edits`）可用，已验证「原图加红帽子、其余不变」。
- 生图第二通道：`grok-imagine-image` / `grok-imagine-image-2.0` 可用，但**回链 `imgen.x.ai` 在本机 DNS 被污染**，必须固定 `response_format: b64_json`。
- 视频：`grok-imagine-video`（1.5 同理）文生视频与图生视频均已打通；**必须用第 7 组「生视频」密钥**——旧分组拒绝内联图片（`image url must be http(s) or asset://`），且不接受 `resolution`（带上直接 422，代码已做去掉重试）。
- 已移除：`doubao-seedream-4-0`、`doubao-seedance-1-0-pro`、`doubao-seedance-2-0`（无 Key 且网关无 `/api/v3`，实测 404）。重新接入需配火山方舟 Key 与 Base URL。
- 能力差异落地：Grok 生图传图只是参考、整幅重绘（猫图加红帽后背景从雪窗变秋日长椅）→ `supportsImageEdit: false`，不出现在「智能修图 / 局部编辑 / 商品图处理」列表。

## 7. 已知能力边界

- 没有真正理解视频的模型：关键帧方案不含音频、节奏、镜头连续性。
- 没有首尾帧能力：`supportsLastFrame: false`，「以某帧收尾」只能靠 prompt 描述。
- 没有视频生视频：`supportsVideoInput: false`，provider 也没有上传视频文件的通道。
- 视频历史面板只拉最近 12 条，且要切到该标签才下载（单个视频好几 MB）。
- 画布的图生视频目前是单素材首帧，参考产品 6 号图那种「首帧 / 尾帧」双槽位未实现（需要把 `referenceFileIds` 打通到视频任务与上游）。

## 8. 工作区状态（2026-10-21 已提交并推送）

```
7aced5d feat(canvas,video): deepen canvas chain and wire Grok image/video providers   # 本存档的画布/视频/模型接入，27 个文件
1fe95f7 feat(agents): add preset params and expand curated agent catalog to 74        # 智能体预设参数与精选扩充，22 个文件
<docs>  docs: archive handoffs for model switchover                                      # 文档存档（含本文件）
```

> 用户于 2026-10-21 明确要求「推一次，方便同事接力」，因此本批改动已按两批代码 + 一批文档拆分提交并推送（此前约定是「有大更新再提交」）。

- 共享文件 `apps/web/src/app/api.ts` 同时含两批字段，归入 `7aced5d`（纯新增，不影响中间提交的编译）
- `.workbuddy/` 已加入 `.gitignore`：本地记忆目录，**不入库也不要删**
- 推送前验证：Web 22 文件 120 项、API 27 文件 123 项全通过；`vue-tsc --noEmit`、`tsc --noEmit`、`prettier --check`、`oxlint --deny-warnings` 全绿
- 原先记录的「并发写入」风险已解除：17:20–17:41 的写入方是上一轮智能体预设参数的执行轨道，其成果已并入 `1fe95f7`
- 新增依赖：后端引入 `sharp`（视频首帧压缩与图片处理）

## 9. 下一步待办（建议顺序）

1. 提交并推送本轮改动（需用户确认范围）。
2. 参考产品 6 号图的**首帧 / 尾帧双槽位**（需要 `referenceFileIds` 打通到视频任务与上游，且要有 `supportsLastFrame` 的模型才见效）。
3. 真正的视频理解（需支持视频输入的模型或网关能力）。
4. 恢复移动端适配（清单见 M3_WORKLOG 第 54 节）。
5. 补 `deepseek-v4-pro-0813` 的替代方案：换别名或等限流恢复。

## 10. 接手自检清单

1. 读 `docs/PROJECT_CONTEXT.md`（事实优先级）→ `docs/DECISIONS.md`（已确认决策）→ 本文。
2. 读 `docs/M3_WORKLOG.md` 第 51-63 节（本轮全过程）。
3. `git status --short --branch` + `git log --oneline -8`，确认工作区与本文第 8 节一致。
4. 起服务：后端 `node dist/main.js`（或重新构建），前端 `vite`，确认 3001 / 5173 / 容器健康。
5. 用 `dev@aurora.local` 登录，先用 `outputs/ui-reference/_chain-probe.mjs` 这类探针复验，不必消耗真实积分。
6. 要消耗真实额度的验证（生图/视频）前先向用户说明。

## 11. 文档索引

| 文档                          | 作用                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| `docs/PROJECT_CONTEXT.md`     | 事实优先级、已确认事实、当前阶段                               |
| `docs/DECISIONS.md`           | 已确认决策（D-011 / D-020 / D-026 / D-033 / D-040 / D-042 等） |
| `docs/M3_WORKLOG.md`          | 逐节过程记录（本轮见 51-63 节）                                |
| `docs/OPEN_QUESTIONS.md`      | 未决问题、真实上游可用性、能力差异                             |
| `docs/MODEL_CONTINUITY.md`    | 模型切换时的必读顺序                                           |
| `docs/AI_HANDOFF.md`          | 面向接手模型的总体交接说明                                     |
| `docs/RESEARCH_BASELINE.md`   | 参考产品研究与路由对应关系                                     |
| `docs/IMPLEMENTATION_PLAN.md` | 三档执行规则（D-033 落地）                                     |
| `CHANGELOG.md`                | 全部有效改动的流水记录                                         |
