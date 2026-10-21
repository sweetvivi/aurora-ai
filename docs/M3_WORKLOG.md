# M3 管理后台工作日志

更新时间：2026-10-19

## 1. 当前阶段

- 工作目录：`C:\Users\Administrator\Desktop\project2`
- 分支：`main`
- M3 范围：运行时模型配置、管理后台、模块展示配置和管理员权限边界
- 当前基线：M2 工具套件首版已完成，M3 管理后台、厂商模型探测、模块展示配置与超级智能体流式修复已通过本地验证

## 2. 本批范围

本批交付以下后台能力：

1. 管理员路由守卫和后台入口
2. 平台总览：用户、积分、厂商、模型、对话和媒体任务统计
3. 用户管理：分页查询、状态和角色查看、编辑用户
4. 积分调整：管理员为指定用户增减积分并写入账本
5. 厂商管理：厂商启停、Base URL、Key 引用、优先级和模型检测
6. 模型管理：模型别名、上游模型 ID、能力、上下文窗口、启停状态和发现后批量导入
7. 运行时模型注册表：数据库配置优先，默认模型回退
8. 模块展示管理：名称、导航说明、图标、封面上传或外链、分组、路由、排序、角标和显隐

真实密钥不在本批写入数据库。管理后台只保存 `keyRef` 名称，Provider 仍从服务端环境变量读取实际密钥。

## 3. 已实现内容

### 管理后台 Web

- 新增 `apps/web/src/views/AdminView.vue`
- 新增 `/admin` 路由，`requiresAdmin` 元数据由路由守卫校验
- 后台页面包含总览、用户管理、模型厂商和模型配置四个主视图
- 用户编辑和积分调整使用弹层完成，桌面端和移动端均保留可操作布局
- `apps/web/src/app/api.ts` 新增管理员接口封装
- `apps/web/src/layouts/PlatformShell.vue` 为管理员显示后台入口

### 管理后台 API

- 新增 `apps/api/src/admin/` 模块，包括控制器、服务和 DTO
- 接口前缀：`/api/v1/admin`
- 总览：`GET /overview`
- 用户：`GET /users`、`PATCH /users/:userId`、`POST /users/:userId/points-adjustments`
- 厂商：`GET /providers`、`POST /providers`、`PATCH /providers/:providerId`
- 厂商探测：`POST /providers/probe`、`POST /providers/:providerId/probe`
- 模型：`GET /models`、`POST /models`、`POST /models/import-discovered`、`PATCH /models/:modelId`
- 所有管理员接口都要求已认证的 `ADMIN` 用户

### 厂商模型探测与导入

- 后端新增 `provider-probe.service.ts` 和对应 DTO/单测
- 探测地址固定为厂商 `baseUrl + /models`，当前支持 OpenAI-compatible 的 `data`、`models`、`items` 三种模型数组结构
- 根据上游模型 ID 推断对话、图片、视频和向量能力，也支持读取显式 `capabilities`
- 后台弹层支持本次瞬态 Key、服务端 `keyRef`、连接延迟、发现数量、能力标签、全选、清空和导入所选模型
- 导入只写厂商代码、模型别名、上游模型、能力和启停状态，重复上游模型自动跳过，别名冲突自动增加后缀
- 单次最多展示和导入 200 个模型，避免异常响应拖垮后台

### 运行时模型注册表

- `apps/api/src/models/model-registry.service.ts` 改为数据库优先
- 只读取 `enabled=true` 且所属厂商启用的模型
- 数据库没有模型时回退内置默认模型
- 首次加载或数据库异常时回退默认模型
- 成功加载后再遇到异常时保留最后有效缓存，避免短暂数据库问题时清空模型列表
- 模型元数据会传给对话、图片任务和视频任务，包含：
  - `providerCode`
  - `providerModel`
  - `baseUrl`
  - `keyRef`
- 后台新增或更新厂商、模型后触发 `modelRegistryService.reload()`，无需重启 API 即可更新模型配置

### 模块展示配置

- 新增 `ModuleDisplayConfig` 数据模型和迁移 `20261017193000_add_module_display_configs`
- 新增公共接口 `GET /api/v1/modules/display`，只返回 `visible=true` 的模块
- 新增管理员接口 `GET /api/v1/admin/modules` 和 `PATCH /api/v1/admin/modules/:moduleKey`
- 数据库配置会覆盖内置默认项；数据库不可用时仍返回完整默认目录，未知数据库记录会保留
- 后台“模块管理”支持编辑名称、图标、封面、分组、路由、排序、角标和显隐，并支持列表内快速显隐
- 后台“模块管理”补齐“导航说明”字段，列表、编辑表单和预览同步可配置；主侧栏按参考产品显示“粗体模块名 + 灰色说明”两行结构，说明字段会随公共模块目录下发并在保存后立即刷新
- 默认聊天模块路由统一为 `/newchat`，迁移会仅将仍为旧值 `/chat` 的聊天模块归一化，其他自定义路由保持不变
- 后台封面支持 JPEG、PNG、WebP、GIF 本地上传，最大 8 MB；上传前可本地预览，也可切换为外部 URL 或清除
- 新增公开受控封面读取接口 `GET /api/v1/modules/display/:moduleKey/cover`，API 响应不暴露 `coverStorageKey`
- 上传新封面、切换到外部 URL 或清除封面时，会删除旧本地文件；数据库写入失败时会回滚刚保存的文件
- 前端主侧栏、移动底栏、首页快捷入口、精选工具和工具分类改为读取同一份模块目录
- 后台保存后会强制刷新共享模块目录，平台导航和首页入口无需刷新页面即可更新
- 模块管理验收覆盖导航说明编辑与共享目录刷新；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误

## 4. 验证结果

已验证：

- `pnpm format:check` 通过
- `pnpm lint` 通过
- `pnpm typecheck` 通过
- `pnpm test`：API 24 个文件 91 项通过，Web 16 个文件 66 项通过
- `pnpm build` 通过
- `node outputs/ui-reference/verify-admin-console.mjs` 通过
- `node outputs/ui-reference/verify-admin-provider-probe.mjs` 通过
- `node outputs/ui-reference/verify-admin-modules.mjs` 通过
- 后台验收覆盖 `1440x1000` 和 `390x844`，无横向溢出、无页面脚本错误
- 厂商探测验收覆盖瞬态 Key、能力标签、全选/清空、导入请求和 Key 不泄露；截图输出为 `m3-admin-provider-probe-desktop.png`、`m3-admin-provider-probe-mobile.png`
- 模块验收覆盖改名、角标、排序、隐藏、共享目录刷新、封面上传、预览、保存、外链切换、清除和首页入口刷新；截图输出为 `m3-admin-modules-desktop.png`、`m3-admin-modules-mobile.png`

后台截图输出：

- `outputs/ui-reference/m3-admin-users-desktop.png`
- `outputs/ui-reference/m3-admin-users-mobile.png`
- `outputs/ui-reference/m3-admin-models-desktop.png`
- `outputs/ui-reference/m3-admin-models-mobile.png`

## 5. 安全边界

- 厂商配置接口只接受环境变量引用名 `keyRef`；模型探测接口的瞬态 Key 仅用于当前请求，不保存、不回显、不写日志
- 数据库、API 响应、日志、截图和 Git 中不保存真实 Key
- `providers`、模型和用户管理接口均经过认证与管理员角色校验
- 积分调整会写入积分账本，不能直接无记录地修改余额
- 运行时配置更新只影响模型路由，不等同于绕过上游供应商鉴权

## 6. 已知限制

- Provider 已支持按模型元数据动态选择 Seedream/Seedance/OpenAI-compatible/xAI 实现；显式 `IMAGE_PROVIDER`、`VIDEO_PROVIDER` 仍作为覆盖开关，数据库继续控制模型、端点、能力和 Key 引用
- 真实 Key 尚未提供后台加密持久化；当前仍通过服务端环境变量和 `keyRef` 使用，避免在未确定加密、轮换、审计和备份方案前落库
- 厂商探测允许管理员填写任意 Base URL，生产启用前需要增加内网地址拦截、域名策略或受控出口，降低 SSRF 风险
- 模块封面已完成受控上传、MIME/文件头校验、公开读取和旧文件清理；尚未增加像素尺寸校验、格式转换、病毒扫描和对象存储迁移策略
- 模块路由当前由管理员填写，尚未增加外部地址拦截和站内路由存在性校验
- 支付仍是后续沙箱阶段，未接入真实支付

## 7. 下一批建议

1. 使用真实低额度 Key 或 Mock Provider 验收超级智能体首轮消息、流式更新、停止生成、错误退款和历史切换
2. 已移除 AI 绘画创作类型卡和作品快捷操作中的视频入口，仅保留顶部“做视频”到独立视频工作台的跳转
3. 为 Seedream/Seedance 补充真实低额度人工验收，并继续完善数据库驱动 Provider 配置的审计和回滚
4. 为模块封面补充像素尺寸校验、格式转换、站内路由校验和对象存储迁移策略
5. 继续补充后台操作审计、失败回滚和真实环境恢复测试
6. 在获得单独确认后设计真实 Key 的加密存储、轮换、审计和备份方案

## 8. 2026-10-17 补充修复

- 超级智能体详情页现在会在调用流式接口前创建或绑定会话，用户消息和 `STREAMING` 助手消息会立即进入当前会话。
- 历史路由自动发送与新会话发送共用同一套会话绑定逻辑。

## 9. 2026-10-19 参考产品视觉续接

- AI 绘画首页的创作台恢复“图片 / 视频”分段切换，视频入口继续独立打开 `/video`，避免当前图片工作台被二次路由覆盖。
- “选择创作类型”恢复 `AI绘画 / AI视频 / 图片编辑` 三张等宽卡片，使用彩色能力图标、短说明和可点击胶囊标签；桌面端三列、窄屏单列。
- `verify-draw-navigation.mjs` 已同步覆盖一张 `AI视频` 卡片、顶部视频弹窗、图片编辑路由和桌面/移动端横向溢出。
- 本批只改动本地页面、验收脚本和文档，不读取或输出任何 Key/Token/Cookie，不调用真实第三方接口。
- OpenAI 兼容 Provider 会识别 `reasoning` 和 `reasoning_content`，不把内部推理直接展示给用户。
- 只有推理、没有最终正文时返回 `LLM_EMPTY_RESPONSE`，由对话服务结束请求并退回冻结积分。

## 9. 2026-10-18 运行时模型注册表回退修复

- 数据库存在模型配置时不再整体替换内置模型，避免后台只新增一个模型后 Seedance、Grok 等内置别名消失。
- 数据库模型继续优先；同别名启用模型覆盖内置配置，未覆盖的内置配置继续保留。
- 数据库记录会占用其别名。数据库模型或所属厂商被禁用时，该别名不会回退到内置项。
- 运行时代理仍只暴露启用的模型；数据库模型保持后台优先级和展示名称顺序，内置模型追加在后。
- 新增测试覆盖数据库模型追加、同别名覆盖、禁用别名隐藏和默认模型列表数量。
- 验证通过：API 26 个测试文件 109 项、`@aurora/api` 类型检查、根目录 lint。

## 10. 2026-10-18 导航说明与聊天路由归一

- `ModuleDisplayConfig` 新增可空 `subtitle` 字段，迁移 `20261018210000_add_module_subtitle`
- 新增数据迁移 `20261018210100_backfill_module_subtitles`，为现有模块补齐默认导航说明
- 新增数据迁移 `20261018210200_normalize_chat_route`，只把聊天模块的旧 `/chat` 配置改为 `/newchat`
- 后台模块表格新增“说明”列，编辑表单新增“导航说明”，预览副标题优先展示该字段
- 主侧栏改为两行导航并提高单项最小高度，移动底栏仍沿用模块名，不增加窄屏信息密度
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 全量测试为 API 26 个文件 110 项、Web 18 个文件 79 项
- `node outputs/ui-reference/verify-admin-modules.mjs` 在桌面端和移动端通过，页面无脚本错误、无横向溢出

## 11. 2026-10-18 AI 绘画模式与上传交互收口

- 新增 `apps/web/src/data/draw-creation-modes.ts`，集中定义文生图、参考图重绘、局部编辑和商品图处理四种模式的参考图要求、提示词占位、说明和提交文案
- `/draw` 首页创作台支持在当前工作台内切换模式，不再因选择模式跳离页面；选中模式会同步到生成页 URL 的 `mode`
- 生成页左侧新增模式选择，提交任务时写入 `extraParameters.mode`；文生图允许不上传参考图，其余三种模式必须在提交前提供参考图
- 参考图上传支持点击选择、拖拽和粘贴，包含缩略图预览、移除、格式校验、数量校验和错误清理；上传成功后不会继续显示旧的“缺少参考图”提示
- 局部编辑当前把第一张素材作为 `sourceFileId`，其余素材作为 `referenceFileIds`，为后续严格限制单张原图保留兼容路径
- 新增 `apps/web/src/data/draw-creation-modes.spec.ts`，覆盖模式顺序、模式识别、参考图必填和提示词校验
- 全量验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、API 26 个文件 110 项、Web 19 个文件 84 项
- `node outputs/ui-reference/verify-draw-modes.mjs`、`verify-draw-navigation.mjs`、`verify-newdraw-templates.mjs` 和 `verify-draw.mjs` 通过；桌面端 `1440x1000` 与移动端 `390x844` 无脚本错误或横向溢出
- 本地验收截图：`outputs/ui-reference/draw-modes-desktop.png`、`outputs/ui-reference/draw-modes-mobile.png`

## 12. 2026-10-18 智能体流式异常关闭收口

- 修复智能体流式请求在收到 `onDone` 或 `onError` 前意外关闭连接时，助手消息可能长期停留在 `STREAMING` 的问题
- 未完成的消息现在会保留已有正文，缺失正文时补充“生成连接意外中断，请重试”，并标记为 `FAILED`
- 会话状态和错误提示同步收口，避免用户看到永久加载状态
- 新增 `agent-workspace` 回归测试，覆盖连接提前结束但未触发完成事件的场景
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 全量测试为 API 26 个文件 110 项、Web 19 个文件 85 项

## 13. 2026-10-18 模型对话首页垂直节奏精修

- 根据参考产品实时截图重新测量模型对话首页的工具栏、欢迎标题、输入框、能力入口、示例提示词和图表区位置
- 工具栏高度从 62px 调整为 80px，模型选择器前置到工具栏左侧，历史记录按钮移至其后，减少与参考产品的布局偏移
- 欢迎区整体下移并将输入框高度扩展到参考产品接近的 174px，恢复较大的输入空间和底部按钮位置
- 示例提示词卡片高度收紧到 91px，图表标题和图表网格间距重新校准，使首屏内容密度更接近参考产品
- 桌面端 `1440x1000` 测量结果：输入框 `y=371`、能力入口 `y=571`、示例卡片 `y=661`、图表标题 `y=780`、图表网格 `y=805`
- 移动端 `390x844` 保持单列/双列布局，无横向溢出或页面脚本错误
- 验证通过：`pnpm format:check`、`@aurora/web` 类型检查、相关 12 项前端测试

