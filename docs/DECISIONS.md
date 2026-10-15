# 决策记录

状态定义：

- `Accepted`：已确认，后续实现必须遵守
- `Proposed`：建议方案，尚未确认
- `Superseded`：已被新决策替代
- `Rejected`：明确不采用

## Accepted

### D-001 产品名称

- 状态：Accepted
- 决策：产品中文名为“极光AI”
- 原因：用户明确要求替换原页面名称

### D-002 远端仓库

- 状态：Accepted
- 决策：代码统一推送到 `http://182.92.154.206:3000/sweetvivi/web-ai-design-clone.git`
- 默认分支：`main`

### D-003 实现边界

- 状态：Accepted
- 决策：参考页面结构、产品流程和交互，不直接复制原页面代码、品牌素材、用户评价、企业信息、法律模板和受保护内容

### D-004 上下文交接

- 状态：Accepted
- 决策：所有模型切换都必须通过仓库文档续接，并持续维护 `CHANGELOG.md`

### D-005 Git 提交身份

- 状态：Accepted
- 决策：当前仓库的提交身份使用 `sweetvivi <2020532166@qq.com>`
- 作用范围：仅 `project2` 本地仓库，不修改其他仓库
- 凭据用户名：`sweetvivi`

### D-006 远端认证

- 状态：Accepted
- 决策：远端认证使用 Gitea Token，并通过 Windows Credential Manager 保存
- 作用范围：`http://182.92.154.206:3000`
- 安全要求：Token 不写入仓库、文档、提交记录或普通配置文件

## Proposed

### P-001 前端技术栈

- 状态：Proposed
- 建议：React 19、TypeScript、Vite、React Router、Ant Design 5、Tailwind CSS、Zustand、TanStack Query
- 待确认：如果团队更希望复用现有 Vue 代码，可改为 Vue 3、Pinia、Vue Router、UnoCSS

### P-002 后端技术栈

- 状态：Proposed
- 建议：NestJS、Prisma、PostgreSQL、Redis、BullMQ
- 备选：复用现有 `ai-workbench-api`
- 待确认：是否从零实现，是否保留现有 Prisma 模型

### P-003 页面架构

- 状态：Proposed
- 建议：五套壳层加工具注册表和工作台引擎
- 原因：参考产品页面数量大，逐页独立开发不可控

### P-004 文件存储

- 状态：Proposed
- 建议：S3 兼容对象存储或 MinIO，前端只使用临时签名 URL

### P-005 异步生成

- 状态：Proposed
- 建议：Redis 加 BullMQ，统一管理对话、绘画、视频、音频、PPT 和文档任务

### P-006 积分结算

- 状态：Proposed
- 建议：预扣、执行、结算、失败退回，所有变更写积分账本

### P-007 首发范围

- 状态：Proposed
- 建议：全局壳层、账户积分、对话、Agent、绘画、图片处理、PPT、翻译

## Superseded

暂无。

## Rejected

暂无。

## 更新规则

- 每次用户做出新选择，都要新增或更新决策。
- 修改已确认决策时，不覆盖历史原因，应标记旧决策为 `Superseded` 并引用新决策编号。
- 未确认建议不能写成产品事实。
