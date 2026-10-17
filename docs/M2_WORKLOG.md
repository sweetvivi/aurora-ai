# M2 工具套件工作日志

更新时间：2026-10-17

## 1. 当前分支和基线

- 工作目录：`C:\Users\Administrator\Desktop\project2`
- 分支：`main`
- 分支起始提交：`5ced005 docs: mark m1 synchronization complete`
- 当前阶段：M2 工具套件首版、AI 画布与电商工具工作台实现

## 2. 本批范围

按用户确认的优先级，以下模块进入本批：

1. 模型对话
2. AI 绘画
3. 超级智能体
4. 智能修图
5. 图片生成
6. 视频生成
7. AI 画布
8. 电商工具

参考产品其他板块继续保留位置，不进入本批实现。

## 3. 已实现内容

### 真实图片 Provider

- 后端模块：`apps/api/src/providers/openai-image/`
- 能力：接入 OpenAI 兼容的 `/images/generations` 和 `/images/edits`，支持文生图和原图编辑
- 模型：前端别名 `jiguang-gpt-image-2.5`，上游模型 `gpt-image-2.5`
- 运行模式：`IMAGE_PROVIDER=auto` 在配置 Key 时使用真实 Provider，无 Key 时使用 Mock；`mock` 和 `openai` 可强制指定
- 鉴权：支持主 Key 和备用 Key；只在 `401/403` 鉴权失败时尝试备用 Key，普通错误不会重复消费额度
- 结果处理：支持 `b64_json` 和远程 URL，限制 30 MB，校验 PNG/JPEG/WebP/GIF 文件头
- 错误处理：超时、限流、服务不可用、无效响应、下载失败和结果过大都会进入图片任务失败状态并退回积分
- 本地低成本验收：1 张图片、`low` 质量、约 26 秒完成，结果 `1254x1254`，积分从 100 结算为 95；未读取或输出任何 Key

### 智能修图

- 路由：`/retouch`
- 兼容旧入口：`/image-tools`
- 页面：`apps/web/src/views/ImageToolWorkbenchView.vue`
- 能力：原图上传、画质增强、超清放大、一键抠图、智能擦除、背景替换、风格调整、处理强度、任务记录、收藏、下载、删除和重试

### 图片生成

- 路由：`/image-generation`
- 页面：`apps/web/src/views/ImageToolWorkbenchView.vue`
- 能力：模型选择、提示词、画面比例、输出清晰度、生成数量、任务记录、收藏、下载、删除和重试

### 视频生成

- 路由：`/video`
- 页面：`apps/web/src/views/VideoStudioView.vue`
- 能力：文生视频、图生视频、首尾帧、镜头描述、提示词预设、模型、比例、时长、清晰度、本地进度、取消、重试、收藏、故事板下载和再创作
- 边界：当前是本地演示任务，不调用 Seedance，不消耗真实视频额度

### AI 画布

- 路由：`/canvas`
- 页面：`apps/web/src/views/CanvasStudioView.vue`
- 能力：节点添加、选择、拖拽、删除、复制和连线，图片/输出/提示词节点，画布平移缩放，工作流面板、素材库、图片/视频历史、灵感面板、底部生成区和本地持久化
- 素材分类：全部、角色、场景、物品、风格、声音、其他

### 电商工具

- 路由：`/commerce`
- 页面：`apps/web/src/views/CommerceWorkbenchView.vue`
- 能力：商品主图、商品换背景、模特试穿、多比例商拍，商品和模特素材上传、场景预设、比例、清晰度、数量、预览检查、快捷描述、历史、收藏、下载、删除和重试

### 导航和入口

- `apps/web/src/layouts/PlatformShell.vue`
- `apps/web/src/views/HomeView.vue`
- `apps/web/src/views/FeaturePlaceholderView.vue`

主侧栏和首页按六个优先模块排序；AI 画布、电商工具进入导航并加载独立工作台。

### 共享图片任务

- `apps/web/src/stores/draw-workspace.ts`
- `apps/web/src/stores/draw-workspace.spec.ts`

图片任务记录新增 `tool` 和 `parameters`，绘画、智能修图和图片生成共享后端异步任务状态机，同时按工具隔离记录、重试参数和页面显示。

AI 画布和电商工具复用同一异步图片任务 Store，并分别使用 `canvas` 和 `commerce` 工具键隔离记录。

## 4. 验证记录

以下命令已通过：

```text
pnpm --filter @aurora/web test
pnpm --filter @aurora/web typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
```

测试规模：

- Web：5 个测试文件，17 项通过
- API：10 个测试文件，32 项通过

页面验收脚本：

```text
outputs/ui-reference/verify-m2-routes.mjs
```

使用本地开发服务器 `http://127.0.0.1:5173/` 检查了以下路由的 `1440x1000` 桌面端和 `390x844` 移动端：

- `/chat`
- `/draw`
- `/agents`
- `/retouch`
- `/image-generation`
- `/video`
- `/canvas`
- `/commerce`

结果：全部页面无横向溢出、无页面脚本错误；截图保存在本地忽略目录 `outputs/ui-reference/`。

补充验证：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node outputs/ui-reference/verify-m2-routes.mjs
```

AI 画布和电商工具页面已人工检查，桌面端和移动端保持同一工具信息层级，未触发真实生成任务。

## 5. 密钥和外部调用边界

- 已完成一次真实图片链路低成本验收；验收通过本地 API 和前端完成，没有读取、输出或截图真实密钥
- 视频生成使用本地模拟进度，不调用 Seedance
- 智能修图、图片生成、AI 画布和电商工具共享现有图片任务链路；配置图片 Key 后统一走真实图片 Provider
- 图片 Key 分工保持为 1、3 号生图，2 号对话，4 号只留给后续视频；本轮不调用 Seedance
- 后续若接入真实视频 provider，需要先单独说明 Base URL、模型、额度影响、失败处理和回退方式
- 密钥只允许通过后端环境变量注入，不进入 Git、日志、普通文档和回复

## 6. 已知遗留

- 视频生成尚未接真实 provider，下载结果为故事板文本，不是视频文件
- 真实图片 Provider 已完成主链路验收，但尚未覆盖所有异常分支、批量数量和所有图片尺寸的长期稳定性
- 参考产品仍有未排期板块，当前只保留入口位置
- 本批已完成本地验证，提交和推送状态以 Git 日志为准

## 7. 中断恢复

恢复工作时依次执行：

```text
git status --short --branch
git log --oneline --decorate -8
Get-Content -Raw docs/M2_WORKLOG.md
pnpm --filter @aurora/web test
pnpm --filter @aurora/web typecheck
pnpm test
```

如果本地开发服务器仍在运行，先访问 `http://127.0.0.1:5173/` 检查页面，不要无故停止其他进程。需要重新启动时只使用项目脚本和可用端口。
