# 会话交接说明

日期：2026-10-16

## 1. 文档目的

本文件用于把当前会话中的需求、研究结论、仓库状态、已确认决策、DeepSeek 实施方案评审和新模型的接续要求集中保存。

当前会话中的 DeepSeek Flash 即将被替换为公司 GPT6。新模型不能假设自己知道旧会话，必须先从仓库恢复上下文。

## 2. 新模型第一步

新模型开始工作前必须：

1. 阅读 `README.md`
2. 阅读 `docs/PROJECT_CONTEXT.md`
3. 阅读 `docs/RESEARCH_BASELINE.md`
4. 阅读本文件
5. 阅读 `docs/MODEL_CONTINUITY.md`
6. 阅读 `docs/DECISIONS.md`
7. 阅读 `docs/OPEN_QUESTIONS.md`
8. 阅读 `CHANGELOG.md`
9. 检查 `git status` 和最近提交

阅读后必须先总结：

- 项目当前阶段
- 已确认决策
- 未确认问题
- 最近一次有效改动
- 准备修改的最小范围

在完成以上步骤前，不得开始大规模写代码或重构。

## 3. 当前项目目标

产品名称：极光AI

参考网站：`https://参考产品/`

目标：

- 参考原页面的产品结构、视觉语言和工作流
- 重新实现网页、前后端和数据层
- 替换品牌、素材、文案、企业和法务信息
- 当前用于演示
- 未来可能正式商用
- 架构不能阻断后续商用升级

本地目录：

`C:\Users\Administrator\Desktop\project2`

远端仓库：

`https://github.com/sweetvivi/web-ai-design-clone-b`（private）

默认分支：

`main`

## 4. 对话过程摘要

### 4.1 初始需求

用户最初要求：

- 新项目放在 `Desktop\project2`
- 新建本地 Git 仓库
- 在用户自己的账号下创建远端仓库
- 实现 `参考产品`
- 产品名从“边界AI”改为“极光AI”
- 先完整研究原页面
- 给出从零开始的实施方案

### 4.2 原页面研究

已完成研究：

- 读取公开 `sitemap.xml`，识别 232 个公开 URL
- 从构建代码识别约 280 个路由模式
- 分析首页、移动端和登录后页面
- 桌面端巡检 72 个代表路由
- 移动端巡检 6 个代表页面
- 汇总 78 个页面状态
- 识别 38 个独立 API
- 采集截图、控件、表单、弹层、图表和接口信息

研究结论确认原页面至少包含五套壳层：

1. `PlatformShell`
2. `WorkbenchShell`
3. `DiscoveryShell`
4. `MediaStudioShell`
5. `LegacyShell`

核心产品包括：

- 模型对话
- Agent
- 自定义智能体
- 新绘画
- 图片处理
- 新版 PPT
- 论文助手
- 翻译
- 视频
- 音乐
- TTS 和声音克隆
- 股票投研
- 工具地图
- 法律、代码、笔记等通用工具
- 账户、积分、会员、钱包和邀请

### 4.3 页面细节

首页：

- 模型和活动轮播
- 多产品标签
- 聊天输入框
- 模型切换
- 任务模式
- 思考等级
- 图表和 PPT 快捷入口
- 示例提示词
- PWA 添加桌面提示

模型对话：

- 100+ 模型
- 普通对话和超级对话
- 多模型分组
- 附件
- 流式内容
- 任务和积分消耗

Agent：

- 官方智能体超过 6000 个
- 搜索、收藏、分类和创建
- 卡片有名称、评分、说明和“做同款”

绘画：

- 历史作品
- 批量操作
- 图片模型选择
- 高级设置
- 存储时长
- 上传图片
- 下载、重新生成和删除

图片工具：

- 修图、抠图、修复、放大、调色、融合、去水印、对象移除

PPT：

- 语言、页数、详细度和场景
- 40+ 模型
- 文件、链接和纯文本输入
- 模板库和历史

股票：

- 行情、盘口、财务、资金、股东、资讯
- AI 分析、战法、风险预警和图表

