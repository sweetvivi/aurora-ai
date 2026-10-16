# 极光AI

极光AI是参考 `https://参考产品/` 的产品结构、视觉语言和核心交互重新设计的 AI 工具平台。

当前仓库是全新实现，不直接复用参考产品的打包代码、品牌素材、企业信息、用户评价或法律模板。

## 仓库信息

- 本地目录：`C:\Users\Administrator\Desktop\project2`
- 远端仓库：`https://github.com/sweetvivi/web-ai-design-clone-b`（private）
- 默认分支：`main`

## 当前状态

项目目前处于研究和架构评审阶段，尚未开始正式业务开发。

已完成：

- 参考产品公开路由和登录后页面巡检
- 桌面端 72 个代表路由、移动端 6 个代表页面分析
- 页面壳层、核心工作台、接口和商业化结构梳理

尚未确定：

- 最终技术栈
- 后端复用范围
- 登录、支付、模型和存储方案
- 首批上线范围和部署方式

## 开始工作前必须阅读

按顺序阅读：

1. `docs/PROJECT_CONTEXT.md`
2. `docs/RESEARCH_BASELINE.md`
3. `docs/SESSION_HANDOFF_2026-10-16.md`
4. `docs/MODEL_CONTINUITY.md`
5. `docs/DECISIONS.md`
6. `docs/OPEN_QUESTIONS.md`

任何模型或开发者继续接管前，都必须先阅读以上文档，不得根据旧对话自行重置产品方向。

## 主要文档

- `docs/PROJECT_CONTEXT.md`：项目事实、边界和事实优先级
- `docs/RESEARCH_BASELINE.md`：参考产品研究基线
- `docs/SESSION_HANDOFF_2026-10-16.md`：完整会话交接、DeepSeek 方案评审和修正建议
- `docs/MODEL_CONTINUITY.md`：换模型后的续接和防止思路漂移规则
- `docs/DECISIONS.md`：已确认和待确认的技术决策
- `docs/OPEN_QUESTIONS.md`：等待用户回答的问题
- `CHANGELOG.md`：所有有效改动的持续记录

## 工作规则

- 用户最新指令优先级最高。
- 已确认决策不得被后续模型静默覆盖。
- 新模型必须先总结当前状态，再开始改代码。
- 每完成一组有效改动，必须更新 `CHANGELOG.md`。
- 改变栈、目录、架构、品牌或数据模型时，必须同步更新 `docs/DECISIONS.md`。
- API Key、Token、Cookie、账号密码和支付信息不得写入仓库。