## 14. 2026-10-18 会话详情正文宽度与智能体会话密度收口

- 将模型对话和超级智能体的消息正文最大宽度统一为 `820px`，与底部输入区的宽度基准一致，减少参考产品截图中正文和输入框左右边界明显错位的问题
- 超级智能体会话列表头像从 `34px` 调整为 `40px`，同步增加条目内边距和圆角，使左侧会话卡片的密度更接近参考产品
- 桌面端 `1440x1000` 验收中，模型对话助手正文左边界由 `414px` 调整到 `474px`，正文宽度由 `896px` 收窄到 `776px`
- 智能体详情操作验收通过，用户消息、助手正文、积分提示和消息操作栏保持正常；移动端 `390x844` 无横向溢出或页面脚本错误
- 验证通过：`@aurora/web` 类型检查、`verify-agent-detail-actions.mjs`、`verify-chat-message-layout.mjs`

## 15. 2026-10-19 AI 绘画生成台参数区对齐

- 对照参考产品生成态截图，把 `/draw?view=generate` 参数面板的模型区从“全量平铺”改为“先展示 6 个 + 加载更多”，与参考产品“加载更多生图模型 (n/m)”的展示方式一致
- 模型网格默认保留当前已选模型，展开后才显示全量；模型数量未超过阈值时不渲染该按钮
- 提交区改为固定底栏容器，把“本次消耗 N 积分 · 余额 M”积分条放在 `立即生成` 按钮正上方，位置与参考产品的积分徽标一致
- 修复积分条直接写成 sticky 按钮的同级兄弟节点时被固定按钮覆盖的问题（原测量 `cost.y=961`、`button.y=934`，现为 `cost.y=918`、`button.y=934`，不再重叠）
- 桌面端 `1440x1000` 与移动端 `390x844` 无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`@aurora/web` 类型检查、`pnpm test`（API 26 个文件 110 项、Web 19 个文件 85 项）、`pnpm build`
- 绘画相关浏览器验收通过：`verify-draw.mjs`、`verify-draw-completion.mjs`、`verify-draw-editor.mjs`、`verify-draw-navigation.mjs`、`verify-newdraw-templates.mjs`、`verify-draw-modes.mjs`
- 本轮只使用 Mock 路由验收，未读取、输出或调用任何真实 Key

## 17. 2026-10-19 智能修图空态示例条对齐

- 对照参考产品智能修图空态截图，把画布中央的“修图示例”条从深色裸图改为参考产品式浅色卡框：白底、紫色描边和紫色外发光，四张示例图并排放在同一张卡内
- 示例标签改为图片顶部居中的彩色小标签，按顺序使用品红、蓝色、橙色和紫色，与参考产品四种能力的标签配色一致
- 示例图高度由 `172px` 收到 `132px`，示例条容器宽度放宽到 `440px`，四宫格比例更接近参考产品的横向长条
- 单张示例不再各自带边框和深色底，改为整条卡框统一承载，悬停时只做轻微提亮和上浮，避免与卡框描边冲突
- 修正空态副标题错别字：「动动嘴，一部 P 图」改为「动动嘴，一键 P 图」
- 新增空态验收截图：`verify-retouch-history.mjs` 在点击示例前额外产出 `retouch-empty-desktop.png` 与 `retouch-empty-mobile.png`
- 桌面端 `1440x1000` 与移动端 `390x844` 无横向溢出、无页面脚本错误，撤销/恢复初始禁用状态保持正确
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 19 个文件 85 项）、`pnpm build`
- 本轮只使用 Mock 路由验收，未读取、输出或调用任何真实 Key

## 18. 2026-10-19 图片生成提交按钮积分角标对齐

- 对照参考产品图片生成底部创作条，`N 积分` 是压在“立即生成”按钮右上角的小徽标，而不是按钮内的独立一行
- 原实现把 `<small>` 作为提交按钮 Grid 的一整行（`grid-column: 1 / -1`），会把按钮撑高并让图标、文案和积分散成上下三块
- 现在给按钮加 `position: relative`，把积分标签改为绝对定位的 `.generation-composer__cost`：`top: 5px; right: 6px`，白底 20% 透明胶囊、`999px` 圆角、`8px` 字号和 `inset` 描边，按钮恢复图标加文案的单行居中
- `verify-image-workbench-detail.mjs` 增加 `costVisible` 与 `costInsideSubmit` 两个断言，确认角标可见且 `getBoundingClientRect` 完全落在提交按钮范围内
- 桌面端 `1440x1000` 实测 `costInsideSubmit: true`、`scrollWidth === clientWidth === 1440`；移动端 `390x844` 实测 `costInsideSubmit: true`、`scrollWidth === clientWidth === 390`，均无横向溢出和页面脚本错误
- 同一脚本的展开态与智能修图分支同样通过：高级设置展开后 6 个示例可见，修图区 6 个操作项标签无截断
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 19 个文件 85 项）、`pnpm build`
- 图片生成与图片详情浏览器验收通过：`verify-image-generation.mjs`、`verify-image-workbench-detail.mjs`
- 本轮只使用 Mock 路由验收，未读取、输出或调用任何真实 Key

## 16. 2026-10-19 超级智能体会话页正文列宽与输入区对齐

- 用像素测量重新校准参考产品超级智能体会话页：参考截图宽 `1756px`，左侧主边栏边框在 `x=322`，与本地 `320px` 边栏同一缩放比例，说明此前的 `700px` 正文列宽估计偏窄
- 参考产品输入框实测跨度为 `x=661..1428`，宽度 `767px`；本地在相同视口宽度下原为 `x=688..1387`，宽度 `700px`，确认正文列应加宽
- 超级智能体详情页欢迎区、消息列表、单条消息正文和底部输入区的最大宽度由 `700px` 统一调整为 `768px`，用户气泡上限由 `616px` 调整为 `640px`
- 调整后同视口实测为 `x=654..1421`、宽度 `767px`，与参考产品一致；左右偏移差 `7px` 来自边栏边框像素差，属可接受范围
- 底部输入区新增参考产品式“积分消耗规则”胶囊按钮，点击展开与消息内一致的规则说明；发送按钮从贴左改为贴右下，与参考产品一致
- 输入框占位文案改为通用需求描述，不再拼接智能体预置问题
- 会话历史抽屉宽度保持 `280px`，与参考产品历史截图一致
- 验收脚本 `verify-agent-detail-actions.mjs` 增加可选 `VERIFY_REFERENCE_VIEWPORT=1`，可在 `1756x859` 参考视口下额外产出 `agent-detail-actions-reference.png` 用于对齐核查
- 桌面端 `1440x1000`、参考视口 `1756x859` 和移动端 `390x844` 均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 19 个文件 85 项）、`pnpm build`
- 本轮只使用 Mock 路由验收，未读取、输出或调用任何真实 Key

## 19. 2026-10-19 参考产品未开发模块占位导航

- 对照参考产品主侧栏，将尚无首批实现计划的模块先保留为可点击占位入口：股票分析、AI配音2.0、图片处理、AI教育、免费工具、3D建模、超级AI搜索和论文助手
- 首批模块顺序进一步贴近参考产品：模型对话、AI绘画、超级智能体、智能修图、图片生成、股票分析、AI配音2.0、AI画布、图片处理、电商工具、AI教育、免费工具、3D建模、视频生成、Sound音乐；文档处理、工具地图、全部工具、超级AI搜索和论文助手继续归入创作与办公分组
- 前端回退目录、API 默认模块配置、占位视图配置、路由元数据和全局搜索别名同步补齐，后台仍可通过模块管理覆盖名称、说明、图标、封面、分组、路由、排序、角标和显隐
- `AI 音乐` 的展示名称改为参考产品式 `Sound音乐`，占位页标题统一为 `Sound 音乐`
- `verify-m2-routes.mjs` 扩展为覆盖 18 个路由；桌面端 `1440x1000` 与移动端 `390x844` 均确认路由可加载、侧栏激活态正确、无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`；全量测试为 API 26 个文件 110 项、Web 19 个文件 85 项
- 本轮只使用 Mock 路由验收，不读取、输出或调用任何真实 Key

## 20. 2026-10-19 中文输入法组合输入防误提交

- 新增共享键盘工具 `apps/web/src/utils/keyboard.ts`，统一判断输入法组合输入状态：优先读取标准 `KeyboardEvent.isComposing`，并兼容部分中文输入法仍使用的 `keyCode === 229`
- 将该判断接入 `ChatComposer` 的 `Ctrl/Cmd + Enter` 发送、超级智能体详情输入框、智能体创建预览、图片生成页、智能修图页、AI 绘画页和 AI 画布创作/灵感快捷键
- 中文候选词组合期间按 Enter 现在只确认候选词，不会提前发送消息或提交任务；组合结束后正常 Enter 行为保持不变
- 新增 `keyboard.spec.ts`，覆盖标准组合标记、旧版 `keyCode 229` 和组合结束后的普通 Enter
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只使用本地测试，不读取、输出或调用任何真实 Key

## 21. 2026-10-19 超级智能体首页创建双卡与参考产品首屏结构

- 对照参考产品超级智能体首页，把只有「HI，我是 Agent 助手」的单层欢迎区升级为「超级智能体，创建你的 APP 或助手」标题、能力说明和两张创建入口卡
- 第一张“创建智能体”卡加入提示词窗口预览、自定义界面/多模型选择说明和“立即创建”按钮，点击进入现有 `/agents/create` 创建器
- 第二张“创建多智能体蜂群”卡加入开始、规划、执行、汇总节点示意图和禁用的“敬请期待”状态，为后续多智能体编排保留明确的视觉入口
- 原有写作、PPT、设计、Excel、网页任务按钮、快捷创作框、探索/报告/文档等场景标签、推荐模板、历史抽屉和目录流程全部保留，避免视觉重构削减现有功能
- 桌面端 `1440x1000` 与移动端 `390x844` 重新生成智能体首页截图；两张能力卡、创建入口、禁用态、历史记录和推荐卡片均通过浏览器断言，无横向溢出或页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`，以及 `verify-agent-home.mjs` 桌面端 `1440x1000` 与移动端 `390x844` 复跑
- 本轮只使用本地 Mock 与本地服务，不读取、输出或调用任何真实 Key

## 22. 2026-10-19 本地开发代理指向与模型对话首页细节

- 本地 `pnpm dev:web` 默认把 `/api` 代理到 `http://127.0.0.1:3001`，但该端口上运行的是 10/17 的旧 API 构建，`/api/v1/agents` 返回 404，前端拿不到智能体等新接口
- 为不停止任何已有进程，改用 `pnpm --filter @aurora/api build` 重新构建当前分支，并另起一个本地 API 实例（`API_PORT=3006`）承载最新路由
- `apps/web/vite.config.ts` 改为通过 `loadEnv` 读取 `WEB_API_PROXY_TARGET`，默认值仍是 `http://127.0.0.1:3001`；本机用被 `.gitignore` 忽略的 `apps/web/.env.local` 指向 3006，仓库默认行为不变
- 验证：5173 上 `/api/v1/modules/display` 返回 200（3001 为 404，3006 为 200），`/api/v1/agents` 由 404 变为正常的鉴权响应；`verify-m2-routes.mjs` 复跑 18 条路由，桌面端 `1440x1000` 与移动端 `390x844` 全部无横向溢出、无页面脚本错误
- 模型对话首页按参考产品首屏补细节：欢迎标题加入招手表情与句末闪烁光标（`prefers-reduced-motion` 下停用动画），`模型对话` 标签右上角补红色 `New` 徽标，`GroupChatView` 的模式切换器同步对齐
- 新增 `verify-chat-home-polish.mjs`，断言问候语、招手表情、光标尺寸与动画、`New` 徽标文本与位置、横向溢出和页面脚本错误；桌面端与移动端全部通过
- 本轮只使用本地服务与 Mock，不读取、输出或调用任何真实 Key

## 23. 2026-10-19 智能体真实流式对话浏览器验收与绘画上传位对齐

- 智能体流式链路此前只有 Store 单测覆盖（真实流、错误、中断、异常断流、重放、重新生成共 7 项），缺少页面级端到端验证；本轮补上 `outputs/ui-reference/verify-agent-streaming.mjs`
- 脚本用 `page.route` 拦截 `POST /api/v1/chat/stream`，按 `meta` → `delta` × N → `done` 的事件序列构造 SSE 响应，首帧前故意延迟 600ms，用于观察乐观更新
- 正常链路断言：用户消息与助手占位消息立即出现、“正在生成”状态生效、输入框在流式期间禁用；`delta` 累积成完整正文；`done` 后状态回到“服务就绪”、输入框恢复、积分提示为“本次任务共消耗 1 积分”；请求体带上智能体 `systemPrompt`（含智能体名）
- 错误链路断言：服务端 `error`（`refunded: true`）写入助手消息正文与页面错误条，状态回到“服务就绪”
- 停止链路断言：生成中点击停止按钮，`AbortController` 中断请求，助手消息落为“生成已中断”，页面提示“生成已中断，本次积分已退回”
- 会话切换断言：新建对话后从历史记录切回原会话，完整回答仍在；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误
- 参考产品 AI 绘画首页的上传位比本地更大（约 `68×87px` 对 `54×62px`）；把 `.draw-composer__upload` 与 `.draw-composer__reference` 调整为 `66×84px`、圆角 `9px`，图标换成 `UploadOutlined` 并放大到 `18px`，移动端断点同步为 `54×68px`
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 绘画相关浏览器验收复跑通过：`verify-draw-modes.mjs`、`verify-draw-navigation.mjs`、`verify-draw.mjs`
- 本轮只使用 Mock SSE 与本地服务，未读取、输出或调用任何真实 Key，未消耗参考产品积分，未调用真实视频生成

## 24. 2026-10-19 超级智能体首页资源库提到首屏