媒体：

- 文生视频
- 图生视频
- 数字人
- 唇形同步
- 字幕
- 视频抠图
- TTS
- 声音克隆
- 音乐生成

账户：

- 积分
- 会员
- 钱包
- 邀请返利
- 订单
- 支付和发票

### 4.4 页面成熟度

成熟工作台：

- 首页
- 模型对话
- Agent
- 自定义 Agent
- 新绘画
- 图片工具集
- 新版 PPT
- 股票
- 工具地图
- 音乐
- TTS
- 法律工具

旧版或轻量页面：

- 旧版 PPT
- 旧版视频
- 部分音频页
- PDF
- 白板
- 3D 建模

已知问题：

- `/draw/text2image` 会跳转到 `/newchat`
- `/aiSearch/searchByhome` 会跳转到 `/newchat`
- `/newchat/agent` 当前为空
- `/aiDesign/aiResume` 只有壳层

## 5. Git 和仓库状态

Git 身份：

- 用户名：`sweetvivi`
- 邮箱：`2020532166@qq.com`
- 作用范围：仅当前仓库

远端变更：

- 原 Gitea 仓库为历史仓库，版本 1.15.9 不支持 Actions
- 当前远端切换为 GitHub private 仓库
- GitHub 地址：`https://github.com/sweetvivi/web-ai-design-clone-b`
- 新推送需要 GitHub 凭据或 SSH Key
- 历史 Gitea Token 不应继续作为新远端的认证依据
- 任何 Token 都不得写入文档、代码和提交

当前提交：

```text
114aa65 docs: record successful remote authentication
68b1067 docs: record remote authentication result
77bb3c5 chore: normalize line endings
412b29c docs: record git setup and push status
5a087cc docs: initialize project context and model continuity
```

本交接文档提交后，提交历史会增加一项。

## 6. 用户最新确认的约束

### 6.1 演示和商用

- 当前是演示项目
- 未来可能正式商用
- 不能为了演示写死数据结构
- 可以用模拟能力，但必须保留替换路径

### 6.2 模型供应商

- 首批模型供应商和可用密钥使用公司的 Key
- 真实接入优先级高于 Mock
- 上游可能报错
- 上游报错暂时不作为项目阻塞
- 前端必须能显示可恢复错误
- 积分必须有失败退回机制
- 密钥不能进 Git

### 6.3 支付

- 当前先做沙箱订单模拟
- 后续可能改成真实支付
- 订单从第一版就应使用幂等和状态机
- 前端不能直接把订单标记为已支付

### 6.4 2026-10-16 最终核心决策

前端：

- Vue 3 + TypeScript + Vite
- Ant Design Vue 5
- UnoCSS
- Pinia
- Vue Router
- TanStack Query (Vue)
- 不用 React

后端：

- 不复用 `ai-workbench-api`
- 旧项目冻结为参考实现
- 数据结构、数据库和鉴权重新设计
- PostgreSQL
- NestJS + Prisma + Redis + BullMQ

模型：

- 后端环境变量注入 Key
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_DEFAULT_MODEL`
- Base URL：`https://api.example.com/v1`
- 默认对话模型：`gpt-6-astra`
- 只实现一个 OpenAI 兼容适配器
- 生图先 Mock；后续接入 1、3 号图像 Key，4 号视频测试 Key 仅用于视频
- 视频先 Mock，M4 接入
- Embedding 暂不做

支付：

- 一期只定接口和订单状态机
- `SandboxProvider`
- 前端没有直接设置已支付接口
- 注册送 100 积分
- 后台手动充值
- 微信、支付宝、Stripe 放到 M7

分支和 CI：

- `main`
- `feature/xxx`
- `fix/xxx`
- 不使用长期 `dev`
- 不强制 PR
- 重要节点打 Tag
- GitHub Actions
- M0 只写最小 CI

## 7. DeepSeek 实施方案评审

DeepSeek 给出的方案总体可行，主要方向：

