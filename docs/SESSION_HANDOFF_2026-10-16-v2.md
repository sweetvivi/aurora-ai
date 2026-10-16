# 会话交接说明

日期：2026-10-16

## 1. 当前阶段

- M0 未开始。
- 当前仍处于文档阶段。
- 本次交接完成后，不开始业务代码、数据库表或真实模型接入。

## 2. 已确认决策摘要

完整决策以 [`DECISIONS.md`](DECISIONS.md) 为准，后续模型不得根据旧聊天重新定义产品方向。

- 产品为极光AI，演示优先，保留未来商用升级路径。
- 首发范围为页面壳层、登录、模型对话和绘图；其他产品线先占位。
- 首发中文优先，仅支持中国中文。
- 视觉策略已修订为尽可能接近参考产品的布局、组件、视觉体系、交互流程和动效，但品牌、版权素材、企业信息、法律文本及原页面打包资源必须替换或重新实现。
- 前端采用 Vue 3 + TypeScript + Vite + Ant Design Vue 5 + UnoCSS + Pinia；后端采用 NestJS + Prisma + PostgreSQL + Redis + BullMQ。
- 前后端统一使用模型别名，M0 先登记 `openai-gpt-6-astra`；前端不暴露上游真实模型名。
- Gitea 旧仓库归档但不删除，归档由用户在网页手动完成；当前代码只推送 GitHub。
- 不修改 `Desktop/project` 和 `Desktop/project/ai-workbench-api`。

详细内容见 [`DECISIONS.md`](DECISIONS.md)。

## 3. 待确认问题摘要

完整问题及归口时间见 [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)。当前重点包括：

- 原页面会员等级的完整价格、权益、积分规则和有效期，等待用户提供会员页截图；公开脚本字段不能直接视为确定决策。
- 积分、会员和订单是否首发上线。
- 上游服务国内直连稳定性和公司 Key 额度限制。
- M3-M7 的文件保留、多端同步、部署、公开运营、备案、CDN、内容安全、授权、退款、发票及幂等发放规则。
- 会员等级具体划分仍未确认。

## 4. 本地状态

- 路径：`C:\Users\Administrator\Desktop\project2`
- 分支：`main`
- HEAD：`fa5344bcd1f5b308c503f037db9163cb2b734c62`
- HEAD 短哈希：`fa5344b`
- 工作区：交接文件创建前干净；完成本次文档提交后应再次检查状态。

## 5. 远端状态

- 远端：[GitHub private 仓库](https://github.com/sweetvivi/web-ai-design-clone-b)
- 当前远端：`origin` 指向 `https://github.com/sweetvivi/web-ai-design-clone-b.git`
- 分支：`main`
- 最新已推送 commit：`fa5344bcd1f5b308c503f037db9163cb2b734c62`（`docs: finalize ai handoff guidance`）

## 6. 下一个模型/会话应做的第一件事

先阅读 `README.md`、`docs/AI_HANDOFF.md`、本文件、`docs/PROJECT_CONTEXT.md`、`docs/DECISIONS.md`、`docs/OPEN_QUESTIONS.md` 和 `CHANGELOG.md`，再检查 `git status --short --branch` 与 `git log --oneline -5`，用中文输出当前阶段、已确认决策、待确认问题、最近提交和本次准备修改的最小范围。

本次目标模型为 `deepseek-4.1-flash-260910`。在用户明确开始 M0 前，不得写业务代码、建数据库表或接入真实模型；如果只是模型切换交接，完成读取和总结后等待用户下一步指令。

## 7. 上一条指令的执行结果

- D-011 视觉策略：已修订，内容已写入 `docs/DECISIONS.md`。
- 会员等级：已整理为表格，但完整价格、权益、积分规则和有效期标记为待补，需用户会员页截图确认；没有编造固定档位决策。
- D-020 模型别名规范：已写入 `docs/DECISIONS.md`。
- D-021 Gitea 归档策略：已写入 `docs/DECISIONS.md`。
- 上一条文档提交已成功推送到 `origin/main`，未发生 push 超时。