- 对照参考产品 `outputs/ui-reference/live-reference/agents.png`，参考产品的超级智能体落地页顺序是：标题 + 两张创建卡 → 资源库工具条（官方智能体 / 我创建的 / 我收藏的 + 搜索框 + 热门搜索）→ 左侧分类计数 + 右侧智能体卡片网格
- 本地此前把资源库折叠在“全部智能体”按钮后面，首屏只能看到模板推荐网格；`catalogOpen` 默认值由 `false` 改为 `true`，资源库无需额外点击即可看到
- 用 flex `order` 重排 `.agents-catalog-page` 的子区块：创建区 `1`、资源库 `2`、快速开始 `3`、模板推荐 `4`、底部提示 `5`；为避免把“快速开始”留在首屏，把 `.agent-home` 拆成创建区与 `.agent-home--quickstart` 两段，标题、创建卡和历史记录按钮留在创建区
- 保留能力：快捷创作框、场景标签（探索 / 做报告 / 写文案 / …）、模板推荐卡“做同款”、智能体历史记录抽屉、分类筛选、热门搜索、分页（24 条/页，6358 条目录）全部未删减，只是渲染顺序后移
- 参考产品卡片包含头像、`AI 助手` 标记、星级评分、收藏数、简介和标签，本地卡片结构已具备同样字段，本轮未改动卡片内部结构
- 浏览器验收：`verify-agent-home.mjs` 桌面端 `1440x1000` 与移动端 `390x844` 通过（两张创建卡、`立即创建`、蜂群禁用态、历史抽屉分组与条目、模板推荐首卡与卡片数）
- 全量路由验收：`verify-m2-routes.mjs` 覆盖 18 条路由，桌面端与移动端均无横向溢出、无页面脚本错误、侧栏激活态正确
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只读取本地代码与本地页面，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 25. 2026-10-19 AI 绘画首页提示语与信息顺序对齐

- 对照 `outputs/ui-reference/live-reference/draw.png` 的首屏，参考产品在大创作卡下方先显示「当前模型：…」一行居中说明，再是四个创作模式胶囊（文生图 / 参考图重绘 / 局部编辑 / 商品图处理）；本地此前顺序相反
- 把 `.draw-composer__model-note` 移到 `.draw-composer__presets` 之前，并加 `text-align: center`；字号 `8px` → `10px`、颜色 `#9aa2ae` → `#8d96a3`，与参考产品说明行的可读度接近
- 文生图输入占位文案由「描述希望生成的画面，例如：春日樱花树下的橘猫…」改为参考产品原句「描述画面，可 Ctrl+V 粘贴图片或拖拽上传」，落在 `data/draw-creation-modes.ts` 的 `promptPlaceholder`；本地没有 `@ 引用图片` 能力，因此未把该提示写进占位文案
- 参考图重绘、局部编辑、商品图处理三种模式保留各自的引导式占位文案，避免丢失模式专属输入提示
- 浏览器验收复跑：`verify-draw.mjs`（mock 生成全流程）、`verify-draw-modes.mjs`（四种模式切换与校验）、`verify-draw-navigation.mjs`（二级导航与工具分组）、`verify-newdraw-templates.mjs`（模板视图 17 → 4 张卡）桌面端 `1440x1000` 与移动端 `390x844` 全部通过，无横向溢出
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只改动本地文案与样式，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 26. 2026-10-19 智能修图头部顺序对齐

- 对照 `outputs/ui-reference/live-reference/retouch.png` 与本地 `outputs/ui-reference/modules/retouch-desktop.png`，参考产品的「我的创作（0 张图片）」和「返回旧版」按钮从画布左上依次排列，本地此前使用 `space-between` 把返回按钮推到了另一侧
- 将 `apps/web/src/views/ImageToolWorkbenchView.vue` 的 `.retouch-canvas__header` 改为 `justify-content: flex-start`，保留 `18px` 间距；画布主体、示例条、右侧新建项目区和底部工具栏不变
- 自动截图会话已回收，`retouch/desktop` 与 `retouch/mobile` 均显示 `clientWidth === scrollWidth`，页面错误为 `[]`
- 浏览器验收：`verify-retouch-history.mjs` 桌面端 `1440x1000` 与移动端 `390x844` 均通过，缩放 `110%`、撤销可用、重做禁用、无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只调整本地样式，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 27. 2026-10-19 图片生成首页标题与示例卡比例对齐

- 对照 `outputs/ui-reference/live-reference/image-generation.png`，参考产品左上角是单行「边界AI平台 智能生图」加铅笔图标，本地此前使用「AI PLATFORM」眉题、独立图标块和「智能生图」两层排版，视觉结构明显不同
- 将标题改为单行 `极光 AI 平台 智能生图`，保留品牌语义并补上参考产品式铅笔图标；右上角「旧文生图」补金色星标，「新版修图」补绿色修图图标
- 通过参考截图测量，参考产品示例卡约 `364×339px`，其中预览区约 `251px`；本地卡片此前约 `304px`，预览区只有 `217px`。将 `.generation-showcase-card__visual` 的宽高比由 `16:8.55` 改为 `16:11`，卡片总高度回到约 `338px`
- 桌面端与移动端重新截取 `outputs/ui-reference/modules/image-generation-{desktop,mobile}.png`；移动端仍保持单列卡片和底部创作条，无横向溢出
- 专项验收：`verify-image-generation.mjs` 桌面端 `1440x1000` 与移动端 `390x844` 均通过（4 张首屏可用模板、按钮无溢出、无横向溢出）；`verify-image-workbench-detail.mjs` 更新为校验单行标题、铅笔图标、右上角入口、7 个设置控件、积分角标和 6 张效果示例，桌面与移动端全部通过
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只读取本地代码、本地页面和参考截图，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 28. 2026-10-19 视频工作台顶部导航与模式网格对齐

- 对照参考视频截图的独立窗口布局，参考产品顶栏使用 `AI视频 / AI绘画 / 超级对话 / AI音乐` 四个短标签；本地此前在“视频”和“绘画”等词语中保留了多余空格
- `VideoStudioView.vue` 顶栏文案改为参考产品原始标签，导航字号由 `11px` 提到 `12px`、左右内边距由 `12px` 收到 `10px`，保持 `34px` 点击高度不变
- 创作模式网格由三列改为两列，移动端断点同步保持两列，更接近参考产品参数面板中两列模式入口的排布
- 现有 `60px` 顶栏、`80px` 模型轨道、`400px` 参数面板、独立滚动作品区和响应式作品网格均保持不变
- Mock 浏览器验收通过：`verify-video-preview.mjs`、`verify-video-tasks.mjs`、`verify-video-capabilities.mjs`、`verify-video-studio.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮未读取、输出或调用任何真实 Key，未消耗参考产品积分，未调用真实视频生成

## 29. 2026-10-19 AI 画布默认状态与节点调整视角对齐

- 对照参考产品 AI 画布截图，右侧灵感画板不是默认展开区域，画布首屏应保留完整黑色工作区；本地此前默认展开，首屏可用宽度明显不足
- 将 `inspirationOpen` 默认值改为 `false`，保留右下角灯泡按钮「打开灵感画板」，点击后再进入现有的灵感对话、最近创作和素材入口
- 节点工具栏的「调整视角」此前调用 `resetViewport()`，与参考产品点击后弹出「3D 视角控制」的行为不符；现改为调用 `openAngleDialog(node)`，并只在 `image` / `output` 节点显示
- 原有从节点生成菜单中的「调整角度」入口继续保留，两条路径共用现有旋转、俯仰、3D 预览和生成新视角逻辑
- `verify-canvas-studio.mjs` 更新为：先断言首屏默认关闭并截图，再点击灯泡打开检查灵感画板；选中图片节点后点击工具栏「调整视角」，断言 3D 窗口打开并可用 `Escape` 关闭；后续节点生成菜单、文本生成、批量面板、右键菜单、云端恢复和移动端流程继续通过
- 浏览器验收：`node outputs/ui-reference/verify-canvas-studio.mjs` 桌面端 `1440x1000`、移动端 `390x844` 与云端失败回退场景全部通过，无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 30. 2026-10-19 电商工具四栏比例与效果区对齐

- 对照 `C:\Users\Administrator\Desktop\参考产品截图合集\参考产品中点击电商工具的主界面.png`，用像素扫描测出参考产品主内容区在 `1440` 视口下约 `1160px`，四栏实际宽度约 `235 / 216 / 458 / 221px`；本地为 `245 / 215 / 385 / 285px`，预览栏偏窄、介绍栏偏宽
- 将 `CommerceWorkbenchView.vue` 的 `.commerce-workbench__body` 由 `0.95 / 0.78 / 1.62 / 1.08` 权重改为 `245 / 228 / 462 / 242` 权重，实测本地四栏回到 `235 / 219 / 444 / 232px`；`1180px` 断点后移到 `1100px`，`1440` 视口不再提前退回三栏
- 效果展示区空态此前渲染 `GalleryArtwork` 抽象插画，与参考产品的真实商品示例图不符；现改为默认显示 `/showcase/product-v1.png`，并抽出 `resolvePreviewImage` 统一处理“已上传素材 / 示例图”的回退顺序，避免替换类工具在 before/after 之间显示错误素材
- 预览画布高度由 `470px` 提到 `535px`、`BEFORE/AFTER` 字号提到 `18px`；台账搜索框高度提到 `34px`、分组与条目字号提到 `12px`、面板标题提到 `14px`，分组图标统一成参考产品的灰阶样式
- 新增调试脚本 `outputs/ui-reference/measure-commerce.mjs`（ignored 目录），用于输出四栏 `getBoundingClientRect` 与当前截图，方便后续继续用像素对照而不是凭感觉调样式
- 浏览器验收：`node outputs/ui-reference/verify-commerce-studio.mjs` 桌面端 `1440x1000` 与移动端 `390x844` 全部通过，空态、目录展开、搜索、上传、替换/材质/部件任务体、历史记录、帮助抽屉和建议箱断言保持一致，无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 31. 2026-10-19 电商工具说明栏与上传文案对齐

- 对照 `C:\Users\Administrator\Desktop\参考产品截图合集\参考产品电商工具点击左边工具中服饰图案替换设计师的界面.png` 与 `参考产品电商工具点击左边工具中智能背景融合的界面.png`，参考产品在两个工具页面右侧显示的是同一套通用说明，而不是按工具拆分的专属步骤
- `CommerceWorkbenchView.vue` 的 `toolSteps`、`toolTips` 统一为参考产品文案：四步流程为“上传包含原商品的图片 / 上传要替换的新商品图片 / 选择替换模式和融合强度 / 点击开始处理，等待 AI 完成替换”，三条技巧为“确保原图和替换商品的角度相似 / 建议使用分辨率高的图片获得更好效果 / 光线条件相近的图片替换效果更佳”
- 各上传位统一使用“点击或拖拽上传，支持 JPG、JPEG、PNG、WebP，≤ 10MB”辅助说明，保留现有上传、拖拽、预览、移除和文件校验逻辑不变
- 浏览器验收复跑：`node outputs/ui-reference/verify-commerce-studio.mjs` 与 `node outputs/ui-reference/measure-commerce.mjs` 均通过；桌面端 `1440x1000` 与移动端 `390x844` 无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 32. 2026-10-19 AI 绘画去视频、参考对照复核与全量回归

- 恢复工作前先检查用户目录：`本地密钥目录\说明文件.txt` 仍是 `2026-10-17 18:51`、`ActionsNEW*.png` 最新仍是 `ActionsNEW5.png`、`当前页面截图` 最新仍是 `2026-10-15`、`参考产品截图合集` 最新是 `2026-10-17 17:08` 的 AI 画布系列；本轮没有出现比上次更新的说明或截图，因此按既定顺序继续推进
- 提交并推送 `32bd95e style: remove video actions from draw studio`（`main`，普通 `git push`，未使用强推）。首次推送遇到 `Connection was reset`，重试后成功
- 用 `node outputs/ui-reference/capture-modules.mjs` 重新抓取 8 个模块的桌面端与移动端截图，`chat/desktop` 与 `chat/mobile` 的 `clientWidth === scrollWidth` 保持成立
- 新增 `outputs/ui-reference/measure-agents.mjs`（ignored 目录）用于输出智能体首页关键元素矩形，方便后续继续用测量而不是感觉调样式。实测智能体首页 hero 卡片为 `x=268..1412`（宽 `1144`、高 `234`），与参考产品 `live-reference/agents.png` 测得的 `272..1425` 基本重合，标题居中于 `502..1179`，因此本轮不再改动该区域
- 复核 `live-reference/chat.png`、`draw.png`、`retouch.png` 与本地截图：模型对话首页的欢迎语两行结构、`模型对话/超级对话` 模式徽标位置、示例提示词四卡与支持图表类型网格、AI 绘画首页的次级边栏与顶部下拉、修图页的空态示例条与右侧工具条均与参考产品同构。为避免无依据的样式改动，本轮只记录结论、不做像素级重排
- 复核 CI 与迁移一致性：`.github/workflows/ci.yml` 的步骤与本地 `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 一一对应且全部通过；检查最近三条 `module_display_configs` 相关迁移（`subtitle` 加列、回填、`chat` 路由归一），确认所引用的 `key`、`route`、`subtitle` 列都来自 `20261017193000_add_module_display_configs` 建表迁移，不存在悬挂引用
- 全量浏览器回归：18 个 Playwright 脚本全部通过，分别是智能体 4 个（`verify-agent-streaming`、`verify-agent-home`、`verify-agent-detail-actions`、`verify-agent-create`）、模型对话 4 个（`verify-chat-m1`、`verify-chat-home-polish`、`verify-chat-message-layout`、`verify-chat-markdown`）、AI 绘画 3 个（`verify-draw-navigation`、`verify-draw-editor`、`verify-draw-modes`）、图片 2 个（`verify-image-generation`、`verify-image-workbench-detail`）、智能修图 1 个（`verify-retouch-history`）、视频 2 个（`verify-video-studio`、`verify-video-tasks`）、AI 画布 1 个（`verify-canvas-studio`）、电商工具 1 个（`verify-commerce-studio`），桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 待用户侧配合：当前 `3006` 端口的 API 未配置真实 LLM Key，日志里 `POST /api/v1/chat/stream` 仍以 `LLM_NOT_CONFIGURED` 结束，因此“真实 Provider 流式对话”的端到端联调无法在本轮完成。按约定，配置 `.env` 与读取 `本地密钥目录` 下的 Key 属于需先说明的操作，本轮没有执行
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分

## 33. 2026-10-19 真实 Provider 流式对话服务端 E2E

