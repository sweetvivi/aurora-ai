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

- 对照 `C:\Users\Administrator\Desktop\参考网站截图合集\参考网站中点击电商工具的主界面.png`，用像素扫描测出参考产品主内容区在 `1440` 视口下约 `1160px`，四栏实际宽度约 `235 / 216 / 458 / 221px`；本地为 `245 / 215 / 385 / 285px`，预览栏偏窄、介绍栏偏宽
- 将 `CommerceWorkbenchView.vue` 的 `.commerce-workbench__body` 由 `0.95 / 0.78 / 1.62 / 1.08` 权重改为 `245 / 228 / 462 / 242` 权重，实测本地四栏回到 `235 / 219 / 444 / 232px`；`1180px` 断点后移到 `1100px`，`1440` 视口不再提前退回三栏
- 效果展示区空态此前渲染 `GalleryArtwork` 抽象插画，与参考产品的真实商品示例图不符；现改为默认显示 `/showcase/product-v1.png`，并抽出 `resolvePreviewImage` 统一处理“已上传素材 / 示例图”的回退顺序，避免替换类工具在 before/after 之间显示错误素材
- 预览画布高度由 `470px` 提到 `535px`、`BEFORE/AFTER` 字号提到 `18px`；台账搜索框高度提到 `34px`、分组与条目字号提到 `12px`、面板标题提到 `14px`，分组图标统一成参考产品的灰阶样式
- 新增调试脚本 `outputs/ui-reference/measure-commerce.mjs`（ignored 目录），用于输出四栏 `getBoundingClientRect` 与当前截图，方便后续继续用像素对照而不是凭感觉调样式
- 浏览器验收：`node outputs/ui-reference/verify-commerce-studio.mjs` 桌面端 `1440x1000` 与移动端 `390x844` 全部通过，空态、目录展开、搜索、上传、替换/材质/部件任务体、历史记录、帮助抽屉和建议箱断言保持一致，无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 31. 2026-10-19 电商工具说明栏与上传文案对齐

- 对照 `C:\Users\Administrator\Desktop\参考网站截图合集\参考网站电商工具点击左边工具中服饰图案替换设计师的界面.png` 与 `参考网站电商工具点击左边工具中智能背景融合的界面.png`，参考产品在两个工具页面右侧显示的是同一套通用说明，而不是按工具拆分的专属步骤
- `CommerceWorkbenchView.vue` 的 `toolSteps`、`toolTips` 统一为参考产品文案：四步流程为“上传包含原商品的图片 / 上传要替换的新商品图片 / 选择替换模式和融合强度 / 点击开始处理，等待 AI 完成替换”，三条技巧为“确保原图和替换商品的角度相似 / 建议使用分辨率高的图片获得更好效果 / 光线条件相近的图片替换效果更佳”
- 各上传位统一使用“点击或拖拽上传，支持 JPG、JPEG、PNG、WebP，≤ 10MB”辅助说明，保留现有上传、拖拽、预览、移除和文件校验逻辑不变
- 浏览器验收复跑：`node outputs/ui-reference/verify-commerce-studio.mjs` 与 `node outputs/ui-reference/measure-commerce.mjs` 均通过；桌面端 `1440x1000` 与移动端 `390x844` 无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 26 个文件 110 项、Web 20 个文件 88 项）、`pnpm build`
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或调用任何真实 Key，未消耗参考产品积分

## 32. 2026-10-19 AI 绘画去视频、参考对照复核与全量回归

- 恢复工作前先检查用户目录：`本地密钥目录\说明文件.txt` 仍是 `2026-10-17 18:51`、`ActionsNEW*.png` 最新仍是 `ActionsNEW5.png`、`当前页面截图` 最新仍是 `2026-10-15`、`参考网站截图合集` 最新是 `2026-10-17 17:08` 的 AI 画布系列；本轮没有出现比上次更新的说明或截图，因此按既定顺序继续推进
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

## 35. 2026-10-19 超级智能体历史记录抽屉密度对齐

- 对照用户提供的参考产品历史抽屉截图，参考面板顶部是关闭图标在左、智能体头像和名称在右；本地此前把头像和名称放在左侧，关闭按钮推到最右
- `AgentDetailView.vue` 调整抽屉头部顺序，同时把历史条目恢复成参考产品式单行标题，移除每条会话下方的消息数和时间副信息
- 历史条目样式改为浅灰背景、`#e9ebef` 细边框、`6px` 圆角和约 `34px` 行高；分组标题“今天 / 昨天 / 最近 7 天”保持轻量小标题，悬停和选中仅做蓝色描边与浅蓝底
- `verify-agent-detail-actions.mjs` 新增历史抽屉状态断言：关闭按钮必须位于智能体头像左侧、首个条目高度在 `32–38px`、条目内不得出现旧副信息，并输出 `agent-detail-history-desktop.png` 供后续对照
- 浏览器验收通过：桌面端 `1440x1000` 抽屉宽度保持 `280px`，消息列和输入区仍为 `768px`；移动端 `390x844` 输入区 `366px`，两端均无横向溢出、无页面脚本错误
- 验证通过：`pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（API 27 个文件 115 项、Web 20 个文件 89 项）、`pnpm build`（仅既有 Vite chunk 体积提示）
- 本轮只读取本地代码、本地页面与已有参考截图，未读取、输出或记录任何 Key/Token/Cookie，未调用真实第三方接口，未消耗参考产品积分，未调用真实视频生成