- Vue 3 + TypeScript + Vite
- Pinia
- Axios + TanStack Query
- Ant Design Vue 5
- UnoCSS
- NestJS + Prisma
- PostgreSQL 16
- Redis + BullMQ
- pnpm workspace
- 五套壳层
- 工具注册表
- 积分冻结
- 异步任务
- Docker Compose

这些方向与当前研究结论一致，可以进入 M0。

## 8. 方案中必须修正的问题

### 8.1 Mock 不应成为首批主流程

原方案建议 M1 先用 Mock 跑闭环，真实模型放 M2。当前用户已经明确首批使用公司 Key，因此应改成：

- 真实 provider 是主流程
- Mock 只用于测试和受控兜底
- 上游报错时显示可重试错误
- 积分在最终失败时退回

### 8.2 供应商 Key 不能明文存数据库

原方案有 `provider_configs`。

修正：

- 数据库只存 provider 元数据、优先级、限流和密钥引用
- Key 使用环境变量、密钥管理服务或内部网关
- 如确需落库，必须使用 KMS 或信封加密，不能明文
- 日志不得记录 Key

### 8.3 不要兼容四套旧鉴权头

原方案建议兼容：

- `Access-Token`
- `Token`
- `Uid`
- `app-name`

修正：

- 极光AI从零实现，不需要继承旧鉴权协议
- 首选标准 Bearer Access Token + Refresh Token
- 如确有旧接口迁移需求，只在单独兼容层处理
- 不允许 `Uid` 或 `app-name` 直接作为可信身份

### 8.4 不同模型使用不同超时和重试

原方案统一：

- LLM 30 秒超时
- BullMQ 重试 3 次

修正：

- LLM 流式请求使用首包超时和空闲超时，不应以 30 秒作为总超时
- 图片任务使用 3-10 分钟级超时
- 视频任务使用 10-30 分钟级超时
- 401、403 不自动重试
- 429 和 5xx 按策略退避
- 重试必须幂等
- 防止一次任务多次扣积分或生成重复结果

### 8.5 熔断和备用供应商的现实性

原方案要求每个模型槽至少两家供应商。

修正：

- 有公司 Key 时优先真实供应商
- 没有第二家时允许单供应商运行
- 无备用供应商时降级为错误提示和积分退回
- 熔断按 provider + model 独立统计
- 熔断后进入半开状态再恢复

### 8.6 支付不应拖到 M7 才开始设计

原方案把支付沙箱放 M7。

修正：

- M0 可以先做订单状态和数据模型
- 沙箱支付可在 M1 或 M2 提供
- 支付订单、积分发放和会员权益必须共享幂等键
- 真实支付和沙箱支付使用同一个支付适配接口

### 8.7 文件和内容安全不能只写“本地磁盘”

第一阶段可以本地磁盘，但必须：

- MIME 和扩展名双重校验
- 文件名清洗
- 大小和数量限制
- 用户隔离
- 访问授权
- 防目录穿越
- 预留对象存储接口
- 后续加入病毒扫描和内容安全

### 8.8 点数字段需要账本保护

不能只依赖 `users.points`。

必须：

- 积分流水作为审计来源
- 冻结记录和业务任务关联
- 幂等键防止重复扣减
- 使用数据库事务和行锁
- 失败自动释放
- 结算与冻结金额必须对账

### 8.9 端口和本地环境

本机检查结果：

- Node：已安装
- pnpm：已安装
- Docker：已安装
- Docker Compose：已安装
- `3000`、`5173`、`5432`、`6379` 当前未监听

仍建议：

- API 默认端口设置为可配置
- 如已有服务使用 3000，使用 3001
- `.env.example` 必须体现端口配置
- Docker 数据卷和本机已有数据库避免冲突

### 8.10 DeepSeek 方案中的阶段性假设

原方案中的“本机 mock 跑通后再接真实模型”已被用户新要求取代。

原方案中的技术栈仍属于 Proposed，不能在没有用户确认的情况下升级为 Accepted。

## 9. 已确认决策

`docs/DECISIONS.md` 中新增：