- 新增 `apps/api/test/chat-stream-provider.e2e-spec.ts`，覆盖从 `AppModule`、`ChatController`、`ChatService` 到 `OpenAiCompatibleProvider` 的真实 Nest/HTTP/SSE 链路
- 测试在进程内启动 OpenAI-compatible HTTP stub，通过 SSE 分段返回内容；Stub Provider 与 Model 配置写入临时测试数据并在 `afterAll` 清理，不读取、输出或调用 `本地密钥目录` 中的真实 Key
- 正常链路覆盖：首个 delta 在流结束前到达、跨 TCP 分片解析、正文拼接、assistant 消息持久化、积分结算，以及上游请求中的 `model`、`temperature`、`reasoning_effort`、`stream` 和 `Authorization`
- 异常链路覆盖：上游 `401` 映射为 `LLM_AUTH_ERROR`、仅返回 `reasoning_content` 映射为 `LLM_EMPTY_RESPONSE`、上游挂起映射为 `LLM_TIMEOUT`；三种失败均验证 assistant 消息落到失败态且积分退回
- 专项测试 5 项通过；API 全量 27 个文件 115 项、Web 全量 20 个文件 89 项通过，`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过；构建仅保留既有 Vite 大 chunk 提示
- 本轮只使用本地 stub 与 Mock，不读取、输出或记录任何 Key/Token/Cookie，不调用真实第三方接口，不消耗参考产品积分，不调用真实视频生成

## 34. 2026-10-19 智能体消息操作顺序与空输入提交态验收

- 对照超级智能体详情页参考截图，把 assistant 消息下方操作栏从“复制 / 继续追问 / 重新生成 / 有帮助 / 需改进”调整为参考产品顺序“复制 / 有帮助 / 需改进 / 重新生成 / 继续追问”
- `AgentDetailView.vue` 五个操作按钮补充 `data-action`，输入区提交按钮补充 `data-action="submit"`；页面行为未改，继续复用复制、反馈、重新生成、继续追问与流式停止逻辑
- `verify-agent-detail-actions.mjs` 增加回归断言：操作顺序必须为 `copy,like,dislike,regenerate,continue`，空输入时提交按钮必须禁用
- 浏览器验收通过：桌面端侧栏 `320px`、消息列与输入区 `768px`，移动端输入区 `366px`、消息列 `362px`，两端均无横向溢出、无页面脚本错误；复制、有帮助、重新生成、继续追问、流式生成与错误/停止链路正常
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 50. 2026-10-20 模型交接文档汇总

- 为准备切换模型，重写 `docs/AI_HANDOFF.md`，记录 M0-M3、六个优先工具、AI 画布、电商工具、运行时模型配置和最新画布图生图修复。
- 同步更新 `docs/PROJECT_CONTEXT.md` 的当前阶段，移除旧的 `feature/m1-vertical-slice` 与 M1 首切描述。
- 更新 `docs/MODEL_CONTINUITY.md` 和 `README.md` 的必读顺序，加入当前交接文档及 M1/M2/M3 工作日志。
- 本轮只改文档，不修改业务代码、不读取或记录 Key、不调用真实第三方接口。

## 49. 2026-10-19 画布「节点 → 指令 → 图生图」链路修复

- 定位用户「点击图像生成一直停在待处理 / 正在同步画布结果」的真实原因：`prepareImageNodeGeneration()` 生成的目标节点状态是 `idle`，模板里落到最后的兜底分支，于是显示成同步中；同时前端会把空字符串 `sourceFileId` 提交给 `POST /api/v1/image-tasks`，后端直接写外键列触发 `P2003 image_tasks_sourceFileId_fkey`，前端只看到 `Internal server error`
- 后端 `image-tasks.service.ts` 与 `video-tasks.service.ts` 统一把空白 `sourceFileId`（含 `lastFrameFileId`、`referenceVideoFileId`）归一化为 `undefined`，缺少来源图时按文生图处理；外键错误转换为明确的 `409`，来源文件查不到时返回 `404 FILE_NOT_FOUND`，不再抛出 500
- `CanvasStudioView.vue` 的 `nodeSourceFileId()` 不再把空字符串当作有效素材，并可从关联作品结果回退取 `resultFileId`；`submitComposer()` 在缺少素材时直接给出可读提示，提交异常也会落回提示而不是静默失败
- 新增「等待指令」节点态：从图片节点发起「图像生成」后创建的节点标题为「图生图」，节点内显示来源说明与「填写描述」按钮，不再显示「正在同步画布结果」；只有真正 `queued/generating` 的节点才走同步中样式
- 创作输入区改为吸附在目标节点下方：新增 `composerAnchorNode`/`composerAnchorStyle` 计算属性，按 `viewport` 与应用 `scale` 把输入区居中放在节点下方 18px，并做工作区边界收敛；输入框 placeholder 变为「描述你想生成的内容，例如：让图中男女位置对调...」，点击「图像生成」后自动聚焦
- 图片节点的 `prompt` 通常就是文件名，改为不再预填到输入区（只有基于生成结果继续创作时才继承上一轮指令），避免用户必须先删掉文件名
- 新增 `outputs/runtime/qa-canvas-check.mjs`：无头 Edge + CDP 上传素材、点击节点「+」、选择「图像生成」、断言节点态与输入区位置，可选 `--submit` 做真实图生图回归；输出 `outputs/ui-reference/canvas-node-awaiting-instruction.png`、`canvas-node-submitted.png`、`canvas-node-result.png`
- 浏览器与真实链路验收：节点态 `图生图 | 在下方输入修改描述后开始生成 | 填写描述`、`composerAnchored: true`、`composerGapBelowNode: 18`、`stillSyncing: false`；提交「让图中男女位置对调」后节点状态由「生成中」变为「已完成」并渲染出结果图
- 顺带修复 `apps/api/test/files-image-tasks.e2e-spec.ts` 在 `lastImageInput = undefined` 之后被 TS 收窄为 `undefined` 导致 `pnpm typecheck` 失败的问题
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 116 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面、桌面已有参考截图与本地 Key 注入后的自建 API，未读取、输出或记录任何 Key/Token/Cookie，未访问参考产品、未消耗参考产品积分，未调用真实视频生成

## 35. 2026-10-19 超级智能体历史记录抽屉密度对齐

- 对照用户提供的参考产品历史抽屉截图，参考面板顶部是关闭图标在左、智能体头像和名称在右；本地此前把头像和名称放在左侧，关闭按钮推到最右
- `AgentDetailView.vue` 调整抽屉头部顺序，同时把历史条目恢复成参考产品式单行标题，移除每条会话下方的消息数和时间副信息
- 历史条目样式改为浅灰背景、`#e9ebef` 细边框、`6px` 圆角和约 `34px` 行高；分组标题“今天 / 昨天 / 最近 7 天”保持轻量小标题，悬停和选中仅做蓝色描边与浅蓝底
- `verify-agent-detail-actions.mjs` 新增历史抽屉状态断言：关闭按钮必须位于智能体头像左侧、首个条目高度在 `32–38px`、条目内不得出现旧副信息，并输出 `agent-detail-history-desktop.png` 供后续对照
- 浏览器验收通过：桌面端 `1440x1000` 抽屉宽度保持 `280px`，消息列和输入区仍为 `768px`；移动端 `390x844` 输入区 `366px`，两端均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 36. 2026-10-19 超级智能体历史记录抽屉宽度复核

- 重新核对参考截图 `在超级智能体里随便点了一个对话后的页面再点历史记录后的页面.png`：视口宽 `1799px`，右侧抽屉左边缘约 `1553px`，实际宽度约 `246px`；本地此前 `280px` 偏宽约 `34px`
- `AgentDetailView.vue` 将 `.agent-history-panel` 宽度从 `min(280px, 100%)` 收紧为 `min(246px, 100%)`，头部关闭按钮、头像名称和单行历史条目保持上一轮结构
- `verify-agent-detail-actions.mjs` 的历史抽屉宽度断言同步更新为 `246px`；桌面端 `1440x1000` 与移动端 `390x844` 复跑通过，侧栏 `320px`、消息列/输入区 `768px` 和移动端 `366px` 输入区保持不变，无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 37. 2026-10-19 AI 绘画次级导航栏宽度对齐

- 重新检查用户目录：`本地密钥目录\说明文件.txt` 仍是 `2026-10-17 18:51`、`ActionsNEW*.png` 最新仍是 `ActionsNEW5.png`、`当前页面截图` 最新仍是 `2026-10-15`、`outputs/ui-reference/live-reference` 最新仍是 `2026-10-18 20:07`；没有更新的说明、截图或 Actions 反馈，因此按既定顺序继续推进
- 对参考截图 `outputs/ui-reference/live-reference/draw.png` 做像素扫描：内容起点约为 `x=240`、侧栏右边界约为 `x=453`，侧栏实际宽度约 `214px`；本地旧截图的边界约为 `x=479`，宽度约 `240px`
- `DrawStudioView.vue` 将 `.draw-studio` 的网格首列由 `240px` 收紧为 `214px`，保留折叠态 `64px` 和其余工作区逻辑不变
- `verify-draw-navigation.mjs` 增加展开状态 `214px` 宽度断言；复跑桌面端 `1440x1000` 与移动端 `390x844` 均通过，`clientWidth === scrollWidth`，无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 38. 2026-10-19 模型对话欢迎语与顶部控件校准

- 对照 `outputs/ui-reference/reference-live-chat-home.png`，模型对话欢迎语去掉本地多出的“吗？”，恢复参考产品“您好，/ 今天有什么我可以帮你的”两行原文
- 两条欢迎语之间增加 `26px` 桌面端间距；欢迎区整体上移 `22px`，标题底部间距从 `32px` 收到 `28px`，使第二行标题接近参考产品位置，同时保持创作输入框的首屏位置稳定
- 顶部模型选择器从 `180px` 调整为参考产品量级的 `210px`；模型对话 / 超级对话胶囊字号增加到 `12px`、横向内边距增加到 `21px`，移动端继续使用紧凑尺寸
- `verify-chat-home-polish.mjs` 增加欢迎语文案回归断言，防止再次出现“吗？”；桌面端打字光标、`New` 角标、移动端布局与横向溢出检查保持启用
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 39. 2026-10-19 超级智能体首页比例与资源库密度对齐

- 重新检查 `本地密钥目录\说明文件.txt`、`ActionsNEW*.png`、`当前页面截图` 和 `outputs/ui-reference/live-reference`，最新文件仍是 `2026-10-18 20:07` 的参考截图；没有新的说明、截图或 Actions 反馈，继续按既定顺序推进
- 对 `live-reference/agents.png` 做像素扫描：参考产品创建卡约从 `x=275` 开始、资源库约从 `x=271` 开始，主内容宽度约 `1136px`；本地上一轮为 `x=290`、宽度 `1100px`
- `PlatformShell.vue` 的活动横幅高度由 `74px` 收到 `56px`，与参考产品首屏顶部占位一致
- `AgentsView.vue` 将主内容宽度调整为 `1136px`、页面左右留白调整为 `32px`，隐藏入口仍保留；两张创建卡改回等宽，实测为 `272..830` 与 `850..1408`，参考产品为约 `275..833` 与 `856..1412`
- 创建卡顶端从上一版本的约 `267px` 下移到 `273px`，资源库顶端回到约 `543px`，与参考产品约 `274px` / `544px` 的纵向节奏重合
- 资源库内层改为参考产品式 `14px` 内边距、`14px` 栏间距和 `270px` 分类栏；结果区四列卡片约 `198px` 宽，列表密度不再比参考产品松散
- 智能体卡片最小高度由 `164px` 提高到 `190px`，避免参考产品相同的两行说明、评分和标签在本地被压扁
- 浏览器复核：`measure-agents.mjs` 桌面端 `1440x1000` 输出创建卡 `x=272 y=273 w=558 h=246`、资源库 `x=272 y=543 w=1136`、结果网格 `x=571 w=822`；移动端 `390x844` 无横向溢出、无页面脚本错误
- `current-agents-desktop.png` 与 `current-agents-mobile.png` 已更新到 `outputs/ui-reference/`，桌面端首屏与 `live-reference/agents.png` 的标题、创建卡、资源库和四列卡片位置基本对齐
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 40. 2026-10-19 模型对话首页控件与图表入口复核

- 对照 `outputs/ui-reference/reference-live-chat-home.png`，把模型选择器宽度由 `210px` 收紧到 `178px`，模型对话 / 超级对话胶囊横向内边距由 `21px` 收到 `14px`，使顶部控件组回到参考产品更紧凑的比例
- 图表类型入口恢复参考产品顺序：象形柱图和气泡图移到堆积柱状图之后，首屏前五项固定为「折线图 / 柱状图 / 饼图 / 散点图 / 热力图」
- 桌面端图表网格由六列改为五列，保持两行八项入口完整可见且不挤压卡片；移动端仍为四列
- 欢迎区整体上移到模型切换器附近，标题行高收到 `1.3`，去掉两行标题间多余间距；`verify-chat-home-polish.mjs` 同步把选择器宽度和欢迎语行距断言更新为当前参考范围
- 浏览器验收通过：桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误，`New` 徽标位于激活页签内，打字光标动画正常
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 41. 2026-10-19 AI 绘画电商宣传卡真实素材与独立视频入口

- 对照 `C:\Users\Administrator\Desktop\参考产品截图合集\AI绘画页面的下半部分.png`，参考产品“电商与宣传”右栏使用真实商品与视频画面，而不是抽象几何占位图
- `DrawStudioView.vue` 的 `ToolItem` 增加可选 `previewImages`、`previewVariant`、`actionLabel` 与 `actionTone`；AI 商品套图使用三张本地展示素材叠放，产品宣传视频使用单张商品图铺满预览区
- 参考产品实际两张卡的文案与按钮已对齐：第一张为 `AI 商品套图` + 描边绿色 `立即上传`，第二张为 `产品宣传视频` + 深绿实心 `生成视频`
- 移除旧的 CSS 渐变假图和 `draw-commerce-card__photo` / `draw-commerce-card__panel` 结构，替换为带白边、圆角、阴影和轻微旋转的本地图片；视频卡增加播放按钮覆盖层，移动端仍按原断点改为上下布局
- `handleCommerceTag` 改为：AI 商品套图进入商品图生成流程，产品宣传视频通过 `openVideoStudio()` 打开独立 `/video` 窗口，符合参考产品点击跳转行为
- `verify-draw-navigation.mjs` 增加电商卡断言：标签必须为 `AI 商品套图` 与 `产品宣传视频`，第一张至少三张成功加载的本地图片；点击 `生成视频` 后捕获 `/video` 新窗口
- 浏览器验收通过：桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 42. 2026-10-19 AI 绘画主内容宽度对齐参考产品

