# M2 工具套件工作日志

更新时间：2026-10-17

## 1. 当前分支和基线

- 工作目录：`C:\Users\Administrator\Desktop\project2`
- 分支：`feature/m2-tool-suite`
- 分支起始提交：`5ced005 docs: mark m1 synchronization complete`
- 当前阶段：M2 工具套件首版前端和本地工作流实现

## 2. 本批范围

按用户确认的优先级，六个模块进入首版：

1. 模型对话
2. AI 绘画
3. 超级智能体
4. 智能修图
5. 图片生成
6. 视频生成

AI 画布和电商工具只保留入口与独立占位页。参考产品其他板块继续保留位置，不进入本批实现。

## 3. 已实现内容

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

### 导航和入口

- `apps/web/src/layouts/PlatformShell.vue`
- `apps/web/src/views/HomeView.vue`
- `apps/web/src/views/FeaturePlaceholderView.vue`

主侧栏和首页按六个优先模块排序；AI 画布、电商工具进入导航并显示独立占位。

### 共享图片任务

- `apps/web/src/stores/draw-workspace.ts`
- `apps/web/src/stores/draw-workspace.spec.ts`

图片任务记录新增 `tool` 和 `parameters`，绘画、智能修图和图片生成共享后端异步任务状态机，同时按工具隔离记录、重试参数和页面显示。

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
- API：9 个测试文件，29 项通过

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

## 5. 密钥和外部调用边界

- 本批验证没有读取或输出真实密钥
- 视频生成使用本地模拟进度，不调用 Seedance
- 智能修图和图片生成复用现有 Mock 图片任务链路
- 真实第三方 provider 接入前，需要先说明 Base URL、模型、额度影响、失败处理和回退方式
- 密钥只允许通过后端环境变量注入，不进入 Git、日志、普通文档和回复

## 6. 已知遗留

- AI 画布和电商工具仍是占位页
- 视频生成尚未接真实 provider，下载结果为故事板文本，不是视频文件
- 智能修图和图片生成当前依赖既有图片模型别名与 Mock 图片任务能力，真实生图 provider 仍需单独接入和验收
- 参考产品仍有未排期板块，当前只保留入口位置
- 本批在提交前的改动尚未推送

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
