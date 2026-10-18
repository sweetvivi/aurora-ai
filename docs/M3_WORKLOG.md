# M3 管理后台工作日志

更新时间：2026-10-18

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
2. 将 AI 绘画页面中与核心绘画流程无关的视频入口弱化或移除
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