- 对照 `AI绘画页面的下半部分.png` 逐行像素测量，参考产品主内容区比本地上限更宽：五列工具卡约 `202px`、两张电商卡约 `537px`，反推内容宽度约 `1060–1120px`；本地 `.draw-main__inner` 上限 `1040px` 减去两侧 `41px` 内边距后只有 `958px`
- `.draw-main__inner` 的 `max-width` 由 `1040px` 调整为 `1200px`。在 `1513px` 视口下内容宽度约 `1118px`、电商卡约 `553px`、类型卡约 `366px`；在 `1440px` 验收视口下不再触顶，同时保持居中
- 复核 `draw-top-1513.png` 与 `draw-full-1513.png`：主内容左边界、三张类型卡与两张电商卡的比例和参考产品一致，首屏未出现横向滚动
- 回归验收通过：`verify-draw-navigation.mjs`、`verify-draw.mjs`、`verify-draw-modes.mjs`、`verify-draw-completion.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 43. 2026-10-19 超级智能体资源库宽度与卡片密度对齐参考产品

- 对照 `live-reference/agents.png`：参考产品资源库从约 `x=256` 开始、宽约 `1150px`，四列卡片约 `254px`；本地此前内容上限 `1136px`、页面左右留白各 `32px`，卡片约 `198px`，明显更窄更矮
- `AgentsView.vue` 的 `.agents-hero` / `.agents-catalog` / `.agents-callout` / `.agent-home` 内容上限由 `1136px` 调整为 `1158px`，`.agents-catalog-page` 左右内边距由 `32px` 收到 `12px`，释放被父级内容盒压住的宽度
- 资源库实测从 `x=272 w=1136` 变为 `x=261 w=1158`，四列卡片由 `198px` 拓宽到 `204px`，卡片间距约 `14px`，与参考产品 `x≈256 w≈1150`、卡片 `≈254px` 的密度一致
- `.agent-card` 最小高度由 `190px` 提高到 `232px`，头像由 `38px` 增至 `40px`，标题字号 `11px → 12.5px`，评分/使用量 `8px → 10px`，说明由两行放宽为三行并加大段间距，卡片内容不再被压扁
- 移动端断点下的最小高度同步由 `150px` 调整到 `168px`，避免三行说明在窄屏被裁切
- 回归验收通过：`verify-agent-home.mjs`、`verify-agent-create.mjs`、`measure-agents.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 44. 2026-10-19 智能修图工作台全宽比例对齐

- 对照 `outputs/ui-reference/live-reference/retouch.png`，参考产品在 `1440px` 视口下主画布约 `x=255 w=808`、右侧会话栏约 `x=1083 w=355`；本地原布局为画布 `x=260 w=790`、会话栏 `x=1070 w=350`
- `ImageToolWorkbenchView.vue` 的 `.retouch-studio` 网格右列由 `350px` 调整为 `355px`，页边距由四边 `20px` 调整为左 `15px`、右 `2px`，让主画布和会话栏分别回到 `x=255 w=808` 与 `x=1083 w=355`
- 移动端断点继续沿用原有 `14px` 页边距与单列布局，不发生桌面端比例外溢；`verify-image-workbench-detail.mjs` 桌面端 `1440x1000` 与移动端 `390x844` 全部通过，现有会话栏 `356px` 上限断言继续覆盖 `355px` 实测宽度，无横向滚动、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 45. 2026-10-19 图片生成分类栏横向比例对齐

- 对照 `outputs/ui-reference/live-reference/image-generation.png`：参考产品分类栏从约 `x=355` 开始，七个按钮宽度约 `100–136px`、高度约 `42px`；本地此前居中排列，首项从约 `x=463` 开始，按钮约 `82–125px`
- `ImageToolWorkbenchView.vue` 将 `.generation-category-filter` 改为整行左对齐，桌面端增加 `68px` 左侧起始缩进；按钮高度由 `38px` 提升到 `42px`，普通项最小宽度设为 `136px`，首项设为 `100px`
- 实测 `1440x1000` 下分类栏从 `x=355` 展开到约 `x=1325`，与参考产品首尾位置重合；样例卡仍从 `x=287`、`y=542` 开始，固定创作栏仍为 `x=267 w=1146 h=161`
- 移动端断点将分类栏恢复为无额外缩进的横向滚动，不改变原有单列卡片和底部创作区
- `capture-targets.mjs` 与 `verify-image-workbench-detail.mjs` 桌面端、移动端均通过，无横向溢出、无页面脚本错误
- 本轮只读取本地代码与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 46. 2026-10-19 视频工作台左侧模型栏对齐参考产品

- 参考产品视频页的登录弹窗遮住了参数区大半，因此先把可读的左栏放大核对：`reference-public-video.png` 与 `reference-video-layout-1800.png` 裁切后确认参考产品模型栏没有「模型」分组标题，激活项只是浅色圆角卡片，图标约 `28px` 且底很淡，模型名以约 `10px` 完整换行显示、最多两行
- `VideoStudioView.vue` 删除 `.video-model-rail__label` 节点和对应样式，并把移动端断点里对它的隐藏声明一并去掉；`--model-accent` 由内联在 `<i>` 上改为挂在按钮上，标签与图标共用同一强调色
- 图标从 `36px` 方形色块收敛到 `28px` 圆角块，改用 `color-mix` 淡底加内侧描边；标签从 `8px` 单行省略号改为 `10px` 两行换行（`-webkit-line-clamp: 2`）
- 激活项标签改为亮色强调、去掉加粗：加粗会让 `Grok Imagine Video` 在 70px 宽度里折成三行并被裁成省略号，去掉后四个模型名都能完整显示
- 工作台网格由 `80px + 400px` 调整为 `88px + 384px`，参数栏右边界从约 `x=480` 回到参考产品的约 `x=470`；`≤1180px` 断点仍按比例收缩为 `72px + 360px`
- 回归验收通过：`verify-video-studio.mjs`、`verify-video-preview.mjs`；桌面端 `1440x1000` 与移动端 `390x844` 均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`
- 本轮只读取本地代码与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 47. 2026-10-19 AI 画布交互与上传移植

- 以 `MagicalCanvas` 的节点画布操作作为行为蓝本，在 `CanvasStudioView.vue` 中按现有 Vue 架构重写交互，没有嵌入 React 子应用；设计参考与开源项目不一致时继续以参考产品的实际操作为准
- 画布支持普通滚轮平移、`Ctrl/Cmd + 滚轮`围绕鼠标缩放、空白处左键或中键拖动平移，缩放范围限定为 `25%–200%`；滚轮落在顶部栏、创作区、缩放控件或侧边面板时不会误触画布
- 节点连接点支持按住拖拽连线，拖拽时显示临时贝塞尔预览线、有效目标和无效目标反馈；点击连线可选中并显示流动虚线，按 `Delete/Backspace` 删除时优先处理已选连线，不误删节点
- 左侧加号菜单的「上传」改为直接创建画布图片节点，支持一次选择多张图片、按原图比例生成节点尺寸并立即显示本地预览；成功上传后调用现有 `workspace.uploadReference()`，节点工具栏的「上传」继续用于替换当前节点图片
- 新增 `outputs/ui-reference/verify-canvas-interactions.mjs`，覆盖多图上传、比例保持、滚轮平移、左键拖拽平移、`Ctrl + 滚轮`缩放、拖拽连线、连线选中与删除；相关截图输出到 `m2-canvas-interactions-desktop.png` 和 `m2-canvas-edge-selected.png`
- 用户已有的「分镜生成器」侧栏入口保持保留，不在本轮回退或覆盖
- 浏览器回归通过：`verify-canvas-studio.mjs` 桌面端、移动端、本地降级全部通过；`verify-canvas-interactions.mjs` 输出 `{"errors":[],"firstNodeMetrics":{"hasImage":true,"height":250,"ratio":1.44,"width":360},"metrics":{"clientWidth":1440,"scrollWidth":1440}}`
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm --filter @aurora/web test`（20 个文件 89 项）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 48. 2026-10-19 画布节点派生生文与窄屏首次视图

- 参考产品已无积分，本轮不再访问参考产品，只以本地代码、已有截图和 `MagicalCanvas` 开源实现为对照
- `CanvasStudioView.vue` 的「从该节点生成 - 文本生成」由占位改为真实链路：新增 `nodeTextModel` 优先挑选具备 `vision` 能力的对话模型，`buildNodeTextInstruction()` 把节点说明整理为「一句核心主张 + 三条备选文案 + 五个关键词标签」的指令
- `generateTextFromNode()` 会先创建 `generationMode === 'node-text'` 的提示词节点并连一条边，随后调用 `streamChat({ fileIds: [sourceFileId] })` 把源节点图片作为多模态输入，`meta/delta/done/error` 分别映射到节点状态；流式写入通过 `nodes.value` 中的响应式代理同步，直接改原始对象不会触发重渲染
- 提示词节点模板新增「文案生成」标题与生成状态徽标（生成中 / 已完成 / 失败），并补 `.canvas-node__prompt p` 的 `white-space: pre-line` 与滚动，长文案在固定尺寸节点内不溢出
- 修复窄屏首次进入画布时节点整体落在可视区外的问题：新增 `isCanvasContentVisible()` 与 `ensureInitialCanvasVisibility()`，在 `loadCanvas()` 完成后检测所有节点是否至少有一个落在工作区内，全部不可见时才调用 `fitCanvasView()`，不会覆盖用户已保存的合法视口
- 图片生成与视频生成行为在本轮明确并记录：图片生成走既有真实图生图链路（Provider 在存在 `sourceImages` 时请求 `/images/edits` 并发送 multipart），视频生成仍只创建待填写参数的视频节点，按约定不自动提交真实视频任务
- `verify-canvas-interactions.mjs` 扩展为 Mock SSE 断言节点文本生成：校验新节点出现「文案生成」标题与完成态、流式正文包含两次 delta 内容、请求体带上传文件的 `fileIds` 且指令包含源节点说明；另新增 `390x844` 窄屏首次进入的可见性断言并输出 `m2-canvas-mobile-fit.png`
- 浏览器验收输出：`interactions {"errors":[],"firstNodeMetrics":{"hasImage":true,"height":250,"ratio":1.44,"width":360},"metrics":{"clientWidth":1440,"scrollWidth":1440}}`、`mobile-fit {"mobileErrors":[],"mobileVisibility":{"ratio":0.5,"total":4,"visible":2}}`
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成

## 51. 2026-10-20 Codex → WorkBuddy 交接与 D-042 决策

- 上游模型持续 `502`，用户决定把主开发工具从 Codex 切到 WorkBuddy（`DeepSeek-V4.1-Flash`）；codex 先完成上一批工作并写出交接文档，用户确认其收工后才允许提交，避免交接过程与在跑任务互相覆盖
- 按 `docs/MODEL_CONTINUITY.md` 第 3 节读完 `README.md`、`AI_HANDOFF.md`、`PROJECT_CONTEXT.md`、`RESEARCH_BASELINE.md`、`DECISIONS.md`、`OPEN_QUESTIONS.md`，并核对 `git status`、`git log`、`当前页面截图` 与 `outputs/ui-reference/live-reference`，先输出当前阶段、已确认决策、待确认问题、最后一次有效改动和最小改动范围，再开始动手
- 交接文档汇总单独提交为 `docs(handoff): summarize M0-M3 state for model switchover`，只含 `CHANGELOG.md`、`README.md`、`docs/AI_HANDOFF.md`、`docs/M3_WORKLOG.md`、`docs/MODEL_CONTINUITY.md`、`docs/PROJECT_CONTEXT.md` 六个文档，未触碰业务代码
- 新增 D-042：明确主开发工具可因上游可用性切换，D-033 的三档执行规则与红线继续适用于任何接管工具，并把「只在上一工具明确收工后提交」写入约束
- 修正 `docs/PROJECT_CONTEXT.md` 中「本次交接另修改了 6 个文档，尚未提交」这句会在提交后失效的描述，改为记录交接文档已提交
- 本轮只改文档，未修改业务代码、未读取或记录任何 Key/Token/Cookie、未调用真实第三方接口，因此未运行 `pnpm test` 和 `pnpm build`

## 52. 2026-10-20 AI 画布视觉收口（聚焦单模块）

- 环境限制：本机 Docker 依赖 WSL，`wsl.exe` 被沙箱 Program Blacklist 拦截，Docker Desktop 与 `initdb.exe` 均无法启动，真实 PostgreSQL/Redis 与 Nest API 在本轮不可用；改用 `outputs/runtime/mock-api.mjs`（端口 3006，只模拟 dev-login / image-tasks / video-tasks / canvas-workflows）+ vite（`node node_modules/vite/bin/vite.js`，端口 5173）做设计预览，`modules/display` 与 `models` 故意不模拟，由前端回退内置目录
- 参考素材重定位：`outputs/ui-reference/live-reference/canvas.png` 与 `reference-canvas.png` 都被登录弹窗遮挡，改用 `Desktop/参考产品截图合集/AI画布参考样图1.png`（节点+创作区特写）和 `参考产品AI画布点击图片创建工作流的状态.png`（整页）
- 现状核对：节点本身已接近参考产品（无内嵌 header、`8px` 圆角、外部 `11px` 灰色 `Image` 标签、圆点端口 + 加号），真正差距在点阵亮度、顶栏控件、创作区控件形态
- 修改 `CanvasStudioView.vue`：点阵 `70% → 34%`（灵感态 `56% → 30%`）；保存态胶囊改为仅在 `saving/error` 渲染；网格按钮改为金色圆形；「展开」移到上右角；字数统计改为有输入才显示；发送按钮改白色圆形 + `ArrowUpOutlined` + 金色积分角标；模型下拉加紫色菱形品牌块；占位文案改「您想」
- 交互冒烟：空态计数隐藏、发送禁用、高度 `168`；输入后计数 `9 / 1000`、发送启用、角标 `5`；展开后高度 `300`、标签「收起」
- 验证：`prettier --check`、`oxlint --deny-warnings`、`vue-tsc --noEmit` 通过（`pnpm` 不在 PATH，改为直接调用 `node_modules` 下的二进制）；桌面 `1440x1000` 与移动 `390x844` 无横向溢出、无页面脚本错误
- 未执行：`pnpm test` 与 `pnpm build` 未跑（本轮只改模板与样式，且 `pnpm` 不可用）；真实生图/生视频链路未验证（无后端）
- 本轮未读取、输出或记录任何 Key/Token/Cookie，未访问参考产品，未消耗参考产品积分

- 用户反馈追加：创作输入区不应常驻。参考产品默认看不到底部输入框，只有点中画布素材才弹出。新增 `composerVisible`（有锚点节点或正在提交时为真）并用 `v-show` 控制，取消选中即隐藏、草稿保留；补 `watch(composerVisible)` 在重新显示后调用 `syncComposerSize()`，否则锚点会按 0 宽高计算。验证：默认隐藏 → 点节点后出现在节点下方 18px（桌面 y=324 / 节点底 306）→ 点空白隐藏 → 重选草稿仍在；移动端 390x844 出现在 (70,362)、306x154、无横向溢出

