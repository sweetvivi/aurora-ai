# M3 管理后台工作日志

更新时间：2026-10-17

## 1. 当前阶段

- 工作目录：`C:\Users\Administrator\Desktop\project2`
- 分支：`main`
- M3 范围：运行时模型配置、管理后台首版和管理员权限边界
- 当前基线：M2 工具套件首版已完成，M3 管理后台首版、厂商模型探测与超级智能体流式修复已通过本地验证

## 2. 本批范围

本批交付以下后台能力：

1. 管理员路由守卫和后台入口
2. 平台总览：用户、积分、厂商、模型、对话和媒体任务统计
3. 用户管理：分页查询、状态和角色查看、编辑用户
4. 积分调整：管理员为指定用户增减积分并写入账本
5. 厂商管理：厂商启停、Base URL、Key 引用、优先级和模型检测
6. 模型管理：模型别名、上游模型 ID、能力、上下文窗口、启停状态和发现后批量导入
7. 运行时模型注册表：数据库配置优先，默认模型回退

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

## 4. 验证结果

已验证：

- `pnpm format:check` 通过
- `pnpm lint` 通过
- `pnpm typecheck` 通过
- `pnpm test`：API 17 个文件 63 项通过，Web 6 个文件 24 项通过
- `pnpm build` 通过
- `node outputs/ui-reference/verify-admin-console.mjs` 通过
- `node outputs/ui-reference/verify-admin-provider-probe.mjs` 通过
- 后台验收覆盖 `1440x1000` 和 `390x844`，无横向溢出、无页面脚本错误
- 厂商探测验收覆盖瞬态 Key、能力标签、全选/清空、导入请求和 Key 不泄露；截图输出为 `m3-admin-provider-probe-desktop.png`、`m3-admin-provider-probe-mobile.png`

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

- Provider 实例选择仍由 `IMAGE_PROVIDER`、`VIDEO_PROVIDER` 等环境变量决定；数据库目前主要控制模型、端点和 Key 引用，尚未按厂商类别动态选择 Provider 实现
- 真实 Key 尚未提供后台加密持久化；当前仍通过服务端环境变量和 `keyRef` 使用，避免在未确定加密、轮换、审计和备份方案前落库
- 厂商探测允许管理员填写任意 Base URL，生产启用前需要增加内网地址拦截、域名策略或受控出口，降低 SSRF 风险
- 模块展示配置（图标、图片和导航展示）尚未进入后台；当前后台优先覆盖 Key/厂商、用户和模型
- 支付仍是后续沙箱阶段，未接入真实支付

## 7. 下一批建议

1. 使用真实低额度 Key 或 Mock Provider 验收超级智能体首轮消息、流式更新、停止生成、错误退款和历史切换
2. 将 AI 绘画页面中与核心绘画流程无关的视频入口弱化或移除
3. 为 Provider 类别增加数据库驱动的动态实例化
4. 继续补充后台操作审计、失败回滚和真实环境恢复测试
5. 在获得单独确认后设计真实 Key 的加密存储、轮换、审计和备份方案

## 8. 2026-10-17 补充修复

- 超级智能体详情页现在会在调用流式接口前创建或绑定会话，用户消息和 `STREAMING` 助手消息会立即进入当前会话。
- 历史路由自动发送与新会话发送共用同一套会话绑定逻辑。
- OpenAI 兼容 Provider 会识别 `reasoning` 和 `reasoning_content`，不把内部推理直接展示给用户。
- 只有推理、没有最终正文时返回 `LLM_EMPTY_RESPONSE`，由对话服务结束请求并退回冻结积分。