- D-007：演示优先，商用可升级
- D-008：首批使用公司 Key 的真实 provider
- D-009：支付使用沙箱订单

技术栈、数据库和首发范围仍要等用户确认。

## 10. 建议保留的方案部分

- pnpm workspace
- 五套壳层
- 工具注册表
- provider adapter
- NestJS 模块化
- PostgreSQL
- Prisma
- Redis + BullMQ
- 任务状态机
- 积分冻结
- Docker Compose
- Vitest、Jest、Playwright
- GitHub private 远端

## 11. 建议修改后的 M0

M0 只做工程基础，不写业务页面：

1. pnpm workspace
2. 根配置、`.gitignore`、`.env.example`
3. 前端 Vue 3 或待用户确认的框架骨架
4. 后端 NestJS 骨架
5. PostgreSQL 和 Redis Docker Compose
6. 健康检查
7. 统一异常和响应结构
8. 日志和请求 ID
9. provider adapter 接口
10. 模型注册表骨架
11. 密钥读取抽象
12. 前端空壳和五套 Shell 路由占位
13. 测试工具链
14. GitHub Actions 最小 CI

M0 不接真实模型，但接口必须支持公司 Key。

## 12. 建议修改后的 M1

M1 做第一条真实垂直切片：

1. 登录和用户
2. Refresh Token
3. 积分冻结、结算和退回
4. 真实 LLM provider
5. 对话 SSE
6. 对话历史和消息
7. 真实图片 provider
8. 图片异步任务
9. 文件上传
10. 任务历史
11. 上游错误分类
12. 前端错误和重试
13. Mock provider 只用于测试

M1 结束应实现：

登录
→ 选择模型
→ 真实流式对话
→ 积分冻结和结算
→ 真实图片任务
→ 查询进度
→ 查看结果
→ 失败退回积分
→ 查看历史

## 13. 新模型不能擅自做的事情

- 不更换“极光AI”名称
- 不擅自更换当前 GitHub 远端仓库
- 不把项目切回 React 或 Vue，除非用户确认
- 不使用 Mock 替代真实 provider 主流程
- 不把公司 Key 写入仓库
- 不把原始 Token 写入文档
- 不照搬原页面代码和素材
- 不把旧版鉴权头作为正式认证方案
- 不把支付成功后权限写在前端
- 不删除本研究结论和决策记录
- 不直接把整个 232 路由一次性铺完

## 14. 需要用户继续回答的问题

技术：

- 是否需要管理后台和运营后台？

模型：

- 是否要求前后端统一模型别名？
- 是否允许模型失败时自动回退？
- 上游报错时前端显示统一提示还是错误分类？

支付：

- 积分、会员和订单是否首发上线？
- 退款、发票和会员到期规则如何处理？
- 支付成功后积分和会员由哪个模块幂等发放？

部署：

- 本机演示后是否部署公司服务器？
- 是否应用 Nginx + HTTPS？
- 域名和主体是谁？

协作：

- 是否需要本地提交钩子？
- 是否使用许可证？

## 15. 新模型接手提示词

请先不要写代码。按以下顺序读取：

```text
README.md
docs/PROJECT_CONTEXT.md
docs/RESEARCH_BASELINE.md
docs/SESSION_HANDOFF_2026-10-16.md
docs/MODEL_CONTINUITY.md
docs/DECISIONS.md
docs/OPEN_QUESTIONS.md
CHANGELOG.md
```

然后用不超过 20 行总结：

1. 项目当前阶段
2. 已确认决策
3. DeepSeek 方案哪些可行
4. 哪些已修正
5. 尚待用户回答的问题
6. 建议的第一个最小任务

不要在总结前改代码。

## 16. 当前事实优先级

1. 用户最新明确指令
2. `docs/DECISIONS.md` 中 Accepted
3. `docs/PROJECT_CONTEXT.md`
4. 本文件
5. `docs/RESEARCH_BASELINE.md`
6. 当前代码和测试
7. 旧任务、旧模型和旧聊天

任何冲突都以用户最新指令和 Accepted 决策为准。