## 53. 2026-10-20 AI 画布视口深度（输入区下沉、网格随缩放、10% 下限）

- 用户反馈三点：① 素材下方的创作输入区一旦超出屏幕不应继续浮在视口内，而应像素材框一样固定跟着素材一起下沉，超出视口的部分被遮挡；② 参考产品画布极大，可视界面完全看不到边界；③ 参考产品缩放最小 10%，该倍率下画布的点已经看不见（对照 `参考产品截图合集/参考产品AI画布的Zoom视口比较图（在该大小画布的点已经看不到了）.png`）
- 输入区定位去掉垂直方向的 `Math.min(top, boardHeight - height - margin)` 夹取，`top` 恒等于 `viewport.y + (node.y + node.height) * scale + 18`；水平方向仍保留边界保护，避免整块移出视口后点不到发送按钮。实测：素材底 `939` → 输入框顶 `957`（间距 18px），输入框底 `1125` 已超出 1000 高视口，超出部分被 `.canvas-workspace` 的 `overflow: hidden` 裁掉
- 网格改到世界坐标：新增 `canvasGridStyle` 计算 `--canvas-grid-size`（`22 * scale`）、`--canvas-grid-x/y`（等于 `viewport.x/y`）、`--canvas-grid-alpha`（基础 0.34 乘淡出系数）；点距 9px 及以上保持原不透明度，4px 以下线性淡到 0，`alpha <= 0.005` 时直接写 `backgroundImage: none`，避免密集重复渐变产生摩尔纹
- 缩放下限 `clampCanvasZoom` 从 `0.25` 改为 `0.1`，滑杆 `min` 从 `25` 改为 `10`；画布世界从 `3400x2200` 扩到 `8000x6000`，10% 时视口内看不到工作区边界
- 验证数据：初始 100%（`size 22px`、`alpha 0.340`、`backgroundPosition 30px 52px`）；缩到 10%（`size 2.20px`、`alpha 0`、`backgroundImage none`、标签 10%）；拉回 100% 时内联 `backgroundImage` 被移除、样式完全恢复；移动端 390x844 选中素材后输入框 `(70,527)` 宽 306、间距 18px，10% 时同样 `backgroundImage none`、`documentElement.scrollWidth 390` 无横向溢出
- 质量门：`prettier --check`、`oxlint --deny-warnings`、`vue-tsc --noEmit` 全过；本轮只改 `CanvasStudioView.vue`，未跑 `pnpm test` / `pnpm build`
- 本轮未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口；`outputs/runtime/mock-api-store.json` 的测试数据在验收后清空，保证下次打开是默认工作流

## 54. 2026-10-20 移动端适配暂停与真实后端恢复

- 用户决定：**暂时不做移动端适配**，把已完成的移动端工作记录下来并暂停，后续新改动只按桌面 `1440x1000` 验收
- 已完成的移动端工作（截至暂停点，均已在 `390x844` 下实测）：
  - 全局：五套 Shell 的移动底栏与抽屉导航、模块展示配置驱动移动入口；各主要页面无横向溢出（`documentElement.scrollWidth` 等于视口宽）
  - AI 画布：窄屏首次进入的节点可见性验收（`m2-canvas-mobile-fit.png`，4 节点中 2 个可见，`ratio 0.5`）；创作输入区在移动端点选素材后出现在素材下方 18px，尺寸 `306x154`、坐标 `(70,362)`；本轮视口深度改动后复测为 `(70,527)`、宽 306、间距 18px，10% 缩放下同样 `backgroundImage: none`、无横向溢出
  - 视频工作台、图片生成、智能修图、超级智能体、智能对话：均做过 `390x844` 回归（见第 47、48、49 节）
- 暂停期间的约定：
  - 新功能与视觉调整只保证桌面端，不再补写移动断点，也不把移动端问题当作阻塞项
  - 若某改动会破坏现有移动断点，允许先把该断点里的相关声明一并删除（沿用第 49 节视频模型栏的做法），但需在提交说明里写明
  - 恢复移动端时，优先处理：画布工具栏在窄屏的收折方式、创作输入区宽度与键盘遮挡、底部导航与浮动面板的层级冲突
- 真实链路恢复（同日）：Docker 引擎在本机可用后，`compose.yaml` 的 `postgres` 与 `redis` 容器已 `Up (healthy)`（`127.0.0.1:5432`、`6379`），`prisma migrate deploy` 显示 12 个迁移全部已应用，库内保留历史数据（`users 12`、`canvas_workflows 4`、`image_tasks 15`、`file_assets 26`）
- 因 `nest start` 会清空 `dist`（312 个文件）被安全策略拦截，改用 `node dist/main.js` 启动已编译产物；`GET /api/v1/health` 返回 `database: up, redis: up`
- 前端 `apps/web/.env.local` 的 `WEB_API_PROXY_TARGET` 从 `http://127.0.0.1:3006` 改回 `http://127.0.0.1:3001`，`outputs/runtime/mock-api.mjs` 退出，画布、登录、工作流全部走真实 Nest + PostgreSQL
- 根目录新建本地 `.env`（`.gitignore` 已忽略），由 `.env.example` 复制并把 `AUTH_TOKEN_SECRET` 换成随机 48 位；LLM/IMAGE/VIDEO 的 Key 全部留空，按 D-040 走 Mock，不读取 `本地密钥文件`
- 本轮未调用任何真实付费接口，未读取、输出或记录任何 Key/Token/Cookie
- 画布首屏空态（同日追加）：用户确认默认应是空画布，而不是前端内置的 4 个假素材节点。`createSeedCanvas()` 拆成两个函数——`createBlankCanvas()` 返回空文档，供 `loadCanvas()` 首次进入和 `createCanvas()` 新建使用；`createTemplateCanvas()` 保留原演示节点，只给「工作流」面板按模板节点数生成，不再进默认画布
- 补空态引导 `.canvas-empty`：居中图标 + 「画布还是空的」+ 说明 + 两个入口「上传素材」（`beginCanvasUpload`）与「添加创作节点」（`addPromptNode`）；容器 `pointer-events: none` 保证不挡画布平移，只有按钮区 `pointer-events: auto`
- 验证：新建后 `nodes 0 / emptyVisible true / composerVisible false / zoom 100%`；点「添加创作节点」后 `nodes 1 / emptyVisible false`；再次新建回到空态；工作流面板载入「4 个节点」模板仍正常（`nodes 4 / emptyVisible false`）；`scrollWidth 1440` 无横向溢出

## 55. 2026-10-20 真实上游联调（对话 / 生图 / 视频）

- 用户授权读取 `本地密钥文件`，按注释把 6 组配置映射进根目录 `.env`（`.gitignore` 第 2 行已忽略，不会进仓库）：`LLM_API_KEY`=第 6 组 gpt、`LLM_DEEPSEEK_API_KEY`=第 2 组 ds、`LLM_QWEN_API_KEY`=第 4 组千问、`IMAGE_API_KEY`=第 1 组生图、`IMAGE_FALLBACK_API_KEY`=第 3 组生图 2、`VIDEO_API_KEY`=grok 组；所有 base url 为 `https://api.example.com/v1`
- 解析脚本 `outputs/runtime/apply-api-keys.cjs` 只打印掩码；坑：文件里「4（实际是grok）」标题没有点号，按行首 `数字+点` 解析会把 grok key 并进「生图测试2」那一节，所以 grok key 取该节 `keys[1]`
- `/v1/models` 探测（只读）：`LLM_API_KEY` 20 个模型含 `gpt-6-astra`、`gpt-5.5`；`LLM_DEEPSEEK_API_KEY` 4 个含 `deepseek-v4-pro-0813`、`deepseek-v4.1-flash`、`deepseek-v4.1-flash-0910`；`LLM_QWEN_API_KEY` 含 `qwen3.8-max/flash/27b/max-0902`；`IMAGE_API_KEY` 只有 `gpt-image-*`（含 `gpt-image-2.5`）；`VIDEO_API_KEY` 只有 `grok-imagine-video` 与 `-1.5`
- 对话：`openai-gpt-6-astra` 真实流式返回「真实链路通了」（3.9s）；`qwen3.8-max` 正常；`deepseek-v4-pro-0813` 返回 429 `All available accounts are currently rate-limited`（上游账号池限流，不是密钥或配置问题），同一密钥改用 `deepseek-v4.1-flash` 返回 200
- 生图：`POST /image-tasks` 必须带 `Idempotency-Key`（前端 `api.ts` 用的是大写，已覆盖），任务 `SUCCEEDED`，积分 52→47，产出真实 PNG 2.7MB，图像内容与 prompt 一致（橘猫 + 雪窗）
- 视频：首次跑 `xai-grok-imagine-video` 判为 `VIDEO_GENERATION_FAILED`，但用 `providerRequestId` 直接查上游是 `{"status":"done"}`，定位为 `xai-video.provider.ts` 的下载缺陷——上游给的是相对地址 `/v1/videos/<id>/content`，原实现直接 `fetch(相对地址)` 抛 URL 解析错误，且没带 `Authorization`（实测无鉴权返回 401，带 Bearer 返回 200 `video/mp4`）
- 修复：新增 `resolveAbsoluteUrl()` 用 `new URL(url, base)` 解析相对地址，`downloadResult()` 增加 `apiKey` 参数并附加 `Bearer`；用 `tsc -p tsconfig.build.json` 直接覆盖 `dist`（`nest build` 会清空 dist 被 safe-delete 拦截），重启后重测 `SUCCEEDED`，积分 47→37，落盘 MP4 5.6MB
- 不可用清单（本轮结论，交给用户换密钥）：`deepseek-v4-pro-0813` 上游限流；豆包系 `doubao-seedream-4-0`、`doubao-seedance-1-0-pro`、`doubao-seedance-2-0` 无对应密钥，且 `buildArkApiUrl()` 拼出的 `https://api.example.com/api/v3/images/generations` 实测 404（该网关没有火山方舟协议），选中这些模型会失败或回退 Mock
- 本轮密钥只写入被忽略的 `.env`，未写进任何受版本控制的文件；未在任何输出中打印完整密钥
- 验证：`tsc -p tsconfig.build.json` 通过；`/api/v1/health` 返回 `database: up, redis: up`

## 56. 2026-10-20 图生图实测与画布图生视频缺口

- 用户提问：能否做到「给猫图 + 指令加红帽子 → 只改帽子、其余保持原样」，以及画布素材节点如何做图生图/图生视频
- 结论：图生图**已实现且实测通过**，链路是 `image-tasks.sourceFileId` → `task.sourceFile` → `sourceImages` → `OpenAiImageProvider.createPayload()` 判断 `sourceImages.length` 后走 `/images/edits`（multipart，单张字段 `image`、多张 `image[]`，附 `output_format=png`），不走 `/images/generations`
- 实测：源图为上一轮生成的橘猫（fileId `cmvg260cs000dysqz8grmxf96`），指令「在这只橘猫的头上加一顶红色针织帽，其余内容（背景、姿态、光线）保持完全不变」，模型 `jiguang-gpt-image-2.5`，任务 `SUCCEEDED`，产物 `_real-image-edit.png` 2.7MB；帽子位置正确，窗外雪景、窗台、姿态与光线均保持一致，符合「按指令局部修改」的预期
- 参数能力：当前支持 `model`、`prompt`、`n`、`size`（1K/2K/4K 映射到上游像素尺寸）、`quality`、`output_format`；多图参考通过 `referenceFileIds` 传 `image[]`（上限 13）；**未实现 mask 局部重绘**，保持原样主要靠 edits 接口与 prompt 约束
- 画布侧：素材节点 → 图生图已接通（`prepareImageNodeGeneration()` → `createImageTask` 带 `sourceFileId`）；素材节点 → 图生视频**尚未接通**——`createVideoNodeFromSource()` 只创建 `kind='video'` 节点并把 `sourceFileId` 写进节点，但 `stores/draw-workspace.ts` 里没有任何 `createVideoTask` 调用（`grep -n "video"` 为空），所以该节点不会真正提交视频任务。视频的图生视频目前只在视频工作台可用（`stores/video-workspace.ts` 调 `createVideoTask`，后端 `video-tasks.service.ts` 用 `task.sourceFile` → `sourceImage` → xai provider 的 `payload.image`）
- 模型列表事实核对：`GET /api/v1/models` 仍返回 14 个内置别名，其中 `doubao-seedream-4-0`、`doubao-seedance-1-0-pro`、`doubao-seedance-2-0` 依然在列表里（来自 `DEFAULT_MODELS`），画布创作区的模型下拉实测出现「Seedream 4.0」。这三个模型并未接入：无对应密钥，且 `buildArkApiUrl()` 拼出的 `https://api.example.com/api/v3/images/generations` 实测 404
- 本轮未改代码，仅做真实验证；消耗 5 积分（37 → 32），未读取或输出任何密钥

## 57. 2026-10-20 图生视频打通与新视频密钥

- 用户新增第 7 组「生视频测试1」密钥（第 7 组），`/v1/models` 返回 4 个：`grok-imagine-image`、`grok-imagine-image-2.0`、`grok-imagine-video`、`grok-imagine-video-1.5`；已替换到 `.env` 的 `VIDEO_API_KEY`
- 关键差异：**旧分组拒绝内联图片**（`image url must be http(s) or asset://; data URLs and uploads are not supported`），新分组接受 data URL；因此「素材传不过去、只有 prompt 生效」的根因不是包体大小，而是分组对图片字段的限制
- 另一个坑：新分组带 `resolution` 会返回 422 `xAI upstream status 422`，去掉后 200；据此在 `XaiVideoProvider.createGeneration()` 里加「422 且带 resolution 就删掉重试一次」的兜底（422 不创建任务，不会重复扣费）
- 首帧压缩：引入 `sharp`（`pnpm --filter @aurora/api add sharp`，`^0.35.5`），`prepareSourceImage()` 按 1280 长边 + JPEG 82 压缩，实测 2702KB → 246KB，日志 `Source image compressed 2702KB -> 246KB`
- 结果下载：上游返回相对地址 `/v1/videos/<id>/content` 且需要 Bearer（无鉴权 401，带鉴权 200 `video/mp4`），新增 `resolveAbsoluteUrl()` 与 `downloadResult(url, signal, apiKey)`
- 错误透传：`video-tasks.service.ts` 对 `VIDEO_*` 开头的错误优先使用原始 message，不再统一折叠成「视频生成失败，本次积分已退回」；实测能看到 `视频生成服务返回 HTTP 400：image url must be http(s) or asset://`
- 画布接线：`CanvasStudioView` 中视频节点成为合法提交目标（`focusComposerForNode` 与 `submitComposer` 的 preparedTarget 兜底），提交走 `createVideoTask(..., idempotencyKey)`，新增 `scheduleVideoPoll()` 每 5 秒轮询、15 分钟超时，完成后把 `resultFileId` 与 `previewUrl` 写回节点
- 模型清理：`DEFAULT_MODELS` 移除 `doubao-seedream-4-0`、`doubao-seedance-1-0-pro`、`doubao-seedance-2-0`（无密钥 + 网关无 `/api/v3`，实测 404），`/api/v1/models` 从 14 个降为 11 个；`model-registry.service.spec.ts` 的数量断言同步为 12/10/11，原来的 Seedance 注册用例改为「不再注册」，`test/video-tasks.e2e-spec.ts` 的 Seedance 用例改为「提交未注册模型返回 404」
- 实测结果：API 直连图生视频 `SUCCEEDED`（积分 32 → 22，产出 6 秒 MP4，首帧就是戴红帽的橘猫）；画布端到端提交发出 `POST /api/v1/video-tasks`，body 含 `modelAlias: xai-grok-imagine-video`、`sourceFileId`、`parameters.duration=6`，节点进入「生成中」
- 质量门：`tsc -p tsconfig.build.json`、`vue-tsc --noEmit`、`prettier`、`oxlint` 通过；API 全量 27 文件 116 项测试通过

## 58. 2026-10-20 Grok 生图接入与模型能力分场景

- 用户要求：接入 grok 生图；并且把「图生图 / 图生视频」的模型选择按真实能力区分（例如只能文生视频的 key 不能出现在图生视频的模型列表里）；整体检查 AI 绘画、图片生成、智能修图、视频、画布各处的模型选择
- 探测结论（新视频分组「生视频测试1」）：
  - `grok-imagine-image` / `grok-imagine-image-2.0` 均可生图，`response_format: 'b64_json'` 返回内联 base64（377KB / 422KB）
  - 回链域名 `imgen.x.ai` 在本机 DNS 被污染（解析到 `108.160.165.53`，连接超时），因此必须固定请求 b64_json，不能走「返回 URL 再下载」
  - 传图实测：输入「橘猫雪窗 + 加红帽子」，输出把背景换成秋日长椅、猫身姿态也重画，只保留了主体与帽子。说明 Grok 的图片输入是**参考图重绘**，不具备 gpt-image 的保真编辑能力
- 能力模型扩展：
  - `ImageCapabilityProfile.supportsImageEdit`：是否支持保留原图的编辑；`gpt-image-2.5` 为 true（实测 `/images/edits` 只改局部），两个 Grok 生图为 false
  - `VideoCapabilityProfile.supportsImageInput`：是否支持首帧图片（图生视频）；两个 Grok 视频模型为 true，首尾帧 / 参考视频仍为 false
- 后端：
  - 新增 `XaiImageProvider`（`src/providers/xai-image/`）：`POST {base}/images/generations`，固定 `response_format: 'b64_json'`，参考图经 sharp 压到 1024 长边 + JPEG85 后以 data URL 传入；无 key 时报 `IMAGE_NOT_CONFIGURED`，只返回外链时报 `IMAGE_RESULT_DOWNLOAD_FAILED`
  - `provider-protocol.ts` 增加图片协议 `xai`（按 `grok-imagine-image` / providerCode `xai` 命中），`ImageProviderRouter` 路由到新 provider，`IMAGE_PROVIDER` 也支持强制 `xai`
  - `env.ts` 白名单补 `IMAGE_GROK_BASE_URL` / `IMAGE_GROK_API_KEY` / `IMAGE_GROK_DEFAULT_MODEL`，`IMAGE_PROVIDER` 枚举加 `xai`（最初漏登记导致变量被 zod 剥掉、provider 读不到 key，是这轮唯一的返工点）
  - `DEFAULT_MODELS` 从 11 个增到 13 个；`model-capability.constraints.ts` 新增 `IMAGE_EDIT_UNSUPPORTED`（编辑模式 + 不支持保真编辑）与 `VIDEO_IMAGE_INPUT_UNSUPPORTED`（传首帧但模型不支持）
- 前端：
  - `model-catalog.ts` 新增 `ImageModelMode`（`text-to-image` / `image-to-image` / `image-edit`）、`VideoModelMode`（文生 / 图生 / 首尾帧 / 参考视频）与 `imageModelsFor` / `videoModelsFor` / `resolveImageAlias` / `resolveVideoAlias`；兜底清单与后端同步（移除 Seedream / Seedance，加入两个 Grok 生图）
  - AI 绘画：模型列表按当前创作模式过滤，`局部编辑` / `商品图处理` 只列支持保真编辑的模型，`参考图重绘` 只列能吃参考图的模型
  - 图片生成：上传素材后切到 `image-to-image` 列表；智能修图只列 `image-edit` 模型
  - 视频工作台：模型列表跟随生成方式过滤；首尾帧 / 参考视频在无可用模型时直接禁用并标注「暂无可用模型」
  - 画布：创作区按目标节点判断模型族（视频节点 → 图生视频模型；图片节点按有无素材 → 文生图 / 图生图）；修掉「只点选视频节点时不设置 composerTargetNodeId 导致列出图片模型」的问题；提交视频时用 `resolveVideoAlias('image-to-video')` 解析别名，不再写死
- 验证：
  - `GET /api/v1/models` 返回 13 个，图片 3 个、视频 2 个，profile 中的能力位正确
  - 真实链路：`xai-grok-imagine-image` 文生图 `SUCCEEDED`，产物落到本地存储（285KB JPEG，内容与提示词一致）；`mode: '局部编辑'` + Grok 返回 409 `IMAGE_EDIT_UNSUPPORTED`
  - 页面实测：AI 绘画文生图 3 个模型、局部编辑只剩 `GPT Image 2.5`；图片生成 3 个、智能修图 1 个；视频文生 / 图生均 2 个，首尾帧与参考视频禁用；画布图片节点 3 个、视频节点 2 个
  - `pnpm` 口径等价：API `vitest` 121 项通过、Web `vitest` 91 项通过、`tsc -p tsconfig.build.json`、`vue-tsc --noEmit`、`prettier --check`、`oxlint --deny-warnings` 全部通过
- 真实调用消耗 1 张图（另 1 次因未配置 key 失败已自动退回）；本地测试账号积分已从 2 补到 200，避免用户进入页面时无法生成

## 59. 2026-10-20 AI 画布节点说明、视频进度与指令回填

- 用户反馈三点：① 改视角是否也走图生图；② 生成视频时没有像生成图像那样的加载动画/提示；③ 每次创作应在对应素材下方保留文本，参考产品在素材左上角有一句简要说明（`参考产品截图合集/AI画布图生图橘猫1-4.png`）
- 改视角：确认走的是同一条图生图链路（`createGenerationWorks` + `sourceFileId`，prompt 里拼接水平旋转/垂直俯仰角度，`mode: 'canvas-angle'`）。由于要求「保持材质、光线和身份一致」，本质是保真编辑，`generateAngleView` 改为 `resolveImageAlias('image-edit', selectedModel)`，避免参考重绘类模型把主体和背景一起重画
- 节点左上角说明：`.canvas-node__meta` 原本显示 `Image/Video` 且固定在节点左侧 58px 宽，改为节点上方 6px、左对齐、宽度自适应，内容换成 `nodeCaption(node)`：
  - 生成中显示「生成中」/「生成视频 42%」
  - 普通节点显示创作指令的前 22 个字（超过截断），上传图（prompt 是文件名）显示「原图」
  - 3D 视角的自动后缀（`；将镜头水平旋转…`）在说明里被剥掉，只留用户原话
- 视频加载态：视频节点原本只有一行静态「等待视频任务生成」，没有任何动效。现在生成中显示旋转的加载图标、`LoadingOutlined` 旋转动画、「视频生成中」文案、进度条（宽度随 `node.progress`），节点背景也换成更亮的蓝色渐变以区分
- 进度来源：`scheduleVideoPoll` 每次轮询把 `task.progress` 写回 `node.progress`（0-100），成功时置 100；`CanvasNode` 新增 `progress?: number`
- 指令回填与草稿：新增 `composerDrafts`（节点 id → 未提交文本）与 `composerDraftNodeId`，`watch(composerAnchorNode)` 时切换：
  - 离开节点时保存非空草稿，空内容不占位（否则点回来会被空串顶掉，看不到该节点自己的指令）
  - 进入节点时优先取草稿，否则回填该节点的 `prompt`；上传图（文件名）不回填
  - 已验证：点生成结果节点回填「在这只橘猫头上加一顶红色针织帽，其余内容保持完全不变」；点视频节点回填「戴红帽的橘猫转头看向镜头，窗外雪花飘落」
- 视频节点创作区参数：原本沿用图片的比例 + `1K` 清晰度，对视频无意义。改为视频目标时显示时长（6/10/15s）与分辨率（720P/1080P），并直接作为 `createVideoTask` 的 `parameters`；积分角标也按视频任务显示 10
- 验证：桌面 1440×1000 实测节点说明为「橘猫坐在雪窗前 / 在这只橘猫头上加一顶红色针织帽，其余内容保持… / 生成视频 42%」，视频节点 `spinner: true`、进度条 `width: 42%`；创作区回填与视频参数选择均正确；`vue-tsc --noEmit`、`prettier --check`、`oxlint --deny-warnings`、Web `vitest` 91 项全部通过
- 说明：本轮用构造的工作流截图验证 UI，未真实提交视频任务，不产生额外计费

## 60. 2026-10-20 画布连线语义：素材取节点产物，不再回溯原始素材

- 用户提出三问：① 图生文本再用文本生成图/视频，结果基于哪张素材；② 本项目里「原图 → 图生图 → 图生视频」，视频却仍用原图，不合逻辑；③ 从视频节点出发做图像生成/视频生成应该是什么行为（参考 `参考产品截图合集/AI画布图生图橘猫5/6/7.png`）
- 根因定位：`nodeSourceFileId()` 优先返回 `sourceFileId`（节点创建时写入的**输入**素材），`resultFileId`（节点**产物**）排在后面。于是生成类节点对外提供的永远是它的输入：`A(由 O 生成)` 交给下游的是 `O`，`createVideoNodeFromSource(A)` 拿到的也是 `O`，串联链路在第一跳就断了
- 素材解析重写（`CanvasStudioView.vue`）：
  - 新增 `nodeResultFileId()`：只认节点产物（`resultFileId` → 关联 work 的结果），`nodeSourceFileId()` 改为产物优先、`sourceFileId` 兜底（任务未完成 / 重试 / 上传素材时仍可用）
  - 新增 `nodeArtifactKind()`：区分节点对外提供的是图片还是视频，为跨类型生成做前置判断
  - `nodeImageUrl()` 同样改成结果优先，并且结果文件加载中宁可留空，也不再退回原图造成「生成没生效」的错觉
- 创作区语义拆成两类，`focusComposerForNode()` 按「节点是否已有产物」分流：
  - 已有产物的节点：这个输入框是「基于它继续创作」，素材 = 它自己的产物，提交时新建下游节点
  - 还没有产物的目标节点：素材 = 入边来源，提交即填充它本身
  - 多条入边时取**最后连上**的那条，用户手动改接另一张图后不会继续沿用旧素材
  - `prepareImageNodeGeneration()` 的素材统一落到新节点自己的 `sourceFileId`，提交时不再二次回溯上游
- 文本节点不传递素材：`prompt` 节点只贡献提示词，图文链路默认文生图；要延续主体必须把图片节点一起连到生成节点（避免「图 → 文 → 图」时素材被隐式穿透，行为不可预测）
- 视频节点作为素材（对应参考产品 7.png 的「视频 → 图像生成」）：
  - 图像接口只收图片，新增 `extractVideoFrameFile()` / `resolveVideoFrameFileId()`：浏览器里把视频首帧画成 JPEG 再当普通素材上传（按视频文件 id 缓存，避免重复上传），面板按普通图生图呈现
  - 「视频 → 视频」当前无可用通道（两个 Grok 视频模型只支持首帧图片输入），菜单点选时直接提示，不再创建注定失败的节点
  - 生成菜单按源节点类型改写说明：视频节点显示「截取视频首帧作为参考图」/「需要图片输入，请先由该视频生成图片」
- 可见性：新建结果节点时同时画出「文本依赖」与「素材依赖」两条边，画布上能直接看出结果基于哪个节点；创作区顶部新增「参考素材」标签，把这次实际使用的素材名称写出来
- 绑定规则收敛：新增 `resolveComposerBinding()`，点选节点（`handleNodePointerDown`）与「填写描述」按钮共用同一套 source/target 计算，点中素材的一瞬间就能看到「这次基于谁」。`composerMaterialLabel` 按「目标自身有产物 → 目标自身；否则目标入边 → 兜底目标」的顺序解析，和提交时的素材解析保持一致
- 验证：`vue-tsc --noEmit` 通过、Web `vitest` 91 项全通过；`outputs/ui-reference/_chain-probe.mjs` 用 3 节点链路（原图 O → 生成结果 A → 空视频节点 V）实测：
  - 点 A：参考素材显示 A 自己的指令「给这只橘猫戴一顶红色针织帽，其余保持不变」，模型为图片模型（16:9 / 1K / 5 积分），提交会新建下游节点
  - 点 V：参考素材显示 A 的指令（来自入边，而不是 V 自己或原图），模型为视频模型（6s / 720P / 10 积分）
  - 截图：`_chain-probe-a.png`、`_chain-probe-v.png`；本轮未提交真实任务，不产生计费
- 已知差距：参考产品 6.png 的视频面板有「首帧 / 尾帧」两个槽位，本实现目前是单素材首帧；多素材（首尾帧、角色参考图）需要把 `referenceFileIds` 打通到视频任务与上游，列为下一步

## 61. 2026-10-20 视频转文案（关键帧）与文案转视频（文生视频）

- 用户报障：画布上对视频节点做「文本生成」会失败，提示「当前仅支持在对话中发送图片附件」。同时提出想把「尾帧图 → 图生文本（提取画面信息）→ 结合客户需求 → 生成视频」串起来
- 失败原因：`chat.service.ts` 的附件校验只放行 `image/*`（`CHAT_ATTACHMENT_UNSUPPORTED`），而画布把视频节点的 `sourceFileId`（mp4）直接塞进 `fileIds`，必然 409。上游对话模型是 OpenAI 兼容的 `image_url` 协议，也不支持视频
- 视频 → 文案（`resolveVideoKeyFrameFileIds` / `extractVideoFrames`）：
  - 在浏览器里按 2% / 50% / 98% 抽三张关键帧（起始、中段、结束），分别当普通图片素材上传，再以 `fileIds: [起始, 中段, 结束]` 提交给带 `vision` 的对话模型
  - 指令里明确说明「这三张是同一段视频按时间顺序截取的关键帧」，避免模型当成三个场景；按视频文件 id 缓存，重复生成文案不重复抽帧上传
  - 重构了原来的单帧逻辑：`extractVideoFrameFile` → `openVideoElement` + `grabVideoFrame` + `extractVideoFrames`，一个 `<video>` 里连续 seek，不再为每帧重新加载
- 文案 → 视频（画布补齐文生视频）：
  - `createVideoNodeFromSource()` 不再对「无图片素材」一律拦截：文案节点派生视频节点时 `generationMode: 'text-to-video'`、`sourceFileId` 为空、标题「文生视频」；图片/结果节点仍是 `image-to-video`
  - 新增 `composerVideoMode`：视频节点按自身 `generationMode` 选模型清单（`text-to-video` / `image-to-video`），`submitVideoGeneration()` 同口径解析别名，不再写死图生视频
  - `submitComposer()` 的「视频必须有首帧」检查对 `text-to-video` 节点放行；视频任务因此可以不带 `sourceFileId` 提交（后端本来就允许，缺首帧只影响图生视频）
  - 完成后标题按生成方式回写「文生视频 / 图生视频」；文案节点可能很长，创建视频节点时把 prompt 截到 1000 字
- 文案内容补「画面描述」：`buildNodeTextInstruction` 的输出格式加第 4 项，要求给出一段可直接作为生图/生视频提示词的中文描述（主体、动作、镜头运动、光线、风格，≤120 字）。这样「图/视频 → 文本 → 再生成」时才有一份能直接复用为 prompt 的产物，而不是只有广告语
- 语气修正：`composerMaterialLabel` 对 `prompt` 节点直接返回空，文案节点不再把自己的上游视频显示成「参考素材」
- 验证：`outputs/ui-reference/_video-text-probe.mjs`（真实 mp4 + mock 上传/SSE/视频任务）实测：
  - 视频节点「文本生成」→ 上传 3 张关键帧（262KB / 266KB / 205KB）、`chat/stream` 的 `fileIds` 长度为 3、文案节点流式写入「核心主张：让窗外的雪落进这一帧。」且状态为已完成
  - 文案节点「视频生成」→ 新建节点标题「文生视频」、创作区无「参考素材」标签、模型清单为两个视频模型 + 时长 6/10/15s + 720P/1080P
  - 提交体：`{ modelAlias: 'xai-grok-imagine-video', prompt: '橘猫在雪窗前缓慢转头…', parameters: { duration: 6, resolution: '720P' }, sourceFileId: null }`，即真正的文生视频
  - 截图：`_video-text-probe.png`、`_video-text-to-video.png`；无页面脚本错误
- 类型/测试：`vue-tsc --noEmit`、`oxlint --deny-warnings`、Web `vitest` 91 项通过
- 边界说明（已告知用户）：关键帧文案不等于完整视频理解（没有音频、节奏与镜头连续性信息）；上游也不支持视频输入。真正「以尾帧收尾」仍需要 `supportsLastFrame` 的模型

## 62. 2026-10-20 视频保存位置排查、视频历史面板、文案节点编辑模式与 Markdown 清洗

- 用户反馈：生成的视频在历史记录里看不到（怀疑没保存）。排查结论：**视频一直有保存，问题在前端历史面板**
  - 磁盘：`storage/users/<userId>/2026/10/<uuid>.mp4`（`file_assets.storagePath`），本地已有 7 个 mp4，单个 4-8MB
  - 数据库：`video_tasks` 11 条（7 条 SUCCEEDED、其余 FAILED），成功任务都带 `resultFileId`；`file_assets` 中 7 条 `video/mp4`
  - 访问：`GET /api/v1/files/<fileId>/content`（鉴权），画布节点的 `resultFileId` 就是这个 fileId
  - 排查脚本：`apps/api/scripts/inspect-video-tasks.mjs`（Prisma 7 需要 `PrismaPg` adapter）
- 根因：画布历史面板的「视频历史」是空壳——`visibleHistory` 只返回 `imageHistory`（works 队列），video 分支恒为 `[]`，计数还写死成 `0`；而视频任务走独立的 `/api/v1/video-tasks`，本来就不进 works 队列
- 修复：
  - 画布新增 `videoHistoryTasks` / `videoHistory` / `loadVideoHistory()`，用 `listVideoTasks(12)` 拉真实视频任务，只保留 `SUCCEEDED` 且有结果文件的任务
  - 切到「视频历史」标签或打开历史面板时才加载（视频动辄好几 MB，页面一进来全量下载没意义）
  - 缩略图用 `<video preload="metadata">` 播首帧；因为 `<video>` 标签带不了 Authorization 头，先经 `fetchFileBlob` 换成 blob URL（复用画布已有的 `loadFileUrl`）
  - 计数显示真实数量；点击历史卡片会在画布上落成一个 `kind: 'video'` 的节点（带 `resultFileId`、`previewUrl`、原始 prompt 与来源图）
  - 空状态区分「正在读取视频历史…」与「还没有视频历史」
- 文案节点下方的框（用户问「是什么作用」）：此前它会按图片目标处理，提交后新建图片节点，语义含混。现在明确为**编辑器**：
  - 新增 `composerEditingPrompt`（锚定节点是 `prompt` 时成立），`submitComposer()` 命中该分支就只回写节点文字，不发起任何生成；生成中的节点会提示先等完成
  - 创作区在编辑模式下隐藏模型 / 比例 / 尺寸与积分角标，发送按钮换成对勾图标，placeholder 改为「修改这段文案，保存后会写回节点…」
  - `editSelectedNode()` 对文案节点不再把它挂成提交目标；想用文案出图或出视频仍走节点菜单的「图像生成 / 视频生成」
- Markdown 记号清理（用户反馈 `**` 之类不美观）：
  - `utils/markdown.ts` 新增 `stripMarkdown()`：去掉加粗/斜体/删除线/标题井号/引用/代码围栏/链接语法，列表换成 `· `，并清掉流式输出到一半时残留的孤立记号
  - 节点正文、节点说明（`nodeCaption`）、文案落盘（`onDone`）统一走纯文本；派生视频节点时 prompt 也先清洗
  - `TEXT_GENERATION_PLACEHOLDER` 上移到 setup 早期（`composerPromptForNode` 会在 watch immediate 里读取它，留在后面会撞 const 暂时性死区），生成中的占位文字不再被回填进输入框
- 验证：
  - `outputs/ui-reference/_video-history-probe.mjs`（真实后端 + 真实 dev 账号）：历史面板列出 7 个视频卡片、7 个 `<video>` 缩略、计数正确；点击首张卡片在画布生成带 `<video>` 的节点，标题「视频」
  - `outputs/ui-reference/_prompt-edit-probe.mjs`：选中文案节点后无模型下拉、placeholder 为编辑提示、无积分角标；保存后节点文本更新且**没有新增任何生成请求**（`chatRequestCount` 仍为 1）；模型返回带 `**` / `###` 的文案后，节点正文为纯文本（`hasMarkdownLeft: false`）
  - `utils/markdown.spec.ts` 新增 3 个用例（连同原有共 6 项通过）；`vue-tsc --noEmit`、`oxlint --deny-warnings`、Web `vitest` 94 项全部通过
- 本轮未提交真实生成任务，不产生计费

## 63. 2026-10-20 刷新后视频素材裂图、点空白创作区不收起

- 用户反馈两个现象：① 刷新页面后，视频素材变成「裂图图标 + 一段生成用的文本」，而图片素材正常；② 点击画布空白处，素材下方的输入框一直不消失
- 裂图根因：`createCanvasDocument()` 刻意不保存 `previewUrl`（blob URL 刷新即失效），而视频节点模板的 `<video>` 分支要求 `node.previewUrl` 非空，刷新后条件不成立 → 落到通用 `<img>` 分支 → `<img src>` 指向的是 mp4 的 blob URL → 浏览器用图片解码器读 mp4，必然裂图
- 修复：
  - 新增 `nodeVideoUrl(node)`：优先用当次会话的 `previewUrl`，否则用 `resultFileId` 换来的 blob URL（顺带触发 `loadFileUrl` 拉取文件），没有则空
  - `nodeImageUrl()` 遇到 `kind === 'video'` 直接返回空字符串，从根上杜绝「拿视频文件去渲染 `<img>`」
  - 模板：视频分支改用 `nodeVideoUrl(node)`（并排除生成中的忙碌态），`<img>` 与 `GalleryArtwork` 分支加 `node.kind !== 'video'` 条件；视频节点在文件回取期间显示「正在加载视频 / 正在取回已保存的视频文件」而不是插画占位
- 输入框不收起的根因：上一轮「点选节点即绑定素材」把 `composerSourceNodeId` / `composerTargetNodeId` 写成了节点 id，而 `clearSelection()` 只清选中态、不清这两个绑定 → `composerAnchorNode` 仍能解析出节点 → `composerVisible` 一直为真
- 修复：在 `handleCanvasPointerDown()`（点画布空白）里同时清空 source/target 绑定；没有把清理放进 `clearSelection()`，因为删除节点等场景需要保留仍然有效的绑定
- 验证（`outputs/ui-reference/_video-refresh-probe.mjs`，模拟刷新后只有 `resultFileId`、没有 `previewUrl` 的画布 + 真实 mp4）：
  - 刷新后视频节点渲染 `<video src="blob:…">`，节点内无 `<img>`（`brokenImage: null`）
  - 选中节点 → 创作区出现（true）；点画布空白 → 创作区收起（false）
  - 截图：`_video-refresh-probe.png`、`_video-refresh-blank-click.png`
- `vue-tsc --noEmit`、`oxlint --deny-warnings`、Web `vitest` 94 项全部通过；本轮未提交真实任务，不产生计费

## 64. 2026-10-20 本轮存档与交接文档整理

- 用户要求：把当天（上午 DeepSeek-V4.1-Flash、下午 MiniMax-M3.1-Flash）两段会话的工作整理成 docs 内的存档说明，防止进度丢失
- 新增 `docs/SESSION_HANDOFF_2026-10-20.md`（本轮唯一新增文档），结构：
  1. 一句话现状 + 环境与运行方式（端口、测试账号、密钥读取路径、沙箱限制、测试口径与数量）
  2. **15 条工作主线对照表**（现象/需求 → 处理 → 验证 → `M3_WORKLOG` 对应章节），把第 51-63 节压缩成可检索的一张表
  3. **四条可复用口径**：画布连线与素材语义、视频三个能力位的区别、跨媒体降级策略、文案节点语义
  4. 按文件的代码改动清单（后端 8 项、前端 5 项）
  5. 新增探针与排查脚本清单（5 个 playwright 探针 + 1 个查库脚本）
  6. 真实上游可用性快照（含各密钥分组结论与限流情况）
  7. 已知能力边界（无真视频理解 / 无首尾帧 / 无视频生视频 / 历史面板只拉 12 条 / 无双槽位）
  8. **未提交工作区的准确状态**（32 个已跟踪文件 + 4 个未跟踪项、未提交原因与提交前约定）
  9. 按优先级排的下一步待办（先提交 → 首尾帧双槽位 → 真视频理解 → 恢复移动端 → 限流模型替代）
  10. 接手自检清单（6 步）
  11. 文档索引
- 同步更新既有文档（保证口径一致、不留过期描述）：
  - `docs/AI_HANDOFF.md`：提交号改 `59bdf84`、Git 状态改为「大批未提交改动」并指向新存档、交接摘要重写为本轮三条主线、测试数更新为 API 121 项 / Web 94 项、进度与注意事项补本轮待办与口径提示
  - `docs/PROJECT_CONTEXT.md`：当前阶段改写（未提交状态 + 存档指针）、已完成项补本轮成果、进行中补待办优先级
  - `docs/DECISIONS.md`：新增 **D-043 画布连线与素材语义**、**D-044 视频能力位与跨媒体降级**，把本轮形成的行为规则决策化，避免下一任重新发明
  - `docs/MODEL_CONTINUITY.md`、`README.md`：强制阅读顺序与主要文档列表加入新存档
  - `docs/OPEN_QUESTIONS.md`：开头加存档索引（能力边界与待办优先级在存档里，本文只留待拍板问题与上游事实）
  - `CHANGELOG.md`：新增存档条目，并恢复过程中误吞的「视频转文案与文案转视频」条目（已复核 314 条记录结构完整）
- 校验：`prettier --check` 全部文档通过；`git diff --shortstat` 与文档内写的数字一致
- 本轮为纯文档整理，未改业务代码、未调用上游、不产生计费

## 65. 2026-10-20 后台 API 进程被回收与恢复

- 现象：后台任务「`node dist/main.js`」在 17:42 报 failed，但**日志里没有任何错误或堆栈**，最后一条业务日志是 15:01:19 的视频任务完成；进程从 11:39 连续运行约 6 小时
- 判定：不是代码故障，是**宿主回收了长时间运行的后台进程**。同一时刻 dist 被重新构建（`tsc`，17:42），新实例（PID 20612）在 17:42:59 拉起并接管 3001 端口
- 验证新实例健康：`GET /api/v1/health` 200；真实 `dev-login` 后 `GET /api/v1/models` 返回 **13 个模型**（8 对话 + 3 生图含 `xai-grok-imagine-image`/`xai-grok-imagine-image-2.0` + 2 视频），说明本轮 provider 注册与能力配置都在位；前端 5173 的 Vite 进程（10:07 启动）仍存活
- 结论与约定：判断服务是否在跑**不要看后台任务状态**，直接探端口；被回收后按「`tsc -p tsconfig.build.json` → 后台 `node dist/main.js`」恢复，并拉一次 `/api/v1/models` 核对模型数量。已写入 `docs/SESSION_HANDOFF_2026-10-20.md` 第 1 节
- 本轮无业务代码改动，不产生计费
- 补充发现（17:41 后核对工作区时）：**存在并发写入**。除本会话的改动外，17:20-17:41 另一工具/会话在改「智能体预设参数」（`custom_agents` 新增 `inputMode`/`maxTokens`/`modelAlias`/`temperature`，新迁移 `20261020092005_add_agent_preset_params`，前后端 `agents`/`chat`/`agent-directory`/`agent-workspace` 同步）。它同时重建了 `dist` 并重启 API——这才导致本会话的后台 API 任务被判 failed。工作区当前为 49 个已跟踪文件修改 + 5 个未跟踪项。**因此不提交、不推送**，等另一方收工后再按 D-033 说明范围后处理；该情况已写入 `docs/SESSION_HANDOFF_2026-10-20.md` 第 8 节
